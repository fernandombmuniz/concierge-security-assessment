import { useEffect, useId, useState } from 'react';

interface Props {
  value: number | null;
  label?: string;
  size?: number;
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function ScoreGauge({
  value,
  label = 'Postura geral',
  size = 170,
}: Props) {
  const gradientId = useId().replace(/:/g, '');
  const target = value === null ? 0 : clamp(value);

  const [displayValue, setDisplayValue] = useState(0);
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference * (1 - progress / 100);

  useEffect(() => {
    let frame = 0;
    let startTimer = 0;

    if (value === null) {
      setDisplayValue(0);
      setProgress(0);
      setIsAnimating(false);
      return;
    }

    setDisplayValue(0);
    setProgress(0);
    setIsAnimating(true);

    // Um pequeno atraso faz a página aparecer primeiro e deixa
    // o movimento do score perceptível para o usuário.
    startTimer = window.setTimeout(() => {
      const duration = 1400;
      const start = performance.now();

      const animate = (now: number) => {
        const elapsed = Math.min(1, (now - start) / duration);
        const eased = easeOutCubic(elapsed);
        const current = target * eased;

        setProgress(current);
        setDisplayValue(Math.round(current));

        if (elapsed < 1) {
          frame = requestAnimationFrame(animate);
        } else {
          setProgress(target);
          setDisplayValue(Math.round(target));
          setIsAnimating(false);
        }
      };

      frame = requestAnimationFrame(animate);
    }, 180);

    return () => {
      window.clearTimeout(startTimer);
      cancelAnimationFrame(frame);
    };
  }, [target, value]);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 70);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className="score-gauge transition-all duration-700 ease-out"
      style={{
        width: size,
        height: size,
        opacity: entered ? 1 : 0,
        transform: entered ? 'scale(1)' : 'scale(.94)',
      }}
      aria-label={`${label}: ${value === null ? 'não avaliado' : `${value} de 100`}`}
    >
      <svg
        viewBox="0 0 160 160"
        className="absolute inset-0 h-full w-full -rotate-90"
      >
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,.14)"
          strokeWidth="12"
        />

        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          style={{
            filter: isAnimating
              ? 'drop-shadow(0 0 10px rgba(20,184,166,.38))'
              : 'drop-shadow(0 0 7px rgba(20,184,166,.18))',
            transition: 'filter 300ms ease',
          }}
        />

        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      </svg>

      <div
        className="relative z-10 text-center transition-all duration-500"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(4px)',
        }}
      >
        <div className="text-5xl font-extrabold tracking-tight text-white tabular-nums">
          {value === null ? '—' : displayValue}
        </div>

        <div className="mt-1 text-xs font-bold uppercase tracking-[.18em] text-slate-500">
          {value === null ? 'sem dados' : 'de 100'}
        </div>
      </div>
    </div>
  );
}
