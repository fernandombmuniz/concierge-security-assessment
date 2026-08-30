import { AssessmentData } from './types';

export type DomainKey = 'network'|'endpoint'|'backup'|'identity';
export type DomainScore = number | null;
export type Severity = 'Alta'|'Média'|'Baixa';
export type Confidence = 'Alta'|'Moderada'|'Baixa';

export interface Finding { domain:string; title:string; situation:string; consequence:string; technical:string; severity:Severity; }
interface Control { known:boolean; score:number; weight:number; critical?:boolean; }

const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
export const maturityLevel = (s:DomainScore) => s===null?'Não avaliado':s>=80?'Avançada':s>=65?'Adequada':s>=45?'Intermediária':s>=25?'Básica':'Muito baixa';
export const confidenceLevel = (coverage:number):Confidence => coverage>=80?'Alta':coverage>=60?'Moderada':'Baixa';

/**
 * V3.0: controles desconhecidos não somem do denominador.
 * Eles não são tratados como falha, mas recebem valor neutro (50) e reduzem a cobertura.
 * Isso evita um domínio chegar a 100/100 quando um controle crítico, como MFA, é desconhecido.
 */
function scoreControls(items:Control[]){
  const total=items.reduce((a,b)=>a+b.weight,0);
  if(!total) return {score:null as DomainScore,coverage:0,confidence:'Baixa' as Confidence};
  const knownWeight=items.filter(i=>i.known).reduce((a,b)=>a+b.weight,0);
  if(!knownWeight) return {score:null as DomainScore,coverage:0,confidence:'Baixa' as Confidence};
  const score=clamp(items.reduce((sum,i)=>sum+(i.known?i.score:50)*i.weight,0)/total);
  const coverage=clamp(knownWeight/total*100);
  return {score,coverage,confidence:confidenceLevel(coverage)};
}
const yn=(v:'yes'|'no'|'unknown', yes=100, no=20)=>({known:v!=='unknown',score:v==='yes'?yes:no});
const capability=(v:AssessmentData['firewallThreatPrevention'])=>({known:v!=='unknown',score:v==='yes'?100:v==='partial'?60:v==='no'?15:50});

export function scoreAssessment(a:AssessmentData){
  const firewallBase:Record<AssessmentData['firewallLevel'],number>={none:0,isp:15,router:50,utm:68,ngfw:82,managed_ngfw:90,unknown:50};
  const monitoring:Record<AssessmentData['monitoring'],number>={none:10,reactive_it:35,outsourced_it:55,security_team:78,soc:95,unknown:50};
  const maintenance:Record<AssessmentData['networkMaintenance'],number>={formal:95,informal:60,none:20,unknown:50};
  const license=yn(a.firewallLicense,100,25);
  const threat=capability(a.firewallThreatPrevention);
  const networkControls:Control[]=[
    {known:a.firewallLevel!=='unknown',score:firewallBase[a.firewallLevel],weight:25,critical:true},
    {known:a.firewallThreatPrevention!=='unknown',score:threat.score,weight:25,critical:true},
    {known:a.networkMaintenance!=='unknown',score:maintenance[a.networkMaintenance],weight:15},
    {known:a.monitoring!=='unknown',score:monitoring[a.monitoring],weight:20,critical:true},
    {known:a.firewallLicense!=='unknown' && !['none','isp'].includes(a.firewallLevel),score:license.score,weight:15},
  ];
  const networkResult=scoreControls(networkControls);

  // V3.2: endpoint separa prevenção, gestão, detecção e capacidade de resposta.
  // Antivírus corporativo é uma camada válida, mas não recebe a mesma maturidade de EDR.
  const endpointBase:Record<AssessmentData['endpointLevel'],number>={none:0,basic_av:28,business_av:52,edr:80,managed_edr:94,unknown:50};
  const updates=yn(a.autoUpdates,100,20);
  const central=capability(a.endpointCentralManagement);
  const inventory:Record<AssessmentData['assetInventory'],number>={managed:100,partial:70,informal:45,none:10,unknown:50};
  const vulnerability:Record<AssessmentData['vulnerabilityManagement'],number>={continuous:100,regular:85,occasional:60,reactive:35,none:10,unknown:50};
  const response:Record<AssessmentData['endpointResponse'],number>={managed_soc:100,defined_team:80,alerts_only:45,none:15,unknown:50};
  const endpointControls:Control[]=[
    {known:a.endpointLevel!=='unknown',score:endpointBase[a.endpointLevel],weight:32,critical:true},
    {known:a.endpointCentralManagement!=='unknown' && a.endpointLevel!=='none',score:central.score,weight:14},
    {known:a.endpointResponse!=='unknown' && a.endpointLevel!=='none',score:response[a.endpointResponse],weight:22,critical:true},
    {known:a.autoUpdates!=='unknown',score:updates.score,weight:12},
    {known:a.assetInventory!=='unknown',score:inventory[a.assetInventory],weight:10},
    {known:a.vulnerabilityManagement!=='unknown',score:vulnerability[a.vulnerabilityManagement],weight:10,critical:true},
  ];
  const endpointResult=scoreControls(endpointControls);

  // O tipo/local do backup é apenas uma parte da maturidade. Cloud, por si só, não equivale a backup resiliente.
  const backupBase:Record<AssessmentData['backupLevel'],number>={none:0,manual:20,automated_local:55,cloud:60,multi_copy:80,managed:92,unknown:50};
  const restore:Record<AssessmentData['restoreTests'],number>={regular:100,once:65,never:10,unknown:50};
  const isolation:Record<AssessmentData['backupIsolation'],number>={immutable:100,isolated:90,separate_account:75,same_environment:35,none:10,unknown:50};
  const backupControls:Control[]=[
    {known:a.backupLevel!=='unknown',score:backupBase[a.backupLevel],weight:40,critical:true},
    {known:a.backupIsolation!=='unknown',score:isolation[a.backupIsolation],weight:30,critical:true},
    {known:a.restoreTests!=='unknown',score:restore[a.restoreTests],weight:30,critical:true},
  ];
  const backupResult=scoreControls(backupControls);

  const mfa:Record<AssessmentData['mfa'],number>={yes:100,partial:60,no:10,unknown:50};
  const shared=yn(a.sharedAccounts,20,100);
  const offboarding:Record<AssessmentData['offboarding'],number>={formal:100,informal:45,unknown:50};
  const email:Record<AssessmentData['emailProtection'],number>={advanced:95,standard:75,basic:45,none:10,unknown:50};
  const incident:Record<AssessmentData['incidentResponse'],number>={formal:95,informal:55,none:15,unknown:50};
  const identityControls:Control[]=[
    {known:a.mfa!=='unknown',score:mfa[a.mfa],weight:35,critical:true},
    {known:a.sharedAccounts!=='unknown',score:shared.score,weight:15},
    {known:a.offboarding!=='unknown',score:offboarding[a.offboarding],weight:20},
    {known:a.emailProtection!=='unknown',score:email[a.emailProtection],weight:15},
    {known:a.incidentResponse!=='unknown',score:incident[a.incidentResponse],weight:15},
  ];
  const identityResult=scoreControls(identityControls);

  const scores={network:networkResult.score,endpoint:endpointResult.score,backup:backupResult.score,identity:identityResult.score};
  const domainCoverage={network:networkResult.coverage,endpoint:endpointResult.coverage,backup:backupResult.coverage,identity:identityResult.coverage};
  const domainConfidence={network:networkResult.confidence,endpoint:endpointResult.confidence,backup:backupResult.confidence,identity:identityResult.confidence};
  const evaluated=Object.entries(scores).filter(([,v])=>v!==null) as [DomainKey,number][];
  const overall=evaluated.length?clamp(evaluated.reduce((sum,[,v])=>sum+v,0)/evaluated.length):null;
  const labels:Record<DomainKey,string>={network:'Rede e Perímetro',endpoint:'Endpoints',backup:'Backup e Continuidade',identity:'Identidade e Acesso'};

  const findings:Finding[]=[];
  if(a.firewallLevel==='none'||a.firewallLevel==='isp') findings.push({domain:labels.network,title:'Proteção de perímetro limitada',situation:'O acesso à internet utiliza controles básicos de borda.',consequence:'Esse cenário pode oferecer menos recursos de inspeção, prevenção e visibilidade quando comparado a uma camada de segurança dedicada.',technical:'Firewall corporativo, política de filtragem, prevenção de intrusão e gestão contínua.',severity:'Alta'});
  if(a.firewallLevel==='router' && a.firewallThreatPrevention!=='yes') findings.push({domain:labels.network,title:'Firewall tradicional sem evidência de prevenção avançada',situation:'O ambiente utiliza MikroTik ou outro roteador/firewall tradicional e não foram informados recursos amplos de prevenção ativa de ameaças.',consequence:'O equipamento pode atender bem filtragem, VPN e segmentação. Para ameaças mais sofisticadas, a empresa pode depender de controles adicionais ou de outras camadas de proteção.',technical:'IPS, controle de aplicações, inteligência de ameaças, filtragem de conteúdo e monitoramento.',severity:'Média'});
  if(a.firewallThreatPrevention==='no') findings.push({domain:labels.network,title:'Prevenção ativa de ameaças não identificada no perímetro',situation:'Não foram informados recursos adicionais de prevenção e inspeção de ameaças no equipamento de borda.',consequence:'A identificação de determinados comportamentos maliciosos pode depender de outras camadas de segurança do ambiente.',technical:'IPS, proteção contra malware, controle de aplicações e inteligência de ameaças.',severity:'Alta'});
  if(a.monitoring==='none'||a.monitoring==='reactive_it') findings.push({domain:labels.network,title:'Acompanhamento de segurança predominantemente reativo',situation:a.monitoring==='none'?'Não foi informado um acompanhamento regular de alertas e eventos de segurança.':'A análise de alertas e eventos ocorre principalmente quando uma necessidade específica é identificada.',consequence:'Alguns eventos podem ser percebidos somente depois de gerar sintomas para usuários, sistemas ou para a operação.',technical:'Monitoramento contínuo de eventos, correlação de alertas e processo de resposta.',severity:a.monitoring==='none'?'Alta':'Média'});
  if(a.networkMaintenance==='none') findings.push({domain:labels.network,title:'Manutenção da infraestrutura de rede sem rotina definida',situation:'Não foi informada uma rotina definida de atualização e revisão das configurações dos equipamentos de rede.',consequence:'Sem uma rotina definida, atualizações e revisões importantes podem acontecer apenas quando surge uma necessidade específica.',technical:'Gestão de configuração, atualização de firmware e revisão periódica de regras.',severity:'Média'});

  if(a.endpointLevel==='none') findings.push({domain:labels.endpoint,title:'Proteção dos computadores não padronizada',situation:'Não foi identificada uma camada padronizada de proteção nos computadores.',consequence:'A empresa fica mais dependente de controles individuais e da percepção do usuário para identificar ameaças nos dispositivos.',technical:'Proteção antimalware corporativa, gestão central e acompanhamento dos endpoints.',severity:'Alta'});
  if(a.endpointLevel==='basic_av') findings.push({domain:labels.endpoint,title:'Proteção de endpoint concentrada em antivírus básico',situation:'Os computadores possuem uma camada de antivírus, mas sem indicação de gestão corporativa e recursos amplos de investigação.',consequence:'A proteção atende ameaças conhecidas, porém oferece menos contexto quando é necessário entender o comportamento de um evento no dispositivo.',technical:'Gestão centralizada, telemetria comportamental, investigação e resposta.',severity:'Média'});
  if(a.endpointLevel==='business_av') findings.push({domain:labels.endpoint,title:'Antivírus corporativo presente, com espaço para ampliar detecção e resposta',situation:'O ambiente já possui proteção corporativa contra malware, uma camada relevante de segurança. Pelas respostas, não foi identificada capacidade equivalente a EDR para investigar comportamento e apoiar resposta.',consequence:'Em eventos que ultrapassem a prevenção inicial, a análise pode depender mais de investigação manual e das informações disponíveis na solução atual.',technical:'EDR, telemetria comportamental, investigação e resposta sobre endpoints.',severity:'Média'});
  if((a.endpointLevel==='edr'||a.endpointLevel==='managed_edr') && (a.endpointResponse==='none'||a.endpointResponse==='alerts_only')) findings.push({domain:labels.endpoint,title:'EDR presente com operação de resposta limitada',situation:'Existe tecnologia de detecção avançada nos endpoints, mas o acompanhamento dos alertas foi informado como eventual ou sem responsável definido.',consequence:'Parte do valor do EDR pode ficar concentrada na geração de alertas, sem aproveitar plenamente investigação e resposta.',technical:'Triagem, investigação, contenção e processo de resposta aos alertas do EDR.',severity:'Média'});
  if(a.vulnerabilityManagement==='none'||a.vulnerabilityManagement==='reactive') findings.push({domain:labels.endpoint,title:'Gestão de vulnerabilidades pouco estruturada',situation:'A identificação de vulnerabilidades foi informada como reativa ou sem uma rotina definida.',consequence:'Isso pode aumentar o intervalo entre a divulgação de uma correção e sua aplicação nos ativos mais relevantes.',technical:'Inventário, varredura periódica, priorização e correção de vulnerabilidades.',severity:'Alta'});
  if(a.assetInventory==='none'||a.assetInventory==='informal') findings.push({domain:labels.endpoint,title:'Visibilidade limitada dos ativos',situation:'O inventário de equipamentos foi informado como informal ou indisponível.',consequence:'Com menor visibilidade dos ativos, fica mais difícil confirmar se todos os equipamentos seguem o padrão esperado de atualização e proteção.',technical:'Inventário atualizado de ativos corporativos e responsáveis.',severity:'Média'});

  if(a.backupLevel==='none'||a.backupLevel==='manual') findings.push({domain:labels.backup,title:'Recuperação depende de processo manual ou não formalizado',situation:a.backupLevel==='none'?'Não foi identificado processo formal de cópia e proteção de dados.':'As cópias dependem de execução manual.',consequence:'A retomada pode depender mais de ações manuais e da disponibilidade das pessoas responsáveis no momento da necessidade.',technical:'Backup automatizado, política de retenção e objetivos de recuperação definidos.',severity:'Alta'});
  if(a.backupIsolation==='none'||a.backupIsolation==='same_environment') findings.push({domain:labels.backup,title:'Cópias de backup podem compartilhar o mesmo risco do ambiente principal',situation:'Não foi informada uma cópia isolada, imutável ou administrativamente separada do ambiente principal.',consequence:'Se produção e cópias compartilham o mesmo contexto de acesso, um incidente pode alcançar também parte dos dados usados para recuperação.',technical:'Cópia isolada/offline, imutabilidade ou separação administrativa das credenciais de backup.',severity:'Alta'});
  if(a.restoreTests==='never') findings.push({domain:labels.backup,title:'A capacidade de recuperação ainda não foi comprovada em prática',situation:'Existem cópias, mas a restauração efetiva ainda não foi testada.',consequence:'Limitações do processo podem aparecer apenas quando uma recuperação real for necessária.',technical:'Testes periódicos de restauração e validação de RTO/RPO.',severity:'Média'});

  if(a.mfa==='no') findings.push({domain:labels.identity,title:'Acesso às contas depende exclusivamente de senha',situation:'Não foi informado uso de MFA nas contas importantes.',consequence:'Sem uma segunda etapa de confirmação, a segurança do acesso depende mais diretamente da proteção da senha.',technical:'MFA em contas corporativas, administrativas e sistemas críticos.',severity:'Alta'});
  if(a.sharedAccounts==='yes') findings.push({domain:labels.identity,title:'Contas compartilhadas reduzem rastreabilidade',situation:'Mais de uma pessoa utiliza a mesma credencial.',consequence:'Fica mais difícil atribuir ações e revogar acessos individualmente.',technical:'Identidades individuais e auditoria de acessos.',severity:'Média'});
  if(a.emailProtection==='none'||a.emailProtection==='basic') findings.push({domain:labels.identity,title:'Proteção de e-mail com cobertura limitada',situation:'Não foram informados recursos adicionais amplos de proteção contra phishing, links e anexos maliciosos no e-mail corporativo.',consequence:'Nesse cenário, parte da identificação de mensagens suspeitas pode depender mais dos filtros básicos e da percepção do usuário.',technical:'Proteção de e-mail, análise de links/anexos, anti-phishing e autenticação do domínio.',severity:'Média'});
  if(a.incidentResponse==='none') findings.push({domain:labels.identity,title:'Resposta a incidentes sem responsável ou processo definido',situation:'Não foi informado um processo ou responsável previamente definido para coordenar incidentes.',consequence:'Em uma ocorrência relevante, a equipe pode precisar definir responsáveis, contatos e próximos passos durante o próprio incidente.',technical:'Plano de resposta, responsáveis, contatos e critérios de escalonamento.',severity:'Alta'});

  const allControls=[...networkControls,...endpointControls,...backupControls,...identityControls];
  const completeness=clamp(allControls.filter(i=>i.known).reduce((s,i)=>s+i.weight,0)/allControls.reduce((s,i)=>s+i.weight,0)*100);

  // V3.2: prioridade cruza gap técnico com contexto e exposição.
  // O menor score continua relevante, mas deixa de decidir sozinho a ordem de atenção.
  const contextSignals=(a.sensitiveData==='yes'?1:0)+(a.incidentHistory==='yes'?1:0)+(a.criticalSystems.length>0?1:0)+(['4h','8h'].includes(a.maxDowntime)?1:0);
  const dataDecentralized=['mixed','endpoints','personal_cloud'].includes(a.dataLocation);
  const endpointMobilityExposure=a.byod==='yes'||a.dataLocation==='endpoints'||a.dataLocation==='personal_cloud';
  const priorityFactors:Record<DomainKey,number>={
    network:(100-(scores.network??50)) + (a.sites>1?8:0) + (a.monitoring==='none'||a.monitoring==='reactive_it'?8:0),
    endpoint:(100-(scores.endpoint??50)) + (a.sensitiveData==='yes'?12:0) + (a.incidentHistory==='yes'?8:0) + (endpointMobilityExposure?10:0),
    backup:(100-(scores.backup??50)) + (['4h','8h'].includes(a.maxDowntime)?12:0) + (dataDecentralized?6:0),
    identity:(100-(scores.identity??50)) + (a.sensitiveData==='yes'?10:0) + (a.emailProtection==='none'||a.emailProtection==='basic'?6:0),
  };
  const priority=evaluated.length?[...evaluated].sort((x,y)=>priorityFactors[y[0]]-priorityFactors[x[0]])[0][0]:null;
  const priorityLevel=overall===null?'Dados insuficientes':overall<35||contextSignals>=3&&overall<55?'Crítica':overall<55||contextSignals>=2?'Alta':overall<75?'Moderada':'Baixa';

  // Dependências evitam recomendar uma solução antes de o ambiente estar minimamente organizado para recebê-la.
  const dependencies:{area:string;status:'Antes'|'Em paralelo';message:string}[]=[];
  if(dataDecentralized) dependencies.push({area:'Backup e dados',status:'Antes',message:'Organizar e centralizar os dados corporativos prioritários antes de definir a estratégia final de backup. Isso reduz pontos dispersos e melhora a cobertura da proteção.'});
  if((a.assetInventory==='none'||a.assetInventory==='informal') && ['none','basic_av','business_av'].includes(a.endpointLevel)) dependencies.push({area:'Endpoints',status:'Em paralelo',message:'Consolidar o inventário de equipamentos durante a evolução da proteção de endpoint, para confirmar cobertura e responsáveis.'});
  if((a.firewallLevel==='ngfw'||a.firewallLevel==='managed_ngfw') && (a.monitoring==='none'||a.monitoring==='reactive_it')) dependencies.push({area:'Rede',status:'Antes',message:'Validar configuração, serviços ativos e rotina de acompanhamento do firewall atual antes de concluir que a necessidade é substituir o equipamento.'});

  // Opportunity Fit é exclusivamente comercial/interno e não altera o score técnico.
  const endpointGap=['none','basic_av','business_av'].includes(a.endpointLevel);
  const backupReady=!dataDecentralized;
  const opportunityFit={
    firewall: clamp((100-(scores.network??50))*0.65 + (a.monitoring==='none'||a.monitoring==='reactive_it'?15:0) + (a.firewallLevel==='router'||a.firewallLevel==='isp'?10:0)),
    endpoint: clamp((100-(scores.endpoint??50))*0.75 + (endpointGap?20:0) + (a.sensitiveData==='yes'?8:0)),
    backup: clamp(((100-(scores.backup??50))*0.75 + (a.backupVolumeGb>0?5:0)) * (backupReady?1:0.72)),
    identity: clamp((100-(scores.identity??50))*0.72 + (a.sensitiveData==='yes'?10:0)),
  };
  const opportunityNotes={
    firewall:(a.firewallLevel==='ngfw'||a.firewallLevel==='managed_ngfw')&& (a.monitoring==='none'||a.monitoring==='reactive_it')?'Validar operação e serviços do firewall existente antes de discutir substituição.':'Avaliar aderência conforme capacidades de perímetro e operação.',
    endpoint:endpointGap?'Evolução de antivírus para EDR é uma oportunidade relevante; confirmar gestão central e quem responderá aos alertas.':'Priorizar qualidade da operação do endpoint antes de troca de tecnologia.',
    backup:dataDecentralized?'Existe necessidade de continuidade, porém a estratégia final depende primeiro da organização/centralização dos dados.':'Ambiente mais preparado para dimensionamento de backup.',
    identity:a.mfa==='no'||a.mfa==='partial'?'Aprofundar MFA e governança de contas.':'Validar controles de identidade já existentes.',
  };

  const people=Math.max(1,a.users||a.endpointCount||a.devices||10);
  const hours=a.maxDowntime==='4h'?4:a.maxDowntime==='8h'?8:a.maxDowntime==='1d'?8:a.maxDowntime==='2d'?16:a.maxDowntime==='more'?24:8;
  const productivityLow=people*hours*35, productivityHigh=people*hours*65;
  const technicalLow=2000, technicalHigh=6000;
  const disruptionLow=(a.sensitiveData==='yes'||a.criticalSystems.length>0)?2500:1000;
  const disruptionHigh=(a.sensitiveData==='yes'||a.criticalSystems.length>0)?7000:4000;
  const round100=(n:number)=>Math.round(n/100)*100;
  const impactComponents={productivity:[round100(productivityLow),round100(productivityHigh)] as [number,number],technical:[technicalLow,technicalHigh] as [number,number],disruption:[disruptionLow,disruptionHigh] as [number,number]};
  const impactRange:[number,number]=[impactComponents.productivity[0]+technicalLow+disruptionLow,impactComponents.productivity[1]+technicalHigh+disruptionHigh];

  return {scores,domainCoverage,domainConfidence,overall,level:maturityLevel(overall),priority,priorityFactors,priorityLevel,priorityLabel:priority?labels[priority]:'Dados insuficientes',labels,findings,completeness,opportunityFit,opportunityNotes,dependencies,contextSignals,impactRange,impactComponents,impactAssumptions:{people,hours,productivityHourlyRange:[35,65] as [number,number],technicalRange:[technicalLow,technicalHigh] as [number,number]},evaluatedDomains:evaluated.length,methodologyVersion:'v3.2'};
}
