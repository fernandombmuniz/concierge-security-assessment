import type { ReactNode } from 'react';

export function CyberBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 78% 12%, rgba(6,182,212,.14), transparent 27%), radial-gradient(circle at 20% 20%, rgba(14,116,144,.08), transparent 28%), linear-gradient(180deg, #07101f 0%, #081426 55%, #07101f 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.05) 1px, transparent 1px)',
          backgroundSize: '68px 68px',
          maskImage:
            'linear-gradient(to bottom, rgba(0,0,0,.8), rgba(0,0,0,.18))',
        }}
      />
      <div
        className="absolute -bottom-[24%] left-[-12%] h-[70%] w-[124%] origin-bottom opacity-55"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.09) 1px, transparent 1px)',
          backgroundSize: '58px 58px',
          transform: 'perspective(900px) rotateX(64deg)',
        }}
      />
      <div className="absolute right-[-12%] top-[5%] h-[520px] w-[520px] rounded-full bg-cyan-400/[0.06] blur-[95px]" />
      <svg
        className="absolute right-[2%] top-[8%] hidden h-[300px] w-[330px] opacity-[0.11] xl:block"
        viewBox="0 0 320 280"
        fill="none"
      >
        <path
          d="M160 28 254 62v70c0 61-34 102-94 127-60-25-94-66-94-127V62l94-34Z"
          stroke="#22d3ee"
          strokeWidth="2.2"
        />
        <path
          d="M130 127v-18c0-20 13-35 30-35s30 15 30 35v18"
          stroke="#22d3ee"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect
          x="119"
          y="126"
          width="82"
          height="67"
          rx="14"
          stroke="#22d3ee"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

export function ConciergeBrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg
        className={compact ? 'h-10 w-10 shrink-0' : 'h-[74px] w-[74px] shrink-0'}
        viewBox="0 0 90 90"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M45 6 76 18v24c0 21-12 35-31 43C26 77 14 63 14 42V18L45 6Z"
          stroke="white"
          strokeWidth="4"
        />
        <path d="M36 28 58 43 36 58V28Z" fill="white" />
        <rect x="60" y="52" width="12" height="12" rx="2" fill="#22d3ee" />
        <rect x="69" y="41" width="10" height="10" rx="2" fill="#22d3ee" />
      </svg>
      <div className="leading-none">
        <div
          className={
            compact
              ? 'text-xl font-semibold tracking-[-0.02em] text-white'
              : 'text-4xl font-semibold tracking-[-0.03em] text-white'
          }
        >
          Concierge
        </div>
        <div
          className={
            compact
              ? 'mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300'
              : 'mt-2 text-sm font-bold uppercase tracking-[0.23em] text-cyan-300'
          }
        >
          Segurança Digital
        </div>
      </div>
    </div>
  );
}

export function TechnicalShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07101f] px-4 py-6 text-white md:py-10">
      <CyberBackdrop />
      <div className="relative z-10 mx-auto max-w-6xl">{children}</div>
    </main>
  );
}
