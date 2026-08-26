import { buildInternalReport } from "@/lib/internal-report.server";
import { sendInternalReportEmail } from "@/lib/email-sender.server";
import { parseAssessmentData } from "@/lib/assessment-schema";

/**
 * Gera e envia o relatório interno para o Account Manager responsável.
 * Idempotente: se já existe notificação enviada para o assessment, nada é feito.
 * Falhas nunca afetam o resultado exibido ao cliente.
 */
export async function dispatchInternalReport(assessmentId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: assessment } = await supabaseAdmin
    .from("assessments")
    .select(
      "id, source, completed_at, methodology_version, account_manager_id, account_managers(name, email, active)",
    )
    .eq("id", assessmentId)
    .maybeSingle();
  if (!assessment) return { status: "not_found" as const };

  const { data: existingNotification } = await supabaseAdmin
    .from("assessment_notifications")
    .select("id, status, attempts")
    .eq("assessment_id", assessmentId)
    .eq("kind", "internal_report")
    .maybeSingle();

  if (existingNotification?.status === "sent") return { status: "already_sent" as const };

  const { data: responses } = await supabaseAdmin
    .from("assessment_responses")
    .select("answers")
    .eq("assessment_id", assessmentId)
    .eq("section", "completo")
    .maybeSingle();

  const parsed = parseAssessmentData(responses?.answers ?? {});
  const manager = (assessment as unknown as { account_managers?: { name: string; email: string } })
    .account_managers;

  let recipient = manager?.email ?? null;
  let recipientType = manager ? "account_manager" : "fallback_admin";
  if (!recipient) {
    const { data: fallback } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "fallback_report_email")
      .maybeSingle();
    recipient = fallback?.value ?? process.env["FALLBACK_REPORT_EMAIL"] ?? null;
  }

  const report = buildInternalReport({
    data: parsed,
    accountManagerName: manager?.name ?? null,
    source: assessment.source ?? null,
    completedAt: assessment.completed_at ?? new Date().toISOString(),
    methodologyVersion: assessment.methodology_version ?? "v2.4",
    assessmentId,
  });

  const baseRow = {
    assessment_id: assessmentId,
    kind: "internal_report",
    recipient_email: recipient,
    recipient_type: recipientType,
    report_html: report.html,
  };

  if (!recipient) {
    await supabaseAdmin.from("assessment_notifications").upsert(
      {
        ...baseRow,
        status: "no_recipient",
        error: "Nenhum Account Manager associado e nenhum e-mail administrativo padrão definido.",
        attempts: (existingNotification?.attempts ?? 0) + 1,
      },
      { onConflict: "assessment_id,kind" },
    );
    await supabaseAdmin
      .from("assessments")
      .update({ notification_status: "no_recipient" })
      .eq("id", assessmentId);
    return { status: "no_recipient" as const };
  }

  const send = await sendInternalReportEmail({
    to: recipient,
    subject: report.subject,
    html: report.html,
    idempotencyKey: `internal-report-${assessmentId}`,
  });

  const sent = send.status === "sent";
  await supabaseAdmin.from("assessment_notifications").upsert(
    {
      ...baseRow,
      status: sent ? "sent" : send.status === "not_configured" ? "pending" : "failed",
      error: sent ? null : send.error,
      attempts: (existingNotification?.attempts ?? 0) + 1,
      sent_at: sent ? new Date().toISOString() : null,
    },
    { onConflict: "assessment_id,kind" },
  );

  await supabaseAdmin
    .from("assessments")
    .update({
      notification_status: sent ? "sent" : send.status === "not_configured" ? "pending" : "failed",
      notification_sent_at: sent ? new Date().toISOString() : null,
      notification_error: sent ? null : send.error,
    })
    .eq("id", assessmentId);

  return { status: send.status };
}

/** Reprocessa notificações pendentes/falhas (uso interno). */
export async function retryPendingNotifications(limit = 20) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("assessments")
    .select("id")
    .eq("status", "completed")
    .in("notification_status", ["pending", "failed", "no_recipient"])
    .order("completed_at", { ascending: true })
    .limit(limit);

  const results: { id: string; status: string }[] = [];
  for (const row of rows ?? []) {
    const result = await dispatchInternalReport(row.id as string);
    results.push({ id: row.id as string, status: result.status });
  }
  return results;
}
