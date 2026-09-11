import {
  useEffect,
  useState,
} from 'react';

import {
  useSearchParams,
  useNavigate,
} from 'react-router-dom';

import {
  loadDraft,
  getSubmission,
} from '../storage';

import { AssessmentData } from '../types';

import {
  scoreAssessment,
  maturityLevel,
  DomainKey,
} from '../scoring';

import SecurityMaturityMeter from '../components/SecurityMaturityMeter';
import ImpactChart from '../components/ImpactChart';
import PriorityPlan from '../components/PriorityPlan';
import ClientHeader from '../components/ClientHeader';

import {
  getValidatedSource,
  getValidatedSourceForFinding,
} from '../sourceRegistry';

import {
  buildExecutiveNarrative,
  buildImpactContext,
  getContextualInsights,
  plainDomainLabel,
  presentFinding,
  severityToClientLabel,
} from '../lib/contextual-insights';

import {
  generateAssessmentPdf,
  sanitizePdfFileName,
} from '../lib/report-pdf';

import {
  AlertTriangle,
  Database,
  KeyRound,
  MonitorSmartphone,
  Server,
  ShieldCheck,
  Info,
  X,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  HelpCircle,
  Download,
  Loader2,
  LockKeyhole,
} from 'lucide-react';

import {
  selectTopFindings,
} from '../lib/finding-priority';

import {
  buildPriorityPlan,
} from '../lib/priority-engine';

import {
  loadInternalAssessmentReport,
} from '../lib/assessment.functions';

import { readAttribution } from '../lib/assessment-session';

type ResultState = {
  data: AssessmentData;
  fromSubmission: boolean;
  protected: boolean;
};

type AssessmentContact = {
  name: string;
  email: string;
};

const CONTACT_BY_REF: Record<string, AssessmentContact> = {
  fernando: {
    name: 'Fernando Muniz',
    email: 'fernando.muniz@concierge.seg.br',
  },
  leonardo: {
    name: 'Leonardo Araujo',
    email: 'leonardo.araujo@concierge.seg.br',
  },
};

const resolveAssessmentContact = (): AssessmentContact | null => {
  const ref = readAttribution().ref?.trim().toLowerCase();
  return ref ? CONTACT_BY_REF[ref] ?? null : null;
};

const rangeLabel = (
  n: number,
  kind:
    | 'people'
    | 'devices' = 'people',
) => {
  const noun =
    kind === 'people'
      ? 'pessoas'
      : 'equipamentos';

  if (!n) {
    return 'Não informado';
  }

  if (n <= 10) {
    return `Até 10 ${noun}`;
  }

  if (n <= 20) {
    return `11 a 20 ${noun}`;
  }

  if (n <= 50) {
    return `21 a 50 ${noun}`;
  }

  if (n <= 100) {
    return `51 a 100 ${noun}`;
  }

  if (n <= 200) {
    return `101 a 200 ${noun}`;
  }

  return `Mais de 200 ${noun}`;
};

const money = (n: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(
    Number.isFinite(n)
      ? n
      : 0,
  );

const safeScore = (
  value: number | null,
) => {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  );
};

const resolveResultState = (
  urlId: string | null,
): ResultState => {
  /**
   * Regra de privacidade:
   *
   * se existe um ID explícito na URL,
   * só podemos mostrar exatamente aquele
   * assessment se ele existir neste navegador.
   *
   * Nunca fazemos fallback para outro
   * assessment ou draft.
   */
  if (urlId) {
    const submission =
      getSubmission(urlId);

    if (submission) {
      return {
        data: submission.data,
        fromSubmission: true,
        protected: false,
      };
    }

    return {
      data: loadDraft(),
      fromSubmission: false,
      protected: true,
    };
  }

  /**
   * Sem ID explícito, podemos tentar
   * recuperar o último diagnóstico local.
   */
  const lastId =
    localStorage.getItem(
      'concierge-client-last-assessment-id-v2',
    );

  if (lastId) {
    const submission =
      getSubmission(lastId);

    if (submission) {
      return {
        data: submission.data,
        fromSubmission: true,
        protected: false,
      };
    }
  }

  /**
   * Último fallback permitido:
   * rascunho do próprio navegador.
   */
  return {
    data: loadDraft(),
    fromSubmission: false,
    protected: false,
  };
};

export default function ClientResults() {
  const [searchParams] =
    useSearchParams();

  const navigate =
    useNavigate();

  const showSuccess =
    searchParams.get('success') ===
    'true';

  const urlId =
    searchParams.get('id');

  const internalReportToken =
    searchParams.get(
      'internalReport',
    );

  const assessmentContact = internalReportToken
    ? null
    : resolveAssessmentContact();

  const [resultState, setResultState] =
    useState<ResultState>(() =>
      internalReportToken
        ? {
            data: loadDraft(),
            fromSubmission: false,
            protected: false,
          }
        : resolveResultState(
            urlId,
          ),
    );

  const [
    isInternalReportLoading,
    setIsInternalReportLoading,
  ] = useState(
    Boolean(
      internalReportToken,
    ),
  );

  const [
    internalReportError,
    setInternalReportError,
  ] = useState<
    string | null
  >(null);

  const [
    isScoreModalOpen,
    setIsScoreModalOpen,
  ] = useState(false);

  const [
    isDiagnosisModalOpen,
    setIsDiagnosisModalOpen,
  ] = useState(false);

  const [
    isFaixaModalOpen,
    setIsFaixaModalOpen,
  ] = useState(false);

  const [
    expandedFindings,
    setExpandedFindings,
  ] = useState<Set<string>>(
    () => new Set(),
  );

  const [
    isPdfGenerating,
    setIsPdfGenerating,
  ] = useState(false);

  const [pdfMode, setPdfMode] =
    useState(false);

  useEffect(() => {
    let cancelled =
      false;

    if (!internalReportToken) {
      setIsInternalReportLoading(
        false,
      );

      setInternalReportError(
        null,
      );

      setResultState(
        resolveResultState(
          urlId,
        ),
      );

      return () => {
        cancelled = true;
      };
    }

    setIsInternalReportLoading(
      true,
    );

    setInternalReportError(
      null,
    );

    void loadInternalAssessmentReport(
      internalReportToken,
    )
      .then(
        ({ data }) => {
          if (cancelled) {
            return;
          }

          setResultState({
            data,
            fromSubmission:
              true,
            protected:
              false,
          });
        },
      )
      .catch(
        (error) => {
          if (cancelled) {
            return;
          }

          console.error(
            'Falha ao abrir relatório interno:',
            error,
          );

          setInternalReportError(
            error instanceof
              Error
              ? error.message
              : 'Não foi possível validar este link.',
          );
        },
      )
      .finally(() => {
        if (!cancelled) {
          setIsInternalReportLoading(
            false,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    internalReportToken,
    urlId,
  ]);

  useEffect(() => {
    const onKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key !== 'Escape'
      ) {
        return;
      }

      setIsScoreModalOpen(false);
      setIsDiagnosisModalOpen(false);
      setIsFaixaModalOpen(false);
    };

    window.addEventListener(
      'keydown',
      onKeyDown,
    );

    return () =>
      window.removeEventListener(
        'keydown',
        onKeyDown,
      );
  }, []);

  const toggleFinding = (
    key: string,
  ) => {
    setExpandedFindings(
      (current) => {
        const next =
          new Set(current);

        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }

        return next;
      },
    );
  };

  const handleDownloadReport =
    async () => {
      if (isPdfGenerating) {
        return;
      }

      setIsPdfGenerating(true);
      setPdfMode(true);

      try {
        await new Promise(
          (resolve) =>
            window.setTimeout(
              resolve,
              160,
            ),
        );

        const reportRoot =
          document.querySelector<HTMLElement>(
            '[data-assessment-report="true"]',
          );

        if (!reportRoot) {
          throw new Error(
            'Área do relatório não encontrada.',
          );
        }

        const companyName =
          resultState.data.companyName?.trim() ||
          'empresa';

        await generateAssessmentPdf(
          reportRoot,
          {
            companyName,

            fileName:
              `concierge-security-assessment-${sanitizePdfFileName(
                companyName,
              )}.pdf`,
          },
        );
      } catch (error) {
        console.error(
          'Falha ao gerar PDF do assessment:',
          error,
        );

        alert(
          'Não foi possível gerar o PDF neste momento. Tente novamente em alguns instantes.',
        );
      } finally {
        setPdfMode(false);
        setIsPdfGenerating(false);
      }
    };

  if (
    isInternalReportLoading
  ) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
        <div className="mx-auto max-w-5xl">
          <ClientHeader />

          <div className="glass-card mt-6 p-8 text-center md:p-12">
            <Loader2
              className="mx-auto animate-spin text-teal-300"
              size={32}
            />

            <h2 className="mt-5 text-2xl font-bold text-white">
              Abrindo relatório
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
              Estamos validando o link interno e carregando a mesma leitura apresentada ao cliente.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (
    internalReportToken &&
    internalReportError
  ) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
        <div className="mx-auto max-w-5xl">
          <ClientHeader />

          <div className="glass-card mt-6 p-8 text-center md:p-12">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <LockKeyhole
                className="text-amber-300"
                size={28}
              />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-white">
              Link interno indisponível
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
              Este link é inválido, expirou ou o relatório não está mais disponível.
            </p>

            <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-slate-500">
              {internalReportError}
            </p>
          </div>
        </div>
      </main>
    );
  }

  /**
   * Resultado recebido por URL,
   * mas não pertencente a este navegador.
   */
  if (resultState.protected) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
        <div className="mx-auto max-w-5xl">
          <ClientHeader />

          <div className="glass-card mt-6 p-8 text-center md:p-12">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-teal-500/20 bg-teal-500/10">
              <LockKeyhole
                className="text-teal-300"
                size={28}
              />
            </div>

            <h2 className="mt-5 text-2xl font-bold text-white">
              Resultado protegido
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
              Este diagnóstico não está
              disponível neste dispositivo.
              Para proteger informações sobre
              o ambiente da empresa, o link
              sozinho não dá acesso às
              respostas ou ao relatório.
            </p>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
              Para compartilhar o resultado,
              utilize o relatório em PDF
              gerado no dispositivo em que o
              Assessment foi concluído.
            </p>

            <button
              onClick={() =>
                navigate('/diagnostico')
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-500"
            >
              Iniciar novo diagnóstico
            </button>
          </div>
        </div>
      </main>
    );
  }

  const draftData =
    resultState.data;

  const hasAnswers = !!(
    draftData.companyName ||
    draftData.contactName ||
    draftData.contactEmail ||
    (
      draftData.users &&
      draftData.users > 0
    ) ||
    (
      draftData.devices &&
      draftData.devices > 0
    ) ||
    draftData.firewallLevel !==
      'unknown' ||
    draftData.endpointLevel !==
      'unknown' ||
    draftData.backupLevel !==
      'unknown' ||
    draftData.mfa !== 'unknown'
  );

  if (!hasAnswers) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
        <div className="mx-auto max-w-5xl">
          <ClientHeader />

          <div className="glass-card mt-6 p-8 text-center md:p-12">
            <AlertTriangle
              className="mx-auto mb-4 text-amber-400"
              size={48}
            />

            <h2 className="text-2xl font-bold text-white">
              Nenhum diagnóstico foi realizado ainda
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-slate-400">
              Para visualizar o relatório,
              preencha as informações sobre
              o ambiente da empresa.
            </p>

            <button
              onClick={() =>
                navigate('/diagnostico')
              }
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-500"
            >
              Iniciar diagnóstico
            </button>
          </div>
        </div>
      </main>
    );
  }

  const r =
    scoreAssessment(draftData);

  /**
   * Defesa adicional contra NaN.
   */
  const overall =
    safeScore(r.overall);

  const networkScore =
    safeScore(
      r.scores.network,
    );

  const endpointScore =
    safeScore(
      r.scores.endpoint,
    );

  const backupScore =
    safeScore(
      r.scores.backup,
    );

  const identityScore =
    safeScore(
      r.scores.identity,
    );

  const safeLevel =
    maturityLevel(overall);

  const domains = [
    {
      label: 'Internet e rede',

      value: networkScore,

      coverage:
        r.domainCoverage.network,

      confidence:
        r.domainConfidence.network,

      icon: (
        <Server
          size={17}
          className="text-cyan-400"
        />
      ),
    },

    {
      label: 'Computadores',

      value: endpointScore,

      coverage:
        r.domainCoverage.endpoint,

      confidence:
        r.domainConfidence.endpoint,

      icon: (
        <MonitorSmartphone
          size={17}
          className="text-cyan-400"
        />
      ),
    },

    {
      label: 'Dados e backup',

      value: backupScore,

      coverage:
        r.domainCoverage.backup,

      confidence:
        r.domainConfidence.backup,

      icon: (
        <Database
          size={17}
          className="text-cyan-400"
        />
      ),
    },

    {
      label:
        'Contas e acessos',

      value: identityScore,

      coverage:
        r.domainCoverage.identity,

      confidence:
        r.domainConfidence.identity,

      icon: (
        <KeyRound
          size={17}
          className="text-cyan-400"
        />
      ),
    },
  ];

  const priorityExecName: Record<
    DomainKey,
    string
  > = {
    network:
      'Proteção da internet e da rede',

    endpoint:
      'Proteção dos computadores',

    backup:
      'Recuperação dos dados',

    identity:
      'Proteção das contas e acessos',
  };

  const priorityReasonText: Record<
    DomainKey,
    string
  > = {
    network:
      'Pelas respostas, este é o ponto que mais merece uma revisão inicial. Vale confirmar não apenas qual equipamento existe, mas quais proteções estão ativas, quem acompanha os eventos e o quanto a empresa consegue enxergar o que acontece na rede.',

    endpoint:
      'Pelas respostas, vale revisar se a proteção dos computadores consegue apenas bloquear ameaças conhecidas ou também ajudar a entender e responder quando algo suspeito acontece.',

    backup:
      'Pelas respostas, vale confirmar se as cópias realmente estão protegidas do mesmo incidente que afetaria a produção e se a recuperação já foi testada na prática.',

    identity:
      'Pelas respostas, vale revisar como as contas importantes são protegidas, como acessos são removidos e o que acontece quando uma senha ou mensagem maliciosa coloca uma conta em risco.',
  };

  const nextStepText: Record<
    DomainKey,
    string
  > = {
    network:
      'Confirmar como a proteção da internet é acompanhada e quais eventos chegam até a empresa',

    endpoint:
      'Confirmar quem acompanha os alertas dos computadores e o que acontece depois de uma detecção',

    backup:
      'Testar a recuperação e revisar se as cópias estão realmente separadas do ambiente principal',

    identity:
      'Revisar as contas mais importantes e onde ainda existe dependência apenas de senha',
  };

  const priorityFinding =
    r.findings.find(
      (finding) =>
        finding.domain ===
        r.priorityLabel,
    ) ||
    r.findings[0];

  const executiveNarrative =
    buildExecutiveNarrative(
      draftData,
      r.priority,
      priorityFinding,
    );

  const contextualInsights =
    getContextualInsights(
      draftData,
      r.findings,
    );

  const topFindings =
    selectTopFindings(
      r.findings,
      r.priority,
      r.criticalRules,
      3,
    );

  const priorityPlan =
    buildPriorityPlan(
      draftData,
      r,
      3,
    );

  const evaluatedScoresList =
    Object.entries(r.scores)
      .filter(
        ([, value]) =>
          value !== null &&
          Number.isFinite(value),
      )
      .map(
        ([key, value]) => ({
          key:
            key as DomainKey,

          label:
            r.labels[
              key as DomainKey
            ],

          score:
            Math.round(
              value as number,
            ),
        }),
      )
      .sort(
        (a, b) =>
          a.score - b.score,
      );

  const immediatePriority =
    evaluatedScoresList[0];

  const nextOpportunity =
    evaluatedScoresList.length > 1
      ? evaluatedScoresList[1]
      : null;

  const mostMature =
    evaluatedScoresList.length > 0
      ? evaluatedScoresList[
          evaluatedScoresList.length -
            1
        ]
      : null;

  const impactContext =
    buildImpactContext(
      draftData,
    );

  const impactLow =
    Number.isFinite(
      r.impactRange[0],
    )
      ? r.impactRange[0]
      : 0;

  const impactHigh =
    Number.isFinite(
      r.impactRange[1],
    )
      ? r.impactRange[1]
      : 0;

  return (
    <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
      <div
        className="mx-auto max-w-5xl"
        data-assessment-report="true"
      >
        <ClientHeader />

        {showSuccess &&
          resultState.fromSubmission && (
            <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-300">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-emerald-400"
                size={20}
              />

              <div>
                <b className="block text-base font-semibold text-slate-100">
                  Diagnóstico concluído
                </b>

                <p className="mt-1 leading-relaxed text-slate-300">
                  Organizamos suas respostas
                  para mostrar o que merece
                  mais atenção e por onde
                  começar.
                </p>
              </div>
            </div>
          )}

        {!resultState.fromSubmission &&
          !showSuccess && (
            <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-300">
              <Info
                className="mt-0.5 shrink-0 text-amber-400"
                size={20}
              />

              <div>
                <b className="block text-base font-semibold text-slate-100">
                  Pré-visualização do diagnóstico
                </b>

                <p className="mt-1 leading-relaxed text-slate-400">
                  Você está visualizando um
                  rascunho com as respostas
                  preenchidas.
                </p>
              </div>
            </div>
          )}

        {/* 1. RESUMO EXECUTIVO + POSTURA */}
        <section id="postura" className="glass-card overflow-hidden scroll-mt-24">
          <div className="border-b border-slate-800/70 p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <span className="section-kicker">Seu diagnóstico</span>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Resultado do diagnóstico e onde olhar primeiro
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
                  Veja primeiro o indicador geral, compare as áreas avaliadas e use o ponto de atenção destacado como guia para os achados e prioridades.
                </p>
              </div>

              <button
                type="button"
                data-pdf-ignore="true"
                onClick={() =>
                  document
                    .getElementById('prioridades')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-teal-500/25 bg-teal-500/10 px-4 py-2.5 text-sm font-semibold text-teal-300 transition hover:bg-teal-500/15"
              >
                Ver por onde começar
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="flex flex-col items-center justify-center border-b border-slate-800/80 p-6 text-center lg:border-b-0 lg:border-r lg:p-7">
              <span className="section-kicker self-start lg:self-auto">Indicador geral</span>
              <div className="mt-4 w-full max-w-[280px]">
                <SecurityMaturityMeter value={overall} level={safeLevel} />
              </div>
              <button
                onClick={() => setIsScoreModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 transition hover:text-teal-300"
              >
                <HelpCircle size={14} />
                Como calculamos?
              </button>
            </div>

            <div className="min-w-0 p-5 md:p-6 lg:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="section-kicker">Indicadores por área</span>
                  <h3 className="mt-1 text-xl font-bold text-white">
                    Compare as quatro áreas avaliadas
                  </h3>
                </div>
                <span className="shrink-0 text-xs text-slate-500">Escala de 0 a 100</span>
              </div>

              <div className="mt-5 grid gap-x-5 gap-y-4 md:grid-cols-2">
                {domains.map((item) => {
                  const value = item.value ?? 0;
                  return (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-xl border border-slate-800/80 bg-slate-950/20 px-4 py-4"
                    >
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-slate-200">
                          <span className="shrink-0">{item.icon}</span>
                          <span className="min-w-0 leading-snug">{item.label}</span>
                        </div>
                        <div className="flex shrink-0 items-baseline gap-1">
                          <span className="text-xl font-extrabold leading-none text-white">
                            {item.value ?? '—'}
                          </span>
                          <span className="text-[10px] text-slate-500">/100</span>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {maturityLevel(item.value)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {immediatePriority && (
                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-500/15 bg-amber-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm leading-relaxed text-slate-300">
                    <span className="font-semibold text-white">Área que merece atenção primeiro:</span>{' '}
                    {immediatePriority.label} apresenta o menor indicador entre as áreas avaliadas.
                  </div>
                  <button
                    type="button"
                    data-pdf-ignore="true"
                    onClick={() =>
                      document
                        .getElementById('prioridades')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-amber-300 transition hover:text-amber-200"
                  >
                    Ver prioridades
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. LEITURA EXECUTIVA */}
        <section className="glass-card mt-6 p-5 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <span className="section-kicker">Leitura do diagnóstico</span>
              <h3 className="mt-1 text-xl font-bold text-white">O que mais chamou atenção</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">{executiveNarrative}</p>
            </div>
            <button
              onClick={() => setIsDiagnosisModalOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-teal-400 transition hover:text-teal-300"
            >
              <HelpCircle size={15} />
              Entender metodologia
            </button>
          </div>
        </section>

        {/* 4. ACHADOS PRINCIPAIS */}
        <section id="achados" className="mt-7 scroll-mt-24">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="section-kicker">Principais achados</span>
              <h3 className="mt-1 text-2xl font-bold text-white">
                O que explica o resultado
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
                Mostramos primeiro apenas o essencial. Clique em “Ver detalhes” para consultar a explicação completa de cada achado.
              </p>
            </div>
            <span className="text-xs text-slate-500">{topFindings.length} pontos selecionados</span>
          </div>

          <div className="grid gap-3">
            {topFindings.map((finding, index) => {
              const findingKey = `${plainDomainLabel(finding.domain)}-${finding.title}-${index}`;
              const isExpanded = pdfMode || expandedFindings.has(findingKey);
              const source = getValidatedSourceForFinding(finding.title, finding.domain);
              const presentation = presentFinding(finding, draftData);
              const severityLabel = severityToClientLabel(finding.severity);

              return (
                <article key={findingKey} className="glass-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (!pdfMode) toggleFinding(findingKey);
                    }}
                    aria-expanded={isExpanded}
                    className="group w-full cursor-pointer p-4 text-left transition hover:bg-slate-950/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 md:p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-700/60 bg-slate-950/35 text-xs font-extrabold text-teal-300">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-2xs font-bold uppercase tracking-[.12em] text-slate-500">
                            {plainDomainLabel(finding.domain)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${
                              finding.severity === 'Alta'
                                ? 'border border-amber-700/25 bg-amber-950/25 text-amber-300'
                                : finding.severity === 'Média'
                                  ? 'border border-cyan-800/20 bg-cyan-950/20 text-cyan-300'
                                  : 'border border-slate-700/30 bg-slate-900/30 text-slate-300'
                            }`}
                          >
                            {severityLabel}
                          </span>
                        </div>
                        <h4 className="mt-1 text-base font-bold leading-snug text-slate-100">
                          {presentation.title}
                        </h4>
                        {!isExpanded && (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-400">
                            {presentation.indication}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-teal-400" aria-hidden="true">
                        <span className="hidden sm:inline">
                          {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                        </span>
                        {isExpanded ? <ChevronDown size={19} /> : <ChevronRight size={19} />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-800/70 px-4 pb-5 pt-4 md:px-5">
                      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
                        <div className="space-y-3 text-sm leading-relaxed">
                          <p className="text-slate-300">
                            <b className="text-slate-100">O que você nos informou:</b>{' '}
                            {presentation.informed}
                          </p>
                          <p className="text-slate-300">
                            <b className="text-slate-100">O que isso indica:</b>{' '}
                            {presentation.indication}
                          </p>
                          <p className="text-slate-400">
                            <b className="text-slate-300">Na prática:</b>{' '}
                            {presentation.practical}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
                          <div className="text-3xs font-bold uppercase tracking-wider text-slate-500">
                            Detalhe técnico
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{finding.technical}</p>
                          <div className="mt-3 border-t border-slate-800/70 pt-3 text-xs leading-relaxed text-slate-500">
                            {finding.consequence}
                          </div>
                        </div>
                      </div>

                      {source && (
                        <div className="mt-4 rounded-xl border border-teal-900/15 bg-teal-950/5 p-4">
                          <div className="text-xs font-semibold text-teal-400">Referência do controle</div>
                          <p className="mt-1 text-sm leading-relaxed text-slate-300">{source.statement}</p>
                          <a
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                          >
                            {source.organization} · {source.reportTitle} ({source.year})
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* 5. IMPACTO E CONTEXTO */}
        <section
          className="glass-card mt-6 overflow-hidden"
          data-report-keep-together="true"
        >
          <div className="border-b border-slate-800/70 p-5 md:p-6">
            <span className="section-kicker">Impacto e contexto</span>
            <h3 className="mt-1 text-xl font-bold text-white">
              O que esse cenário pode representar na prática
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
              Uma leitura complementar para dimensionar impacto operacional e interpretar os pontos identificados.
            </p>
          </div>

          <div className={`grid gap-5 p-5 md:p-6 ${contextualInsights.length > 0 ? 'lg:grid-cols-[1.05fr_.95fr]' : ''}`}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="text-3xs font-bold uppercase tracking-[.13em] text-slate-500">
                    Impacto operacional estimado
                  </div>
                  <div className="mt-2 text-xl font-bold text-white">
                    {money(impactLow)} a {money(impactHigh)}
                  </div>
                </div>
                <button
                  onClick={() => setIsFaixaModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                >
                  <HelpCircle size={14} />
                  Como estimamos?
                </button>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-300">{impactContext}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                A faixa considera produtividade interrompida, esforço técnico de recuperação e impacto operacional adicional. É uma ordem de grandeza, não uma previsão de prejuízo, multa ou custo real.
              </p>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
                <ImpactChart components={r.impactComponents} />
              </div>
            </div>

            {contextualInsights.length > 0 && (
              <div className="min-w-0 border-t border-slate-800/70 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="text-3xs font-bold uppercase tracking-[.13em] text-slate-500">
                  Contexto para interpretação
                </div>
                <div className="mt-3 space-y-3">
                  {contextualInsights.map((insight) => {
                    const source = getValidatedSource(insight.sourceId);
                    return (
                      <article key={insight.id} className="border-b border-slate-800/60 pb-3 last:border-b-0 last:pb-0">
                        <span className="text-3xs font-bold uppercase tracking-[.12em] text-teal-500">
                          {insight.eyebrow}
                        </span>
                        <h4 className="mt-1.5 text-sm font-bold leading-snug text-white">{insight.title}</h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{insight.body}</p>
                        {source && (
                          <a
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                          >
                            {source.organization} · {source.reportTitle}
                          </a>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 7. PLANO DE PRIORIDADES */}
        <section
          id="prioridades"
          className="mt-8 scroll-mt-24"
          data-report-slide-break="true"
          data-report-keep-together="true"
        >
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="section-kicker">Plano de prioridades</span>
              <h3 className="mt-1 text-2xl font-bold text-white">Por onde começar</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
                A sequência abaixo organiza os três temas que merecem atenção primeiro. Ela indica ordem de revisão, sem estipular prazo de implementação.
              </p>
            </div>
          </div>

          <PriorityPlan plan={priorityPlan} compact={pdfMode} />

          {pdfMode && (
            <div className="mt-4 rounded-xl border border-teal-900/30 bg-teal-950/10 px-5 py-4">
              <div className="text-xs font-bold uppercase tracking-[.12em] text-teal-400">
                Ficou com dúvidas?
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {assessmentContact ? (
                  <>
                    Entre em contato com {assessmentContact.name}: {assessmentContact.email}
                  </>
                ) : (
                  <>
                    Entre em contato com o responsável Concierge que encaminhou este diagnóstico.
                  </>
                )}
              </p>
            </div>
          )}
        </section>

        {/* 8. CTA */}
        <section
          className="mt-8 rounded-2xl border border-teal-950/30 bg-teal-950/10 p-5 md:p-6"
          data-pdf-ignore="true"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-400">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ficou com dúvidas?</h3>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-300">
                  {assessmentContact ? (
                    <>
                      Fale com {assessmentContact.name} pelo e-mail{' '}
                      <a
                        href={`mailto:${assessmentContact.email}`}
                        className="font-semibold text-teal-400 transition hover:text-teal-300"
                      >
                        {assessmentContact.email}
                      </a>
                      .
                    </>
                  ) : (
                    <>
                      Fale com o responsável Concierge que encaminhou este diagnóstico.
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isPdfGenerating}
              data-pdf-ignore="true"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 disabled:cursor-wait disabled:bg-teal-800 disabled:text-teal-200"
            >
              {isPdfGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Preparando relatório...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Baixar relatório em PDF
                </>
              )}
            </button>
          </div>
        </section>
      </div>

      {/* MODAL DIAGNÓSTICO */}
      {isDiagnosisModalOpen && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsDiagnosisModalOpen(
                false,
              );
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        >
          <div className="glass-card relative max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 md:p-8">
            <button
              onClick={() =>
                setIsDiagnosisModalOpen(
                  false,
                )
              }
              className="absolute right-4 top-4 text-slate-500 transition hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white">
              Como chegamos a esta conclusão?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              A leitura relaciona as
              respostas entre si. O tipo de
              equipamento ou software ajuda
              a entender o contexto, mas não
              define sozinho se o ambiente é
              mais ou menos seguro.
            </p>

            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <b className="text-slate-100">
                  1. O que existe
                </b>

                <p className="mt-1 text-slate-400">
                  Consideramos as
                  tecnologias e controles
                  informados, como firewall,
                  proteção de computadores,
                  backup e autenticação.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <b className="text-slate-100">
                  2. Como isso funciona
                </b>

                <p className="mt-1 text-slate-400">
                  Ter uma ferramenta não
                  encerra a análise. Também
                  observamos se ela está
                  atualizada, acompanhada,
                  testada e se alguém reage
                  quando acontece algo.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <b className="text-slate-100">
                  3. O contexto da empresa
                </b>

                <p className="mt-1 text-slate-400">
                  Quantidade de pessoas,
                  dispositivos, unidades,
                  dados importantes e impacto
                  de uma parada ajudam a
                  decidir quais pontos
                  merecem atenção primeiro.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                <b className="text-slate-100">
                  4. Referências
                </b>

                <p className="mt-1 text-slate-400">
                  NIST CSF e CIS Controls
                  ajudam a orientar as
                  capacidades avaliadas. Os
                  pesos e faixas pertencem à
                  metodologia própria do
                  Assessment.
                </p>
              </div>

              <p className="border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">
                Este material é um
                diagnóstico inicial e não
                substitui auditoria, teste
                técnico, laudo pericial ou
                parecer jurídico.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SCORE */}
      {isScoreModalOpen && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsScoreModalOpen(
                false,
              );
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        >
          <div className="glass-card relative max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 md:p-8">
            <button
              onClick={() =>
                setIsScoreModalOpen(
                  false,
                )
              }
              className="absolute right-4 top-4 text-slate-500 transition hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white">
              Como calculamos o indicador
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              O indicador utiliza uma
              metodologia própria apoiada em
              boas práticas reconhecidas.
            </p>

            <div className="mt-6 space-y-5 text-sm text-slate-300">
              <div>
                <h4 className="font-semibold text-slate-200">
                  Tecnologia não define a nota sozinha
                </h4>

                <p className="mt-1 leading-relaxed">
                  Saber que a empresa usa
                  MikroTik, Fortinet,
                  SonicWall, Kaspersky,
                  Microsoft ou outra solução
                  ajuda a entender o ambiente.
                  A nota depende principalmente
                  das capacidades que estão
                  ativas e de como elas são
                  administradas e acompanhadas.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">
                  Quando algo não é conhecido
                </h4>

                <p className="mt-1 leading-relaxed">
                  “Não sei informar” não é
                  tratado automaticamente
                  como falha. A resposta
                  reduz a certeza daquela
                  parte do diagnóstico e
                  indica que o ponto precisa
                  ser confirmado.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">
                  Faixas do indicador
                </h4>

                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  <li>
                    <b>
                      80 - 100:
                    </b>{' '}
                    Avançada
                  </li>

                  <li>
                    <b>
                      65 - 79:
                    </b>{' '}
                    Adequada
                  </li>

                  <li>
                    <b>
                      45 - 64:
                    </b>{' '}
                    Intermediária
                  </li>

                  <li>
                    <b>
                      25 - 44:
                    </b>{' '}
                    Básica
                  </li>

                  <li>
                    <b>
                      0 - 24:
                    </b>{' '}
                    Muito baixa
                  </li>
                </ul>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <h4 className="font-semibold text-teal-400">
                  Referências metodológicas
                </h4>

                <ul className="mt-2 space-y-2 text-xs text-slate-400">
                  <li>
                    NIST Cybersecurity
                    Framework 2.0
                  </li>

                  <li>
                    CIS Critical Security
                    Controls
                  </li>

                  <li>
                    ANPD / LGPD quando o
                    contexto envolver dados
                    pessoais e obrigações
                    regulatórias
                  </li>
                </ul>

                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  O resultado não representa
                  uma nota oficial do NIST ou
                  CIS.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPACTO */}
      {isFaixaModalOpen && (
        <div
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsFaixaModalOpen(
                false,
              );
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
        >
          <div className="glass-card relative max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 md:p-8">
            <button
              onClick={() =>
                setIsFaixaModalOpen(
                  false,
                )
              }
              className="absolute right-4 top-4 text-slate-500 transition hover:text-white"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white">
              Como estimamos o cenário de indisponibilidade
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              A simulação transforma as
              informações fornecidas em uma
              ordem de grandeza operacional.
              Ela não tenta prever exatamente
              quanto um incidente custaria.
            </p>

            <div className="mt-6 space-y-5 text-sm text-slate-300">
              <div>
                <h4 className="font-semibold text-slate-200">
                  1. Pessoas potencialmente afetadas
                </h4>

                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Referência de pessoas
                  consideradas:{' '}
                  <b className="text-slate-200">
                    {
                      r
                        .impactAssumptions
                        .affectedPeople
                    }
                  </b>
                  .
                </p>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  A proporção varia conforme
                  a resposta sobre quanto da
                  empresa ficaria parada.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">
                  2. Duração da interrupção
                </h4>

                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  A simulação utilizou{' '}
                  <b className="text-slate-200">
                    {
                      r
                        .impactAssumptions
                        .hours
                    }
                    h
                  </b>{' '}
                  como cenário de referência.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">
                  3. Recuperação técnica
                </h4>

                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Consideramos uma faixa de{' '}
                  <b className="text-slate-200">
                    {money(
                      r
                        .impactComponents
                        .technical[0],
                    )}
                  </b>{' '}
                  a{' '}
                  <b className="text-slate-200">
                    {money(
                      r
                        .impactComponents
                        .technical[1],
                    )}
                  </b>{' '}
                  para esforço técnico e
                  recuperação no cenário
                  ilustrativo.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">
                  4. Impacto operacional adicional
                </h4>

                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Além das horas paradas,
                  também consideramos uma
                  faixa para impactos como
                  suporte emergencial,
                  indisponibilidade de
                  sistemas e esforço
                  operacional extraordinário.
                </p>
              </div>

              <div className="rounded-xl border border-cyan-900/20 bg-cyan-950/5 p-4">
                <div className="font-semibold text-cyan-300">
                  Resultado ilustrativo
                </div>

                <div className="mt-2 text-xl font-bold text-white">
                  {money(
                    impactLow,
                  )}{' '}
                  a{' '}
                  {money(
                    impactHigh,
                  )}
                </div>
              </div>

              <p className="border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">
                {
                  r
                    .impactAssumptions
                    .disclaimer
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}