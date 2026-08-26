import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Área interna: leitura dos assessments gravados no banco.
 *
 * O vínculo entre o usuário autenticado e o registro de Account Manager é
 * feito por e-mail no primeiro acesso, para que a RLS reconheça o AM.
 */
async function linkManager(userId: string, email: string | null) {
  if (!email) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("account_managers")
    .update({ user_id: userId })
    .eq("email", email.toLowerCase())
    .is("user_id", null);
}

export const listInternalAssessments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    await linkManager(context.userId, email);

    const { data, error } = await context.supabase
      .from("assessments")
      .select(
        "id, company_name, respondent_name, respondent_email, sector, status, overall_score, priority_domain_label, maturity_level, coverage_percentage, public_ref, source, created_at, completed_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error("Não foi possível carregar os assessments.");
    return { items: data ?? [], email };
  });

export const getInternalAssessment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    await linkManager(context.userId, email);

    const { data: assessment } = await context.supabase
      .from("assessments")
      .select("id, created_at, completed_at, status, public_ref, source")
      .eq("id", data.id)
      .maybeSingle();
    if (!assessment) return { found: false as const };

    const { data: response } = await context.supabase
      .from("assessment_responses")
      .select("answers")
      .eq("assessment_id", data.id)
      .eq("section", "completo")
      .maybeSingle();

    return {
      found: true as const,
      assessment,
      answers: (response?.answers ?? {}) as Record<string, unknown>,
    };
  });
