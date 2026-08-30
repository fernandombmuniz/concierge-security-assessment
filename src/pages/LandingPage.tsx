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
  ShieldCheck,
  Wifi,
  MonitorSmartphone,
  Database,
  KeyRound,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [entryReady, setEntryReady] = useState(false);

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
      const session = await startAssessment({
        data: {
          ref,
          source,
          consent: true,
        },
      });

      saveSession({
        ...session,
        ref,
        source,
        consentAt: new Date().toISOString(),
      });

      navigate('/diagnostico');
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

            <label className="mx-auto mt-10 flex max-w-2xl cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-left">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-teal-500"
              />

              <span className="text-xs leading-relaxed text-slate-400">
                Autorizo a Concierge Segurança Digital a coletar e tratar as
                informações fornecidas neste diagnóstico com a finalidade de
                elaborar a avaliação de segurança e o contato comercial
                correspondente, conforme a Lei Geral de Proteção de Dados
                (LGPD). Os dados são utilizados apenas internamente e podem
                ser corrigidos ou excluídos a pedido.
              </span>
            </label>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={start}
                disabled={!consent || starting}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-7 py-4 font-bold text-white shadow-lg shadow-teal-950/40 transition hover:scale-[1.02] hover:bg-teal-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {starting ? 'Preparando…' : 'Iniciar diagnóstico'}
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
