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
  methodologyVersion?: string | null;
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

const genericLabels: Record<
  string,
  string
> = {
  light: "Leve",
  medium: "Médio",
  high: "Alto",

  none: "Nenhum",
  isp: "Equipamento da operadora",
  router:
    "Roteador / firewall tradicional",
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
    "A TI verifica quando aparece um problema",

  outsourced_it:
    "Empresa terceirizada acompanha",

  security_team:
    "Equipe especializada de segurança",

  soc:
    "Acompanhamento contínuo / SOC",

  basic_av:
    "Antivírus básico",

  business_av:
    "Antivírus corporativo",

  edr:
    "EDR / XDR",

  managed_edr:
    "EDR / XDR gerenciado",

  manual:
    "Backup manual",

  automated_local:
    "Backup local automatizado",

  cloud:
    "Backup em nuvem",

  multi_copy:
    "Múltiplas cópias",

  managed:
    "Gerenciado",

  internal:
    "Equipe interna",

  outsourced:
    "Empresa terceirizada",

  shared:
    "Equipe interna + terceirizada",

  unmanaged:
    "Sem responsável definido",

  nobody:
    "Ninguém claramente responsável",

  periodic:
    "Relatórios / acompanhamento periódico",

  on_demand:
    "Apenas quando solicitado",

  incident_only:
    "Principalmente quando ocorre problema",

  managed_soc:
    "Equipe especializada acompanha e responde",

  defined_team:
    "Responsável ou equipe definida",

  alerts_only:
    "Alertas vistos quando necessário",

  immutable:
    "Cópia protegida contra alteração",

  isolated:
    "Cópia separada ou offline",

  separate_account:
    "Administração separada",

  same_environment:
    "Mesmo ambiente ou credenciais",

  corporate_central:
    "Dados corporativos centralizados",

  mixed:
    "Dados distribuídos entre vários locais",

  endpoints:
    "Principalmente nos computadores",

  personal_cloud:
    "Contas pessoais ou locais não gerenciados",

  saas_only:
    "Principalmente em sistemas na nuvem",

  advanced:
    "Proteção avançada",

  standard:
    "Proteção adicional",

  basic:
    "Proteção básica",

  continuous:
    "Acompanhamento contínuo",

  occasional:
    "Verificação ocasional",

  reactive:
    "Somente quando aparece problema",

  formal:
    "Processo definido",

  informal:
    "Processo informal",

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
    genericLabels[key] ||
    key
  );
}

function translateFirewallManagement(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    internal:
      "Equipe interna",

    outsourced:
      "Empresa terceirizada",

    shared:
      "Equipe interna + terceirizada",

    isp:
      "Operadora",

    unmanaged:
      "Sem responsável definido",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateFirewallReporting(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    periodic:
      "Relatórios ou acompanhamento periódico",

    on_demand:
      "Apenas quando solicitado",

    incident_only:
      "Normalmente só quando ocorre problema",

    none:
      "Não recebe acompanhamento",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateMonitoring24x7(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    yes:
      "Sim",

    partial:
      "Apenas em alguns horários",

    no:
      "Não",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateEndpointResponse(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    managed_soc:
      "Equipe especializada acompanha e responde",

    defined_team:
      "Responsável ou equipe definida",

    alerts_only:
      "Alertas vistos quando necessário",

    none:
      "Sem acompanhamento dos alertas",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateInventory(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    managed:
      "Atualizado e gerenciado",

    partial:
      "Existe, mas pode estar incompleto",

    informal:
      "Controle informal",

    none:
      "Não existe inventário",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateVulnerability(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    continuous:
      "Acompanhamento contínuo",

    regular:
      "Verificação periódica",

    occasional:
      "Verificação ocasional",

    reactive:
      "Somente quando aparece problema",

    none:
      "Não existe processo",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateBackupResponsibility(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    internal:
      "Equipe interna",

    outsourced:
      "Empresa terceirizada",

    shared:
      "Equipe interna + terceirizada",

    nobody:
      "Ninguém claramente responsável",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateDataLocation(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    corporate_central:
      "Dados corporativos centralizados",

    mixed:
      "Dados distribuídos entre vários locais",

    endpoints:
      "Principalmente nos computadores",

    personal_cloud:
      "Contas pessoais ou locais não gerenciados",

    saas_only:
      "Principalmente em sistemas na nuvem",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateBackupIsolation(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    immutable:
      "Cópia protegida contra alteração",

    isolated:
      "Cópia separada ou offline",

    separate_account:
      "Administração separada",

    same_environment:
      "Mesmo ambiente ou credenciais",

    none:
      "Sem cópia separada",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateRestoreTests(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    regular:
      "Testes periódicos",

    once:
      "Já foi testado alguma vez",

    never:
      "Nunca foi testado",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateOperationalImpact(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    low:
      "Operação continua quase normalmente",

    partial:
      "Parte da empresa ficaria parada",

    major:
      "A maior parte da empresa ficaria parada",

    halt:
      "A operação praticamente pararia",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

function translateEndpointLevel(
  value: unknown,
): string {
  const labels: Record<
    string,
    string
  > = {
    none:
      "Sem proteção padronizada",

    basic_av:
      "Antivírus básico",

    business_av:
      "Antivírus corporativo",

    edr:
      "EDR / XDR",

    managed_edr:
      "EDR / XDR gerenciado",

    unknown:
      "Não sei informar",
  };

  return (
    labels[
      String(value ?? "")
    ] ||
    translate(value)
  );
}

/* =========================================================
   DOMÍNIOS E BRIEFING INTERNO V4.1
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

function publicDomainLabel(
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
      "Internet e rede",

    endpoint:
      "Computadores",

    endpoints:
      "Computadores",

    backup:
      "Dados e backup",

    continuity:
      "Dados e backup",

    identity:
      "Contas e acessos",
  };

  return (
    domains[value] ||
    displayValue(domain)
  );
}

function normalizeScore(
  value: unknown,
): number | null {
  const score =
    Number(value);

  if (
    !Number.isFinite(score)
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(score)),
  );
}

function scoreLabel(
  value: unknown,
): string {
  const score =
    normalizeScore(value);

  return score === null
    ? "Não avaliado"
    : `${score}/100`;
}

function maturityLabel(
  score: number | null,
): string {
  if (score === null) {
    return "Não avaliado";
  }

  if (score >= 80) {
    return "Avançada";
  }

  if (score >= 65) {
    return "Adequada";
  }

  if (score >= 45) {
    return "Intermediária";
  }

  if (score >= 25) {
    return "Básica";
  }

  return "Muito baixa";
}

function money(
  value: unknown,
): string {
  const number =
    Number(value);

  if (!Number.isFinite(number)) {
    return "Não informado";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    },
  ).format(number);
}

function getCalculatedResult(
  responseData: {
    calculated_result?: unknown;
  } | null | undefined,
): Record<string, unknown> {
  return getObject(
    responseData?.calculated_result,
  );
}

function getArray(
  value: unknown,
): unknown[] {
  return Array.isArray(value)
    ? value
    : [];
}

function readNestedObject(
  object: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  return getObject(
    object[key],
  );
}

function readinessText(
  value: unknown,
): {
  answered: number;
  total: number;
  percentage: number;
  missing: string[];
} {
  const object =
    getObject(value);

  const answered =
    getNumber(
      object,
      ["answered"],
    ) ?? 0;

  const total =
    getNumber(
      object,
      ["total"],
    ) ?? 0;

  const percentage =
    getNumber(
      object,
      ["percentage"],
    ) ?? 0;

  const missing =
    Array.isArray(
      object.missing,
    )
      ? object.missing
          .filter(
            (item) =>
              typeof item ===
              "string",
          )
          .map(String)
      : [];

  return {
    answered,
    total,
    percentage,
    missing,
  };
}

function readinessBadge(
  label: string,
  readiness: {
    answered: number;
    total: number;
    percentage: number;
    missing: string[];
  },
): string {
  const status =
    readiness.percentage >= 85
      ? "Pronto para pré-dimensionamento"
      : readiness.percentage >= 60
        ? "Pré-dimensionável com confirmações"
        : "Ainda faltam dados importantes";

  const color =
    readiness.percentage >= 85
      ? "#047857"
      : readiness.percentage >= 60
        ? "#0e7490"
        : "#b45309";

  const bg =
    readiness.percentage >= 85
      ? "#ecfdf5"
      : readiness.percentage >= 60
        ? "#ecfeff"
        : "#fffbeb";

  return `
    <div style="
      border:1px solid #e2e8f0;
      border-radius:12px;
      padding:15px;
      margin-bottom:12px;
    ">
      <div style="
        font-size:15px;
        font-weight:700;
        color:#0f172a;
      ">
        ${escapeHtml(label)}
      </div>

      <div style="
        display:inline-block;
        margin-top:8px;
        padding:4px 9px;
        border-radius:999px;
        font-size:11px;
        font-weight:700;
        color:${color};
        background:${bg};
        border:1px solid #e2e8f0;
      ">
        ${readiness.answered}/${readiness.total} dados · ${Math.round(readiness.percentage)}%
      </div>

      <div style="
        margin-top:8px;
        font-size:12px;
        color:#475569;
      ">
        ${escapeHtml(status)}
      </div>

      <div style="
        margin-top:8px;
        font-size:12px;
        line-height:1.55;
        color:#64748b;
      ">
        <strong>Confirmar:</strong>
        ${
          readiness.missing.length
            ? escapeHtml(
                readiness.missing.join(", "),
              )
            : "Nenhuma pendência essencial identificada."
        }
      </div>
    </div>
  `;
}

function findingCard(
  finding: unknown,
  index: number,
): string {
  const item =
    getObject(finding);

  return `
    <div style="
      border:1px solid #e2e8f0;
      border-radius:10px;
      padding:14px;
      margin-bottom:12px;
    ">
      <div style="
        font-size:11px;
        color:#0f766e;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:.08em;
      ">
        #${index + 1}
        ·
        ${escapeHtml(
          displayValue(
            item.domain,
          ),
        )}
        ·
        ${escapeHtml(
          displayValue(
            item.severity,
          ),
        )}
      </div>

      <div style="
        margin-top:5px;
        font-size:15px;
        font-weight:700;
        color:#0f172a;
      ">
        ${escapeHtml(
          displayValue(
            item.title,
          ),
        )}
      </div>

      <p style="
        margin:8px 0 0;
        font-size:13px;
        line-height:1.55;
        color:#334155;
      ">
        <strong>Situação:</strong>
        ${escapeHtml(
          displayValue(
            item.situation,
          ),
        )}
      </p>

      <p style="
        margin:6px 0 0;
        font-size:13px;
        line-height:1.55;
        color:#334155;
      ">
        <strong>Impacto:</strong>
        ${escapeHtml(
          displayValue(
            item.consequence,
          ),
        )}
      </p>

      <p style="
        margin:6px 0 0;
        font-size:12px;
        line-height:1.55;
        color:#64748b;
      ">
        <strong>Ponto técnico:</strong>
        ${escapeHtml(
          displayValue(
            item.technical,
          ),
        )}
      </p>
    </div>
  `;
}

function criticalRuleCard(
  rule: unknown,
): string {
  const item =
    getObject(rule);

  return `
    <div style="
      border-left:4px solid #f59e0b;
      background:#fffbeb;
      padding:11px 13px;
      margin-bottom:9px;
      border-radius:7px;
    ">
      <div style="
        font-size:13px;
        font-weight:700;
        color:#92400e;
      ">
        ${escapeHtml(
          displayValue(
            item.title,
          ),
        )}
      </div>

      <div style="
        margin-top:3px;
        font-size:12px;
        line-height:1.5;
        color:#78350f;
      ">
        ${escapeHtml(
          displayValue(
            item.reason,
          ),
        )}
      </div>
    </div>
  `;
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

  const calculated =
    getCalculatedResult(
      responseData,
    );

  const scoringSnapshot =
    getObject(
      calculated.scoringSnapshot,
    );

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

  const devices =
    getNumber(
      answers,
      ["endpointCount", "devices"],
    );

  const servers =
    getNumber(
      answers,
      ["servers"],
    );

  const sites =
    getNumber(
      answers,
      ["sites"],
    ) ??
    assessment.units_count;

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

  const priorityDomain =
    getString(
      calculated,
      ["priorityDomain"],
    ) ||
    getString(
      calculated,
      ["priority"],
    ) ||
    assessment.priority_domain ||
    null;

  const contextualPriority =
    getString(
      calculated,
      ["contextualPriority"],
    ) ||
    getString(
      scoringSnapshot,
      ["contextualPriority"],
    ) ||
    priorityDomain;

  const contextualPriorityLabel =
    getString(
      calculated,
      ["contextualPriorityLabel"],
    ) ||
    getString(
      scoringSnapshot,
      ["contextualPriorityLabel"],
    ) ||
    domainLabel(
      contextualPriority,
    );

  const priorityLevel =
    getString(
      calculated,
      ["priorityLevel"],
    ) ||
    getString(
      scoringSnapshot,
      ["priorityLevel"],
    ) ||
    "Não informado";

  const findings =
    getArray(
      calculated.findings,
    ).length
      ? getArray(
          calculated.findings,
        )
      : getArray(
          scoringSnapshot.findings,
        );

  const topFindings =
    findings.slice(0, 3);

  const criticalRules =
    getArray(
      calculated.criticalRules,
    ).length
      ? getArray(
          calculated.criticalRules,
        )
      : getArray(
          scoringSnapshot.criticalRules,
        );

  const commercialReadiness =
    readNestedObject(
      calculated,
      "commercialReadiness",
    );

  const readinessSource =
    Object.keys(
      commercialReadiness,
    ).length
      ? commercialReadiness
      : readNestedObject(
          scoringSnapshot,
          "commercialReadiness",
        );

  const firewallReadiness =
    readinessText(
      readinessSource.firewall,
    );

  const endpointReadiness =
    readinessText(
      readinessSource.endpoint,
    );

  const backupReadiness =
    readinessText(
      readinessSource.backup,
    );

  const opportunityFit =
    readNestedObject(
      calculated,
      "opportunityFit",
    );

  const opportunitySource =
    Object.keys(
      opportunityFit,
    ).length
      ? opportunityFit
      : readNestedObject(
          scoringSnapshot,
          "opportunityFit",
        );

  const opportunityNotes =
    readNestedObject(
      calculated,
      "opportunityNotes",
    );

  const opportunityNotesSource =
    Object.keys(
      opportunityNotes,
    ).length
      ? opportunityNotes
      : readNestedObject(
          scoringSnapshot,
          "opportunityNotes",
        );

  const dimensioningSnapshot =
    readNestedObject(
      calculated,
      "dimensioningSnapshot",
    );

  const dimensioningSource =
    Object.keys(
      dimensioningSnapshot,
    ).length
      ? dimensioningSnapshot
      : readNestedObject(
          scoringSnapshot,
          "dimensioningSnapshot",
        );

  const firewallSnapshot =
    getObject(
      dimensioningSource.firewall,
    );

  const endpointSnapshot =
    getObject(
      dimensioningSource.endpoint,
    );

  const backupSnapshot =
    getObject(
      dimensioningSource.backup,
    );

  const impactRangeRaw =
    Array.isArray(
      calculated.impactRange,
    )
      ? calculated.impactRange
      : Array.isArray(
          scoringSnapshot.impactRange,
        )
        ? scoringSnapshot.impactRange
        : [];

  const impactLow =
    Number(
      impactRangeRaw[0],
    );

  const impactHigh =
    Number(
      impactRangeRaw[1],
    );

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

  const firewallFit =
    getNumber(
      opportunitySource,
      ["firewall"],
    );

  const endpointFit =
    getNumber(
      opportunitySource,
      ["endpoint"],
    );

  const backupFit =
    getNumber(
      opportunitySource,
      ["backup"],
    );

  const strongestCommercial =
    [
      {
        label:
          "Firewall / Rede",
        value:
          firewallFit ?? 0,
      },
      {
        label:
          "Endpoint",
        value:
          endpointFit ?? 0,
      },
      {
        label:
          "Backup",
        value:
          backupFit ?? 0,
      },
    ].sort(
      (a, b) =>
        b.value - a.value,
    )[0];

  const html = `
    <!doctype html>
    <html lang="pt-BR">
      <body style="
        margin:0;
        padding:0;
        background:#f1f5f9;
        font-family:Arial,Helvetica,sans-serif;
        color:#0f172a;
      ">
        <div style="
          max-width:760px;
          margin:0 auto;
          padding:32px 16px;
        ">
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
              Briefing interno para preparar a próxima conversa.
            </p>
          </div>

          <div style="
            background:#ffffff;
            border-radius:0 0 14px 14px;
            padding:32px 34px;
            border:1px solid #e2e8f0;
            border-top:0;
          ">
            <h2 style="
              margin:0;
              font-size:22px;
              line-height:1.3;
            ">
              ${escapeHtml(companyName)}
            </h2>

            <p style="
              margin:6px 0 24px;
              color:#64748b;
              font-size:13px;
            ">
              ${escapeHtml(sector)}
            </p>

            <div style="
              border:1px solid #ccfbf1;
              background:#f0fdfa;
              border-radius:12px;
              padding:18px;
            ">
              <div style="
                font-size:11px;
                text-transform:uppercase;
                letter-spacing:.09em;
                color:#0f766e;
                font-weight:700;
              ">
                Leitura interna
              </div>

              <div style="
                margin-top:8px;
                font-size:18px;
                font-weight:700;
                color:#0f172a;
              ">
                Prioridade técnica contextual:
                ${escapeHtml(
                  contextualPriorityLabel,
                )}
              </div>

              <div style="
                margin-top:7px;
                font-size:13px;
                line-height:1.6;
                color:#475569;
              ">
                Prioridade pública do relatório:
                <strong>
                  ${escapeHtml(
                    publicDomainLabel(
                      priorityDomain,
                    ),
                  )}
                </strong>
                ·
                Nível interno:
                <strong>
                  ${escapeHtml(priorityLevel)}
                </strong>
              </div>

              <div style="
                margin-top:9px;
                font-size:12px;
                line-height:1.6;
                color:#64748b;
              ">
                A prioridade técnica contextual considera risco e contexto. A aderência comercial indica onde a abordagem pode ser mais prática. Nenhuma delas altera o score mostrado ao cliente.
              </div>
            </div>

            ${sectionTitle(
              "Empresa e contato",
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
                "Usuários",
                users,
              )}

              ${emailRow(
                "Computadores / notebooks",
                devices,
              )}

              ${emailRow(
                "Servidores",
                servers,
              )}

              ${emailRow(
                "Unidades",
                sites,
              )}
            </table>

            ${sectionTitle(
              "Indicadores técnicos",
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
                "Indicador geral",
                scoreLabel(
                  assessment.overall_score,
                ),
              )}

              ${emailRow(
                "Classificação geral",
                maturityLabel(
                  normalizeScore(
                    assessment.overall_score,
                  ),
                ),
              )}

              ${emailRow(
                "Internet e rede",
                scoreLabel(
                  assessment.network_score,
                ),
              )}

              ${emailRow(
                "Computadores",
                scoreLabel(
                  assessment.endpoint_score,
                ),
              )}

              ${emailRow(
                "Dados e backup",
                scoreLabel(
                  assessment.continuity_score,
                ),
              )}

              ${emailRow(
                "Contas e acessos",
                scoreLabel(
                  assessment.identity_score,
                ),
              )}

              ${emailRow(
                "Cobertura",
                `${displayValue(
                  assessment.coverage_percent,
                )}%`,
              )}
            </table>

            ${sectionTitle(
              "3 achados que mais importam",
            )}

            ${
              topFindings.length
                ? topFindings
                    .map(
                      (finding, index) =>
                        findingCard(
                          finding,
                          index,
                        ),
                    )
                    .join("")
                : `
                  <p style="
                    font-size:13px;
                    color:#64748b;
                  ">
                    Nenhum achado prioritário foi registrado.
                  </p>
                `
            }

            ${sectionTitle(
              "Regras críticas acionadas",
            )}

            ${
              criticalRules.length
                ? criticalRules
                    .map(
                      (rule) =>
                        criticalRuleCard(
                          rule,
                        ),
                    )
                    .join("")
                : `
                  <p style="
                    font-size:13px;
                    color:#64748b;
                  ">
                    Nenhuma regra crítica adicional foi acionada.
                  </p>
                `
            }

            ${sectionTitle(
              "Preparação comercial",
            )}

            <div style="
              background:#f8fafc;
              border:1px solid #e2e8f0;
              border-radius:12px;
              padding:16px;
              margin-bottom:14px;
            ">
              <div style="
                font-size:12px;
                color:#64748b;
              ">
                Frente comercial com maior aderência
              </div>

              <div style="
                margin-top:4px;
                font-size:18px;
                font-weight:700;
                color:#0f172a;
              ">
                ${escapeHtml(
                  strongestCommercial.label,
                )}
                ·
                ${strongestCommercial.value}/100
              </div>
            </div>

            ${readinessBadge(
              "Firewall / Rede",
              firewallReadiness,
            )}

            ${readinessBadge(
              "Endpoint",
              endpointReadiness,
            )}

            ${readinessBadge(
              "Backup",
              backupReadiness,
            )}

            ${sectionTitle(
              "Firewall / Rede · dados para reunião",
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
                "Usuários",
                getNumber(
                  firewallSnapshot,
                  ["users"],
                ) ?? users,
              )}

              ${emailRow(
                "Dispositivos",
                getNumber(
                  firewallSnapshot,
                  ["devices"],
                ) ?? devices,
              )}

              ${emailRow(
                "Unidades",
                getNumber(
                  firewallSnapshot,
                  ["sites"],
                ) ?? sites,
              )}

              ${emailRow(
                "Links",
                linkSpeeds ||
                  "Não informado",
              )}

              ${emailRow(
                "Tecnologia atual",
                getString(
                  firewallSnapshot,
                  ["currentTechnology"],
                ) ||
                  [
                    getString(
                      answers,
                      ["firewallVendor"],
                    ),
                    getString(
                      answers,
                      ["firewallModel"],
                    ),
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                  translate(
                    answers.firewallLevel,
                  ),
              )}

              ${emailRow(
                "Gestão",
                translateFirewallManagement(
                  getString(
                    firewallSnapshot,
                    ["management"],
                  ) ||
                    answers.firewallManagement,
                ),
              )}

              ${emailRow(
                "Relatórios",
                translateFirewallReporting(
                  getString(
                    firewallSnapshot,
                    ["reporting"],
                  ) ||
                    answers.firewallReporting,
                ),
              )}

              ${emailRow(
                "Monitoramento 24x7",
                translateMonitoring24x7(
                  getString(
                    firewallSnapshot,
                    ["monitoring24x7"],
                  ) ||
                    answers.firewallMonitoring24x7,
                ),
              )}

              ${emailRow(
                "Acesso remoto",
                getNumber(
                  firewallSnapshot,
                  ["vpnRemote"],
                ) ??
                  answers.vpnRemote,
              )}

              ${emailRow(
                "VPN entre unidades",
                getNumber(
                  firewallSnapshot,
                  ["vpnSite"],
                ) ??
                  answers.vpnSite,
              )}

              ${emailRow(
                "VLANs",
                getNumber(
                  firewallSnapshot,
                  ["vlans"],
                ) ??
                  answers.vlans,
              )}

              ${emailRow(
                "Observação interna",
                getString(
                  opportunityNotesSource,
                  ["firewall"],
                ) ||
                  "Não informado",
              )}
            </table>

            ${sectionTitle(
              "Endpoint · dados para reunião",
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
                "Quantidade",
                getNumber(
                  endpointSnapshot,
                  ["quantity"],
                ) ??
                  devices,
              )}

              ${emailRow(
                "Fabricante",
                getString(
                  endpointSnapshot,
                  ["vendor"],
                ) ||
                  answers.endpointVendor,
              )}

              ${emailRow(
                "Produto / licença",
                getString(
                  endpointSnapshot,
                  ["product"],
                ) ||
                  answers.endpointProduct,
              )}

              ${emailRow(
                "Nível efetivo inferido",
                translateEndpointLevel(
                  getString(
                    endpointSnapshot,
                    ["protectionLevel"],
                  ) ||
                    getString(
                      calculated,
                      ["effectiveEndpointLevel"],
                    ),
                ),
              )}

              ${emailRow(
                "Gestão central",
                translate(
                  answers.endpointCentralManagement,
                ),
              )}

              ${emailRow(
                "Resposta aos alertas",
                translateEndpointResponse(
                  getString(
                    endpointSnapshot,
                    ["response"],
                  ) ||
                    answers.endpointResponse,
                ),
              )}

              ${emailRow(
                "Inventário",
                translateInventory(
                  answers.assetInventory,
                ),
              )}

              ${emailRow(
                "Vulnerabilidades",
                translateVulnerability(
                  answers.vulnerabilityManagement,
                ),
              )}

              ${emailRow(
                "Observação interna",
                getString(
                  opportunityNotesSource,
                  ["endpoint"],
                ) ||
                  "Não informado",
              )}
            </table>

            ${sectionTitle(
              "Backup · dados para reunião",
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
                "Servidores",
                getNumber(
                  backupSnapshot,
                  ["servers"],
                ) ??
                  servers,
              )}

              ${emailRow(
                "Volume aproximado",
                (() => {
                  const value =
                    getNumber(
                      backupSnapshot,
                      ["volumeGb"],
                    ) ??
                    getNumber(
                      answers,
                      ["backupVolumeGb"],
                    );

                  return value
                    ? `${value} GB`
                    : "Não informado";
                })(),
              )}

              ${emailRow(
                "Fabricante",
                getString(
                  backupSnapshot,
                  ["vendor"],
                ) ||
                  answers.backupVendor,
              )}

              ${emailRow(
                "Produto / licença",
                getString(
                  backupSnapshot,
                  ["product"],
                ) ||
                  answers.backupProduct,
              )}

              ${emailRow(
                "Responsável",
                translateBackupResponsibility(
                  getString(
                    backupSnapshot,
                    ["responsibility"],
                  ) ||
                    answers.backupResponsibility,
                ),
              )}

              ${emailRow(
                "Onde ficam os dados",
                translateDataLocation(
                  answers.dataLocation,
                ),
              )}

              ${emailRow(
                "Isolamento",
                translateBackupIsolation(
                  getString(
                    backupSnapshot,
                    ["isolation"],
                  ) ||
                    answers.backupIsolation,
                ),
              )}

              ${emailRow(
                "Teste de restauração",
                translateRestoreTests(
                  getString(
                    backupSnapshot,
                    ["restoreTests"],
                  ) ||
                    answers.restoreTests,
                ),
              )}

              ${emailRow(
                "Parada tolerada",
                translate(
                  answers.maxDowntime,
                ),
              )}

              ${emailRow(
                "Impacto operacional",
                translateOperationalImpact(
                  answers.operationalImpact,
                ),
              )}

              ${emailRow(
                "Observação interna",
                getString(
                  opportunityNotesSource,
                  ["backup"],
                ) ||
                  "Não informado",
              )}
            </table>

            ${sectionTitle(
              "Contexto do cliente",
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
                "Dados pessoais ou sensíveis",
                translate(
                  answers.sensitiveData,
                ),
              )}

              ${emailRow(
                "Histórico de incidente",
                translate(
                  answers.incidentHistory,
                ),
              )}

              ${emailRow(
                "Principal preocupação",
                answers.mainConcern,
              )}

              ${emailRow(
                "Sistemas críticos",
                criticalSystems ||
                  "Não informado",
              )}
            </table>

            ${sectionTitle(
              "Cenário financeiro ilustrativo",
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
                "Faixa",
                Number.isFinite(
                  impactLow,
                ) &&
                Number.isFinite(
                  impactHigh,
                )
                  ? `${money(
                      impactLow,
                    )} a ${money(
                      impactHigh,
                    )}`
                  : "Não informado",
              )}
            </table>

            ${intendedRecipientNotice}

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
                  assessment.source_ref,
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
                  assessment.methodology_version,
                ),
              )}
            </div>

            <p style="
              margin:24px 0 0;
              font-size:12px;
              line-height:1.7;
              color:#94a3b8;
            ">
              Este briefing é interno. O Security Assessment representa um diagnóstico inicial baseado nas informações fornecidas pelo respondente. Qualquer recomendação, dimensionamento ou proposta deve ser validada pelo Account Manager e pela equipe técnica antes de apresentação ao cliente.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

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
        "v4.1-adaptive-refined",

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

      methodology_version:
        payload.methodologyVersion ||
        "v4.1-adaptive-refined",
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
      "v4.1-adaptive-refined",
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