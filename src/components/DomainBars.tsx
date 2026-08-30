import { DomainScore, maturityLevel, type Confidence } from '../scoring';

interface Item {
  label: string;
  value: DomainScore;
  icon?: React.ReactNode;
  coverage?: number;
  confidence?: Confidence;
}

function validationMessage(coverage?: number) {
  if (typeof coverage !== 'number') return null;

  // Quando a quantidade de informação é suficiente, não adicionamos
  // nenhum rótulo extra à interface. O cliente só recebe um aviso
  // quando realmente existe algo relevante a confirmar.
  if (coverage >= 80) return null;

  if (coverage >= 50) {
    return 'Alguns pontos precisam ser confirmados';
  }

  return 'Há pontos importantes a confirmar';
}

export default function DomainBars({ items }: { items: Item[] }) {
  return (
    <div className="space-y-5">
      {items.map((item) => {
        const width = item.value ?? 0;
        const validation = validationMessage(item.coverage);

        return (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                {item.icon}
                {item.label}
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-white">
                  {item.value === null ? '—' : item.value}
                </span>
                <span className="ml-1 text-xs text-slate-500">/100</span>
              </div>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-700"
                style={{ width: `${width}%` }}
              />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>{maturityLevel(item.value)}</span>
              {validation && (
                <span className="text-slate-400">{validation}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
