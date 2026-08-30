import {useEffect,useMemo,useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {AssessmentData} from '../types';
import {loadDraft,saveDraft,saveSubmission} from '../storage';
import {saveAssessmentProgress,completeAssessment} from '../lib/assessment.functions';
import {loadSession} from '../lib/assessment-session';
import ClientHeader from '../components/ClientHeader';
import {ArrowRight,ArrowLeft,CheckCircle2,Info,Wifi,MonitorSmartphone,Database,KeyRound,Building2,Loader2} from 'lucide-react';

const Card=({children}:{children:ReactNode})=><div className="glass-card p-6 md:p-8">{children}</div>;
const Field=({label,help,children}:{label:string,help?:string,children:ReactNode})=> (
  <label className="question-field flex h-full flex-col">
    <span className="question-label flex min-h-0 items-end font-semibold leading-snug text-slate-100 md:min-h-[2.9rem]">{label}</span>
    <div className="question-control mt-2">{children}</div>
    <span className="question-help mt-2 block min-h-0 text-sm leading-relaxed text-slate-400 md:min-h-[2.6rem]">{help || ''}</span>
  </label>
);
const QuestionPair=({children}:{children:ReactNode})=><div className="grid gap-5 md:grid-cols-2 md:items-stretch">{children}</div>;
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

const peopleBucket=(n:number)=>!n?0:n<=10?5:n<=20?15:n<=50?35:n<=100?75:n<=200?150:250;
const deviceBucket=peopleBucket;
const serverBucket=(n:number)=>!n?0:n===1?1:n<=5?3:6;
const teamBucket=(n:number)=>!n?0:n===1?1:n<=5?3:6;
const backupBucket=(n:number)=>!n?0:n<=100?50:n<=500?300:n<=1000?750:n<=5000?3000:7500;

export default function AssessmentForm(){
  const nav=useNavigate();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('concierge-client-assessment-step-v2');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [a,setA]=useState<AssessmentData>(()=>loadDraft());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const set=(k:keyof AssessmentData,v:any)=>setA(x=>({...x,[k]:v}));

  useEffect(() => {
    localStorage.setItem('concierge-client-assessment-step-v2', String(step));
  }, [step]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveDraft(a);
    }, 300);

    return () => {
      window.clearTimeout(t);
    };
  }, [a]);

  const steps=useMemo(()=>[
    {name:'Empresa',icon:Building2,desc:'Sobre a empresa e quem utiliza a tecnologia'},
    {name:'Internet e rede',icon:Wifi,desc:'Como a conexão é protegida e acompanhada'},
    {name:'Computadores',icon:MonitorSmartphone,desc:'Como os computadores são protegidos no dia a dia'},
    {name:'Dados e backup',icon:Database,desc:'Onde estão os dados e como a empresa consegue recuperá-los'},
    {name:'Contas e segurança',icon:KeyRound,desc:'Acessos, e-mail e preparação para incidentes'}
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

const submit=async()=>{
  if (isSubmitting) return;

  const startedAt = performance.now();
  const minimumTransitionMs = 950;

  setIsSubmitting(true);

  const session = loadSession();

  // Preserva o rascunho local antes do envio remoto.
  saveDraft(a);

  if (!session) {
    alert(
      'Não encontramos a sessão deste diagnóstico. ' +
      'Suas respostas continuam salvas neste dispositivo.'
    );

    setIsSubmitting(false);
    return;
  }

  try {
    await completeAssessment({
      data: {
        assessmentId: session.assessmentId,
        editToken: session.editToken,
        data: a
      },
    });

    // Mantém uma transição mínima para que o usuário perceba que
    // o assessment está sendo processado, mesmo quando a API responde rápido.
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, minimumTransitionMs - elapsed);

    if (remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, remaining));
    }

    const s = saveSubmission(a);
    nav(`/resultado?id=${s.id}&success=true`);
  } catch (error) {
    console.error('Falha ao concluir assessment:', error);

    alert(
      'Não foi possível enviar o diagnóstico neste momento. ' +
      'Suas respostas continuam salvas neste dispositivo. ' +
      'Verifique sua conexão e tente novamente.'
    );

    setIsSubmitting(false);
  }
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
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" />
          <span>Respostas salvas automaticamente</span>
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
          <Field label="Quantas pessoas utilizam computadores, sistemas ou a rede da empresa?" help="Considere funcionários e colaboradores que utilizam os recursos de TI regularmente."><select className={select} value={peopleBucket(a.users)} onChange={e=>set('users',+e.target.value)}><option value="0">Selecione uma faixa</option><option value="5">Até 10 pessoas</option><option value="15">11 a 20 pessoas</option><option value="35">21 a 50 pessoas</option><option value="75">51 a 100 pessoas</option><option value="150">101 a 200 pessoas</option><option value="250">Mais de 200 pessoas</option></select></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="Quantas unidades ou filiais a empresa possui?" help="Considere matriz, filiais ou unidades que façam parte deste diagnóstico."><input className={input} type="number" min="1" value={a.sites} onChange={e=>set('sites',+e.target.value)}/></Field>
          <Field label="Quem cuida da TI no dia a dia?" help="Isso ajuda a entender quem normalmente administra equipamentos, sistemas e acessos."><select className={select} value={teamBucket(a.itTeamSize)} onChange={e=>set('itTeamSize',+e.target.value)}><option value="0">Não há equipe interna / não sei informar</option><option value="1">1 pessoa interna</option><option value="3">2 a 5 pessoas internas</option><option value="6">Mais de 5 pessoas internas</option></select></Field>
        </QuestionPair>
      </div>}

      {step===1&&<div className="space-y-6">
        <StepSection
          eyebrow="Parte 1 de 2"
          title="Proteção e acompanhamento"
          description="Primeiro, queremos entender como a rede é protegida e quem acompanha os alertas de segurança."
        >
          <QuestionPair>
            <Field label="Como a empresa protege hoje a conexão com a internet?" help="Escolha a opção mais próxima do que existe hoje. Se não souber, tudo bem."><select className={select} value={a.firewallLevel} onChange={e=>set('firewallLevel',e.target.value)}><option value="unknown">Não sei informar</option><option value="none">Não existe uma proteção dedicada além do roteador comum</option><option value="isp">Usa apenas o equipamento fornecido pela operadora</option><option value="router">Usa MikroTik ou outro roteador corporativo</option><option value="utm">Usa um equipamento próprio para proteger a rede</option><option value="ngfw">Usa uma solução de segurança com bloqueios e proteções adicionais</option><option value="managed_ngfw">Usa uma solução de segurança acompanhada por equipe especializada</option></select></Field>
            <Field label="Quando algo suspeito acontece na rede, quem costuma receber ou verificar os alertas?" help="Queremos saber se alguém acompanha o que acontece, e não apenas se existe um equipamento instalado."><select className={select} value={a.monitoring} onChange={e=>set('monitoring',e.target.value)}><option value="unknown">Não sei informar</option><option value="none">Ninguém acompanha regularmente</option><option value="reactive_it">Equipe de TI verifica quando necessário</option><option value="outsourced_it">Empresa terceirizada de TI</option><option value="security_team">Equipe especializada de segurança</option><option value="soc">Equipe especializada com acompanhamento contínuo</option></select></Field>
          </QuestionPair>
          <QuestionPair>
            <Field label="A proteção da internet consegue bloquear ameaças além de simplesmente permitir ou negar acessos?" help="Por exemplo: bloquear sites maliciosos, tentativas de ataque ou aplicações indevidas. Se não souber, escolha “Não sei informar”."><select className={select} value={a.firewallThreatPrevention} onChange={e=>set('firewallThreatPrevention',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim, existem vários bloqueios e proteções adicionais</option><option value="partial">Existem algumas proteções adicionais</option><option value="no">Não, atua principalmente controlando acessos</option></select></Field>
            <Field label="Alguém revisa e atualiza regularmente os equipamentos que protegem a rede?"><select className={select} value={a.networkMaintenance} onChange={e=>set('networkMaintenance',e.target.value)}><option value="unknown">Não sei informar</option><option value="formal">Sim, existe rotina definida</option><option value="informal">É feito quando necessário</option><option value="none">Não existe rotina definida</option></select></Field>
          </QuestionPair>

          {!['none','isp','unknown'].includes(a.firewallLevel)&&<>
            <QuestionPair>
              <Field label="A solução de segurança recebe atualizações e mantém os recursos contratados ativos?"><select className={select} value={a.firewallLicense} onChange={e=>set('firewallLicense',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
              <Field label="Marca do equipamento de segurança, se souber"><select className={select} value={firewallVendorValue} onChange={e=>set('firewallVendor',e.target.value==='Não sei informar'?'':e.target.value)}>{firewallVendors.map(v=><option key={v} value={v}>{v}</option>)}</select></Field>
            </QuestionPair>
            <QuestionPair>
              {firewallVendorValue==='Outro' ? <Field label="Outro fabricante"><input className={input} value={a.firewallVendor==='Outro'?'':a.firewallVendor} onChange={e=>set('firewallVendor',e.target.value)} placeholder="Informe o fabricante"/></Field> : <div className="hidden md:block"/>}
              <Field label="Modelo do equipamento, se souber"><input className={input} value={a.firewallModel} onChange={e=>set('firewallModel',e.target.value)} placeholder="Ex.: 40F, TZ80, RB4011..."/></Field>
            </QuestionPair>
          </>}
        </StepSection>

        <StepSection
          eyebrow="Parte 2 de 2"
          title="Internet e conexão"
          description="Agora alguns dados simples sobre a conexão. Se você não souber algum deles, pode deixar em branco."
        >
          <QuestionPair>
            <Field label="Quantas conexões de internet a empresa possui?"><input className={input} type="number" min="1" value={a.internetLinkCount} onChange={e=>set('internetLinkCount',+e.target.value)}/></Field>
            <Field label="Qual é a velocidade aproximada contratada? (Mbps)" help="Ex.: 500 para um link de 500 Mbps ou 1000 para 1 Gbps. Se houver mais de um link, informe a soma aproximada."><input className={input} type="number" min="0" value={a.links[0].speedMbps||''} onChange={e=>set('links',[{speedMbps:+e.target.value}])}/></Field>
          </QuestionPair>
          <QuestionPair>
            <Field label="Como a internet é usada no dia a dia?"><select className={select} value={a.networkUsage} onChange={e=>set('networkUsage',e.target.value)}><option value="light">Leve — navegação, e-mail, sistemas simples</option><option value="medium">Médio — cloud, videoconferência e uso frequente</option><option value="high">Intenso — alto tráfego, múltiplos serviços e transferências</option></select></Field>
            <Field label="Quantas pessoas acessam a rede da empresa de fora, por conexão segura (VPN)?" help="Se não souber, pode deixar em branco."><input className={input} type="number" min="0" value={a.vpnRemote||''} onChange={e=>set('vpnRemote',+e.target.value)}/></Field>
          </QuestionPair>
          <QuestionPair>
            <Field label="Existem conexões seguras entre matriz e filiais? Quantas?" help="Considere conexões usadas para interligar unidades. Se não souber, deixe em branco."><input className={input} type="number" min="0" value={a.vpnSite||''} onChange={e=>set('vpnSite',+e.target.value)}/></Field>
            <Field label="A rede é separada em grupos, como Administrativo, Visitantes ou Servidores? Quantos grupos?" help="Se não souber, pode deixar em branco."><input className={input} type="number" min="0" value={a.vlans||''} onChange={e=>set('vlans',+e.target.value)}/></Field>
          </QuestionPair>
        </StepSection>
      </div>}

      {step===2&&<div className="space-y-5">
        <QuestionPair>
          <Field label="Os computadores da empresa utilizam antivírus ou outra proteção de segurança?" help="Escolha a opção que mais se aproxima do que você conhece hoje."><select className={select} value={a.endpointLevel} onChange={e=>set('endpointLevel',e.target.value)}><option value="unknown">Não sei informar</option><option value="none">Não existe uma proteção padronizada</option><option value="basic_av">Sim, antivírus instalado individualmente</option><option value="business_av">Sim, antivírus corporativo administrado pela empresa ou TI</option><option value="edr">Sim, proteção avançada que também ajuda a investigar comportamentos suspeitos</option><option value="managed_edr">Sim, proteção avançada que também ajuda a investigar comportamentos suspeitos acompanhado por equipe especializada</option></select></Field>
          <Field label="Aproximadamente quantos computadores e notebooks a empresa utiliza?" help="Não precisa ser exato. Escolha a faixa mais próxima."><select className={select} value={deviceBucket(a.endpointCount||a.devices)} onChange={e=>{set('endpointCount',+e.target.value);set('devices',+e.target.value)}}><option value="0">Selecione uma faixa</option><option value="5">Até 10 equipamentos</option><option value="15">11 a 20 equipamentos</option><option value="35">21 a 50 equipamentos</option><option value="75">51 a 100 equipamentos</option><option value="150">101 a 200 equipamentos</option><option value="250">Mais de 200 equipamentos</option></select></Field>
        </QuestionPair>
        {a.endpointLevel!=='none' && a.endpointLevel!=='unknown' && <QuestionPair>
          <Field label="O responsável pela TI consegue acompanhar e administrar a proteção dos computadores em um único lugar?" help="Por exemplo, visualizar quais computadores estão protegidos, receber alertas e aplicar configurações de forma centralizada."><select className={select} value={a.endpointCentralManagement} onChange={e=>set('endpointCentralManagement',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim, todos ou quase todos</option><option value="partial">Apenas parte dos equipamentos</option><option value="no">Não</option></select></Field>
          <Field label="Quando uma ameaça é detectada em um computador, alguém acompanha o que aconteceu?" help="Queremos saber se existe alguém responsável por olhar o alerta e decidir o que precisa ser feito."><select className={select} value={a.endpointResponse} onChange={e=>set('endpointResponse',e.target.value)}><option value="unknown">Não sei informar</option><option value="managed_soc">Uma equipe especializada acompanha e responde</option><option value="defined_team">Existe uma pessoa ou equipe definida para verificar</option><option value="alerts_only">Existem alertas, mas são verificados apenas quando necessário</option><option value="none">Não existe acompanhamento dos alertas</option></select></Field>
        </QuestionPair>}
        <QuestionPair>
          <Field label="A empresa possui uma lista atualizada dos computadores, servidores e outros equipamentos usados no trabalho?" help="Pode ser uma ferramenta, planilha ou outro controle que permita saber quais equipamentos existem e quem os utiliza."><select className={select} value={a.assetInventory} onChange={e=>set('assetInventory',e.target.value)}><option value="unknown">Não sei informar</option><option value="managed">Sim, inventário atualizado e gerenciado</option><option value="partial">Existe, mas pode estar incompleto</option><option value="informal">Controle informal / planilha sem revisão regular</option><option value="none">Não existe inventário</option></select></Field>
          <div className="hidden md:block"/>
        </QuestionPair>
        {(a.assetInventory!=='unknown' || ['business_av','edr','managed_edr'].includes(a.endpointLevel)) && <QuestionPair>
          <Field label="A empresa verifica periodicamente se computadores e sistemas precisam de atualizações ou correções de segurança?" help="Pense em atualizações pendentes, versões antigas ou falhas que precisem ser corrigidas."><select className={select} value={a.vulnerabilityManagement} onChange={e=>set('vulnerabilityManagement',e.target.value)}><option value="unknown">Não sei informar</option><option value="continuous">Monitoramento contínuo / ferramenta dedicada</option><option value="regular">Verificação periódica definida</option><option value="occasional">Verificações ocasionais</option><option value="reactive">Normalmente quando surge um problema</option><option value="none">Não existe processo</option></select></Field>
          <div className="hidden md:block"/>
        </QuestionPair>}
        <QuestionPair>
          <Field label="A empresa possui servidores próprios?" help="Considere servidores físicos ou virtuais administrados pela empresa."><select className={select} value={serverBucket(a.servers)} onChange={e=>set('servers',+e.target.value)}><option value="0">Não possui / não sei informar</option><option value="1">1 servidor</option><option value="3">2 a 5 servidores</option><option value="6">Mais de 5 servidores</option></select></Field>
          <Field label="Os computadores recebem atualizações de segurança automaticamente?"><select className={select} value={a.autoUpdates} onChange={e=>set('autoUpdates',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
        </QuestionPair>

      </div>}

      {step===3&&<div className="space-y-5">
        <QuestionPair>
          <Field label="Onde ficam os arquivos e informações mais importantes da empresa?" help="Pense onde as pessoas salvam documentos e informações usadas no dia a dia."><select className={select} value={a.dataLocation} onChange={e=>set('dataLocation',e.target.value)}><option value="unknown">Não sei informar</option><option value="corporate_central">Em um local corporativo centralizado, como servidor, SharePoint ou OneDrive da empresa</option><option value="saas_only">Principalmente dentro de sistemas e aplicações em nuvem</option><option value="mixed">Espalhados entre nuvem da empresa, servidores e computadores</option><option value="endpoints">Principalmente nos computadores e notebooks das pessoas</option><option value="personal_cloud">Em contas pessoais ou locais não administrados pela empresa</option></select></Field>
          <div className="hidden md:block"/>
        </QuestionPair>
        <QuestionPair>
          <Field label="A empresa possui cópias de segurança dos dados importantes?" help="Pense nos arquivos e sistemas que fariam falta se fossem perdidos ou apagados."><select className={select} value={a.backupLevel} onChange={e=>set('backupLevel',e.target.value)}><option value="unknown">Não sei informar</option><option value="none">Não existe uma rotina de cópia de segurança</option><option value="manual">Sim, mas as cópias são feitas manualmente</option><option value="automated_local">Sim, cópia automática em equipamento ou local da empresa</option><option value="cloud">Sim, cópia automática em nuvem</option><option value="multi_copy">Sim, existem cópias em mais de um local</option><option value="managed">Sim, existe uma rotina gerenciada e acompanhada</option></select></Field>
          <Field label="Aproximadamente quanto de informação importante precisa ser protegida?" help="Se não souber, escolha “Não sei informar”."><select className={select} value={backupBucket(a.backupVolumeGb)} onChange={e=>set('backupVolumeGb',+e.target.value)}><option value="0">Não sei informar</option><option value="50">Até 100 GB</option><option value="300">100 a 500 GB</option><option value="750">500 GB a 1 TB</option><option value="3000">1 a 5 TB</option><option value="7500">Mais de 5 TB</option></select></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="Existe pelo menos uma cópia que fica separada e protegida caso os dados principais sejam apagados ou atacados?" help="Por exemplo, uma cópia que não possa ser alterada facilmente pelas mesmas pessoas ou sistemas usados no dia a dia."><select className={select} value={a.backupIsolation} onChange={e=>set('backupIsolation',e.target.value)}><option value="unknown">Não sei informar</option><option value="immutable">Sim, existe uma cópia protegida contra alteração</option><option value="isolated">Sim, existe uma cópia separada ou offline</option><option value="separate_account">Sim, existe uma cópia administrada separadamente</option><option value="same_environment">Existe cópia, mas ela depende do mesmo ambiente ou das mesmas credenciais</option><option value="none">Não existe uma cópia separada</option></select></Field>
          <div className="hidden md:block"/>
        </QuestionPair>
        <QuestionPair>
          <Field label="A empresa já testou se consegue recuperar os dados a partir dessas cópias?"><select className={select} value={a.restoreTests} onChange={e=>set('restoreTests',e.target.value)}><option value="unknown">Não sei informar</option><option value="regular">Sim, periodicamente</option><option value="once">Já testamos alguma vez</option><option value="never">Nunca testamos</option></select></Field>
          <Field label="Por quanto tempo a empresa consegue ficar sem os sistemas ou dados mais importantes?" help="Pense no tempo máximo aceitável sem os sistemas ou dados mais importantes."><select className={select} value={a.maxDowntime} onChange={e=>set('maxDowntime',e.target.value)}><option value="unknown">Não sei informar</option><option value="4h">Até 4 horas</option><option value="8h">Até 8 horas</option><option value="1d">Até 1 dia</option><option value="2d">Até 2 dias</option><option value="more">Mais de 2 dias</option></select></Field>
        </QuestionPair>
      </div>}

      {step===4&&<div className="space-y-5">
        <QuestionPair>
          <Field label="Nas contas mais importantes, é exigida alguma confirmação além da senha?" help="Por exemplo, um código no celular, aplicativo autenticador ou outra confirmação. Isso também é conhecido como MFA ou verificação em duas etapas."><select className={select} value={a.mfa} onChange={e=>set('mfa',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim, de forma ampla</option><option value="partial">Apenas em algumas contas</option><option value="no">Não</option></select></Field>
          <Field label="Mais de uma pessoa utiliza a mesma conta ou senha para acessar algum sistema?"><select className={select} value={a.sharedAccounts} onChange={e=>set('sharedAccounts',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="Quando alguém sai da empresa, os acessos dessa pessoa são removidos?"><select className={select} value={a.offboarding} onChange={e=>set('offboarding',e.target.value)}><option value="unknown">Não sei informar</option><option value="formal">Sim, existe processo definido</option><option value="informal">É feito caso a caso</option></select></Field>
          <Field label="A empresa armazena ou utiliza dados pessoais ou informações sensíveis?"><select className={select} value={a.sensitiveData} onChange={e=>set('sensitiveData',e.target.value)}><option value="unknown">Não sei informar</option><option value="yes">Sim</option><option value="no">Não</option></select></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="O e-mail da empresa possui alguma proteção além do filtro padrão de spam?" help="Por exemplo, bloqueio de mensagens falsas, links perigosos ou anexos suspeitos."><select className={select} value={a.emailProtection} onChange={e=>set('emailProtection',e.target.value)}><option value="unknown">Não sei informar</option><option value="advanced">Sim, com análise de links, anexos e mensagens suspeitas</option><option value="standard">Sim, existe proteção adicional administrada pela empresa</option><option value="basic">Apenas o filtro padrão de spam do e-mail</option><option value="none">Não existe proteção além do padrão</option></select></Field>
          <Field label="Se acontecer um problema de segurança hoje, a empresa sabe quem deve coordenar a resposta?" help="Pode ser alguém da empresa ou um prestador especializado. O importante é saber previamente quem deve ser acionado."><select className={select} value={a.incidentResponse} onChange={e=>set('incidentResponse',e.target.value)}><option value="unknown">Não sei informar</option><option value="formal">Sim, responsável e processo definidos</option><option value="informal">Sabemos quem chamar, mas sem processo formal</option><option value="none">Não existe responsável definido</option></select></Field>
        </QuestionPair>
        <QuestionPair>
          <Field label="A empresa já passou por vírus, invasão, perda de dados ou uma parada importante causada por tecnologia?"><select className={select} value={a.incidentHistory} onChange={e=>set('incidentHistory',e.target.value)}><option value="unknown">Prefiro não informar / não sei</option><option value="no">Não</option><option value="yes">Sim</option></select></Field>
          <Field label="Qual situação de segurança mais preocupa a empresa hoje?"><input className={input} value={a.mainConcern} onChange={e=>set('mainConcern',e.target.value)} placeholder="Ex.: vírus, golpe por e-mail, perda de dados, parada dos sistemas, LGPD..."/></Field>
        </QuestionPair>
        <Field label="Existe alguma informação importante que você gostaria de acrescentar?"><textarea className={input} rows={4} value={a.notes} onChange={e=>set('notes',e.target.value)} placeholder="Pode ser um sistema importante, mudança planejada, dificuldade atual ou qualquer outro contexto que ajude a entender o ambiente."/></Field>
      </div>}

      <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-5">
        <button
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-slate-300 transition hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-30"
          disabled={step===0 || isSubmitting}
          onClick={()=>setStep(s=>s-1)}
        >
          <ArrowLeft size={18}/>Voltar
        </button>

        {step<steps.length-1 ? (
          <button
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={()=>{setStep(s=>s+1);window.scrollTo({top:0,behavior:'smooth'})}}
          >
            Continuar<ArrowRight size={18}/>
          </button>
        ) : (
          <button
            className="flex min-w-[190px] items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold shadow-lg shadow-teal-950/30 transition hover:bg-teal-500 disabled:cursor-wait disabled:bg-teal-700 disabled:text-teal-100"
            onClick={submit}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin"/>
                Processando diagnóstico...
              </>
            ) : (
              <>
                <CheckCircle2 size={18}/>
                Enviar assessment
              </>
            )}
          </button>
        )}
      </div>
    </Card>
    <div className="mt-5 flex gap-2 text-sm text-slate-500"><Info className="mt-0.5 shrink-0" size={17}/><span>As respostas compõem um diagnóstico inicial e serão revisadas pela equipe Concierge. O assessment não substitui validação técnica e não transforma “não sei informar” em falha automática.</span></div>
  </div>

  {isSubmitting && (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/72 px-4 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Preparando seu diagnóstico"
    >
      <div className="w-full max-w-sm rounded-2xl border border-teal-500/20 bg-slate-900/95 p-7 text-center shadow-2xl shadow-slate-950/60">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-teal-500/20 bg-teal-500/10">
          <Loader2 className="animate-spin text-teal-300" size={24}/>
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">Preparando seu diagnóstico</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Estamos organizando suas respostas e preparando a leitura de segurança.
        </p>
      </div>
    </div>
  )}
</main>
}
