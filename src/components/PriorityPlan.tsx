import {
  ArrowRight,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import type { PriorityPlan as PriorityPlanData } from '../lib/priority-engine';

interface PriorityPlanProps {
  plan: PriorityPlanData;
  internal?: boolean;
  showAll?: boolean;
  compact?: boolean;
}

const urgencyClasses = {
  Alta: 'border-amber-700/30 bg-amber-950/25 text-amber-300',
  Média: 'border-cyan-800/25 bg-cyan-950/20 text-cyan-300',
  Baixa: 'border-slate-700/40 bg-slate-900/30 text-slate-300',
} as const;

const stepLabel = (rank: number) => {
  if (rank === 1) return 'Primeiro';
  if (rank === 2) return 'Em seguida';
  return 'Depois';
};

export default function PriorityPlan({
  plan,
  internal = false,
  compact = false,
}: PriorityPlanProps) {
  if (!plan.items.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/25 p-5 text-sm text-slate-400">
        Ainda não há dados suficientes para montar um plano de prioridades confiável.
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {plan.items.map((item) => (
        <article
          key={`${item.rank}-${item.domainLabel}-${item.title}`}
          className="glass-card overflow-hidden"
        >
          <div className={`grid ${compact ? 'gap-3 p-4 lg:grid-cols-[190px_1fr_1.1fr]' : 'gap-4 p-5 md:p-6 lg:grid-cols-[230px_1fr_1.1fr]'} lg:items-stretch`}>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-teal-500/30 bg-teal-500/10 text-sm font-extrabold text-teal-300">
                  {String(item.rank).padStart(2, '0')}
                </div>
                <div className="min-w-0">
                  <div className="text-3xs font-bold uppercase tracking-[.13em] text-teal-400">
                    {stepLabel(item.rank)}
                  </div>
                  <div className="mt-0.5 text-2xs font-bold uppercase tracking-[.12em] text-slate-500">
                    {item.domainLabel}
                  </div>
                </div>
              </div>

              <h4 className={`${compact ? 'mt-2 text-base' : 'mt-4 text-lg'} font-bold leading-snug text-white`}>
                {item.title}
              </h4>

              <div className={`${compact ? 'mt-2' : 'mt-4'} flex flex-wrap gap-2`}>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-2xs font-bold ${urgencyClasses[item.urgency]}`}
                >
                  Prioridade {item.urgency.toLowerCase()}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-950/25 px-2.5 py-1 text-2xs text-slate-500">
                  <Wrench size={12} className="text-cyan-400" />
                  Esforço {item.effort.toLowerCase()}
                </span>
              </div>
            </div>

            <div className="min-w-0 border-t border-slate-800/70 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div className="text-3xs font-bold uppercase tracking-[.12em] text-slate-500">
                Por que merece atenção
              </div>
              <p className={`${compact ? 'mt-1.5 text-xs' : 'mt-2 text-sm'} leading-relaxed text-slate-300`}>
                {item.gap}
              </p>

              <div className={`${compact ? 'mt-2 text-[11px]' : 'mt-4 text-xs'} flex items-start gap-2 leading-relaxed text-slate-500`}>
                <ShieldAlert size={15} className="mt-0.5 shrink-0 text-slate-600" />
                <span>{item.risk}</span>
              </div>
            </div>

            <div className="min-w-0 border-t border-slate-800/70 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <div className="flex items-center gap-2 text-3xs font-bold uppercase tracking-[.12em] text-teal-400">
                <ArrowRight size={14} />
                O que revisar
              </div>
              <p className={`${compact ? 'mt-1.5 text-xs' : 'mt-2 text-sm'} leading-relaxed text-slate-200`}>
                {item.action}
              </p>

              {internal && item.commercialHint && (
                <div className="mt-4 border-t border-teal-900/35 pt-4 text-xs leading-relaxed text-cyan-300">
                  <b className="text-cyan-200">Leitura comercial interna:</b>{' '}
                  {item.commercialHint}
                </div>
              )}
            </div>
          </div>
        </article>
      ))}

      <p className="pt-1 text-xs leading-relaxed text-slate-500">{plan.summary}</p>
    </div>
  );
}
