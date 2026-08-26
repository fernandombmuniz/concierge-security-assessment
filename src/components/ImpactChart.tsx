const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
export default function ImpactChart({components}:{components:{productivity:[number,number];technical:[number,number];disruption:[number,number]}}){
 const rows=[['Produtividade parada',components.productivity],['Recuperação técnica',components.technical],['Impacto operacional',components.disruption]] as const;
 const max=Math.max(...rows.map(([,v])=>v[1]),1);
 return <div className="space-y-4">{rows.map(([label,range])=><div key={label}><div className="mb-2 flex justify-between gap-4 text-sm"><span className="text-slate-300">{label}</span><span className="font-semibold text-white">{money(range[0])} – {money(range[1])}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500/70 to-teal-400" style={{width:`${Math.max(8,(range[1]/max)*100)}%`}}/></div></div>)}</div>
}
