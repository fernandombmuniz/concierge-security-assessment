import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadDraft, getSubmission } from '../storage';
import { AssessmentData } from '../types';
import { scoreAssessment, maturityLevel, DomainKey } from '../scoring';
import ScoreGauge from '../components/ScoreGauge';
import DomainBars from '../components/DomainBars';
import ImpactChart from '../components/ImpactChart';
import ClientHeader from '../components/ClientHeader';
import { getValidatedSourceForDomain } from '../sourceRegistry';
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
  TrendingUp,
  HelpCircle
} from 'lucide-react';


const money = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n);

const getOperationalImpact = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('perímetro') || t.includes('firewall')) {
    return 'Uma ameaça pode alcançar a rede interna ou permanecer ativa por mais tempo antes de ser percebida, aumentando a possibilidade de indisponibilidade e necessidade de resposta emergencial.';
  }
  if (t.includes('licenciamento')) {
    return 'Recursos de proteção podem ficar indisponíveis ou desatualizados, reduzindo a capacidade do ambiente de bloquear ameaças conhecidas e novos indicadores de risco.';
  }
  if (t.includes('reativo') || t.includes('acompanhamento')) {
    return 'Um evento relevante pode ser percebido apenas quando já estiver afetando usuários, sistemas ou disponibilidade da operação.';
  }
  if (t.includes('capacidade de detectar') || t.includes('computadores')) {
    return 'Um comportamento malicioso pode permanecer ativo por mais tempo antes de ser identificado, ampliando a possibilidade de parada, comprometimento de informações ou propagação para outros equipamentos.';
  }
  if (t.includes('atualizações') || t.includes('manual')) {
    return 'Falhas já corrigidas pelos fabricantes podem continuar disponíveis nos equipamentos por mais tempo, mantendo uma janela de exposição desnecessária.';
  }
  if (t.includes('privilégios') || t.includes('administrador')) {
    return 'Caso uma conta ou equipamento seja comprometido, privilégios elevados podem aumentar a capacidade de alteração do sistema e o alcance do incidente.';
  }
  if (t.includes('recuperação') || t.includes('frágil') || t.includes('manual')) {
    return 'Uma falha, exclusão acidental ou incidente pode aumentar o tempo necessário para retomar a operação e, em cenários mais graves, comprometer a recuperação de informações.';
  }
  if (t.includes('testada')) {
    return 'A empresa pode descobrir limitações no processo de recuperação somente durante uma situação real, quando o tempo para restabelecer a operação já é crítico.';
  }
  if (t.includes('senha') || t.includes('mfa')) {
    return 'Uma senha comprometida pode ser suficiente para permitir acesso indevido a contas corporativas quando não existe uma etapa adicional de confirmação.';
  }
  if (t.includes('compartilhadas')) {
    return 'A rastreabilidade das ações diminui e a revogação individual de acessos se torna mais difícil em desligamentos ou investigações.';
  }
  if (t.includes('informal') || t.includes('remoção')) {
    return 'Acessos antigos podem permanecer ativos além do necessário, mantendo exposição desnecessária a sistemas e informações corporativas.';
  }
  return 'O cenário pode reduzir a capacidade de prevenção, detecção ou recuperação diante de um incidente e aumentar o impacto operacional.';
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
    { label: 'Rede e Perímetro', value: r.scores.network, icon: <Server size={17} className="text-cyan-400" /> },
    { label: 'Endpoints', value: r.scores.endpoint, icon: <MonitorSmartphone size={17} className="text-cyan-400" /> },
    { label: 'Backup e Continuidade', value: r.scores.backup, icon: <Database size={17} className="text-cyan-400" /> },
    { label: 'Identidade e Acesso', value: r.scores.identity, icon: <KeyRound size={17} className="text-cyan-400" /> }
  ];

  // List of distinct domain names of findings
  const affectedDomains = Array.from(new Set(r.findings.map(f => f.domain)));
  let pointsAttentionText = "Os principais pontos identificados estão relacionados a controles essenciais de segurança.";
  if (affectedDomains.length > 0) {
    const domainLabels = affectedDomains.map(d => {
      if (d === 'Backup e Continuidade') return 'recuperação de dados (Backup)';
      if (d === 'Endpoints') return 'proteção de dispositivos (Endpoints)';
      if (d === 'Rede e Perímetro') return 'proteção de perímetro';
      if (d === 'Identidade e Acesso') return 'gestão de identidades e acesso';
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
    network: 'Proteção de perímetro e rede',
    endpoint: 'Proteção de dispositivos e endpoints',
    backup: 'Capacidade de recuperação da operação',
    identity: 'Gestão de identidades e acessos'
  };

  const priorityReasonText: Record<DomainKey, string> = {
    network: 'A proteção de perímetro informada é básica ou ausente, limitando significativamente a capacidade de identificar e bloquear ameaças que tentam entrar ou se espalhar na rede.',
    endpoint: 'A detecção nos computadores e servidores é predominantemente reativa ou básica, reduzindo a capacidade de identificar comportamentos suspeitos antes que causem impactos.',
    backup: 'As cópias informadas dependem de processo manual ou não possuem automação robusta, o que aumenta a possibilidade de uma falha ser percebida somente quando os dados precisarem ser recuperados.',
    identity: 'A autenticação corporativa depende principalmente de senhas sem múltiplos fatores (MFA) ativos em todas as contas importantes, ampliando o risco de acessos indevidos decorrentes de credenciais vazadas.'
  };

  const priorityFinding = r.findings.find(f => f.domain === r.priorityLabel) || r.findings[0];
  const validatedPrioritySource = priorityFinding ? getValidatedSourceForDomain(priorityFinding.domain) : null;
  const companyLabel = draftData.companyName?.trim() || 'sua empresa';
  const executiveNarrative = r.priority && priorityFinding
    ? `Com base nas respostas fornecidas pela ${companyLabel}, o diagnóstico identificou ${priorityExecName[r.priority].toLowerCase()} como o ponto que mais merece atenção neste momento. ${priorityFinding.situation} ${priorityFinding.consequence} Em termos práticos, ${getOperationalImpact(priorityFinding.title).charAt(0).toLowerCase() + getOperationalImpact(priorityFinding.title).slice(1)}`
    : `Com base nas respostas fornecidas, o diagnóstico organizou os controles informados para mostrar onde existem maiores oportunidades de evolução e quais áreas já apresentam maior maturidade.`;

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
      <div className="mx-auto max-w-5xl">
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
              <h2 className="mt-2 text-2xl font-bold text-white">Relatório de Postura Executiva</h2>
              <p className="mt-1 text-sm text-slate-400">
                A avaliação considera as informações fornecidas sobre rede, dispositivos, continuidade e controle de acesso.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300">
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-teal-400" />
                  Maturidade Geral: {r.level}
                </span>
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                  Setor: {(draftData.sector === 'Outros' ? draftData.sectorOther : draftData.sector) || 'Não informado'}
                </span>
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                  {draftData.users || 0} usuários
                </span>
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                  {draftData.endpointCount || draftData.devices || 0} endpoints
                </span>
                {draftData.servers > 0 && (
                  <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                    {draftData.servers} servidores
                  </span>
                )}
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                  {draftData.sites || 1} unidades
                </span>
                <span className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-1.5">
                  Cobertura do diagnóstico: {r.completeness}%
                </span>
              </div>
            </div>
          </div>


        </section>

        {/* 2. Score Geral e Comparativo */}
        <section className="mt-6 grid gap-6 md:grid-cols-[1fr_1.3fr]">
          <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-bold uppercase tracking-[.16em] text-slate-500 mb-4">Postura de Segurança</h3>
            <ScoreGauge value={r.overall} size={160} />
            <div className="mt-4">
              <div className="text-xl font-bold text-white">{r.level}</div>
              <p className="mt-2 text-xs text-slate-400 max-w-[240px]">
                O resultado representa a maturidade relativa dos controles avaliados com base nas informações fornecidas.
              </p>
            </div>
            <button
              onClick={() => setIsScoreModalOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 transition"
            >
              <HelpCircle size={16} />
              Como chegamos a este score?
            </button>
          </div>

          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <span className="section-kicker">Visão Geral</span>
              <h3 className="mt-1 text-xl font-bold text-white">Maturidade por domínio</h3>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Veja o nível de maturidade em cada uma das quatro áreas de segurança analisadas.
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
              <span className="section-kicker">Leitura do diagnóstico</span>
              <h3 className="mt-1 text-xl font-bold text-white">O que as respostas indicam</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{executiveNarrative}</p>
              {validatedPrioritySource && (
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  Referência complementar validada: {validatedPrioritySource.organization}, {validatedPrioritySource.reportTitle} ({validatedPrioritySource.year}).
                </p>
              )}
            </div>
            <button onClick={() => setIsDiagnosisModalOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 transition">
              <HelpCircle size={16}/> Como chegamos a esta leitura?
            </button>
          </div>
          <div className="mt-5 grid gap-3 border-t border-slate-800/70 pt-5 sm:grid-cols-3">
            <div><div className="text-3xs font-bold uppercase tracking-wider text-slate-500">Postura geral</div><div className="mt-1 font-bold text-slate-100">{r.overall !== null ? `${Math.round(r.overall)}/100 · ${r.level}` : 'Dados insuficientes'}</div></div>
            <div><div className="text-3xs font-bold uppercase tracking-wider text-slate-500">Maior atenção</div><div className="mt-1 font-bold text-amber-300">{r.priority ? priorityExecName[r.priority] : 'Aguardando dados'}</div></div>
            <div><div className="text-3xs font-bold uppercase tracking-wider text-slate-500">Cobertura das respostas</div><div className="mt-1 font-bold text-slate-100">{Math.round(r.completeness)}%</div></div>
          </div>
        </section>

        {/* 4. Principais Pontos de Atenção */}
        <section className="glass-card mt-6 p-6">
          <span className="section-kicker">Diagnóstico Executivo</span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><h3 className="mt-1 text-xl font-bold text-white">Principais pontos de atenção</h3><button onClick={() => setIsDiagnosisModalOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-400 hover:text-teal-300 transition"><HelpCircle size={16}/> Como identificamos estes pontos?</button></div>
          <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-slate-800 bg-slate-950/20 p-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="text-amber-300" size={24} />
            </div>
            <div>
              <div className="text-base font-bold text-slate-200">
                {r.findings.length} pontos requerem maior atenção
              </div>
              <p className="text-sm text-slate-400 mt-1">
                A leitura abaixo organiza os achados pela capacidade que eles podem afetar na operação. {pointsAttentionText} A prioridade considera a menor maturidade relativa entre os controles que puderam ser avaliados.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Prioridade Principal */}
        {r.priority && (
          <section className="glass-card mt-6 p-6 border-l-4 border-l-amber-500/60">
            <span className="text-xs font-bold uppercase tracking-[.16em] text-amber-400">O ponto que mais merece atenção</span>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {priorityExecName[r.priority]}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {priorityReasonText[r.priority]}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3.5 py-1.5 text-xs text-slate-400 font-semibold">
              <span>Nível do domínio:</span>
              <span className="text-amber-300 font-bold">{r.priorityLabel} ({r.scores[r.priority]}/100)</span>
            </div>
          </section>
        )}

        {/* 5. Lista de Achados */}
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <span className="section-kicker">Leitura executiva e técnica</span>
              <h3 className="text-2xl font-bold text-white">Detalhamento dos pontos de atenção</h3>
            </div>
            <span className="text-sm text-slate-500">{r.findings.length} achado(s)</span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {r.findings.map(f => {
              const mkt = getValidatedSourceForDomain(f.domain);
              const opImpact = getOperationalImpact(f.title);

              return (
                <article key={`${f.domain}-${f.title}`} className="glass-card p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        <AlertTriangle size={15} className="text-amber-400" />
                        {f.domain}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                        f.severity === 'Alta' ? 'bg-rose-950/40 text-rose-300 border border-rose-900/30' : 
                        f.severity === 'Média' ? 'bg-amber-950/40 text-amber-300 border border-amber-900/30' : 
                        'bg-emerald-950/40 text-emerald-300 border border-emerald-900/30'
                      }`}>
                        {f.severity}
                      </span>
                    </div>

                    <h4 className="mt-4 text-lg font-bold text-slate-100 leading-snug">{f.title}</h4>

                    <div className="mt-5 space-y-4 text-xs leading-relaxed">
                      <div>
                        <div className="font-bold uppercase tracking-wider text-slate-500 text-3xs">Situação encontrada</div>
                        <p className="mt-1 text-slate-300">{f.situation}</p>
                      </div>

                      <div>
                        <div className="font-bold uppercase tracking-wider text-slate-500 text-3xs">Por que merece atenção</div>
                        <p className="mt-1 text-slate-300">{f.consequence}</p>
                      </div>

                      <div>
                        <div className="font-bold uppercase tracking-wider text-slate-500 text-3xs">Possível impacto para a empresa</div>
                        <p className="mt-1 text-slate-300">{opImpact}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 pt-4 border-t border-slate-800/60">
                    <div className="rounded-lg bg-slate-950/35 border border-slate-900 px-3 py-2 text-3xs text-slate-400">
                      <b className="text-slate-300 block mb-0.5">Ponto técnico avaliado:</b>
                      {f.technical}
                    </div>

                    {mkt && (
                      <div className="rounded-lg bg-teal-950/5 border border-teal-900/10 px-3 py-2.5 text-3xs text-slate-400">
                        <b className="text-teal-400 block font-semibold mb-0.5">Por que estamos destacando isso?</b>
                        <p className="text-slate-300 italic mb-1">"{mkt.statement}"</p>
                        <span className="text-slate-500">
                          Fonte: {mkt.organization} · {mkt.reportTitle} ({mkt.year})
                        </span>
                      </div>
                    )}
                  </div>
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
              <h3 className="mt-1 text-xl font-bold text-white">Simulação de impacto de uma indisponibilidade</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Faixa ilustrativa calculada a partir das informações fornecidas neste diagnóstico e de premissas referenciais internas para pequenas e médias empresas.
              </p>
              <div className="mt-6 text-3xl font-extrabold text-white">
                {money(r.impactRange[0])} <span className="text-base font-normal text-slate-500">a</span> {money(r.impactRange[1])}
              </div>
              <div className="mt-2 text-2xs text-slate-500">
                Este valor representa uma ordem de grandeza para apoiar a análise e não uma previsão de perda.
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
                Origem e detalhamento dos componentes da simulação financeira.
              </p>
            </div>
            <div className="flex-grow flex flex-col justify-center">
              <ImpactChart components={r.impactComponents} />
            </div>
          </div>
        </section>

        {/* 7. Caminho de Evolução */}
        <section className="glass-card mt-6 p-6">
          <span className="section-kicker">Plano de Ação</span>
          <h3 className="mt-1 text-xl font-bold text-white">Caminho de evolução</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Priorização recomendada para evolução dos controles com base nas fragilidades identificadas.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {immediatePriority && (
              <div className="rounded-xl border border-amber-900/20 bg-amber-950/5 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-3xs font-bold uppercase tracking-wider text-amber-400 block">1. Prioridade de atenção</span>
                  <h4 className="mt-2 font-bold text-slate-100 text-sm">{immediatePriority.label}</h4>
                  <p className="text-2xs text-slate-400 mt-1">
                    Área com menor maturidade relativa entre os controles avaliados. Merece validação e atenção inicial.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-amber-300">
                  Score: {immediatePriority.score}/100
                </div>
              </div>
            )}

            {nextOpportunity && (
              <div className="rounded-xl border border-cyan-900/10 bg-cyan-950/5 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-3xs font-bold uppercase tracking-wider text-cyan-400 block">2. Segundo ponto de atenção</span>
                  <h4 className="mt-2 font-bold text-slate-100 text-sm">{nextOpportunity.label}</h4>
                  <p className="text-2xs text-slate-400 mt-1">
                    Segundo domínio com menor maturidade relativa. Pode ser considerado na sequência da evolução dos controles.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-cyan-300">
                  Score: {nextOpportunity.score}/100
                </div>
              </div>
            )}

            {mostMature && (
              <div className="rounded-xl border border-emerald-900/15 bg-emerald-950/5 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-3xs font-bold uppercase tracking-wider text-emerald-400 block">3. Controle com maior maturidade</span>
                  <h4 className="mt-2 font-bold text-slate-100 text-sm">{mostMature.label}</h4>
                  <p className="text-2xs text-slate-400 mt-1">
                    Domínio com maior maturidade relativa no cenário informado. Manter e revisar periodicamente as práticas existentes.
                  </p>
                </div>
                <div className="mt-4 text-xs font-bold text-emerald-300">
                  Score: {mostMature.score}/100
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
                Os resultados serão analisados pela equipe Concierge para validar o contexto informado e identificar quais pontos merecem aprofundamento.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Modal: Como chegamos à leitura executiva? */}
      {isDiagnosisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 relative">
            <button onClick={() => setIsDiagnosisModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition"><X size={20}/></button>
            <h3 className="text-xl font-bold text-white">Como chegamos a esta leitura?</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">A narrativa executiva não cria um diagnóstico separado do score. Ela traduz para linguagem de negócio os mesmos controles avaliados pelo Assessment.</p>
            <div className="mt-6 space-y-4 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><b className="text-slate-100">1. Respostas fornecidas</b><p className="mt-1 text-slate-400">Consideramos apenas as informações declaradas no onboarding. Respostas “Não sei informar” reduzem a cobertura do diagnóstico e não são tratadas automaticamente como falha.</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><b className="text-slate-100">2. Controles avaliados</b><p className="mt-1 text-slate-400">As respostas são relacionadas a controles de Rede e Perímetro, Endpoints, Backup e Continuidade e Identidade e Acesso. Cada domínio recebe uma maturidade relativa de acordo com os controles informados.</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><b className="text-slate-100">3. Priorização</b><p className="mt-1 text-slate-400">O domínio com menor maturidade entre os avaliados recebe destaque inicial. Os achados explicam a situação encontrada, por que ela merece atenção e qual impacto operacional pode estar associado.</p></div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4"><b className="text-slate-100">4. Referências</b><p className="mt-1 text-slate-400">Frameworks como NIST CSF e CIS Controls orientam as capacidades avaliadas. Estatísticas de mercado só são exibidas quando previamente cadastradas e validadas na biblioteca de evidências do produto. Os pesos e faixas de score pertencem ao modelo interno Concierge.</p></div>
              <p className="border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">Este material é um diagnóstico inicial, comercial e executivo. Ele não substitui validação técnica, auditoria, teste de segurança, laudo pericial ou parecer jurídico.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Como chegamos a este score? */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 relative">
            <button
              onClick={() => setIsScoreModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-white">Metodologia do Diagnóstico</h3>
            <p className="mt-2 text-sm text-slate-400">
              Entenda os controles avaliados, os pesos do modelo e como as respostas fornecidas compõem a postura de segurança.
            </p>

            <div className="mt-6 space-y-5 text-sm text-slate-300">
              <div>
                <h4 className="font-semibold text-slate-200">Cálculo e Normalização</h4>
                <p className="mt-1 leading-relaxed">
                  O resultado consolidado considera apenas os controles que puderam ser avaliados pelas respostas fornecidas.
                  Respostas <b>"Não sei informar"</b> não são tratadas como falha ou penalidade. Elas reduzem a cobertura total do diagnóstico daquele controle, de forma a não distorcer o resultado com falsas hipóteses.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">Pesos e Controles Considerados</h4>
                <ul className="mt-2 space-y-1 text-xs list-disc list-inside text-slate-400">
                  <li><b>Rede:</b> Nível do Firewall (60%), Licenciamento (15%), Monitoramento (25%)</li>
                  <li><b>Endpoints:</b> Nível da tecnologia (70%), Atualização automática (15%), Privilégios locais (10%), Dispositivos pessoais/BYOD (5%)</li>
                  <li><b>Continuidade:</b> Nível do backup (75%), Frequência de testes (25%)</li>
                  <li><b>Acessos:</b> MFA em contas críticas (50%), Contas compartilhadas (25%), Processo de offboarding (25%)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200">Classificação de Maturidade</h4>
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
                  Este assessment utiliza informações declaradas e oferece uma avaliação inicial de postura. Não constitui auditoria, teste técnico, laudo pericial ou parecer jurídico.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Como estimamos essa faixa? */}
      {isFaixaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
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
                      <li>Pessoas (usuários informados): {draftData.users || 10}</li>
                      <li>Horas de Parada (baseadas no tempo tolerável): {r.impactAssumptions.hours}h</li>
                      <li>Endpoints a proteger: {draftData.endpointCount || draftData.devices || 0}</li>
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