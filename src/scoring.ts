import { AssessmentData } from './types';

export type DomainKey = 'network'|'endpoint'|'backup'|'identity';
export type DomainScore = number | null;
export type Severity = 'Alta'|'Média'|'Baixa';

export interface Finding {
  domain:string;
  title:string;
  situation:string;
  consequence:string;
  technical:string;
  severity:Severity;
}

const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
export const maturityLevel = (s:DomainScore) => s===null?'Não avaliado':s>=80?'Avançada':s>=65?'Adequada':s>=45?'Intermediária':s>=25?'Básica':'Muito baixa';

function weighted(items:{known:boolean;score:number;weight:number}[]):DomainScore{
  const known=items.filter(i=>i.known);
  if(!known.length) return null;
  const weight=known.reduce((a,b)=>a+b.weight,0);
  return clamp(known.reduce((a,b)=>a+(b.score*b.weight),0)/weight);
}

const yn=(v:'yes'|'no'|'unknown', yes=100, no=20) => ({known:v!=='unknown',score:v==='yes'?yes:no});

export function scoreAssessment(a:AssessmentData){
  const firewallMaturity:Record<AssessmentData['firewallLevel'],number>={none:0,isp:15,router:35,utm:60,ngfw:78,managed_ngfw:95,unknown:50};
  const monitoringMaturity:Record<AssessmentData['monitoring'],number>={none:10,reactive_it:35,outsourced_it:55,security_team:78,soc:95,unknown:50};
  const license=yn(a.firewallLicense,100,25);
  const network=weighted([
    {known:a.firewallLevel!=='unknown',score:firewallMaturity[a.firewallLevel],weight:60},
    {known:a.firewallLicense!=='unknown' && !['none','isp'].includes(a.firewallLevel),score:license.score,weight:15},
    {known:a.monitoring!=='unknown',score:monitoringMaturity[a.monitoring],weight:25},
  ]);

  const endpointMaturity:Record<AssessmentData['endpointLevel'],number>={none:0,basic_av:25,business_av:48,edr:75,managed_edr:95,unknown:50};
  const updates=yn(a.autoUpdates,100,20);
  const admins=yn(a.localAdmins,25,100);
  const byod=yn(a.byod,55,100);
  const endpoint=weighted([
    {known:a.endpointLevel!=='unknown',score:endpointMaturity[a.endpointLevel],weight:70},
    {known:a.autoUpdates!=='unknown',score:updates.score,weight:15},
    {known:a.localAdmins!=='unknown',score:admins.score,weight:10},
    {known:a.byod!=='unknown',score:byod.score,weight:5},
  ]);

  const backupMaturity:Record<AssessmentData['backupLevel'],number>={none:0,manual:25,automated_local:50,cloud:65,multi_copy:82,managed:95,unknown:50};
  const restoreMaturity:Record<AssessmentData['restoreTests'],number>={regular:100,once:65,never:10,unknown:50};
  const backup=weighted([
    {known:a.backupLevel!=='unknown',score:backupMaturity[a.backupLevel],weight:75},
    {known:a.restoreTests!=='unknown',score:restoreMaturity[a.restoreTests],weight:25},
  ]);

  const mfaMaturity:Record<AssessmentData['mfa'],number>={yes:100,partial:60,no:10,unknown:50};
  const shared=yn(a.sharedAccounts,20,100);
  const offboardingMaturity:Record<AssessmentData['offboarding'],number>={formal:100,informal:45,unknown:50};
  const identity=weighted([
    {known:a.mfa!=='unknown',score:mfaMaturity[a.mfa],weight:50},
    {known:a.sharedAccounts!=='unknown',score:shared.score,weight:25},
    {known:a.offboarding!=='unknown',score:offboardingMaturity[a.offboarding],weight:25},
  ]);

  const scores:{network:DomainScore;endpoint:DomainScore;backup:DomainScore;identity:DomainScore}={network,endpoint,backup,identity};
  const evaluated=Object.entries(scores).filter(([,v])=>v!==null) as [DomainKey,number][];
  const overall=evaluated.length?clamp(evaluated.reduce((sum,[,v])=>sum+v,0)/evaluated.length):null;
  const priority=evaluated.length?[...evaluated].sort((x,y)=>x[1]-y[1])[0][0]:null;
  const labels:Record<DomainKey,string>={network:'Rede e Perímetro',endpoint:'Endpoints',backup:'Backup e Continuidade',identity:'Identidade e Acesso'};

  const findings:Finding[]=[];
  if(a.firewallLevel==='none'||a.firewallLevel==='isp'||a.firewallLevel==='router') findings.push({
    domain:labels.network,
    title:'Proteção de perímetro com cobertura básica',
    situation: a.firewallLevel==='router'
      ? 'O ambiente utiliza roteador ou firewall básico para controle do tráfego de rede.'
      : 'A proteção informada para o acesso à internet não inclui funcionalidades avançadas de inspeção e bloqueio de ameaças.',
    consequence:'A empresa pode ter menor capacidade para identificar e bloquear comportamentos maliciosos antes que avancem pela rede ou atinjam dispositivos internos.',
    technical:'NGFW, prevenção de intrusão (IPS), controle de aplicações, inteligência de ameaças e gestão contínua.',
    severity:'Alta'
  });
  if(a.firewallLicense==='no'&&!['none','isp','unknown'].includes(a.firewallLevel)) findings.push({
    domain:labels.network,
    title:'Recursos de segurança podem estar limitados pelo licenciamento',
    situation:'Foi informado o uso de firewall corporativo, porém o licenciamento de segurança não está ativo.',
    consequence:'Funcionalidades de prevenção, atualização de inteligência de ameaças e filtragem avançada podem estar indisponíveis ou desatualizadas, reduzindo a efetividade do equipamento.',
    technical:'Licenciamento ativo de serviços de segurança do firewall (IPS, AV, Application Control).',
    severity:'Média'
  });
  if(a.monitoring==='none'||a.monitoring==='reactive_it') findings.push({
    domain:labels.network,
    title:'Acompanhamento de segurança predominantemente reativo',
    situation: a.monitoring==='none'
      ? 'Não foi identificado acompanhamento regular de alertas e eventos de segurança.'
      : 'A análise de alertas e eventos ocorre principalmente quando uma necessidade específica é identificada.',
    consequence:'Eventos relevantes podem permanecer ativos por mais tempo antes de serem percebidos, aumentando a janela de exposição a ameaças.',
    technical:'Monitoramento contínuo de eventos, correlação de alertas e operação de SOC.',
    severity:a.monitoring==='none'?'Alta':'Média'
  });
  if(a.endpointLevel==='none'||a.endpointLevel==='basic_av'||a.endpointLevel==='business_av') findings.push({
    domain:labels.endpoint,
    title:'Menor capacidade de detectar comportamentos suspeitos nos computadores',
    situation: a.endpointLevel==='business_av'
      ? 'Os computadores possuem antivírus corporativo, porém não foi identificada uma camada de proteção com capacidade avançada de detectar comportamentos suspeitos e apoiar a resposta a incidentes.'
      : 'A proteção dos dispositivos informada não inclui tecnologia com capacidade de detectar comportamentos anômalos além de ameaças conhecidas.',
    consequence:'Um incidente pode permanecer ativo por mais tempo antes de ser percebido, aumentando a possibilidade de indisponibilidade, comprometimento de informações ou propagação para outros equipamentos.',
    technical:'EDR/XDR, detecção comportamental e resposta a incidentes no endpoint.',
    severity:'Alta'
  });
  if(a.autoUpdates==='no') findings.push({
    domain:labels.endpoint,
    title:'Atualizações de segurança dependem de ação manual',
    situation:'As atualizações de segurança dos dispositivos não são aplicadas de forma automática.',
    consequence:'Vulnerabilidades já corrigidas pelos fabricantes podem permanecer nos equipamentos por mais tempo, ampliando o período em que estão disponíveis para exploração.',
    technical:'Gerenciamento centralizado de patches e atualização automatizada de sistemas.',
    severity:'Média'
  });
  if(a.localAdmins==='yes') findings.push({
    domain:labels.endpoint,
    title:'Privilégios administrativos ampliam o impacto de uma conta comprometida',
    situation:'Foi informado que usuários habitualmente operam com perfil de administrador local nos computadores.',
    consequence:'Um código malicioso executado com privilégios elevados possui maior capacidade de realizar alterações no dispositivo e se propagar para outros sistemas.',
    technical:'Princípio do menor privilégio e gestão de contas administrativas locais.',
    severity:'Média'
  });
  if(a.backupLevel==='none'||a.backupLevel==='manual') findings.push({
    domain:labels.backup,
    title:'Recuperação de dados depende de processo manual ou não formalizado',
    situation: a.backupLevel==='none'
      ? 'Não foi identificado processo formal de cópia e proteção de dados.'
      : 'As cópias de segurança dependem de execução manual, sem automação ou política formal.',
    consequence:'Em uma falha, exclusão acidental ou incidente, o tempo necessário para recuperar as informações pode aumentar e a retomada da operação pode ficar menos previsível.',
    technical:'Backup automatizado, cópia externa, política de retenção e RTO/RPO definidos.',
    severity:'Alta'
  });
  if(a.restoreTests==='never') findings.push({
    domain:labels.backup,
    title:'A capacidade de recuperação ainda não foi comprovada em prática',
    situation:'Existem cópias de segurança, porém a restauração efetiva dos dados nunca foi testada.',
    consequence:'A empresa pode descobrir uma falha ou inconsistência no processo de backup somente durante uma situação real de emergência, quando o tempo e a pressão são críticos.',
    technical:'Testes periódicos de restauração e validação de RTO/RPO.',
    severity:'Média'
  });
  if(a.mfa==='no') findings.push({
    domain:labels.identity,
    title:'Acesso às contas depende exclusivamente de senha',
    situation:'Não foi identificado o uso de autenticação de múltiplos fatores (MFA) nas contas importantes.',
    consequence:'Uma credencial descoberta, reutilizada ou capturada pode ser suficiente para que um acesso indevido ocorra, sem nenhuma camada adicional de verificação.',
    technical:'Autenticação multifator (MFA) em contas corporativas e sistemas críticos.',
    severity:'Alta'
  });
  if(a.sharedAccounts==='yes') findings.push({
    domain:labels.identity,
    title:'Contas compartilhadas reduzem rastreabilidade e controle de acesso',
    situation:'Foi informado que mais de uma pessoa utiliza a mesma credencial de acesso.',
    consequence:'Fica mais difícil identificar quem realizou uma determinada ação e revogar acessos individualmente em caso de desligamento ou incidente.',
    technical:'Identidades individuais, princípio do menor privilégio e auditoria de acessos.',
    severity:'Média'
  });
  if(a.offboarding==='informal') findings.push({
    domain:labels.identity,
    title:'Remoção de acessos de ex-colaboradores depende de processo informal',
    situation:'O encerramento de acessos ao desligar um colaborador ocorre caso a caso, sem processo formal definido.',
    consequence:'Acessos antigos podem permanecer ativos além do necessário, mantendo uma janela de risco desnecessária para sistemas e dados corporativos.',
    technical:'Processo formal de offboarding e revisão periódica de acessos.',
    severity:'Média'
  });

  const controlStates=[
    a.firewallLevel!=='unknown', a.firewallLicense!=='unknown', a.monitoring!=='unknown',
    a.endpointLevel!=='unknown',a.autoUpdates!=='unknown',a.localAdmins!=='unknown',a.byod!=='unknown',
    a.backupLevel!=='unknown',a.restoreTests!=='unknown',a.maxDowntime!=='unknown',
    a.mfa!=='unknown',a.sharedAccounts!=='unknown',a.offboarding!=='unknown',a.sensitiveData!=='unknown',a.incidentHistory!=='unknown'
  ];
  const completeness=clamp(controlStates.filter(Boolean).length/controlStates.length*100);

  // Cenário operacional SMB: hipótese interna e transparente, não estatística de perda.
  const people=Math.max(1,a.users||a.endpointCount||a.devices||10);
  const hours=a.maxDowntime==='4h'?4:a.maxDowntime==='8h'?8:a.maxDowntime==='1d'?8:a.maxDowntime==='2d'?16:a.maxDowntime==='more'?24:8;
  const productivityLow=people*hours*35;
  const productivityHigh=people*hours*65;
  const technicalLow=2000;
  const technicalHigh=6000;
  const disruptionLow=(a.sensitiveData==='yes'||a.criticalSystems.length>0)?2500:1000;
  const disruptionHigh=(a.sensitiveData==='yes'||a.criticalSystems.length>0)?7000:4000;
  const round100=(n:number)=>Math.round(n/100)*100;
  const impactComponents={
    productivity:[round100(productivityLow),round100(productivityHigh)] as [number,number],
    technical:[technicalLow,technicalHigh] as [number,number],
    disruption:[disruptionLow,disruptionHigh] as [number,number],
  };
  const impactRange:[number,number]=[
    impactComponents.productivity[0]+technicalLow+disruptionLow,
    impactComponents.productivity[1]+technicalHigh+disruptionHigh
  ];

  return {
    scores,overall,level:maturityLevel(overall),priority,
    priorityLabel:priority?labels[priority]:'Dados insuficientes',
    labels,findings,completeness,impactRange,impactComponents,
    impactAssumptions:{people,hours,productivityHourlyRange:[35,65] as [number,number],technicalRange:[technicalLow,technicalHigh] as [number,number]},
    evaluatedDomains:evaluated.length
  };
}
