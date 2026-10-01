import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronDown, Clock3, LoaderCircle, Sparkles } from 'lucide-react';
import { startAssessment } from '../lib/assessment.functions';
import {
  clearSession,
  readAttribution,
  resetAttribution,
  saveSession,
} from '../lib/assessment-session';
import { clearPreviousRespondentState } from '../storage';
import { ConciergeBrandLockup } from '../components/ExecutiveVisual';

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
    clearPreviousRespondentState();
    clearSession();

    if (isPublicEntry) {
      resetAttribution(publicRef, publicSource);
    }

    const { ref, source } = readAttribution();

    try {
      const [session] = await Promise.all([
        startAssessment({ data: { ref, source, consent: true } }),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]);

      saveSession({
        ...session,
        ref,
        source,
        consentAt: new Date().toISOString(),
      });

      sessionStorage.setItem('concierge-assessment-route-transition', '1');
      navigate('/diagnostico', { replace: true });
    } catch (error) {
      console.error('Falha ao iniciar assessment:', error);
      alert(
        'Não foi possível iniciar o diagnóstico neste momento. Verifique sua conexão e tente novamente.',
      );
      setStarting(false);
    }
  };

  if (!entryReady) {
    return <main className="min-h-screen bg-[#07101f]" />;
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#07101f] px-4 py-6 text-white md:py-10"
      style={{
        backgroundImage:
          'radial-gradient(circle at 74% 18%, rgba(6,182,212,0.13), transparent 30%), radial-gradient(circle at 18% 12%, rgba(14,116,144,0.08), transparent 26%), linear-gradient(180deg, #07101f 0%, #081426 58%, #07101f 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.055) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-[32%] left-[-8%] h-[76%] w-[116%] origin-bottom opacity-55"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.10) 1px, transparent 1px)',
          backgroundSize: '58px 58px',
          transform: 'perspective(850px) rotateX(63deg)',
        }}
      />

      <div className="relative mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[28px] border border-cyan-300/[0.10] bg-[#0a1425]/78 px-6 py-8 shadow-[0_28px_90px_rgba(0,0,0,.35)] backdrop-blur-[2px] md:px-10 md:py-10 lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/[0.035] via-transparent to-blue-950/10" />
            <div className="absolute right-[-8%] top-[-16%] h-[420px] w-[650px] rounded-full bg-cyan-400/[0.055] blur-[80px]" />
            <div className="absolute left-[48%] top-[7%] h-px w-[42%] bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" />
            <svg
              className="absolute right-[-2%] top-[1%] hidden h-[255px] w-[300px] opacity-35 lg:block"
              viewBox="0 0 320 280"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="technicalShieldStroke" x1="40" y1="20" x2="285" y2="255" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#22d3ee" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#0ea5e9" stopOpacity="0.18" />
                </linearGradient>
              </defs>
              <path d="M160 28 254 62v70c0 61-34 102-94 127-60-25-94-66-94-127V62l94-34Z" stroke="url(#technicalShieldStroke)" strokeWidth="2.4" />
              <path d="M130 127v-18c0-20 13-35 30-35s30 15 30 35v18" stroke="#22d3ee" strokeOpacity=".78" strokeWidth="5" strokeLinecap="round" />
              <rect x="119" y="126" width="82" height="67" rx="14" stroke="#22d3ee" strokeOpacity=".82" strokeWidth="4" />
              <circle cx="160" cy="157" r="7" fill="#22d3ee" fillOpacity=".85" />
              <path d="M160 164v15" stroke="#22d3ee" strokeOpacity=".8" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.13fr_.87fr] lg:items-start lg:gap-12">
            <div>
              <span className="section-kicker">Diagnóstico Técnico de Segurança</span>
              <h1 className="mt-5 max-w-[760px] text-[2.65rem] font-extrabold leading-[1.03] tracking-[-0.035em] text-white sm:text-5xl md:text-[3.35rem] lg:text-[3.65rem]">
                Entenda como os principais <span className="text-cyan-300">controles de segurança</span> funcionam na prática.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                Uma leitura técnica e objetiva de rede, computadores, continuidade, acessos e capacidade de resposta para mostrar o que já está estruturado, o que precisa ser validado e onde evoluir primeiro.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-sm text-slate-300">
                  <Clock3 size={18} className="text-teal-400" />
                  Cerca de <b className="text-white">5 minutos</b>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-cyan-300/[0.10] bg-[#061121]/62 px-4 py-3 text-sm text-slate-300">
                  <Sparkles size={18} className="text-cyan-400" />
                  Perguntas voltadas para profissionais de TI
                </div>
              </div>
            </div>

            <div className="relative lg:min-h-[500px]">
              <div className="relative z-10 flex items-center justify-center py-2 lg:justify-start lg:pl-4">
                <ConciergeBrandLockup />
              </div>

              <div className="relative z-10 mt-6 rounded-[28px] border border-cyan-300/35 bg-[#061121]/88 p-6 shadow-[0_24px_70px_rgba(0,0,0,.36),0_0_34px_rgba(34,211,238,.055)] backdrop-blur-md md:p-7">
                <p className="text-base font-bold text-white">Ao final, você recebe:</p>
                <div className="mt-4 space-y-3">
                  {[
                    'uma visão consolidada dos controles e da operação',
                    'os pontos que merecem validação técnica primeiro',
                    'três próximos passos mesmo em ambientes mais maduros',
                    'uma base objetiva para aprofundar a próxima conversa',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-200 md:text-[15px]">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-cyan-300 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,.12)]">
                        <CheckCircle2 size={14} strokeWidth={2.2} />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-9 rounded-2xl border border-slate-700/85 bg-[#071120]/82 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.015)]">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-cyan-500"
              />
              <span className="text-sm leading-6 text-slate-300">
                Li e estou ciente de que as informações serão usadas para gerar este diagnóstico e apoiar o acompanhamento comercial. Evite informar senhas, documentos pessoais ou dados sensíveis.
              </span>
            </label>

            <div className="mt-4 border-t border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={() => setPrivacyOpen((current) => !current)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Ver detalhes sobre privacidade
                <ChevronDown size={17} className={privacyOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>

              {privacyOpen && (
                <div className="mt-4 grid gap-4 text-sm leading-6 text-slate-400 sm:grid-cols-2">
                  <div><b className="text-slate-200">Finalidade</b><p className="mt-1">Gerar o diagnóstico, o resultado e permitir o acompanhamento da equipe responsável.</p></div>
                  <div><b className="text-slate-200">Retenção</b><p className="mt-1">Rascunhos por até 7 dias, diagnósticos concluídos por até 15 dias e link interno por até 5 dias.</p></div>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-6 flex justify-end">
            <button
              type="button"
              disabled={!consent || starting}
              onClick={start}
              className="inline-flex min-w-[285px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-[0_14px_38px_rgba(13,148,136,.20)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {starting ? <LoaderCircle size={18} className="animate-spin" /> : null}
              {starting ? 'Preparando...' : 'Iniciar diagnóstico técnico'}
              {!starting && <ArrowRight size={18} />}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
