import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useNavigate } from 'react-router-dom';

import {
  AssessmentData,
  BackupResponsibilityLevel,
  CapabilityLevel,
  FirewallManagementLevel,
  OperationalImpactLevel,
  SecurityReportingLevel,
} from '../types';

import {
  loadDraft,
  saveDraft,
  saveSubmission,
} from '../storage';

import {
  saveAssessmentProgress,
  completeAssessment,
} from '../lib/assessment.functions';

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

const Card = ({
  children,
}: {
  children: ReactNode;
}) => (
  <div className="glass-card p-6 md:p-8">
    {children}
  </div>
);

const Field = ({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) => (
  <label className="question-field flex h-full flex-col">
    <span className="question-label flex min-h-0 items-end font-semibold leading-snug text-slate-100 md:min-h-[2.9rem]">
      {label}
    </span>

    <div className="question-control mt-2">
      {children}
    </div>

    <span className="question-help mt-2 block min-h-0 text-sm leading-relaxed text-slate-400 md:min-h-[2.6rem]">
      {help || ''}
    </span>
  </label>
);

const QuestionPair = ({
  children,
}: {
  children: ReactNode;
}) => (
  <div className="grid gap-5 md:grid-cols-2 md:items-stretch">
    {children}
  </div>
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
      <div className="text-2xs font-bold uppercase tracking-[.16em] text-teal-400">
        {eyebrow}
      </div>

      <h3 className="mt-1 text-lg font-bold text-slate-100">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>

    <div className="space-y-5">
      {children}
    </div>
  </section>
);

const AdaptiveHint = ({
  children,
}: {
  children: ReactNode;
}) => (
  <div className="rounded-xl border border-teal-500/15 bg-teal-500/[0.04] px-4 py-3 text-sm leading-relaxed text-slate-400">
    {children}
  </div>
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

const firewallVendors = [
  'MikroTik',
  'Fortinet',
  'SonicWall',
  'Sophos',
  'WatchGuard',
  'Palo Alto Networks',
  'Cisco',
  'Check Point',
  'pfSense / OPNsense',
  'Ubiquiti',
  'Outro',
  'Não sei informar',
];

const endpointVendors = [
  'Kaspersky',
  'Microsoft Defender',
  'Trend Micro',
  'Acronis',
  'SentinelOne',
  'CrowdStrike',
  'Sophos',
  'McAfee',
  'ESET',
  'Bitdefender',
  'Outro',
  'Não sei informar',
];

const backupVendors = [
  'Acronis',
  'Veeam',
  'Microsoft',
  'Synology',
  'Datto',
  'Nakivo',
  'Backup do provedor de nuvem',
  'NAS / armazenamento local',
  'Outro',
  'Não sei informar',
];

const peopleBucket = (n: number) =>
  !n
    ? 0
    : n <= 10
      ? 5
      : n <= 20
        ? 15
        : n <= 50
          ? 35
          : n <= 100
            ? 75
            : n <= 200
              ? 150
              : 250;

const deviceBucket = peopleBucket;

const serverBucket = (n: number) =>
  !n
    ? 0
    : n === 1
      ? 1
      : n <= 5
        ? 3
        : 6;

const teamBucket = (n: number) =>
  !n
    ? 0
    : n === 1
      ? 1
      : n <= 5
        ? 3
        : 6;

const backupBucket = (n: number) =>
  !n
    ? 0
    : n <= 100
      ? 50
      : n <= 500
        ? 300
        : n <= 1000
          ? 750
          : n <= 5000
            ? 3000
            : 7500;

type VpnRemoteChoice =
  | 'unknown'
  | 'none'
  | 'few'
  | 'some'
  | 'most';

type EndpointProtectionChoice =
  | 'unknown'
  | 'yes'
  | 'no';

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
    const saved = localStorage.getItem(
      'concierge-client-assessment-step-v2',
    );

    return saved
      ? parseInt(saved, 10)
      : 0;
  });

  const [a, setA] =
    useState<AssessmentData>(
      () => loadDraft(),
    );

  const [
    vpnRemoteChoice,
    setVpnRemoteChoice,
  ] = useState<VpnRemoteChoice>(() => {
    const savedChoice =
      sessionStorage.getItem(
        'concierge-vpn-remote-choice-v4',
      );

    if (
      savedChoice === 'unknown' ||
      savedChoice === 'none' ||
      savedChoice === 'few' ||
      savedChoice === 'some' ||
      savedChoice === 'most'
    ) {
      return savedChoice;
    }

    if (a.vpnRemote > 20) {
      return 'most';
    }

    if (a.vpnRemote > 5) {
      return 'some';
    }

    if (a.vpnRemote > 0) {
      return 'few';
    }

    return 'unknown';
  });

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const set = (
    key: keyof AssessmentData,
    value: any,
  ) => {
    setA((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const setLinkSpeed = (
    index: number,
    value: number,
  ) => {
    setA((current) => {
      const links = [
        ...current.links,
      ];

      while (
        links.length <= index
      ) {
        links.push({
          speedMbps: 0,
        });
      }

      links[index] = {
        speedMbps:
          Number.isFinite(value)
            ? Math.max(
                0,
                value,
              )
            : 0,
      };

      return {
        ...current,
        links,
      };
    });
  };

  const setLinkCount = (
    value: number,
  ) => {
    const count = Math.max(
      1,
      Math.min(
        5,
        Number.isFinite(value)
          ? value
          : 1,
      ),
    );

    setA((current) => {
      const links = [
        ...current.links,
      ];

      while (
        links.length < count
      ) {
        links.push({
          speedMbps: 0,
        });
      }

      return {
        ...current,
        internetLinkCount: count,
        links: links.slice(
          0,
          count,
        ),
      };
    });
  };

  useEffect(() => {
    localStorage.setItem(
      'concierge-client-assessment-step-v2',
      String(step),
    );
  }, [step]);

  useEffect(() => {
    sessionStorage.setItem(
      'concierge-vpn-remote-choice-v4',
      vpnRemoteChoice,
    );
  }, [vpnRemoteChoice]);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        saveDraft(a);
      }, 300);

    return () =>
      window.clearTimeout(timer);
  }, [a]);

  const steps = useMemo(
    () => [
      {
        name: 'Empresa',
        icon: Building2,
        desc:
          'Primeiro, vamos entender o tamanho e a operação da empresa',
      },
      {
        name: 'Internet e rede',
        icon: Wifi,
        desc:
          'Agora vamos ver como a internet é protegida e acompanhada',
      },
      {
        name: 'Computadores',
        icon: MonitorSmartphone,
        desc:
          'Depois, como os computadores são protegidos quando algo acontece',
      },
      {
        name: 'Dados e backup',
        icon: Database,
        desc:
          'Se algo der errado, queremos entender como a empresa consegue voltar',
      },
      {
        name: 'Contas e segurança',
        icon: KeyRound,
        desc:
          'Por último, acessos, e-mail e preparação para um incidente',
      },
    ],
    [],
  );

  const snapshot =
    JSON.stringify(a);

  useEffect(() => {
    const session =
      loadSession();

    if (!session) {
      return;
    }

    const timer =
      setTimeout(() => {
        void saveAssessmentProgress({
          data: {
            assessmentId:
              session.assessmentId,

            editToken:
              session.editToken,

            step,

            data:
              JSON.parse(
                snapshot,
              ),
          },
        }).catch(() => {});
      }, 900);

    return () =>
      clearTimeout(timer);
  }, [snapshot, step]);

  const submit = async () => {
    if (isSubmitting) {
      return;
    }

    const startedAt =
      performance.now();

    setIsSubmitting(true);

    const session =
      loadSession();

    saveDraft(a);

    if (!session) {
      alert(
        'Não encontramos a sessão deste diagnóstico. Suas respostas continuam salvas neste dispositivo.',
      );

      setIsSubmitting(false);
      return;
    }

    try {
      await completeAssessment({
        data: {
          assessmentId:
            session.assessmentId,

          editToken:
            session.editToken,

          data: a,
        },
      });

      const elapsed =
        performance.now() -
        startedAt;

      const remaining =
        Math.max(
          0,
          950 - elapsed,
        );

      if (remaining > 0) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              remaining,
            ),
        );
      }

      const submission =
        saveSubmission(a);

      nav(
        `/resultado?id=${submission.id}&success=true`,
      );
    } catch (error) {
      console.error(
        'Falha ao concluir assessment:',
        error,
      );

      alert(
        'Não foi possível enviar o diagnóstico neste momento. Suas respostas continuam salvas neste dispositivo.',
      );

      setIsSubmitting(false);
    }
  };

  const current =
    steps[step];

  const sectorValue =
    sectors.includes(a.sector)
      ? a.sector
      : a.sector
        ? 'Outros'
        : '';

  const firewallVendorValue =
    firewallVendors.includes(
      a.firewallVendor,
    )
      ? a.firewallVendor
      : a.firewallVendor
        ? 'Outro'
        : 'Não sei informar';

  const endpointVendorValue =
    a.endpointVendor &&
    endpointVendors.includes(
      a.endpointVendor,
    )
      ? a.endpointVendor
      : a.endpointVendor
        ? 'Outro'
        : 'Não sei informar';

  const backupVendorValue =
    a.backupVendor &&
    backupVendors.includes(
      a.backupVendor,
    )
      ? a.backupVendor
      : a.backupVendor
        ? 'Outro'
        : 'Não sei informar';

  const hasFirewall =
    ![
      'none',
      'isp',
      'unknown',
    ].includes(
      a.firewallLevel,
    );

  const firewallManaged =
    !!a.firewallManagement &&
    ![
      'unknown',
      'unmanaged',
    ].includes(
      a.firewallManagement,
    );

  const endpointProtectionChoice:
    EndpointProtectionChoice =
      a.endpointLevel ===
      'unknown'
        ? 'unknown'
        : a.endpointLevel ===
            'none'
          ? 'no'
          : 'yes';

  const hasEndpointProtection =
    endpointProtectionChoice ===
    'yes';

  const hasBackup =
    ![
      'none',
      'unknown',
    ].includes(
      a.backupLevel,
    );

  if (!accessReady) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech" />
    );
  }

  return (
    <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
      <div className="mx-auto max-w-5xl">
        <ClientHeader />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-400">
            5 etapas curtas
          </div>

          <div className="text-sm text-slate-500">
            Você verá apenas perguntas relevantes às suas respostas.
          </div>
        </div>

        <div className="mb-6 grid grid-cols-5 gap-2">
          {steps.map(
            (item, index) => (
              <div key={item.name}>
                <div
                  className={`h-1.5 rounded-full ${
                    index <= step
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-400'
                      : 'bg-slate-800'
                  }`}
                />

                <div
                  className={`mt-2 hidden text-xs md:block ${
                    index === step
                      ? 'font-semibold text-teal-300'
                      : 'text-slate-600'
                  }`}
                >
                  {item.name}
                </div>
              </div>
            ),
          )}
        </div>

        <Card>
          <div className="mb-7 flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-start">
            <div className="flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-teal-500/20 bg-teal-500/10">
                <current.icon className="text-teal-300" />
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-[.18em] text-teal-400">
                  Etapa {step + 1} de{' '}
                  {steps.length}
                </div>

                <h2 className="mt-1 text-2xl font-bold">
                  {current.name}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  {current.desc}. Responda apenas o que souber. “Não sei informar” é uma resposta válida.
                </p>
              </div>
            </div>

            <div className="mt-1 flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
              Respostas salvas automaticamente
            </div>
          </div>

          {step === 0 && (
            <StepSection
              eyebrow="Começando pela operação"
              title="Antes da tecnologia, queremos entender a empresa"
              description="Essas informações ajudam a comparar a segurança com o tamanho e a realidade da operação."
            >
              <QuestionPair>
                <Field label="Nome da empresa">
                  <input
                    className={input}
                    value={
                      a.companyName
                    }
                    onChange={(e) =>
                      set(
                        'companyName',
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Setor de atuação">
                  <select
                    className={select}
                    value={
                      sectorValue
                    }
                    onChange={(e) =>
                      set(
                        'sector',
                        e.target.value,
                      )
                    }
                  >
                    <option value="">
                      Selecione
                    </option>

                    {sectors.map(
                      (sector) => (
                        <option
                          key={sector}
                          value={sector}
                        >
                          {sector}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              </QuestionPair>

              {sectorValue ===
                'Outros' && (
                <Field label="Qual é o setor?">
                  <input
                    className={input}
                    value={
                      a.sectorOther
                    }
                    onChange={(e) =>
                      set(
                        'sectorOther',
                        e.target.value,
                      )
                    }
                  />
                </Field>
              )}

              <QuestionPair>
                <Field label="Seu nome">
                  <input
                    className={input}
                    value={
                      a.contactName
                    }
                    onChange={(e) =>
                      set(
                        'contactName',
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Cargo">
                  <input
                    className={input}
                    value={
                      a.contactRole
                    }
                    onChange={(e) =>
                      set(
                        'contactRole',
                        e.target.value,
                      )
                    }
                  />
                </Field>
              </QuestionPair>

              <QuestionPair>
                <Field label="E-mail">
                  <input
                    className={input}
                    type="email"
                    value={
                      a.contactEmail
                    }
                    onChange={(e) =>
                      set(
                        'contactEmail',
                        e.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Quantas pessoas utilizam computadores, sistemas ou a rede da empresa?">
                  <select
                    className={select}
                    value={peopleBucket(
                      a.users,
                    )}
                    onChange={(e) =>
                      set(
                        'users',
                        Number(
                          e.target.value,
                        ),
                      )
                    }
                  >
                    <option value="0">
                      Selecione
                    </option>
                    <option value="5">
                      Até 10
                    </option>
                    <option value="15">
                      11 a 20
                    </option>
                    <option value="35">
                      21 a 50
                    </option>
                    <option value="75">
                      51 a 100
                    </option>
                    <option value="150">
                      101 a 200
                    </option>
                    <option value="250">
                      Mais de 200
                    </option>
                  </select>
                </Field>
              </QuestionPair>

              <QuestionPair>
                <Field label="Quantas unidades ou filiais existem?">
                  <input
                    className={input}
                    type="number"
                    min="1"
                    value={
                      a.sites
                    }
                    onChange={(e) =>
                      set(
                        'sites',
                        Number(
                          e.target.value,
                        ),
                      )
                    }
                  />
                </Field>

                <Field label="Quem cuida da TI no dia a dia?">
                  <select
                    className={select}
                    value={teamBucket(
                      a.itTeamSize,
                    )}
                    onChange={(e) =>
                      set(
                        'itTeamSize',
                        Number(
                          e.target.value,
                        ),
                      )
                    }
                  >
                    <option value="0">
                      Sem equipe interna / não sei
                    </option>
                    <option value="1">
                      1 pessoa interna
                    </option>
                    <option value="3">
                      2 a 5 pessoas
                    </option>
                    <option value="6">
                      Mais de 5 pessoas
                    </option>
                  </select>
                </Field>
              </QuestionPair>
            </StepSection>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <StepSection
                eyebrow="Primeiro, a proteção"
                title="Como a internet da empresa é protegida?"
                description="Queremos entender o que existe hoje e quem acompanha essa proteção."
              >
                <QuestionPair>
                  <Field label="Como a empresa protege hoje a conexão com a internet?">
                    <select
                      className={select}
                      value={
                        a.firewallLevel
                      }
                      onChange={(e) =>
                        set(
                          'firewallLevel',
                          e.target.value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>
                      <option value="none">
                        Roteador comum / sem proteção dedicada
                      </option>
                      <option value="isp">
                        Equipamento da operadora
                      </option>
                      <option value="router">
                        MikroTik ou roteador corporativo
                      </option>
                      <option value="utm">
                        Equipamento próprio de segurança
                      </option>
                      <option value="ngfw">
                        Solução com recursos avançados
                      </option>
                      <option value="managed_ngfw">
                        Solução acompanhada por equipe especializada
                      </option>
                    </select>
                  </Field>

                  <Field label="Quem administra esse equipamento?">
                    <select
                      className={select}
                      value={
                        a.firewallManagement ??
                        'unknown'
                      }
                      onChange={(e) =>
                        set(
                          'firewallManagement',
                          e.target
                            .value as FirewallManagementLevel,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>
                      <option value="internal">
                        Equipe interna
                      </option>
                      <option value="outsourced">
                        Empresa terceirizada
                      </option>
                      <option value="shared">
                        Equipe interna + terceirizada
                      </option>
                      <option value="isp">
                        Operadora
                      </option>
                      <option value="unmanaged">
                        Ninguém claramente responsável
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                {hasFirewall && (
                  <QuestionPair>
                    <Field label="Você sabe qual fabricante é utilizado?">
                      <select
                        className={select}
                        value={
                          firewallVendorValue
                        }
                        onChange={(e) =>
                          set(
                            'firewallVendor',
                            e.target.value ===
                              'Não sei informar'
                              ? ''
                              : e.target
                                  .value,
                          )
                        }
                      >
                        {firewallVendors.map(
                          (vendor) => (
                            <option
                              key={vendor}
                              value={vendor}
                            >
                              {vendor}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>

                    <Field
                      label="Modelo, se souber"
                      help="Ex.: TZ80, 40F, RB4011."
                    >
                      <input
                        className={input}
                        value={
                          a.firewallModel
                        }
                        onChange={(e) =>
                          set(
                            'firewallModel',
                            e.target.value,
                          )
                        }
                      />
                    </Field>
                  </QuestionPair>
                )}

                {firewallManaged && (
                  <QuestionPair>
                    <Field label="A empresa recebe relatórios ou acompanhamento do que acontece nesse firewall?">
                      <select
                        className={select}
                        value={
                          a.firewallReporting ??
                          'unknown'
                        }
                        onChange={(e) =>
                          set(
                            'firewallReporting',
                            e.target
                              .value as SecurityReportingLevel,
                          )
                        }
                      >
                        <option value="unknown">
                          Não sei informar
                        </option>
                        <option value="periodic">
                          Sim, periodicamente
                        </option>
                        <option value="on_demand">
                          Apenas quando solicitamos
                        </option>
                        <option value="incident_only">
                          Normalmente só quando ocorre problema
                        </option>
                        <option value="none">
                          Não recebemos
                        </option>
                      </select>
                    </Field>

                    <Field label="Existe alguém acompanhando eventos de segurança 24 horas por dia?">
                      <select
                        className={select}
                        value={
                          a.firewallMonitoring24x7 ??
                          'unknown'
                        }
                        onChange={(e) =>
                          set(
                            'firewallMonitoring24x7',
                            e.target
                              .value as CapabilityLevel,
                          )
                        }
                      >
                        <option value="unknown">
                          Não sei informar
                        </option>
                        <option value="yes">
                          Sim
                        </option>
                        <option value="partial">
                          Apenas em alguns horários
                        </option>
                        <option value="no">
                          Não
                        </option>
                      </select>
                    </Field>
                  </QuestionPair>
                )}

                <QuestionPair>
                  <Field label="Quando algo suspeito acontece na rede, quem costuma verificar?">
                    <select
                      className={select}
                      value={
                        a.monitoring
                      }
                      onChange={(e) =>
                        set(
                          'monitoring',
                          e.target.value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>
                      <option value="none">
                        Ninguém acompanha regularmente
                      </option>
                      <option value="reactive_it">
                        A TI verifica quando aparece um problema
                      </option>
                      <option value="outsourced_it">
                        Uma empresa terceirizada acompanha
                      </option>
                      <option value="security_team">
                        Equipe especializada
                      </option>
                      <option value="soc">
                        Acompanhamento contínuo
                      </option>
                    </select>
                  </Field>

                  <Field label="A proteção da internet consegue bloquear ameaças além de apenas controlar acessos?">
                    <select
                      className={select}
                      value={
                        a.firewallThreatPrevention
                      }
                      onChange={(e) =>
                        set(
                          'firewallThreatPrevention',
                          e.target.value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>
                      <option value="yes">
                        Sim
                      </option>
                      <option value="partial">
                        Algumas proteções
                      </option>
                      <option value="no">
                        Principalmente controle de acessos
                      </option>
                    </select>
                  </Field>
                </QuestionPair>
              </StepSection>

              <StepSection
                eyebrow="Agora, a conexão"
                title="Como a empresa usa a internet?"
                description="Aqui entram alguns dados simples que também ajudam a entender o tamanho real do ambiente."
              >
                <QuestionPair>
                  <Field label="Quantas conexões de internet a empresa possui?">
                    <input
                      className={input}
                      type="number"
                      min="1"
                      max="5"
                      value={
                        a.internetLinkCount
                      }
                      onChange={(e) =>
                        setLinkCount(
                          Number(
                            e.target.value,
                          ),
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Qual a velocidade do principal link?"
                    help="Informe em Mbps. Ex.: 300, 500 ou 1000."
                  >
                    <div className="relative">
                      <input
                        className={`${input} pr-16`}
                        type="number"
                        min="0"
                        value={
                          a.links?.[0]
                            ?.speedMbps ||
                          ''
                        }
                        onChange={(e) =>
                          setLinkSpeed(
                            0,
                            Number(
                              e.target.value,
                            ),
                          )
                        }
                        placeholder="500"
                      />

                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                        Mbps
                      </span>
                    </div>
                  </Field>
                </QuestionPair>

                {a.internetLinkCount >
                  1 ? (
                  <>
                    <QuestionPair>
                      <Field
                        label="Qual a velocidade do segundo link?"
                        help="Se houver mais de dois links, os demais podem ser confirmados depois."
                      >
                        <div className="relative">
                          <input
                            className={`${input} pr-16`}
                            type="number"
                            min="0"
                            value={
                              a.links?.[1]
                                ?.speedMbps ||
                              ''
                            }
                            onChange={(e) =>
                              setLinkSpeed(
                                1,
                                Number(
                                  e.target.value,
                                ),
                              )
                            }
                            placeholder="300"
                          />

                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            Mbps
                          </span>
                        </div>
                      </Field>

                      <Field label="Como a internet é usada no dia a dia?">
                        <select
                          className={select}
                          value={
                            a.networkUsage
                          }
                          onChange={(e) =>
                            set(
                              'networkUsage',
                              e.target.value,
                            )
                          }
                        >
                          <option value="light">
                            Leve — navegação, e-mail e sistemas simples
                          </option>
                          <option value="medium">
                            Médio — cloud e videoconferência
                          </option>
                          <option value="high">
                            Intenso — alto tráfego e múltiplos serviços
                          </option>
                        </select>
                      </Field>
                    </QuestionPair>

                    <QuestionPair>
                      <Field label="Pessoas acessam sistemas da empresa de fora do escritório?">
                        <select
                          className={select}
                          value={
                            vpnRemoteChoice
                          }
                          onChange={(e) => {
                            const value =
                              e.target
                                .value as VpnRemoteChoice;

                            setVpnRemoteChoice(
                              value,
                            );

                            set(
                              'vpnRemote',
                              value === 'few'
                                ? 3
                                : value ===
                                    'some'
                                  ? 10
                                  : value ===
                                      'most'
                                    ? 25
                                    : 0,
                            );
                          }}
                        >
                          <option value="unknown">
                            Não sei informar
                          </option>
                          <option value="none">
                            Não
                          </option>
                          <option value="few">
                            Sim, poucas pessoas
                          </option>
                          <option value="some">
                            Sim, parte da equipe
                          </option>
                          <option value="most">
                            Sim, a maior parte da equipe
                          </option>
                        </select>
                      </Field>

                      <Field label="A rede é separada para diferentes tipos de uso?">
                        <select
                          className={select}
                          value={
                            a.vlans === 0
                              ? 'unknown'
                              : a.vlans === 1
                                ? 'no'
                                : a.vlans ===
                                    2
                                  ? 'partial'
                                  : 'yes'
                          }
                          onChange={(e) =>
                            set(
                              'vlans',
                              e.target.value ===
                                'yes'
                                ? 3
                                : e.target
                                      .value ===
                                    'partial'
                                  ? 2
                                  : e.target
                                        .value ===
                                      'no'
                                    ? 1
                                    : 0,
                            )
                          }
                        >
                          <option value="unknown">
                            Não sei informar
                          </option>
                          <option value="yes">
                            Sim
                          </option>
                          <option value="partial">
                            Parcialmente
                          </option>
                          <option value="no">
                            Não
                          </option>
                        </select>
                      </Field>
                    </QuestionPair>
                  </>
                ) : (
                  <>
                    <QuestionPair>
                      <Field label="Como a internet é usada no dia a dia?">
                        <select
                          className={select}
                          value={
                            a.networkUsage
                          }
                          onChange={(e) =>
                            set(
                              'networkUsage',
                              e.target.value,
                            )
                          }
                        >
                          <option value="light">
                            Leve — navegação, e-mail e sistemas simples
                          </option>
                          <option value="medium">
                            Médio — cloud e videoconferência
                          </option>
                          <option value="high">
                            Intenso — alto tráfego e múltiplos serviços
                          </option>
                        </select>
                      </Field>

                      <Field label="Pessoas acessam sistemas da empresa de fora do escritório?">
                        <select
                          className={select}
                          value={
                            vpnRemoteChoice
                          }
                          onChange={(e) => {
                            const value =
                              e.target
                                .value as VpnRemoteChoice;

                            setVpnRemoteChoice(
                              value,
                            );

                            set(
                              'vpnRemote',
                              value === 'few'
                                ? 3
                                : value ===
                                    'some'
                                  ? 10
                                  : value ===
                                      'most'
                                    ? 25
                                    : 0,
                            );
                          }}
                        >
                          <option value="unknown">
                            Não sei informar
                          </option>
                          <option value="none">
                            Não
                          </option>
                          <option value="few">
                            Sim, poucas pessoas
                          </option>
                          <option value="some">
                            Sim, parte da equipe
                          </option>
                          <option value="most">
                            Sim, a maior parte da equipe
                          </option>
                        </select>
                      </Field>
                    </QuestionPair>

                    <Field label="A rede é separada para diferentes tipos de uso?">
                      <select
                        className={select}
                        value={
                          a.vlans === 0
                            ? 'unknown'
                            : a.vlans === 1
                              ? 'no'
                              : a.vlans ===
                                  2
                                ? 'partial'
                                : 'yes'
                        }
                        onChange={(e) =>
                          set(
                            'vlans',
                            e.target.value ===
                              'yes'
                              ? 3
                              : e.target
                                    .value ===
                                  'partial'
                                ? 2
                                : e.target
                                      .value ===
                                    'no'
                                  ? 1
                                  : 0,
                          )
                        }
                      >
                        <option value="unknown">
                          Não sei informar
                        </option>
                        <option value="yes">
                          Sim
                        </option>
                        <option value="partial">
                          Parcialmente
                        </option>
                        <option value="no">
                          Não
                        </option>
                      </select>
                    </Field>
                  </>
                )}
              </StepSection>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <StepSection
                eyebrow="Agora, os computadores"
                title="Como os computadores são protegidos?"
                description="Você não precisa saber se a solução é antivírus corporativo, EDR ou outro nome técnico."
              >
                <QuestionPair>
                  <Field label="Os computadores possuem antivírus ou alguma solução de segurança?">
                    <select
                      className={select}
                      value={
                        endpointProtectionChoice
                      }
                      onChange={(e) => {
                        const value =
                          e.target
                            .value as EndpointProtectionChoice;

                        if (
                          value ===
                          'unknown'
                        ) {
                          set(
                            'endpointLevel',
                            'unknown',
                          );
                          return;
                        }

                        if (
                          value === 'no'
                        ) {
                          set(
                            'endpointLevel',
                            'none',
                          );
                          return;
                        }

                        set(
                          'endpointLevel',
                          'business_av',
                        );
                      }}
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>
                      <option value="yes">
                        Sim
                      </option>
                      <option value="no">
                        Não
                      </option>
                    </select>
                  </Field>

                  <Field label="Aproximadamente quantos computadores e notebooks existem?">
                    <select
                      className={select}
                      value={deviceBucket(
                        a.endpointCount ||
                          a.devices,
                      )}
                      onChange={(e) => {
                        const value =
                          Number(
                            e.target.value,
                          );

                        set(
                          'endpointCount',
                          value,
                        );

                        set(
                          'devices',
                          value,
                        );
                      }}
                    >
                      <option value="0">
                        Selecione
                      </option>
                      <option value="5">
                        Até 10
                      </option>
                      <option value="15">
                        11 a 20
                      </option>
                      <option value="35">
                        21 a 50
                      </option>
                      <option value="75">
                        51 a 100
                      </option>
                      <option value="150">
                        101 a 200
                      </option>
                      <option value="250">
                        Mais de 200
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                {hasEndpointProtection && (
                  <>
                    <AdaptiveHint>
                      Como já existe uma proteção, vamos usar poucas respostas para entender como ela funciona na prática.
                    </AdaptiveHint>

                    <QuestionPair>
                      <Field label="Você sabe qual solução é utilizada?">
                        <select
                          className={select}
                          value={
                            endpointVendorValue
                          }
                          onChange={(e) =>
                            set(
                              'endpointVendor',
                              e.target.value ===
                                'Não sei informar'
                                ? ''
                                : e.target
                                    .value,
                            )
                          }
                        >
                          {endpointVendors.map(
                            (vendor) => (
                              <option
                                key={vendor}
                                value={vendor}
                              >
                                {vendor}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>

                      <Field
                        label="Produto ou licença, se souber"
                        help="É opcional."
                      >
                        <input
                          className={input}
                          value={
                            a.endpointProduct ??
                            ''
                          }
                          onChange={(e) =>
                            set(
                              'endpointProduct',
                              e.target.value,
                            )
                          }
                        />
                      </Field>
                    </QuestionPair>

                    <QuestionPair>
                      <Field label="A TI consegue acompanhar os computadores e alertas em um único painel?">
                        <select
                          className={select}
                          value={
                            a.endpointCentralManagement
                          }
                          onChange={(e) =>
                            set(
                              'endpointCentralManagement',
                              e.target.value,
                            )
                          }
                        >
                          <option value="unknown">
                            Não sei informar
                          </option>
                          <option value="yes">
                            Sim
                          </option>
                          <option value="partial">
                            Apenas parte dos equipamentos
                          </option>
                          <option value="no">
                            Não
                          </option>
                        </select>
                      </Field>

                      <Field label="Quando aparece um alerta importante, alguém verifica o que aconteceu?">
                        <select
                          className={select}
                          value={
                            a.endpointResponse
                          }
                          onChange={(e) =>
                            set(
                              'endpointResponse',
                              e.target.value,
                            )
                          }
                        >
                          <option value="unknown">
                            Não sei informar
                          </option>
                          <option value="managed_soc">
                            Equipe especializada acompanha e responde
                          </option>
                          <option value="defined_team">
                            Existe uma pessoa ou equipe definida
                          </option>
                          <option value="alerts_only">
                            Alertas são vistos quando necessário
                          </option>
                          <option value="none">
                            Ninguém acompanha
                          </option>
                        </select>
                      </Field>
                    </QuestionPair>
                  </>
                )}
              </StepSection>

              <StepSection
                eyebrow="Visibilidade"
                title="A empresa sabe quais equipamentos precisa proteger?"
                description="Duas respostas ajudam a identificar máquinas esquecidas ou falhas que podem ficar abertas."
              >
                <QuestionPair>
                  <Field label="Existe uma lista atualizada dos computadores e servidores?">
                    <select
                      className={select}
                      value={
                        a.assetInventory
                      }
                      onChange={(e) =>
                        set(
                          'assetInventory',
                          e.target.value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>
                      <option value="managed">
                        Sim, atualizada e gerenciada
                      </option>
                      <option value="partial">
                        Existe, mas pode estar incompleta
                      </option>
                      <option value="informal">
                        Controle informal
                      </option>
                      <option value="none">
                        Não existe
                      </option>
                    </select>
                  </Field>

                  <Field label="A empresa verifica periodicamente se existem atualizações ou falhas de segurança?">
                    <select
                      className={select}
                      value={
                        a.vulnerabilityManagement
                      }
                      onChange={(e) =>
                        set(
                          'vulnerabilityManagement',
                          e.target.value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>
                      <option value="continuous">
                        Acompanhamento contínuo
                      </option>
                      <option value="regular">
                        Verificação periódica
                      </option>
                      <option value="occasional">
                        Ocasionalmente
                      </option>
                      <option value="reactive">
                        Só quando aparece problema
                      </option>
                      <option value="none">
                        Não existe processo
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                <Field label="A empresa possui servidores próprios?">
                  <select
                    className={select}
                    value={serverBucket(
                      a.servers,
                    )}
                    onChange={(e) =>
                      set(
                        'servers',
                        Number(
                          e.target.value,
                        ),
                      )
                    }
                  >
                    <option value="0">
                      Não possui / não sei
                    </option>
                    <option value="1">
                      1 servidor
                    </option>
                    <option value="3">
                      2 a 5 servidores
                    </option>
                    <option value="6">
                      Mais de 5 servidores
                    </option>
                  </select>
                </Field>
              </StepSection>
            </div>
          )}

          {step === 3 && (
            <StepSection
              eyebrow="Agora imagine uma perda"
              title="Se os dados sumissem hoje, o que a empresa conseguiria recuperar?"
              description="Queremos entender se existe backup e se essas cópias realmente ajudariam quando fossem necessárias."
            >
              <QuestionPair>
                <Field label="Onde ficam os arquivos e informações mais importantes?">
                  <select
                    className={select}
                    value={
                      a.dataLocation
                    }
                    onChange={(e) =>
                      set(
                        'dataLocation',
                        e.target.value,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei informar
                    </option>
                    <option value="corporate_central">
                      Local corporativo centralizado
                    </option>
                    <option value="saas_only">
                      Principalmente em sistemas na nuvem
                    </option>
                    <option value="mixed">
                      Espalhados entre vários locais
                    </option>
                    <option value="endpoints">
                      Principalmente nos computadores
                    </option>
                    <option value="personal_cloud">
                      Contas pessoais ou locais não gerenciados
                    </option>
                  </select>
                </Field>

                <Field label="A empresa possui cópias de segurança dos dados importantes?">
                  <select
                    className={select}
                    value={
                      a.backupLevel
                    }
                    onChange={(e) =>
                      set(
                        'backupLevel',
                        e.target.value,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei informar
                    </option>
                    <option value="none">
                      Não
                    </option>
                    <option value="manual">
                      Sim, cópias manuais
                    </option>
                    <option value="automated_local">
                      Sim, automáticas dentro da empresa
                    </option>
                    <option value="cloud">
                      Sim, automáticas em nuvem
                    </option>
                    <option value="multi_copy">
                      Sim, em mais de um local
                    </option>
                    <option value="managed">
                      Sim, rotina gerenciada
                    </option>
                  </select>
                </Field>
              </QuestionPair>

              <QuestionPair>
                <Field label="Aproximadamente quanto de informação precisa ser protegida?">
                  <select
                    className={select}
                    value={backupBucket(
                      a.backupVolumeGb,
                    )}
                    onChange={(e) =>
                      set(
                        'backupVolumeGb',
                        Number(
                          e.target.value,
                        ),
                      )
                    }
                  >
                    <option value="0">
                      Não sei informar
                    </option>
                    <option value="50">
                      Até 100 GB
                    </option>
                    <option value="300">
                      100 a 500 GB
                    </option>
                    <option value="750">
                      500 GB a 1 TB
                    </option>
                    <option value="3000">
                      1 a 5 TB
                    </option>
                    <option value="7500">
                      Mais de 5 TB
                    </option>
                  </select>
                </Field>

                <Field label="Se os sistemas principais parassem hoje, o que aconteceria?">
                  <select
                    className={select}
                    value={
                      a.operationalImpact ??
                      'unknown'
                    }
                    onChange={(e) =>
                      set(
                        'operationalImpact',
                        e.target
                          .value as OperationalImpactLevel,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei informar
                    </option>
                    <option value="low">
                      Continuaríamos quase normalmente
                    </option>
                    <option value="partial">
                      Parte da empresa ficaria parada
                    </option>
                    <option value="major">
                      A maior parte ficaria parada
                    </option>
                    <option value="halt">
                      A operação praticamente pararia
                    </option>
                  </select>
                </Field>
              </QuestionPair>

              {hasBackup && (
                <>
                  <QuestionPair>
                    <Field label="Quem é responsável pelo backup?">
                      <select
                        className={select}
                        value={
                          a.backupResponsibility ??
                          'unknown'
                        }
                        onChange={(e) =>
                          set(
                            'backupResponsibility',
                            e.target
                              .value as BackupResponsibilityLevel,
                          )
                        }
                      >
                        <option value="unknown">
                          Não sei informar
                        </option>
                        <option value="internal">
                          Equipe interna
                        </option>
                        <option value="outsourced">
                          Empresa terceirizada
                        </option>
                        <option value="shared">
                          Interna + terceirizada
                        </option>
                        <option value="nobody">
                          Ninguém claramente responsável
                        </option>
                      </select>
                    </Field>

                    <Field label="Você sabe qual solução é utilizada?">
                      <select
                        className={select}
                        value={
                          backupVendorValue
                        }
                        onChange={(e) =>
                          set(
                            'backupVendor',
                            e.target.value ===
                              'Não sei informar'
                              ? ''
                              : e.target
                                  .value,
                          )
                        }
                      >
                        {backupVendors.map(
                          (vendor) => (
                            <option
                              key={vendor}
                              value={vendor}
                            >
                              {vendor}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                  </QuestionPair>

                  <QuestionPair>
                    <Field label="Existe uma cópia protegida caso o ambiente principal seja atacado?">
                      <select
                        className={select}
                        value={
                          a.backupIsolation
                        }
                        onChange={(e) =>
                          set(
                            'backupIsolation',
                            e.target.value,
                          )
                        }
                      >
                        <option value="unknown">
                          Não sei informar
                        </option>
                        <option value="immutable">
                          Sim, protegida contra alteração
                        </option>
                        <option value="isolated">
                          Sim, separada ou offline
                        </option>
                        <option value="separate_account">
                          Sim, administrada separadamente
                        </option>
                        <option value="same_environment">
                          Depende do mesmo ambiente ou credenciais
                        </option>
                        <option value="none">
                          Não
                        </option>
                      </select>
                    </Field>

                    <Field label="A empresa já testou se consegue recuperar os dados?">
                      <select
                        className={select}
                        value={
                          a.restoreTests
                        }
                        onChange={(e) =>
                          set(
                            'restoreTests',
                            e.target.value,
                          )
                        }
                      >
                        <option value="unknown">
                          Não sei informar
                        </option>
                        <option value="regular">
                          Sim, periodicamente
                        </option>
                        <option value="once">
                          Já testamos alguma vez
                        </option>
                        <option value="never">
                          Nunca testamos
                        </option>
                      </select>
                    </Field>
                  </QuestionPair>
                </>
              )}

              <Field label="Por quanto tempo a empresa consegue ficar sem os sistemas ou dados mais importantes?">
                <select
                  className={select}
                  value={
                    a.maxDowntime
                  }
                  onChange={(e) =>
                    set(
                      'maxDowntime',
                      e.target.value,
                    )
                  }
                >
                  <option value="unknown">
                    Não sei informar
                  </option>
                  <option value="4h">
                    Até 4 horas
                  </option>
                  <option value="8h">
                    Até 8 horas
                  </option>
                  <option value="1d">
                    Até 1 dia
                  </option>
                  <option value="2d">
                    Até 2 dias
                  </option>
                  <option value="more">
                    Mais de 2 dias
                  </option>
                </select>
              </Field>
            </StepSection>
          )}

          {step === 4 && (
            <StepSection
              eyebrow="Última etapa"
              title="Quem consegue entrar e o que acontece se algo der errado?"
              description="Essas respostas fecham a visão com contas, e-mail e capacidade de reação."
            >
              <QuestionPair>
                <Field label="Nas contas mais importantes, existe alguma confirmação além da senha?">
                  <select
                    className={select}
                    value={a.mfa}
                    onChange={(e) =>
                      set(
                        'mfa',
                        e.target.value,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei informar
                    </option>
                    <option value="yes">
                      Sim, de forma ampla
                    </option>
                    <option value="partial">
                      Apenas em algumas contas
                    </option>
                    <option value="no">
                      Não
                    </option>
                  </select>
                </Field>

                <Field label="Mais de uma pessoa utiliza a mesma conta ou senha?">
                  <select
                    className={select}
                    value={
                      a.sharedAccounts
                    }
                    onChange={(e) =>
                      set(
                        'sharedAccounts',
                        e.target.value,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei informar
                    </option>
                    <option value="yes">
                      Sim
                    </option>
                    <option value="no">
                      Não
                    </option>
                  </select>
                </Field>
              </QuestionPair>

              <QuestionPair>
                <Field label="Quando alguém sai da empresa, os acessos são removidos?">
                  <select
                    className={select}
                    value={
                      a.offboarding
                    }
                    onChange={(e) =>
                      set(
                        'offboarding',
                        e.target.value,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei informar
                    </option>
                    <option value="formal">
                      Sim, existe processo definido
                    </option>
                    <option value="informal">
                      É feito caso a caso
                    </option>
                  </select>
                </Field>

                <Field label="A empresa utiliza dados pessoais ou informações sensíveis?">
                  <select
                    className={select}
                    value={
                      a.sensitiveData
                    }
                    onChange={(e) =>
                      set(
                        'sensitiveData',
                        e.target.value,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei informar
                    </option>
                    <option value="yes">
                      Sim
                    </option>
                    <option value="no">
                      Não
                    </option>
                  </select>
                </Field>
              </QuestionPair>

              <QuestionPair>
                <Field label="O e-mail possui alguma proteção além do filtro padrão de spam?">
                  <select
                    className={select}
                    value={
                      a.emailProtection
                    }
                    onChange={(e) =>
                      set(
                        'emailProtection',
                        e.target.value,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei informar
                    </option>
                    <option value="advanced">
                      Sim, proteção avançada
                    </option>
                    <option value="standard">
                      Sim, proteção adicional
                    </option>
                    <option value="basic">
                      Apenas filtro padrão
                    </option>
                    <option value="none">
                      Não
                    </option>
                  </select>
                </Field>

                <Field label="Se acontecer um problema de segurança hoje, a empresa sabe quem deve coordenar a resposta?">
                  <select
                    className={select}
                    value={
                      a.incidentResponse
                    }
                    onChange={(e) =>
                      set(
                        'incidentResponse',
                        e.target.value,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei informar
                    </option>
                    <option value="formal">
                      Sim, responsável e processo definidos
                    </option>
                    <option value="informal">
                      Sabemos quem chamar
                    </option>
                    <option value="none">
                      Não
                    </option>
                  </select>
                </Field>
              </QuestionPair>

              <QuestionPair>
                <Field label="A empresa já passou por vírus, invasão, perda de dados ou uma parada importante?">
                  <select
                    className={select}
                    value={
                      a.incidentHistory
                    }
                    onChange={(e) =>
                      set(
                        'incidentHistory',
                        e.target.value,
                      )
                    }
                  >
                    <option value="unknown">
                      Não sei / prefiro não informar
                    </option>
                    <option value="no">
                      Não
                    </option>
                    <option value="yes">
                      Sim
                    </option>
                  </select>
                </Field>

                <Field label="Qual situação mais preocupa a empresa hoje?">
                  <input
                    className={input}
                    value={
                      a.mainConcern
                    }
                    onChange={(e) =>
                      set(
                        'mainConcern',
                        e.target.value,
                      )
                    }
                    placeholder="Ex.: perda de dados, golpe por e-mail..."
                  />
                </Field>
              </QuestionPair>

              <Field
                label="Existe alguma informação importante que gostaria de acrescentar?"
                help="Não informe senhas, credenciais ou outros dados confidenciais desnecessários."
              >
                <textarea
                  className={input}
                  rows={4}
                  maxLength={1000}
                  value={a.notes}
                  onChange={(e) =>
                    set(
                      'notes',
                      e.target.value,
                    )
                  }
                />
              </Field>
            </StepSection>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
            <button
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800/60 disabled:opacity-30"
              disabled={
                step === 0 ||
                isSubmitting
              }
              onClick={() =>
                setStep(
                  (currentStep) =>
                    currentStep - 1,
                )
              }
            >
              <ArrowLeft size={18} />
              Voltar
            </button>

            {step <
            steps.length - 1 ? (
              <button
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold hover:bg-teal-500"
                onClick={() => {
                  setStep(
                    (currentStep) =>
                      currentStep + 1,
                  );

                  window.scrollTo({
                    top: 0,
                    behavior:
                      'smooth',
                  });
                }}
              >
                Continuar
                <ArrowRight
                  size={18}
                />
              </button>
            ) : (
              <button
                className="flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold hover:bg-teal-500 disabled:cursor-wait disabled:bg-teal-700"
                onClick={submit}
                disabled={
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Processando diagnóstico...
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={18}
                    />
                    Ver meu diagnóstico
                  </>
                )}
              </button>
            )}
          </div>
        </Card>

        <div className="mt-5 flex gap-2 text-sm leading-relaxed text-slate-500">
          <Info
            className="mt-0.5 shrink-0"
            size={17}
          />

          <span>
            O resultado é um diagnóstico inicial baseado nas informações fornecidas. Quando algo não puder ser confirmado, será tratado como ponto a validar.
          </span>
        </div>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/72 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border border-teal-500/20 bg-slate-900/95 p-7 text-center">
            <Loader2
              className="mx-auto animate-spin text-teal-300"
              size={28}
            />

            <h3 className="mt-4 text-lg font-bold text-white">
              Preparando seu diagnóstico
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Estamos relacionando suas respostas para identificar quais pontos merecem mais atenção.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}