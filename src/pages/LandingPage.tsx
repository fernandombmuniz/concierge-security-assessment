import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startAssessment } from '../lib/assessment.functions';
import {
  clearSession,
  readAttribution,
  resetAttribution,
  saveSession,
} from '../lib/assessment-session';
import { clearPreviousRespondentState } from '../storage';
import ClientHeader from '../components/ClientHeader';
import {
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  Wifi,
  MonitorSmartphone,
  Database,
  KeyRound,
  ChevronDown,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const publicRef = searchParams.get('ref');
  const publicSource = searchParams.get('src');
  const isPublicEntry = Boolean(publicRef || publicSource);

  useEffect(() => {
    /**
     * Um link público com `ref` e/ou `src` representa uma NOVA entrada.
     * Antes de renderizar o cabeçalho ou permitir navegação, removemos todo o
     * estado local do respondente anterior. Assim um dispositivo compartilhado
     * não mostra rascunho, resultado ou sessão de outra pessoa.
     *
     * Ao navegar internamente de volta para `/` sem ref/src, não limpamos nada.
     * Isso preserva o assessment em andamento do próprio respondente.
     */
    if (isPublicEntry) {
      clearPreviousRespondentState();
      clearSession();
      resetAttribution(publicRef, publicSource);
    }

    setEntryReady(true);
  }, [isPublicEntry, publicRef, publicSource]);

  const start = async () => {
    if (!consent || starting) return;

    setStarting(true);

    /**
     * Segunda proteção: mesmo que o usuário tenha chegado à landing por uma
     * navegação incomum, iniciar explicitamente um novo diagnóstico sempre
     * começa com estado local limpo.
     */
    clearPreviousRespondentState();
    clearSession();

    if (isPublicEntry) {
      resetAttribution(publicRef, publicSource);
    }

    const { ref, source } = readAttribution();

    try {
      // Mantém uma transição visual mínima para evitar a sensação de refresh
      // quando a API responde muito rápido. A criação da sessão e o tempo
      // mínimo acontecem em paralelo, sem atrasar chamadas mais lentas.
      const [session] = await Promise.all([
        startAssessment({
          data: {
            ref,
            source,
            consent: true,
          },
        }),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]);

      saveSession({
        ...session,
        ref,
        source,
        consentAt: new Date().toISOString(),
      });

      // Mantém o mesmo overlay também no primeiro paint do formulário,
      // evitando o flash entre a desmontagem da landing e a montagem da rota.
      sessionStorage.setItem('concierge-assessment-route-transition', '1');

      navigate('/diagnostico', { replace: true });
    } catch (error) {
      console.error('Falha ao iniciar assessment:', error);

      alert(
        'Não foi possível iniciar o diagnóstico neste momento. ' +
          'Verifique sua conexão e tente novamente.',
      );

      setStarting(false);
    }
  };

  const features = [
    {
      title: 'Rede e Perímetro',
      desc: 'Análise de internet, firewalls e controle de acessos externos.',
      icon: Wifi,
      color: 'text-cyan-400',
    },
    {
      title: 'Dispositivos',
      desc: 'Proteção de computadores, notebooks, servidores e atualizações.',
      icon: MonitorSmartphone,
      color: 'text-teal-400',
    },
    {
      title: 'Continuidade',
      desc: 'Estratégias de backup, testes de restauração e tempo de parada.',
      icon: Database,
      color: 'text-blue-400',
    },
    {
      title: 'Identidade e Acesso',
      desc: 'Controle de contas, múltiplos fatores (MFA) e offboarding.',
      icon: KeyRound,
      color: 'text-indigo-400',
    },
  ];

  /**
   * Durante a limpeza de uma nova entrada pública não renderizamos o header.
   * Isso evita até mesmo um flash visual com o nome/resultado do respondente
   * anterior antes do useEffect concluir.
   */
  if (!entryReady) {
    return (
      <main className="min-h-screen bg-dashboard-animate bg-grid-tech" />
    );
  }

  return (
    <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
      <div className="mx-auto max-w-5xl">
        <ClientHeader />

        <div className="glass-card relative mt-6 overflow-hidden p-8 text-center md:p-12">
          <div className="pointer-events-none absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-teal-500/5 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-cyan-500/5 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl">
            <span className="section-kicker">Assessment Executivo</span>

            <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Concierge Security Assessment
            </h2>

            <p className="mt-6 text-xl font-medium text-slate-200 md:text-2xl">
              Uma avaliação inicial da postura de segurança da sua empresa.
            </p>

            <p className="mt-4 text-base leading-relaxed text-slate-400 md:text-lg">
              A partir de algumas informações sobre rede, computadores,
              proteção de dados e acessos, identificamos pontos que merecem
              atenção e ajudamos a compreender como eles podem afetar a
              operação.
            </p>

            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 px-5 py-3.5 text-sm font-medium text-slate-300">
                <ShieldCheck className="text-teal-400" size={22} />
                <span>
                  Leva cerca de <b>6 a 8 minutos</b>
                </span>
              </div>
            </div>

            <div className="mt-12 grid gap-6 text-left sm:grid-cols-2 md:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="rounded-xl border border-slate-800 bg-slate-950/45 p-5 transition hover:border-slate-700/60"
                  >
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-900/50 ${feature.color}`}
                    >
                      <Icon size={20} />
                    </div>

                    <h3 className="mt-4 font-bold text-slate-100">
                      {feature.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      {feature.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-xl border border-slate-800 bg-slate-950/45 text-left">
              <label
                htmlFor="privacy-acknowledgement"
                className="flex cursor-pointer items-start gap-3 p-5"
              >
                <input
                  id="privacy-acknowledgement"
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-teal-500"
                />

                <span className="text-sm leading-6 text-slate-300">
                  Li e estou ciente de que as informações fornecidas serão
                  tratadas pela Concierge Segurança Digital para realizar este
                  diagnóstico, gerar o resultado e permitir o acompanhamento
                  pelo responsável comercial. Os dados são mantidos por prazo
                  limitado e eliminados automaticamente. Evite informar senhas,
                  credenciais ou dados pessoais sensíveis neste formulário.
                </span>
              </label>

              <div className="border-t border-slate-800/90">
                <button
                  type="button"
                  onClick={() => setPrivacyOpen((current) => !current)}
                  aria-expanded={privacyOpen}
                  aria-controls="privacy-details"
                  className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left text-sm font-semibold text-teal-300 transition hover:bg-slate-900/50 hover:text-teal-200"
                >
                  <span>Ver detalhes sobre privacidade</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-200 ${
                      privacyOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {privacyOpen && (
                  <div
                    id="privacy-details"
                    className="border-t border-slate-800/80 px-5 pb-5 pt-4"
                  >
                    <div className="grid gap-4 text-sm leading-6 text-slate-400 sm:grid-cols-2">
                      <div>
                        <p className="font-semibold text-slate-200">Finalidade</p>
                        <p className="mt-1">
                          Realizar o diagnóstico, gerar o resultado e permitir o
                          acompanhamento do atendimento pela equipe responsável.
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-200">Retenção</p>
                        <p className="mt-1">
                          Rascunhos por até 7 dias, diagnósticos concluídos por
                          até 15 dias e link interno de acesso por até 5 dias.
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-200">Acesso e operação</p>
                        <p className="mt-1">
                          O acesso é limitado às pessoas autorizadas envolvidas
                          no atendimento. Fornecedores de infraestrutura podem
                          processar dados quando necessários à operação do serviço.
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-slate-200">Eliminação</p>
                        <p className="mt-1">
                          Encerrados os prazos definidos, os dados relacionados
                          ao assessment são eliminados automaticamente.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={start}
                disabled={!consent || starting}
                aria-busy={starting}
                className="flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-7 py-4 font-bold text-white shadow-lg shadow-teal-950/40 transition hover:scale-[1.02] hover:bg-teal-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
              >
                {starting ? (
                  <>
                    <LoaderCircle className="animate-spin" size={20} />
                    Preparando diagnóstico...
                  </>
                ) : (
                  <>
                    Iniciar diagnóstico
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {starting && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-sm rounded-2xl border border-teal-500/20 bg-slate-950/95 p-7 text-center shadow-2xl shadow-black/40">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-400">
              <LoaderCircle className="animate-spin" size={26} />
            </div>

            <h3 className="mt-5 text-lg font-bold text-white">
              Preparando seu diagnóstico
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Estamos organizando as informações iniciais para começar sua
              avaliação. Isso leva apenas alguns instantes.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
