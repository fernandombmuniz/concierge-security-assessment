import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startAssessment } from '../lib/assessment.functions';
import { rememberAttribution, readAttribution, saveSession } from '../lib/assessment-session';
import ClientHeader from '../components/ClientHeader';
import { ArrowRight, ShieldCheck, Wifi, MonitorSmartphone, Database, KeyRound } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [consent, setConsent] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    rememberAttribution(searchParams.get('ref'), searchParams.get('src'));
  }, [searchParams]);

  const start = async () => {
    if (!consent || starting) return;
    setStarting(true);
    const { ref, source } = readAttribution();
    try {
      const session = await startAssessment({ data: { ref, source, consent: true } });
      saveSession({ ...session, ref, source, consentAt: new Date().toISOString() });
    } catch {
      // Falha ao registrar no servidor não bloqueia o diagnóstico: o rascunho
      // local continua funcionando e a sincronização é tentada novamente.
    }
    navigate('/diagnostico');
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

  return (
    <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10">
      <div className="mx-auto max-w-5xl">
        <ClientHeader />

        <div className="glass-card mt-6 p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto">
            <span className="section-kicker">Assessment Executivo</span>
            <h2 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Concierge Security Assessment
            </h2>
            <p className="mt-6 text-xl md:text-2xl font-medium text-slate-200">
              Uma avaliação inicial da postura de segurança da sua empresa.
            </p>
            <p className="mt-4 text-base md:text-lg leading-relaxed text-slate-400">
              A partir de algumas informações sobre rede, computadores, proteção de dados e acessos,
              identificamos pontos que merecem atenção e ajudamos a compreender como eles podem afetar a operação.
            </p>

            <div className="mt-8 flex justify-center">
              <div className="flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/5 px-5 py-3.5 text-sm text-slate-300 font-medium">
                <ShieldCheck className="text-teal-400" size={22} />
                <span>Leva cerca de <b>6 a 8 minutos</b></span>
              </div>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-left">
              {features.map((f) => (
                <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-950/45 p-5 transition hover:border-slate-700/60">
                  <div className={`grid h-10 w-10 place-items-center rounded-lg border border-slate-800 bg-slate-900/50 ${f.color}`}>
                    <f.icon size={20} />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-100">{f.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{f.desc}</p>
                </div>
              ))}
            </div>

            <label className="mt-10 mx-auto flex max-w-2xl cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-left">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-teal-500"
              />
              <span className="text-xs leading-relaxed text-slate-400">
                Autorizo a Concierge Segurança Digital a coletar e tratar as informações fornecidas neste
                diagnóstico com a finalidade de elaborar a avaliação de segurança e o contato comercial
                correspondente, conforme a Lei Geral de Proteção de Dados (LGPD). Os dados são utilizados
                apenas internamente e podem ser corrigidos ou excluídos a pedido.
              </span>
            </label>

            <div className="mt-6 flex justify-center">
              <button
                onClick={start}
                disabled={!consent || starting}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-7 py-4 font-bold text-white shadow-lg shadow-teal-950/40 transition hover:bg-teal-500 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
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