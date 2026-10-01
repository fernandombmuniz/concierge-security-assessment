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
import ClientHeader from '../components/ClientHeader';
import { CyberBackdrop } from '../components/ExecutiveVisual';
import logo from '../assets/logo-concierge.jpg';

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
  Shield,
  Lock,
  ArrowDown,
  ArrowRight,
} from 'lucide-react';

import {
  selectTopFindings,
} from '../lib/finding-priority';

import {
  loadInternalAssessmentReport,
} from '../lib/assessment.functions';

type ResultState = {
  data: AssessmentData;
  fromSubmission: boolean;
  protected: boolean;
};

type ResultChapter =
  | 'overview'
  | 'findings'
  | 'impact'
  | 'actions'
  | 'details';

const resultChapters: Array<{ key: ResultChapter; label: string; shortLabel: string }> = [
  { key: 'overview', label: 'Visão geral', shortLabel: 'Visão geral' },
  { key: 'findings', label: 'O que encontramos', shortLabel: 'Achados' },
  { key: 'impact', label: 'O que isso significa', shortLabel: 'Impacto' },
  { key: 'actions', label: 'Por onde começar', shortLabel: 'Ações' },
  { key: 'details', label: 'Detalhes do ambiente', shortLabel: 'Detalhes' },
];

const answerLabel = (value: unknown) => {
  const labels: Record<string, string> = {
    unknown: 'Não sei informar', yes: 'Sim', no: 'Não', partial: 'Parcialmente', none: 'Não',
    internal: 'Equipe interna', outsourced: 'Empresa terceirizada', shared: 'Responsabilidade compartilhada',
    unmanaged: 'Sem responsável definido', nobody: 'Sem responsável definido',
    periodic: 'Sim, periodicamente', on_demand: 'Quando necessário', incident_only: 'Apenas quando há incidente',
    reactive_it: 'A TI verifica quando aparece um problema', outsourced_it: 'Empresa terceirizada acompanha',
    security_team: 'Equipe especializada de segurança', soc: 'Acompanhamento contínuo / SOC',
    managed_soc: 'Equipe especializada acompanha e responde', defined_team: 'Pessoa ou equipe definida verifica',
    alerts_only: 'Alertas verificados quando necessário', managed: 'Gerenciado', informal: 'Informal / caso a caso',
    formal: 'Processo definido', regular: 'Periodicamente', occasional: 'Ocasionalmente', reactive: 'Quando surge um problema',
    continuous: 'Continuamente', immutable: 'Cópia protegida contra alteração', isolated: 'Cópia separada ou offline',
    separate_account: 'Cópia administrada separadamente', same_environment: 'Depende do mesmo ambiente',
    once: 'Já testamos alguma vez', never: 'Nunca testamos', basic_av: 'Antivírus básico / proteção nativa',
    business_av: 'Antivírus corporativo com gestão central', edr: 'EDR / proteção com investigação',
    managed_edr: 'Proteção avançada acompanhada por equipe especializada', isp: 'Roteador da operadora',
    router: 'MikroTik ou roteador corporativo', utm: 'Firewall dedicado / open source',
    ngfw: 'Firewall corporativo NGFW', managed_ngfw: 'Firewall gerenciado por equipe especializada',
    individual: 'Administrada individualmente em cada computador', central_internal: 'Painel central pela equipe de TI',
    central_partner: 'Painel central por empresa terceirizada', dedicated: 'Há pessoas dedicadas à segurança',
    scheduled: 'Há rotina e tempo reservado', generalist_overloaded: 'A equipe acumula segurança com outras demandas',
    managed_support: 'Há apoio especializado externo', managed_24x7: 'Cobertura 24x7', on_call: 'Há alguém de sobreaviso',
    ad_hoc: 'A equipe é acionada quando alguém percebe', business_hours: 'Normalmente só no horário comercial',
    controlled: 'Uso de IA com regras definidas', open: 'Uso de IA sem regras claras', not_used: 'A empresa não utiliza IA generativa',
    advanced: 'Proteção avançada', standard: 'Proteção adicional administrada', basic: 'Proteção básica / filtro padrão',
    corporate_central: 'Local corporativo centralizado', mixed: 'Dados distribuídos entre vários locais',
    endpoints: 'Principalmente computadores e notebooks', personal_cloud: 'Contas pessoais ou locais não administrados',
    saas_only: 'Principalmente aplicações em nuvem', light: 'Uso leve', medium: 'Uso moderado', high: 'Uso intenso',
    low: 'Impacto pequeno', major: 'Impacto alto', halt: 'A operação pararia',
    '4h': 'Até 4 horas', '8h': 'Até 8 horas', '1d': 'Até 1 dia', '2d': 'Até 2 dias', more: 'Mais de 2 dias',
  };

  if (value === null || value === undefined || value === '') return 'Não informado';
  if (typeof value === 'number') return value > 0 ? String(value) : 'Não informado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return labels[String(value)] || String(value);
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


  const [activeChapter, setActiveChapter] = useState<ResultChapter>(() => {
    if (typeof window === 'undefined') return 'overview';
    const hash = window.location.hash.replace('#', '') as ResultChapter;
    return resultChapters.some((chapter) => chapter.key === hash) ? hash : 'overview';
  });

  useEffect(() => {
    const syncChapterFromUrl = () => {
      const hash = window.location.hash.replace('#', '') as ResultChapter;
      setActiveChapter(
        resultChapters.some((chapter) => chapter.key === hash) ? hash : 'overview',
      );
    };

    window.addEventListener('popstate', syncChapterFromUrl);
    window.addEventListener('hashchange', syncChapterFromUrl);
    return () => {
      window.removeEventListener('popstate', syncChapterFromUrl);
      window.removeEventListener('hashchange', syncChapterFromUrl);
    };
  }, []);

  const goToChapter = (chapter: ResultChapter) => {
    setActiveChapter(chapter);
    const nextUrl = `${window.location.pathname}${window.location.search}#${chapter}`;
    window.history.pushState(null, '', nextUrl);
    window.requestAnimationFrame(() => {
      document.getElementById('result-chapter-top')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

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

  const environmentFacts = [
    (draftData.endpointCount || draftData.devices) > 0
      ? `${draftData.endpointCount || draftData.devices} computadores/notebooks`
      : null,
    draftData.servers > 0 ? `${draftData.servers} servidores` : null,
    draftData.internetLinkCount > 0
      ? `${draftData.internetLinkCount} ${draftData.internetLinkCount === 1 ? 'link de internet' : 'links de internet'}`
      : null,
    draftData.sites > 1 ? `${draftData.sites} unidades` : null,
  ].filter(Boolean) as string[];



  const summaryFronts = topFindings
    .slice(0, 3)
    .map((finding) => presentFinding(finding, draftData).title)
    .filter(Boolean);

  const consequenceSignals = [
    ['reactive_it', 'alerts_only', 'none'].includes(draftData.monitoring)
      ? 'aumentar o tempo para perceber atividades suspeitas'
      : null,
    ['alerts_only', 'none'].includes(draftData.endpointResponse)
      ? 'deixar alertas importantes sem tratamento rápido'
      : null,
    ['business_hours', 'ad_hoc', 'no'].includes(draftData.afterHoursResponse)
      ? 'postergar a resposta quando um incidente começa fora do expediente'
      : null,
    ['never', 'unknown'].includes(draftData.restoreTests)
      ? 'trazer incerteza sobre a recuperação quando a empresa mais precisa dela'
      : null,
    ['partial', 'no'].includes(draftData.mfa)
      ? 'ampliar o impacto de uma credencial comprometida'
      : null,
  ].filter(Boolean) as string[];

  const overviewSignals = summaryFronts.length
    ? summaryFronts.slice(0, 3)
    : [
        'Os principais controles informados estão presentes no ambiente',
        'A operação e a resposta ainda precisam ser validadas na prática',
        'A continuidade deve ser revisada periodicamente para confirmar a recuperação',
      ];

  const overviewImpact = consequenceSignals.length
    ? `Na prática, esses sinais podem ${consequenceSignals.slice(0, 2).join(' e ')}.`
    : 'O cenário apresenta uma base de controles relativamente estruturada, mas ainda merece validação de operação, resposta e recuperação.';

  const environmentOverview = summaryFronts.length
    ? `O ambiente informado possui ${environmentFacts.length ? environmentFacts.join(', ') : 'os principais ativos descritos no assessment'}. As respostas indicam como frentes de atenção ${summaryFronts.join('; ')}. ${overviewImpact}`
    : `O ambiente informado possui ${environmentFacts.length ? environmentFacts.join(', ') : 'os principais ativos descritos no assessment'}. Os controles avaliados apresentam uma condição relativamente estruturada. Ainda assim, vale validar operação, resposta e recuperação para confirmar como funcionam na prática.`;


  const chapterBridgeCopy: Record<ResultChapter, { title: string; description: string }> = {
    overview: {
      title: 'Agora vamos conectar a visão geral aos pontos que mais merecem atenção',
      description: 'A próxima parte mostra quais respostas tiveram maior peso na leitura e por que elas foram sinalizadas.',
    },
    findings: {
      title: 'Depois dos achados, vale entender o impacto para a operação',
      description: 'A próxima parte traduz os sinais técnicos em continuidade, resposta, dados e exposição para o negócio.',
    },
    impact: {
      title: 'Com o contexto claro, o próximo passo é priorizar',
      description: 'A próxima parte organiza o que revisar primeiro sem transformar o diagnóstico em uma lista infinita de ações.',
    },
    actions: {
      title: 'Por fim, os detalhes preservam exatamente o que foi informado',
      description: 'A última parte reúne as respostas do assessment para facilitar a validação técnica na próxima conversa.',
    },
    details: {
      title: 'Leitura concluída',
      description: 'O diagnóstico termina aqui, mas os próximos passos continuam disponíveis na seção de ações e no relatório em PDF.',
    },
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101f] px-4 py-7 text-white md:py-10">
      <CyberBackdrop />
      <div
        className="relative z-10 mx-auto max-w-5xl"
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

        <div id="result-chapter-top" className="scroll-mt-6" data-pdf-ignore="true">
          <div className="mb-6 rounded-2xl border border-slate-800/90 bg-[#071426]/88 p-2 shadow-[0_18px_50px_rgba(2,6,23,0.22)] backdrop-blur">
            <div className="hidden grid-cols-5 gap-1 md:grid">
              {resultChapters.map((chapter, index) => (
                <button
                  key={chapter.key}
                  type="button"
                  onClick={() => goToChapter(chapter.key)}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    activeChapter === chapter.key
                      ? 'border border-cyan-400/25 bg-cyan-500/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.08)]'
                      : 'border border-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-0.5 block">{chapter.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 px-2 py-2 md:hidden">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-400">
                  {resultChapters.findIndex((chapter) => chapter.key === activeChapter) + 1} de {resultChapters.length}
                </div>
                <div className="mt-0.5 text-sm font-bold text-white">
                  {resultChapters.find((chapter) => chapter.key === activeChapter)?.label}
                </div>
              </div>

              <div className="flex gap-1.5">
                {resultChapters.map((chapter) => (
                  <button
                    key={chapter.key}
                    type="button"
                    aria-label={`Abrir ${chapter.label}`}
                    onClick={() => goToChapter(chapter.key)}
                    className={`h-2.5 rounded-full transition ${
                      chapter.key === activeChapter ? 'w-7 bg-cyan-400' : 'w-2.5 bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {(pdfMode || activeChapter === 'overview') && (<>
        {/* 1. CONTEXTO */}
        <section data-pdf-page="true" data-report-keep-together="true" className="executive-surface px-6 py-7 md:px-8 md:py-8">
          <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
            <div>
              <span className="section-kicker">
                Ambiente analisado
              </span>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
                O que identificamos
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
                A leitura inicial destaca os sinais que mais ajudam a orientar o diagnóstico completo.
              </p>

              <div className="mt-5 grid gap-3">
                {overviewSignals.map((signal, index) => (
                  <div
                    key={`${signal}-${index}`}
                    className="flex items-start gap-3 rounded-2xl border border-cyan-300/[0.08] bg-slate-950/30 px-4 py-3"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]" />
                    <span className="text-sm leading-6 text-slate-200">{signal}</span>
                  </div>
                ))}
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                {overviewImpact}
              </p>

              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-cyan-200">
                Confira todo o resultado do seu diagnóstico ao longo das etapas desta jornada.
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5 text-sm text-slate-200">
                <span className="flex items-center gap-1.5 rounded-xl border border-cyan-500/16 bg-cyan-500/8 px-3 py-1.5">
                  <TrendingUp size={15} className="text-cyan-300" />
                  Indicador geral: {safeLevel}
                </span>

                <span className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-1.5">
                  {rangeLabel(
                    draftData.endpointCount || draftData.devices,
                    'devices',
                  )}
                </span>

                {draftData.servers > 0 && (
                  <span className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-1.5">
                    {draftData.servers} servidores
                  </span>
                )}

                <span className="rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-1.5">
                  {draftData.sites || 1} unidades
                </span>
              </div>
            </div>

            <div className="space-y-4 xl:pt-1">
              <div className="rounded-[24px] border border-cyan-300/[0.12] bg-[#061121]/72 p-5 text-sm leading-6 text-slate-300 backdrop-blur">
                <div className="text-base font-bold text-white">
                  Como ler este resultado
                </div>

                <ul className="mt-3 space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-cyan-300" size={18} />
                    <span>Os indicadores mostram maturidade percebida com base nas respostas fornecidas.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-cyan-300" size={18} />
                    <span>Os achados e prioridades ajudam a orientar a próxima validação técnica.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-cyan-300" size={18} />
                    <span>Mesmo quando os controles já existem, ainda há espaço para operação, visibilidade e evolução.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 2. SCORE */}
        <section data-pdf-page="true" data-report-keep-together="true" className="glass-card mt-6 p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
            <div className="mx-auto w-full max-w-[280px]">
              <SecurityMaturityMeter
                value={overall}
                level={safeLevel}
              />
            </div>

            <div>
              <span className="section-kicker">Índice de postura</span>

              <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white md:text-3xl">
                    {overall !== null ? `${overall}/100 · ${safeLevel}` : 'Dados insuficientes'}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Uma leitura consolidada das áreas avaliadas. As notas ajudam a comparar onde o ambiente está mais estruturado e onde ainda vale aprofundar a validação.
                  </p>
                </div>

                <button
                  onClick={() => setIsScoreModalOpen(true)}
                  className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal-400 transition hover:text-teal-300"
                >
                  <HelpCircle size={16} />
                  Como calculamos?
                </button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {domains.map((domain) => {
                  const value = domain.value;
                  const width = value === null ? 0 : Math.max(0, Math.min(100, value));
                  return (
                    <div
                      key={domain.label}
                      className="rounded-2xl border border-cyan-300/[0.10] bg-[#061121]/62 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-400">
                          {domain.icon}
                          <span>{domain.label}</span>
                        </div>
                        <strong className="text-xl leading-none text-white">
                          {value ?? '—'}
                        </strong>
                      </div>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="mt-2 text-[11px] font-medium text-slate-500">
                        {value === null ? 'Sem leitura' : maturityLevel(value)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/70 pt-5">
                <p className="max-w-2xl text-xs leading-5 text-slate-500">
                  O índice não representa percentual de proteção nem probabilidade de ataque. Ele organiza a maturidade percebida a partir das respostas fornecidas.
                </p>

                <button
                  type="button"
                  onClick={() => goToChapter('actions')}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/8 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:border-cyan-300/35 hover:bg-cyan-500/12"
                >
                  Ver o que fazer agora
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. LEITURA GUIADA */}
        <section data-pdf-page="true" data-pdf-group="analysis-intro" data-report-keep-together="true" className="glass-card mt-6 p-6 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <span className="section-kicker">
                O que entendemos
              </span>

              <h3 className="mt-1 text-xl font-bold text-white">
                O que mais chamou atenção
              </h3>

              <p className="mt-3 text-sm leading-7 text-slate-300">
                {executiveNarrative}
              </p>
            </div>

            <button
              onClick={() =>
                setIsDiagnosisModalOpen(
                  true,
                )
              }
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal-400 transition hover:text-teal-300"
            >
              <HelpCircle
                size={16}
              />

              Como chegamos a esta conclusão?
            </button>
          </div>

          <div className="mt-5 grid gap-3 border-t border-slate-800/70 pt-5 sm:grid-cols-3">
            <div>
              <div className="text-3xs font-bold uppercase tracking-wider text-slate-500">
                Indicador geral
              </div>

              <div className="mt-1 font-bold text-slate-100">
                {overall !== null
                  ? `${overall}/100 · ${safeLevel}`
                  : 'Dados insuficientes'}
              </div>
            </div>

            <div>
              <div className="text-3xs font-bold uppercase tracking-wider text-slate-500">
                Primeiro ponto a revisar
              </div>

              <div className="mt-1 font-bold text-amber-300">
                {r.priority
                  ? priorityExecName[
                      r.priority
                    ]
                  : 'Aguardando dados'}
              </div>
            </div>

            <div>
              <div className="text-3xs font-bold uppercase tracking-wider text-slate-500">
                Próximo passo
              </div>

              <div className="mt-1 font-bold text-slate-100">
                {r.priority
                  ? nextStepText[
                      r.priority
                    ]
                  : 'Validar os pontos prioritários identificados'}
              </div>
            </div>
          </div>
        </section>


        </>)}

        {(pdfMode || activeChapter === 'findings') && (<>
        {/* 5. PRIORIDADE */}
        {r.priority && !pdfMode && (
          <section className="glass-card mt-6 border-l-4 border-l-amber-500/60 p-6">
            <span className="text-xs font-bold uppercase tracking-[.16em] text-amber-400">
              Por onde começar
            </span>

            <h3 className="mt-2 text-2xl font-bold text-white">
              {
                priorityExecName[
                  r.priority
                ]
              }
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {
                priorityReasonText[
                  r.priority
                ]
              }
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3.5 py-1.5 text-xs font-semibold text-slate-400">
              <span>
                Indicador desta área:
              </span>

              <span className="font-bold text-amber-300">
                {
                  priorityExecName[
                    r.priority
                  ]
                }{' '}
                ·{' '}
                {safeScore(
                  r.scores[
                    r.priority
                  ],
                ) ?? '—'}
                /100
              </span>
            </div>
          </section>
        )}

        {/* 6. FINDINGS */}
        <section className="mt-8">
          <div data-pdf-page="true" data-pdf-group="analysis-intro" className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/20 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="section-kicker">
                Pontos principais
              </span>

              <h3 className="text-2xl font-bold text-white">
                Os principais pontos para revisar
              </h3>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
                Cada ponto começa pelo que
                você informou e explica por
                que aquilo merece atenção no
                dia a dia.
              </p>
            </div>

            <span className="text-sm text-slate-500">
              {topFindings.length}{' '}
              ponto(s) principal(is)
            </span>
          </div>

          <div className="grid gap-4">
            {topFindings
              .map(
                (
                  finding,
                  index,
                ) => {
                  const findingKey =
                    `${plainDomainLabel(
                      finding.domain,
                    )}-${finding.title}-${index}`;

                  const isExpanded =
                    pdfMode ||
                    expandedFindings.has(
                      findingKey,
                    );

                  const source =
                    getValidatedSourceForFinding(
                      finding.title,
                      finding.domain,
                    );

                  const presentation =
                    presentFinding(
                      finding,
                      draftData,
                    );

                  const severityLabel =
                    severityToClientLabel(
                      finding.severity,
                    );

                  return (
                    <article
                      key={
                        findingKey
                      }
                      data-pdf-page="true" className="glass-card overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!pdfMode) {
                            toggleFinding(
                              findingKey,
                            );
                          }
                        }}
                        aria-expanded={
                          isExpanded
                        }
                        className="w-full p-5 text-left md:p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                <AlertTriangle
                                  size={15}
                                  className="text-amber-400"
                                />

                                {plainDomainLabel(
                                  finding.domain,
                                )}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold ${
                                  finding.severity ===
                                  'Alta'
                                    ? 'border border-amber-700/25 bg-amber-950/25 text-amber-300'
                                    : finding.severity ===
                                        'Média'
                                      ? 'border border-cyan-800/20 bg-cyan-950/20 text-cyan-300'
                                      : 'border border-slate-700/30 bg-slate-900/30 text-slate-300'
                                }`}
                              >
                                {
                                  severityLabel
                                }
                              </span>
                            </div>

                            <h4 className="mt-3 text-lg font-bold leading-snug text-slate-100">
                              {
                                presentation.title
                              }
                            </h4>

                            <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed">
                              <p className="text-slate-300">
                                <b className="text-slate-100">
                                  O que
                                  você nos
                                  informou:
                                </b>{' '}
                                {
                                  presentation.informed
                                }
                              </p>

                              <p className="text-slate-300">
                                <b className="text-slate-100">
                                  O que
                                  isso
                                  indica:
                                </b>{' '}
                                {
                                  presentation.indication
                                }
                              </p>

                              <p className="text-slate-400">
                                <b className="text-slate-300">
                                  Na
                                  prática:
                                </b>{' '}
                                {
                                  presentation.practical
                                }
                              </p>
                            </div>
                          </div>

                          <span
                            className="mt-1 shrink-0 text-teal-400"
                            aria-hidden="true"
                          >
                            {isExpanded ? (
                              <ChevronDown
                                size={20}
                              />
                            ) : (
                              <ChevronRight
                                size={20}
                              />
                            )}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-teal-400">
                          {isExpanded
                            ? 'Ocultar detalhes técnicos'
                            : 'Ver detalhes técnicos'}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-800/70 px-5 pb-6 pt-5 md:px-6">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
                              <div className="text-3xs font-bold uppercase tracking-wider text-slate-500">
                                Detalhe técnico
                              </div>

                              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                {
                                  finding.technical
                                }
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
                              <div className="text-3xs font-bold uppercase tracking-wider text-slate-500">
                                Por que isso foi sinalizado
                              </div>

                              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                                {
                                  finding.consequence
                                }
                              </p>
                            </div>
                          </div>

                          {source && (
                            <div className="mt-4 rounded-xl border border-teal-900/15 bg-teal-950/5 p-4">
                              <div className="text-xs font-semibold text-teal-400">
                                Referência do controle
                              </div>

                              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                                {
                                  source.statement
                                }
                              </p>

                              <a
                                href={
                                  source.sourceUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                              >
                                {
                                  source.organization
                                }{' '}
                                ·{' '}
                                {
                                  source.reportTitle
                                }{' '}
                                (
                                {
                                  source.year
                                }
                                )
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                },
              )}
          </div>
        </section>

        </>)}

        {(pdfMode || activeChapter === 'impact') && (<>
        {/* 7. IMPACTO */}
        <section data-pdf-page="true" data-report-keep-together="true" className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="glass-card flex flex-col justify-between p-6">
            <div>
              <span className="section-kicker">
                Cenário operacional ilustrativo
              </span>

              <h3 className="mt-1 text-xl font-bold text-white">
                Quanto uma parada pode representar
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {impactContext}
              </p>

              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                A faixa considera
                produtividade interrompida,
                esforço técnico de
                recuperação e impacto
                operacional adicional.
              </p>

              <div className="mt-5 rounded-xl border border-cyan-900/15 bg-cyan-950/5 p-3 text-xs leading-relaxed text-slate-300">
                Esta é uma simulação de
                ordem de grandeza. Não é uma
                previsão de prejuízo, multa
                ou custo real de incidente.
              </div>

              <div className="mt-6 text-3xl font-extrabold text-white">
                {money(
                  impactLow,
                )}{' '}
                <span className="text-base font-normal text-slate-500">
                  a
                </span>{' '}
                {money(
                  impactHigh,
                )}
              </div>
            </div>

            <button
              onClick={() =>
                setIsFaixaModalOpen(
                  true,
                )
              }
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 transition hover:text-teal-300"
            >
              <HelpCircle
                size={16}
              />

              Como estimamos essa faixa?
            </button>
          </div>

          <div className="glass-card flex flex-col justify-between p-6">
            <div>
              <span className="section-kicker">
                Composição da faixa
              </span>

              <h3 className="mt-1 text-xl font-bold text-white">
                De onde vem a estimativa
              </h3>

              <p className="mb-4 mt-1 text-xs text-slate-400">
                A simulação separa o impacto
                em três grupos para evitar
                resumir uma parada apenas às
                horas de trabalho perdidas.
              </p>
            </div>

            <div className="flex flex-grow flex-col justify-center">
              <ImpactChart
                components={
                  r.impactComponents
                }
              />
            </div>
          </div>
        </section>

        {/* 8. VOCÊ SABIA */}
        {contextualInsights.length >
          0 && (
          <section data-pdf-page="true" data-report-keep-together="true" className="mt-6 grid gap-4 md:grid-cols-2">
            {contextualInsights.map(
              (insight) => {
                const source =
                  getValidatedSource(
                    insight.sourceId,
                  );


                return (
                  <article
                    key={
                      insight.id
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-950/25 p-5 md:p-6"
                  >
                    <span className="section-kicker">
                      {
                        insight.eyebrow
                      }
                    </span>

                    <h3 className="mt-2 text-lg font-bold leading-snug text-white">
                      {
                        insight.title
                      }
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                      {
                        insight.body
                      }
                    </p>

                    {source && (
                      <div className="mt-4 border-t border-slate-800/70 pt-4">
                        <p className="text-xs leading-relaxed text-slate-500">
                          Fonte:{' '}
                          {
                            source.organization
                          }{' '}
                          ·{' '}
                          {
                            source.reportTitle
                          }
                        </p>

                        <a
                          href={
                            source.sourceUrl
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-xs font-semibold text-teal-400 transition hover:text-teal-300"
                        >
                          Ler a referência oficial
                        </a>
                      </div>
                    )}
                  </article>
                );
              },
            )}
          </section>
        )}

        </>)}

        {(pdfMode || activeChapter === 'actions') && (<>
        {/* 9. CAMINHO */}
        <section data-pdf-page="true" data-report-keep-together="true" id="proximos-passos" className="glass-card mt-6 scroll-mt-6 p-6">
          <span className="section-kicker">
            Próximos passos
          </span>

          <h3 className="mt-1 text-xl font-bold text-white">
            Por onde começar
          </h3>

          <p className="mb-6 mt-1 text-xs text-slate-400">
            Uma ordem prática para revisar
            os pontos identificados.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {immediatePriority && (
              <div className="flex flex-col justify-between rounded-xl border border-amber-900/20 bg-amber-950/5 p-4">
                <div>
                  <span className="block text-3xs font-bold uppercase tracking-wider text-amber-400">
                    1. Primeiro ponto a revisar
                  </span>

                  <h4 className="mt-2 text-sm font-bold text-slate-100">
                    {
                      priorityExecName[
                        immediatePriority.key
                      ]
                    }
                  </h4>

                  <p className="mt-1 text-2xs leading-relaxed text-slate-400">
                    Este foi o ponto que
                    mais chamou atenção.
                    Vale começar confirmando
                    como ele funciona hoje e
                    o que ainda precisa ser
                    validado.
                  </p>
                </div>

                <div className="mt-4 text-xs font-bold text-amber-300">
                  Indicador atual:{' '}
                  {
                    immediatePriority.score
                  }
                  /100
                </div>
              </div>
            )}

            {nextOpportunity && (
              <div className="flex flex-col justify-between rounded-xl border border-cyan-900/10 bg-cyan-950/5 p-4">
                <div>
                  <span className="block text-3xs font-bold uppercase tracking-wider text-cyan-400">
                    2. Próximo ponto a revisar
                  </span>

                  <h4 className="mt-2 text-sm font-bold text-slate-100">
                    {
                      priorityExecName[
                        nextOpportunity.key
                      ]
                    }
                  </h4>

                  <p className="mt-1 text-2xs leading-relaxed text-slate-400">
                    Depois do primeiro
                    ponto, este é o próximo
                    tema que vale revisar
                    para reduzir dependências
                    e melhorar a
                    previsibilidade.
                  </p>
                </div>

                <div className="mt-4 text-xs font-bold text-cyan-300">
                  Indicador atual:{' '}
                  {
                    nextOpportunity.score
                  }
                  /100
                </div>
              </div>
            )}

            {mostMature && (
              <div className="flex flex-col justify-between rounded-xl border border-emerald-900/15 bg-emerald-950/5 p-4">
                <div>
                  <span className="block text-3xs font-bold uppercase tracking-wider text-emerald-400">
                    3. Área com melhor condição atual
                  </span>

                  <h4 className="mt-2 text-sm font-bold text-slate-100">
                    {
                      priorityExecName[
                        mostMature.key
                      ]
                    }
                  </h4>

                  <p className="mt-1 text-2xs leading-relaxed text-slate-400">
                    {mostMature.score <
                    60
                      ? 'Entre os pontos avaliados, este apresentou a melhor condição relativa, mas ainda há espaço importante para evolução.'
                      : mostMature.score <
                          80
                        ? 'Este ponto apresenta uma base mais estruturada, mas ainda vale confirmar lacunas e revisar se os controles atuais continuam adequados.'
                        : 'Este ponto apresenta uma condição mais madura. A recomendação é manter os controles existentes e revisá-los periodicamente.'}
                  </p>
                </div>

                <div className="mt-4 text-xs font-bold text-emerald-300">
                  Indicador atual:{' '}
                  {
                    mostMature.score
                  }
                  /100
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 10. CTA */}
        <section data-pdf-ignore="true" className="mt-8 rounded-2xl border border-teal-950/30 bg-teal-950/10 p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-400">
              <ShieldCheck
                size={20}
              />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Quer entender melhor o que apareceu aqui?
              </h3>

              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                Este diagnóstico já ajuda
                a identificar os principais
                pontos do ambiente. Uma
                conversa curta pode servir
                para confirmar as respostas,
                entender as particularidades
                da operação e separar o que
                realmente merece ação do que
                já está bem resolvido.
              </p>

              <div
                className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
                data-pdf-ignore="true"
              >
                <button
                  type="button"
                  onClick={
                    handleDownloadReport
                  }
                  disabled={
                    isPdfGenerating
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 disabled:cursor-wait disabled:bg-teal-800 disabled:text-teal-200"
                >
                  {isPdfGenerating ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Preparando relatório...
                    </>
                  ) : (
                    <>
                      <Download
                        size={18}
                      />

                      Baixar relatório em PDF
                    </>
                  )}
                </button>

                <p className="text-xs leading-relaxed text-slate-500">
                  O PDF reúne o mesmo
                  diagnóstico exibido nesta
                  página e inclui os detalhes
                  técnicos dos principais
                  pontos.
                </p>
              </div>
            </div>
          </div>
        </section>
        </>)}

        {(pdfMode || activeChapter === 'details') && (
          <section className="glass-card mt-6 p-6 md:p-8">
            <div data-pdf-page="true" className="rounded-2xl border border-slate-800/70 bg-slate-950/20 p-5 md:p-6">
              <span className="section-kicker">Detalhes do ambiente</span>
              <h3 className="mt-1 text-2xl font-bold text-white">O que foi informado no assessment</h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
                Esta seção preserva as respostas do preenchimento para facilitar a validação técnica.
                Ela complementa a análise sem substituir a conversa com a equipe responsável.
              </p>

              <div className="mt-5 rounded-2xl border border-cyan-300/[0.10] bg-cyan-500/[0.04] p-5">
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300">
                  Leitura do ambiente
                </div>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
                  {environmentOverview}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: 'Ambiente',
                  rows: [
                    ['Empresa', draftData.companyName || 'Não informado'],
                    ['Contato', draftData.contactName || 'Não informado'],
                    ['Cargo', draftData.contactRole || 'Não informado'],
                    ['Computadores / notebooks', answerLabel(draftData.endpointCount || draftData.devices)],
                    ['Unidades / filiais', answerLabel(draftData.sites)],
                    ['Equipe interna de TI', answerLabel(draftData.itTeamSize)],
                    ['Rotina de segurança da TI', answerLabel(draftData.securityOperationsModel)],
                  ],
                },
                {
                  title: 'Internet e rede',
                  rows: [
                    ['Proteção atual', answerLabel(draftData.firewallLevel)],
                    ['Modelo / solução', draftData.firewallModel || draftData.firewallVendor || 'Não informado'],
                    ['Quem administra', answerLabel(draftData.firewallManagement)],
                    ['Quem acompanha alertas', answerLabel(draftData.monitoring)],
                    ['Links de internet', answerLabel(draftData.internetLinkCount)],
                    ['Link principal', draftData.links?.[0]?.speedMbps ? `${draftData.links[0].speedMbps} Mbps` : 'Não informado'],
                    ['Acesso remoto', answerLabel(draftData.vpnUsage)],
                    ['Pessoas com acesso remoto', draftData.vpnRemote ? String(draftData.vpnRemote) : 'Não informado'],
                    ['Segmentação de rede', draftData.vlans >= 3 ? 'Sim, existe segmentação clara' : draftData.vlans === 2 ? 'Parcialmente' : draftData.vlans === 1 ? 'Não' : 'Não sei informar'],
                  ],
                },
                {
                  title: 'Computadores e endpoint',
                  rows: [
                    ['Proteção de endpoint', answerLabel(draftData.endpointLevel)],
                    ['Solução informada', draftData.endpointProduct || draftData.endpointVendor || 'Não informado'],
                    ['Como é administrada', answerLabel(draftData.endpointManagementModel)],
                    ['Resposta aos alertas', answerLabel(draftData.endpointResponse)],
                    ['Inventário de ativos', answerLabel(draftData.assetInventory)],
                    ['Vulnerabilidades / atualizações', answerLabel(draftData.vulnerabilityManagement)],
                    ['Servidores', answerLabel(draftData.servers)],
                  ],
                },
                {
                  title: 'Dados e continuidade',
                  rows: [
                    ['Onde ficam os dados', answerLabel(draftData.dataLocation)],
                    ['Backup', answerLabel(draftData.backupLevel)],
                    ['Volume aproximado', draftData.backupVolumeGb ? `${draftData.backupVolumeGb} GB` : 'Não informado'],
                    ['Cópia separada', answerLabel(draftData.backupIsolation)],
                    ['Teste de restauração', answerLabel(draftData.restoreTests)],
                    ['Parada tolerada', answerLabel(draftData.maxDowntime)],
                    ['Impacto operacional', answerLabel(draftData.operationalImpact)],
                  ],
                },
                {
                  title: 'Contas, resposta e governança',
                  rows: [
                    ['MFA', answerLabel(draftData.mfa)],
                    ['Contas compartilhadas', answerLabel(draftData.sharedAccounts)],
                    ['Remoção de acessos', answerLabel(draftData.offboarding)],
                    ['Proteção de e-mail', answerLabel(draftData.emailProtection)],
                    ['Resposta a incidentes', answerLabel(draftData.incidentResponse)],
                    ['Fora do expediente', answerLabel(draftData.afterHoursResponse)],
                    ['Uso de IA', answerLabel(draftData.aiUsageGovernance)],
                    ['Dados sensíveis', answerLabel(draftData.sensitiveData)],
                    ['Histórico de incidente', answerLabel(draftData.incidentHistory)],
                    ['Principal preocupação', draftData.mainConcern || 'Não informado'],
                  ],
                },
              ].map((group) => (
                <article key={group.title} data-pdf-page="true" data-pdf-detail="true" className="rounded-2xl border border-slate-800/80 bg-slate-950/30 p-5">
                  <h4 className="text-base font-bold text-white">{group.title}</h4>
                  <dl className="mt-4 space-y-3">
                    {group.rows.map(([label, value]) => (
                      <div key={label} className="grid gap-1 border-b border-slate-800/60 pb-3 last:border-0 last:pb-0 sm:grid-cols-[180px_1fr]">
                        <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                        <dd className="text-sm leading-relaxed text-slate-200">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        )}

        {!pdfMode && (
          <section className="mt-7 rounded-[22px] border border-cyan-300/[0.10] bg-gradient-to-r from-cyan-500/[0.06] via-[#071426]/82 to-teal-500/[0.05] p-5 md:p-6" data-pdf-ignore="true">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-3xl">
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300">
                  {activeChapter === 'details' ? 'Fim da leitura' : 'Continue a leitura'}
                </div>
                <h4 className="mt-1.5 text-lg font-bold text-white">
                  {chapterBridgeCopy[activeChapter].title}
                </h4>
                <p className="mt-1.5 text-sm leading-6 text-slate-400">
                  {chapterBridgeCopy[activeChapter].description}
                </p>
              </div>

              {activeChapter !== 'details' && (
                <button
                  type="button"
                  onClick={() => {
                    const index = resultChapters.findIndex((chapter) => chapter.key === activeChapter);
                    if (index < resultChapters.length - 1) goToChapter(resultChapters[index + 1].key);
                  }}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-500"
                >
                  {resultChapters[resultChapters.findIndex((chapter) => chapter.key === activeChapter) + 1]?.label}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </section>
        )}


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