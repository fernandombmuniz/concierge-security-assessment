import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  DatabaseBackup,
  KeyRound,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UsersRound,
} from 'lucide-react';
import logo from '../assets/logo-concierge.jpg';
import SecurityMaturityMeter from '../components/SecurityMaturityMeter';
import { generateAssessmentPdf, sanitizePdfFileName } from '../lib/report-pdf';

type ItOwner = 'internal' | 'outsourced' | 'shared' | 'none' | 'unknown';
type OperationalImpact = 'low' | 'partial' | 'major' | 'halt' | 'unknown';
type ProtectionLevel = 'monitored' | 'basic' | 'native' | 'none' | 'unknown';
type BackupConfidence = 'tested' | 'exists' | 'partial' | 'none' | 'unknown';
type YesPartialNo = 'yes' | 'partial' | 'no' | 'unknown';
type AiGovernance = 'controlled' | 'partial' | 'open' | 'not_used' | 'unknown';
type AfterHours = 'yes' | 'business_hours' | 'ad_hoc' | 'no' | 'unknown';

interface ExecutiveAnswers {
  companyName: string;
  contactName: string;
  computerCount: string;
  internetSpeedMbps: string;
  itOwner: ItOwner;
  operationalImpact: OperationalImpact;
  protection: ProtectionLevel;
  backup: BackupConfidence;
  mfa: YesPartialNo;
  aiGovernance: AiGovernance;
  afterHours: AfterHours;
  mainConcern: string;
}

const initialAnswers: ExecutiveAnswers = {
  companyName: '',
  contactName: '',
  computerCount: '',
  internetSpeedMbps: '',
  itOwner: 'unknown',
  operationalImpact: 'unknown',
  protection: 'unknown',
  backup: 'unknown',
  mfa: 'unknown',
  aiGovernance: 'unknown',
  afterHours: 'unknown',
  mainConcern: '',
};

const optionClass = (selected: boolean) =>
  `w-full rounded-xl border px-4 py-3 text-left text-sm leading-5 transition ${
    selected
      ? 'border-teal-400/55 bg-teal-500/10 text-white shadow-[0_0_0_1px_rgba(45,212,191,0.08)]'
      : 'border-slate-800 bg-slate-950/45 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
  }`;

const inputClass =
  'w-full rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/10';

const sectionCard = 'glass-card border border-slate-800/80 bg-slate-950/70';

const scoreMap = {
  itOwner: { internal: 90, outsourced: 85, shared: 80, none: 25, unknown: 45 },
  protection: { monitored: 95, basic: 70, native: 50, none: 20, unknown: 40 },
  backup: { tested: 95, exists: 70, partial: 50, none: 15, unknown: 40 },
  mfa: { yes: 95, partial: 65, no: 20, unknown: 40 },
  ai: { controlled: 95, partial: 65, open: 25, not_used: 75, unknown: 45 },
  afterHours: { yes: 95, business_hours: 60, ad_hoc: 45, no: 20, unknown: 40 },
} as const;

const avg = (...values: number[]) =>
  Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1));

function maturity(score: number) {
  if (score < 40) return 'Atenção';
  if (score < 60) return 'Em evolução';
  if (score < 80) return 'Estruturada';
  return 'Mais madura';
}

function resultHeadline(companyName: string, score: number) {
  const company = companyName || 'Sua empresa';
  if (score < 40) return `${company} apresenta pontos importantes que merecem atenção.`;
  if (score < 60) return `${company} já possui alguns controles, mas ainda há lacunas relevantes para revisar.`;
  if (score < 80) return `${company} demonstra boas práticas, com alguns pontos que ainda merecem revisão.`;
  return `${company} demonstra uma base de segurança mais estruturada.`;
}

function impactLabel(value: OperationalImpact) {
  switch (value) {
    case 'halt':
      return { label: 'Muito relevante', copy: 'Uma parada pode interromper a operação ou impedir atividades essenciais.' };
    case 'major':
      return { label: 'Relevante', copy: 'Uma indisponibilidade tende a afetar uma parte importante da operação e gerar pressão por recuperação rápida.' };
    case 'partial':
      return { label: 'Moderado', copy: 'A empresa consegue continuar parcialmente, mas com perda de produtividade ou dependência de alternativas manuais.' };
    case 'low':
      return { label: 'Menor', copy: 'A operação parece ter maior tolerância a interrupções curtas, mas ainda vale validar os serviços mais críticos.' };
    default:
      return { label: 'A validar', copy: 'O impacto de uma interrupção ainda precisa ser detalhado em uma conversa executiva.' };
  }
}

function concernLabel(value: string) {
  const labels: Record<string, string> = {
    downtime: 'Paralisação da operação',
    data_loss: 'Perda de informações',
    fraud: 'Golpes e fraudes',
    leak: 'Vazamento de dados',
    invasion: 'Invasão ou ransomware',
    compliance: 'LGPD e responsabilidades',
    unsure: 'Ainda não há uma preocupação principal definida',
  };
  return labels[value] || 'Ainda não informado';
}

type ExecutiveSession = { assessmentId: string; editToken: string };
type ExecutiveApiResponse = {
  success?: boolean;
  error?: string;
  assessmentId?: string;
  publicToken?: string;
  completedAt?: string;
  notification?: { sent?: boolean; alreadySent?: boolean; reason?: string };
  answers?: Record<string, unknown>;
};

function executiveApiUrl() {
  const base = (import.meta.env['VITE_SUPABASE_URL'] as string | undefined)?.replace(/\/$/, '');
  if (!base) throw new Error('VITE_SUPABASE_URL não configurada.');
  return `${base}/functions/v1/assessment-api`;
}

function executiveApiKey() {
  const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string | undefined;
  if (!key) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY não configurada.');
  return key;
}

async function callExecutiveApi(payload: Record<string, unknown>): Promise<ExecutiveApiResponse> {
  const response = await fetch(executiveApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: executiveApiKey() },
    body: JSON.stringify(payload),
  });

  let body: ExecutiveApiResponse = {};
  try { body = await response.json() as ExecutiveApiResponse; } catch { /* infra errors can be non-JSON */ }

  if (!response.ok || body.success === false) {
    throw new Error(body.error || `Falha na comunicação com o diagnóstico (${response.status}).`);
  }
  return body;
}


function isOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function executiveAnswersFromRemote(value: Record<string, unknown>): ExecutiveAnswers {
  return {
    companyName: typeof value['companyName'] === 'string' ? value['companyName'] : '',
    contactName: typeof value['contactName'] === 'string' ? value['contactName'] : '',
    computerCount: typeof value['computerCount'] === 'string' ? value['computerCount'] : typeof value['computerCount'] === 'number' ? String(value['computerCount']) : '',
    internetSpeedMbps: typeof value['internetSpeedMbps'] === 'string' ? value['internetSpeedMbps'] : typeof value['internetSpeedMbps'] === 'number' ? String(value['internetSpeedMbps']) : '',
    itOwner: isOneOf(value['itOwner'], ['internal', 'outsourced', 'shared', 'none', 'unknown'] as const, 'unknown'),
    operationalImpact: isOneOf(value['operationalImpact'], ['low', 'partial', 'major', 'halt', 'unknown'] as const, 'unknown'),
    protection: isOneOf(value['protection'], ['monitored', 'basic', 'native', 'none', 'unknown'] as const, 'unknown'),
    backup: isOneOf(value['backup'], ['tested', 'exists', 'partial', 'none', 'unknown'] as const, 'unknown'),
    mfa: isOneOf(value['mfa'], ['yes', 'partial', 'no', 'unknown'] as const, 'unknown'),
    aiGovernance: isOneOf(value['aiGovernance'], ['controlled', 'partial', 'open', 'not_used', 'unknown'] as const, 'unknown'),
    afterHours: isOneOf(value['afterHours'], ['yes', 'business_hours', 'ad_hoc', 'no', 'unknown'] as const, 'unknown'),
    mainConcern: typeof value['mainConcern'] === 'string' ? value['mainConcern'] : '',
  };
}

function recoveryImpactText(value: BackupConfidence) {
  if (value === 'tested') return 'A empresa informou que já confirmou a recuperação dos dados, reduzindo a incerteza em uma parada.';
  if (value === 'exists') return 'Há backup, mas a recuperação ainda não foi confirmada. Em uma crise, o tempo real de retorno pode surpreender.';
  if (value === 'partial') return 'Apenas parte das informações possui cópia. Uma falha pode deixar áreas importantes sem caminho claro de recuperação.';
  if (value === 'none') return 'Não há um processo de backup definido. Perda, exclusão indevida ou ransomware podem virar indisponibilidade e perda de informação.';
  return 'A capacidade de recuperação ainda precisa ser confirmada para saber quanto a empresa depende dos sistemas atuais.';
}

function responseImpactText(value: AfterHours) {
  if (value === 'yes') return 'Existe alguém ou uma equipe acionável fora do expediente, reduzindo o tempo até a primeira resposta.';
  if (value === 'business_hours') return 'Um incidente iniciado à noite ou no fim de semana pode esperar até o próximo expediente antes de começar a ser tratado.';
  if (value === 'ad_hoc') return 'A resposta depende de conseguir localizar alguém. Isso pode alongar o tempo entre o primeiro sinal e a contenção.';
  if (value === 'no') return 'Não há um responsável definido fora do expediente. As primeiras horas de um incidente podem passar sem ação coordenada.';
  return 'A cobertura fora do expediente ainda precisa ser confirmada, porque tempo de reação também influencia o impacto.';
}

function impactLead(value: OperationalImpact) {
  if (value === 'halt') return 'A continuidade do negócio depende fortemente da disponibilidade dos sistemas. Uma interrupção relevante pode parar atividades essenciais.';
  if (value === 'major') return 'Uma interrupção relevante tende a pressionar operação, atendimento e recuperação ao mesmo tempo.';
  if (value === 'partial') return 'Mesmo sem parar totalmente, a empresa pode pagar o incidente em produtividade, improvisos manuais e demora para voltar ao normal.';
  if (value === 'low') return 'A operação parece tolerar interrupções curtas, mas recuperação e tempo de resposta continuam definindo quanto o problema se prolonga.';
  return 'Ainda falta confirmar quanto uma indisponibilidade afeta a operação, mas recuperação e tempo de resposta já ajudam a indicar onde existe exposição.';
}

export default function ExecutiveAssessmentPreview() {
  const [started, setStarted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ExecutiveAnswers>(initialAnswers);
  const [completed, setCompleted] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [answered, setAnswered] = useState<Set<keyof ExecutiveAnswers>>(() => new Set());
  const [remoteSession, setRemoteSession] = useState<ExecutiveSession | null>(null);
  const [isStartingRemote, setIsStartingRemote] = useState(false);
  const [isSubmittingRemote, setIsSubmittingRemote] = useState(false);
  const [remoteStatus, setRemoteStatus] = useState<string | null>(null);

  const internalReportToken = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('internalReport')
    : null;
  const [isLoadingInternalReport, setIsLoadingInternalReport] = useState(Boolean(internalReportToken));

  const executiveRef = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('ref')?.toLowerCase() || null
    : null;

  const executiveSource = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('src') || 'executive'
    : 'executive';

  const contact = executiveRef === 'fernando'
    ? { name: 'Fernando Muniz', email: 'fernando.muniz@concierge.seg.br' }
    : null;


  useEffect(() => {
    if (!internalReportToken) return;

    let cancelled = false;

    const loadInternalReport = async () => {
      setIsLoadingInternalReport(true);
      setRemoteStatus(null);

      try {
        const response = await callExecutiveApi({
          action: 'internal_report',
          token: internalReportToken,
        });

        if (!response.answers) {
          throw new Error('O relatório executivo não retornou respostas válidas.');
        }

        if (cancelled) return;

        const loaded = executiveAnswersFromRemote(response.answers);
        setAnswers(loaded);
        setAnswered(new Set(Object.keys(loaded) as Array<keyof ExecutiveAnswers>));
        setPrivacyAcknowledged(true);
        setStarted(true);
        setCompleted(true);
      } catch (error) {
        console.error('Falha ao carregar relatório executivo protegido:', error);
        if (!cancelled) {
          setRemoteStatus('Este relatório não está disponível ou o link expirou.');
        }
      } finally {
        if (!cancelled) setIsLoadingInternalReport(false);
      }
    };

    void loadInternalReport();

    return () => {
      cancelled = true;
    };
  }, [internalReportToken]);

  useEffect(() => {
    if (!completed) return;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [completed]);

  const set = <K extends keyof ExecutiveAnswers>(key: K, value: ExecutiveAnswers[K]) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setAnswered((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
  };

  const result = useMemo(() => {
    const protection = avg(scoreMap.protection[answers.protection], scoreMap.itOwner[answers.itOwner]);
    const continuity = scoreMap.backup[answers.backup];
    const identity = scoreMap.mfa[answers.mfa];
    const response = avg(scoreMap.afterHours[answers.afterHours], scoreMap.itOwner[answers.itOwner], scoreMap.ai[answers.aiGovernance]);
    const overall = avg(protection, continuity, identity, response);

    const areas = [
      { key: 'protection', label: 'Proteção do ambiente', score: protection },
      { key: 'continuity', label: 'Dados e continuidade', score: continuity },
      { key: 'identity', label: 'Contas e acessos', score: identity },
      { key: 'response', label: 'Resposta e governança', score: response },
    ].sort((a, b) => a.score - b.score);

    const priorities = [
      answers.backup !== 'tested'
        ? {
            area: 'Dados e continuidade',
            score: continuity,
            title: 'Confirmar se a empresa consegue recuperar os dados quando precisar',
            why: answers.backup === 'none'
              ? 'Sem um processo claro de backup, uma falha, exclusão indevida ou ransomware pode transformar um incidente técnico em paralisação e perda de informação.'
              : 'Ter cópias reduz risco, mas sem testar a recuperação a empresa ainda não sabe com segurança quanto tempo levaria para voltar a operar.',
            action: 'Revisar quais informações são essenciais, onde estão as cópias e quando foi realizado o último teste de recuperação.',
            reference: 'CIS Control 11 · Data Recovery',
          }
        : null,
      answers.afterHours !== 'yes'
        ? {
            area: 'Resposta e governança',
            score: response,
            title: 'Definir quem pode agir quando um problema acontece fora do expediente',
            why: 'Incidentes não seguem horário comercial. Se ninguém puder agir quando o problema começa, a empresa pode perder horas importantes antes de conter o impacto e iniciar a recuperação.',
            action: 'Definir quem recebe o primeiro alerta, quem toma a decisão inicial e como esse contato acontece à noite, em feriados ou fins de semana.',
            reference: 'CIS Control 17 · Incident Response Management',
          }
        : null,
      answers.mfa !== 'yes'
        ? {
            area: 'Contas e acessos',
            score: identity,
            title: 'Reforçar a proteção das contas mais importantes',
            why: 'Uma conta de e-mail, financeiro ou administração comprometida pode abrir caminho para fraude, alteração de pagamentos e acesso a outras informações da empresa. Uma segunda confirmação reduz esse risco.',
            action: 'Priorizar uma segunda confirmação de acesso em e-mail, sistemas administrativos, financeiro e contas com maior privilégio.',
            reference: 'CIS Control 6 · Access Control Management',
          }
        : null,
      answers.protection !== 'monitored'
        ? {
            area: 'Proteção do ambiente',
            score: protection,
            title: 'Entender se a proteção dos computadores é apenas preventiva ou também acompanhada',
            why: 'Uma proteção básica pode bloquear ameaças conhecidas, mas um comportamento suspeito que passe pela primeira barreira pode continuar ativo sem que ninguém perceba ou investigue rapidamente.',
            action: 'Validar se há visão central dos computadores, alertas e alguém responsável por analisar os casos relevantes.',
            reference: 'CIS Control 10 · Malware Defenses',
          }
        : null,
      answers.aiGovernance === 'open' || answers.aiGovernance === 'unknown'
        ? {
            area: 'Resposta e governança',
            score: response,
            title: 'Criar uma regra simples para o uso de Inteligência Artificial',
            why: 'Sem orientação, informações internas podem ser enviadas a ferramentas de IA sem que a empresa perceba o risco de exposição ou tratamento de dados pessoais.',
            action: 'Definir ferramentas permitidas, tipos de informação que não devem ser enviados e quem pode orientar dúvidas dos colaboradores.',
            reference: 'ANPD · Radar Tecnológico sobre IA Generativa',
          }
        : null,
    ]
      .filter(Boolean)
      .sort((a, b) => (a?.score ?? 100) - (b?.score ?? 100))
      .slice(0, 3) as Array<{
        area: string;
        score: number;
        title: string;
        why: string;
        action: string;
        reference: string;
      }>;

    const evidenceCandidates = [
      answers.protection !== 'monitored' || answers.mainConcern === 'invasion'
        ? {
            icon: 'ransomware',
            title: 'Ransomware costuma significar mais do que o valor de um resgate',
            copy: 'No DBIR 2025 da Verizon, ransomware apareceu em 44% das violações analisadas. Para o negócio, o efeito pode incluir parada, recuperação de sistemas e perda de produtividade.',
            source: 'Verizon · 2025 Data Breach Investigations Report',
            href: 'https://www.verizon.com/business/resources/reports/dbir/',
          }
        : null,
      answers.backup !== 'tested'
        ? {
            icon: 'backup',
            title: 'Ter backup e conseguir recuperar são coisas diferentes',
            copy: 'O NIST recomenda verificar a integridade dos dados de backup antes da restauração. Um teste de recuperação ajuda a descobrir falhas antes de uma emergência.',
            source: 'NIST CSF 2.0 · Small Business Quick-Start Guide',
            href: 'https://www.nist.gov/publications/nist-cybersecurity-framework-20-small-business-quick-start-guide',
          }
        : null,
      answers.mfa !== 'yes'
        ? {
            icon: 'identity',
            title: 'Contas continuam sendo uma porta frequente para incidentes',
            copy: 'No DBIR 2025, abuso de credenciais representou 22% dos vetores conhecidos de acesso inicial. Contas importantes protegidas apenas por senha merecem atenção.',
            source: 'Verizon · 2025 Data Breach Investigations Report',
            href: 'https://www.verizon.com/business/resources/reports/dbir/',
          }
        : null,
      answers.afterHours !== 'yes'
        ? {
            icon: 'response',
            title: 'Tempo de resposta também é parte do impacto',
            copy: 'O NIST trata Responder e Recuperar como funções centrais da segurança e recomenda responsabilidades definidas. Se ninguém puder agir fora do expediente, a resposta pode começar mais tarde.',
            source: 'NIST CSF 2.0 · Small Business Quick-Start Guide',
            href: 'https://www.nist.gov/publications/nist-cybersecurity-framework-20-small-business-quick-start-guide',
          }
        : null,
      answers.aiGovernance === 'open' || answers.aiGovernance === 'unknown'
        ? {
            icon: 'ai',
            title: 'IA também pode envolver dados que a empresa precisa proteger',
            copy: 'A ANPD destaca possíveis ameaças à privacidade e à proteção de dados no uso de IA generativa. Regras simples ajudam a evitar o envio indevido de informações internas.',
            source: 'ANPD · Radar Tecnológico sobre IA Generativa',
            href: 'https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-versao-ingles-rt-ingles',
          }
        : null,
    ].filter(Boolean).slice(0, 3) as Array<{
      icon: string;
      title: string;
      copy: string;
      source: string;
      href: string;
    }>;

    return {
      overall,
      areas,
      priorities,
      evidence: evidenceCandidates,
      impact: impactLabel(answers.operationalImpact),
      impactLead: impactLead(answers.operationalImpact),
      recoveryImpact: recoveryImpactText(answers.backup),
      responseImpact: responseImpactText(answers.afterHours),
    };
  }, [answers]);

  const steps = [
    {
      title: 'Seu negócio',
      subtitle: 'Um contexto rápido sobre a empresa e o impacto de uma interrupção.',
    },
    {
      title: 'Proteção e resposta',
      subtitle: 'Perguntas simples para identificar onde vale olhar primeiro.',
    },
  ];


  const canAdvance = () => {
    if (step === 0) {
      return Boolean(
        answers.companyName.trim() &&
        answers.contactName.trim() &&
        answered.has('itOwner') &&
        answered.has('operationalImpact'),
      );
    }

    return Boolean(
      answered.has('protection') &&
      answered.has('backup') &&
      answered.has('mfa') &&
      answered.has('aiGovernance') &&
      answered.has('afterHours') &&
      answered.has('mainConcern'),
    );
  };



  const beginExecutiveAssessment = async () => {
    if (!privacyAcknowledged || isStartingRemote) return;

    if (remoteSession) {
      setStarted(true);
      return;
    }

    setIsStartingRemote(true);
    setRemoteStatus(null);

    try {
      const response = await callExecutiveApi({
        action: 'create',
        ref: executiveRef,
        source: executiveSource,
        privacyNoticeVersion: '2026-01',
        consentAt: new Date().toISOString(),
      });

      if (!response.assessmentId || !response.publicToken) {
        throw new Error('A API não retornou uma sessão válida.');
      }

      setRemoteSession({ assessmentId: response.assessmentId, editToken: response.publicToken });
      setStarted(true);
    } catch (error) {
      console.error('Falha ao iniciar diagnóstico executivo:', error);
      setRemoteStatus('Não foi possível iniciar o diagnóstico agora. Verifique a conexão e tente novamente.');
    } finally {
      setIsStartingRemote(false);
    }
  };

  const submitExecutiveAssessment = async () => {
    if (!canAdvance() || isSubmittingRemote) return;

    if (!remoteSession) {
      setRemoteStatus('A sessão deste diagnóstico não está válida. Volte ao início e tente novamente.');
      return;
    }

    setIsSubmittingRemote(true);
    setRemoteStatus(null);

    const weakest = result.areas[0];
    const findings = result.priorities.map((priority, index) => ({
      domain: priority.area,
      severity: index === 0 ? 'alta' : 'media',
      title: priority.title,
      situation: priority.why,
      consequence: priority.why,
      technical: priority.action,
    }));

    try {
      const response = await callExecutiveApi({
        action: 'complete',
        assessmentId: remoteSession.assessmentId,
        publicToken: remoteSession.editToken,
        answers: {
          companyName: answers.companyName.trim(),
          contactName: answers.contactName.trim(),
          computerCount: answers.computerCount.trim(),
          internetSpeedMbps: answers.internetSpeedMbps.trim(),
          contactRole: 'Diagnóstico executivo',
          contactEmail: '',
          executiveAssessment: true,
          itOwner: answers.itOwner,
          operationalImpact: answers.operationalImpact,
          protection: answers.protection,
          backup: answers.backup,
          mfa: answers.mfa,
          aiGovernance: answers.aiGovernance,
          afterHours: answers.afterHours,
          mainConcern: answers.mainConcern,
        },
        result: {
          overallScore: result.overall,
          networkScore: result.areas.find((area) => area.key === 'response')?.score ?? null,
          endpointScore: result.areas.find((area) => area.key === 'protection')?.score ?? null,
          continuityScore: result.areas.find((area) => area.key === 'continuity')?.score ?? null,
          identityScore: result.areas.find((area) => area.key === 'identity')?.score ?? null,
          coveragePercent: 100,
          priorityDomain: weakest?.key || 'executive',
          priorityLabel: weakest?.label || 'Prioridade executiva',
          findings,
          criticalRules: [],
          methodologyVersion: 'v4.5-executive',
          executiveImpact: {
            label: result.impact.label,
            copy: result.impact.copy,
            lead: result.impactLead,
            recovery: result.recoveryImpact,
            response: result.responseImpact,
          },
          executiveConcern: concernLabel(answers.mainConcern),
        },
      });

      setCompleted(true);
      if (response.notification?.sent) {
        setRemoteStatus('Resultado concluído e encaminhado ao responsável Concierge.');
      } else if (executiveRef) {
        setRemoteStatus('Resultado concluído. O envio por e-mail não foi confirmado pela API.');
      }
    } catch (error) {
      console.error('Falha ao concluir diagnóstico executivo:', error);
      setRemoteStatus('Não foi possível concluir e enviar o diagnóstico. Tente novamente.');
    } finally {
      setIsSubmittingRemote(false);
    }
  };

  const handleDownloadReport = async () => {
    if (isPdfGenerating) return;

    const reportRoot = document.querySelector<HTMLElement>(
      '[data-executive-report="true"]',
    );

    if (!reportRoot) {
      alert('Não foi possível localizar o relatório executivo.');
      return;
    }

    setIsPdfGenerating(true);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 120));

      const companyName = answers.companyName.trim() || 'empresa';

      await generateAssessmentPdf(reportRoot, {
        companyName,
        fileName: `concierge-executive-security-assessment-${sanitizePdfFileName(companyName)}.pdf`,
      });
    } catch (error) {
      console.error('Falha ao gerar PDF executivo:', error);
      alert('Não foi possível gerar o PDF neste momento. Tente novamente em alguns instantes.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const reset = () => {
    setAnswers(initialAnswers);
    setStep(0);
    setCompleted(false);
    setStarted(false);
    setPrivacyAcknowledged(false);
    setAnswered(new Set());
    setRemoteSession(null);
    setRemoteStatus(null);
  };


  if (internalReportToken && isLoadingInternalReport) {
    return (
      <div className="min-h-screen bg-slate-950 text-white grid place-items-center px-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-teal-400" />
          <p className="mt-4 text-sm text-slate-400">Carregando relatório executivo...</p>
        </div>
      </div>
    );
  }

  if (internalReportToken && remoteStatus && !completed) {
    return (
      <div className="min-h-screen bg-slate-950 text-white grid place-items-center px-6">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center">
          <TriangleAlert className="mx-auto h-7 w-7 text-amber-400" />
          <h1 className="mt-4 text-xl font-semibold">Relatório indisponível</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{remoteStatus}</p>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-8 md:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Concierge Segurança Digital" className="h-11 rounded-lg object-contain" />
          </div>

          <section className="glass-card relative mt-6 overflow-hidden p-7 md:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-teal-500/5 blur-3xl" />
            <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
              <div>
                <span className="section-kicker">Diagnóstico Executivo de Segurança</span>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                  Em 2 minutos, descubra quais riscos de segurança merecem sua atenção primeiro.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                  Veja onde uma falha pode interromper a operação, expor informações ou atrasar a recuperação. O resultado destaca prioridades claras para tornar a próxima conversa mais objetiva.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-sm text-slate-300">
                    <Clock3 size={18} className="text-teal-400" />
                    Cerca de <b className="text-white">2 minutos</b>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
                    <Sparkles size={18} className="text-cyan-400" />
                    Perguntas simples sobre o negócio
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 md:p-6">
                <p className="text-sm font-bold text-white">Ao final, você recebe:</p>
                <div className="mt-4 space-y-3">
                  {[
                    'os riscos que podem pesar mais na operação',
                    'os três pontos que merecem atenção primeiro',
                    'contexto com dados e boas práticas reconhecidas',
                    'uma base objetiva para a próxima conversa',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                      <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-teal-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-9 rounded-2xl border border-slate-800 bg-slate-950/45 p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={privacyAcknowledged}
                  onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-teal-500"
                />
                <span className="text-sm leading-6 text-slate-300">
                  Li e estou ciente de que as informações serão usadas para gerar este diagnóstico e apoiar o acompanhamento comercial. Evite informar senhas, documentos pessoais ou dados sensíveis.
                </span>
              </label>
            </div>

            <div className="relative z-10 mt-6 flex justify-end">
              <button
                type="button"
                disabled={!privacyAcknowledged || isStartingRemote}
                onClick={beginExecutiveAssessment}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStartingRemote ? <Loader2 size={18} className="animate-spin" /> : null}
                {isStartingRemote ? 'Preparando...' : 'Iniciar diagnóstico executivo'}
                {!isStartingRemote && <ArrowRight size={18} />}
              </button>
            </div>
            {remoteStatus && (
              <p className="relative z-10 mt-4 text-right text-xs text-amber-200">{remoteStatus}</p>
            )}
          </section>
        </div>
      </main>
    );
  }

  if (completed) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <img src={logo} alt="Concierge Segurança Digital" className="h-10 rounded-lg object-contain" />
            <div className="flex flex-wrap gap-2" data-pdf-ignore="true">
              <button type="button" onClick={handleDownloadReport} disabled={isPdfGenerating} className="inline-flex items-center gap-2 rounded-xl border border-teal-500/25 bg-teal-500/10 px-4 py-2.5 text-sm font-semibold text-teal-200 transition hover:bg-teal-500/15 disabled:cursor-not-allowed disabled:opacity-60">
                {isPdfGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {isPdfGenerating ? 'Gerando PDF...' : 'Baixar relatório'}
              </button>
              <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-slate-700 hover:text-white">
                <RotateCcw size={16} />
                Refazer diagnóstico
              </button>
            </div>
          </div>

          {remoteStatus && (
            <div className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/[0.05] px-4 py-3 text-xs text-teal-200" data-pdf-ignore="true">
              {remoteStatus}
            </div>
          )}

          <div data-executive-report="true">
          <section className={`${sectionCard} mt-6 p-6 md:p-8`}>
            <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:items-center">
              <SecurityMaturityMeter value={result.overall} level={maturity(result.overall)} />
              <div>
                <span className="section-kicker">Resultado executivo</span>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                  {resultHeadline(answers.companyName, result.overall)}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                  Este resultado não tenta substituir uma avaliação técnica. Ele mostra onde existe maior exposição para o negócio e quais pontos vale validar primeiro em uma conversa mais detalhada.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {result.areas.map((area) => (
                    <div key={area.key} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-400">{area.label}</span>
                        <strong className="text-lg text-white">{area.score}</strong>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-teal-500" style={{ width: `${area.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-5 lg:grid-cols-[1.08fr_.92fr] lg:items-start">
            <div className={`${sectionCard} overflow-hidden`}>
              <div className="border-b border-slate-800 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-amber-400/20 bg-amber-400/5 text-amber-300">
                    <TriangleAlert size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Impacto operacional</p>
                    <h2 className="mt-1 text-xl font-bold text-white">{result.impact.label}</h2>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-base font-semibold leading-7 text-white">{result.impactLead}</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{result.impact.copy}</p>

                <div className="mt-5 space-y-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                    <div className="flex items-start gap-3">
                      <DatabaseBackup size={18} className="mt-0.5 shrink-0 text-cyan-300" />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Capacidade de recuperação</span>
                        <p className="mt-1.5 text-sm leading-6 text-slate-200">{result.recoveryImpact}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                    <div className="flex items-start gap-3">
                      <Clock3 size={18} className="mt-0.5 shrink-0 text-cyan-300" />
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Tempo de reação</span>
                        <p className="mt-1.5 text-sm leading-6 text-slate-200">{result.responseImpact}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-300">Risco que mais preocupa hoje</span>
                  <p className="mt-2 font-semibold text-white">{concernLabel(answers.mainConcern)}</p>
                </div>
              </div>
            </div>

            <div className={`${sectionCard} self-start p-6`}>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/5 text-cyan-300">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">IA e proteção de dados</p>
                  <h2 className="mt-1 text-lg font-bold text-white">Uso de IA também precisa de regra simples</h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                {answers.aiGovernance === 'controlled'
                  ? 'A empresa informou que já possui alguma regra para uso de IA. Vale revisar periodicamente ferramentas permitidas e tipos de informação que podem ser enviados.'
                  : 'Sem orientação clara, colaboradores podem enviar informações internas ou dados pessoais a ferramentas de IA sem perceber o risco. Uma política curta já ajuda a reduzir esse ponto cego.'}
              </p>
              <a href="https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-versao-ingles-rt-ingles" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-300 hover:text-teal-200">
                ANPD · Radar Tecnológico sobre IA Generativa
                <ChevronRight size={14} />
              </a>
            </div>
          </section>

          <section className={`${sectionCard} mt-6 overflow-hidden`}>
            <div className="border-b border-slate-800 px-6 py-5 md:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">O que isso pode significar para o negócio</p>
              <h2 className="mt-2 text-2xl font-extrabold text-white">Dados que ajudam a colocar o resultado em perspectiva</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                Os exemplos abaixo não significam que um incidente vai acontecer. Eles mostram por que os pontos identificados merecem validação antes de virarem impacto operacional.
              </p>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
              {result.evidence.map((item) => (
                <article key={item.title} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-400/5 text-cyan-300">
                      {item.icon === 'backup' ? <DatabaseBackup size={18} /> : item.icon === 'identity' ? <KeyRound size={18} /> : item.icon === 'ai' ? <Sparkles size={18} /> : item.icon === 'response' ? <Clock3 size={18} /> : <TriangleAlert size={18} />}
                    </div>
                    <h3 className="text-sm font-bold leading-5 text-white">{item.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-300">{item.copy}</p>
                  <a href={item.href} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-300 hover:text-teal-200">
                    {item.source}
                    <ChevronRight size={14} />
                  </a>
                </article>
              ))}
            </div>
            <div className="mx-6 mb-6 rounded-2xl border border-teal-500/20 bg-teal-500/[0.04] p-5 md:mx-8 md:mb-8">
              <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-300">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Você sabia?</p>
                  <h3 className="mt-1 text-lg font-extrabold text-white">Uma microempresa já recebeu R$ 14.400 em multas da ANPD.</h3>
                  <p className="mt-2 text-[13px] leading-5 text-slate-300">Em 2023, a ANPD aplicou suas primeiras multas por descumprimento da LGPD a uma microempresa. O caso é específico, mas mostra que porte menor não elimina responsabilidades sobre dados pessoais.</p>
                  <a href="https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aplica-a-primeira-multa-por-descumprimento-a-lgpd" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-300 hover:text-teal-200">
                    Ver caso oficial da ANPD
                    <ChevronRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section data-report-slide-break="true" data-report-keep-together="true" className={`${sectionCard} mt-6 overflow-hidden`}>
            <div className="border-b border-slate-800 px-6 py-4 md:px-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-300">Por onde começar</p>
              <h2 className="mt-2 text-2xl font-extrabold text-white">Três prioridades para a próxima conversa</h2>
              <p className="mt-2 text-sm text-slate-400">A ordem abaixo considera as respostas fornecidas nesta avaliação executiva.</p>
            </div>

            <div className="divide-y divide-slate-800">
              {result.priorities.map((priority, index) => (
                <article key={`${priority.area}-${priority.title}`} data-report-keep-together="true" className="grid gap-4 px-6 py-4 md:grid-cols-[64px_1fr] md:px-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/5 text-lg font-extrabold text-teal-300">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-800 bg-slate-950/50 px-2.5 py-1 text-xs font-semibold text-slate-400">{priority.area}</span>
                      {index === 0 && <span className="rounded-full border border-amber-400/20 bg-amber-400/5 px-2.5 py-1 text-xs font-semibold text-amber-300">Revisar primeiro</span>}
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-white">{priority.title}</h3>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Por que isso importa</p>
                        <p className="mt-2 text-[13px] leading-5 text-slate-300">{priority.why}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Próximo passo</p>
                        <p className="mt-2 text-[13px] leading-5 text-slate-300">{priority.action}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs font-medium text-slate-500">Referência: {priority.reference}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section data-report-keep-together="true" className="mt-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/[0.08] to-teal-500/[0.04] p-6 md:p-7">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Próxima conversa</p>
                <h2 className="mt-2 text-2xl font-extrabold text-white">Transforme estes sinais em decisões objetivas para o seu cenário.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Uma conversa curta serve para validar o que realmente se aplica ao ambiente, separar prioridade de ruído e entender quais ações fazem sentido agora. O diagnóstico já mostra onde começar.</p>
              </div>
              <div className="flex flex-wrap gap-2" data-pdf-ignore="true">
                <button type="button" onClick={handleDownloadReport} disabled={isPdfGenerating} className="inline-flex items-center gap-2 rounded-xl border border-teal-500/25 bg-teal-500/10 px-5 py-3 text-sm font-bold text-teal-200 transition hover:bg-teal-500/15 disabled:cursor-not-allowed disabled:opacity-60">
                  {isPdfGenerating ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
                  {isPdfGenerating ? 'Gerando PDF...' : 'Baixar relatório'}
                </button>
              </div>
            </div>
          </section>

          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-600">
            Diagnóstico executivo inicial baseado nas informações fornecidas. A validação técnica detalhada acontece na próxima conversa.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-8 md:py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <img src={logo} alt="Concierge Segurança Digital" className="h-10 rounded-lg object-contain" />
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">Etapa {step + 1} de {steps.length}</p>
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-800 sm:w-44">
              <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
          </div>
        </div>

        <section className={`${sectionCard} mt-6 overflow-hidden`}>
          <div className="border-b border-slate-800 px-6 py-6 md:px-8">
            <span className="section-kicker">Diagnóstico Executivo</span>
            <h1 className="mt-3 text-3xl font-extrabold text-white">{steps[step].title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">{steps[step].subtitle}</p>
          </div>

          <div className="space-y-7 px-6 py-7 md:px-8">
            {step === 0 && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-200">Qual é o nome da empresa?</span>
                    <input className={inputClass} value={answers.companyName} onChange={(event) => set('companyName', event.target.value)} placeholder="Digite o nome da empresa" />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-200">Como podemos chamar você?</span>
                    <input className={inputClass} value={answers.contactName} onChange={(event) => set('contactName', event.target.value)} placeholder="Digite seu nome" />
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-4 md:p-5">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-white">Duas informações rápidas sobre o ambiente</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Pode informar valores aproximados. Se não souber, deixe em branco.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-200">Quantos computadores e notebooks a empresa utiliza?</span>
                      <input
                        className={inputClass}
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={answers.computerCount}
                        onChange={(event) => set('computerCount', event.target.value)}
                        placeholder="Ex.: 30"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-200">Qual é a velocidade da internet principal?</span>
                      <div className="relative">
                        <input
                          className={`${inputClass} pr-16`}
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={answers.internetSpeedMbps}
                          onChange={(event) => set('internetSpeedMbps', event.target.value)}
                          placeholder="Ex.: 500"
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-slate-500">Mbps</span>
                      </div>
                    </label>
                  </div>
                </div>

                <Question title="Hoje, quem normalmente cuida da tecnologia e da segurança da empresa?" hint="Não precisa ser uma equipe de segurança dedicada.">
                  <Choice selected={answers.itOwner === 'internal'} onClick={() => set('itOwner', 'internal')}>Equipe interna de TI</Choice>
                  <Choice selected={answers.itOwner === 'outsourced'} onClick={() => set('itOwner', 'outsourced')}>Empresa ou profissional terceirizado</Choice>
                  <Choice selected={answers.itOwner === 'shared'} onClick={() => set('itOwner', 'shared')}>Responsabilidade dividida entre equipe interna e parceiro</Choice>
                  <Choice selected={answers.itOwner === 'none'} onClick={() => set('itOwner', 'none')}>Não existe um responsável claramente definido</Choice>
                  <Choice selected={answers.itOwner === 'unknown'} onClick={() => set('itOwner', 'unknown')}>Não sei informar</Choice>
                </Question>

                <Question title="Se internet ou sistemas importantes parassem hoje, como a operação seria afetada?">
                  <Choice selected={answers.operationalImpact === 'low'} onClick={() => set('operationalImpact', 'low')}>Pouco impacto por algumas horas</Choice>
                  <Choice selected={answers.operationalImpact === 'partial'} onClick={() => set('operationalImpact', 'partial')}>Parte da equipe conseguiria continuar trabalhando</Choice>
                  <Choice selected={answers.operationalImpact === 'major'} onClick={() => set('operationalImpact', 'major')}>Boa parte da operação ficaria comprometida</Choice>
                  <Choice selected={answers.operationalImpact === 'halt'} onClick={() => set('operationalImpact', 'halt')}>A operação praticamente pararia</Choice>
                  <Choice selected={answers.operationalImpact === 'unknown'} onClick={() => set('operationalImpact', 'unknown')}>Não sei informar</Choice>
                </Question>
              </>
            )}

            {step === 1 && (
              <>
                <Question title="Você sabe como os computadores da empresa são protegidos?" hint="Escolha a opção que mais se aproxima da realidade. Não é necessário saber o nome da ferramenta.">
                  <Choice selected={answers.protection === 'monitored'} onClick={() => set('protection', 'monitored')}>Existe proteção e alguém acompanha alertas e situações suspeitas</Choice>
                  <Choice selected={answers.protection === 'basic'} onClick={() => set('protection', 'basic')}>Existe antivírus ou proteção instalada, mas não sei se há acompanhamento</Choice>
                  <Choice selected={answers.protection === 'native'} onClick={() => set('protection', 'native')}>Usamos principalmente a proteção padrão dos próprios computadores</Choice>
                  <Choice selected={answers.protection === 'none'} onClick={() => set('protection', 'none')}>Não existe uma proteção definida para todos os computadores</Choice>
                  <Choice selected={answers.protection === 'unknown'} onClick={() => set('protection', 'unknown')}>Não sei informar</Choice>
                </Question>

                <Question title="Sobre as informações importantes da empresa, qual cenário descreve melhor o backup?">
                  <Choice selected={answers.backup === 'tested'} onClick={() => set('backup', 'tested')}>Existe backup e já confirmamos que conseguimos recuperar os dados</Choice>
                  <Choice selected={answers.backup === 'exists'} onClick={() => set('backup', 'exists')}>Existe backup, mas não sei quando foi testada a recuperação</Choice>
                  <Choice selected={answers.backup === 'partial'} onClick={() => set('backup', 'partial')}>Apenas parte das informações possui cópia de segurança</Choice>
                  <Choice selected={answers.backup === 'none'} onClick={() => set('backup', 'none')}>Não existe um processo definido de backup</Choice>
                  <Choice selected={answers.backup === 'unknown'} onClick={() => set('backup', 'unknown')}>Não sei informar</Choice>
                </Question>

                <Question title="Nas contas mais importantes, como e-mail, financeiro ou sistemas administrativos, existe uma confirmação além da senha?">
                  <Choice selected={answers.mfa === 'yes'} onClick={() => set('mfa', 'yes')}>Sim, na maioria das contas importantes</Choice>
                  <Choice selected={answers.mfa === 'partial'} onClick={() => set('mfa', 'partial')}>Em algumas contas</Choice>
                  <Choice selected={answers.mfa === 'no'} onClick={() => set('mfa', 'no')}>Não</Choice>
                  <Choice selected={answers.mfa === 'unknown'} onClick={() => set('mfa', 'unknown')}>Não sei informar</Choice>
                </Question>

                <Question title="A empresa tem alguma orientação sobre como colaboradores podem usar ferramentas de Inteligência Artificial?" hint="Por exemplo: ChatGPT, Copilot, Gemini e outras ferramentas que recebem informações digitadas ou arquivos.">
                  <Choice selected={answers.aiGovernance === 'controlled'} onClick={() => set('aiGovernance', 'controlled')}>Sim, existem ferramentas permitidas e regras sobre quais informações podem ser usadas</Choice>
                  <Choice selected={answers.aiGovernance === 'partial'} onClick={() => set('aiGovernance', 'partial')}>Existem orientações, mas ainda são informais ou parciais</Choice>
                  <Choice selected={answers.aiGovernance === 'open'} onClick={() => set('aiGovernance', 'open')}>Cada pessoa utiliza como achar melhor</Choice>
                  <Choice selected={answers.aiGovernance === 'not_used'} onClick={() => set('aiGovernance', 'not_used')}>A empresa não utiliza IA no trabalho</Choice>
                  <Choice selected={answers.aiGovernance === 'unknown'} onClick={() => set('aiGovernance', 'unknown')}>Não sei informar</Choice>
                </Question>

                <Question title="Se um problema de segurança acontecer de madrugada, no fim de semana ou em um feriado, existe alguém definido para agir?">
                  <Choice selected={answers.afterHours === 'yes'} onClick={() => set('afterHours', 'yes')}>Sim, existe alguém ou uma equipe que pode ser acionada</Choice>
                  <Choice selected={answers.afterHours === 'business_hours'} onClick={() => set('afterHours', 'business_hours')}>Normalmente os problemas são tratados no próximo expediente</Choice>
                  <Choice selected={answers.afterHours === 'ad_hoc'} onClick={() => set('afterHours', 'ad_hoc')}>Depende da situação e de conseguir falar com alguém</Choice>
                  <Choice selected={answers.afterHours === 'no'} onClick={() => set('afterHours', 'no')}>Não existe um responsável definido fora do expediente</Choice>
                  <Choice selected={answers.afterHours === 'unknown'} onClick={() => set('afterHours', 'unknown')}>Não sei informar</Choice>
                </Question>

                <Question title="Qual situação de segurança mais preocupa você hoje?">
                  <Choice selected={answers.mainConcern === 'downtime'} onClick={() => set('mainConcern', 'downtime')}>Paralisação da operação</Choice>
                  <Choice selected={answers.mainConcern === 'data_loss'} onClick={() => set('mainConcern', 'data_loss')}>Perda de informações</Choice>
                  <Choice selected={answers.mainConcern === 'fraud'} onClick={() => set('mainConcern', 'fraud')}>Golpes e fraudes</Choice>
                  <Choice selected={answers.mainConcern === 'leak'} onClick={() => set('mainConcern', 'leak')}>Vazamento de dados</Choice>
                  <Choice selected={answers.mainConcern === 'invasion'} onClick={() => set('mainConcern', 'invasion')}>Invasão ou ransomware</Choice>
                  <Choice selected={answers.mainConcern === 'compliance'} onClick={() => set('mainConcern', 'compliance')}>LGPD e responsabilidades sobre dados</Choice>
                  <Choice selected={answers.mainConcern === 'unsure'} onClick={() => set('mainConcern', 'unsure')}>Ainda não tenho uma preocupação principal definida</Choice>
                </Question>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-6 py-5 md:px-8">
            <button
              type="button"
              onClick={() => (step === 0 ? setStarted(false) : setStep((current) => current - 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              <ArrowLeft size={17} />
              Voltar
            </button>

            {step < steps.length - 1 ? (
              <button
                type="button"
                disabled={!canAdvance()}
                onClick={() => setStep((current) => current + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar
                <ArrowRight size={17} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canAdvance() || isSubmittingRemote}
                onClick={submitExecutiveAssessment}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingRemote ? <Loader2 size={17} className="animate-spin" /> : null}
                {isSubmittingRemote ? 'Concluindo...' : 'Ver meu resultado'}
                {!isSubmittingRemote && <ArrowRight size={17} />}
              </button>
            )}
          </div>
        </section>

        <p className="mt-4 text-center text-xs text-slate-600">
          As respostas deste diagnóstico são registradas para gerar o resultado e encaminhar o briefing ao responsável Concierge.
        </p>
      </div>
    </main>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-base font-bold leading-6 text-white">{title}</legend>
      {hint && <p className="mt-1.5 text-sm leading-6 text-slate-500">{hint}</p>}
      <div className="mt-3 grid gap-2.5 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={optionClass(selected)} aria-pressed={selected}>
      <span className="flex items-start gap-3">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-teal-400 bg-teal-500/15' : 'border-slate-700'}`}>
          {selected && <span className="h-2 w-2 rounded-full bg-teal-300" />}
        </span>
        <span>{children}</span>
      </span>
    </button>
  );
}
