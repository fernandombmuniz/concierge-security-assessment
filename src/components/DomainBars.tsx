import { DomainScore, maturityLevel } from '../scoring';
interface Item {label:string;value:DomainScore;icon?:React.ReactNode}
export default function DomainBars({items}:{items:Item[]}){return <div className="space-y-5">{items.map(item=>{
 const width=item.value??0;
 return <div key={item.label}>
  <div className="mb-2 flex items-center justify-between gap-4"><div className="flex items-center gap-2 font-semibold text-slate-200">{item.icon}{item.label}</div><div className="text-right"><span className="text-lg font-bold text-white">{item.value===null?'—':item.value}</span><span className="ml-1 text-xs text-slate-500">/100</span></div></div>
  <div className="h-2.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-700" style={{width:`${width}%`}}/></div>
  <div className="mt-1.5 text-xs text-slate-500">{maturityLevel(item.value)}</div>
 </div>})}</div>}
