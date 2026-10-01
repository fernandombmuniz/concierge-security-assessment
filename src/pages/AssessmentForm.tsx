import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  Info,
  KeyRound,
  Loader2,
  MonitorSmartphone,
  Wifi,
} from 'lucide-react';
import type {
  AfterHoursResponseLevel,
  AssessmentData,
  BackupResponsibilityLevel,
  EndpointManagementModel,
  FirewallManagementLevel,
  OperationalImpactLevel,
  SecurityOperationsModel,
} from '../types';
import { loadDraft, saveDraft, saveSubmission } from '../storage';
import { completeAssessment, saveAssessmentProgress } from '../lib/assessment.functions';
import { loadSession } from '../lib/assessment-session';
import { ConciergeBrandLockup, TechnicalShell } from '../components/ExecutiveVisual';

const input =
  'w-full rounded-xl border border-slate-700/80 bg-[#050d1b]/85 px-4 py-3.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10';
const select = input;

const Card = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[26px] border border-cyan-300/[0.10] bg-[#081426]/78 p-5 shadow-[0_20px_65px_rgba(0,0,0,.24)] backdrop-blur-md md:p-7">
    {children}
  </div>
);

const Field = ({ label, help, children }: { label: string; help?: string; children: ReactNode }) => (
  <label className="block min-w-0">
    <span className="block text-sm font-semibold leading-5 text-slate-100">{label}</span>
    {help && <span className="mt-1 block text-xs leading-5 text-slate-500">{help}</span>}
    <div className="mt-2.5">{children}</div>
  </label>
);

const QuestionPair = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-5 md:grid-cols-2">{children}</div>
);

const Section = ({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children: ReactNode }) => (
  <section className="rounded-[22px] border border-cyan-300/[0.09] bg-[#061121]/58 p-5 md:p-6">
    <div className="border-b border-cyan-300/[0.08] pb-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</div>
      <h3 className="mt-1.5 text-xl font-bold text-white">{title}</h3>
      {description && <p className="mt-1.5 text-sm leading-6 text-slate-400">{description}</p>}
    </div>
    <div className="mt-5 space-y-6">{children}</div>
  </section>
);

const choiceClass = (selected: boolean) =>
  `w-full rounded-xl border px-4 py-3 text-left text-sm leading-5 transition ${
    selected
      ? 'border-cyan-400/55 bg-cyan-500/10 text-white shadow-[0_0_0_1px_rgba(34,211,238,.06),0_0_20px_rgba(34,211,238,.04)]'
      : 'border-slate-800 bg-slate-950/45 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
  }`;

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={choiceClass(selected)} aria-pressed={selected}>
      <span className="flex items-start gap-3">
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-cyan-300 bg-cyan-500/15' : 'border-slate-700'}`}>
          {selected && <span className="h-2 w-2 rounded-full bg-cyan-300" />}
        </span>
        <span>{children}</span>
      </span>
    </button>
  );
}

const ChoiceGrid = ({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) => (
  <div className={`grid gap-2.5 ${cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>{children}</div>
);

const backupBucket = (n: number) =>
  !n ? 0 : n <= 100 ? 50 : n <= 500 ? 300 : n <= 1000 ? 750 : n <= 5000 ? 3000 : 7500;

export default function AssessmentForm() {
  const nav = useNavigate();
  const [accessReady, setAccessReady] = useState(false);
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('concierge-client-assessment-step-v2');
    return saved ? Math.min(4, Math.max(0, parseInt(saved, 10) || 0)) : 0;
  });
  const [a, setA] = useState<AssessmentData>(() => loadDraft());
  const [panel, setPanel] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      nav('/', { replace: true });
      return;
    }
    setAccessReady(true);
  }, [nav]);

  const set = <K extends keyof AssessmentData>(key: K, value: AssessmentData[K]) => {
    setA((current) => ({ ...current, [key]: value }));
  };

  const setComputers = (value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    setA((current) => ({ ...current, endpointCount: safe, devices: safe, users: safe }));
  };

  const setLinkSpeed = (index: number, value: number) => {
    setA((current) => {
      const links = [...current.links];
      while (links.length <= index) links.push({ speedMbps: 0 });
      links[index] = { speedMbps: Number.isFinite(value) ? Math.max(0, value) : 0 };
      return { ...current, links };
    });
  };

  const setLinkCount = (value: number) => {
    const count = Math.max(1, Math.min(5, Number.isFinite(value) ? value : 1));
    setA((current) => {
      const links = [...current.links];
      while (links.length < count) links.push({ speedMbps: 0 });
      return { ...current, internetLinkCount: count, links: links.slice(0, count) };
    });
  };

  const setFirewallLevel = (value: AssessmentData['firewallLevel']) => {
    const inferredThreat: AssessmentData['firewallThreatPrevention'] =
      value === 'none' || value === 'isp'
        ? 'no'
        : value === 'router' || value === 'utm'
          ? 'partial'
          : value === 'ngfw' || value === 'managed_ngfw'
            ? 'yes'
            : 'unknown';

    setA((current) => ({
      ...current,
      firewallLevel: value,
      firewallThreatPrevention: inferredThreat,
      firewallVendor:
        value === 'router'
          ? 'MikroTik / roteador corporativo'
          : value === 'utm'
            ? 'Firewall open source'
            : value === 'isp'
              ? 'Operadora'
              : value === 'none'
                ? ''
                : current.firewallVendor,
    }));
  };

  useEffect(() => {
    localStorage.setItem('concierge-client-assessment-step-v2', String(step));
  }, [step]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveDraft(a), 300);
    return () => window.clearTimeout(timer);
  }, [a]);

  const snapshot = JSON.stringify(a);
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    const timer = window.setTimeout(() => {
      void saveAssessmentProgress({
        data: {
          assessmentId: session.assessmentId,
          editToken: session.editToken,
          step,
          data: JSON.parse(snapshot),
        },
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [snapshot, step]);

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const startedAt = performance.now();
    const session = loadSession();
    saveDraft(a);

    if (!session) {
      alert('Não encontramos a sessão deste diagnóstico. Suas respostas continuam salvas neste dispositivo.');
      setIsSubmitting(false);
      return;
    }

    try {
      await completeAssessment({
        data: {
          assessmentId: session.assessmentId,
          editToken: session.editToken,
          data: a,
        },
      });

      const remaining = Math.max(0, 950 - (performance.now() - startedAt));
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

      const submission = saveSubmission(a);
      nav(`/resultado?id=${submission.id}&success=true`);
    } catch (error) {
      console.error('Falha ao concluir assessment:', error);
      alert('Não foi possível enviar o diagnóstico neste momento. Suas respostas continuam salvas neste dispositivo.');
      setIsSubmitting(false);
    }
  };

  const steps = useMemo(
    () => [
      { name: 'Empresa', icon: Building2, desc: 'Contexto e capacidade da equipe' },
      { name: 'Internet e rede', icon: Wifi, desc: 'Proteção, visibilidade e acesso' },
      { name: 'Computadores', icon: MonitorSmartphone, desc: 'Proteção, alertas e vulnerabilidades' },
      { name: 'Dados e backup', icon: Database, desc: 'Recuperação e continuidade' },
      { name: 'Contas e resposta', icon: KeyRound, desc: 'Identidade, IA e incidentes' },
    ],
    [],
  );

  const current = steps[step];
  const hasEndpointProtection = !['unknown', 'none'].includes(a.endpointLevel);
  const hasBackup = !['unknown', 'none'].includes(a.backupLevel);

  const panelCounts = [3, 2, 1, 1, 3] as const;
  const panelCount = panelCounts[step];

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [step, panel]);

  const canAdvancePanel =
    step !== 0 ||
    panel === 2 ||
    (panel === 0
      ? Boolean(a.companyName.trim() && a.contactName.trim() && a.contactEmail.trim())
      : Boolean((a.endpointCount || a.devices) > 0 && a.sites > 0));

  const goBack = () => {
    if (isSubmitting) return;
    if (panel > 0) {
      setPanel((current) => current - 1);
    } else if (step > 0) {
      const previousStep = step - 1;
      setStep(previousStep);
      setPanel(panelCounts[previousStep] - 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goForward = () => {
    if (isSubmitting || !canAdvancePanel) return;
    if (panel < panelCount - 1) {
      setPanel((current) => current + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (step < steps.length - 1) {
      setStep((currentStep) => currentStep + 1);
      setPanel(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!accessReady) {
    return <main className="min-h-screen bg-[#07101f]" />;
  }

  return (
    <TechnicalShell>
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-cyan-300/[0.10] bg-[#081426]/68 px-4 py-3 backdrop-blur-md sm:px-5">
        <ConciergeBrandLockup compact />
        <div className="w-full max-w-[220px]">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>{current.name}</span>
            <span>Etapa {step + 1} de {steps.length}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <Card>
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-cyan-300/[0.08] pb-5 sm:flex-row sm:items-start">
          <div className="flex gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-400/20 bg-cyan-500/10">
              <current.icon size={21} className="text-cyan-300" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">Etapa {step + 1} de 5</div>
              <h1 className="mt-1 text-2xl font-bold text-white">{current.name}</h1>
              <p className="mt-1 text-sm text-slate-400">{current.desc}. “Não sei informar” continua sendo uma resposta válida.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-1.5 text-xs text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            Respostas salvas automaticamente
          </div>
        </div>

        {step === 0 && (
          <>
            {panel === 0 && (
              <Section eyebrow="Contato" title="Quem está preenchendo este diagnóstico?" description="Só os dados necessários para identificar a empresa e manter o contexto da conversa.">
                <QuestionPair>
                  <Field label="Nome da empresa"><input className={input} value={a.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="Digite o nome da empresa" /></Field>
                  <Field label="Seu nome"><input className={input} value={a.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Digite seu nome" /></Field>
                </QuestionPair>
                <QuestionPair>
                  <Field label="Cargo"><input className={input} value={a.contactRole} onChange={(e) => set('contactRole', e.target.value)} placeholder="Ex.: Analista de TI" /></Field>
                  <Field label="E-mail"><input className={input} type="email" value={a.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="nome@empresa.com.br" /></Field>
                </QuestionPair>
              </Section>
            )}

            {panel === 1 && (
              <Section eyebrow="Tamanho do ambiente" title="Qual é a escala do ambiente que estamos avaliando?" description="Use números aproximados se não tiver o inventário exato agora.">
                <QuestionPair>
                  <Field label="Computadores e notebooks"><input className={input} type="number" min="1" value={a.endpointCount || a.devices || ''} onChange={(e) => setComputers(Number(e.target.value))} placeholder="Ex.: 50" /></Field>
                  <Field label="Unidades ou filiais"><input className={input} type="number" min="1" value={a.sites || 1} onChange={(e) => set('sites', Math.max(1, Number(e.target.value) || 1))} /></Field>
                </QuestionPair>
                <Field label="Quantas pessoas compõem a equipe interna de TI?" help="Aqui a faixa ajuda a entender a capacidade disponível sem exigir um organograma detalhado.">
                  <ChoiceGrid cols={3}>
                    {[[0, 'Não há equipe interna / não sei'], [1, '1 pessoa'], [3, '2 a 5 pessoas'], [6, 'Mais de 5 pessoas']].map(([value, label]) => (
                      <Choice key={String(value)} selected={a.itTeamSize === value || (value === 3 && a.itTeamSize >= 2 && a.itTeamSize <= 5) || (value === 6 && a.itTeamSize > 5)} onClick={() => set('itTeamSize', Number(value))}>{label}</Choice>
                    ))}
                  </ChoiceGrid>
                </Field>
              </Section>
            )}

            {panel === 2 && (
              <Section eyebrow="Capacidade operacional" title="Como a segurança cabe na rotina da TI?" description="Isso ajuda a diferenciar ferramenta instalada de capacidade real de acompanhar segurança.">
                <Field label="Na prática, como a segurança entra na rotina da equipe de TI?">
                  <ChoiceGrid>
                    {([['dedicated', 'Há pessoa ou equipe com foco dedicado em segurança'], ['scheduled', 'A TI reserva tempo regularmente para segurança'], ['generalist_overloaded', 'A mesma equipe acumula suporte, infraestrutura e segurança'], ['reactive', 'Segurança costuma ser tratada quando aparece um problema'], ['managed_support', 'Um fornecedor especializado apoia ou opera a segurança'], ['unknown', 'Não sei informar']] as Array<[SecurityOperationsModel, string]>).map(([value, label]) => (
                      <Choice key={value} selected={a.securityOperationsModel === value} onClick={() => set('securityOperationsModel', value)}>{label}</Choice>
                    ))}
                  </ChoiceGrid>
                </Field>
              </Section>
            )}
          </>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {panel === 0 && <Section
              eyebrow="Proteção da internet"
              title="Primeiro, identifique a camada de proteção que existe hoje"
              description="Uma pergunta sobre tecnologia e poucas perguntas sobre operação. Sem repetir fabricante, categoria e capacidade em campos diferentes."
            >
              <Field label="Como a empresa protege hoje a conexão com a internet?">
                <ChoiceGrid>
                  {([
                    ['isp', 'Apenas o roteador/equipamento da operadora'],
                    ['router', 'MikroTik ou outro roteador corporativo'],
                    ['utm', 'Firewall open source, como pfSense ou OPNsense'],
                    ['ngfw', 'Firewall corporativo NGFW, como Fortinet, SonicWall ou Sophos'],
                    ['managed_ngfw', 'Firewall gerenciado por equipe ou serviço especializado'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['firewallLevel'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.firewallLevel === value} onClick={() => setFirewallLevel(value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="Modelo ou solução, se souber" help="Um único campo basta. Ex.: FortiGate 50G, SonicWall TZ280, RB4011, pfSense.">
                <input className={input} value={a.firewallModel} onChange={(e) => set('firewallModel', e.target.value)} placeholder="Opcional" />
              </Field>

              <Field label="Quem administra essa proteção?">
                <ChoiceGrid>
                  {([
                    ['internal', 'Equipe interna'],
                    ['outsourced', 'Empresa terceirizada'],
                    ['shared', 'Equipe interna + terceirizada'],
                    ['isp', 'Operadora'],
                    ['unmanaged', 'Ninguém claramente responsável'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[FirewallManagementLevel, string]>).map(([value, label]) => (
                    <Choice key={value} selected={(a.firewallManagement ?? 'unknown') === value} onClick={() => set('firewallManagement', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="Quando aparece um evento ou alerta importante da rede, o que normalmente acontece?">
                <ChoiceGrid>
                  {([
                    ['soc', 'Há acompanhamento contínuo e resposta'],
                    ['security_team', 'Uma equipe especializada revisa os alertas'],
                    ['outsourced_it', 'Uma empresa terceirizada acompanha'],
                    ['reactive_it', 'A TI verifica quando consegue ou quando surge um problema'],
                    ['none', 'Ninguém acompanha regularmente'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['monitoring'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.monitoring === value} onClick={() => set('monitoring', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>
            </Section>}

            {panel === 1 && <Section eyebrow="Conectividade" title="Dados que ajudam no pré-dimensionamento" description="Aqui entram apenas informações que realmente ajudam a dimensionar e entender a exposição da rede.">
              <QuestionPair>
                <Field label="Quantos links de internet existem?">
                  <input className={input} type="number" min="1" max="5" value={a.internetLinkCount} onChange={(e) => setLinkCount(Number(e.target.value))} />
                </Field>
                <Field label="Velocidade do link principal" help="Informe em Mbps.">
                  <div className="relative">
                    <input className={`${input} pr-16`} type="number" min="0" value={a.links?.[0]?.speedMbps || ''} onChange={(e) => setLinkSpeed(0, Number(e.target.value))} placeholder="Ex.: 500" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">Mbps</span>
                  </div>
                </Field>
              </QuestionPair>

              {a.internetLinkCount > 1 && (
                <Field label="Velocidade do segundo link" help="Os demais links podem ser detalhados na conversa técnica.">
                  <div className="relative max-w-md">
                    <input className={`${input} pr-16`} type="number" min="0" value={a.links?.[1]?.speedMbps || ''} onChange={(e) => setLinkSpeed(1, Number(e.target.value))} placeholder="Ex.: 300" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">Mbps</span>
                  </div>
                </Field>
              )}

              <Field label="Há pessoas acessando sistemas da empresa de fora da rede?">
                <ChoiceGrid cols={3}>
                  {([
                    ['yes', 'Sim'],
                    ['no', 'Não'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['vpnUsage'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.vpnUsage === value} onClick={() => set('vpnUsage', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              {a.vpnUsage === 'yes' && (
                <Field label="Aproximadamente quantas pessoas usam esse acesso remoto?">
                  <input className={`${input} max-w-md`} type="number" min="0" value={a.vpnRemote || ''} onChange={(e) => set('vpnRemote', Number(e.target.value))} placeholder="Ex.: 15" />
                </Field>
              )}

              {a.sites > 1 && (
                <Field label="Quantas conexões entre unidades existem?" help="Considere VPNs site-to-site ou conexões equivalentes.">
                  <input className={`${input} max-w-md`} type="number" min="0" value={a.vpnSite || ''} onChange={(e) => set('vpnSite', Number(e.target.value))} />
                </Field>
              )}

              <Field label="A rede é separada entre funcionários, visitantes, servidores ou outros usos?">
                <ChoiceGrid>
                  {[
                    ['yes', 'Sim, existe segmentação clara'],
                    ['partial', 'Parcialmente'],
                    ['no', 'Não'],
                    ['unknown', 'Não sei informar'],
                  ].map(([value, label]) => {
                    const current = a.vlans === 0 ? 'unknown' : a.vlans === 1 ? 'no' : a.vlans === 2 ? 'partial' : 'yes';
                    return <Choice key={value} selected={current === value} onClick={() => set('vlans', value === 'yes' ? 3 : value === 'partial' ? 2 : value === 'no' ? 1 : 0)}>{label}</Choice>;
                  })}
                </ChoiceGrid>
              </Field>
            </Section>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Section
              eyebrow="Proteção dos computadores"
              title="O que existe e o que acontece quando aparece um alerta"
              description={`${a.endpointCount || a.devices || 'Quantidade não informada'} computadores/notebooks foram informados no início. Não vamos perguntar isso novamente.`}
            >
              <Field label="Qual cenário mais se aproxima da proteção atual dos computadores?" help="Queremos entender o tipo de proteção, sem exigir que você saiba a licença exata.">
                <ChoiceGrid>
                  {([
                    ['none', 'Não existe uma proteção padronizada'],
                    ['basic_av', 'Antivírus básico ou proteção nativa'],
                    ['business_av', 'Antivírus corporativo com gestão central'],
                    ['edr', 'EDR ou proteção que também ajuda a investigar ameaças'],
                    ['managed_edr', 'Proteção acompanhada por equipe especializada'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['endpointLevel'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.endpointLevel === value} onClick={() => set('endpointLevel', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              {hasEndpointProtection && (
                <>
                  <Field label="Qual solução é utilizada, se souber?" help="Ex.: Microsoft Defender, Kaspersky, Bitdefender, Trend Micro, Sophos ou outra solução.">
                    <input className={input} value={a.endpointProduct || ''} onChange={(e) => set('endpointProduct', e.target.value)} placeholder="Digite o nome da solução" />
                  </Field>

                  <Field label="Como essa proteção é administrada hoje?">
                    <ChoiceGrid>
                      {([
                        ['individual', 'Em cada computador individualmente'],
                        ['central_internal', 'Em painel central pela equipe de TI'],
                        ['central_partner', 'Em painel central por empresa terceirizada'],
                        ['unknown', 'Não sei informar'],
                      ] as Array<[EndpointManagementModel, string]>).map(([value, label]) => (
                        <Choice key={value} selected={(a.endpointManagementModel ?? 'unknown') === value} onClick={() => set('endpointManagementModel', value)}>{label}</Choice>
                      ))}
                    </ChoiceGrid>
                  </Field>

                  <Field label="Quando aparece um alerta importante, o que normalmente acontece?">
                    <ChoiceGrid>
                      {([
                        ['managed_soc', 'Uma equipe acompanha e atua continuamente'],
                        ['defined_team', 'A TI verifica os alertas regularmente'],
                        ['alerts_only', 'A TI verifica quando consegue ou quando surge um problema'],
                        ['none', 'Não existe acompanhamento definido'],
                        ['unknown', 'Não sei informar'],
                      ] as Array<[AssessmentData['endpointResponse'], string]>).map(([value, label]) => (
                        <Choice key={value} selected={a.endpointResponse === value} onClick={() => set('endpointResponse', value)}>{label}</Choice>
                      ))}
                    </ChoiceGrid>
                  </Field>
                </>
              )}
            </Section>

            <Section eyebrow="Visibilidade e exposição" title="A empresa sabe o que precisa proteger e o que precisa corrigir?" description="Inventário e vulnerabilidades ajudam a mostrar se a equipe enxerga o ambiente além dos alertas do antivírus ou EDR.">
              <Field label="O inventário de computadores e servidores está atualizado?">
                <ChoiceGrid>
                  {([
                    ['managed', 'Sim, atualizado e gerenciado'],
                    ['partial', 'Existe, mas pode estar incompleto'],
                    ['informal', 'Existe um controle informal'],
                    ['none', 'Não existe um inventário claro'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['assetInventory'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.assetInventory === value} onClick={() => set('assetInventory', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="Existe uma rotina para identificar vulnerabilidades e correções pendentes?">
                <ChoiceGrid>
                  {([
                    ['continuous', 'Sim, continuamente'],
                    ['regular', 'Sim, em uma rotina periódica'],
                    ['occasional', 'Ocasionalmente'],
                    ['reactive', 'Normalmente quando surge um problema'],
                    ['none', 'Não existe uma rotina definida'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['vulnerabilityManagement'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.vulnerabilityManagement === value} onClick={() => set('vulnerabilityManagement', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="Quantos servidores próprios ou virtuais a empresa administra?" help="Digite a quantidade real. Se não houver, informe 0.">
                <input className={`${input} max-w-md`} type="number" min="0" value={a.servers || ''} onChange={(e) => set('servers', Number(e.target.value))} placeholder="Ex.: 4" />
              </Field>
            </Section>
          </div>
        )}

        {step === 3 && (
          <Section eyebrow="Continuidade" title="Se algo der errado, quão preparada está a recuperação?" description="Backup só ganha maturidade quando há responsabilidade, separação e recuperação validada.">
            <Field label="Onde ficam os dados mais importantes da empresa?">
              <select className={select} value={a.dataLocation} onChange={(e) => set('dataLocation', e.target.value as AssessmentData['dataLocation'])}>
                <option value="unknown">Não sei informar</option>
                <option value="corporate_central">Ambiente corporativo centralizado</option>
                <option value="saas_only">Principalmente em aplicações/SaaS na nuvem</option>
                <option value="mixed">Distribuídos entre nuvem, servidores e computadores</option>
                <option value="endpoints">Principalmente nos computadores</option>
                <option value="personal_cloud">Há dados em contas ou locais não administrados pela empresa</option>
              </select>
            </Field>

            <Field label="Como as cópias de segurança funcionam hoje?">
              <ChoiceGrid>
                {([
                  ['none', 'Não existe uma rotina definida'],
                  ['manual', 'Existem cópias manuais'],
                  ['automated_local', 'Cópia automática dentro da empresa'],
                  ['cloud', 'Cópia automática em nuvem'],
                  ['multi_copy', 'Existem cópias em mais de um local'],
                  ['managed', 'Existe uma rotina gerenciada e acompanhada'],
                  ['unknown', 'Não sei informar'],
                ] as Array<[AssessmentData['backupLevel'], string]>).map(([value, label]) => (
                  <Choice key={value} selected={a.backupLevel === value} onClick={() => set('backupLevel', value)}>{label}</Choice>
                ))}
              </ChoiceGrid>
            </Field>

            <Field label="Volume aproximado que precisa ser protegido">
              <ChoiceGrid cols={3}>
                {([
                  [0, 'Não sei informar'],
                  [50, 'Até 100 GB'],
                  [300, '100 a 500 GB'],
                  [750, '500 GB a 1 TB'],
                  [3000, '1 a 5 TB'],
                  [7500, 'Mais de 5 TB'],
                ] as Array<[number, string]>).map(([value, label]) => (
                  <Choice key={String(value)} selected={backupBucket(a.backupVolumeGb) === value} onClick={() => set('backupVolumeGb', value)}>{label}</Choice>
                ))}
              </ChoiceGrid>
            </Field>

            <Field label="Por quanto tempo a empresa tolera ficar sem os sistemas ou dados principais?">
              <ChoiceGrid cols={3}>
                {([
                  ['4h', 'Até 4 horas'],
                  ['8h', 'Até 8 horas'],
                  ['1d', 'Até 1 dia'],
                  ['2d', 'Até 2 dias'],
                  ['more', 'Mais de 2 dias'],
                  ['unknown', 'Não sei informar'],
                ] as Array<[AssessmentData['maxDowntime'], string]>).map(([value, label]) => (
                  <Choice key={value} selected={a.maxDowntime === value} onClick={() => set('maxDowntime', value)}>{label}</Choice>
                ))}
              </ChoiceGrid>
            </Field>

            {hasBackup && (
              <>
                <Field label="Quem é responsável por garantir que o backup funcione?">
                  <ChoiceGrid>
                    {([
                      ['internal', 'Equipe interna'],
                      ['outsourced', 'Empresa terceirizada'],
                      ['shared', 'Responsabilidade compartilhada'],
                      ['nobody', 'Ninguém claramente responsável'],
                      ['unknown', 'Não sei informar'],
                    ] as Array<[BackupResponsibilityLevel, string]>).map(([value, label]) => (
                      <Choice key={value} selected={(a.backupResponsibility ?? 'unknown') === value} onClick={() => set('backupResponsibility', value)}>{label}</Choice>
                    ))}
                  </ChoiceGrid>
                </Field>

                <QuestionPair>
                  <Field label="Existe uma cópia de backup separada do ambiente principal?" help="Queremos saber se uma falha, ataque ou problema no ambiente principal também poderia atingir a cópia.">
                    <ChoiceGrid>
                      {([
                        ['isolated', 'Sim, em outro ambiente ou nuvem'],
                        ['immutable', 'Sim, offline, isolada ou protegida contra alteração'],
                        ['same_environment', 'Existe cópia, mas depende do mesmo ambiente ou das mesmas credenciais'],
                        ['none', 'Não existe uma cópia separada'],
                        ['unknown', 'Não sei informar'],
                      ] as Array<[AssessmentData['backupIsolation'], string]>).map(([value, label]) => (
                        <Choice key={value} selected={a.backupIsolation === value} onClick={() => set('backupIsolation', value)}>{label}</Choice>
                      ))}
                    </ChoiceGrid>
                  </Field>
                  <Field label="A empresa já testou recuperar arquivos ou sistemas a partir do backup?">
                    <ChoiceGrid>
                      {([
                        ['regular', 'Sim, periodicamente'],
                        ['once', 'Sim, pelo menos uma vez'],
                        ['never', 'Nunca testamos'],
                        ['unknown', 'Não sei informar'],
                      ] as Array<[AssessmentData['restoreTests'], string]>).map(([value, label]) => (
                        <Choice key={value} selected={a.restoreTests === value} onClick={() => set('restoreTests', value)}>{label}</Choice>
                      ))}
                    </ChoiceGrid>
                  </Field>
                </QuestionPair>
              </>
            )}

            <Field label="Se os sistemas principais parassem hoje, qual seria o impacto?">
              <ChoiceGrid>
                {([
                  ['low', 'A empresa continuaria quase normalmente'],
                  ['partial', 'Parte da empresa ficaria parada'],
                  ['major', 'A maior parte da operação seria afetada'],
                  ['halt', 'A operação praticamente pararia'],
                  ['unknown', 'Não sei informar'],
                ] as Array<[OperationalImpactLevel, string]>).map(([value, label]) => (
                  <Choice key={value} selected={(a.operationalImpact ?? 'unknown') === value} onClick={() => set('operationalImpact', value)}>{label}</Choice>
                ))}
              </ChoiceGrid>
            </Field>
          </Section>
        )}

        {step === 4 && (
          <div className="space-y-6">
            {panel === 0 && <Section eyebrow="Contas e acessos" title="Como as identidades mais importantes são protegidas?">
              <Field label="Nas contas mais importantes, existe uma confirmação além da senha?">
                <ChoiceGrid>
                  {([
                    ['yes', 'Sim, na maioria das contas importantes'],
                    ['partial', 'Apenas em algumas contas'],
                    ['no', 'Não'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['mfa'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.mfa === value} onClick={() => set('mfa', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="Mais de uma pessoa utiliza a mesma conta ou senha em algum sistema?">
                <ChoiceGrid cols={3}>
                  {([
                    ['yes', 'Sim'],
                    ['no', 'Não'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['sharedAccounts'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.sharedAccounts === value} onClick={() => set('sharedAccounts', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="Quando alguém sai da empresa, os acessos costumam ser removidos?">
                <ChoiceGrid cols={3}>
                  {([
                    ['formal', 'Sim, existe processo definido'],
                    ['informal', 'É feito caso a caso'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['offboarding'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.offboarding === value} onClick={() => set('offboarding', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="O e-mail possui proteção além do filtro padrão de spam?">
                <ChoiceGrid>
                  {([
                    ['advanced', 'Sim, com análise de links, anexos e mensagens suspeitas'],
                    ['standard', 'Sim, existe proteção adicional administrada'],
                    ['basic', 'Apenas o filtro padrão de spam'],
                    ['none', 'Não existe proteção adicional'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['emailProtection'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.emailProtection === value} onClick={() => set('emailProtection', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>
            </Section>}

            {panel === 1 && <Section eyebrow="Capacidade de resposta" title="Quem age quando o problema acontece?" description="Essas respostas evitam que um ambiente pareça maduro apenas porque possui boas ferramentas.">
              <Field label="Se acontecer um incidente hoje, a empresa sabe quem coordena a resposta?">
                <ChoiceGrid>
                  {([
                    ['formal', 'Sim, há responsável e processo definidos'],
                    ['informal', 'Sabemos quem chamar, mas sem processo formal'],
                    ['none', 'Não existe responsável definido'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['incidentResponse'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.incidentResponse === value} onClick={() => set('incidentResponse', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="Se o incidente começar à noite, em um feriado ou fim de semana, quem consegue agir?">
                <ChoiceGrid>
                  {([
                    ['managed_24x7', 'Há equipe ou serviço com cobertura 24x7'],
                    ['on_call', 'Há alguém de sobreaviso'],
                    ['ad_hoc', 'Tentamos localizar alguém quando necessário'],
                    ['business_hours', 'Normalmente seria tratado no próximo expediente'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AfterHoursResponseLevel, string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.afterHoursResponse === value} onClick={() => set('afterHoursResponse', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>
            </Section>}

            {panel === 2 && <Section eyebrow="Novos riscos" title="IA, dados e histórico do ambiente">
              <Field label="Como a empresa orienta o uso de ferramentas de IA generativa, como ChatGPT, Copilot ou Gemini?">
                <ChoiceGrid>
                  {([
                    ['controlled', 'Existem ferramentas permitidas e regras claras sobre dados'],
                    ['partial', 'Há orientações, mas elas não são padronizadas em toda a empresa'],
                    ['open', 'As pessoas usam livremente, sem regra definida'],
                    ['not_used', 'A empresa não utiliza esse tipo de ferramenta no trabalho'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['aiUsageGovernance'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.aiUsageGovernance === value} onClick={() => set('aiUsageGovernance', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="A empresa trata dados pessoais ou informações sensíveis?">
                <ChoiceGrid cols={3}>
                  {([
                    ['yes', 'Sim'],
                    ['no', 'Não'],
                    ['unknown', 'Não sei informar'],
                  ] as Array<[AssessmentData['sensitiveData'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.sensitiveData === value} onClick={() => set('sensitiveData', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="A empresa já passou por vírus, invasão, perda de dados ou uma parada importante?">
                <ChoiceGrid cols={3}>
                  {([
                    ['yes', 'Sim'],
                    ['no', 'Não'],
                    ['unknown', 'Não sei / prefiro não informar'],
                  ] as Array<[AssessmentData['incidentHistory'], string]>).map(([value, label]) => (
                    <Choice key={value} selected={a.incidentHistory === value} onClick={() => set('incidentHistory', value)}>{label}</Choice>
                  ))}
                </ChoiceGrid>
              </Field>

              <Field label="Qual situação de segurança mais preocupa a empresa hoje?" help="Opcional. Uma frase já é suficiente.">
                <input className={input} value={a.mainConcern} onChange={(e) => set('mainConcern', e.target.value)} placeholder="Ex.: ransomware, fraude por e-mail, indisponibilidade..." />
              </Field>
            </Section>}
          </div>
        )}

        <div className="mt-7 flex items-center justify-between border-t border-cyan-300/[0.08] pt-5">
          <button
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-30"
            disabled={(step === 0 && panel === 0) || isSubmitting}
            onClick={goBack}
          >
            <ArrowLeft size={18} />Voltar
          </button>

          {step === steps.length - 1 && panel === panelCount - 1 ? (
            <button
              className="flex min-w-[200px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-3 font-bold text-slate-950 shadow-[0_12px_30px_rgba(13,148,136,.18)] transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
              onClick={submit}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <><Loader2 size={18} className="animate-spin" />Processando...</> : <><CheckCircle2 size={18} />Ver meu diagnóstico</>}
            </button>
          ) : (
            <button
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-3 font-bold text-slate-950 shadow-[0_12px_30px_rgba(13,148,136,.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isSubmitting || !canAdvancePanel}
              onClick={goForward}
            >
              Continuar<ArrowRight size={18} />
            </button>
          )}
        </div>
      </Card>

      <div className="mt-5 flex gap-2 text-sm text-slate-500">
        <Info className="mt-0.5 shrink-0" size={17} />
        <span>O resultado é um diagnóstico inicial baseado nas informações fornecidas. Quando algo não puder ser confirmado, será tratado como ponto a validar.</span>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/72 px-4 backdrop-blur-[2px]" role="status" aria-live="polite">
          <div className="w-full max-w-sm rounded-2xl border border-cyan-300/[0.12] bg-[#081426]/95 p-7 text-center shadow-2xl shadow-slate-950/60">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-teal-500/20 bg-teal-500/10">
              <Loader2 className="animate-spin text-teal-300" size={24} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">Preparando seu diagnóstico</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">Estamos organizando suas respostas e preparando a leitura de segurança.</p>
          </div>
        </div>
      )}
    </TechnicalShell>
  );
}
