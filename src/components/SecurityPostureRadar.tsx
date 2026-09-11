import type { DomainKey } from '../scoring';

interface RadarItem {
  key: DomainKey;
  label: string;
  value: number | null;
}

interface SecurityPostureRadarProps {
  items: RadarItem[];
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 92;
const LABEL_RADIUS = 116;
const LEVELS = [25, 50, 75, 100];

const angleFor = (index: number, total: number) =>
  -Math.PI / 2 + (Math.PI * 2 * index) / total;

const pointAt = (angle: number, radius: number) => ({
  x: CENTER + Math.cos(angle) * radius,
  y: CENTER + Math.sin(angle) * radius,
});

const polygonPoints = (
  total: number,
  percentage: number,
) =>
  Array.from({ length: total }, (_, index) => {
    const point = pointAt(
      angleFor(index, total),
      RADIUS * (percentage / 100),
    );

    return `${point.x},${point.y}`;
  }).join(' ');

export default function SecurityPostureRadar({
  items,
}: SecurityPostureRadarProps) {
  const values = items.map((item) =>
    item.value === null || !Number.isFinite(item.value)
      ? 0
      : Math.max(0, Math.min(100, item.value)),
  );

  const dataPoints = values
    .map((value, index) => {
      const point = pointAt(
        angleFor(index, items.length),
        RADIUS * (value / 100),
      );

      return `${point.x},${point.y}`;
    })
    .join(' ');

  return (
    <div>
      <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/20 px-3.5 py-3">
        <div className="text-xs font-semibold text-slate-300">
          Como ler
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Quanto mais próximo da borda, maior a maturidade indicada naquela área. O centro representa menor maturidade.
        </p>
      </div>

      <div className="mx-auto mt-2 max-w-[320px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Mapa de postura de segurança por área. Quanto mais próximo da borda, maior o indicador da área."
          className="h-auto w-full"
        >
          {LEVELS.map((level) => (
            <polygon
              key={level}
              points={polygonPoints(items.length, level)}
              fill="none"
              stroke="rgb(51 65 85)"
              strokeOpacity={level === 100 ? 0.78 : 0.42}
              strokeWidth={level === 100 ? 1.3 : 1}
            />
          ))}

          {items.map((item, index) => {
            const edge = pointAt(angleFor(index, items.length), RADIUS);

            return (
              <line
                key={item.key}
                x1={CENTER}
                y1={CENTER}
                x2={edge.x}
                y2={edge.y}
                stroke="rgb(51 65 85)"
                strokeOpacity="0.55"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={dataPoints}
            fill="rgb(20 184 166)"
            fillOpacity="0.16"
            stroke="rgb(45 212 191)"
            strokeWidth="2.2"
          />

          {values.map((value, index) => {
            const angle = angleFor(index, items.length);
            const point = pointAt(angle, RADIUS * (value / 100));
            const labelPoint = pointAt(angle, LABEL_RADIUS);

            return (
              <g key={items[index].key}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="rgb(15 23 42)"
                  stroke="rgb(45 212 191)"
                  strokeWidth="2.5"
                />

                <circle
                  cx={labelPoint.x}
                  cy={labelPoint.y}
                  r="13"
                  fill="rgb(15 23 42)"
                  stroke="rgb(45 212 191)"
                  strokeOpacity="0.55"
                  strokeWidth="1.5"
                />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="rgb(94 234 212)"
                >
                  {index + 1}
                </text>
              </g>
            );
          })}

          <text
            x={CENTER + 5}
            y={CENTER - 7}
            fontSize="9"
            fill="rgb(100 116 139)"
          >
            0
          </text>
          <text
            x={CENTER + 5}
            y={CENTER - RADIUS + 12}
            fontSize="9"
            fill="rgb(100 116 139)"
          >
            100
          </text>
        </svg>
      </div>

      <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {items.map((item, index) => (
          <div
            key={item.key}
            className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/25 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-teal-500/25 bg-teal-500/10 text-2xs font-bold text-teal-300">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <div className="break-words text-xs leading-snug text-slate-400">
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-bold text-teal-300">
                  {item.value === null ? 'Não avaliado' : `${Math.round(item.value)}/100`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
