import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listInternalAssessments } from '../lib/internal.functions';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, ArrowUpRight, Loader2, LogOut } from 'lucide-react';

export default function InternalDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['internal-assessments'],
    queryFn: () => listInternalAssessments(),
  });
  const items = data?.items ?? [];

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-10"><div className="mx-auto max-w-6xl"><div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-[.2em] text-teal-400">Uso interno Concierge</div><h1 className="mt-2 text-4xl font-bold">Assessments recebidos</h1><p className="mt-2 text-slate-400">Diagnósticos gravados no banco, vinculados ao Account Manager do link.</p></div><button onClick={signOut} className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-teal-500/40"><LogOut size={15}/>Sair</button></div>
    {isLoading ? <div className="glass-card flex items-center justify-center gap-3 p-10 text-slate-400"><Loader2 className="animate-spin" size={20}/>Carregando assessments…</div>
    : error ? <div className="glass-card p-8 text-center text-amber-300">Não foi possível carregar os assessments.</div>
    : !items.length ? <div className="glass-card p-8 text-center"><ClipboardList className="mx-auto text-slate-500" size={42}/><h2 className="mt-4 text-xl font-bold">Nenhum assessment enviado ainda</h2><p className="mt-2 text-slate-400">Compartilhe seu link com <code className="text-teal-300">?ref=</code> para começar a receber diagnósticos.</p><Link to="/diagnostico" className="mt-5 inline-flex rounded-xl bg-teal-600 px-5 py-3 font-semibold hover:bg-teal-500">Abrir assessment</Link></div>
    : <div className="grid gap-4">{items.map(s => <Link key={s.id} to={`/interno/${s.id}`} className="glass-card group grid gap-4 p-5 transition hover:border-teal-500/40 md:grid-cols-[1.4fr_.8fr_.8fr_auto] md:items-center"><div><div className="text-lg font-bold text-white">{s.company_name || 'Empresa não informada'}</div><div className="text-sm text-slate-500">{s.respondent_name || 'Contato não informado'} · {new Date(s.created_at).toLocaleString('pt-BR')}{s.public_ref ? ` · ref: ${s.public_ref}` : ''}{s.source ? ` · ${s.source}` : ''}</div></div><div><div className="text-xs uppercase tracking-wide text-slate-500">Postura geral</div><div className="text-2xl font-bold text-teal-300">{s.overall_score ?? '—'}<span className="text-sm text-slate-600">/100</span></div></div><div><div className="text-xs uppercase tracking-wide text-slate-500">{s.status === 'completed' ? 'Prioridade' : 'Situação'}</div><div className="font-semibold text-slate-200">{s.status === 'completed' ? (s.priority_domain_label || '—') : 'Em andamento'}</div></div><ArrowUpRight className="text-slate-600 transition group-hover:text-teal-300"/></Link>)}</div>}
  </div></main>;
}
