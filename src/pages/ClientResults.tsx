import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadDraft, getSubmission } from '../storage';
import { AssessmentData } from '../types';
import { scoreAssessment, maturityLevel, DomainKey } from '../scoring';
import ScoreGauge from '../components/ScoreGauge';
import DomainBars from '../components/DomainBars';
import ImpactChart from '../components/ImpactChart';
import ClientHeader from '../components/ClientHeader';
import { getValidatedSource, getValidatedSourceForDomain, getValidatedSourceForFinding } from '../sourceRegistry';
import { generateAssessmentPdf, sanitizePdfFileName } from '../lib/report-pdf';
import {
  AlertTriangle,
  Database,
  KeyRound,
  MonitorSmartphone,
  Server,
  ShieldCheck,
  Target,
  Wifi,
  Info,
  X,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  HelpCircle,
  Download,
  Loader2
} from 'lucide-react';



const plainDomainLabel = (domain: string) => {
  if (domain === 'Rede e Perímetro') return 'Internet e rede';
  if (domain === 'Endpoints') return 'Computadores';
  if (domain === 'Backup e Continuidade') return 'Dados e backup';
  if (domain === 'Identidade e Acesso') return 'Contas e acessos';
  return domain;
};


const networkSituationText = (data: AssessmentData) => {
  switch (data.firewallLevel) {
    case 'none':
      return 'Você informou que a empresa não possui uma solução dedicada para proteger a conexão com a internet.';
    case 'isp':
      return 'Você informou que a empresa utiliza principalmente o equipamento fornecido pela operadora para proteger a conexão com a internet.';
    case 'router':
      return 'Você informou que a empresa utiliza MikroTik ou outro roteador corporativo para proteger a conexão com a internet.';
    case 'utm':
      return 'Você informou que a empresa possui um equipamento próprio para proteger a conexão com a internet.';
    case 'ngfw':
      return 'Você informou que a empresa possui uma solução de segurança com recursos adicionais de proteção da internet.';
    case 'managed_ngfw':
      return 'Você informou que a empresa possui uma solução de segurança acompanhada por equipe especializada.';
    default:
      return 'Pelas respostas, existe alguma proteção entre a internet e a rede da empresa, mas parte das informações ainda precisa ser confirmada.';
  }
};

const getFindingPresentation = (title: string, data: AssessmentData, originalSituation: string, originalConsequence: string) => {
  const t = title.toLowerCase();
  if (t.includes('perímetro') || t.includes('firewall')) return {
    title: 'A proteção da internet pode ser ampliada',
    informed: networkSituationText(data),
    indication: 'Existe uma camada de proteção, mas vale confirmar se ela também consegue identificar e bloquear ameaças além das regras básicas de acesso.',
    practical: 'Na prática, uma proteção mais completa pode reduzir a dependência de perceber um problema somente depois que ele já afetou pessoas ou sistemas.'
  };
  if (t.includes('reativo') || t.includes('acompanhamento')) return {
    title: 'Os alertas são acompanhados principalmente quando surge um problema',
    informed: data.monitoring === 'reactive_it' ? 'Você informou que a equipe de TI verifica alertas quando existe alguma necessidade ou sintoma.' : originalSituation,
    indication: 'Isso indica que o acompanhamento tende a acontecer depois de algum sinal percebido pela operação.',
    practical: 'Alguns eventos podem ser percebidos apenas quando começam a afetar pessoas, sistemas ou a internet da empresa.'
  };
  if (t.includes('antivírus') || t.includes('detectar') || t.includes('computadores')) return {
    title: 'Os computadores possuem proteção, mas pode faltar visibilidade quando algo escapa do antivírus',
    informed: data.endpointLevel === 'business_av' ? 'Você informou que os computadores utilizam antivírus corporativo.' : originalSituation,
    indication: 'O antivírus é uma primeira camada importante. Pelas respostas, vale confirmar se existe capacidade adicional para entender o que aconteceu quando uma ameaça consegue passar por essa proteção.',
    practical: 'Pode levar mais tempo para descobrir quais computadores foram afetados e quais ações precisam ser tomadas.'
  };
  if (t.includes('vulnerabilidade') || t.includes('atualiza')) return {
    title: 'Atualizações e correções de segurança merecem uma rotina mais previsível',
    informed: originalSituation,
    indication: 'As respostas indicam que a identificação de equipamentos ou sistemas desatualizados pode depender de verificações ocasionais ou reativas.',
    practical: 'Uma rotina definida ajuda a reduzir o tempo em que computadores e sistemas permanecem expostos a falhas já conhecidas.'
  };
  if (t.includes('inventário') || t.includes('ativos')) return {
    title: 'Vale melhorar a visão sobre quais equipamentos fazem parte do ambiente',
    informed: originalSituation,
    indication: 'Ter uma relação atualizada dos equipamentos ajuda a confirmar se todos estão protegidos e atualizados.',
    practical: 'Sem essa visão, algum computador pode ficar fora das rotinas de proteção ou manutenção sem que isso seja percebido.'
  };
  if (t.includes('recuperação') || t.includes('backup') || t.includes('cópias')) return {
    title: 'A recuperação dos dados ainda pode depender de processos pouco previsíveis',
    informed: data.backupLevel === 'manual' ? 'Você informou que as cópias de segurança dependem de execução manual.' : originalSituation,
    indication: 'Existe uma forma de recuperar informações, mas vale confirmar se as cópias são automáticas, protegidas e disponíveis quando realmente forem necessárias.',
    practical: 'Em uma perda de dados ou parada, a retomada pode depender da disponibilidade de pessoas e de etapas manuais.'
  };
  if (t.includes('testada') || t.includes('restauração')) return {
    title: 'A empresa ainda precisa confirmar se consegue recuperar os dados na prática',
    informed: 'Você informou que a restauração das cópias ainda não foi testada.',
    indication: 'Ter uma cópia é importante, mas um teste é o que confirma se os dados podem ser recuperados como esperado.',
    practical: 'Sem um teste anterior, eventuais dificuldades podem aparecer somente no momento em que a recuperação for necessária.'
  };
  if (t.includes('senha') || t.includes('mfa')) return {
    title: 'Algumas contas podem depender apenas da senha',
    informed: 'Você informou que nem todas as contas importantes utilizam uma confirmação adicional além da senha.',
    indication: 'Uma segunda confirmação ajuda a proteger o acesso mesmo quando uma senha é descoberta ou reutilizada indevidamente.',
    practical: 'Isso reduz a chance de uma senha vazada ser suficiente para acessar uma conta importante.'
  };
  if (t.includes('compartilhadas')) return {
    title: 'Contas compartilhadas podem dificultar o controle de acessos',
    informed: 'Você informou que existem contas utilizadas por mais de uma pessoa.',
    indication: 'Quando cada pessoa possui sua própria conta, fica mais fácil controlar permissões e remover acessos individualmente.',
    practical: 'Também fica mais simples identificar quem realizou uma determinada ação.'
  };
  if (t.includes('e-mail') || t.includes('phishing')) return {
    title: 'O e-mail pode depender principalmente dos filtros básicos',
    informed: originalSituation,
    indication: 'Vale confirmar se existe proteção adicional para identificar mensagens falsas, links perigosos e anexos suspeitos.',
    practical: 'Isso ajuda a reduzir a dependência de o próprio usuário perceber sozinho uma tentativa de golpe.'
  };
  if (t.includes('incidente') || t.includes('resposta')) return {
    title: 'Vale definir previamente quem coordena a resposta a um problema de segurança',
    informed: 'Você informou que não existe um responsável claramente definido para coordenar esse tipo de situação.',
    indication: 'Saber quem deve ser acionado evita que essa decisão precise ser tomada durante o próprio incidente.',
    practical: 'Isso pode tornar os primeiros passos mais rápidos e organizados quando cada minuto importa.'
  };
  return {
    title,
    informed: originalSituation,
    indication: originalConsequence,
    practical: getOperationalImpact(title)
  };
};

const rangeLabel = (n: number, kind: 'people' | 'devices' = 'people') => {
  const noun = kind === 'people' ? 'pessoas' : 'equipamentos';
  if (!n) return `Não informado`;
  if (n <= 10) return `Até 10 ${noun}`;
  if (n <= 20) return `11 a 20 ${noun}`;
  if (n <= 50) return `21 a 50 ${noun}`;
  if (n <= 100) return `51 a 100 ${noun}`;
  if (n <= 200) return `101 a 200 ${noun}`;
  return `Mais de 200 ${noun}`;
};

const money = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

const getOperationalImpact = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('perímetro') || t.includes('firewall')) {
    return 'Na prática, uma proteção mais simples pode perceber menos tipos de ameaça antes que elas alcancem os computadores e sistemas da empresa.';
  }
  if (t.includes('licenciamento')) {
    return 'Alguns recursos de segurança podem deixar de receber atualizações ou inteligência recente, reduzindo a cobertura esperada da solução.';
  }
  if (t.includes('reativo') || t.includes('acompanhamento')) {
    return 'Quando o acompanhamento é principalmente reativo, alguns eventos podem ser percebidos somente depois de gerar sintomas para pessoas, sistemas ou para a operação.';
  }
  if (t.includes('capacidade de detectar') || t.includes('computadores')) {
    return 'A equipe pode depender mais de sinais visíveis ou investigação manual para perceber comportamentos suspeitos nos computadores.';
  }
  if (t.includes('atualizações') || t.includes('vulnerabilidade')) {
    return 'O principal efeito é ampliar o intervalo entre a disponibilidade de uma correção e sua aplicação nos ativos que realmente precisam dela.';
  }
  if (t.includes('privilégios') || t.includes('administrador')) {
    return 'Privilégios elevados ampliam o que uma conta ou aplicação consegue alterar no equipamento, por isso normalmente exigem controle mais próximo.';
  }
  if (t.includes('recuperação') || t.includes('backup') || t.includes('cópias')) {
    return 'Em uma necessidade real de recuperação, a retomada pode depender mais de ações manuais ou de cópias que compartilham o mesmo contexto do ambiente principal.';
  }
  if (t.includes('testada') || t.includes('restauração')) {
    return 'Sem um teste anterior, a empresa só confirma tempo, integridade e procedimento de recuperação quando realmente precisa restaurar os dados.';
  }
  if (t.includes('senha') || t.includes('mfa')) {
    return 'Sem uma segunda etapa de confirmação, a proteção do acesso depende mais diretamente da segurança da senha utilizada.';
  }
  if (t.includes('compartilhadas')) {
    return 'O principal efeito é reduzir a rastreabilidade: fica mais difícil saber quem realizou uma ação e remover o acesso de uma pessoa específica.';
  }
  if (t.includes('incidente') || t.includes('resposta')) {
    return 'Em uma ocorrência relevante, responsáveis, contatos e próximos passos podem precisar ser definidos durante o próprio incidente.';
  }
  if (t.includes('e-mail') || t.includes('phishing')) {
    return 'Mensagens suspeitas podem depender mais dos filtros básicos e da percepção do usuário, especialmente em tentativas de phishing e fraude.';
  }
  return 'Esse ponto merece uma revisão para confirmar se a empresa consegue perceber o problema rapidamente e agir quando necessário.';
};

export default function ClientResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const showSuccess = searchParams.get('success') === 'true';
  const urlId = searchParams.get('id');

  const [assessmentData, setAssessmentData] = useState<AssessmentData>(() => {
    // Priority 1: URL id param
    if (urlId) {
      const sub = getSubmission(urlId);
      if (sub) return sub.data;
    }
    // Priority 2: last assessment persisted in localStorage
    const lastId = localStorage.getItem('concierge-client-last-assessment-id-v2');
    if (lastId) {
      const sub = getSubmission(lastId);
      if (sub) return sub.data;
    }
    // Priority 3: draft fallback
    return loadDraft();
  });

  const [isFromSubmission, setIsFromSubmission] = useState<boolean>(() => {
    if (urlId) {
      const sub = getSubmission(urlId);
      return !!sub;
    }
    const lastId = localStorage.getItem('concierge-client-last-assessment-id-v2');
    return !!lastId && !!getSubmission(lastId);
  });

  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [isFaixaModalOpen, setIsFaixaModalOpen] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(() => new Set());
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);

  // Re-hydrate if URL id changes
  useEffect(() => {
    if (urlId) {
      const sub = getSubmission(urlId);
      if (sub) {
        setAssessmentData(sub.data);
        setIsFromSubmission(true);
        return;
      }
    }
    const lastId = localStorage.getItem('concierge-client-last-assessment-id-v2');
    if (lastId) {
      const sub = getSubmission(lastId);
      if (sub) {
        setAssessmentData(sub.data);
        setIsFromSubmission(true);
        return;
      }
    }
    setAssessmentData(loadDraft());
    setIsFromSubmission(false);
  }, [urlId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsScoreModalOpen(false);
      setIsDiagnosisModalOpen(false);
      setIsFaixaModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleFinding = (key: string) => {
    setExpandedFindings((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDownloadReport = async () => {
    if (isPdfGenerating) return;

    setIsPdfGenerating(true);
    setPdfMode(true);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 160));

      const reportRoot = document.querySelector<HTMLElement>(
        '[data-assessment-report="true"]',
      );

      if (!reportRoot) {
        throw new Error('Área do relatório não encontrada.');
      }

      const companyName = assessmentData.companyName?.trim() || 'empresa';

      await generateAssessmentPdf(reportRoot, {
        companyName,
        fileName: `concierge-security-assessment-${sanitizePdfFileName(companyName)}.pdf`,
      });
    } catch (error) {
      console.error('Falha ao gerar PDF do assessment:', error);

      alert(
        'Não foi possível gerar o PDF neste momento. Tente novamente em alguns instantes.',
      );
    } finally {
      setPdfMode(false);
      setIsPdfGenerating(false);
    }
  };

  const draftData = assessmentData;

  const hasAnswers = !!(
    draftData.companyName ||
    draftData.contactName ||
    draftData.contactEmail ||
    (draftData.users && draftData.users > 0) ||
    (draftData.devices && draftData.devices > 0) ||
    draftData.firewallLevel !== 'unknown' ||
    draftData.endpointLevel !== 'unknown' ||
    draftData.backupLevel !== 'unknown' ||
    draftData.mfa !== 'unknown'
  );

  if (!hasAnswers) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
        <div className="mx-auto max-w-5xl">
          <ClientHeader />
          <div className="glass-card mt-6 p-8 text-center md:p-12">
            <AlertTriangle className="mx-auto text-amber-400 mb-4" size={48} />
            <h2 className="text-2xl font-bold text-white">Nenhum diagnóstico foi realizado ainda</h2>
            <p className="mt-2 text-slate-400 max-w-lg mx-auto">
              Para visualizar o relatório de postura executiva, acesse a aba do diagnóstico e preencha as informações sobre a sua infraestrutura.
            </p>
            <button
              onClick={() => navigate('/diagnostico')}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 font-semibold text-white transition hover:bg-teal-500"
            >
              Iniciar diagnóstico
            </button>
          </div>
        </div>
      </main>
    );
  }


  const r = scoreAssessment(draftData);

  const domains = [
    { label: 'Internet e rede', value: r.scores.network, coverage: r.domainCoverage.network, confidence: r.domainConfidence.network, icon: <Server size={17} className="text-cyan-400" /> },
    { label: 'Computadores', value: r.scores.endpoint, coverage: r.domainCoverage.endpoint, confidence: r.domainConfidence.endpoint, icon: <MonitorSmartphone size={17} className="text-cyan-400" /> },
    { label: 'Dados e backup', value: r.scores.backup, coverage: r.domainCoverage.backup, confidence: r.domainConfidence.backup, icon: <Database size={17} className="text-cyan-400" /> },
    { label: 'Contas e acessos', value: r.scores.identity, coverage: r.domainCoverage.identity, confidence: r.domainConfidence.identity, icon: <KeyRound size={17} className="text-cyan-400" /> }
  ];

  // List of distinct domain names of findings
  const affectedDomains = Array.from(new Set(r.findings.map(f => f.domain)));
  let pointsAttentionText = "Os principais pontos identificados estão relacionados a controles essenciais de segurança.";
  if (affectedDomains.length > 0) {
    const domainLabels = affectedDomains.map(d => {
      if (d === 'Backup e Continuidade') return 'recuperação dos dados e cópias de segurança';
      if (d === 'Endpoints') return 'proteção dos computadores';
      if (d === 'Rede e Perímetro') return 'proteção da internet e da rede';
      if (d === 'Identidade e Acesso') return 'proteção das contas e acessos';
      return d.toLowerCase();
    });
    if (domainLabels.length === 1) {
      pointsAttentionText = `Os principais pontos identificados estão relacionados a ${domainLabels[0]}.`;
    } else if (domainLabels.length === 2) {
      pointsAttentionText = `Os principais pontos identificados estão relacionados a ${domainLabels[0]} e ${domainLabels[1]}.`;
    } else {
      const last = domainLabels.pop();
      pointsAttentionText = `Os principais pontos identificados estão relacionados a ${domainLabels.join(', ')} e ${last}.`;
    }
  }

  // Priority name executive mapping
  const priorityExecName: Record<DomainKey, string> = {
    network: 'Proteção da internet e da rede',
    endpoint: 'Proteção dos computadores',
    backup: 'Recuperação dos dados',
    identity: 'Proteção das contas e acessos'
  };

  const priorityReasonText: Record<DomainKey, string> = {
    network: 'Pelas respostas, este é o ponto que mais merece uma revisão inicial. Vale confirmar se a proteção atual consegue bloquear ameaças, registrar eventos importantes e permitir acompanhamento quando algo acontece.',
    endpoint: 'Pelas respostas, vale revisar se a proteção dos computadores vai além do antivírus e se alguém consegue entender e responder quando uma ameaça é detectada.',
    backup: 'Pelas respostas, vale confirmar se as cópias são automáticas, protegidas e realmente conseguem recuperar os dados no tempo que a empresa precisa.',
    identity: 'Pelas respostas, vale revisar como as contas importantes são protegidas, como os acessos são removidos e quem acompanha situações suspeitas.'
  };

  const nextStepText: Record<DomainKey, string> = {
    network: 'Revisar como a conexão com a internet é protegida e quem acompanha os alertas',
    endpoint: 'Confirmar se a proteção dos computadores permite investigar e responder a ameaças',
    backup: 'Testar a recuperação e revisar como as cópias de segurança estão protegidas',
    identity: 'Revisar a proteção das contas e a remoção de acessos'
  };

  const priorityFinding = r.findings.find(f => f.domain === r.priorityLabel) || r.findings[0];
  const validatedPrioritySource = priorityFinding ? getValidatedSourceForDomain(priorityFinding.domain) : null;
  const anpdFineSource = getValidatedSource('anpd-first-fine');
  const anpdSmallBusinessSource = getValidatedSource('anpd-small-business');
  const companyLabel = draftData.companyName?.trim() || 'sua empresa';
  const executiveNarrative = r.priority && priorityFinding
    ? `Com base no que você informou, ${priorityExecName[r.priority].toLowerCase()} foi o ponto que mais chamou atenção neste diagnóstico. ${priorityReasonText[r.priority]} As conclusões abaixo mostram quais respostas levaram a essa leitura e o que vale confirmar primeiro.`
    : `Com base nas respostas fornecidas, organizamos os principais pontos que vale confirmar ou revisar. O resultado é uma leitura inicial e não substitui uma validação técnica do ambiente.`;

  // Evolution domains sorting
  const evaluatedScoresList = Object.entries(r.scores)
    .filter(([, val]) => val !== null)
    .map(([key, val]) => ({ key: key as DomainKey, label: r.labels[key as DomainKey], score: val as number }))
    .sort((a, b) => a.score - b.score);

  const immediatePriority = evaluatedScoresList[0];
  const nextOpportunity = evaluatedScoresList.length > 1 ? evaluatedScoresList[1] : null;
  const mostMature = evaluatedScoresList.length > 0 ? evaluatedScoresList[evaluatedScoresList.length - 1] : null;

  return (
    <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
      <div className="mx-auto max-w-5xl" data-assessment-report="true">
        <ClientHeader />

        {showSuccess && (
          <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-sm text-emerald-300">
            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} />
            <div>
              <b className="text-slate-100 font-semibold block text-base">Diagnóstico enviado com sucesso!</b>
              <p className="mt-1 text-slate-300 leading-relaxed">
                As informações foram salvas com sucesso. Veja abaixo o seu relatório de maturidade executiva.
              </p>
            </div>
          </div>
        )}

        {!isFromSubmission && !showSuccess && (
          <div className="mb-6 flex items-start gap-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-300">
            <Info className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <b className="text-slate-100 font-semibold block text-base">Pré-visualização do diagnóstico</b>
              <p className="mt-1 text-slate-400 leading-relaxed">
                Você está visualizando um rascunho com as respostas preenchidas. Para gerar o relatório oficial e persistir os dados, clique em <b className="text-amber-300">Enviar assessment</b> na última etapa do diagnóstico.
              </p>
            </div>
          </div>
        )}

        {/* 1. Contexto do Ambiente */}
        <section className="glass-card p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="section-kicker">Ambiente Analisado</span>
              <h2 className="mt-2 text-2xl font-bold text-white">Resumo do diagnóstico</h2>
              <p className="mt-1 text-sm text-slate-400">
                A leitura abaixo foi construída a partir das respostas fornecidas sobre internet, computadores, dados, backup e contas.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300">
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-teal-400" />
                  Indicador geral: {r.level}
                </span>
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                  Setor: {(draftData.sector === 'Outros' ? draftData.sectorOther : draftData.sector) || 'Não informado'}
                </span>
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                  {rangeLabel(draftData.users, 'people')}
                </span>
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                  {rangeLabel(draftData.endpointCount || draftData.devices, 'devices')}
                </span>
                {draftData.servers > 0 && (
                  <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                    {draftData.servers} servidores
                  </span>
                )}
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                  {draftData.sites || 1} unidades
                </span>
              </div>
            </div>
          </div>


        </section>

        {/* 2. Score Geral e Comparativo */}
        <section className="mt-6 grid gap-6 md:grid-cols-[1fr_1.3fr]">
          <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-bold uppercase tracking-[.16em] text-slate-500 mb-4">Indicador de maturidade</h3>
            <ScoreGauge value={r.overall} size={160} />
            <div className="mt-4">
              <div className="text-xl font-bold text-white">{r.level}</div>
              <p className="mt-2 text-xs text-slate-400 max-w-[240px]">
                O resultado representa a maturidade dos controles informados. Quando algum ponto importante ainda não pôde ser confirmado, ele é sinalizado para validação antes de uma conclusão mais detalhada.
              </p>
            </div>
            <button
              onClick={() => setIsScoreModalOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 transition"
            >
              <HelpCircle size={16} />
              Como calculamos este indicador?
            </button>
          </div>

          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <span className="section-kicker">Visão Geral</span>
              <h3 className="mt-1 text-xl font-bold text-white">Visão por área</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Veja como cada área se comportou a partir das respostas fornecidas.
              </p>
            </div>
            <div className="flex-grow flex flex-col justify-center">
              <DomainBars items={domains} />
            </div>
          </div>
        </section>

        {/* 3. Leitura guiada do diagnóstico */}
        <section className="glass-card mt-6 p-6 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <span className="section-kicker">O que entendemos</span>
              <h3 className="mt-1 text-xl font-bold text-white">O que mais chamou atenção</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{executiveNarrative}</p>
              {validatedPrioritySource && (
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  Referência complementar validada: {validatedPrioritySource.organization}, {validatedPrioritySource.reportTitle} ({validatedPrioritySource.year}).
                </p>
              )}
            </div>
            <button onClick={() => setIsDiagnosisModalOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 transition">
              <HelpCircle size={16}/> Como chegamos a esta conclusão?
            </button>
          </div>
          <div className="mt-5 grid gap-3 border-t border-slate-800/70 pt-5 sm:grid-cols-3">
            <div><div className="text-3xs font-bold uppercase tracking-wider text-slate-500">Indicador geral</div><div className="mt-1 font-bold text-slate-100">{r.overall !== null ? `${Math.round(r.overall)}/100 · ${r.level}` : 'Dados insuficientes'}</div></div>
            <div><div className="text-3xs font-bold uppercase tracking-wider text-slate-500">Primeiro ponto a revisar</div><div className="mt-1 font-bold text-amber-300">{r.priority ? priorityExecName[r.priority] : 'Aguardando dados'}</div></div>
            <div><div className="text-3xs font-bold uppercase tracking-wider text-slate-500">Próximo passo</div><div className="mt-1 font-bold text-slate-100">{r.priority ? nextStepText[r.priority] : 'Validar os pontos prioritários identificados'}</div></div>
          </div>
        </section>

        {/* 4. Principais Pontos de Atenção */}
        <section className="glass-card mt-6 p-6">
          <span className="section-kicker">Resumo dos pontos principais</span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h3 className="mt-1 text-xl font-bold text-white">O que vale revisar</h3><button onClick={() => setIsDiagnosisModalOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 transition"><HelpCircle size={16}/> Como chegamos a estes pontos?</button></div>
          <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="text-amber-300" size={24} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-200">
                {Math.min(r.findings.length, 3)} pontos principais para revisar
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Selecionamos os pontos que mais ajudam a entender onde vale começar. O restante continua considerado pela metodologia, mas não precisa aparecer todo de uma vez para você.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Prioridade Principal */}
        {r.priority && (
          <section className="glass-card mt-6 p-6 border-l-4 border-l-amber-500/60">
            <span className="text-xs font-bold uppercase tracking-[.16em] text-amber-400">Por onde começar</span>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {priorityExecName[r.priority]}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {priorityReasonText[r.priority]}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3.5 py-1.5 text-xs text-slate-400 font-semibold">
              <span>Indicador desta área:</span>
              <span className="text-amber-300 font-bold">{priorityExecName[r.priority]} · {r.scores[r.priority]}/100</span>
            </div>
          </section>
        )}

        {/* 5. Pontos identificados */}
        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="section-kicker">Pontos principais</span>
              <h3 className="text-2xl font-bold text-white">Os principais pontos para revisar</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">
                Mostramos abaixo até três pontos que mais influenciaram o resultado. Cada um começa pela resposta fornecida e explica o que ela pode representar na prática.
              </p>
            </div>
            <span className="text-sm text-slate-500">{Math.min(r.findings.length, 3)} ponto(s) principal(is)</span>
          </div>

          <div className="grid gap-4">
            {r.findings.slice(0, 3).map((f, index) => {
              const findingKey = `${plainDomainLabel(f.domain)}-${f.title}-${index}`;
              const isExpanded = pdfMode || expandedFindings.has(findingKey);
              const source = getValidatedSourceForFinding(f.title, f.domain);
              const severityLabel = f.severity === 'Alta' ? 'Vale revisar primeiro' : f.severity === 'Média' ? 'Vale revisar' : 'Acompanhar';
              const presentation = getFindingPresentation(f.title, draftData, f.situation, f.consequence);

              return (
                <article key={findingKey} className="glass-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { if (!pdfMode) toggleFinding(findingKey); }}
                    aria-expanded={isExpanded}
                    className="w-full p-5 text-left md:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                            <AlertTriangle size={15} className="text-amber-400" />
                            {plainDomainLabel(f.domain)}
                          </span>
                          <span className={`rounded-full px-2.5 py-0.5 text-2xs font-semibold ${
                            f.severity === 'Alta'
                              ? 'border border-amber-700/25 bg-amber-950/25 text-amber-300'
                              : f.severity === 'Média'
                                ? 'border border-cyan-800/20 bg-cyan-950/20 text-cyan-300'
                                : 'border border-slate-700/30 bg-slate-900/30 text-slate-300'
                          }`}>
                            {severityLabel}
                          </span>
                        </div>

                        <h4 className="mt-3 text-lg font-bold leading-snug text-slate-100">{presentation.title}</h4>
                        <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed">
                          <p className="text-slate-300"><b className="text-slate-100">O que você nos informou:</b> {presentation.informed}</p>
                          <p className="text-slate-300"><b className="text-slate-100">O que isso indica:</b> {presentation.indication}</p>
                          <p className="text-slate-400"><b className="text-slate-300">Na prática:</b> {presentation.practical}</p>
                        </div>
                      </div>

                      <span className="mt-1 shrink-0 text-teal-400" aria-hidden="true">
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-teal-400">
                      {isExpanded ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-800/70 px-5 pb-6 pt-5 md:px-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
                          <div className="text-3xs font-bold uppercase tracking-wider text-slate-500">Detalhe técnico</div>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.technical}</p>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-4">
                          <div className="text-3xs font-bold uppercase tracking-wider text-slate-500">Referência técnica</div>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{f.consequence}</p>
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

        {/* 6. Impacto Financeiro (Cenário Operacional Ilustrativo) */}
        <section className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <span className="section-kicker">Cenário operacional ilustrativo</span>
              <h3 className="mt-1 text-xl font-bold text-white">Quanto uma parada pode representar para a operação</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Simulação de ordem de grandeza baseada nas informações fornecidas e em premissas referenciais internas para pequenas e médias empresas.
              </p>
              <div className="mt-5 rounded-xl border border-cyan-900/15 bg-cyan-950/5 p-3 text-xs leading-relaxed text-slate-300">
                Esta faixa ajuda a dimensionar uma conversa de negócio. Ela não representa previsão de perda, multa ou orçamento de recuperação.
              </div>
              <div className="mt-6 text-3xl font-extrabold text-white">
                {money(r.impactRange[0])} <span className="text-base font-normal text-slate-500">a</span> {money(r.impactRange[1])}
              </div>
            </div>
            <button
              onClick={() => setIsFaixaModalOpen(true)}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 transition"
            >
              <HelpCircle size={16} />
              Como estimamos essa faixa?
            </button>
          </div>

          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <span className="section-kicker">Composição da faixa</span>
              <h3 className="mt-1 text-xl font-bold text-white">De onde vem a estimativa</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Componentes usados para transformar uma indisponibilidade em uma referência operacional compreensível.
              </p>
            </div>
            <div className="flex-grow flex flex-col justify-center">
              <ImpactChart components={r.impactComponents} />
            </div>
          </div>
        </section>

        {draftData.sensitiveData === 'yes' && anpdFineSource && (
          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/25 p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <span className="section-kicker">Referência regulatória</span>
                <h3 className="mt-1 text-lg font-bold text-white">Quando há dados pessoais, o impacto pode ir além da indisponibilidade</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  A LGPD também pode gerar obrigações administrativas conforme o tipo de dado, a ocorrência e as circunstâncias do caso. Como referência real, em 2023 a ANPD aplicou sua primeira multa a uma empresa privada: a microempresa Telekall Infoservice recebeu duas multas simples que totalizaram <b className="text-slate-100">R$ 14.400</b>, além de advertência.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  O caso é específico e não representa uma estimativa de eventual sanção para esta empresa. A ANPD possui regras próprias de dosimetria e tratamento diferenciado para agentes de pequeno porte.
                </p>
              </div>
              <div className="shrink-0 space-y-2 text-xs">
                <a
                  href={anpdFineSource.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-semibold text-teal-400 transition hover:text-teal-300"
                >
                  Ver caso oficial da ANPD
                </a>
                {anpdSmallBusinessSource && (
                  <a
                    href={anpdSmallBusinessSource.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block font-semibold text-slate-400 transition hover:text-slate-300"
                  >
                    Regras para agentes de pequeno porte
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 7. Caminho de Evolução */}
        <section className="glass-card mt-6 p-6">
          <span className="section-kicker">Próximos passos</span>
          <h3 className="mt-1 text-xl font-bold text-white">Por onde começar</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Uma ordem prática para revisar os pontos identificados no diagnóstico.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {immediatePriority && (
              <div className="rounded-xl border border-amber-900/20 bg-amber-950/5 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-3xs font-bold uppercase tracking-wider text-amber-400 block">1. Primeiro ponto a revisar</span>
                  <h4 className="mt-2 font-bold text-slate-100 text-sm">{priorityExecName[immediatePriority.key]}</h4>
                  <p className="text-2xs text-slate-400 mt-1">
                    Este foi o ponto que mais chamou atenção. Vale começar confirmando como ele funciona hoje e quais melhorias realmente fazem sentido para a empresa.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-amber-300">
                  Indicador atual: {immediatePriority.score}/100
                </div>
              </div>
            )}

            {nextOpportunity && (
              <div className="rounded-xl border border-cyan-900/10 bg-cyan-950/5 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-3xs font-bold uppercase tracking-wider text-cyan-400 block">2. Próximo ponto a revisar</span>
                  <h4 className="mt-2 font-bold text-slate-100 text-sm">{priorityExecName[nextOpportunity.key]}</h4>
                  <p className="text-2xs text-slate-400 mt-1">
                    Depois do primeiro ponto, este é o próximo tema que vale revisar para reduzir dependências e melhorar a previsibilidade da operação.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-cyan-300">
                  Indicador atual: {nextOpportunity.score}/100
                </div>
              </div>
            )}

            {mostMature && (
              <div className="rounded-xl border border-emerald-900/15 bg-emerald-950/5 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-3xs font-bold uppercase tracking-wider text-emerald-400 block">3. Área com melhor condição atual</span>
                  <h4 className="mt-2 font-bold text-slate-100 text-sm">{priorityExecName[mostMature.key]}</h4>
                  <p className="text-2xs text-slate-400 mt-1">
                    {mostMature.score < 60
  ? 'Entre os pontos avaliados, este apresentou a melhor condição relativa, mas ainda há espaço importante para evolução. Vale revisar se a proteção atual oferece os recursos necessários para o ambiente e para os riscos da empresa.'
  : mostMature.score < 80
    ? 'Este ponto apresenta uma base mais estruturada, mas ainda vale revisar lacunas e confirmar se os recursos atuais atendem às necessidades da empresa.'
    : 'Este ponto apresenta uma condição mais madura. A recomendação é manter os controles existentes e revisá-los periodicamente para garantir que continuem adequados ao ambiente.'}
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-emerald-300">
                  Indicador atual: {mostMature.score}/100
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 8. Próxima Etapa */}
        <section className="mt-8 rounded-2xl border border-teal-950/30 bg-teal-950/10 p-6">
          <div className="flex gap-4 items-start">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Próxima etapa</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                A equipe Concierge pode usar este diagnóstico como ponto de partida para confirmar as informações, tirar dúvidas e entender quais melhorias realmente fazem sentido para o seu ambiente.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center" data-pdf-ignore="true">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={isPdfGenerating}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 disabled:cursor-wait disabled:bg-teal-800 disabled:text-teal-200"
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

                <p className="text-xs leading-relaxed text-slate-500">
                  O PDF reúne o mesmo diagnóstico exibido nesta página e inclui os detalhes técnicos dos principais pontos para facilitar o compartilhamento interno.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Modal: Como chegamos à leitura executiva? */}
      {isDiagnosisModalOpen && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget) setIsDiagnosisModalOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 relative">
            <button onClick={() => setIsDiagnosisModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition"><X size={20}/></button>
            <h3 className="text-xl font-bold text-white">Como chegamos a esta conclusão?</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">A leitura usa as mesmas respostas do diagnóstico e as transforma em uma explicação mais simples sobre o que está funcionando, o que merece revisão e por onde faz sentido começar.</p>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><b className="text-slate-100">1. Respostas fornecidas</b><p className="mt-1 text-slate-400">Consideramos apenas as informações declaradas no onboarding. Quando algum ponto importante não é conhecido, a leitura daquele domínio é marcada para validação adicional, sem transformar a ausência de informação em falha.</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><b className="text-slate-100">2. Áreas analisadas</b><p className="mt-1 text-slate-400">Organizamos as respostas em quatro áreas: internet e rede, computadores, dados e backup, e contas e acessos. O indicador mostra como essas áreas aparecem nas informações fornecidas.</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><b className="text-slate-100">3. Ordem de atenção</b><p className="mt-1 text-slate-400">Damos mais destaque aos pontos que aparecem mais frágeis nas respostas e ao impacto que eles podem ter no dia a dia. A ideia é mostrar de forma clara o que vale revisar primeiro.</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><b className="text-slate-100">4. Referências</b><p className="mt-1 text-slate-400">Frameworks como NIST CSF e CIS Controls orientam as capacidades avaliadas. Estatísticas de mercado só são exibidas quando previamente cadastradas e validadas na biblioteca de evidências do produto. Os pesos e faixas de score pertencem ao modelo interno Concierge.</p></div>
              <p className="border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">Este material é um diagnóstico inicial, comercial e executivo. Ele não substitui validação técnica, auditoria, teste de segurança, laudo pericial ou parecer jurídico.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Como calculamos este indicador? */}
      {isScoreModalOpen && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget) setIsScoreModalOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 relative">
            <button
              onClick={() => setIsScoreModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white">Como calculamos o indicador</h3>
            <p className="mt-2 text-sm text-slate-400">
              O indicador é calculado a partir das respostas fornecidas e de uma metodologia própria do Concierge Security Assessment, apoiada em boas práticas reconhecidas.
            </p>

            <div className="mt-6 space-y-5 text-sm text-slate-300">
              <div>
                <h4 className="font-semibold text-slate-200">Como tratamos suas respostas</h4>
                <p className="mt-1 leading-relaxed">
                  O resultado consolidado considera apenas os controles que puderam ser avaliados pelas respostas fornecidas.
                  Respostas <b>"Não sei informar"</b> não são tratadas como falha ou penalidade. Elas indicam que aquele ponto precisa de confirmação adicional, evitando conclusões baseadas em hipóteses.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">O que a metodologia considera</h4>
                <ul className="mt-2 space-y-1 text-xs list-disc list-inside text-slate-400">
                  <li><b>Internet e rede:</b> tipo de proteção utilizada, recursos de bloqueio, atualização e acompanhamento dos alertas.</li>
                  <li><b>Computadores:</b> antivírus, administração da proteção, atualizações, controle dos equipamentos e acompanhamento dos alertas.</li>
                  <li><b>Dados e backup:</b> existência das cópias, proteção contra exclusão ou alteração e teste de recuperação.</li>
                  <li><b>Contas e segurança:</b> verificação em duas etapas, contas compartilhadas, remoção de acessos, proteção de e-mail e definição de quem agir em um incidente.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">Faixas do indicador</h4>
                <ul className="mt-2 space-y-1 text-xs text-slate-400">
                  <li>🟢 <b>80 - 100:</b> Avançada</li>
                  <li>🔵 <b>65 - 79:</b> Adequada</li>
                  <li>🟡 <b>45 - 64:</b> Intermediária</li>
                  <li>🟠 <b>25 - 44:</b> Básica</li>
                  <li>🔴 <b>0 - 24:</b> Muito baixa</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h4 className="font-semibold text-teal-400">Referências metodológicas</h4>
                <p className="mt-1 leading-relaxed text-xs text-slate-400">
                  A seleção dos controles avaliados foi estruturada com referência em frameworks amplamente utilizados em segurança da informação.
                </p>
                <ul className="mt-2 space-y-2 text-xs text-slate-400">
                  <li><a className="text-teal-400 hover:text-teal-300" href="https://www.nist.gov/cyberframework" target="_blank" rel="noreferrer">NIST Cybersecurity Framework (CSF 2.0)</a> — organização de capacidades de governança, proteção, detecção, resposta e recuperação.</li>
                  <li><a className="text-teal-400 hover:text-teal-300" href="https://www.cisecurity.org/controls" target="_blank" rel="noreferrer">CIS Critical Security Controls</a> — conjunto priorizado de controles técnicos e operacionais.</li>
                  <li><a className="text-teal-400 hover:text-teal-300" href="https://www.gov.br/anpd/pt-br" target="_blank" rel="noreferrer">ANPD / LGPD</a> — utilizada apenas quando o diagnóstico tratar de proteção de dados e obrigações regulatórias.</li>
                </ul>
                <p className="mt-3 leading-relaxed text-xs text-slate-500">
                  As referências orientam quais capacidades são avaliadas. Os pesos, notas, faixas de maturidade e severidades pertencem ao modelo interno Concierge. Estatísticas de mercado só aparecem quando cadastradas e validadas previamente na biblioteca de evidências do produto.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h4 className="font-semibold text-slate-300">Limitações</h4>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Este indicador é uma referência inicial baseada nas informações declaradas. Ele não é uma nota oficial do NIST ou CIS e não substitui auditoria, teste técnico, laudo pericial ou parecer jurídico.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Como estimamos essa faixa? */}
      {isFaixaModalOpen && (
        <div onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFaixaModalOpen(false); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 relative">
            <button
              onClick={() => setIsFaixaModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white">Composição da Estimativa de Indisponibilidade</h3>
            <p className="mt-2 text-sm text-slate-400">
              Veja a composição matemática do cálculo de impacto simulado no relatório.
            </p>

            <div className="mt-6 space-y-5 text-sm text-slate-300">
              <div>
                <h4 className="font-semibold text-slate-200">Fórmula de Impacto</h4>
                <div className="mt-2 bg-slate-950/60 p-3 rounded-lg border border-slate-900 font-mono text-xs text-teal-300">
                  Custo Total = (Pessoas × Horas de Parada × Custo/Hora) + Custo de Reconstrução + Custo Operacional Adicional
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">Composição de Valores</h4>
                <div className="mt-3 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-slate-300">Dados Declarados pelo Cliente</span>
                      <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider border border-emerald-500/10">
                        Dado informado pelo cliente
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                      <li>Pessoas: {rangeLabel(draftData.users, 'people')} (referência usada na simulação: {r.impactAssumptions.people})</li>
                      <li>Horas de Parada (baseadas no tempo tolerável): {r.impactAssumptions.hours}h</li>
                      <li>Computadores: {rangeLabel(draftData.endpointCount || draftData.devices, 'devices')}</li>
                      <li>Unidades operacionais: {draftData.sites || 1}</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-slate-300">Premissas Referenciais</span>
                      <span className="rounded-full bg-cyan-500/10 text-cyan-400 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider border border-cyan-500/10">
                        Premissa referencial Concierge
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                      <li>Custo operacional horário por colaborador: {money(35)} a {money(65)}/h</li>
                      <li>Reconstrução técnica e suporte externo (estimado): {money(2000)} a {money(6000)}</li>
                      <li>Custo de impacto operacional adicional (riscos / sistemas críticos): {money(draftData.sensitiveData === 'yes' ? 2500 : 1000)} a {money(draftData.sensitiveData === 'yes' ? 7000 : 4000)}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 text-xs text-slate-500 leading-relaxed">
                Esta simulação utiliza informações declaradas pelo cliente e premissas referenciais internas da Concierge para construir uma ordem de grandeza operacional. Os valores não representam previsão de perda, garantia de impacto ou orçamento de recuperação. As premissas devem ser revisadas antes do uso em produção e podem ser ajustadas conforme o contexto do cliente.
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}