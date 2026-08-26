import {useEffect,useMemo,useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {AssessmentData} from '../types';
import {loadDraft,saveDraft,saveSubmission} from '../storage';
import {saveAssessmentProgress,completeAssessment} from '../lib/assessment.functions';
import {loadSession} from '../lib/assessment-session';
import ClientHeader from '../components/ClientHeader';
import {ArrowRight,ArrowLeft,CheckCircle2,Info,Wifi,MonitorSmartphone,Database,KeyRound,Building2} from 'lucide-react';

const Card=({children}:{children:ReactNode})=><div className="glass-card p-6 md:p-8">{children}</div>;
const Field=({label,help,children}:{label:string,help?:string,children:ReactNode})=> (
  <label className="question-field block">
    <span className="question-label font-semibold text-slate-100">{label}</span>
    <div className="question-control">{children}</div>
    {help && <span className="question-help block text-sm leading-relaxed text-slate-400">{help}</span>}
  </label>
);
const QuestionPair=({children}:{children:ReactNode})=><div className="question-pair">{children}</div>;
const StepSection=({eyebrow,title,description,children}:{eyebrow:string,title:string,description:string,children:ReactNode})=>(
  <section className="rounded-2xl border border-slate-800/80 bg-slate-950/20 p-5 md:p-6">
    <div className="mb-5 border-b border-slate-800/70 pb-4">
      <div className="text-2xs font-bold uppercase tracking-[.16em] text-teal-400">{eyebrow}</div>
      <h3 className="mt-1 text-lg font-bold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
    <div className="space-y-5">{children}</div>
  </section>
);
const input='w-full rounded-xl border border-slate-700/80 bg-slate-950/65 px-4 py-3.5 text-slate-100 shadow-inner outline-none transition placeholder:text-slate-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10';
const select=input;

const sectors=[
  'Saúde','Advocacia','Contabilidade','Construção / Engenharia','Indústria','Varejo','Distribuição / Atacado',
  'Transporte / Logística','Hotelaria / Turismo','Alimentação','Educação','Serviços Profissionais','Tecnologia','Financeiro','Imobiliário','Outros'
];

const firewallVendors=['MikroTik','Fortinet','SonicWall','Sophos','WatchGuard','Palo Alto Networks','Cisco','Check Point','pfSense / OPNsense','Ubiquiti','Outro','Não sei informar'];

export default function AssessmentForm(){
  const nav=useNavigate();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('concierge-client-assessment-step-v2');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [a,setA]=useState<AssessmentData>(()=>loadDraft());
  const [isSaving, setIsSaving] = useState(false);
  const set=(k:keyof AssessmentData,v:any)=>setA(x=>({...x,[k]:v}));

  useEffect(() => {
    localStorage.setItem('concierge-client-assessment-step-v2', String(step));
  }, [step]);

  useEffect(() => {
    setIsSaving(true);
    const t = setTimeout(() => {
      saveDraft(a);
      setIsSaving(false);
      window.dispatchEvent(new Event('storage'));
    }, 180);
    return () => clearTimeout(t);
  }, [a]);

  useEffect(() => {
    const handleStorageChange = () => {
      setA(loadDraft());
      const savedStep = localStorage.getItem('concierge-client-assessment-step-v2');
      setStep(savedStep ? parseInt(savedStep, 10) : 0);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const steps=useMemo(()=>[
    {name:'Empresa',icon:Building2,desc:'Contexto e porte do ambiente'},
    {name:'Rede',icon:Wifi,desc:'Internet, perímetro e conectividade'},
    {name:'Dispositivos',icon:MonitorSmartphone,desc:'Proteção dos computadores'},
    {name:'Continuidade',icon:Database,desc:'Backup e capacidade de recuperação'},
    {name:'Acesso',icon:KeyRound,desc:'Identidades, MFA e contexto'}
  ],[]);

  // Sincronização das respostas com o banco (autosave), sem alterar o
  // comportamento do rascunho local existente. O dep é o conteúdo serializado
  // para não reiniciar o debounce a cada nova referência de objeto.
  const snapshot = JSON.stringify(a);
  useEffect(() => {
    const session = loadSession();
    if (!session) return;
    const t = setTimeout(() => {
      void saveAssessmentProgress({
        data: {
          assessmentId: session.assessmentId,
          editToken: session.editToken,
          step,
          data: JSON.parse(snapshot),
        },
      }).catch(() => {});
    }, 900);
    return () => clearTimeout(t);
  }, [snapshot, step]);

  const submit=()=>{
    const session = loadSession();
    if (session) {
      void completeAssessment({
        data: { assessmentId: session.assessmentId, editToken: session.editToken, data: a },
      }).catch(() => {});
    }
    const s=saveSubmission(a);
    nav(`/resultado?id=${s.id}&success=true`);
  };

  const current=steps[step];
  const firewallVendorValue=firewallVendors.includes(a.firewallVendor)?a.firewallVendor:(a.firewallVendor?'Outro':'Não sei informar');
  const sectorValue=sectors.includes(a.sector)?a.sector:(a.sector?'Outros':'');
  const sectorOtherValue=a.sector==='Outros'?a.sectorOther:(!sectors.includes(a.sector)?a.sector:a.sectorOther);

  return <main className="min-h-screen bg-dashboard-animate bg-grid-tech px-4 py-7 md:py-10"><div className="mx-auto max-w-5xl">
    <ClientHeader />

    <div className="mb-6 grid grid-cols-5 gap-2">{steps.map((s,i)=><div key={s.name}><div className={`h-1.5 rounded-full transition ${i<=step?'bg-gradient-to-r from-cyan-500 to-teal-400':'bg-slate-800'}`}/><div className={`mt-2 hidden text-xs md:block ${i===step?'font-semibold text-teal-300':'text-slate-600'}`}>{s.name}</div></div>)}</div>

    <Card>
      <div className="mb-7 flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-start">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-teal-500/20 bg-teal-500/10"><current.icon className="text-teal-300"/></div>
          <div>
            <div className="text-xs font-bold uppercase tracking-[.18em] text-teal-400">Etapa {step+1} de {steps.length}</div>
            <h2 className="mt-1 text-2xl font-bold">{current.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{current.desc}. Preencha apenas o que souber. “Não sei informar” é uma resposta válida.</p>
          </div>
        </div>
        <div className="mt-1 flex shrink-0 items-center gap-1.5 self-end rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-1.5 text-xs text-slate-500 sm:self-start">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${isSaving ? 'animate-pulse bg-amber-400' : 'bg-teal-500'}`} />
          <span>{isSaving ? 'Salvando...' : 'Respostas salvas'}</span>
        </div>
      </div>

      {step===0&&<div className="space-y-5">
        <QuestionPair>
          <Field label="Nome da empresa"><input className={input} value={a.companyName} onChange={e=>set('companyName',e.target.value)} placeholder="Ex.: Empresa ABC"/></Field>
          <Field label="Setor de atuação"><div className="space-y-2"><select className={select} value={sectorValue} onChange={e=>{set('sector',e.target.value); if(e.target.value!=='Outros')set('sectorOther','')}}><option value="">Selecione o setor</option>{sectors.map(s=><option key={s} value={s}>{s}</option>)}</select>{sectorValue==='Outros'&&<input className={input} value={sectorOtherValue} onChange={e=>set('sectorOther',e.target.value)} placeholder="Informe o setor" aria-label="Qual é o setor de atuação?"/>}</div></Field>
        </QuestionPair>

        <QuestionPair>
          <Field label="Seu nome"><input className={input} value={a.contactName} onChange={e=>set('contactName',e.target.value)}/></Field>
          <Field label="Cargo"><input className={input} value={a.contactRole} onChange={e=>set('contactRole',e.target.value)}/></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="E-mail"><input className={input} type="email" value={a.contactEmail} onChange={e=>set('contactEmail',e.target.value)}/></Field>
          <Field label="Usuários do ambiente"><input className={input} type="number" min="0" value={a.users||''} onChange={e=>set('users',+e.target.value)}/></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="Unidades / filiais" help="Considere matriz, filiais ou unidades que façam parte do ambiente avaliado."><input className={input} type="number" min="1" value={a.sites} onChange={e=>set('sites',+e.target.value)}/></Field>
          <div className="hidden md:block"/>
        </QuestionPair>
      </div>}

      {step===1&&<div className="space-y-6">
        <StepSection
          eyebrow="Parte 1 de 2"
          title="Proteção e acompanhamento"
          description="Primeiro, queremos entender como a rede é protegida e quem acompanha os alertas de segurança."
        >
          <QuestionPair>
            <Field label="Como sua empresa protege hoje o acesso à internet e à rede?" help="Escolha a opção mais próxima do cenário atual."><select className={select} value={a.firewallLevel} onChange={e=>set('firewallLevel',e.target.value)}><option value="unknown">Não sei informar</option><option value="none">Não possui firewall dedicado</option><option value="isp">Utiliza apenas equipamento da operadora</option><option value="router">MikroTik ou roteador/firewall básico</option><option value="utm">Firewall corporativo / UTM</option><option value="ngfw">NGFW licenciado</option><option value="managed_ngfw">NGFW acompanhado por equipe especializada</option></select></Field>
            <Field label="Quem acompanha alertas e eventos de segurança?" help="Queremos entender se existe apenas tecnologia instalada ou também acompanhamento operacional."><select className={select} value={a.monitoring} onChange={e=>set('monitoring',e.target.value)}><option value="unknown">Não sei informar</option><option value="none">Ninguém acompanha regularmente</option><option value="reactive_it">Equipe de TI verifica quando necessário</option><option value="outsourced_it">Empresa terceirizada de TI</option><option value="security_team">Equipe especializada de segurança</option><option value="soc">SOC / monitoramento contínuo</option></select></Field>
          </QuestionPair>

          {!['none','isp','unknown'].includes(a.firewallLevel)&&<>
            <QuestionPair>
              <Field label="O licenciamento de segurança está ativo?"><select className={select} value={a.firewallLicense} onChange={e=>set('firewallLicense',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
              <Field label="Fabricante do firewall, se souber"><select className={select} value={firewallVendorValue} onChange={e=>set('firewallVendor',e.target.value==='Não sei informar'?'':e.target.value)}>{firewallVendors.map(v=><option key={v} value={v}>{v}</option>)}</select></Field>
            </QuestionPair>
            <QuestionPair>
              {firewallVendorValue==='Outro' ? <Field label="Outro fabricante"><input className={input} value={a.firewallVendor==='Outro'?'':a.firewallVendor} onChange={e=>set('firewallVendor',e.target.value)} placeholder="Informe o fabricante"/></Field> : <div className="hidden md:block"/>}
              <Field label="Modelo do equipamento, se souber"><input className={input} value={a.firewallModel} onChange={e=>set('firewallModel',e.target.value)} placeholder="Ex.: 40F, TZ80, RB4011..."/></Field>
            </QuestionPair>
          </>}
        </StepSection>

        <StepSection
          eyebrow="Parte 2 de 2"
          title="Conectividade e acessos"
          description="Agora alguns dados de capacidade. Eles ajudam a entender o porte do ambiente e apoiam o pré-dimensionamento interno da Concierge."
        >
          <QuestionPair>
            <Field label="Quantidade de links de internet"><input className={input} type="number" min="1" value={a.internetLinkCount} onChange={e=>set('internetLinkCount',+e.target.value)}/></Field>
            <Field label="Velocidade total aproximada dos links (Mbps)" help="Informe a soma aproximada das velocidades contratadas."><input className={input} type="number" min="0" value={a.links[0].speedMbps||''} onChange={e=>set('links',[{speedMbps:+e.target.value}])}/></Field>
          </QuestionPair>
          <QuestionPair>
            <Field label="Perfil de uso da internet"><select className={select} value={a.networkUsage} onChange={e=>set('networkUsage',e.target.value)}><option value="light">Leve — navegação, e-mail, sistemas simples</option><option value="medium">Médio — cloud, videoconferência e uso frequente</option><option value="high">Intenso — alto tráfego, múltiplos serviços e transferências</option></select></Field>
            <Field label="Acessos VPN remotos" help="Se não souber, pode deixar em branco."><input className={input} type="number" min="0" value={a.vpnRemote||''} onChange={e=>set('vpnRemote',+e.target.value)}/></Field>
          </QuestionPair>
          <QuestionPair>
            <Field label="VPNs entre unidades" help="Considere túneis entre matriz, filiais ou outras unidades. Se não souber, deixe em branco."><input className={input} type="number" min="0" value={a.vpnSite||''} onChange={e=>set('vpnSite',+e.target.value)}/></Field>
            <Field label="Quantidade de VLANs" help="Se não souber, pode deixar em branco."><input className={input} type="number" min="0" value={a.vlans||''} onChange={e=>set('vlans',+e.target.value)}/></Field>
          </QuestionPair>
        </StepSection>
      </div>}

      {step===2&&<div className="space-y-5">
        <QuestionPair>
          <Field label="Como os computadores são protegidos hoje?" help="Escolha a opção mais próxima do nível de proteção utilizado."><select className={select} value={a.endpointLevel} onChange={e=>set('endpointLevel',e.target.value)}><option value="unknown">Não sei informar</option><option value="none">Sem proteção padronizada</option><option value="basic_av">Antivírus gratuito / individual</option><option value="business_av">Antivírus corporativo</option><option value="edr">EDR / XDR</option><option value="managed_edr">EDR / XDR acompanhado por equipe especializada</option></select></Field>
          <Field label="Computadores e notebooks" help="Informe aproximadamente quantos equipamentos corporativos são utilizados. Esse dado é diferente do número de usuários."><input className={input} type="number" min="0" value={a.endpointCount||a.devices||''} onChange={e=>{set('endpointCount',+e.target.value);set('devices',+e.target.value)}}/></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="Servidores"><input className={input} type="number" min="0" value={a.servers||''} onChange={e=>set('servers',+e.target.value)}/></Field>
          <Field label="Atualizações de segurança são aplicadas automaticamente?"><select className={select} value={a.autoUpdates} onChange={e=>set('autoUpdates',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="Usuários costumam ter perfil de administrador local?" help="Perfil de administrador permite instalar programas e alterar configurações importantes."><select className={select} value={a.localAdmins} onChange={e=>set('localAdmins',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
          <Field label="Há uso de computadores pessoais para trabalhar?"><select className={select} value={a.byod} onChange={e=>set('byod',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
        </QuestionPair>
      </div>}

      {step===3&&<div className="space-y-5">
        <QuestionPair>
          <Field label="Como os dados são protegidos hoje?" help="Considere arquivos, servidores, sistemas e dados importantes para a operação."><select className={select} value={a.backupLevel} onChange={e=>set('backupLevel',e.target.value)}><option value="unknown">Não sei informar</option><option value="none">Não existe backup formal</option><option value="manual">Cópias manuais</option><option value="automated_local">Backup automatizado local</option><option value="cloud">Backup automatizado em nuvem</option><option value="multi_copy">Mais de uma cópia / local</option><option value="managed">Backup gerenciado, com política e acompanhamento</option></select></Field>
          <Field label="Volume aproximado a proteger (GB)" help="Se souber, informe uma estimativa do volume de dados mais importante para a operação."><input className={input} type="number" min="0" value={a.backupVolumeGb||''} onChange={e=>set('backupVolumeGb',+e.target.value)}/></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="Vocês já testaram se conseguem restaurar essas informações?"><select className={select} value={a.restoreTests} onChange={e=>set('restoreTests',e.target.value)}><option value="unknown">Não sei informar</option><option value="regular">Sim, periodicamente</option><option value="once">Já testamos alguma vez</option><option value="never">Nunca testamos</option></select></Field>
          <Field label="Quanto tempo a operação consegue ficar indisponível?" help="Pense no tempo máximo aceitável sem os sistemas ou dados mais importantes."><select className={select} value={a.maxDowntime} onChange={e=>set('maxDowntime',e.target.value)}><option value="unknown">Não sei informar</option><option value="4h">Até 4 horas</option><option value="8h">Até 8 horas</option><option value="1d">Até 1 dia</option><option value="2d">Até 2 dias</option><option value="more">Mais de 2 dias</option></select></Field>
        </QuestionPair>
      </div>}

      {step===4&&<div className="space-y-5">
        <QuestionPair>
          <Field label="MFA é usado nas contas importantes?" help="MFA é uma confirmação adicional por aplicativo, código ou outro fator além da senha."><select className={select} value={a.mfa} onChange={e=>set('mfa',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim, de forma ampla</option><option value="partial">Apenas em algumas contas</option><option value="no">Não</option></select></Field>
          <Field label="Existem contas compartilhadas entre colaboradores?"><select className={select} value={a.sharedAccounts} onChange={e=>set('sharedAccounts',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="Quando alguém sai da empresa, existe processo para remover os acessos?"><select className={select} value={a.offboarding} onChange={e=>set('offboarding',e.target.value)}><option value="unknown">Não sei informar</option><option value="formal">Sim, existe processo definido</option><option value="informal">É feito caso a caso</option></select></Field>
          <Field label="A empresa trata dados pessoais ou sensíveis?"><select className={select} value={a.sensitiveData} onChange={e=>set('sensitiveData',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="Já houve incidente, perda de dados ou indisponibilidade relevante?"><select className={select} value={a.incidentHistory} onChange={e=>set('incidentHistory',e.target.value)}><option value="unknown">Prefiro não informar / não sei</option><option value="no">Não</option><option value="yes">Sim</option></select></Field>
          <Field label="Qual é a principal preocupação hoje?"><input className={input} value={a.mainConcern} onChange={e=>set('mainConcern',e.target.value)} placeholder="Ex.: ransomware, LGPD, parada, acesso remoto..."/></Field>
        </QuestionPair>
        <Field label="Algo importante que devemos considerar?"><textarea className={input} rows={4} value={a.notes} onChange={e=>set('notes',e.target.value)} placeholder="Contexto, sistemas críticos, mudanças planejadas ou qualquer informação relevante."/></Field>
      </div>}

      <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5"><button className="flex items-center gap-2 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800/60 disabled:opacity-30" disabled={step===0} onClick={()=>setStep(s=>s-1)}><ArrowLeft size={18}/>Voltar</button>{step<steps.length-1?<button className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold shadow-lg shadow-teal-950/30 transition hover:bg-teal-500" onClick={()=>{setStep(s=>s+1);window.scrollTo({top:0,behavior:'smooth'})}}>Continuar<ArrowRight size={18}/></button>:<button className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold shadow-lg shadow-teal-950/30 transition hover:bg-teal-500" onClick={submit}><CheckCircle2 size={18}/>Enviar assessment</button>}</div>
    </Card>
    <div className="mt-5 flex gap-2 text-sm text-slate-500"><Info className="mt-0.5 shrink-0" size={17}/><span>As respostas compõem um diagnóstico inicial e serão revisadas pela equipe Concierge. O assessment não substitui validação técnica e não transforma “não sei informar” em falha automática.</span></div>
  </div></main>
}
