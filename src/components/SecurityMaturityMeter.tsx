import { ShieldCheck } from 'lucide-react';

interface Props {
  value: number | null;
  level: string;
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

const maturityBand = (score: number | null) => {
  if (score === null) return 'Sem leitura';
  if (score < 40) return 'Inicial';
  if (score < 60) return 'Em evolução';
  if (score < 80) return 'Adequada';
  return 'Avançada';
};

export default function SecurityMaturityMeter({ value, level }: Props) {
  const score = value === null ? null : clamp(value);
  const normalized = score ?? 0;
  const angle = Math.PI - (normalized / 100) * Math.PI;
  const markerX = 100 + 74 * Math.cos(angle);
  const markerY = 106 - 74 * Math.sin(angle);
  const displayLevel = level || maturityBand(score);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
        <ShieldCheck size={16} strokeWidth={1.8} />
        Índice de postura
      </div>

      <div className="relative mx-auto w-full max-w-[255px]">
        <svg
          viewBox="0 0 200 132"
          className="block h-auto w-full overflow-visible"
          role="img"
          aria-label={score === null ? 'Indicador geral sem pontuação' : `Indicador geral ${Math.round(score)} de 100, ${displayLevel}`}
        >
          <defs>
            <linearGradient id="securityScoreGradient" x1="20" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="55%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#2dd4bf" />
            </linearGradient>
            <filter id="securityScoreGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d="M 26 106 A 74 74 0 0 1 174 106"
            fill="none"
            stroke="#1e293b"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path
            d="M 26 106 A 74 74 0 0 1 174 106"
            fill="none"
            stroke="url(#securityScoreGradient)"
            strokeWidth="13"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${normalized} 100`}
            filter="url(#securityScoreGlow)"
          />

          {[0, 25, 50, 75, 100].map((tick) => {
            const tickAngle = Math.PI - (tick / 100) * Math.PI;
            const x1 = 100 + 62 * Math.cos(tickAngle);
            const y1 = 106 - 62 * Math.sin(tickAngle);
            const x2 = 100 + 68 * Math.cos(tickAngle);
            const y2 = 106 - 68 * Math.sin(tickAngle);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#475569"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            );
          })}

          {score !== null && (
            <circle
              cx={markerX}
              cy={markerY}
              r="5"
              fill="#e2e8f0"
              stroke="#0f172a"
              strokeWidth="3"
            />
          )}

          <text
            x="100"
            y="83"
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="35"
            fontWeight="800"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {score === null ? '—' : Math.round(score)}
          </text>
          <text
            x="100"
            y="101"
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontWeight="700"
            letterSpacing="1.8"
          >
            DE 100
          </text>
        </svg>

        <div className="-mt-1 text-center">
          <div className="text-xl font-extrabold tracking-tight text-white">
            {displayLevel}
          </div>
          <p className="mx-auto mt-2 max-w-[220px] text-xs leading-relaxed text-slate-500">
            Visão consolidada dos controles informados no diagnóstico.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-1.5" aria-hidden="true">
        <div className="h-1.5 rounded-full bg-cyan-950/90" />
        <div className="h-1.5 rounded-full bg-cyan-900/80" />
        <div className="h-1.5 rounded-full bg-teal-800/80" />
        <div className="h-1.5 rounded-full bg-teal-600/70" />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        <span>Inicial</span>
        <span>Avançada</span>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        O índice ajuda a comparar a maturidade entre áreas. Ele não representa percentual de proteção nem probabilidade de ataque.
      </p>
    </div>
  );
}
