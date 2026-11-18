import type { AssessmentData } from '../types';
import { scoreAssessment, type DomainKey } from '../scoring';
import { buildPriorityPlan } from './priority-engine';
import { buildImpactContext, plainDomainLabel } from './contextual-insights';

export type ControlState = 'attention' | 'confirmed' | 'unknown' | 'not-applicable';
export type ReportChapter = 'overview' | 'findings' | 'impact' | 'actions' | 'details';
export interface ReportControl {
  id: string; area: string; title: string; state: ControlState;
  informed: string; impact: string; action: string; evidence: string;
  legal: string; support: string; reference: string; url: string;
}
export interface ReportAction {
  title: string; reason: string; action: string; owner: string;
  outcome: string; support: string;
}
export interface AssessmentReportModel {
  company: string; contact: string; mode: 'full' | 'executive'; score: number | null;
  areas: { label: string; score: number | null }[];
  facts: { label: string; value: string }[];
  controls: ReportControl[]; actions: ReportAction[];
  impact: string; concern: string;
  details: { title: string; rows: [string, string][] }[];
  financial?: { range: [number, number]; components: { label: string; range: [number, number]; basis: string }[]; assumptions: string };
  methodology: string;
}
export const LGPD_URL = 'https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.html';
export const INCIDENT_URL = 'https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis';
const CIS_URL = 'https://www.cisecurity.org/controls/cis-controls-list';
const AI_URL = 'https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence';
export const stateLabels: Record<ControlState, string> = {
  attention: 'Ponto de atenção', confirmed: 'Controle informado', unknown: 'A confirmar', 'not-applicable': 'Não se aplica ao uso informado',
};

// This inventory is a presentation of selected answers, not the weighted scoring engine.
// Unknown answers never become declarations that a control does not exist.
const state = (value: unknown, good: readonly unknown[]): ControlState =>
  value === undefined || value === null || value === '' || value === 'unknown'
    ? 'unknown' : good.includes(value) ? 'confirmed' : 'attention';

const labels: Record<string, string> = {
  unknown: 'Não sei informar', yes: 'Sim', no: 'Não', partial: 'Parcialmente', none: 'Ausente',
  internal: 'Equipe interna', outsourced: 'Terceirizado', shared: 'Responsabilidade compartilhada', nobody: 'Sem responsável definido', unmanaged: 'Sem responsável definido',
  isp: 'Equipamento da operadora', router: 'Roteador corporativo', utm: 'Firewall dedicado / open source', ngfw: 'Firewall NGFW', managed_ngfw: 'Firewall gerenciado',
  reactive_it: 'Acompanhamento quando surge um problema', outsourced_it: 'TI terceirizada', security_team: 'Equipe de segurança', soc: 'SOC / acompanhamento contínuo',
  basic_av: 'Antivírus básico', business_av: 'Antivírus corporativo', edr: 'EDR', managed_edr: 'EDR acompanhado por equipe',
  individual: 'Gestão por computador', central_internal: 'Console central pela TI', central_partner: 'Console central por parceiro',
  managed_soc: 'Equipe especializada acompanha e responde', defined_team: 'Equipe definida', alerts_only: 'Verificação de alertas quando necessário',
  managed: 'Gerenciado', informal: 'Informal', formal: 'Processo definido', continuous: 'Contínuo', regular: 'Periódico', occasional: 'Ocasional', reactive: 'Reativo',
  periodic: 'Periodicamente', on_demand: 'Sob demanda', incident_only: 'Apenas após incidente',
  manual: 'Backup manual', automated_local: 'Backup local automatizado', cloud: 'Backup em nuvem', multi_copy: 'Múltiplas cópias',
  immutable: 'Cópia imutável', isolated: 'Cópia separada / offline', separate_account: 'Conta separada', same_environment: 'Mesmo ambiente',
  once: 'Testado alguma vez', never: 'Nunca testado',
  dedicated: 'Pessoas dedicadas', scheduled: 'Rotina reservada', generalist_overloaded: 'Equipe acumula outras demandas', managed_support: 'Apoio especializado',
  managed_24x7: 'Cobertura 24x7', on_call: 'Sobreaviso', ad_hoc: 'Acionamento quando alguém percebe', business_hours: 'Somente no expediente',
  controlled: 'Uso com regras definidas', open: 'Uso sem regras claras', not_used: 'Não utiliza IA generativa',
  advanced: 'Proteção avançada', standard: 'Proteção adicional administrada', basic: 'Proteção básica',
  corporate_central: 'Local corporativo centralizado', mixed: 'Locais variados', endpoints: 'Computadores e notebooks', personal_cloud: 'Contas pessoais / não administradas', saas_only: 'Aplicações em nuvem',
  low: 'Baixo impacto', major: 'Grande parte da operação afetada', halt: 'A operação praticamente pararia',
  '4h': 'Até 4 horas', '8h': 'Até 8 horas', '1d': 'Até 1 dia', '2d': 'Até 2 dias', more: 'Mais de 2 dias',
};
export const reportAnswerLabel = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Não informado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.length ? value.map(reportAnswerLabel).join(', ') : 'Não informado';
  return labels[String(value)] || String(value);
};

interface Topic {
  area: string; title: string; impact: string; action: string; evidence: string;
  legal: string; support: string; reference: string; url?: string;
}
const topics: Record<string, Topic> = {
  perimeter: { area: 'Internet e rede', title: 'Proteção da conexão com a internet', impact: 'Se tráfego malicioso atravessar a borda sem bloqueio, computadores e serviços internos podem ficar expostos. O equipamento, isoladamente, não comprova a cobertura.', action: 'Validar regras, serviços de segurança ativos, atualização e capacidade para o uso real.', evidence: 'Inventário da borda, políticas revisadas e registros de funcionamento dos serviços.', legal: 'Quando a rede transporta dados pessoais, a proteção de acessos e comunicações ajuda a materializar as medidas do art. 46.', support: 'Avaliar a borda e, conforme escopo, apoiar implantação e gestão do firewall.', reference: 'CIS 12 · Network Infrastructure Management' },
  monitoring: { area: 'Internet e rede', title: 'Acompanhamento de eventos de segurança', impact: 'Se ninguém investigar um alerta relevante, uma atividade suspeita pode continuar até causar indisponibilidade ou atingir outros ativos.', action: 'Confirmar quais eventos geram alertas, quem analisa e como é feito o acionamento.', evidence: 'Registro de alertas tratados, responsáveis e critérios de escalação.', legal: 'Logs e registros de tratamento podem apoiar a demonstração de medidas de segurança e a apuração de incidentes com dados pessoais.', support: 'Apoiar visibilidade e tratamento de eventos por operação especializada, conforme cobertura contratada.', reference: 'CIS 13 · Network Monitoring and Defense' },
  reporting: { area: 'Internet e rede', title: 'Visibilidade sobre a gestão da rede', impact: 'Sem informações recorrentes, a gestão pode não conhecer eventos relevantes nem acompanhar se as ações acordadas foram executadas.', action: 'Definir conteúdo, destinatário e periodicidade dos relatórios com o responsável atual.', evidence: 'Relatório periódico, plano de ação e registro de acompanhamento.', legal: 'Registros operacionais podem ajudar a demonstrar a gestão das medidas de segurança relacionadas ao art. 46.', support: 'Organizar relatórios e revisão das prioridades de segurança conforme o escopo.', reference: 'CIS 8 · Audit Log Management' },
  endpoint: { area: 'Computadores', title: 'Proteção dos computadores e servidores', impact: 'Se um código malicioso passar pela prevenção inicial, a investigação e a contenção podem depender da visibilidade e da capacidade de resposta disponíveis.', action: 'Confirmar cobertura, atualização, alertas e possibilidade de isolar um equipamento comprometido.', evidence: 'Inventário coberto, status do console e teste controlado de acionamento.', legal: 'A proteção dos dispositivos que acessam dados pessoais contribui para evitar acessos indevidos e perda de informações, em linha com o art. 46.', support: 'Avaliar a proteção e a gestão de endpoints, com acompanhamento especializado quando previsto.', reference: 'CIS 10 · Malware Defenses' },
  inventory: { area: 'Computadores', title: 'Inventário e cobertura dos ativos', impact: 'Um equipamento fora do inventário pode permanecer sem atualização, proteção ou responsável conhecido.', action: 'Conciliar o inventário com o console de proteção e identificar ativos sem cobertura.', evidence: 'Lista de ativos, responsáveis e exceções de cobertura tratadas.', legal: 'Conhecer os ativos que armazenam ou acessam dados pessoais ajuda a definir onde as medidas do art. 46 precisam atuar.', support: 'Apoiar a identificação da cobertura e das pendências nos endpoints em escopo.', reference: 'CIS 1 · Inventory and Control of Enterprise Assets' },
  vulnerability: { area: 'Computadores', title: 'Atualizações e vulnerabilidades', impact: 'Uma falha conhecida pode permanecer explorável se a correção não for identificada, priorizada e acompanhada.', action: 'Revisar a rotina de identificação, priorização e correção de vulnerabilidades.', evidence: 'Lista priorizada, prazos acordados e evidências das correções.', legal: 'A manutenção dos ativos é parte do contexto das medidas técnicas para proteger dados pessoais previstas no art. 46.', support: 'Apoiar a análise de vulnerabilidades e o acompanhamento das correções conforme escopo.', reference: 'CIS 7 · Continuous Vulnerability Management' },
  recovery: { area: 'Dados e backup', title: 'Capacidade de recuperar dados e serviços', impact: 'Se uma cópia falhar na restauração, uma indisponibilidade pode durar mais que o tolerado e exigir retrabalho ou reconstrução de dados.', action: 'Escolher dados críticos e testar a restauração, registrando tempo, integridade e responsável.', evidence: 'Relatório do teste, dados recuperados e comparação com o tempo tolerado.', legal: 'A proteção contra perda e destruição de dados pessoais integra o art. 46. Um teste documentado ajuda a demonstrar capacidade de recuperação.', support: 'Apoiar a estratégia de backup e os testes de recuperação acordados.', reference: 'CIS 11 · Data Recovery' },
  isolation: { area: 'Dados e backup', title: 'Separação das cópias de segurança', impact: 'Se produção e cópias dependerem do mesmo acesso ou ambiente, um comprometimento pode atingir os dois ao mesmo tempo.', action: 'Validar separação de credenciais, permissões e uma cópia protegida do ambiente principal.', evidence: 'Arquitetura das cópias e teste das restrições de alteração e exclusão.', legal: 'Proteger as cópias ajuda a reduzir a perda de dados pessoais e sustenta medidas de segurança relacionadas ao art. 46.', support: 'Avaliar isolamento e proteção das cópias sem pressupor a troca da solução atual.', reference: 'CIS 11 · Data Recovery' },
  mfa: { area: 'Contas e acessos', title: 'Segunda confirmação nas contas importantes', impact: 'Se uma senha for obtida por terceiros, a ausência de outra confirmação pode facilitar acesso a e-mail, sistemas e operações financeiras.', action: 'Validar e ampliar MFA nas contas críticas, administrativas e de acesso remoto.', evidence: 'Relação de contas cobertas, exceções e teste da exigência de MFA.', legal: 'Restringir o acesso a dados pessoais por autenticação reforçada contribui para as medidas do art. 46. A lei não determina um produto específico.', support: 'Apoiar a revisão dos acessos e a implementação das medidas definidas com a TI.', reference: 'CIS 6 · Access Control Management' },
  accounts: { area: 'Contas e acessos', title: 'Contas individuais e remoção de acessos', impact: 'Contas compartilhadas ou mantidas após desligamentos podem dificultar a atribuição de ações e permitir acesso além do necessário.', action: 'Revisar contas individuais, privilégios e o processo de remoção por desligamento.', evidence: 'Lista de acessos revisada e registros de concessão e revogação.', legal: 'O controle do ciclo de vida de acessos ajuda a restringir quem pode tratar dados pessoais e a demonstrar medidas do art. 46.', support: 'Apoiar a revisão de políticas e responsabilidades com a equipe responsável.', reference: 'CIS 5 e 6 · Account / Access Control Management' },
  response: { area: 'Resposta e governança', title: 'Responsabilidade e resposta a incidentes', impact: 'Se um incidente começar sem um fluxo de decisão conhecido, a contenção pode atrasar e o impacto se ampliar.', action: 'Definir quem recebe o alerta, quem decide e como acionar apoio, incluindo fora do expediente.', evidence: 'Matriz de contatos, fluxo de resposta e exercício de acionamento.', legal: 'Uma resposta organizada ajuda a apurar incidentes. O art. 48 prevê comunicação quando houver risco ou dano relevante aos titulares, sujeita à avaliação do caso.', support: 'Apoiar detecção, acionamento e resposta conforme os horários e responsabilidades contratados.', reference: 'CIS 17 · Incident Response Management' },
  ai: { area: 'Resposta e governança', title: 'Regras para o uso de IA generativa', impact: 'Se informações internas forem enviadas sem avaliação a ferramentas de IA, pode haver exposição de dados ou tratamento incompatível com a finalidade pretendida.', action: 'Definir ferramentas permitidas, dados que não podem ser enviados e um responsável por dúvidas.', evidence: 'Orientação publicada, ferramentas aprovadas e registro de comunicação à equipe.', legal: 'Quando o uso envolve dados pessoais, finalidade, necessidade e segurança precisam ser avaliadas. Uma política isolada não comprova conformidade.', support: 'Apoiar o diagnóstico de exposição e a definição de controles com os responsáveis pelo uso de IA.', reference: 'NIST AI 600-1 · Generative AI Profile', url: AI_URL },
};

function control(id: string, topic: keyof typeof topics, value: unknown, good: readonly unknown[], informed?: string, customState?: ControlState): ReportControl {
  const t = topics[topic]!;
  const s = customState || state(value, good);
  const specific: Record<string, string> = {
    threat: 'Prevenção ativa de ameaças na rede', 'endpoint-response': 'Tratamento dos alertas dos computadores',
    backup: 'Estratégia de cópias de segurança', restore: 'Testes de restauração',
    shared: 'Uso de contas compartilhadas', offboarding: 'Remoção de acessos em desligamentos',
    incident: 'Preparação para responder a incidentes', 'after-hours': 'Capacidade de agir fora do expediente',
    owner: 'Responsável pela TI e pelos acionamentos',
  };
  return { ...t, id, title: specific[id] || t.title, area: id === 'endpoint-response' ? 'Computadores' : t.area, url: t.url || CIS_URL, state: s,
    informed: informed || `${t.title}: ${reportAnswerLabel(value)}.`,
    impact: s === 'unknown' ? `A resposta não permite confirmar este controle. ${t.impact}` : s === 'confirmed' ? `O controle foi informado como existente; falta validar a cobertura e a eficácia. ${t.impact}` : t.impact,
  };
}
const knownCount = (n: number) => n > 0 ? String(n) : 'Não informado';
const solution = (...parts: (string | undefined)[]) => parts.filter(x => x?.trim()).join(' ') || 'Solução não informada';
const owner = 'Gestão e equipe de TI / parceiro responsável, a confirmar';

export function buildFullAssessmentReport(a: AssessmentData): AssessmentReportModel {
  const r = scoreAssessment(a);
  const controls = [
    control('firewall', 'perimeter', a.firewallLevel, ['utm', 'ngfw', 'managed_ngfw'], `Proteção da internet: ${reportAnswerLabel(a.firewallLevel)}. ${solution(a.firewallVendor, a.firewallModel)}.`),
    control('threat', 'perimeter', a.firewallThreatPrevention, ['yes'], `Prevenção ativa de ameaças: ${reportAnswerLabel(a.firewallThreatPrevention)}.`),
    control('monitoring', 'monitoring', a.monitoring, ['security_team', 'soc']),
    control('reporting', 'reporting', a.firewallReporting, ['periodic']),
    control('endpoint', 'endpoint', a.endpointLevel, ['edr', 'managed_edr'], `Proteção dos computadores: ${reportAnswerLabel(a.endpointLevel)}. ${solution(a.endpointVendor, a.endpointProduct)}.`),
    control('endpoint-response', 'monitoring', a.endpointResponse, ['managed_soc', 'defined_team'], `Resposta a alertas dos computadores: ${reportAnswerLabel(a.endpointResponse)}.`),
    control('inventory', 'inventory', a.assetInventory, ['managed']),
    control('vulnerability', 'vulnerability', a.vulnerabilityManagement, ['continuous', 'regular']),
    control('backup', 'recovery', a.backupLevel, ['automated_local', 'cloud', 'multi_copy', 'managed'], `Backup: ${reportAnswerLabel(a.backupLevel)}. ${solution(a.backupVendor, a.backupProduct)}.`),
    control('restore', 'recovery', a.restoreTests, ['regular'], `Teste de restauração: ${reportAnswerLabel(a.restoreTests)}.`),
    control('isolation', 'isolation', a.backupIsolation, ['immutable', 'isolated', 'separate_account']),
    control('mfa', 'mfa', a.mfa, ['yes']),
    control('shared', 'accounts', a.sharedAccounts, ['no'], `Contas compartilhadas: ${reportAnswerLabel(a.sharedAccounts)}.`),
    control('offboarding', 'accounts', a.offboarding, ['formal'], `Remoção de acessos: ${reportAnswerLabel(a.offboarding)}.`),
    control('incident', 'response', a.incidentResponse, ['formal'], `Processo de resposta: ${reportAnswerLabel(a.incidentResponse)}.`),
    control('after-hours', 'response', a.afterHoursResponse, ['managed_24x7', 'on_call'], `Resposta fora do expediente: ${reportAnswerLabel(a.afterHoursResponse)}.`),
    control('ai', 'ai', a.aiUsageGovernance, ['controlled'], undefined, a.aiUsageGovernance === 'not_used' ? 'not-applicable' : undefined),
  ];
  const areaDomain: Record<string, DomainKey> = { 'Internet e rede':'network', Computadores:'endpoint', 'Dados e backup':'backup', 'Contas e acessos':'identity', 'Resposta e governança':'identity' };
  controls.sort((x,y) => (r.scores[areaDomain[x.area]!] ?? 101) - (r.scores[areaDomain[y.area]!] ?? 101));
  const plan = buildPriorityPlan(a, r);
  const proposedActions = plan.items.slice(0, 4).map(item => ({ title: item.title, reason: item.gap, action: item.action, owner, outcome: 'Escopo validado, responsável definido e evidência de funcionamento registrada.', support: item.commercialHint || 'Apoiar validação e implantação das medidas dentro do escopo acordado.' }));
  const onlyUnknown = controls.every(c => c.state === 'unknown' || c.state === 'not-applicable');
  const reportActions = onlyUnknown ? controls.filter(c => c.state === 'unknown').slice(0,3).map(c => ({title:`Confirmar: ${c.title.toLowerCase()}`,reason:'A resposta não permite confirmar a situação deste controle.',action:`Reunir a equipe responsável para confirmar a resposta e as evidências. ${c.action}`,owner,outcome:c.evidence,support:c.support})) : proposedActions;
  const details: AssessmentReportModel['details'] = [
    { title: 'Empresa e operação', rows: [['Empresa', a.companyName || 'Não informado'], ['Contato', a.contactName || 'Não informado'], ['Cargo', a.contactRole || 'Não informado'], ['Usuários', knownCount(a.users)], ['Dispositivos', knownCount(a.devices)], ['Unidades', knownCount(a.sites)], ['Equipe interna de TI', reportAnswerLabel(a.itTeamSize)], ['Rotina de segurança', reportAnswerLabel(a.securityOperationsModel)], ['Preocupação principal', a.mainConcern || 'Não informada']] },
    { title: 'Internet e rede', rows: [['Proteção da internet', reportAnswerLabel(a.firewallLevel)], ['Solução', solution(a.firewallVendor, a.firewallModel)], ['Licença ativa', reportAnswerLabel(a.firewallLicense)], ['Administração', reportAnswerLabel(a.firewallManagement)], ['Monitoramento', reportAnswerLabel(a.monitoring)], ['Relatórios', reportAnswerLabel(a.firewallReporting)], ['Links', knownCount(a.internetLinkCount)], ...(a.links || []).map((l, i): [string,string] => [`Link ${i+1}`, l.speedMbps > 0 ? `${l.speedMbps} Mbps` : 'Não informado']), ['VPN em uso', reportAnswerLabel(a.vpnUsage)], ['Usuários remotos', reportAnswerLabel(a.vpnRemote)], ['Túneis entre unidades', reportAnswerLabel(a.vpnSite)], ['VLANs', knownCount(a.vlans)]] },
    { title: 'Computadores e servidores', rows: [['Proteção', reportAnswerLabel(a.endpointLevel)], ['Solução', solution(a.endpointVendor, a.endpointProduct)], ['Computadores / notebooks', knownCount(a.endpointCount || a.devices)], ['Gestão', reportAnswerLabel(a.endpointManagementModel)], ['Resposta aos alertas', reportAnswerLabel(a.endpointResponse)], ['Inventário', reportAnswerLabel(a.assetInventory)], ['Vulnerabilidades', reportAnswerLabel(a.vulnerabilityManagement)], ['Servidores', reportAnswerLabel(a.servers)], ['Atualizações automáticas', reportAnswerLabel(a.autoUpdates)], ['Administradores locais', reportAnswerLabel(a.localAdmins)]] },
    { title: 'Dados e continuidade', rows: [['Local dos dados', reportAnswerLabel(a.dataLocation)], ['Backup', reportAnswerLabel(a.backupLevel)], ['Solução', solution(a.backupVendor, a.backupProduct)], ['Volume', a.backupVolumeGb > 0 ? `${a.backupVolumeGb} GB` : 'Não informado'], ['Isolamento', reportAnswerLabel(a.backupIsolation)], ['Restauração', reportAnswerLabel(a.restoreTests)], ['Responsável', reportAnswerLabel(a.backupResponsibility)], ['Parada tolerada', reportAnswerLabel(a.maxDowntime)], ['Impacto da parada', a.operationalImpact === 'partial' ? 'Parte da operação afetada' : reportAnswerLabel(a.operationalImpact)]] },
    { title: 'Contas e governança', rows: [['MFA', reportAnswerLabel(a.mfa)], ['Contas compartilhadas', reportAnswerLabel(a.sharedAccounts)], ['Remoção de acessos', reportAnswerLabel(a.offboarding)], ['Proteção de e-mail', reportAnswerLabel(a.emailProtection)], ['Resposta a incidentes', reportAnswerLabel(a.incidentResponse)], ['Fora do expediente', reportAnswerLabel(a.afterHoursResponse)], ['Uso de IA', reportAnswerLabel(a.aiUsageGovernance)], ['Dados sensíveis', reportAnswerLabel(a.sensitiveData)], ['Incidente anterior', reportAnswerLabel(a.incidentHistory)], ['Sistemas críticos', reportAnswerLabel(a.criticalSystems)]] },
  ];
  return {
    mode: 'full', company: a.companyName || 'Empresa não informada', contact: a.contactName || 'Não informado', score: r.overall,
    areas: (Object.keys(r.scores) as DomainKey[]).map(key => ({ label: plainDomainLabel(r.labels[key]), score: r.scores[key] })),
    facts: [{ label: 'Usuários', value: knownCount(a.users) }, { label: 'Computadores', value: knownCount(a.endpointCount || a.devices) }, { label: 'Links', value: knownCount(a.internetLinkCount) }, { label: 'Frentes', value: '4' }],
    controls, actions: reportActions,
    impact: buildImpactContext(a), concern: a.mainConcern || 'Preocupação principal não informada', details,
    financial: { range: r.impactRange, components: [{ label: 'Produtividade', range: r.impactComponents.productivity, basis: `${r.impactAssumptions.affectedPeople} pessoas afetadas × ${r.impactAssumptions.hours} horas × R$ 35 a R$ 65 por pessoa/hora.` }, { label: 'Recuperação técnica', range: r.impactComponents.technical, basis: !a.operationalImpact || a.operationalImpact === 'unknown' ? 'Impacto não confirmado: referência fixa do modelo entre R$ 2.000 e R$ 6.000.' : `Mínimo: R$ 3.000 + R$ 600 por servidor + R$ 25 por computador. Máximo: R$ 8.000 + R$ 1.800 por servidor + R$ 85 por computador. Base: ${Math.max(0, a.servers || 0)} servidores e ${Math.min(300, Math.max(a.endpointCount || 0, a.devices || 0))} computadores, limitada a 300.` }, { label: 'Interrupção operacional', range: r.impactComponents.disruption, basis: !a.operationalImpact || a.operationalImpact === 'unknown' ? `Impacto não confirmado: referência de ${a.sensitiveData === 'yes' || a.criticalSystems.length > 0 ? 'R$ 2.500 a R$ 7.000, pelo contexto declarado de dados ou sistemas críticos' : 'R$ 1.000 a R$ 4.000'}.` : `Base de ${a.sensitiveData === 'yes' || a.criticalSystems.length > 0 || a.operationalImpact === 'major' || a.operationalImpact === 'halt' ? 'R$ 4.500 a R$ 14.000' : 'R$ 1.800 a R$ 6.500'}, pelo contexto informado. Multiplicador por impacto: ${a.operationalImpact === 'low' ? '0,75' : a.operationalImpact === 'partial' ? '1' : a.operationalImpact === 'major' ? '1,35' : '1,7'}.` }], assumptions: `${r.impactAssumptions.people} pessoas de referência; ${r.impactAssumptions.affectedPeople} afetadas; ${r.impactAssumptions.hours} horas de parada simulada; produtividade entre R$ 35 e R$ 65 por pessoa/hora. Tempo e pessoas são premissas do modelo, sujeitas à validação. Componentes arredondados à centena mais próxima. Recuperação técnica e interrupção usam faixas paramétricas da metodologia atual; não são cotações nem faturamento perdido apurado.` },
    methodology: `Metodologia ${r.methodologyVersion}. A nota ponderada e as quatro frentes preservam o cálculo atual do Assessment. A distribuição abaixo descreve ${controls.length} respostas selecionadas e não recalcula a nota. Respostas desconhecidas recebem o tratamento previsto na metodologia; não comprovam ausência de controle.`,
  };
}

export interface ExecutiveReportAnswers {
  companyName: string; contactName: string; computerCount: string; internetSpeedMbps: string;
  itOwner: string; operationalImpact: string; protection: string; backup: string; mfa: string;
  aiGovernance: string; afterHours: string; mainConcern: string;
}
export interface ExecutiveReportResult {
  overall: number; areas: {label: string; score: number}[];
  priorities: {title: string; why: string; action: string; area: string}[];
  impact: {label: string; copy: string};
}
const executiveLabels: Record<string, Record<string,string>> = {
  protection: { monitored: 'Proteção com acompanhamento dos alertas', basic: 'Proteção instalada, acompanhamento não confirmado', native: 'Proteção nativa do sistema', none: 'Sem proteção informada', unknown: 'Não sei informar' },
  backup: { tested: 'Backup com recuperação testada', exists: 'Existem cópias, recuperação não confirmada', partial: 'Backup parcial', none: 'Sem backup informado', unknown: 'Não sei informar' },
  afterHours: { yes: 'Há quem acompanhe e possa agir fora do expediente', business_hours: 'Acompanhamento no expediente', ad_hoc: 'Acionamento quando alguém percebe', no: 'Ninguém acompanha fora do expediente', unknown: 'Não sei informar' },
  itOwner: { none: 'Sem responsável definido' },
};
const execLabel = (key: string, value: string) => executiveLabels[key]?.[value] || reportAnswerLabel(value);
export function buildExecutiveAssessmentReport(a: ExecutiveReportAnswers, r: ExecutiveReportResult): AssessmentReportModel {
  const controls = [
    control('owner', 'response', a.itOwner, ['internal', 'outsourced', 'shared'], `Responsável por TI: ${execLabel('itOwner', a.itOwner)}.`),
    control('protection', 'endpoint', a.protection, ['monitored'], `Computadores: ${execLabel('protection', a.protection)}.`),
    control('backup', 'recovery', a.backup, ['tested'], `Recuperação: ${execLabel('backup', a.backup)}.`),
    control('mfa', 'mfa', a.mfa, ['yes']),
    control('after-hours', 'response', a.afterHours, ['yes'], `Fora do expediente: ${execLabel('afterHours', a.afterHours)}.`),
    control('ai', 'ai', a.aiGovernance, ['controlled'], undefined, a.aiGovernance === 'not_used' ? 'not-applicable' : undefined),
  ];
  const areaScore: Record<string, number> = {};
  r.areas.forEach(area => { areaScore[area.label] = area.score; });
  const executiveAreas: Record<string, string> = { Computadores:'Proteção do ambiente', 'Dados e backup':'Dados e continuidade', 'Contas e acessos':'Contas e acessos', 'Resposta e governança':'Resposta e governança' };
  controls.sort((x,y) => (areaScore[executiveAreas[x.area]!] ?? 100) - (areaScore[executiveAreas[y.area]!] ?? 100));
  const ownerControl = controls.find(c => c.id === 'owner')!;
  ownerControl.impact = ownerControl.state === 'unknown' ? 'Não foi possível confirmar quem coordena a TI. Sem essa definição, pode haver demora para identificar quem deve decidir e agir.' : 'Uma responsabilidade definida ajuda a coordenar prioridades e acionamentos. Vale confirmar atribuições, autonomia e cobertura; ter um fornecedor de TI não comprova resposta especializada a incidentes.';
  ownerControl.action = 'Confirmar o responsável, seus canais de contato e quem assume os acionamentos em sua ausência.';
  const actionable = controls.filter(c => c.state === 'attention');
  const pending = controls.filter(c => c.state === 'unknown');
  const ordered = [...actionable, ...pending, ...controls.filter(c => c.state === 'confirmed')];
  const concern: Record<string,string> = { downtime: 'Paralisação da operação', data_loss: 'Perda de informações', fraud: 'Golpes e fraudes', leak: 'Vazamento de dados', invasion: 'Invasão ou ransomware', compliance: 'LGPD e responsabilidades', unsure: 'Ainda não definida' };
  return {
    mode: 'executive', company: a.companyName || 'Empresa não informada', contact: a.contactName || 'Não informado', score: r.overall,
    areas: r.areas, facts: [{label:'Computadores',value:a.computerCount || 'Não informado'}, {label:'Internet',value:a.internetSpeedMbps ? `${a.internetSpeedMbps} Mbps` : 'Não informada'}, {label:'Controles lidos',value:String(controls.length)}, {label:'Formato',value:'Executivo'}],
    controls,
    // The brief form has fewer answers. Do not infer firewall, topology or financial inputs.
    actions: (ordered.length ? ordered : controls).slice(0, 3).map(c => ({ title: c.state === 'unknown' ? `Confirmar: ${c.title.toLowerCase()}` : c.title, reason: c.state === 'unknown' ? 'A resposta foi “não sei informar”. Primeiro é preciso confirmar a situação com a equipe responsável.' : c.impact, action: c.action, owner, outcome: c.evidence, support: c.support })),
    impact: r.impact.copy, concern: concern[a.mainConcern] || a.mainConcern || 'Não informada',
    details: [{title:'Respostas do diagnóstico executivo', rows: [['Responsável por TI',execLabel('itOwner',a.itOwner)],['Impacto da parada',a.operationalImpact === 'partial' ? 'Parte da operação afetada' : reportAnswerLabel(a.operationalImpact)],['Proteção',execLabel('protection',a.protection)],['Backup',execLabel('backup',a.backup)],['MFA',reportAnswerLabel(a.mfa)],['Fora do expediente',execLabel('afterHours',a.afterHours)],['Uso de IA',reportAnswerLabel(a.aiGovernance)],['Preocupação principal',concern[a.mainConcern] || a.mainConcern || 'Não informada']] }],
    methodology: 'A nota e os quatro indicadores preservam a metodologia atual da versão executiva. A distribuição descreve seis respostas de controle; impacto e preocupação principal contextualizam a leitura. O cálculo original atribui valores de referência a respostas desconhecidas. A nota não pode ser comparada diretamente à versão completa, que avalia outros critérios e pesos.',
  };
}
