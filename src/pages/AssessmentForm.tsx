import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssessmentData } from '../types';
import { loadDraft, saveDraft, saveSubmission } from '../storage';
import { saveAssessmentProgress, completeAssessment } from '../lib/assessment.functions';
import { loadSession } from '../lib/assessment-session';
import ClientHeader from '../components/ClientHeader';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Info,
  Wifi,
  MonitorSmartphone,
  Database,
  KeyRound,
  Building2,
  Loader2,
} from 'lucide-react';

const Card = ({ children }: { children: ReactNode }) => (
  <div className="glass-card p-6 md:p-8">{children}</div>
);

const Field = ({ label, help, children }: { label: string; help?: string; children: ReactNode }) => (
  <label className="question-field flex h-full flex-col">
    <span className="question-label flex min-h-0 items-end font-semibold leading-snug text-slate-100 md:min-h-[2.9rem]">
      {label}
    </span>
    <div className="question-control mt-2">{children}</div>
    <span className="question-help mt-2 block min-h-0 text-sm leading-relaxed text-slate-400 md:min-h-[2.6rem]">
      {help || ''}
    </span>
  </label>
);

const QuestionPair = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-5 md:grid-cols-2 md:items-stretch">{children}</div>
);

const StepSection = ({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-5 md:p-6">
    <div className="mb-5 border-b border-slate-800/70 pb-4">
      <div className="text-2xs font-bold uppercase tracking-[.16em] text-teal-400">{eyebrow}</div>
      <h3 className="mt-1 text-lg font-bold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
    <div className="space-y-5">{children}</div>
  </section>
);

const input =
  'w-full rounded-xl border border-slate-700/80 bg-slate-950/65 px-4 py-3.5 text-slate-100 shadow-inner outline-none transition placeholder:text-slate-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10';
const select = input;

const sectors = [
  'Saúde',
  'Advocacia',
  'Contabilidade',
  'Construção / Engenharia',
  'Indústria',
  'Varejo',
  'Distribuição / Atacado',
  'Transporte / Logística',
  'Hotelaria / Turismo',
  'Alimentação',
  'Educação',
  'Serviços Profissionais',
  'Tecnologia',
  'Financeiro',
  'Imobiliário',
  'Outros',
];

export default function AssessmentForm() {
  const nav = useNavigate();
  const [accessReady, setAccessReady] = useState(false);

  useEffect(() => {
    const session = loadSession();

    if (!session) {
      nav('/', { replace: true });
      return;
    }

    setAccessReady(true);
  }, [nav]);

  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('concierge-client-assessment-step-v2');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [a, setA] = useState<AssessmentData>(() => loadDraft());
  const [environmentSizeText, setEnvironmentSizeText] = useState(() => {
    const users = a.users || 0;
    const endpoints = a.endpointCount || a.devices || 0;
    if (!users && !endpoints) return '';
    return `${users || 0} usuários / ${endpoints || 0} computadores`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (k: keyof AssessmentData, v: any) => setA((x) => ({ ...x, [k]: v }));
  const patch = (values: Partial<AssessmentData>) => setA((x) => ({ ...x, ...values }));

  const updateEnvironmentSize = (value: string) => {
    setEnvironmentSizeText(value);
    const numbers = value.match(/\d+/g)?.map(Number) ?? [];

    if (numbers.length === 0) {
      patch({ users: 0, endpointCount: 0, devices: 0 });
      return;
    }

    if (numbers.length === 1) {
      patch({ users: Math.max(0, numbers[0]), endpointCount: 0, devices: 0 });
      return;
    }

    const users = Math.max(0, numbers[0]);
    const endpoints = Math.max(0, numbers[1]);
    patch({ users, endpointCount: endpoints, devices: endpoints });
  };

  useEffect(() => {
    localStorage.setItem('concierge-client-assessment-step-v2', String(step));
  }, [step]);

  useEffect(() => {
    const t = window.setTimeout(() => saveDraft(a), 300);
    return () => window.clearTimeout(t);
  }, [a]);

  const steps = useMemo(
    () => [
      {
        name: 'Empresa',
        icon: Building2,
        desc: 'Quem é a empresa e qual é o tamanho aproximado do ambiente',
      },
      {
        name: 'Internet e rede',
        icon: Wifi,
        desc: 'Como a empresa se conecta, protege a internet e percebe eventos suspeitos',
      },
      {
        name: 'Computadores e ativos',
        icon: MonitorSmartphone,
        desc: 'Sistemas operacionais, proteção e acompanhamento dos equipamentos',
      },
      {
        name: 'Dados e backup',
        icon: Database,
        desc: 'Onde estão os dados, como são copiados e como seriam recuperados',
      },
      {
        name: 'Contas e segurança',
        icon: KeyRound,
        desc: 'Acessos, e-mail, uso de IA e capacidade de resposta',
      },
    ],
    [],
  );

  const snapshot = JSON.stringify(a);
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    const t = setTimeout(() => {
      void saveAssessmentProgress({
        data: {
          assessmentId: session.assessmentId,
          editToken: session.editToken,
          step,
          data: JSON.parse(snapshot),
        },
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [snapshot, step]);

  const setLinkCount = (count: number) => {
    const safe = Math.max(1, Math.min(3, count || 1));
    const links = Array.from({ length: safe }, (_, i) => a.links[i] ?? { speedMbps: 0 });
    patch({ internetLinkCount: safe, links });
  };

  const setLinkSpeed = (index: number, value: number) => {
    const links = Array.from(
      { length: Math.max(1, a.internetLinkCount) },
      (_, i) => a.links[i] ?? { speedMbps: 0 },
    );
    links[index] = { speedMbps: Math.max(0, value || 0) };
    set('links', links);
  };

  const submit = async () => {
    if (isSubmitting) return;
    const startedAt = performance.now();
    const minimumTransitionMs = 950;
    setIsSubmitting(true);
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
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, minimumTransitionMs - elapsed);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
      const s = saveSubmission(a);
      nav(`/resultado?id=${s.id}&success=true`);
    } catch (error) {
      console.error('Falha ao concluir assessment:', error);
      alert(
        'Não foi possível enviar o diagnóstico neste momento. Suas respostas continuam salvas neste dispositivo. Verifique sua conexão e tente novamente.',
      );
      setIsSubmitting(false);
    }
  };

  const current = steps[step];
  const sectorValue = sectors.includes(a.sector) ? a.sector : a.sector ? 'Outros' : '';
  const sectorOtherValue =
    a.sector === 'Outros' ? a.sectorOther : !sectors.includes(a.sector) ? a.sector : a.sectorOther;

  if (!accessReady) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech" />
    );
  }

  return (
    <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
      <div className="mx-auto max-w-5xl">
        <ClientHeader />

        <div className="mb-6 grid grid-cols-5 gap-2">
          {steps.map((s, i) => (
            <div key={s.name}>
              <div
                className={`h-1.5 rounded-full transition ${
                  i <= step ? 'bg-gradient-to-r from-cyan-500 to-teal-400' : 'bg-slate-800'
                }`}
              />
              <div
                className={`mt-2 hidden text-xs md:block ${
                  i === step ? 'font-semibold text-teal-300' : 'text-slate-600'
                }`}
              >
                {s.name}
              </div>
            </div>
          ))}
        </div>

        <Card>
          <div className="mb-7 flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-start">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-teal-500/20 bg-teal-500/10">
                <current.icon className="text-teal-300" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[.18em] text-teal-400">
                  Etapa {step + 1} de {steps.length}
                </div>
                <h2 className="mt-1 text-2xl font-bold">{current.name}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {current.desc}. Preencha apenas o que souber. “Não sei informar” é uma resposta válida.
                </p>
              </div>
            </div>
            <div className="mt-1 flex shrink-0 items-center gap-1.5 self-end rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-500 sm:self-start">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
              <span>Respostas salvas automaticamente</span>
            </div>
          </div>

          {step === 0 && (
            <div className="space-y-5">
              <StepSection
                eyebrow="Sobre a empresa"
                title="Contexto básico"
                description="Começamos pelo contexto da empresa. Os números informados aqui serão reutilizados nas próximas etapas e não serão perguntados novamente."
              >
                <QuestionPair>
                  <Field label="Nome da empresa">
                    <input
                      className={input}
                      value={a.companyName}
                      onChange={(e) => set('companyName', e.target.value)}
                      placeholder="Ex.: Empresa ABC"
                    />
                  </Field>
                  <Field label="Setor de atuação">
                    <div className="space-y-2">
                      <select
                        className={select}
                        value={sectorValue}
                        onChange={(e) => {
                          set('sector', e.target.value);
                          if (e.target.value !== 'Outros') set('sectorOther', '');
                        }}
                      >
                        <option value="">Selecione o setor</option>
                        {sectors.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {sectorValue === 'Outros' && (
                        <input
                          className={input}
                          value={sectorOtherValue}
                          onChange={(e) => set('sectorOther', e.target.value)}
                          placeholder="Informe o setor"
                        />
                      )}
                    </div>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field label="Seu nome">
                    <input className={input} value={a.contactName} onChange={(e) => set('contactName', e.target.value)} />
                  </Field>
                  <Field label="Cargo">
                    <input className={input} value={a.contactRole} onChange={(e) => set('contactRole', e.target.value)} />
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field label="E-mail">
                    <input
                      className={input}
                      type="email"
                      value={a.contactEmail}
                      onChange={(e) => set('contactEmail', e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Quantas unidades ou filiais a empresa possui?"
                    help="Considere matriz e filiais que utilizam o ambiente da empresa."
                  >
                    <input
                      className={input}
                      type="number"
                      min="1"
                      value={a.sites || ''}
                      onChange={(e) => set('sites', Math.max(1, Number(e.target.value) || 1))}
                      placeholder="Ex.: 2"
                    />
                  </Field>
                </QuestionPair>

                <Field
                  label="Quantos usuários e computadores a empresa possui?"
                  help="Escreva os dois números no mesmo campo. Ex.: 45 usuários / 38 computadores. Esses dados ajudam a entender o porte do ambiente e interpretar melhor o resultado."
                >
                  <input
                    className={input}
                    value={environmentSizeText}
                    onChange={(e) => updateEnvironmentSize(e.target.value)}
                    placeholder="Ex.: 45 usuários / 38 computadores"
                  />
                </Field>
              </StepSection>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <StepSection
                eyebrow="Internet e rede"
                title="Conexão e proteção"
                description="Agora olhamos para o equipamento que protege a internet, os links, o acesso remoto e como a empresa percebe algo suspeito na rede."
              >
                <QuestionPair>
                  <Field
                    label="Qual opção mais se parece com o equipamento que protege a internet da empresa?"
                    help="Se não souber diferenciar, escolha “Não sei informar”. Os exemplos servem apenas para facilitar a identificação."
                  >
                    <select
                      className={select}
                      value={a.firewallLevel}
                      onChange={(e) => {
                        const v = e.target.value as AssessmentData['firewallLevel'];
                        patch({
                          firewallLevel: v,
                          firewallThreatPrevention:
                            v === 'ngfw' || v === 'managed_ngfw'
                              ? 'yes'
                              : v === 'router' || v === 'utm'
                                ? 'partial'
                                : v === 'isp' || v === 'none'
                                  ? 'no'
                                  : 'unknown',
                        });
                      }}
                    >
                      <option value="unknown">Não sei informar</option>
                      <option value="isp">Somente o equipamento ou roteador instalado pela operadora de internet</option>
                      <option value="router">Equipamento próprio para controlar internet, acessos e VPN (ex.: MikroTik, pfSense, Ubiquiti)</option>
                      <option value="ngfw">Firewall com recursos de segurança contra ameaças (ex.: FortiGate, SonicWall, Sophos ou Palo Alto)</option>
                    </select>
                  </Field>

                  <Field label="Quantos links de internet a empresa possui?" help="Considere também um link usado apenas como contingência.">
                    <select
                      className={select}
                      value={Math.max(1, Math.min(3, a.internetLinkCount || 1))}
                      onChange={(e) => setLinkCount(Number(e.target.value))}
                    >
                      <option value="1">1 link</option>
                      <option value="2">2 links</option>
                      <option value="3">3 ou mais links</option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field label="Velocidade do link principal" help="Digite apenas o número em Mbps. Ex.: 500 para um link de 500 Mbps; 1000 para 1 Gbps.">
                    <input
                      className={input}
                      type="number"
                      min="0"
                      value={a.links[0]?.speedMbps || ''}
                      onChange={(e) => setLinkSpeed(0, Number(e.target.value))}
                      placeholder="Ex.: 500"
                    />
                  </Field>

                  {a.internetLinkCount >= 2 ? (
                    <Field label="Velocidade do segundo link" help="Digite apenas o número em Mbps.">
                      <input
                        className={input}
                        type="number"
                        min="0"
                        value={a.links[1]?.speedMbps || ''}
                        onChange={(e) => setLinkSpeed(1, Number(e.target.value))}
                        placeholder="Ex.: 300"
                      />
                    </Field>
                  ) : (
                    <div className="hidden md:block" />
                  )}
                </QuestionPair>

                {a.internetLinkCount >= 3 && (
                  <QuestionPair>
                    <Field label="Velocidade do terceiro link" help="Digite apenas o número em Mbps.">
                      <input
                        className={input}
                        type="number"
                        min="0"
                        value={a.links[2]?.speedMbps || ''}
                        onChange={(e) => setLinkSpeed(2, Number(e.target.value))}
                        placeholder="Ex.: 200"
                      />
                    </Field>
                    <div className="hidden md:block" />
                  </QuestionPair>
                )}

                <Field
                  label="Qual perfil mais se parece com o uso da internet no dia a dia?"
                  help="Escolha o cenário mais próximo. Isso ajuda a entender a carga normal da conexão sem exigir informações técnicas."
                >
                  <select className={select} value={a.networkUsage} onChange={(e) => set('networkUsage', e.target.value)}>
                    <option value="light">Uso mais simples: e-mail, navegação e poucos sistemas online</option>
                    <option value="medium">Uso misto: videoconferências, sistemas em nuvem e trabalho diário</option>
                    <option value="high">Uso intenso: muitos acessos simultâneos, arquivos pesados, câmeras ou sistemas críticos em nuvem</option>
                  </select>
                </Field>

                <QuestionPair>
                  <Field
                    label="Pessoas acessam sistemas da empresa de fora do escritório?"
                    help="Por exemplo, trabalhando de casa ou acessando sistemas internos por VPN."
                  >
                    <select
                      className={select}
                      value={a.vpnUsage}
                      onChange={(e) => {
                        const value = e.target.value as AssessmentData['vpnUsage'];
                        patch({ vpnUsage: value, vpnRemote: value === 'yes' ? 1 : 0 });
                      }}
                    >
                      <option value="unknown">Não sei informar</option>
                      <option value="yes">Sim</option>
                      <option value="no">Não</option>
                    </select>
                  </Field>

                  <Field
                    label="A rede possui separações para usos diferentes?"
                    help="Ex.: uma rede para funcionários, outra para visitantes ou uma área separada para servidores."
                  >
                    <select
                      className={select}
                      value={a.vlans === 0 ? 'unknown' : a.vlans === 1 ? 'no' : a.vlans === 2 ? 'partial' : 'yes'}
                      onChange={(e) =>
                        set('vlans', e.target.value === 'yes' ? 3 : e.target.value === 'partial' ? 2 : e.target.value === 'no' ? 1 : 0)
                      }
                    >
                      <option value="unknown">Não sei informar</option>
                      <option value="yes">Sim, existem redes separadas</option>
                      <option value="partial">Parcialmente</option>
                      <option value="no">Não, todos usam praticamente a mesma rede</option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field
                    label="Como a empresa percebe quando algo suspeito acontece na internet ou na rede?"
                    help="Queremos entender se existem alertas e acompanhamento, ou se o problema costuma aparecer primeiro para o usuário."
                  >
                    <select className={select} value={a.monitoring} onChange={(e) => set('monitoring', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="soc">Há monitoramento contínuo e alertas automáticos</option>
                      <option value="security_team">Há uma pessoa ou equipe que acompanha alertas</option>
                      <option value="reactive_it">Normalmente verificamos quando aparece algum problema</option>
                      <option value="none">Não existe acompanhamento definido</option>
                    </select>
                  </Field>

                  <Field
                    label="O equipamento que protege a internet é revisado e atualizado regularmente?"
                    help="Por exemplo, atualização do sistema, revisão de regras e conferência dos recursos de segurança ativos."
                  >
                    <select
                      className={select}
                      value={a.networkMaintenance}
                      onChange={(e) => set('networkMaintenance', e.target.value)}
                    >
                      <option value="unknown">Não sei informar</option>
                      <option value="formal">Sim, existe uma rotina definida</option>
                      <option value="informal">É revisado quando necessário</option>
                      <option value="none">Não existe uma rotina definida</option>
                    </select>
                  </Field>
                </QuestionPair>
              </StepSection>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <StepSection
                eyebrow="Computadores e ativos"
                title="Proteção de computadores e ativos"
                description="A quantidade de computadores já foi informada. Agora entendemos os sistemas usados, os servidores e como os equipamentos são protegidos e acompanhados."
              >
                <QuestionPair>
                  <Field
                    label="Quais sistemas operacionais são usados nos computadores?"
                    help="Escreva de forma simples. Ex.: Windows 11, alguns Windows 10 e dois MacBooks."
                  >
                    <input
                      className={input}
                      value={a.endpointOperatingSystem === 'unknown' ? '' : a.endpointOperatingSystem || ''}
                      onChange={(e) => set('endpointOperatingSystem', e.target.value || 'unknown')}
                      placeholder="Ex.: Windows 11 e alguns Windows 10"
                    />
                  </Field>

                  <Field label="Quantos servidores a empresa possui?" help="Digite 0 se não houver servidores próprios ou administrados pela empresa.">
                    <input
                      className={input}
                      type="number"
                      min="0"
                      value={a.servers || ''}
                      onChange={(e) => set('servers', Math.max(0, Number(e.target.value) || 0))}
                      placeholder="Ex.: 2"
                    />
                  </Field>
                </QuestionPair>

                {a.servers > 0 && (
                  <QuestionPair>
                    <Field label="Qual sistema operacional é mais usado nos servidores?">
                      <select
                        className={select}
                        value={a.serverOperatingSystem || 'unknown'}
                        onChange={(e) => set('serverOperatingSystem', e.target.value)}
                      >
                        <option value="unknown">Não sei informar</option>
                        <option value="windows_server">Windows Server</option>
                        <option value="linux">Linux</option>
                        <option value="mixed">Windows Server e Linux</option>
                        <option value="other">Outro</option>
                      </select>
                    </Field>
                    <div className="hidden md:block" />
                  </QuestionPair>
                )}

                <QuestionPair>
                  <Field
                    label="Qual opção melhor descreve a proteção dos computadores hoje?"
                    help="Escolha a opção que mais se aproxima. Não precisa saber o nome da tecnologia."
                  >
                    <select
                      className={select}
                      value={a.endpointLevel}
                      onChange={(e) => {
                        const v = e.target.value as AssessmentData['endpointLevel'];
                        patch({
                          endpointLevel: v,
                          endpointCentralManagement:
                            v === 'managed_edr' || v === 'edr' || v === 'business_av'
                              ? 'yes'
                              : v === 'basic_av' || v === 'none'
                                ? 'no'
                                : 'unknown',
                        });
                      }}
                    >
                      <option value="unknown">Não sei informar</option>
                      <option value="none">Não há uma proteção definida para todos os computadores</option>
                      <option value="basic_av">Proteção padrão do sistema ou antivírus básico</option>
                      <option value="business_av">Proteção gerenciada em um painel central</option>
                      <option value="edr">Proteção que detecta e ajuda a investigar atividades suspeitas</option>
                      <option value="managed_edr">Proteção avançada com acompanhamento 24 horas</option>
                    </select>
                  </Field>

                  <Field
                    label="A empresa consegue ver quais computadores existem e se estão atualizados?"
                    help="Uma única resposta reúne inventário e acompanhamento de atualizações para evitar perguntas repetidas."
                  >
                    <select
                      className={select}
                      value={a.assetInventory}
                      onChange={(e) => {
                        const v = e.target.value as AssessmentData['assetInventory'];
                        patch({
                          assetInventory: v,
                          vulnerabilityManagement:
                            v === 'managed'
                              ? 'continuous'
                              : v === 'partial'
                                ? 'regular'
                                : v === 'informal'
                                  ? 'occasional'
                                  : v === 'none'
                                    ? 'none'
                                    : 'unknown',
                          autoUpdates:
                            v === 'managed' || v === 'partial' ? 'yes' : v === 'none' ? 'no' : 'unknown',
                        });
                      }}
                    >
                      <option value="unknown">Não sei informar</option>
                      <option value="managed">Sim, há ferramenta ou painel com os equipamentos e atualizações</option>
                      <option value="partial">Temos uma lista e uma rotina periódica de atualização</option>
                      <option value="informal">É controlado manualmente ou máquina a máquina</option>
                      <option value="none">Não existe um controle definido</option>
                    </select>
                  </Field>
                </QuestionPair>

                <Field
                  label="Quando a proteção identifica algo suspeito em um computador, o que normalmente acontece?"
                  help="Aqui avaliamos se o alerta vira análise e ação, e não apenas se a ferramenta gera uma notificação."
                >
                  <select className={select} value={a.endpointResponse} onChange={(e) => set('endpointResponse', e.target.value)}>
                    <option value="unknown">Não sei informar</option>
                    <option value="managed_soc">Uma equipe acompanha continuamente e pode agir</option>
                    <option value="defined_team">Existe uma pessoa ou equipe definida para analisar e agir</option>
                    <option value="alerts_only">O alerta fica disponível e é verificado quando necessário</option>
                    <option value="none">Não existe acompanhamento definido</option>
                  </select>
                </Field>
              </StepSection>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <StepSection
                eyebrow="Dados e backup"
                title="Proteção e recuperação"
                description="Agora entendemos onde estão as informações importantes, o volume aproximado e se a empresa consegue recuperá-las quando necessário."
              >
                <QuestionPair>
                  <Field
                    label="Onde ficam os arquivos e informações mais importantes da empresa?"
                    help="Pense em documentos, planilhas, projetos, dados de clientes e arquivos necessários para o trabalho."
                  >
                    <select className={select} value={a.dataLocation} onChange={(e) => set('dataLocation', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="corporate_central">Em uma área central administrada pela empresa, como SharePoint ou servidor de arquivos</option>
                      <option value="saas_only">Principalmente em nuvem, como OneDrive, Google Drive ou outros sistemas online</option>
                      <option value="mixed">Espalhados entre nuvem, SharePoint/servidor e computadores</option>
                      <option value="endpoints">Principalmente nos computadores e notebooks das pessoas</option>
                      <option value="personal_cloud">Em contas pessoais ou locais que a empresa não controla diretamente</option>
                    </select>
                  </Field>

                  <Field
                    label="Qual é o volume aproximado de dados que precisa ser protegido?"
                    help="Uma estimativa já é suficiente para preparar um cenário inicial de backup."
                  >
                    <select
                      className={select}
                      value={a.backupVolumeGb || 0}
                      onChange={(e) => set('backupVolumeGb', Number(e.target.value))}
                    >
                      <option value="0">Não sei informar</option>
                      <option value="500">Até 500 GB</option>
                      <option value="1000">De 500 GB a 1 TB</option>
                      <option value="5000">De 1 TB a 5 TB</option>
                      <option value="10000">De 5 TB a 10 TB</option>
                      <option value="10001">Mais de 10 TB</option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field label="A empresa possui cópias de segurança dos dados importantes?">
                    <select className={select} value={a.backupLevel} onChange={(e) => set('backupLevel', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="none">Não existe uma rotina de backup</option>
                      <option value="manual">Sim, mas as cópias são feitas manualmente</option>
                      <option value="automated_local">Sim, cópia automática em equipamento/local da empresa</option>
                      <option value="cloud">Sim, cópia automática em nuvem</option>
                      <option value="multi_copy">Sim, existem cópias em mais de um local</option>
                      <option value="managed">Sim, existe rotina acompanhada e com responsáveis definidos</option>
                    </select>
                  </Field>

                  <Field
                    label="Existe uma cópia que fique separada do ambiente principal?"
                    help="A ideia é evitar que o mesmo problema atinja os arquivos originais e todas as cópias ao mesmo tempo."
                  >
                    <select className={select} value={a.backupIsolation} onChange={(e) => set('backupIsolation', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="immutable">Sim, existe uma cópia protegida contra alteração ou exclusão</option>
                      <option value="isolated">Sim, existe uma cópia separada ou offline</option>
                      <option value="separate_account">Sim, fica em conta ou ambiente administrado separadamente</option>
                      <option value="same_environment">Existe cópia, mas ela fica no mesmo ambiente</option>
                      <option value="none">Não existe uma cópia separada</option>
                    </select>
                  </Field>
                </QuestionPair>

                <Field label="A empresa já testou se consegue recuperar os dados do backup?">
                  <select className={select} value={a.restoreTests} onChange={(e) => set('restoreTests', e.target.value)}>
                    <option value="unknown">Não sei informar</option>
                    <option value="regular">Sim, fazemos testes periodicamente</option>
                    <option value="once">Já testamos alguma vez</option>
                    <option value="never">Temos backup, mas nunca testamos uma recuperação</option>
                  </select>
                </Field>

                <QuestionPair>
                  <Field
                    label="Se os sistemas e dados principais parassem hoje, quanto da empresa conseguiria continuar trabalhando?"
                    help="Essa resposta ajuda a estimar a relevância operacional de uma indisponibilidade."
                  >
                    <select
                      className={select}
                      value={a.operationalImpact ?? 'unknown'}
                      onChange={(e) => set('operationalImpact', e.target.value)}
                    >
                      <option value="unknown">Não sei informar</option>
                      <option value="low">A empresa conseguiria continuar quase normalmente</option>
                      <option value="partial">Parte da empresa ficaria parada</option>
                      <option value="major">A maior parte da empresa ficaria parada</option>
                      <option value="halt">A operação praticamente pararia</option>
                    </select>
                  </Field>

                  <Field
                    label="Por quanto tempo a empresa consegue ficar sem os sistemas ou dados mais importantes?"
                    help="Use a opção mais próxima da realidade do negócio."
                  >
                    <select className={select} value={a.maxDowntime} onChange={(e) => set('maxDowntime', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="4h">Até 4 horas</option>
                      <option value="8h">Até 8 horas</option>
                      <option value="1d">Até 1 dia</option>
                      <option value="2d">Até 2 dias</option>
                      <option value="more">Mais de 2 dias</option>
                    </select>
                  </Field>
                </QuestionPair>
              </StepSection>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <StepSection
                eyebrow="Contas e segurança"
                title="Acessos, IA e capacidade de resposta"
                description="Fechamos olhando para contas, e-mail, proteção de dados, uso de Inteligência Artificial e o que acontece quando surge um problema fora do horário normal."
              >
                <QuestionPair>
                  <Field label="Nas contas mais importantes, existe alguma confirmação além da senha?">
                    <select className={select} value={a.mfa} onChange={(e) => set('mfa', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="yes">Sim, na maioria das contas importantes</option>
                      <option value="partial">Apenas em algumas contas</option>
                      <option value="no">Não</option>
                    </select>
                  </Field>

                  <Field label="Mais de uma pessoa utiliza a mesma conta ou senha para acessar algum sistema?">
                    <select className={select} value={a.sharedAccounts} onChange={(e) => set('sharedAccounts', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="yes">Sim</option>
                      <option value="no">Não</option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field label="Quando alguém sai da empresa, existe uma rotina para remover seus acessos?">
                    <select className={select} value={a.offboarding} onChange={(e) => set('offboarding', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="formal">Sim, existe uma rotina definida</option>
                      <option value="informal">É feito caso a caso</option>
                    </select>
                  </Field>

                  <Field label="O e-mail da empresa possui alguma proteção além do filtro padrão de spam?">
                    <select className={select} value={a.emailProtection} onChange={(e) => set('emailProtection', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="advanced">Sim, também analisa links, anexos e mensagens suspeitas</option>
                      <option value="standard">Sim, existe uma proteção adicional administrada pela empresa</option>
                      <option value="basic">Usamos apenas a proteção padrão do serviço de e-mail</option>
                      <option value="none">Não existe proteção além do padrão</option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field
                    label="A empresa trabalha com dados pessoais de clientes, colaboradores ou parceiros?"
                    help="Ex.: nome, CPF, contato, documentos, dados financeiros, saúde ou outras informações ligadas a uma pessoa."
                  >
                    <select className={select} value={a.sensitiveData} onChange={(e) => set('sensitiveData', e.target.value)}>
                      <option value="unknown">Não sei informar</option>
                      <option value="yes">Sim</option>
                      <option value="no">Não</option>
                    </select>
                  </Field>

                  <Field
                    label="A empresa tem alguma regra para o uso de ferramentas de Inteligência Artificial?"
                    help="Pense em ChatGPT, Copilot, Gemini e ferramentas semelhantes, principalmente quando alguém pode enviar informações da empresa ou de clientes."
                  >
                    <select
                      className={select}
                      value={a.aiUsageGovernance}
                      onChange={(e) => set('aiUsageGovernance', e.target.value)}
                    >
                      <option value="unknown">Não sei informar</option>
                      <option value="controlled">Sim, existe regra clara sobre ferramentas permitidas e quais dados podem ser enviados</option>
                      <option value="partial">Existem orientações, mas cada área ainda usa de um jeito</option>
                      <option value="open">As pessoas usam ferramentas de IA sem uma regra definida</option>
                      <option value="not_used">A empresa não utiliza ou não permite o uso dessas ferramentas</option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field
                    label="Se surgir um alerta importante à noite, de madrugada ou no fim de semana, existe alguém que receba e possa iniciar uma resposta?"
                    help="Não precisa ser uma equipe interna. O importante é saber se há alguém responsável e acionável fora do horário normal."
                  >
                    <select
                      className={select}
                      value={a.firewallMonitoring24x7 ?? 'unknown'}
                      onChange={(e) => {
                        const v = e.target.value as 'yes' | 'partial' | 'no' | 'unknown';
                        patch({
                          firewallMonitoring24x7: v,
                          incidentResponse:
                            v === 'yes' ? 'formal' : v === 'partial' ? 'informal' : v === 'no' ? 'none' : 'unknown',
                        });
                      }}
                    >
                      <option value="unknown">Não sei informar</option>
                      <option value="yes">Sim, existe acompanhamento e alguém pode agir a qualquer hora</option>
                      <option value="partial">Existe alguém para acionar, mas não há acompanhamento contínuo</option>
                      <option value="no">Não, normalmente só seria visto no próximo expediente</option>
                    </select>
                  </Field>

                  <Field label="A empresa já passou por vírus, invasão, perda de dados ou uma parada importante causada por tecnologia?">
                    <select className={select} value={a.incidentHistory} onChange={(e) => set('incidentHistory', e.target.value)}>
                      <option value="unknown">Prefiro não informar / não sei</option>
                      <option value="no">Não</option>
                      <option value="yes">Sim</option>
                    </select>
                  </Field>
                </QuestionPair>

                <Field
                  label="Qual situação de segurança mais preocupa a empresa hoje?"
                  help="Opcional. Essa resposta ajuda a aproximar o resultado da realidade da empresa."
                >
                  <input
                    className={input}
                    value={a.mainConcern}
                    onChange={(e) => set('mainConcern', e.target.value)}
                    placeholder="Ex.: golpe por e-mail, perda de dados, parada dos sistemas, uso de IA..."
                  />
                </Field>
              </StepSection>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
            <button
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-30"
              disabled={step === 0 || isSubmitting}
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={18} />
              Voltar
            </button>

            {step < steps.length - 1 ? (
              <button
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                onClick={() => {
                  setStep((s) => s + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Continuar
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                className="flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 disabled:cursor-wait disabled:bg-teal-700 disabled:text-teal-100"
                onClick={submit}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processando diagnóstico...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Enviar assessment
                  </>
                )}
              </button>
            )}
          </div>
        </Card>

        <div className="mt-5 flex gap-2 text-sm text-slate-500">
          <Info className="mt-0.5 shrink-0" size={17} />
          <span>
            As respostas formam um diagnóstico inicial e ajudam a preparar um cenário técnico preliminar. Uma validação mais profunda pode ser feita depois, em conjunto com a equipe responsável.
          </span>
        </div>
      </div>

      {isSubmitting && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/72 px-4 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-label="Preparando seu diagnóstico"
        >
          <div className="w-full max-w-sm rounded-2xl border border-teal-500/20 bg-slate-900/95 p-7 text-center shadow-2xl shadow-slate-950/60">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-teal-500/20 bg-teal-500/10">
              <Loader2 className="animate-spin text-teal-300" size={24} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">Preparando seu diagnóstico</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Estamos organizando suas respostas e preparando a leitura de segurança.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
