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

export default function AssessmentForm() {
  const nav = useNavigate();

  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(
      'concierge-client-assessment-step-v2',
    );

    return saved
      ? parseInt(saved, 10)
      : 0;
  });

  const [a, setA] = useState<AssessmentData>(
    () => loadDraft(),
  );

  const [vpnRemoteChoice, setVpnRemoteChoice] =
    useState<
      | 'unknown'
      | 'none'
      | 'few'
      | 'some'
      | 'most'
    >(() => {
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

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const set = (
    key: keyof AssessmentData,
    value: any,
  ) =>
    setA((current) => ({
      ...current,
      [key]: value,
    }));

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
    const timer = window.setTimeout(
      () => {
        saveDraft(a);
      },
      300,
    );

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

  const snapshot = JSON.stringify(a);

  useEffect(() => {
    const session = loadSession();

    if (!session) {
      return;
    }

    const timer = setTimeout(() => {
      void saveAssessmentProgress({
        data: {
          assessmentId:
            session.assessmentId,

          editToken:
            session.editToken,

          step,

          data:
            JSON.parse(snapshot),
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

    const minimumTransitionMs = 950;

    setIsSubmitting(true);

    const session =
      loadSession();

    saveDraft(a);

    if (!session) {
      alert(
        'Não encontramos a sessão deste diagnóstico. ' +
          'Suas respostas continuam salvas neste dispositivo.',
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

      const remaining = Math.max(
        0,
        minimumTransitionMs -
          elapsed,
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
        'Não foi possível enviar o diagnóstico neste momento. ' +
          'Suas respostas continuam salvas neste dispositivo. ' +
          'Verifique sua conexão e tente novamente.',
      );

      setIsSubmitting(false);
    }
  };

  const current =
    steps[step];

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

  const sectorValue =
    sectors.includes(a.sector)
      ? a.sector
      : a.sector
        ? 'Outros'
        : '';

  const sectorOtherValue =
    a.sector === 'Outros'
      ? a.sectorOther
      : !sectors.includes(a.sector)
        ? a.sector
        : a.sectorOther;

  const hasFirewall =
    ![
      'none',
      'isp',
      'unknown',
    ].includes(
      a.firewallLevel,
    );

  const firewallManaged =
    a.firewallManagement &&
    ![
      'unknown',
      'unmanaged',
    ].includes(
      a.firewallManagement,
    );

  const hasEndpointProtection =
    ![
      'none',
      'unknown',
    ].includes(
      a.endpointLevel,
    );

  const hasBackup =
    ![
      'none',
      'unknown',
    ].includes(
      a.backupLevel,
    );

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
                  className={`h-1.5 rounded-full transition ${
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
                  {current.desc}. Responda
                  apenas o que souber.
                  “Não sei informar” é
                  uma resposta válida.
                </p>
              </div>
            </div>

            <div className="mt-1 flex shrink-0 items-center gap-1.5 self-end rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-500 sm:self-start">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />

              <span>
                Respostas salvas automaticamente
              </span>
            </div>
          </div>

          {step === 0 && (
            <div className="space-y-6">
              <StepSection
                eyebrow="Começando pela operação"
                title="Antes da tecnologia, queremos entender a empresa"
                description="Essas informações ajudam a comparar os controles de segurança com o tamanho e a realidade da operação."
              >
                <QuestionPair>
                  <Field label="Nome da empresa">
                    <input
                      className={input}
                      value={a.companyName}
                      onChange={(event) =>
                        set(
                          'companyName',
                          event.target.value,
                        )
                      }
                      placeholder="Ex.: Empresa ABC"
                    />
                  </Field>

                  <Field label="Setor de atuação">
                    <div className="space-y-2">
                      <select
                        className={select}
                        value={
                          sectorValue
                        }
                        onChange={(
                          event,
                        ) => {
                          set(
                            'sector',
                            event.target
                              .value,
                          );

                          if (
                            event.target
                              .value !==
                            'Outros'
                          ) {
                            set(
                              'sectorOther',
                              '',
                            );
                          }
                        }}
                      >
                        <option value="">
                          Selecione o setor
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

                      {sectorValue ===
                        'Outros' && (
                        <input
                          className={
                            input
                          }
                          value={
                            sectorOtherValue
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'sectorOther',
                              event.target
                                .value,
                            )
                          }
                          placeholder="Informe o setor"
                          aria-label="Qual é o setor de atuação?"
                        />
                      )}
                    </div>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field label="Seu nome">
                    <input
                      className={input}
                      value={a.contactName}
                      onChange={(event) =>
                        set(
                          'contactName',
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Cargo">
                    <input
                      className={input}
                      value={a.contactRole}
                      onChange={(event) =>
                        set(
                          'contactRole',
                          event.target.value,
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
                      onChange={(event) =>
                        set(
                          'contactEmail',
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Quantas pessoas utilizam computadores, sistemas ou a rede da empresa?"
                    help="Considere funcionários e colaboradores que utilizam os recursos de TI regularmente."
                  >
                    <select
                      className={select}
                      value={peopleBucket(
                        a.users,
                      )}
                      onChange={(event) =>
                        set(
                          'users',
                          +event.target
                            .value,
                        )
                      }
                    >
                      <option value="0">
                        Selecione uma faixa
                      </option>

                      <option value="5">
                        Até 10 pessoas
                      </option>

                      <option value="15">
                        11 a 20 pessoas
                      </option>

                      <option value="35">
                        21 a 50 pessoas
                      </option>

                      <option value="75">
                        51 a 100 pessoas
                      </option>

                      <option value="150">
                        101 a 200 pessoas
                      </option>

                      <option value="250">
                        Mais de 200 pessoas
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field
                    label="Quantas unidades ou filiais a empresa possui?"
                    help="Considere matriz, filiais ou unidades que façam parte deste diagnóstico."
                  >
                    <input
                      className={input}
                      type="number"
                      min="1"
                      value={a.sites}
                      onChange={(event) =>
                        set(
                          'sites',
                          +event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Quem cuida da TI no dia a dia?"
                    help="Isso ajuda a entender quem normalmente administra equipamentos, sistemas e acessos."
                  >
                    <select
                      className={select}
                      value={teamBucket(
                        a.itTeamSize,
                      )}
                      onChange={(event) =>
                        set(
                          'itTeamSize',
                          +event.target
                            .value,
                        )
                      }
                    >
                      <option value="0">
                        Não há equipe interna / não sei informar
                      </option>

                      <option value="1">
                        1 pessoa interna
                      </option>

                      <option value="3">
                        2 a 5 pessoas internas
                      </option>

                      <option value="6">
                        Mais de 5 pessoas internas
                      </option>
                    </select>
                  </Field>
                </QuestionPair>
              </StepSection>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <StepSection
                eyebrow="Primeiro, a porta de entrada"
                title="Como a internet da empresa é protegida?"
                description="Queremos entender o que existe hoje e, principalmente, quem acompanha essa proteção quando algo acontece."
              >
                <QuestionPair>
                  <Field
                    label="Como a empresa protege hoje a conexão com a internet?"
                    help="Escolha a opção mais próxima. O nome do equipamento, sozinho, não define se a proteção é boa ou ruim."
                  >
                    <select
                      className={select}
                      value={
                        a.firewallLevel
                      }
                      onChange={(event) => {
                        set(
                          'firewallLevel',
                          event.target
                            .value,
                        );

                        if (
                          [
                            'none',
                            'isp',
                            'unknown',
                          ].includes(
                            event.target
                              .value,
                          )
                        ) {
                          set(
                            'firewallVendor',
                            '',
                          );

                          set(
                            'firewallModel',
                            '',
                          );
                        }
                      }}
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="none">
                        Não existe uma proteção dedicada além do roteador comum
                      </option>

                      <option value="isp">
                        Usa apenas o equipamento fornecido pela operadora
                      </option>

                      <option value="router">
                        Usa MikroTik ou outro roteador corporativo
                      </option>

                      <option value="utm">
                        Usa um equipamento próprio para proteger a rede
                      </option>

                      <option value="ngfw">
                        Usa uma solução com recursos avançados de segurança
                      </option>

                      <option value="managed_ngfw">
                        Usa uma solução de segurança acompanhada por equipe especializada
                      </option>
                    </select>
                  </Field>

                  <Field
                    label="Quem administra esse equipamento no dia a dia?"
                    help="Queremos entender quem altera regras, acompanha funcionamento e responde quando algo precisa ser ajustado."
                  >
                    <select
                      className={select}
                      value={
                        a.firewallManagement ??
                        'unknown'
                      }
                      onChange={(event) =>
                        set(
                          'firewallManagement',
                          event.target
                            .value as FirewallManagementLevel,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="internal">
                        Nossa própria equipe de TI
                      </option>

                      <option value="outsourced">
                        Uma empresa terceirizada
                      </option>

                      <option value="shared">
                        Nossa equipe e uma empresa terceirizada
                      </option>

                      <option value="isp">
                        A operadora de internet
                      </option>

                      <option value="unmanaged">
                        Não existe alguém claramente responsável
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                {hasFirewall && (
                  <QuestionPair>
                    <Field label="Você sabe qual equipamento ou fabricante é utilizado?">
                      <select
                        className={select}
                        value={
                          firewallVendorValue
                        }
                        onChange={(event) =>
                          set(
                            'firewallVendor',
                            event.target
                              .value ===
                              'Não sei informar'
                              ? ''
                              : event.target
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
                      help="É opcional. Ex.: 40F, TZ80, RB4011."
                    >
                      <input
                        className={input}
                        value={
                          a.firewallModel
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'firewallModel',
                            event.target
                              .value,
                          )
                        }
                        placeholder="Pode deixar em branco"
                      />
                    </Field>
                  </QuestionPair>
                )}

                {firewallVendorValue ===
                  'Outro' &&
                  hasFirewall && (
                    <Field label="Qual é o fabricante?">
                      <input
                        className={input}
                        value={
                          a.firewallVendor ===
                          'Outro'
                            ? ''
                            : a.firewallVendor
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'firewallVendor',
                            event.target
                              .value,
                          )
                        }
                        placeholder="Informe o fabricante"
                      />
                    </Field>
                  )}

                {firewallManaged && (
                  <>
                    <AdaptiveHint>
                      Como existe alguém
                      responsável por essa
                      proteção, vamos entender
                      rapidamente o quanto a
                      empresa consegue enxergar
                      o que está acontecendo.
                    </AdaptiveHint>

                    <QuestionPair>
                      <Field
                        label="A empresa recebe algum acompanhamento do que acontece nesse firewall?"
                        help="Pode ser relatório, reunião periódica ou resumo dos eventos identificados."
                      >
                        <select
                          className={
                            select
                          }
                          value={
                            a.firewallReporting ??
                            'unknown'
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'firewallReporting',
                              event.target
                                .value as SecurityReportingLevel,
                            )
                          }
                        >
                          <option value="unknown">
                            Não sei informar
                          </option>

                          <option value="periodic">
                            Sim, recebemos relatórios ou acompanhamento periódico
                          </option>

                          <option value="on_demand">
                            Recebemos quando solicitamos
                          </option>

                          <option value="incident_only">
                            Normalmente só quando acontece algum problema
                          </option>

                          <option value="none">
                            Não recebemos acompanhamento
                          </option>
                        </select>
                      </Field>

                      <Field
                        label="Existe alguém acompanhando eventos de segurança continuamente, inclusive fora do horário comercial?"
                        help="Não precisa saber o nome técnico. Queremos apenas entender se existe acompanhamento 24x7."
                      >
                        <select
                          className={
                            select
                          }
                          value={
                            a.firewallMonitoring24x7 ??
                            'unknown'
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'firewallMonitoring24x7',
                              event.target
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
                            Apenas em alguns horários ou situações
                          </option>

                          <option value="no">
                            Não
                          </option>
                        </select>
                      </Field>
                    </QuestionPair>
                  </>
                )}

                <QuestionPair>
                  <Field
                    label="Quando algo suspeito acontece na rede, quem costuma receber ou verificar os alertas?"
                    help="Aqui queremos saber quem efetivamente olha o que aconteceu."
                  >
                    <select
                      className={select}
                      value={a.monitoring}
                      onChange={(event) =>
                        set(
                          'monitoring',
                          event.target
                            .value,
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
                        A TI verifica quando surge algum problema
                      </option>

                      <option value="outsourced_it">
                        Uma empresa terceirizada acompanha
                      </option>

                      <option value="security_team">
                        Uma equipe especializada de segurança acompanha
                      </option>

                      <option value="soc">
                        Existe acompanhamento contínuo por equipe especializada
                      </option>
                    </select>
                  </Field>

                  <Field
                    label="A proteção da internet consegue bloquear ameaças além de simplesmente permitir ou negar acessos?"
                    help="Por exemplo: tentativas de ataque, sites maliciosos ou aplicações indevidas."
                  >
                    <select
                      className={select}
                      value={
                        a.firewallThreatPrevention
                      }
                      onChange={(event) =>
                        set(
                          'firewallThreatPrevention',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="yes">
                        Sim, existem várias proteções adicionais
                      </option>

                      <option value="partial">
                        Existem algumas proteções adicionais
                      </option>

                      <option value="no">
                        Atua principalmente controlando acessos
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field label="Alguém revisa e atualiza regularmente os equipamentos que protegem a rede?">
                    <select
                      className={select}
                      value={
                        a.networkMaintenance
                      }
                      onChange={(event) =>
                        set(
                          'networkMaintenance',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="formal">
                        Sim, existe uma rotina definida
                      </option>

                      <option value="informal">
                        É feito quando necessário
                      </option>

                      <option value="none">
                        Não existe rotina definida
                      </option>
                    </select>
                  </Field>

                  {hasFirewall ? (
                    <Field
                      label="Os recursos contratados dessa solução estão ativos e atualizados?"
                      help="Alguns equipamentos oferecem recursos adicionais que dependem de licenciamento."
                    >
                      <select
                        className={
                          select
                        }
                        value={
                          a.firewallLicense
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'firewallLicense',
                            event.target
                              .value,
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
                  ) : (
                    <div className="hidden md:block" />
                  )}
                </QuestionPair>
              </StepSection>

              <StepSection
                eyebrow="Agora, a conexão"
                title="Como a empresa usa a internet?"
                description="Esses dados também ajudam a entender a complexidade do ambiente sem precisar entrar em detalhes técnicos."
              >
                <QuestionPair>
                  <Field label="Quantas conexões de internet a empresa possui?">
                    <input
                      className={input}
                      type="number"
                      min="1"
                      value={
                        a.internetLinkCount
                      }
                      onChange={(event) =>
                        set(
                          'internetLinkCount',
                          +event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="Qual é aproximadamente a velocidade da internet?"
                    help="Escolha a opção mais próxima."
                  >
                    <select
                      className={select}
                      value={
                        !a.links[0]
                          ?.speedMbps
                          ? 'unknown'
                          : a.links[0]
                                .speedMbps <=
                              100
                            ? '100'
                            : a.links[0]
                                  .speedMbps <=
                                300
                              ? '300'
                              : a.links[0]
                                    .speedMbps <=
                                  500
                                ? '500'
                                : a.links[0]
                                      .speedMbps <=
                                    1000
                                  ? '1000'
                                  : '1500'
                      }
                      onChange={(event) =>
                        set(
                          'links',
                          [
                            {
                              speedMbps:
                                event
                                  .target
                                  .value ===
                                'unknown'
                                  ? 0
                                  : Number(
                                      event
                                        .target
                                        .value,
                                    ),
                            },
                          ],
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="100">
                        Até 100 Mbps
                      </option>

                      <option value="300">
                        101 a 300 Mbps
                      </option>

                      <option value="500">
                        301 a 500 Mbps
                      </option>

                      <option value="1000">
                        501 Mbps a 1 Gbps
                      </option>

                      <option value="1500">
                        Mais de 1 Gbps
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field label="Como a internet é usada no dia a dia?">
                    <select
                      className={select}
                      value={
                        a.networkUsage
                      }
                      onChange={(event) =>
                        set(
                          'networkUsage',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="light">
                        Leve — navegação, e-mail e sistemas simples
                      </option>

                      <option value="medium">
                        Médio — cloud, videoconferência e uso frequente
                      </option>

                      <option value="high">
                        Intenso — alto tráfego, múltiplos serviços e transferências
                      </option>
                    </select>
                  </Field>

                  <Field
                    label="Pessoas acessam sistemas da empresa de fora do escritório?"
                    help="Pode ser por VPN ou outra forma de acesso remoto."
                  >
                    <select
                      className={select}
                      value={
                        vpnRemoteChoice
                      }
                      onChange={(event) => {
                        const choice =
                          event.target
                            .value as
                            | 'unknown'
                            | 'none'
                            | 'few'
                            | 'some'
                            | 'most';

                        setVpnRemoteChoice(
                          choice,
                        );

                        set(
                          'vpnRemote',
                          choice === 'few'
                            ? 3
                            : choice ===
                                'some'
                              ? 10
                              : choice ===
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

                <QuestionPair>
                  <Field
                    label="Existem conexões seguras entre matriz e filiais? Quantas?"
                    help="Se não souber, pode deixar em branco."
                  >
                    <input
                      className={input}
                      type="number"
                      min="0"
                      value={
                        a.vpnSite || ''
                      }
                      onChange={(event) =>
                        set(
                          'vpnSite',
                          +event.target
                            .value,
                        )
                      }
                    />
                  </Field>

                  <Field
                    label="A rede é separada para diferentes tipos de uso?"
                    help="Por exemplo: funcionários, visitantes, servidores ou equipamentos específicos."
                  >
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
                      onChange={(event) =>
                        set(
                          'vlans',
                          event.target
                            .value ===
                            'yes'
                            ? 3
                            : event
                                  .target
                                  .value ===
                                'partial'
                              ? 2
                              : event
                                    .target
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
              </StepSection>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <StepSection
                eyebrow="Agora, os computadores"
                title="O que acontece quando uma ameaça chega a um dispositivo?"
                description="Ter uma ferramenta instalada é importante. Também queremos entender se alguém consegue enxergar e reagir quando ela identifica algo."
              >
                <QuestionPair>
                  <Field
                    label="Os computadores utilizam antivírus ou outra proteção de segurança?"
                    help="Escolha a opção mais próxima do que existe hoje."
                  >
                    <select
                      className={select}
                      value={
                        a.endpointLevel
                      }
                      onChange={(event) => {
                        set(
                          'endpointLevel',
                          event.target
                            .value,
                        );

                        if (
                          [
                            'none',
                            'unknown',
                          ].includes(
                            event.target
                              .value,
                          )
                        ) {
                          set(
                            'endpointVendor',
                            '',
                          );

                          set(
                            'endpointProduct',
                            '',
                          );
                        }
                      }}
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="none">
                        Não existe uma proteção padronizada
                      </option>

                      <option value="basic_av">
                        Sim, antivírus instalado individualmente
                      </option>

                      <option value="business_av">
                        Sim, antivírus corporativo administrado pela empresa ou TI
                      </option>

                      <option value="edr">
                        Sim, existe proteção que também ajuda a investigar comportamentos suspeitos
                      </option>

                      <option value="managed_edr">
                        Sim, existe proteção avançada acompanhada por equipe especializada
                      </option>
                    </select>
                  </Field>

                  <Field
                    label="Aproximadamente quantos computadores e notebooks a empresa utiliza?"
                    help="Escolha a opção mais próxima."
                  >
                    <select
                      className={select}
                      value={deviceBucket(
                        a.endpointCount ||
                          a.devices,
                      )}
                      onChange={(event) => {
                        set(
                          'endpointCount',
                          +event.target
                            .value,
                        );

                        set(
                          'devices',
                          +event.target
                            .value,
                        );
                      }}
                    >
                      <option value="0">
                        Selecione uma faixa
                      </option>

                      <option value="5">
                        Até 10 equipamentos
                      </option>

                      <option value="15">
                        11 a 20 equipamentos
                      </option>

                      <option value="35">
                        21 a 50 equipamentos
                      </option>

                      <option value="75">
                        51 a 100 equipamentos
                      </option>

                      <option value="150">
                        101 a 200 equipamentos
                      </option>

                      <option value="250">
                        Mais de 200 equipamentos
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                {hasEndpointProtection && (
                  <>
                    <AdaptiveHint>
                      Como você informou que
                      já existe uma proteção,
                      vamos usar só duas
                      informações para
                      entender melhor o que
                      essa camada realmente
                      entrega.
                    </AdaptiveHint>

                    <QuestionPair>
                      <Field label="Você sabe qual solução ou fabricante é utilizado?">
                        <select
                          className={
                            select
                          }
                          value={
                            endpointVendorValue
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'endpointVendor',
                              event.target
                                .value ===
                                'Não sei informar'
                                ? ''
                                : event.target
                                    .value,
                            )
                          }
                        >
                          {endpointVendors.map(
                            (
                              vendor,
                            ) => (
                              <option
                                key={
                                  vendor
                                }
                                value={
                                  vendor
                                }
                              >
                                {vendor}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>

                      <Field
                        label="Você sabe qual produto ou licença é utilizada?"
                        help="Ex.: Kaspersky Next EDR Foundations, Defender for Business, Trend Vision One. É opcional."
                      >
                        <input
                          className={
                            input
                          }
                          value={
                            a.endpointProduct ??
                            ''
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'endpointProduct',
                              event.target
                                .value,
                            )
                          }
                          placeholder="Pode deixar em branco"
                        />
                      </Field>
                    </QuestionPair>

                    {endpointVendorValue ===
                      'Outro' && (
                      <Field label="Qual é o fabricante?">
                        <input
                          className={
                            input
                          }
                          value={
                            a.endpointVendor ===
                            'Outro'
                              ? ''
                              : a.endpointVendor ??
                                ''
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'endpointVendor',
                              event.target
                                .value,
                            )
                          }
                          placeholder="Informe o fabricante"
                        />
                      </Field>
                    )}
                  </>
                )}

                {hasEndpointProtection && (
                  <QuestionPair>
                    <Field
                      label="A TI consegue acompanhar e administrar a proteção dos computadores em um único lugar?"
                      help="Por exemplo, saber quais máquinas estão protegidas, receber alertas e aplicar configurações."
                    >
                      <select
                        className={select}
                        value={
                          a.endpointCentralManagement
                        }
                        onChange={(event) =>
                          set(
                            'endpointCentralManagement',
                            event.target
                              .value,
                          )
                        }
                      >
                        <option value="unknown">
                          Não sei informar
                        </option>

                        <option value="yes">
                          Sim, todos ou quase todos
                        </option>

                        <option value="partial">
                          Apenas parte dos equipamentos
                        </option>

                        <option value="no">
                          Não
                        </option>
                      </select>
                    </Field>

                    <Field
                      label="Quando uma ameaça é detectada, alguém acompanha o que aconteceu?"
                      help="Queremos saber se o alerta vira investigação e ação."
                    >
                      <select
                        className={select}
                        value={
                          a.endpointResponse
                        }
                        onChange={(event) =>
                          set(
                            'endpointResponse',
                            event.target
                              .value,
                          )
                        }
                      >
                        <option value="unknown">
                          Não sei informar
                        </option>

                        <option value="managed_soc">
                          Uma equipe especializada acompanha e responde
                        </option>

                        <option value="defined_team">
                          Existe uma pessoa ou equipe definida para verificar
                        </option>

                        <option value="alerts_only">
                          Existem alertas, mas são vistos quando necessário
                        </option>

                        <option value="none">
                          Não existe acompanhamento dos alertas
                        </option>
                      </select>
                    </Field>
                  </QuestionPair>
                )}
              </StepSection>

              <StepSection
                eyebrow="Visibilidade"
                title="A empresa sabe quais equipamentos precisa proteger?"
                description="Poucas perguntas aqui ajudam a identificar máquinas esquecidas, versões antigas e falhas conhecidas."
              >
                <QuestionPair>
                  <Field
                    label="A empresa possui uma lista atualizada dos computadores, servidores e outros equipamentos?"
                    help="Pode ser ferramenta, planilha ou qualquer controle que permita saber quais equipamentos existem."
                  >
                    <select
                      className={select}
                      value={
                        a.assetInventory
                      }
                      onChange={(event) =>
                        set(
                          'assetInventory',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="managed">
                        Sim, inventário atualizado e gerenciado
                      </option>

                      <option value="partial">
                        Existe, mas pode estar incompleto
                      </option>

                      <option value="informal">
                        Controle informal ou planilha sem revisão regular
                      </option>

                      <option value="none">
                        Não existe inventário
                      </option>
                    </select>
                  </Field>

                  <Field
                    label="A empresa verifica periodicamente se computadores e sistemas precisam de correções de segurança?"
                    help="Pense em atualizações pendentes, versões antigas ou falhas conhecidas."
                  >
                    <select
                      className={select}
                      value={
                        a.vulnerabilityManagement
                      }
                      onChange={(event) =>
                        set(
                          'vulnerabilityManagement',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="continuous">
                        Existe acompanhamento contínuo
                      </option>

                      <option value="regular">
                        Existe uma verificação periódica definida
                      </option>

                      <option value="occasional">
                        São feitas verificações ocasionais
                      </option>

                      <option value="reactive">
                        Normalmente só quando aparece algum problema
                      </option>

                      <option value="none">
                        Não existe um processo
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field
                    label="A empresa possui servidores próprios?"
                    help="Considere servidores físicos ou virtuais administrados pela empresa."
                  >
                    <select
                      className={select}
                      value={serverBucket(
                        a.servers,
                      )}
                      onChange={(event) =>
                        set(
                          'servers',
                          +event.target
                            .value,
                        )
                      }
                    >
                      <option value="0">
                        Não possui / não sei informar
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

                  <Field label="Os computadores recebem atualizações de segurança automaticamente?">
                    <select
                      className={select}
                      value={
                        a.autoUpdates
                      }
                      onChange={(event) =>
                        set(
                          'autoUpdates',
                          event.target
                            .value,
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
              </StepSection>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <StepSection
                eyebrow="Agora imagine uma perda"
                title="Se os dados sumissem hoje, o que a empresa conseguiria recuperar?"
                description="O objetivo aqui não é saber apenas se existe backup, mas se essas cópias realmente ajudariam quando fossem necessárias."
              >
                <QuestionPair>
                  <Field
                    label="Onde ficam os arquivos e informações mais importantes?"
                    help="Pense onde as pessoas salvam documentos e informações usadas no dia a dia."
                  >
                    <select
                      className={select}
                      value={
                        a.dataLocation
                      }
                      onChange={(event) =>
                        set(
                          'dataLocation',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="corporate_central">
                        Em um local corporativo centralizado
                      </option>

                      <option value="saas_only">
                        Principalmente dentro de sistemas em nuvem
                      </option>

                      <option value="mixed">
                        Espalhados entre nuvem, servidores e computadores
                      </option>

                      <option value="endpoints">
                        Principalmente nos computadores e notebooks
                      </option>

                      <option value="personal_cloud">
                        Em contas pessoais ou locais não administrados pela empresa
                      </option>
                    </select>
                  </Field>

                  <Field
                    label="A empresa possui cópias de segurança dos dados importantes?"
                    help="Pense nos arquivos e sistemas que fariam falta se fossem perdidos ou apagados."
                  >
                    <select
                      className={select}
                      value={
                        a.backupLevel
                      }
                      onChange={(event) => {
                        set(
                          'backupLevel',
                          event.target
                            .value,
                        );

                        if (
                          [
                            'none',
                            'unknown',
                          ].includes(
                            event.target
                              .value,
                          )
                        ) {
                          set(
                            'backupVendor',
                            '',
                          );

                          set(
                            'backupProduct',
                            '',
                          );
                        }
                      }}
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="none">
                        Não existe uma rotina de cópia de segurança
                      </option>

                      <option value="manual">
                        Sim, mas as cópias são feitas manualmente
                      </option>

                      <option value="automated_local">
                        Sim, existe cópia automática dentro da empresa
                      </option>

                      <option value="cloud">
                        Sim, existe cópia automática em nuvem
                      </option>

                      <option value="multi_copy">
                        Sim, existem cópias em mais de um local
                      </option>

                      <option value="managed">
                        Sim, existe uma rotina gerenciada e acompanhada
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field
                    label="Aproximadamente quanto de informação importante precisa ser protegida?"
                    help="Esse dado ajuda a entender o tamanho do ambiente. Se não souber, tudo bem."
                  >
                    <select
                      className={select}
                      value={backupBucket(
                        a.backupVolumeGb,
                      )}
                      onChange={(event) =>
                        set(
                          'backupVolumeGb',
                          +event.target
                            .value,
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

                  <Field
                    label="Se os sistemas principais parassem hoje, o que aconteceria com a operação?"
                    help="Não precisa calcular dinheiro. Escolha apenas a situação mais próxima."
                  >
                    <select
                      className={select}
                      value={
                        a.operationalImpact ??
                        'unknown'
                      }
                      onChange={(event) =>
                        set(
                          'operationalImpact',
                          event.target
                            .value as OperationalImpactLevel,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="low">
                        Conseguiríamos continuar quase normalmente
                      </option>

                      <option value="partial">
                        Parte da empresa ficaria parada
                      </option>

                      <option value="major">
                        A maior parte da empresa ficaria parada
                      </option>

                      <option value="halt">
                        A operação praticamente pararia
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                {hasBackup && (
                  <>
                    <AdaptiveHint>
                      Como existe uma cópia,
                      precisamos entender apenas
                      duas coisas: quem cuida
                      dela e se ela está
                      realmente separada do
                      risco da produção.
                    </AdaptiveHint>

                    <QuestionPair>
                      <Field label="Quem é responsável pelo backup hoje?">
                        <select
                          className={
                            select
                          }
                          value={
                            a.backupResponsibility ??
                            'unknown'
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'backupResponsibility',
                              event.target
                                .value as BackupResponsibilityLevel,
                            )
                          }
                        >
                          <option value="unknown">
                            Não sei informar
                          </option>

                          <option value="internal">
                            Nossa própria equipe
                          </option>

                          <option value="outsourced">
                            Uma empresa terceirizada
                          </option>

                          <option value="shared">
                            Nossa equipe e uma empresa terceirizada
                          </option>

                          <option value="nobody">
                            Não existe alguém claramente responsável
                          </option>
                        </select>
                      </Field>

                      <Field label="Você sabe qual solução é utilizada?">
                        <select
                          className={
                            select
                          }
                          value={
                            backupVendorValue
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'backupVendor',
                              event.target
                                .value ===
                                'Não sei informar'
                                ? ''
                                : event.target
                                    .value,
                            )
                          }
                        >
                          {backupVendors.map(
                            (
                              vendor,
                            ) => (
                              <option
                                key={
                                  vendor
                                }
                                value={
                                  vendor
                                }
                              >
                                {vendor}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>
                    </QuestionPair>

                    {backupVendorValue ===
                      'Outro' && (
                      <Field label="Qual é a solução ou fabricante?">
                        <input
                          className={
                            input
                          }
                          value={
                            a.backupVendor ===
                            'Outro'
                              ? ''
                              : a.backupVendor ??
                                ''
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'backupVendor',
                              event.target
                                .value,
                            )
                          }
                          placeholder="Informe se souber"
                        />
                      </Field>
                    )}

                    <QuestionPair>
                      <Field
                        label="Existe pelo menos uma cópia protegida caso o ambiente principal seja atacado?"
                        help="Por exemplo, cópia imutável, offline ou administrada separadamente."
                      >
                        <select
                          className={
                            select
                          }
                          value={
                            a.backupIsolation
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'backupIsolation',
                              event.target
                                .value,
                            )
                          }
                        >
                          <option value="unknown">
                            Não sei informar
                          </option>

                          <option value="immutable">
                            Sim, existe cópia protegida contra alteração
                          </option>

                          <option value="isolated">
                            Sim, existe cópia separada ou offline
                          </option>

                          <option value="separate_account">
                            Sim, existe cópia administrada separadamente
                          </option>

                          <option value="same_environment">
                            Existe cópia, mas depende do mesmo ambiente ou credenciais
                          </option>

                          <option value="none">
                            Não existe uma cópia separada
                          </option>
                        </select>
                      </Field>

                      <Field label="A empresa já testou se consegue recuperar os dados dessas cópias?">
                        <select
                          className={
                            select
                          }
                          value={
                            a.restoreTests
                          }
                          onChange={(
                            event,
                          ) =>
                            set(
                              'restoreTests',
                              event.target
                                .value,
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

                <Field
                  label="Por quanto tempo a empresa consegue ficar sem os sistemas ou dados mais importantes?"
                  help="Pense no tempo máximo aceitável antes que a parada comece a causar um problema sério."
                >
                  <select
                    className={select}
                    value={
                      a.maxDowntime
                    }
                    onChange={(event) =>
                      set(
                        'maxDowntime',
                        event.target
                          .value,
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
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <StepSection
                eyebrow="Última etapa"
                title="Quem consegue entrar e o que acontece se algo der errado?"
                description="Essas perguntas fecham a visão do ambiente com contas, e-mail e capacidade de reação."
              >
                <QuestionPair>
                  <Field
                    label="Nas contas mais importantes, é exigida alguma confirmação além da senha?"
                    help="Por exemplo, código no celular ou aplicativo autenticador."
                  >
                    <select
                      className={select}
                      value={a.mfa}
                      onChange={(event) =>
                        set(
                          'mfa',
                          event.target
                            .value,
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

                  <Field label="Mais de uma pessoa utiliza a mesma conta ou senha para acessar algum sistema?">
                    <select
                      className={select}
                      value={
                        a.sharedAccounts
                      }
                      onChange={(event) =>
                        set(
                          'sharedAccounts',
                          event.target
                            .value,
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
                  <Field label="Quando alguém sai da empresa, os acessos dessa pessoa são removidos?">
                    <select
                      className={select}
                      value={
                        a.offboarding
                      }
                      onChange={(event) =>
                        set(
                          'offboarding',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="formal">
                        Sim, existe um processo definido
                      </option>

                      <option value="informal">
                        É feito caso a caso
                      </option>
                    </select>
                  </Field>

                  <Field label="A empresa armazena ou utiliza dados pessoais ou informações sensíveis?">
                    <select
                      className={select}
                      value={
                        a.sensitiveData
                      }
                      onChange={(event) =>
                        set(
                          'sensitiveData',
                          event.target
                            .value,
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
                  <Field
                    label="O e-mail possui alguma proteção além do filtro padrão de spam?"
                    help="Por exemplo, bloqueio de mensagens falsas, links perigosos ou anexos suspeitos."
                  >
                    <select
                      className={select}
                      value={
                        a.emailProtection
                      }
                      onChange={(event) =>
                        set(
                          'emailProtection',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="unknown">
                        Não sei informar
                      </option>

                      <option value="advanced">
                        Sim, com análise de links, anexos e mensagens suspeitas
                      </option>

                      <option value="standard">
                        Sim, existe proteção adicional administrada
                      </option>

                      <option value="basic">
                        Apenas o filtro padrão de spam
                      </option>

                      <option value="none">
                        Não existe proteção além do padrão
                      </option>
                    </select>
                  </Field>

                  <Field
                    label="Se acontecer um problema de segurança hoje, a empresa sabe quem deve coordenar a resposta?"
                    help="Pode ser alguém da empresa ou um prestador. O importante é saber previamente quem acionar."
                  >
                    <select
                      className={select}
                      value={
                        a.incidentResponse
                      }
                      onChange={(event) =>
                        set(
                          'incidentResponse',
                          event.target
                            .value,
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
                        Sabemos quem chamar, mas sem processo formal
                      </option>

                      <option value="none">
                        Não existe responsável definido
                      </option>
                    </select>
                  </Field>
                </QuestionPair>

                <QuestionPair>
                  <Field label="A empresa já passou por vírus, invasão, perda de dados ou uma parada importante causada por tecnologia?">
                    <select
                      className={select}
                      value={
                        a.incidentHistory
                      }
                      onChange={(event) =>
                        set(
                          'incidentHistory',
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="unknown">
                        Prefiro não informar / não sei
                      </option>

                      <option value="no">
                        Não
                      </option>

                      <option value="yes">
                        Sim
                      </option>
                    </select>
                  </Field>

                  <Field label="Qual situação de segurança mais preocupa a empresa hoje?">
                    <input
                      className={input}
                      value={
                        a.mainConcern
                      }
                      onChange={(event) =>
                        set(
                          'mainConcern',
                          event.target
                            .value,
                        )
                      }
                      placeholder="Ex.: vírus, golpe por e-mail, perda de dados, parada dos sistemas..."
                    />
                  </Field>
                </QuestionPair>

                <Field
                  label="Existe alguma informação importante que você gostaria de acrescentar?"
                  help="Não informe senhas, credenciais, dados de pacientes, documentos pessoais ou outras informações confidenciais desnecessárias."
                >
                  <textarea
                    className={input}
                    rows={4}
                    maxLength={1000}
                    value={a.notes}
                    onChange={(event) =>
                      set(
                        'notes',
                        event.target
                          .value,
                      )
                    }
                    placeholder="Pode ser um sistema importante, mudança planejada ou dificuldade atual."
                  />
                </Field>
              </StepSection>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
            <button
              className="flex items-center gap-2 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-30"
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
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  isSubmitting
                }
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
                className="flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 disabled:cursor-wait disabled:bg-teal-700 disabled:text-teal-100"
                onClick={submit}
                disabled={
                  isSubmitting
                }
                aria-busy={
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
            O resultado é um
            diagnóstico inicial baseado
            nas informações fornecidas.
            Quando algum ponto não puder
            ser confirmado, ele será
            tratado como informação a
            validar e não como falha
            automática.
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
              <Loader2
                className="animate-spin text-teal-300"
                size={24}
              />
            </div>

            <h3 className="mt-4 text-lg font-bold text-white">
              Preparando seu diagnóstico
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Estamos relacionando suas
              respostas para identificar
              quais pontos merecem mais
              atenção no seu ambiente.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}