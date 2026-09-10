import { parseAssessmentData } from "@/lib/assessment-schema";
import { scoreAssessment } from "@/scoring";

export const METHODOLOGY_VERSION = "v4.1-adaptive-refined";
export const PRIVACY_NOTICE_VERSION = "2026-01";

interface ApiResponse {
  success?: boolean;
  error?: string;
  assessmentId?: string;
  publicToken?: string;
  assigned?: boolean;
  savedAt?: string;
  completedAt?: string;
  alreadyCompleted?: boolean;
  answers?: unknown;
  expiresAt?: string;
}

function getSupabaseUrl(): string {
  const url =
    import.meta.env["VITE_SUPABASE_URL"] as string | undefined;

  if (!url) {
    throw new Error(
      "VITE_SUPABASE_URL não configurada.",
    );
  }

  return url.replace(/\/$/, "");
}

function getPublishableKey(): string {
  const key =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as
      | string
      | undefined;

  if (!key) {
    throw new Error(
      "VITE_SUPABASE_PUBLISHABLE_KEY não configurada.",
    );
  }

  return key;
}

function getAssessmentApiUrl(): string {
  return `${getSupabaseUrl()}/functions/v1/assessment-api`;
}

async function callAssessmentApi(
  payload: Record<string, unknown>,
): Promise<ApiResponse> {
  const response = await fetch(
    getAssessmentApiUrl(),
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        apikey: getPublishableKey(),
      },

      body: JSON.stringify(payload),
    },
  );

  let body: ApiResponse = {};

  try {
    body =
      (await response.json()) as ApiResponse;
  } catch {
    // A resposta pode não ser JSON em uma falha de infraestrutura.
  }

  if (
    !response.ok ||
    body.success === false
  ) {
    throw new Error(
      body.error ??
        `Falha na comunicação com o Security Assessment (${response.status}).`,
    );
  }

  return body;
}

export async function startAssessment({
  data,
}: {
  data: {
    ref?: string | null;
    source?: string | null;
    consent: boolean;
  };
}) {
  if (!data.consent) {
    throw new Error(
      "Consentimento obrigatório.",
    );
  }

  const result =
    await callAssessmentApi({
      action: "create",

      ref:
        data.ref ?? null,

      source:
        data.source ?? null,

      privacyNoticeVersion:
        PRIVACY_NOTICE_VERSION,

      consentAt:
        new Date().toISOString(),
    });

  if (
    !result.assessmentId ||
    !result.publicToken
  ) {
    throw new Error(
      "A API não retornou uma sessão válida.",
    );
  }

  return {
    assessmentId:
      result.assessmentId,

    editToken:
      result.publicToken,
  };
}

export async function saveAssessmentProgress({
  data,
}: {
  data: {
    assessmentId: string;
    editToken: string;
    step: number;
    data: unknown;
  };
}) {
  const parsed =
    parseAssessmentData(
      data.data,
    );

  const result =
    await callAssessmentApi({
      action: "save",

      assessmentId:
        data.assessmentId,

      publicToken:
        data.editToken,

      answers:
        parsed,

      currentStep:
        data.step,

      methodologyVersion:
        METHODOLOGY_VERSION,
    });

  return {
    savedAt:
      result.savedAt ??
      new Date().toISOString(),
  };
}

export async function completeAssessment({
  data,
}: {
  data: {
    assessmentId: string;
    editToken: string;
    data: unknown;
  };
}) {
  const parsed =
    parseAssessmentData(
      data.data,
    );

  const result =
    scoreAssessment(parsed);

  const response =
    await callAssessmentApi({
      action: "complete",

      assessmentId:
        data.assessmentId,

      publicToken:
        data.editToken,

      answers:
        parsed,

      result: {
        /**
         * Score técnico público.
         */
        overallScore:
          result.overall,

        networkScore:
          result.scores.network,

        endpointScore:
          result.scores.endpoint,

        continuityScore:
          result.scores.backup,

        identityScore:
          result.scores.identity,

        coveragePercent:
          result.completeness,

        /**
         * Prioridade pública:
         * menor indicador entre os domínios avaliados.
         */
        priorityDomain:
          result.priority,

        priorityLabel:
          result.priorityLabel,

        /**
         * Prioridade contextual:
         * exclusivamente interna.
         */
        contextualPriority:
          result.contextualPriority,

        contextualPriorityLabel:
          result.contextualPriorityLabel,

        priorityFactors:
          result.priorityFactors,

        priorityLevel:
          result.priorityLevel,

        /**
         * Diagnóstico.
         */
        findings:
          result.findings,

        criticalRules:
          result.criticalRules,

        dependencies:
          result.dependencies,

        targetScores:
          result.targetScores,

        targetGaps:
          result.targetGaps,

        domainCoverage:
          result.domainCoverage,

        domainConfidence:
          result.domainConfidence,

        technicalDepth:
          result.technicalDepth,

        effectiveEndpointLevel:
          result.effectiveEndpointLevel,

        /**
         * Camada exclusivamente interna/comercial.
         *
         * Estes dados nunca devem ser exibidos no relatório público
         * sem decisão explícita da aplicação.
         */
        opportunityFit:
          result.opportunityFit,

        opportunityNotes:
          result.opportunityNotes,

        commercialReadiness:
          result.commercialReadiness,

        dimensioningSnapshot:
          result.dimensioningSnapshot,

        /**
         * Cenário financeiro ilustrativo.
         */
        impactRange:
          result.impactRange,

        impactComponents:
          result.impactComponents,

        impactAssumptions:
          result.impactAssumptions,

        /**
         * Metodologia e auditoria.
         */
        methodologyVersion:
          METHODOLOGY_VERSION,

        scoringSnapshot:
          result,
      },
    });

  return {
    ok: true,

    completedAt:
      response.completedAt ??
      new Date().toISOString(),
  };
}


export async function loadInternalAssessmentReport(
  token: string,
): Promise<{
  data: ReturnType<
    typeof parseAssessmentData
  >;
  expiresAt?: string;
}> {
  if (!token.trim()) {
    throw new Error(
      "Token interno ausente.",
    );
  }

  const result =
    await callAssessmentApi({
      action:
        "internal_report",

      token:
        token.trim(),
    });

  if (!result.answers) {
    throw new Error(
      "A API não retornou os dados do relatório.",
    );
  }

  const data =
    parseAssessmentData(
      result.answers,
    );

  if (result.expiresAt) {
    return {
      data,
      expiresAt:
        result.expiresAt,
    };
  }

  return {
    data,
  };
}
