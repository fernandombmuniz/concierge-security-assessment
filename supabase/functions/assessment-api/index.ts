// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getAdminKey(): string {
  const newSecretKeys =
    Deno.env.get("SUPABASE_SECRET_KEYS");

  if (newSecretKeys) {
    try {
      const parsed =
        JSON.parse(newSecretKeys);

      if (parsed.default) {
        return parsed.default;
      }
    } catch {
      console.error(
        "Falha ao interpretar SUPABASE_SECRET_KEYS.",
      );
    }
  }

  const legacyServiceRole =
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

  if (legacyServiceRole) {
    return legacyServiceRole;
  }

  throw new Error(
    "Nenhuma chave administrativa do Supabase disponível.",
  );
}

const supabaseUrl =
  Deno.env.get("SUPABASE_URL");

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL não disponível.",
  );
}

const supabaseAdmin =
  createClient(
    supabaseUrl,
    getAdminKey(),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

/* =========================================================
   TIPOS
========================================================= */

interface CreatePayload {
  action: "create";
  ref?: string | null;
  source?: string | null;
  privacyNoticeVersion?: string | null;
  consentAt?: string | null;
}

interface SavePayload {
  action: "save";
  assessmentId: string;
  publicToken: string;
  answers: Record<string, unknown>;
  currentStep?: number;
}

interface CompletePayload {
  action: "complete";
  assessmentId: string;
  publicToken: string;
  answers: Record<string, unknown>;

  result: {
    overallScore?: number | null;
    networkScore?: number | null;
    endpointScore?: number | null;
    continuityScore?: number | null;
    identityScore?: number | null;
    coveragePercent?: number | null;
    priorityDomain?: string | null;
    methodologyVersion?: string | null;
    findings?: unknown[];
    [key: string]: unknown;
  };
}

type RequestPayload =
  | CreatePayload
  | SavePayload
  | CompletePayload;

/* =========================================================
   HELPERS
========================================================= */

function getString(
  object: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = object[key];

    if (
      typeof value === "string" &&
      value.trim() !== ""
    ) {
      return value.trim();
    }
  }

  return null;
}

function getNumber(
  object: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = object[key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value === "string" &&
      value.trim() !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return null;
}

function getObject(
  value: unknown,
): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<
      string,
      unknown
    >;
  }

  return {};
}

function getSector(
  object: Record<string, unknown>,
): string | null {
  const sector =
    getString(object, [
      "sector",
      "companySector",
      "company_sector",
      "setor",
    ]);

  if (
    sector?.trim().toLowerCase() ===
    "outros"
  ) {
    return (
      getString(object, [
        "sectorOther",
        "sector_other",
      ]) || "Outros"
    );
  }

  return sector;
}

function escapeHtml(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function displayValue(
  value: unknown,
  fallback = "Não informado",
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return fallback;
    }

    return value.join(", ");
  }

  return String(value);
}

function displayNumber(
  value: unknown,
  suffix = "",
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Não informado";
  }

  const numberValue =
    Number(value);

  if (
    !Number.isFinite(numberValue)
  ) {
    return displayValue(value);
  }

  return `${numberValue}${suffix}`;
}

/* =========================================================
   TRADUÇÕES
========================================================= */

const labels: Record<
  string,
  string
> = {
  light: "Leve",
  medium: "Médio",
  high: "Alto",

  none: "Nenhum",
  isp: "Equipamento da operadora",
  router:
    "Roteador / firewall básico",
  utm: "UTM",
  ngfw: "NGFW",
  managed_ngfw:
    "NGFW gerenciado",

  unknown:
    "Não sei informar",

  yes: "Sim",
  no: "Não",
  partial: "Parcialmente",

  reactive_it:
    "Equipe de TI verifica quando necessário",

  outsourced_it:
    "TI terceirizada",

  security_team:
    "Equipe dedicada de segurança",

  soc:
    "SOC / monitoramento contínuo",

  basic_av:
    "Antivírus básico",

  business_av:
    "Antivírus corporativo",

  edr:
    "EDR / XDR",

  managed_edr:
    "EDR gerenciado",

  manual:
    "Backup manual",

  automated_local:
    "Backup local automatizado",

  cloud:
    "Backup em nuvem",

  multi_copy:
    "Múltiplas cópias",

  managed:
    "Backup gerenciado",

  regular:
    "Testes regulares",

  once:
    "Já foi testado",

  never:
    "Nunca testado",

  "4h":
    "Até 4 horas",

  "8h":
    "Até 8 horas",

  "1d":
    "Até 1 dia",

  "2d":
    "Até 2 dias",

  more:
    "Mais de 2 dias",

  formal:
    "Sim, existe processo definido",

  informal:
    "Processo informal",
};

function translate(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Não informado";
  }

  const key =
    String(value);

  return (
    labels[key] ||
    key
  );
}

/* =========================================================
   DOMÍNIOS
========================================================= */

function domainLabel(
  domain: unknown,
): string {
  const value =
    String(domain || "")
      .trim()
      .toLowerCase();

  const domains: Record<
    string,
    string
  > = {
    network:
      "Rede e Perímetro",

    endpoint:
      "Endpoints",

    endpoints:
      "Endpoints",

    backup:
      "Backup e Continuidade",

    continuity:
      "Backup e Continuidade",

    identity:
      "Identidade e Acesso",
  };

  return (
    domains[value] ||
    displayValue(domain)
  );
}

interface DomainScore {
  key: string;
  label: string;
  score: number;
}

function normalizeScore(
  value: unknown,
): number {
  const score =
    Number(value);

  if (
    !Number.isFinite(score)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, score),
  );
}

function getDomainScores(
  assessment: Record<
    string,
    unknown
  >,
): DomainScore[] {
  return [
    {
      key: "network",
      label:
        "Rede e Perímetro",
      score:
        normalizeScore(
          assessment.network_score,
        ),
    },

    {
      key: "endpoint",
      label:
        "Endpoints",
      score:
        normalizeScore(
          assessment.endpoint_score,
        ),
    },

    {
      key: "backup",
      label:
        "Backup e Continuidade",
      score:
        normalizeScore(
          assessment.continuity_score,
        ),
    },

    {
      key: "identity",
      label:
        "Identidade e Acesso",
      score:
        normalizeScore(
          assessment.identity_score,
        ),
    },
  ];
}

function maturityLabel(
  score: number,
): string {
  if (score <= 25) {
    return "maturidade muito baixa";
  }

  if (score <= 50) {
    return "maturidade básica";
  }

  if (score <= 75) {
    return "maturidade intermediária";
  }

  return "maior maturidade relativa";
}

function buildExecutiveReading(
  assessment: Record<
    string,
    unknown
  >,
): {
  priority: DomainScore;
  second: DomainScore;
  strongest: DomainScore;
  text: string;
} {
  const domains =
    getDomainScores(
      assessment,
    );

  const ordered =
    [...domains].sort(
      (a, b) =>
        a.score - b.score,
    );

  const priority =
    ordered[0];

  const second =
    ordered[1];

  const strongest =
    ordered[
      ordered.length - 1
    ];

  const text =
    `O diagnóstico indica que ` +
    `${priority.label} é o domínio que mais merece atenção neste momento, com ${priority.score}/100 e ${maturityLabel(priority.score)}. ` +
    `Na sequência aparece ${second.label}, com ${second.score}/100. ` +
    `${strongest.label} apresentou a maior maturidade relativa entre os controles avaliados, com ${strongest.score}/100. ` +
    `Esses resultados devem ser utilizados como ponto de partida para validar o contexto do cliente e definir quais riscos merecem aprofundamento primeiro.`;

  return {
    priority,
    second,
    strongest,
    text,
  };
}

/* =========================================================
   HTML HELPERS
========================================================= */

function emailRow(
  label: string,
  value: unknown,
) {
  return `
    <tr>
      <td style="
        padding:8px 0;
        color:#64748b;
        width:42%;
        vertical-align:top;
      ">
        ${escapeHtml(label)}
      </td>

      <td style="
        padding:8px 0;
        color:#0f172a;
        font-weight:600;
        vertical-align:top;
      ">
        ${escapeHtml(
          displayValue(value),
        )}
      </td>
    </tr>
  `;
}

function sectionTitle(
  title: string,
) {
  return `
    <div style="
      margin-top:30px;
      margin-bottom:10px;
      font-size:11px;
      letter-spacing:1.3px;
      text-transform:uppercase;
      color:#0f766e;
      font-weight:700;
    ">
      ${escapeHtml(title)}
    </div>
  `;
}

/* =========================================================
   VALIDAÇÃO
========================================================= */

async function validateAssessment(
  assessmentId: string,
  publicToken: string,
) {
  if (
    !assessmentId ||
    !publicToken
  ) {
    return {
      data: null,
      error:
        "Assessment ou token ausente.",
    };
  }

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("assessments")
    .select(
      "id, public_token, status, account_manager_id",
    )
    .eq(
      "id",
      assessmentId,
    )
    .eq(
      "public_token",
      publicToken,
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao validar assessment:",
      error,
    );

    return {
      data: null,
      error:
        "Falha ao validar o assessment.",
    };
  }

  if (!data) {
    return {
      data: null,
      error:
        "Assessment não encontrado ou token inválido.",
    };
  }

  return {
    data,
    error: null,
  };
}

/* =========================================================
   RESEND
========================================================= */

async function sendAssessmentNotification(
  assessmentId: string,
) {
  const resendApiKey =
    Deno.env.get(
      "RESEND_API_KEY",
    );

  if (!resendApiKey) {
    return {
      sent: false,
      reason:
        "resend_not_configured",
    };
  }

  const testEmailOverride =
    Deno.env.get(
      "TEST_EMAIL_OVERRIDE",
    ) || null;

  const resendFrom =
    Deno.env.get(
      "RESEND_FROM",
    ) ||
    "Concierge Security Assessment <onboarding@resend.dev>";

  /* =======================================================
     ASSESSMENT
  ======================================================= */

  const {
    data: assessment,
    error: assessmentError,
  } = await supabaseAdmin
    .from("assessments")
    .select(`
      id,
      company_name,
      company_sector,
      respondent_name,
      respondent_role,
      respondent_email,
      users_count,
      units_count,
      overall_score,
      network_score,
      endpoint_score,
      continuity_score,
      identity_score,
      coverage_percent,
      priority_domain,
      methodology_version,
      source_ref,
      account_manager_id,
      completed_at
    `)
    .eq(
      "id",
      assessmentId,
    )
    .single();

  if (
    assessmentError ||
    !assessment
  ) {
    console.error(
      "Assessment não encontrado para notificação:",
      assessmentError,
    );

    return {
      sent: false,
      reason:
        "assessment_not_found",
    };
  }

  /* =======================================================
     RESPOSTAS COMPLETAS
  ======================================================= */

  const {
    data: responseData,
    error: responseError,
  } = await supabaseAdmin
    .from(
      "assessment_responses",
    )
    .select(
      "answers, calculated_result",
    )
    .eq(
      "assessment_id",
      assessmentId,
    )
    .maybeSingle();

  if (responseError) {
    console.error(
      "Erro ao carregar respostas:",
      responseError,
    );
  }

  const answers =
    getObject(
      responseData?.answers,
    );

  /* =======================================================
     AM
  ======================================================= */

  if (
    !assessment
      .account_manager_id
  ) {
    return {
      sent: false,
      reason:
        "unassigned",
    };
  }

  const {
    data: manager,
    error: managerError,
  } = await supabaseAdmin
    .from(
      "account_managers",
    )
    .select(
      "id, name, email, public_ref, active",
    )
    .eq(
      "id",
      assessment
        .account_manager_id,
    )
    .eq(
      "active",
      true,
    )
    .single();

  if (
    managerError ||
    !manager
  ) {
    return {
      sent: false,
      reason:
        "manager_not_found",
    };
  }

  /* =======================================================
     IDEMPOTÊNCIA
  ======================================================= */

  const {
    data: existingNotification,
    error:
      existingNotificationError,
  } = await supabaseAdmin
    .from(
      "assessment_notifications",
    )
    .select(
      "id, status, attempts, sent_at",
    )
    .eq(
      "assessment_id",
      assessmentId,
    )
    .eq(
      "account_manager_id",
      manager.id,
    )
    .eq(
      "notification_type",
      "email",
    )
    .maybeSingle();

  if (
    existingNotificationError
  ) {
    console.error(
      "Erro ao consultar notificação:",
      existingNotificationError,
    );
  }

  if (
    existingNotification
      ?.status === "sent"
  ) {
    return {
      sent: true,
      alreadySent: true,
    };
  }

  const actualRecipient =
    testEmailOverride ||
    manager.email;

  let notificationId =
    existingNotification?.id ||
    null;

  if (!notificationId) {
    const {
      data: notification,
      error:
        notificationError,
    } = await supabaseAdmin
      .from(
        "assessment_notifications",
      )
      .insert({
        assessment_id:
          assessmentId,

        account_manager_id:
          manager.id,

        notification_type:
          "email",

        recipient_email:
          manager.email,

        status:
          "pending",

        attempts:
          0,
      })
      .select("id")
      .single();

    if (
      notificationError ||
      !notification
    ) {
      return {
        sent: false,
        reason:
          "notification_create_failed",
      };
    }

    notificationId =
      notification.id;
  }

  const nextAttempt =
    (
      existingNotification
        ?.attempts || 0
    ) + 1;

  /* =======================================================
     DADOS PRINCIPAIS
  ======================================================= */

  const companyName =
    assessment.company_name ||
    getString(
      answers,
      ["companyName"],
    ) ||
    "Empresa não informada";

  const sector =
    getSector(answers) ||
    assessment.company_sector ||
    "Não informado";

  const contactName =
    getString(
      answers,
      ["contactName"],
    ) ||
    assessment.respondent_name ||
    "Não informado";

  const contactRole =
    getString(
      answers,
      ["contactRole"],
    ) ||
    assessment.respondent_role ||
    "Não informado";

  const contactEmail =
    getString(
      answers,
      ["contactEmail"],
    ) ||
    assessment.respondent_email ||
    "Não informado";

  const users =
    getNumber(
      answers,
      ["users"],
    ) ??
    assessment.users_count;

  const sites =
    getNumber(
      answers,
      ["sites"],
    ) ??
    assessment.units_count;

  /* =======================================================
     LINKS
  ======================================================= */

  const links =
    Array.isArray(
      answers.links,
    )
      ? answers.links
      : [];

  const linkSpeeds =
    links
      .map((link) => {
        const item =
          getObject(link);

        const speed =
          getNumber(
            item,
            ["speedMbps"],
          );

        if (
          speed === null ||
          speed === 0
        ) {
          return null;
        }

        return `${speed} Mbps`;
      })
      .filter(Boolean)
      .join(" + ");

  /* =======================================================
     SISTEMAS CRÍTICOS
  ======================================================= */

  const criticalSystems =
    Array.isArray(
      answers.criticalSystems,
    )
      ? answers
          .criticalSystems
          .filter(
            (item) =>
              typeof item ===
                "string" &&
              item.trim() !== "",
          )
          .join(", ")
      : "";

  /* =======================================================
     LEITURA EXECUTIVA
  ======================================================= */

  const executive =
    buildExecutiveReading(
      assessment as Record<
        string,
        unknown
      >,
    );

  const translatedPriority =
    domainLabel(
      assessment
        .priority_domain,
    );

  /* =======================================================
     TESTE
  ======================================================= */

  const intendedRecipientNotice =
    testEmailOverride
      ? `
        <div style="
          margin-top:22px;
          padding:13px 16px;
          border-radius:8px;
          background:#fff7ed;
          border:1px solid #fed7aa;
          color:#9a3412;
          font-size:13px;
          line-height:1.6;
        ">
          <strong>Modo de teste:</strong>
          este relatório seria destinado a
          ${escapeHtml(manager.name)}
          (${escapeHtml(manager.email)}).
          O envio foi redirecionado
          temporariamente para
          TEST_EMAIL_OVERRIDE.
        </div>
      `
      : "";

  /* =======================================================
     HTML
  ======================================================= */

  const html = `
    <!doctype html>

    <html lang="pt-BR">

      <body style="
        margin:0;
        padding:0;
        background:#f1f5f9;
        font-family:
          Arial,
          Helvetica,
          sans-serif;
        color:#0f172a;
      ">

        <div style="
          max-width:760px;
          margin:0 auto;
          padding:32px 16px;
        ">

          <!-- CABEÇALHO -->

          <div style="
            background:#0f172a;
            border-radius:14px 14px 0 0;
            padding:30px 34px;
            color:#ffffff;
          ">

            <div style="
              font-size:11px;
              letter-spacing:1.6px;
              text-transform:uppercase;
              color:#2dd4bf;
              font-weight:700;
            ">
              Concierge Segurança Digital
            </div>

            <h1 style="
              margin:9px 0 0;
              font-size:25px;
              line-height:1.25;
            ">
              Novo Security Assessment
            </h1>

            <p style="
              margin:10px 0 0;
              color:#cbd5e1;
              font-size:14px;
              line-height:1.6;
            ">
              Um novo diagnóstico foi
              concluído e está disponível
              para análise comercial.
            </p>

          </div>

          <!-- CORPO -->

          <div style="
            background:#ffffff;
            border-radius:0 0 14px 14px;
            padding:32px 34px;
            border:1px solid #e2e8f0;
            border-top:0;
          ">

            <!-- EMPRESA -->

            <h2 style="
              margin:0;
              font-size:22px;
              line-height:1.3;
            ">
              ${escapeHtml(
                companyName,
              )}
            </h2>

            <p style="
              margin:6px 0 24px;
              color:#64748b;
              font-size:13px;
            ">
              ${escapeHtml(
                sector,
              )}
            </p>

            <!-- SCORE PRINCIPAL -->

            <div style="
              background:#f8fafc;
              border:1px solid #e2e8f0;
              border-radius:12px;
              padding:22px;
            ">

              <div style="
                font-size:11px;
                color:#64748b;
                text-transform:uppercase;
                letter-spacing:1.2px;
                font-weight:700;
              ">
                Resumo executivo
              </div>

              <div style="
                margin-top:14px;
                font-size:15px;
                line-height:1.9;
              ">

                <strong>
                  Score geral:
                </strong>

                ${escapeHtml(
                  displayValue(
                    assessment
                      .overall_score,
                  ),
                )}/100

                <br/>

                <strong>
                  Principal ponto de atenção:
                </strong>

                ${escapeHtml(
                  translatedPriority,
                )}

                <br/>

                <strong>
                  Cobertura da avaliação:
                </strong>

                ${escapeHtml(
                  displayValue(
                    assessment
                      .coverage_percent,
                  ),
                )}%

              </div>

            </div>

            <!-- LEITURA EXECUTIVA -->

            ${sectionTitle(
              "Leitura do diagnóstico",
            )}

            <div style="
              background:#f0fdfa;
              border:1px solid #99f6e4;
              border-radius:12px;
              padding:20px;
              font-size:14px;
              line-height:1.8;
              color:#134e4a;
            ">

              ${escapeHtml(
                executive.text,
              )}

            </div>

            <!-- ORDEM DE ATENÇÃO -->

            ${sectionTitle(
              "Ordem de atenção",
            )}

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                border-collapse:collapse;
                font-size:14px;
              "
            >

              ${emailRow(
                "1. Prioridade de atenção",
                `${executive.priority.label} · ${executive.priority.score}/100`,
              )}

              ${emailRow(
                "2. Segundo ponto de atenção",
                `${executive.second.label} · ${executive.second.score}/100`,
              )}

              ${emailRow(
                "Controle com maior maturidade",
                `${executive.strongest.label} · ${executive.strongest.score}/100`,
              )}

            </table>

            <!-- MATURIDADE -->

            ${sectionTitle(
              "Maturidade por domínio",
            )}

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                border-collapse:collapse;
                font-size:14px;
              "
            >

              ${emailRow(
                "Rede e Perímetro",
                `${displayValue(
                  assessment
                    .network_score,
                )}/100`,
              )}

              ${emailRow(
                "Endpoints",
                `${displayValue(
                  assessment
                    .endpoint_score,
                )}/100`,
              )}

              ${emailRow(
                "Backup e Continuidade",
                `${displayValue(
                  assessment
                    .continuity_score,
                )}/100`,
              )}

              ${emailRow(
                "Identidade e Acesso",
                `${displayValue(
                  assessment
                    .identity_score,
                )}/100`,
              )}

            </table>

            <!-- CONTATO -->

            ${sectionTitle(
              "Contato e contexto da empresa",
            )}

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                border-collapse:collapse;
                font-size:14px;
              "
            >

              ${emailRow(
                "Contato",
                contactName,
              )}

              ${emailRow(
                "Cargo",
                contactRole,
              )}

              ${emailRow(
                "E-mail",
                contactEmail,
              )}

              ${emailRow(
                "Usuários do ambiente",
                users,
              )}

              ${emailRow(
                "Dispositivos",
                answers.devices,
              )}

              ${emailRow(
                "Equipe interna de TI",
                answers.itTeamSize,
              )}

              ${emailRow(
                "Unidades / filiais",
                sites,
              )}

            </table>

            <!-- DIVISOR -->

            <div style="
              margin:32px 0;
              border-top:2px solid #e2e8f0;
            "></div>

            <div style="
              font-size:11px;
              letter-spacing:1.5px;
              text-transform:uppercase;
              font-weight:700;
              color:#475569;
              margin-bottom:4px;
            ">
              Informações para aprofundamento
            </div>

            <p style="
              margin:4px 0 0;
              font-size:13px;
              line-height:1.6;
              color:#64748b;
            ">
              Dados declarados pelo cliente
              que podem apoiar qualificação,
              dimensionamento e preparação
              da próxima conversa.
            </p>

            <!-- REDE -->

            ${sectionTitle(
              "Rede e Perímetro",
            )}

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                border-collapse:collapse;
                font-size:14px;
              "
            >

              ${emailRow(
                "Proteção de internet",
                translate(
                  answers
                    .firewallLevel,
                ),
              )}

              ${emailRow(
                "Fabricante",
                answers
                  .firewallVendor,
              )}

              ${emailRow(
                "Modelo",
                answers
                  .firewallModel,
              )}

              ${emailRow(
                "Licenciamento ativo",
                translate(
                  answers
                    .firewallLicense,
                ),
              )}

              ${emailRow(
                "Monitoramento",
                translate(
                  answers
                    .monitoring,
                ),
              )}

              ${emailRow(
                "Quantidade de links",
                answers
                  .internetLinkCount,
              )}

              ${emailRow(
                "Velocidades",
                linkSpeeds ||
                  "Não informado",
              )}

              ${emailRow(
                "Perfil de uso",
                translate(
                  answers
                    .networkUsage,
                ),
              )}

              ${emailRow(
                "VPN remota",
                answers
                  .vpnRemote,
              )}

              ${emailRow(
                "VPN entre unidades",
                answers
                  .vpnSite,
              )}

              ${emailRow(
                "VLANs",
                answers.vlans,
              )}

            </table>

            <!-- ENDPOINT -->

            ${sectionTitle(
              "Dispositivos e Endpoints",
            )}

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                border-collapse:collapse;
                font-size:14px;
              "
            >

              ${emailRow(
                "Proteção atual",
                translate(
                  answers
                    .endpointLevel,
                ),
              )}

              ${emailRow(
                "Endpoints",
                answers
                  .endpointCount,
              )}

              ${emailRow(
                "Servidores",
                answers.servers,
              )}

              ${emailRow(
                "Atualizações automáticas",
                translate(
                  answers
                    .autoUpdates,
                ),
              )}

              ${emailRow(
                "Administradores locais",
                translate(
                  answers
                    .localAdmins,
                ),
              )}

              ${emailRow(
                "Uso de equipamento pessoal",
                translate(
                  answers.byod,
                ),
              )}

            </table>

            <!-- BACKUP -->

            ${sectionTitle(
              "Backup e Continuidade",
            )}

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                border-collapse:collapse;
                font-size:14px;
              "
            >

              ${emailRow(
                "Modelo de backup",
                translate(
                  answers
                    .backupLevel,
                ),
              )}

              ${emailRow(
                "Volume aproximado",
                displayNumber(
                  answers
                    .backupVolumeGb,
                  " GB",
                ),
              )}

              ${emailRow(
                "Teste de restauração",
                translate(
                  answers
                    .restoreTests,
                ),
              )}

              ${emailRow(
                "Parada tolerada",
                translate(
                  answers
                    .maxDowntime,
                ),
              )}

            </table>

            <!-- IDENTIDADE -->

            ${sectionTitle(
              "Identidade e Acesso",
            )}

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                border-collapse:collapse;
                font-size:14px;
              "
            >

              ${emailRow(
                "MFA",
                translate(
                  answers.mfa,
                ),
              )}

              ${emailRow(
                "Contas compartilhadas",
                translate(
                  answers
                    .sharedAccounts,
                ),
              )}

              ${emailRow(
                "Remoção de acessos",
                translate(
                  answers
                    .offboarding,
                ),
              )}

            </table>

            <!-- CONTEXTO -->

            ${sectionTitle(
              "Contexto operacional",
            )}

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                border-collapse:collapse;
                font-size:14px;
              "
            >

              ${emailRow(
                "Sistemas críticos",
                criticalSystems ||
                  "Não informado",
              )}

              ${emailRow(
                "Dados pessoais ou sensíveis",
                translate(
                  answers
                    .sensitiveData,
                ),
              )}

              ${emailRow(
                "Histórico de incidente",
                translate(
                  answers
                    .incidentHistory,
                ),
              )}

              ${emailRow(
                "Principal preocupação",
                answers
                  .mainConcern,
              )}

              ${emailRow(
                "Observações",
                answers.notes,
              )}

            </table>

            ${intendedRecipientNotice}

            <!-- RODAPÉ -->

            <div style="
              margin:30px 0 20px;
              border-top:1px solid #e2e8f0;
            "></div>

            <div style="
              font-size:12px;
              line-height:1.8;
              color:#64748b;
            ">

              <strong>
                Account Manager:
              </strong>

              ${escapeHtml(
                manager.name,
              )}

              <br/>

              <strong>
                Origem:
              </strong>

              ${escapeHtml(
                displayValue(
                  assessment
                    .source_ref,
                ),
              )}

              <br/>

              <strong>
                Assessment ID:
              </strong>

              ${escapeHtml(
                assessment.id,
              )}

              <br/>

              <strong>
                Metodologia:
              </strong>

              ${escapeHtml(
                displayValue(
                  assessment
                    .methodology_version,
                ),
              )}

            </div>

            <p style="
              margin:24px 0 0;
              font-size:12px;
              line-height:1.7;
              color:#94a3b8;
            ">
              Este Security Assessment
              representa um diagnóstico
              inicial baseado nas informações
              fornecidas pelo respondente.
              Os resultados devem ser
              revisados pela equipe Concierge
              antes de qualquer recomendação
              técnica ou comercial definitiva.
            </p>

          </div>

        </div>

      </body>

    </html>
  `;

  /* =======================================================
     ENVIO
  ======================================================= */

  try {
    const resendResponse =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${resendApiKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            from:
              resendFrom,

            to: [
              actualRecipient,
            ],

            subject:
              `Novo Security Assessment | ${companyName}`,

            html,
          }),
        },
      );

    const resendData =
      await resendResponse.json();

    if (
      !resendResponse.ok
    ) {
      await supabaseAdmin
        .from(
          "assessment_notifications",
        )
        .update({
          status:
            "failed",

          error_message:
            JSON.stringify(
              resendData,
            ),

          attempts:
            nextAttempt,
        })
        .eq(
          "id",
          notificationId,
        );

      return {
        sent: false,
        reason:
          "resend_failed",
        error:
          resendData,
      };
    }

    await supabaseAdmin
      .from(
        "assessment_notifications",
      )
      .update({
        status:
          "sent",

        provider_message_id:
          resendData?.id ||
          null,

        error_message:
          null,

        attempts:
          nextAttempt,

        sent_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        notificationId,
      );

    return {
      sent: true,

      providerMessageId:
        resendData?.id ||
        null,
    };
  } catch (error) {
    await supabaseAdmin
      .from(
        "assessment_notifications",
      )
      .update({
        status:
          "failed",

        error_message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido",

        attempts:
          nextAttempt,
      })
      .eq(
        "id",
        notificationId,
      );

    return {
      sent: false,
      reason:
        "unexpected_error",
    };
  }
}

/* =========================================================
   CREATE
========================================================= */

async function createAssessment(
  payload: CreatePayload,
) {
  let accountManagerId:
    string | null = null;

  const ref =
    payload.ref
      ?.trim()
      .toLowerCase() ||
    null;

  if (ref) {
    const {
      data: manager,
      error: managerError,
    } = await supabaseAdmin
      .from(
        "account_managers",
      )
      .select(
        "id, active",
      )
      .eq(
        "public_ref",
        ref,
      )
      .eq(
        "active",
        true,
      )
      .maybeSingle();

    if (managerError) {
      return jsonResponse(
        {
          success: false,

          error:
            "Não foi possível validar o responsável comercial.",
        },
        500,
      );
    }

    if (manager) {
      accountManagerId =
        manager.id;
    }
  }

  const {
    data: assessment,
    error,
  } = await supabaseAdmin
    .from("assessments")
    .insert({
      account_manager_id:
        accountManagerId,

      source_ref:
        payload.source
          ?.trim() ||
        null,

      status:
        "draft",

      methodology_version:
        "v2.4",

      started_at:
        new Date()
          .toISOString(),
    })
    .select(
      "id, public_token, status, account_manager_id",
    )
    .single();

  if (
    error ||
    !assessment
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Não foi possível iniciar o diagnóstico.",
      },
      500,
    );
  }

  const initialAnswers = {
    _metadata: {
      currentStep: 1,

      privacyNoticeVersion:
        payload
          .privacyNoticeVersion ||
        null,

      consentAt:
        payload
          .consentAt ||
        null,
    },
  };

  const {
    error: responseError,
  } = await supabaseAdmin
    .from(
      "assessment_responses",
    )
    .insert({
      assessment_id:
        assessment.id,

      answers:
        initialAnswers,

      calculated_result:
        {},
    });

  if (responseError) {
    await supabaseAdmin
      .from("assessments")
      .delete()
      .eq(
        "id",
        assessment.id,
      );

    return jsonResponse(
      {
        success: false,

        error:
          "Não foi possível preparar o diagnóstico.",
      },
      500,
    );
  }

  return jsonResponse({
    success: true,

    assessmentId:
      assessment.id,

    publicToken:
      assessment
        .public_token,

    assigned:
      Boolean(
        assessment
          .account_manager_id,
      ),
  });
}

/* =========================================================
   SAVE
========================================================= */

async function saveAssessment(
  payload: SavePayload,
) {
  const validation =
    await validateAssessment(
      payload.assessmentId,
      payload.publicToken,
    );

  if (!validation.data) {
    return jsonResponse(
      {
        success: false,

        error:
          validation.error,
      },
      403,
    );
  }

  if (
    validation.data.status !==
    "draft"
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Este diagnóstico já foi finalizado.",
      },
      409,
    );
  }

  if (
    !payload.answers ||
    typeof payload.answers !==
      "object" ||
    Array.isArray(
      payload.answers,
    )
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Formato de respostas inválido.",
      },
      400,
    );
  }

  const existingMetadata =
    getObject(
      payload.answers
        ._metadata,
    );

  const answers = {
    ...payload.answers,

    _metadata: {
      ...existingMetadata,

      currentStep:
        typeof payload
          .currentStep ===
          "number"
          ? payload.currentStep
          : null,

      lastSavedAt:
        new Date()
          .toISOString(),
    },
  };

  const {
    error: answersError,
  } = await supabaseAdmin
    .from(
      "assessment_responses",
    )
    .update({
      answers,
    })
    .eq(
      "assessment_id",
      payload.assessmentId,
    );

  if (answersError) {
    return jsonResponse(
      {
        success: false,

        error:
          "Falha ao salvar as respostas.",
      },
      500,
    );
  }

  const companyName =
    getString(
      payload.answers,
      ["companyName"],
    );

  const companySector =
    getSector(
      payload.answers,
    );

  const respondentName =
    getString(
      payload.answers,
      ["contactName"],
    );

  const respondentRole =
    getString(
      payload.answers,
      ["contactRole"],
    );

  const respondentEmail =
    getString(
      payload.answers,
      ["contactEmail"],
    );

  const usersCount =
    getNumber(
      payload.answers,
      ["users"],
    );

  const unitsCount =
    getNumber(
      payload.answers,
      ["sites"],
    );

  const {
    error: assessmentError,
  } = await supabaseAdmin
    .from("assessments")
    .update({
      company_name:
        companyName,

      company_sector:
        companySector,

      respondent_name:
        respondentName,

      respondent_role:
        respondentRole,

      respondent_email:
        respondentEmail,

      users_count:
        usersCount,

      units_count:
        unitsCount,
    })
    .eq(
      "id",
      payload.assessmentId,
    );

  if (assessmentError) {
    return jsonResponse(
      {
        success: false,

        error:
          "Respostas salvas, mas ocorreu falha ao atualizar o resumo.",
      },
      500,
    );
  }

  return jsonResponse({
    success: true,

    savedAt:
      new Date()
        .toISOString(),
  });
}

/* =========================================================
   COMPLETE
========================================================= */

async function completeAssessment(
  payload: CompletePayload,
) {
  const validation =
    await validateAssessment(
      payload.assessmentId,
      payload.publicToken,
    );

  if (!validation.data) {
    return jsonResponse(
      {
        success: false,

        error:
          validation.error,
      },
      403,
    );
  }

  if (
    validation.data.status ===
    "completed"
  ) {
    const notification =
      await sendAssessmentNotification(
        payload.assessmentId,
      );

    return jsonResponse({
      success: true,

      alreadyCompleted:
        true,

      assessmentId:
        payload.assessmentId,

      notification,
    });
  }

  if (
    !payload.answers ||
    typeof payload.answers !==
      "object" ||
    Array.isArray(
      payload.answers,
    )
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Formato de respostas inválido.",
      },
      400,
    );
  }

  if (
    !payload.result ||
    typeof payload.result !==
      "object"
  ) {
    return jsonResponse(
      {
        success: false,

        error:
          "Resultado do diagnóstico ausente.",
      },
      400,
    );
  }

  const now =
    new Date()
      .toISOString();

  const existingMetadata =
    getObject(
      payload.answers
        ._metadata,
    );

  const finalAnswers = {
    ...payload.answers,

    _metadata: {
      ...existingMetadata,

      completedAt:
        now,
    },
  };

  const {
    error: responseError,
  } = await supabaseAdmin
    .from(
      "assessment_responses",
    )
    .update({
      answers:
        finalAnswers,

      calculated_result:
        payload.result,
    })
    .eq(
      "assessment_id",
      payload.assessmentId,
    );

  if (responseError) {
    return jsonResponse(
      {
        success: false,

        error:
          "Falha ao registrar o resultado final.",
      },
      500,
    );
  }

  const companyName =
    getString(
      payload.answers,
      ["companyName"],
    );

  const companySector =
    getSector(
      payload.answers,
    );

  const respondentName =
    getString(
      payload.answers,
      ["contactName"],
    );

  const respondentRole =
    getString(
      payload.answers,
      ["contactRole"],
    );

  const respondentEmail =
    getString(
      payload.answers,
      ["contactEmail"],
    );

  const usersCount =
    getNumber(
      payload.answers,
      ["users"],
    );

  const unitsCount =
    getNumber(
      payload.answers,
      ["sites"],
    );

  const {
    overallScore = null,
    networkScore = null,
    endpointScore = null,
    continuityScore = null,
    identityScore = null,
    coveragePercent = null,
    priorityDomain = null,
    methodologyVersion =
      "v2.4",
  } = payload.result;

  const {
    error: completeError,
  } = await supabaseAdmin
    .from("assessments")
    .update({
      status:
        "completed",

      company_name:
        companyName,

      company_sector:
        companySector,

      respondent_name:
        respondentName,

      respondent_role:
        respondentRole,

      respondent_email:
        respondentEmail,

      users_count:
        usersCount,

      units_count:
        unitsCount,

      overall_score:
        overallScore,

      network_score:
        networkScore,

      endpoint_score:
        endpointScore,

      continuity_score:
        continuityScore,

      identity_score:
        identityScore,

      coverage_percent:
        coveragePercent,

      priority_domain:
        priorityDomain,

      methodology_version:
        methodologyVersion,

      completed_at:
        now,
    })
    .eq(
      "id",
      payload.assessmentId,
    );

  if (completeError) {
    return jsonResponse(
      {
        success: false,

        error:
          "Falha ao concluir o diagnóstico.",
      },
      500,
    );
  }

  const notification =
    await sendAssessmentNotification(
      payload.assessmentId,
    );

  return jsonResponse({
    success: true,

    assessmentId:
      payload.assessmentId,

    completedAt:
      now,

    notification,
  });
}

/* =========================================================
   HTTP
========================================================= */

Deno.serve(
  async (req) => {
    if (
      req.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        },
      );
    }

    if (
      req.method !==
      "POST"
    ) {
      return jsonResponse(
        {
          success:
            false,

          error:
            "Método não permitido.",
        },
        405,
      );
    }

    try {
      const payload =
        await req.json() as
          RequestPayload;

      if (
        !payload?.action
      ) {
        return jsonResponse(
          {
            success:
              false,

            error:
              "Ação não informada.",
          },
          400,
        );
      }

      switch (
        payload.action
      ) {
        case "create":
          return await createAssessment(
            payload,
          );

        case "save":
          return await saveAssessment(
            payload,
          );

        case "complete":
          return await completeAssessment(
            payload,
          );

        default:
          return jsonResponse(
            {
              success:
                false,

              error:
                "Ação inválida.",
            },
            400,
          );
      }
    } catch (error) {
      console.error(
        "Erro inesperado:",
        error,
      );

      return jsonResponse(
        {
          success:
            false,

          error:
            error instanceof Error
              ? error.message
              : "Erro interno no processamento do diagnóstico.",
        },
        500,
      );
    }
  },
);