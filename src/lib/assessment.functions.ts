import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseAssessmentData } from "@/lib/assessment-schema";
import { splitBySection, summaryFromData } from "@/lib/assessment-sections";

export const METHODOLOGY_VERSION = "v2.4";
export const PRIVACY_NOTICE_VERSION = "2026-01";

const ALLOWED_SOURCES = [
  "linkedin",
  "whatsapp",
  "email",
  "evento",
  "indicacao",
  "prospeccao",
  "outro",
];

const startInput = z.object({
  ref: z.string().max(120).nullish(),
  source: z.string().max(60).nullish(),
  consent: z.boolean(),
});

const progressInput = z.object({
  assessmentId: z.string().uuid(),
  editToken: z.string().min(10).max(200),
  step: z.number().int().min(0).max(10).catch(0),
  data: z.unknown(),
});

/** Cria o assessment e devolve o identificador + token de edição do cliente. */
export const startAssessment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startInput.parse(input))
  .handler(async ({ data }) => {
    if (!data.consent) throw new Error("Consentimento obrigatório.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let accountManagerId: string | null = null;
    const ref = data.ref?.trim() || null;
    if (ref) {
      const { data: manager } = await supabaseAdmin
        .from("account_managers")
        .select("id")
        .eq("public_ref", ref)
        .eq("active", true)
        .maybeSingle();
      accountManagerId = manager?.id ?? null;
    }

    const rawSource = data.source?.trim().toLowerCase() || null;
    const source = rawSource ? (ALLOWED_SOURCES.includes(rawSource) ? rawSource : "outro") : null;
    const editToken = crypto.randomUUID() + crypto.randomUUID();

    const { data: created, error } = await supabaseAdmin
      .from("assessments")
      .insert({
        account_manager_id: accountManagerId,
        public_ref: ref,
        source,
        edit_token: editToken,
        status: "in_progress",
        methodology_version: METHODOLOGY_VERSION,
        privacy_notice_version: PRIVACY_NOTICE_VERSION,
        consent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !created) throw new Error("Não foi possível iniciar o diagnóstico.");
    return { assessmentId: created.id as string, editToken };
  });

/** Autosave: grava resumo + todas as respostas por etapa. */
export const saveAssessmentProgress = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => progressInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const parsed = parseAssessmentData(data.data);

    const { data: existing } = await supabaseAdmin
      .from("assessments")
      .select("id, edit_token, status")
      .eq("id", data.assessmentId)
      .maybeSingle();

    if (!existing || existing.edit_token !== data.editToken) throw new Error("Acesso inválido.");

    await supabaseAdmin
      .from("assessments")
      .update({ ...summaryFromData(parsed), current_step: data.step })
      .eq("id", data.assessmentId);

    const sections = splitBySection(parsed);
    const rows = Object.entries(sections).map(([section, answers]) => ({
      assessment_id: data.assessmentId,
      section,
      answers: answers as never,
    }));
    const { error } = await supabaseAdmin
      .from("assessment_responses")
      .upsert(rows, { onConflict: "assessment_id,section" });
    if (error) throw new Error("Não foi possível salvar as respostas.");

    return { savedAt: new Date().toISOString() };
  });

/**
 * Finalização: sincroniza dados, executa a metodologia de scoring existente,
 * grava scores/achados/cobertura e dispara (uma única vez) o relatório interno.
 */
export const completeAssessment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        assessmentId: z.string().uuid(),
        editToken: z.string().min(10).max(200),
        data: z.unknown(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { scoreAssessment, maturityLevel } = await import("@/scoring");
    const parsed = parseAssessmentData(data.data);

    const { data: existing } = await supabaseAdmin
      .from("assessments")
      .select("id, edit_token, status, source, account_manager_id, completed_at")
      .eq("id", data.assessmentId)
      .maybeSingle();
    if (!existing || existing.edit_token !== data.editToken) throw new Error("Acesso inválido.");

    const result = scoreAssessment(parsed);
    const completedAt = existing.completed_at ?? new Date().toISOString();

    const sections = splitBySection(parsed);
    await supabaseAdmin.from("assessment_responses").upsert(
      Object.entries(sections).map(([section, answers]) => ({
        assessment_id: data.assessmentId,
        section,
        answers: answers as never,
      })),
      { onConflict: "assessment_id,section" },
    );

    await supabaseAdmin
      .from("assessments")
      .update({
        ...summaryFromData(parsed),
        status: "completed",
        completed_at: completedAt,
        overall_score: result.overall,
        network_score: result.scores.network,
        endpoint_score: result.scores.endpoint,
        continuity_score: result.scores.backup,
        identity_score: result.scores.identity,
        priority_domain: result.priority,
        priority_domain_label: result.priorityLabel,
        maturity_level: maturityLevel(result.overall),
        coverage_percentage: result.completeness,
        findings: result.findings as never,
        scoring_snapshot: result as never,
        methodology_version: METHODOLOGY_VERSION,
      })
      .eq("id", data.assessmentId);

    // Notificação idempotente: uma única linha por assessment.
    const { dispatchInternalReport } = await import("@/lib/notifications.server");
    await dispatchInternalReport(data.assessmentId);

    return { ok: true, completedAt };
  });
