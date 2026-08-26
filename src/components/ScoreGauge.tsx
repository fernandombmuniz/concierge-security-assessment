interface Props { value:number|null; label?:string; size?:number; }
export default function ScoreGauge({value,label='Postura geral',size=170}:Props){
  const v=value??0; const r=62; const c=2*Math.PI*r; const dash=c*(v/100);
  return <div className="score-gauge" style={{width:size,height:size}} aria-label={`${label}: ${value===null?'não avaliado':`${value} de 100`}`}>
    <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full -rotate-90">
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(148,163,184,.14)" strokeWidth="12"/>
      <circle cx="80" cy="80" r={r} fill="none" stroke="url(#gaugeGradient)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${c-dash}`} />
      <defs><linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22d3ee"/><stop offset="100%" stopColor="#14b8a6"/></linearGradient></defs>
    </svg>
    <div className="relative z-10 text-center">
      <div className="text-5xl font-extrabold tracking-tight text-white">{value===null?'—':value}</div>
      <div className="mt-1 text-xs font-bold uppercase tracking-[.18em] text-slate-500">{value===null?'sem dados':'de 100'}</div>
    </div>
  </div>
}
