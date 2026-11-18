import type { ReactNode } from 'react';
import type { AssessmentReportModel, ReportChapter, ReportControl, ReportAction } from '../lib/assessment-report';
import { LGPD_URL, INCIDENT_URL, stateLabels } from '../lib/assessment-report';
import concierge from '../assets/report-concierge.jpg';
import qos from '../assets/report-qos.jpg';
import '../assessment-report.css';

const chunks = <T,>(items: T[], size: number): T[][] => Array.from({length: Math.ceil(items.length / size)}, (_, i) => items.slice(i * size, i * size + size));
const money = (n: number) => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
const range = (r: [number,number]) => `${money(r[0])} a ${money(r[1])}`;

function Page({ model, title, kicker, sub, children, cover = false }: {model:AssessmentReportModel; title:string; kicker:string; sub?:string; children:ReactNode; cover?:boolean}) {
  return <section className={`al-page${cover ? ' al-cover' : ''}`} data-pdf-page="true">
    <header className="al-top"><span>CONCIERGE · LÚMINA</span><span>{model.mode === 'executive' ? 'DIAGNÓSTICO EXECUTIVO' : 'DIAGNÓSTICO COMPLETO'}</span></header>
    <div className="al-heading"><span className="al-label">{kicker}</span><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
    <div className="al-body">{children}</div>
    <footer className="al-footer"><span>{model.company}</span><span>Informações declaradas · Validação técnica necessária</span></footer>
  </section>;
}
function Brands() { return <div className="al-brands"><div><img src={concierge} alt="Concierge Segurança Digital" /></div><img src={qos} alt="QOS Tecnologia" /></div>; }
function Gauge({ value }: {value:number|null}) {
  const angle = value === null ? 0 : Math.max(0,Math.min(100,value));
  return <div className="al-gauge"><svg viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="76" fill="none" stroke="#24475c" strokeWidth="10"/><circle cx="90" cy="90" r="76" fill="none" stroke="#2bd1c2" strokeWidth="10" strokeDasharray={`${angle/100*477.52} 477.52`} transform="rotate(-90 90 90)" strokeLinecap="round"/></svg><div><strong>{value === null ? 'N/D'  : value}</strong><span>{value === null ? 'Não avaliado' : '/ 100'}</span></div></div>;
}
function Field({label, children}:{label:string;children:ReactNode}) {return <div className="al-field"><b>{label}</b><div>{children}</div></div>;}
function Finding({c, index}:{c:ReportControl;index:number}) {
  return <article className={`al-finding al-state-${c.state}`} data-report-block="true">
    <header><span className="al-number">{String(index+1).padStart(2,'0')}</span><div><small>{c.area}</small><h3>{c.title}</h3></div><span className="al-tag">{stateLabels[c.state]}</span></header>
    <div className="al-finding-grid">
      <Field label="O QUE FOI INFORMADO"><p>{c.informed}</p></Field>
      <Field label="POR QUE IMPORTA NA OPERAÇÃO"><p>{c.impact}</p></Field>
      <Field label="O QUE VALE FAZER"><p>{c.action}</p></Field>
      <Field label="BOA PRÁTICA / EVIDÊNCIA"><p>{c.evidence}</p><a href={c.url} target="_blank" rel="noreferrer">{c.reference}</a></Field>
      <Field label="RELAÇÃO COM A LGPD"><p>{c.legal}</p><a href={c.id.includes('after') || c.id === 'incident' || c.id === 'owner' ? INCIDENT_URL : LGPD_URL} target="_blank" rel="noreferrer">LGPD / orientação oficial da ANPD</a></Field>
      <Field label="COMO A CONCIERGE PODE APOIAR"><p>{c.support}</p></Field>
    </div>
  </article>;
}
function Action({item,index}:{item:ReportAction;index:number}) {return <article className="al-action" data-report-block="true"><header><span className="al-number">{String(index+1).padStart(2,'0')}</span><h3>{item.title}</h3></header><div className="al-action-grid"><Field label="POR QUE ESSA PRIORIDADE"><p>{item.reason}</p></Field><Field label="O QUE FAZER PRIMEIRO"><p>{item.action}</p></Field><Field label="RESPONSÁVEL A ALINHAR"><p>{item.owner}</p></Field><Field label="RESULTADO / EVIDÊNCIA ESPERADA"><p>{item.outcome}</p></Field><Field label="APOIO POSSÍVEL DA CONCIERGE"><p>{item.support}</p></Field></div></article>;}

export default function AssessmentLuminaReport({model:m, chapter, all=false}:{model:AssessmentReportModel;chapter:ReportChapter;all?:boolean}) {
  const show = (key:ReportChapter) => all || chapter === key;
  const counts = {attention:0,confirmed:0,unknown:0,'not-applicable':0};
  m.controls.forEach(c => counts[c.state]++);
  const ordered = [...m.controls].sort((a,b) => ({attention:0,unknown:1,confirmed:2,'not-applicable':3}[a.state] - {attention:0,unknown:1,confirmed:2,'not-applicable':3}[b.state]));
  const priorities = ordered.filter(c => c.state === 'attention' || c.state === 'unknown').slice(0,3);
  const groups = chunks(ordered.filter(c => c.state !== 'not-applicable'), 2);
  const actions = chunks(m.actions, 2);
  const detailPages = m.details.flatMap(g => chunks(g.rows, Math.ceil(g.rows.length / Math.ceil(g.rows.length / 12))).map((rows,i) => ({title:g.title + (i ? ' · continuação' : ''),rows})));
  return <div className="assessment-lumina" data-lumina-assessment="true">
    {show('overview') && <>
      <Page model={m} kicker="DEVOLUTIVA EXECUTIVA" title="Segurança para decidir com clareza" cover>
        <Brands/><div className="al-cover-main" data-report-block="true"><span className="al-label">{m.mode === 'executive' ? 'ASSESSMENT · ATÉ 2 MINUTOS DE PREENCHIMENTO' : 'ASSESSMENT · LEITURA COMPLETA'}</span><h1 className={m.company.length > 85 ? 'al-name-long' : undefined}>{m.company}</h1><p>Das respostas às prioridades da operação.</p><div className="al-note">Este documento organiza os controles informados, os possíveis impactos e as ações que merecem validação com a equipe responsável.</div></div>
        <div className="al-cover-meta" data-report-block="true"><Field label="CONTATO"><p>{m.contact}</p></Field><Field label="FOCO INFORMADO"><p>{m.concern}</p></Field><Field label="BASE DA LEITURA"><p>Respostas do diagnóstico, sem inspeção técnica do ambiente.</p></Field></div>
      </Page>
      <Page model={m} kicker="01 / PANORAMA" title="O que as respostas já mostram" sub="Uma leitura inicial dos controles e das prioridades. A nota não representa probabilidade de ataque ou percentual de proteção.">
        <div className="al-metrics" data-report-block="true">{m.facts.map(f => <div key={f.label}><span>{f.label}</span><strong>{f.value}</strong></div>)}</div>
        <div className="al-overview" data-report-block="true"><article className="al-panel"><span className="al-label">INDICADOR DECLARATÓRIO</span><div className="al-grade"><Gauge value={m.score}/><div><h3>{counts.confirmed} {counts.confirmed === 1 ? 'controle informado' : 'controles informados'}</h3><p>{counts.attention} pontos de atenção e {counts.unknown} respostas a confirmar.</p><p>A existência declarada de um controle ainda precisa ser acompanhada de evidências de cobertura e funcionamento.</p></div></div></article><article className="al-panel"><span className="al-label">PRIMEIROS PONTOS A VALIDAR</span><div className="al-ranking">{priorities.length ? priorities.map((c,i) => <div key={c.id}><strong>{String(i+1).padStart(2,'0')}</strong><span>{c.state === 'unknown' ? 'Confirmar: ' : ''}{c.title}</span></div>) : <p>Os controles selecionados foram informados como existentes. O próximo passo é validar sua eficácia e manter a revisão periódica.</p>}</div></article></div>
        <div className="al-areas" data-report-block="true">{m.areas.map(a => <article key={a.label}><span>{a.label}</span><strong>{a.score === null ? 'Não avaliado' : a.score}</strong><svg viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="4" rx="2" fill="#24475c"/><rect width={a.score ?? 0} height="4" rx="2" fill="#2bd1c2"/></svg></article>)}</div>
        <div className="al-strip" data-report-block="true">{m.methodology}</div>
      </Page>
    </>}
    {show('findings') && <>
      <Page model={m} kicker="02 / DISTRIBUIÇÃO DOS CONTROLES" title="Onde vale aprofundar" sub="Contagem de respostas selecionadas, sem substituir os critérios e pesos usados na nota.">
        <div className="al-distribution" data-report-block="true">{(['attention','confirmed','unknown'] as const).map(s => <article className={`al-panel al-state-${s}`} key={s}><span className="al-label">{stateLabels[s]}</span><strong>{counts[s]}</strong><p>{s === 'attention' ? 'Respostas indicam cobertura limitada ou ponto a revisar.' : s === 'confirmed' ? 'Informados como existentes, sujeitos a validação.' : 'A resposta não permite concluir se o controle existe.'}</p></article>)}</div>
        <div className="al-panel" data-report-block="true"><h3>Como ler os próximos cartões</h3><p>Cada análise começa pela informação declarada, explica um possível efeito na operação e aponta uma ação verificável. O contexto técnico e a relação com a proteção de dados ajudam a decidir o que validar.</p><p>Os cenários são condicionais. Este levantamento não identifica, por si só, um incidente nem uma vulnerabilidade comprovada.</p>{counts['not-applicable'] > 0 && <p>{counts['not-applicable']} controle fora do uso informado: a empresa declarou não utilizar IA generativa. A revisão volta a ser necessária se esse uso mudar.</p>}</div>
      </Page>
      {groups.map((group,i) => <Page key={`find-${i}`} model={m} kicker={`03 / ANÁLISE DOS CONTROLES · ${i+1} DE ${groups.length}`} title="Da resposta à ação" sub="Informação declarada → possível efeito → evidência e ação a validar."><div className="al-findings">{group.map((c,j) => <Finding key={c.id} c={c} index={i*2+j}/>)}</div></Page>)}
    </>}
    {show('impact') && <>
      <Page model={m} kicker="04 / IMPACTO NA OPERAÇÃO" title="O que pode mudar para o negócio" sub="O impacto depende dos serviços afetados, dos dados envolvidos e do tempo necessário para conter e recuperar.">
        <article className="al-panel al-impact-lead" data-report-block="true"><span className="al-label">O QUE FOI INFORMADO</span><h3>{m.impact}</h3><p>Preocupação principal: {m.concern}.</p></article>
        <div className="al-impact-grid" data-report-block="true"><article className="al-panel"><h3>Continuidade</h3><p>Validar quais atividades dependem dos sistemas e qual alternativa existe durante uma interrupção.</p><p>Levar à próxima conversa: serviços críticos e tempo máximo tolerado de parada.</p></article><article className="al-panel"><h3>Resposta</h3><p>Confirmar quem pode identificar o problema, tomar decisões e iniciar a contenção nos horários relevantes para a empresa.</p><p>Levar à próxima conversa: contatos, autonomia e fluxo de acionamento.</p></article><article className="al-panel"><h3>Dados pessoais</h3><p>Se houver dados pessoais envolvidos, avaliar natureza, alcance e possíveis efeitos sobre os titulares antes de concluir as obrigações do caso.</p><a href={INCIDENT_URL} target="_blank" rel="noreferrer">ANPD · Comunicação de incidentes</a></article></div>
        <div className="al-strip" data-report-block="true">Os arts. 46 e 48 da LGPD contextualizam segurança e comunicação de incidentes. As respostas deste diagnóstico não permitem concluir conformidade, infração ou obrigação automática de comunicar.</div>
      </Page>
      {m.financial && <Page model={m} kicker="04 / SIMULAÇÃO FINANCEIRA" title="Uma referência para discutir continuidade" sub="Faixas da metodologia atual. Não representam previsão de prejuízo ou orçamento de recuperação."><article className="al-panel" data-report-block="true"><span className="al-label">ORDEM DE GRANDEZA SIMULADA</span><h3 className="al-money">{range(m.financial.range)}</h3><p>{m.financial.assumptions}</p></article><div className="al-impact-grid" data-report-block="true">{m.financial.components.map(c => <article className="al-panel" key={c.label}><span className="al-label">{c.label}</span><h3>{range(c.range)}</h3><p>{c.basis}</p></article>)}</div><div className="al-strip" data-report-block="true">Multas, dano reputacional e pagamento de resgate ficam fora desta soma. Validar as premissas com a gestão antes de usar valores em uma decisão de investimento.</div></Page>}
    </>}
    {show('actions') && <>
      {actions.map((group,i) => <Page key={`action-${i}`} model={m} kicker={`05 / PLANO DE PRIORIDADES · ${i+1} DE ${actions.length}`} title="Por onde começar a melhoria" sub="Sequência orientativa. Responsáveis, prazos e escopo precisam ser acordados com a gestão e a equipe técnica."><div className="al-actions">{group.map((a,j) => <Action key={`${i}-${j}`} item={a} index={i*2+j}/>)}</div></Page>)}
      <Page model={m} kicker="06 / ENCAMINHAMENTO" title="Da leitura inicial à decisão" sub="Validar o cenário antes de definir arquitetura, quantidades e serviços."><article className="al-panel" data-report-block="true"><h3>01 · Confirmar o ambiente e as evidências</h3><p>Reunir gestão, TI e parceiros atuais para confirmar as respostas, revisar registros e escolher as prioridades aplicáveis.</p><p>Saída esperada: escopo, responsáveis e condições de operação validados.</p></article><article className="al-panel" data-report-block="true"><h3>02 · Detalhar o plano e a proposta</h3><p>Definir medidas, serviços, responsabilidades e etapas de implantação de acordo com o que foi validado.</p><p>Saída esperada: plano técnico e condições comerciais para avaliação da gestão.</p></article><div className="al-quote" data-report-block="true">Toda proteção começa pela compreensão do que precisa ser protegido.</div><Brands/></Page>
    </>}
    {(show('details') || (m.mode === 'executive' && show('actions'))) && <>
      {detailPages.map((g,i) => <Page key={`detail-${i}`} model={m} kicker="07 / RESPOSTAS REGISTRADAS" title={g.title} sub="Respostas preservadas para a validação com a equipe responsável."><dl className="al-details">{g.rows.map(([label,value],j) => <div key={`${label}-${j}`} data-report-block="true"><dt>{label}</dt><dd>{value}</dd></div>)}</dl></Page>)}
      <Page model={m} kicker="08 / METODOLOGIA E LIMITES" title="Como interpretar esta devolutiva" sub="Transparência sobre a origem das informações e o alcance desta leitura."><div className="al-method-grid" data-report-block="true"><article className="al-panel"><h3>Origem dos dados</h3><p>Respostas declaradas no Assessment. Não houve inspeção de configurações, análise de logs ou teste técnico neste preenchimento.</p></article><article className="al-panel"><h3>Indicador próprio</h3><p>{m.methodology}</p></article><article className="al-panel"><h3>Validação necessária</h3><p>Um controle informado não comprova eficácia. Uma resposta desconhecida não prova ausência. Este relatório não substitui auditoria ou avaliação de vulnerabilidades.</p></article><article className="al-panel"><h3>Proteção de dados</h3><p>A interpretação da LGPD depende do contexto de tratamento e de evidências. Uma ferramenta ou contratação isolada não garante adequação integral.</p></article></div><div className="al-references" data-report-block="true"><h3>Referências de consulta</h3><a href="https://www.cisecurity.org/controls/cis-controls-list" target="_blank" rel="noreferrer">CIS Controls · Lista oficial de controles</a><a href={LGPD_URL} target="_blank" rel="noreferrer">Lei nº 13.709/2018 · LGPD</a><a href={INCIDENT_URL} target="_blank" rel="noreferrer">ANPD · Comunicação de incidentes</a><a href="https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence" target="_blank" rel="noreferrer">NIST · Generative AI Profile</a></div></Page>
    </>}
  </div>;
}
