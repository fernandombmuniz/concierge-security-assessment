/**
 * Briefing interno de e-mail V2 com leitura cruzada e estratégia de reunião. Não altera respostas, notas, relatório público ou PDF.
 * Rótulos copiados das opções dos formulários da base recebida em 25/11/2026.
 */
type Data = Record<string, unknown>;
interface Field { key: string; question: string; options?: Record<string, string> }
export interface InternalEmailInput {
  assessment: Data; answers: Data; calculated: Data;
  manager: { name: string; email: string };
  reportUrl: string | null; testRecipient?: string | null; executive: boolean;
}
const FIELDS: Record<"full" | "executive", Field[]> = {
  "full": [
    {
      "key": "companyName",
      "question": "Nome da empresa"
    },
    {
      "key": "contactName",
      "question": "Seu nome"
    },
    {
      "key": "contactRole",
      "question": "Cargo"
    },
    {
      "key": "contactEmail",
      "question": "E-mail"
    },
    {
      "key": "endpointCount",
      "question": "Computadores e notebooks"
    },
    {
      "key": "sites",
      "question": "Unidades ou filiais"
    },
    {
      "key": "itTeamSize",
      "question": "Quantas pessoas compõem a equipe interna de TI?",
      "options": {
        "0": "Não há equipe interna / não sei",
        "1": "1 pessoa",
        "3": "2 a 5 pessoas",
        "6": "Mais de 5 pessoas"
      }
    },
    {
      "key": "securityOperationsModel",
      "question": "Na prática, como a segurança entra na rotina da equipe de TI?",
      "options": {
        "dedicated": "Há pessoa ou equipe com foco dedicado em segurança",
        "scheduled": "A TI reserva tempo regularmente para segurança",
        "generalist_overloaded": "A mesma equipe acumula suporte, infraestrutura e segurança",
        "reactive": "Segurança costuma ser tratada quando aparece um problema",
        "managed_support": "Um fornecedor especializado apoia ou opera a segurança",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "firewallLevel",
      "question": "Como a empresa protege hoje a conexão com a internet?",
      "options": {
        "isp": "Apenas o roteador/equipamento da operadora",
        "router": "MikroTik ou outro roteador corporativo",
        "utm": "Firewall open source, como pfSense ou OPNsense",
        "ngfw": "Firewall corporativo NGFW, como Fortinet, SonicWall ou Sophos",
        "managed_ngfw": "Firewall gerenciado por equipe ou serviço especializado",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "firewallModel",
      "question": "Modelo ou solução, se souber"
    },
    {
      "key": "firewallManagement",
      "question": "Quem administra essa proteção?",
      "options": {
        "internal": "Equipe interna",
        "outsourced": "Empresa terceirizada",
        "shared": "Equipe interna + terceirizada",
        "isp": "Operadora",
        "unmanaged": "Ninguém claramente responsável",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "monitoring",
      "question": "Quando aparece um evento ou alerta importante da rede, o que normalmente acontece?",
      "options": {
        "soc": "Há acompanhamento contínuo e resposta",
        "security_team": "Uma equipe especializada revisa os alertas",
        "outsourced_it": "Uma empresa terceirizada acompanha",
        "reactive_it": "A TI verifica quando consegue ou quando surge um problema",
        "none": "Ninguém acompanha regularmente",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "internetLinkCount",
      "question": "Quantos links de internet existem?"
    },
    {
      "key": "link0",
      "question": "Velocidade do link principal"
    },
    {
      "key": "link1",
      "question": "Velocidade do segundo link"
    },
    {
      "key": "vpnUsage",
      "question": "Há pessoas acessando sistemas da empresa de fora da rede?",
      "options": {
        "yes": "Sim",
        "no": "Não",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "vpnRemote",
      "question": "Aproximadamente quantas pessoas usam esse acesso remoto?"
    },
    {
      "key": "vpnSite",
      "question": "Quantas conexões entre unidades existem?"
    },
    {
      "key": "vlans",
      "question": "A rede é separada entre funcionários, visitantes, servidores ou outros usos?",
      "options": {
        "0": "Não sei informar",
        "1": "Não",
        "2": "Parcialmente",
        "3": "Sim, existe segmentação clara"
      }
    },
    {
      "key": "endpointLevel",
      "question": "Qual cenário mais se aproxima da proteção atual dos computadores?",
      "options": {
        "none": "Não existe uma proteção padronizada",
        "basic_av": "Antivírus básico ou proteção nativa",
        "business_av": "Antivírus corporativo com gestão central",
        "edr": "EDR ou proteção que também ajuda a investigar ameaças",
        "managed_edr": "Proteção acompanhada por equipe especializada",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "endpointProduct",
      "question": "Qual solução é utilizada, se souber?"
    },
    {
      "key": "endpointManagementModel",
      "question": "Como essa proteção é administrada hoje?",
      "options": {
        "individual": "Em cada computador individualmente",
        "central_internal": "Em painel central pela equipe de TI",
        "central_partner": "Em painel central por empresa terceirizada",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "endpointResponse",
      "question": "Quando aparece um alerta importante, o que normalmente acontece?",
      "options": {
        "managed_soc": "Uma equipe acompanha e atua continuamente",
        "defined_team": "A TI verifica os alertas regularmente",
        "alerts_only": "A TI verifica quando consegue ou quando surge um problema",
        "none": "Não existe acompanhamento definido",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "assetInventory",
      "question": "O inventário de computadores e servidores está atualizado?",
      "options": {
        "managed": "Sim, atualizado e gerenciado",
        "partial": "Existe, mas pode estar incompleto",
        "informal": "Existe um controle informal",
        "none": "Não existe um inventário claro",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "vulnerabilityManagement",
      "question": "Existe uma rotina para identificar vulnerabilidades e correções pendentes?",
      "options": {
        "continuous": "Sim, continuamente",
        "regular": "Sim, em uma rotina periódica",
        "occasional": "Ocasionalmente",
        "reactive": "Normalmente quando surge um problema",
        "none": "Não existe uma rotina definida",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "servers",
      "question": "Quantos servidores próprios ou virtuais a empresa administra?"
    },
    {
      "key": "dataLocation",
      "question": "Onde ficam os dados mais importantes da empresa?",
      "options": {
        "unknown": "Não sei informar",
        "corporate_central": "Ambiente corporativo centralizado",
        "saas_only": "Principalmente em aplicações/SaaS na nuvem",
        "mixed": "Distribuídos entre nuvem, servidores e computadores",
        "endpoints": "Principalmente nos computadores",
        "personal_cloud": "Há dados em contas ou locais não administrados pela empresa"
      }
    },
    {
      "key": "backupLevel",
      "question": "Como as cópias de segurança funcionam hoje?",
      "options": {
        "none": "Não existe uma rotina definida",
        "manual": "Existem cópias manuais",
        "automated_local": "Cópia automática dentro da empresa",
        "cloud": "Cópia automática em nuvem",
        "multi_copy": "Existem cópias em mais de um local",
        "managed": "Existe uma rotina gerenciada e acompanhada",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "backupVolumeGb",
      "question": "Volume aproximado que precisa ser protegido",
      "options": {
        "0": "Não sei informar",
        "50": "Até 100 GB",
        "300": "100 a 500 GB",
        "750": "500 GB a 1 TB",
        "3000": "1 a 5 TB",
        "7500": "Mais de 5 TB"
      }
    },
    {
      "key": "maxDowntime",
      "question": "Por quanto tempo a empresa tolera ficar sem os sistemas ou dados principais?",
      "options": {
        "4h": "Até 4 horas",
        "8h": "Até 8 horas",
        "1d": "Até 1 dia",
        "2d": "Até 2 dias",
        "more": "Mais de 2 dias",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "backupResponsibility",
      "question": "Quem é responsável por garantir que o backup funcione?",
      "options": {
        "internal": "Equipe interna",
        "outsourced": "Empresa terceirizada",
        "shared": "Responsabilidade compartilhada",
        "nobody": "Ninguém claramente responsável",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "backupIsolation",
      "question": "Existe uma cópia de backup separada do ambiente principal?",
      "options": {
        "isolated": "Sim, em outro ambiente ou nuvem",
        "immutable": "Sim, offline, isolada ou protegida contra alteração",
        "same_environment": "Existe cópia, mas depende do mesmo ambiente ou das mesmas credenciais",
        "none": "Não existe uma cópia separada",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "restoreTests",
      "question": "A empresa já testou recuperar arquivos ou sistemas a partir do backup?",
      "options": {
        "regular": "Sim, periodicamente",
        "once": "Sim, pelo menos uma vez",
        "never": "Nunca testamos",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "operationalImpact",
      "question": "Se os sistemas principais parassem hoje, qual seria o impacto?",
      "options": {
        "low": "A empresa continuaria quase normalmente",
        "partial": "Parte da empresa ficaria parada",
        "major": "A maior parte da operação seria afetada",
        "halt": "A operação praticamente pararia",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "mfa",
      "question": "Nas contas mais importantes, existe uma confirmação além da senha?",
      "options": {
        "yes": "Sim, na maioria das contas importantes",
        "partial": "Apenas em algumas contas",
        "no": "Não",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "sharedAccounts",
      "question": "Mais de uma pessoa utiliza a mesma conta ou senha em algum sistema?",
      "options": {
        "yes": "Sim",
        "no": "Não",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "offboarding",
      "question": "Quando alguém sai da empresa, os acessos costumam ser removidos?",
      "options": {
        "formal": "Sim, existe processo definido",
        "informal": "É feito caso a caso",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "emailProtection",
      "question": "O e-mail possui proteção além do filtro padrão de spam?",
      "options": {
        "advanced": "Sim, com análise de links, anexos e mensagens suspeitas",
        "standard": "Sim, existe proteção adicional administrada",
        "basic": "Apenas o filtro padrão de spam",
        "none": "Não existe proteção adicional",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "incidentResponse",
      "question": "Se acontecer um incidente hoje, a empresa sabe quem coordena a resposta?",
      "options": {
        "formal": "Sim, há responsável e processo definidos",
        "informal": "Sabemos quem chamar, mas sem processo formal",
        "none": "Não existe responsável definido",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "afterHoursResponse",
      "question": "Se o incidente começar à noite, em um feriado ou fim de semana, quem consegue agir?",
      "options": {
        "managed_24x7": "Há equipe ou serviço com cobertura 24x7",
        "on_call": "Há alguém de sobreaviso",
        "ad_hoc": "Tentamos localizar alguém quando necessário",
        "business_hours": "Normalmente seria tratado no próximo expediente",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "aiUsageGovernance",
      "question": "Como a empresa orienta o uso de ferramentas de IA generativa, como ChatGPT, Copilot ou Gemini?",
      "options": {
        "controlled": "Existem ferramentas permitidas e regras claras sobre dados",
        "partial": "Há orientações, mas elas não são padronizadas em toda a empresa",
        "open": "As pessoas usam livremente, sem regra definida",
        "not_used": "A empresa não utiliza esse tipo de ferramenta no trabalho",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "sensitiveData",
      "question": "A empresa trata dados pessoais ou informações sensíveis?",
      "options": {
        "yes": "Sim",
        "no": "Não",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "incidentHistory",
      "question": "A empresa já passou por vírus, invasão, perda de dados ou uma parada importante?",
      "options": {
        "yes": "Sim",
        "no": "Não",
        "unknown": "Não sei / prefiro não informar"
      }
    },
    {
      "key": "mainConcern",
      "question": "Qual situação de segurança mais preocupa a empresa hoje?"
    }
  ],
  "executive": [
    {
      "key": "companyName",
      "question": "Nome da empresa"
    },
    {
      "key": "contactName",
      "question": "Seu nome"
    },
    {
      "key": "contactEmail",
      "question": "E-mail"
    },
    {
      "key": "computerCount",
      "question": "Computadores e notebooks"
    },
    {
      "key": "internetSpeedMbps",
      "question": "Qual é a velocidade da internet principal?"
    },
    {
      "key": "itOwner",
      "question": "Hoje, quem normalmente cuida da tecnologia e da segurança da empresa?",
      "options": {
        "internal": "Equipe interna de TI",
        "outsourced": "Empresa ou profissional terceirizado",
        "shared": "Responsabilidade dividida entre equipe interna e parceiro",
        "none": "Não existe um responsável claramente definido",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "operationalImpact",
      "question": "Se internet ou sistemas importantes parassem hoje, como a operação seria afetada?",
      "options": {
        "low": "Pouco impacto por algumas horas",
        "partial": "Parte da equipe conseguiria continuar trabalhando",
        "major": "Boa parte da operação ficaria comprometida",
        "halt": "A operação praticamente pararia",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "protection",
      "question": "Você sabe como os computadores da empresa são protegidos?",
      "options": {
        "monitored": "Existe proteção e alguém acompanha alertas e situações suspeitas",
        "basic": "Existe antivírus ou proteção instalada, mas não sei se há acompanhamento",
        "native": "Usamos principalmente a proteção padrão dos próprios computadores",
        "none": "Não existe uma proteção definida para todos os computadores",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "backup",
      "question": "Sobre as informações importantes da empresa, qual cenário descreve melhor o backup?",
      "options": {
        "tested": "Existe backup e já confirmamos que conseguimos recuperar os dados",
        "exists": "Existe backup, mas não sei quando foi testada a recuperação",
        "partial": "Apenas parte das informações possui cópia de segurança",
        "none": "Não existe um processo definido de backup",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "mfa",
      "question": "Nas contas mais importantes, como e-mail, financeiro ou sistemas administrativos, existe uma confirmação além da senha?",
      "options": {
        "yes": "Sim, na maioria das contas importantes",
        "partial": "Em algumas contas",
        "no": "Não",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "aiGovernance",
      "question": "A empresa tem alguma orientação sobre como colaboradores podem usar ferramentas de Inteligência Artificial?",
      "options": {
        "controlled": "Sim, existem ferramentas permitidas e regras sobre quais informações podem ser usadas",
        "partial": "Existem orientações, mas ainda são informais ou parciais",
        "open": "Cada pessoa utiliza como achar melhor",
        "not_used": "A empresa não utiliza IA no trabalho",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "afterHours",
      "question": "Se um problema de segurança acontecer de madrugada, no fim de semana ou em um feriado, existe alguém definido para agir?",
      "options": {
        "yes": "Sim, existe alguém ou uma equipe que pode ser acionada",
        "business_hours": "Normalmente os problemas são tratados no próximo expediente",
        "ad_hoc": "Depende da situação e de conseguir falar com alguém",
        "no": "Não existe um responsável definido fora do expediente",
        "unknown": "Não sei informar"
      }
    },
    {
      "key": "mainConcern",
      "question": "Qual situação de segurança mais preocupa você hoje?",
      "options": {
        "downtime": "Paralisação da operação",
        "data_loss": "Perda de informações",
        "fraud": "Golpes e fraudes",
        "leak": "Vazamento de dados",
        "invasion": "Invasão ou ransomware",
        "compliance": "LGPD e responsabilidades sobre dados",
        "unsure": "Ainda não tenho uma preocupação principal definida"
      }
    }
  ]
};

const object = (v: unknown): Data => v && typeof v === "object" && !Array.isArray(v) ? v as Data : {};
const list = (v: unknown): Data[] => Array.isArray(v) ? v.map(object) : [];
const escape = (v: unknown): string => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const text = (v: unknown): string => typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : "";
const has = (v: unknown): boolean => v !== undefined && v !== null && v !== "";
const positive = (v: unknown): string => Number(v) > 0 && Number.isFinite(Number(v)) ? text(v) : "Não informado";
const missing = (v: unknown): boolean => !has(v) || v === "unknown";
const domains: Record<string, string> = { network: "Internet e rede", endpoint: "Computadores e dispositivos", backup: "Dados e recuperação", identity: "Contas e acessos", protection: "Proteção do ambiente", continuity: "Dados e continuidade", response: "Resposta e governança", "Rede e Perímetro": "Internet e rede", Endpoints: "Computadores e dispositivos", "Backup e Continuidade": "Dados e recuperação", "Identidade e Acesso": "Contas e acessos" };
const stages = {
  full: [
    ["1. Empresa", ["companyName", "contactName", "contactRole", "contactEmail", "endpointCount", "sites", "itTeamSize", "securityOperationsModel"]],
    ["2. Internet e rede", ["firewallLevel", "firewallModel", "firewallManagement", "monitoring", "internetLinkCount", "link0", "link1", "vpnUsage", "vpnRemote", "vpnSite", "vlans"]],
    ["3. Computadores", ["endpointLevel", "endpointProduct", "endpointManagementModel", "endpointResponse", "assetInventory", "vulnerabilityManagement", "servers"]],
    ["4. Dados e backup", ["dataLocation", "backupLevel", "backupVolumeGb", "maxDowntime", "backupResponsibility", "backupIsolation", "restoreTests", "operationalImpact"]],
    ["5. Contas e resposta", ["mfa", "sharedAccounts", "offboarding", "emailProtection", "incidentResponse", "afterHoursResponse", "aiUsageGovernance", "sensitiveData", "incidentHistory", "mainConcern"]],
  ],
  executive: [
    ["1. Seu negócio", ["companyName", "contactName", "contactEmail", "computerCount", "internetSpeedMbps", "itOwner", "operationalImpact"]],
    ["2. Proteção e resposta", ["protection", "backup", "mfa", "aiGovernance", "afterHours", "mainConcern"]],
  ],
} as const;

function visible(key: string, a: Data, executive: boolean): boolean {
  if (executive) return true;
  if (key === "link1") return Number(a.internetLinkCount) > 1;
  if (key === "vpnRemote") return a.vpnUsage === "yes";
  if (key === "vpnSite") return Number(a.sites) > 1;
  if (["endpointProduct", "endpointManagementModel", "endpointResponse"].includes(key)) return !missing(a.endpointLevel) && a.endpointLevel !== "none";
  if (["backupResponsibility", "backupIsolation", "restoreTests"].includes(key)) return !missing(a.backupLevel) && a.backupLevel !== "none";
  return true;
}
function fieldValue(f: Field, a: Data, executive: boolean): string {
  let v = a[f.key];
  if (f.key === "endpointCount") v = a.endpointCount || a.devices;
  if (f.key === "link0" || f.key === "link1") {
    v = object(Array.isArray(a.links) ? a.links[f.key === "link0" ? 0 : 1] : null).speedMbps;
    return Number(v) > 0 ? `${text(v)} Mbps` : "Não informado";
  }
  if (!has(v)) return "Não informado";
  if (!executive && f.key === "itTeamSize") {
    const n = Number(v);
    return n === 0 ? "Não há equipe interna / não sei" : n === 1 ? "1 pessoa" : n >= 2 && n <= 5 ? "2 a 5 pessoas" : n > 5 ? "Mais de 5 pessoas" : "Não informado";
  }
  if (!executive && f.key === "backupVolumeGb") {
    const n = Number(v);
    return n === 0 ? "Não sei informar" : n <= 100 ? "Até 100 GB" : n <= 500 ? "100 a 500 GB" : n <= 1000 ? "500 GB a 1 TB" : n <= 5000 ? "1 a 5 TB" : "Mais de 5 TB";
  }
  if (!executive && f.key === "vlans") return f.options?.[String(Math.min(3, Number(v)))] || "Não foi possível interpretar a resposta salva";
  if (f.options) return f.options[String(v)] || "Resposta de outra versão; confirmar com o respondente";
  if (["endpointCount", "computerCount", "internetSpeedMbps", "internetLinkCount"].includes(f.key) && Number(v) <= 0) return "Não informado";
  if (f.key === "internetSpeedMbps") return `${text(v)} Mbps`;
  // Textos livres não passam por dicionário nem por normalização de espaços.
  return Array.isArray(v) ? v.map(text).join(", ") : text(v) || "Não informado";
}
function answer(key: string, a: Data, executive: boolean): string {
  const f = FIELDS[executive ? "executive" : "full"].find(f => f.key === key);
  return f ? fieldValue(f, a, executive) : "Não informado";
}
const paragraph = (s: string) => `<p style="margin:8px 0 13px;font-size:14px;line-height:1.65;color:#334155;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;">${escape(s)}</p>`;
const heading = (s: string) => `<h2 style="margin:26px 0 10px;font-size:18px;line-height:1.4;color:#0f172a;">${escape(s)}</h2>`;
const row = (label: string, value: unknown) => `<tr><td width="44%" valign="top" style="padding:10px 10px 10px 0;border-bottom:1px solid #e2e8f0;font-size:13px;line-height:1.55;color:#64748b;overflow-wrap:anywhere;word-break:break-word;">${escape(label)}</td><td valign="top" style="padding:10px 0 10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;line-height:1.55;color:#0f172a;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;">${escape(has(value) ? value : "Não informado")}</td></tr>`;
const table = (rows: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;table-layout:fixed;border-collapse:collapse;">${rows}</table>`;

interface Topic { key: string; domain: string; title: string; state: "attention" | "unknown" | "informed" | "na"; evidence: string; reason: string; question: string; support: string; weight: number }
function topics(a: Data, executive: boolean): Topic[] {
  const result: Topic[] = [];
  function add(key: string, domain: string, title: string, good: string[], reason: string, question: string, support: string, weight = 0) {
    if (!visible(key, a, executive)) return;
    const v = a[key];
    const state = missing(v) ? "unknown" : good.includes(String(v)) ? "informed" : v === "not_used" ? "na" : "attention";
    result.push({ key, domain, title, state, evidence: answer(key, a, executive), reason, question, support, weight });
  }
  if (executive) {
    add("itOwner", "response", "Responsabilidade pela TI", ["internal", "outsourced", "shared"], "Ter alguém responsável pela TI ajuda no acionamento, mas não confirma o escopo de segurança nem a resposta especializada.", "Quem cuida da segurança dentro do escopo atual e quem pode decidir e agir em um incidente?", "Validar atribuições e cobertura do parceiro atual antes de avaliar apoio complementar.");
    add("protection", "protection", "Proteção e acompanhamento dos computadores", ["monitored"], "A resposta descreve acompanhamento, sem identificar a solução, a cobertura dos ativos ou as ações disponíveis para contenção.", "Qual solução é utilizada, quais equipamentos estão cobertos e quem investiga e contém um alerta relevante?", "Avaliar proteção e acompanhamento dos endpoints conforme a cobertura que for confirmada.", 2);
    add("backup", "continuity", "Recuperação de dados", ["tested"], "A existência de cópias e a declaração de teste não detalham o alcance da recuperação nem o tempo necessário para retomar a operação.", "Quando ocorreu o último teste, quais dados ou sistemas foram recuperados e quanto tempo levou?", "Avaliar recuperação, cobertura e separação das cópias com a equipe responsável.", 3);
    add("mfa", "identity", "Proteção das contas importantes", ["yes"], "A pergunta trata da maioria das contas importantes; não confirma cobertura integral de contas administrativas, e-mail e acesso remoto.", "A confirmação além da senha abrange e-mail, acessos remotos e contas administrativas? Existem exceções?", "Revisar a abrangência dos controles de acesso antes de propor mudanças.", 2);
    add("afterHours", "response", "Atuação fora do expediente", ["yes"], "Alguém acionável não equivale, por si só, a monitoramento contínuo ou a um prazo de resposta definido.", "Como o incidente é percebido, quem recebe o acionamento e quais ações essa pessoa pode executar fora do expediente?", "Avaliar eventual complemento de monitoramento e resposta conforme a necessidade validada.", 2);
    add("aiGovernance", "response", "Uso de inteligência artificial", ["controlled"], "Regras declaradas precisam ser entendidas quanto às ferramentas permitidas e ao uso de informações internas.", "Quais ferramentas são permitidas e como as pessoas são orientadas sobre os dados que podem enviar?", "Avaliar visibilidade e regras de acesso a ferramentas de IA, sem presumir proteção contra vazamento de conteúdo.");
  } else {
    add("firewallLevel", "network", "Proteção da conexão com a internet", ["ngfw", "managed_ngfw"], "A categoria do equipamento não confirma serviços ativos, regras revisadas ou capacidade adequada ao uso real.", "Quais serviços de segurança estão ativos e qual é a situação das regras, atualizações e capacidade do equipamento?", "Avaliar a configuração e a gestão da borda atual antes de recomendar substituição.", 2);
    add("firewallManagement", "network", "Gestão da proteção da rede", ["internal", "outsourced", "shared"], "A operação precisa de responsáveis e de um escopo claro para mudanças e incidentes.", "Quem administra a proteção, qual o escopo de atuação e quem assume os acionamentos em sua ausência?", "Avaliar gestão complementar de firewall conforme as responsabilidades existentes.");
    add("monitoring", "network", "Acompanhamento dos eventos da rede", ["soc", "security_team"], "A existência de um equipamento não confirma que seus eventos sejam analisados e tratados em tempo útil.", "Como um alerta relevante é identificado, investigado e encaminhado para contenção?", "Avaliar visibilidade, tratamento de alertas e cobertura operacional.", 3);
    add("endpointLevel", "endpoint", "Proteção dos computadores", ["edr", "managed_edr"], "O nível declarado precisa ser confrontado com a solução usada, a cobertura e a rotina de investigação e resposta.", "Qual solução e licença estão em uso e como são investigados e contidos os comportamentos suspeitos?", "Avaliar evolução da proteção ou da operação dos endpoints, conforme o cenário confirmado.", 2);
    add("endpointManagementModel", "endpoint", "Administração da proteção", ["central_internal", "central_partner"], "A gestão central ajuda a identificar equipamentos sem proteção e a executar ações com consistência.", "O console mostra todos os equipamentos previstos e quem acompanha as exceções de cobertura?", "Avaliar centralização e gestão da cobertura.");
    add("endpointResponse", "endpoint", "Tratamento dos alertas dos computadores", ["managed_soc", "defined_team"], "Ferramenta instalada e alerta emitido não comprovam capacidade de investigar e conter o incidente.", "Quem verifica os alertas, quem pode isolar um computador e como o tratamento fica registrado?", "Avaliar acompanhamento e resposta operacional em endpoint.", 3);
    add("assetInventory", "endpoint", "Inventário dos equipamentos", ["managed"], "Sem inventário conciliado com a proteção, podem existir ativos sem cobertura conhecida.", "Quando o inventário foi revisado e como é comparado com o console de proteção?", "Apoiar identificação de ativos e pendências de cobertura.");
    add("vulnerabilityManagement", "endpoint", "Vulnerabilidades e correções", ["continuous", "regular"], "A rotina de identificação e correção reduz a permanência de falhas conhecidas nos equipamentos.", "Como são priorizadas as vulnerabilidades e quem acompanha a aplicação das correções?", "Avaliar a rotina de gestão de vulnerabilidades conforme o escopo.");
    add("backupLevel", "backup", "Rotina de backup", ["automated_local", "cloud", "multi_copy", "managed"], "A rotina de cópias precisa cobrir os dados necessários e estar ligada a uma recuperação possível.", "Quais dados e sistemas estão cobertos e como falhas nas cópias são percebidas e tratadas?", "Avaliar cobertura e gestão do backup antes de dimensionar uma solução.", 2);
    add("backupIsolation", "backup", "Separação e proteção das cópias", ["immutable", "isolated", "separate_account"], "Cópias no mesmo ambiente ou com as mesmas credenciais podem ser atingidas pelo incidente que afeta os dados principais.", "Há uma cópia separada ou imutável? Quem pode alterá-la ou excluí-la?", "Avaliar separação e proteção das cópias existentes.", 3);
    add("restoreTests", "backup", "Teste de recuperação", ["regular", "once"], "Recuperação precisa ser validada para os dados e serviços importantes, com registro do tempo e do resultado do teste.", "Qual foi o último teste, o que foi restaurado e o tempo atende à tolerância de parada informada?", "Avaliar teste e desenho de recuperação.", 3);
    add("backupResponsibility", "backup", "Responsabilidade pelo backup", ["internal", "outsourced", "shared"], "O processo depende de alguém acompanhar execução, falhas e recuperação.", "Quem acompanha falhas, autoriza restaurações e garante que os testes sejam realizados?", "Avaliar a gestão do processo de backup.");
    add("mfa", "identity", "Confirmação além da senha", ["yes"], "É preciso confirmar a abrangência das contas protegidas e as exceções.", "E-mail, acesso remoto e contas administrativas estão abrangidos? Quais contas ainda não usam essa confirmação?", "Avaliar o alcance dos controles de acesso.", 2);
    add("sharedAccounts", "identity", "Contas compartilhadas", ["no"], "Compartilhar credenciais dificulta atribuir ações a uma pessoa e revogar acessos individualmente.", "Quais contas são compartilhadas e como é feito o registro e a remoção dos acessos?", "Avaliar individualização e controle dos acessos.");
    add("offboarding", "identity", "Remoção dos acessos", ["formal"], "A retirada de acessos precisa acompanhar desligamentos e mudanças de função.", "Como o desligamento chega à TI e como a remoção é confirmada nos sistemas?", "Avaliar a rotina de revogação e evidências.");
    add("emailProtection", "identity", "Proteção de e-mail", ["advanced", "standard"], "O nível informado precisa ser detalhado quanto ao tratamento de mensagens suspeitas e à cobertura.", "Como links, anexos e mensagens suspeitas são analisados e encaminhados para tratamento?", "Avaliar proteção de e-mail conforme as lacunas confirmadas.");
    add("incidentResponse", "identity", "Coordenação de incidentes", ["formal"], "Um incidente pode exigir decisão e coordenação entre TI, fornecedores e gestão.", "Quem coordena o incidente, como os responsáveis são acionados e quais procedimentos estão definidos?", "Avaliar responsabilidades e rotina de resposta.", 2);
    add("afterHoursResponse", "identity", "Resposta fora do expediente", ["managed_24x7", "on_call"], "A cobertura deve ser entendida quanto à detecção, acionamento e capacidade de agir.", "Como um incidente é percebido e contido à noite, em feriados ou fins de semana?", "Avaliar eventual complemento da cobertura operacional.", 2);
    add("aiUsageGovernance", "identity", "Governança do uso de IA", ["controlled"], "Orientações sobre ferramentas e dados ajudam a controlar o uso de informações internas.", "Quais ferramentas são permitidas e como as regras chegam às pessoas que as utilizam?", "Avaliar visibilidade e regras de acesso a IA conforme a necessidade, sem presumir prevenção de vazamento.");
    add("securityOperationsModel", "identity", "Capacidade operacional da equipe", ["dedicated", "scheduled", "managed_support"], "Acúmulo de funções ou atuação reativa pode limitar a execução recorrente das tarefas de segurança.", "Quais atividades de segurança a equipe consegue executar e quais ficam sem acompanhamento?", "Avaliar apoio especializado para tarefas e cobertura que a equipe não consegue assumir.");
  }
  return result;
}

function concernFocus(concern: string): { intro: string; keys: string[] } {
  const c = concern.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/leak|vaz|expos/.test(c)) return { intro: "Comece identificando quais informações mais preocupam o cliente, onde ficam e por quais caminhos são acessadas ou compartilhadas. Recuperação de backup não confirma prevenção de vazamento.", keys: ["mfa", "protection", "endpointLevel", "emailProtection", "sharedAccounts", "aiGovernance", "aiUsageGovernance"] };
  if (/fraud|golpe/.test(c)) return { intro: "Comece pelo fluxo em que a fraude pode ocorrer, pelas contas envolvidas e por quem confirma solicitações sensíveis. Depois, valide a proteção dos acessos e do e-mail.", keys: ["mfa", "emailProtection", "sharedAccounts", "incidentResponse"] };
  if (/data_loss|perda/.test(c)) return { intro: "Comece pelos dados que a empresa não pode perder e pelo que já foi efetivamente recuperado em teste. Valide cobertura, separação das cópias e responsabilidade.", keys: ["backup", "backupLevel", "backupIsolation", "restoreTests", "backupResponsibility"] };
  if (/downtime|parali|indispon|parada/.test(c)) return { intro: "Comece pelos serviços que precisam voltar primeiro e pelo tempo de parada tolerável. Valide a recuperação e quem consegue agir quando o incidente começa.", keys: ["backup", "restoreTests", "backupLevel", "afterHours", "afterHoursResponse", "incidentResponse"] };
  if (/invasion|invas|ransom/.test(c)) return { intro: "Comece pela capacidade de perceber, investigar e conter uma atividade suspeita e pela separação das cópias necessárias à recuperação.", keys: ["protection", "endpointResponse", "monitoring", "backupIsolation", "afterHours", "afterHoursResponse"] };
  if (/compliance|lgpd|conform/.test(c)) return { intro: "Comece pelas responsabilidades e pelas evidências dos controles informados. O diagnóstico inicial não comprova conformidade; a conversa deve identificar o que precisa de validação técnica e, quando aplicável, jurídica.", keys: ["mfa", "incidentResponse", "backup", "restoreTests", "aiUsageGovernance", "aiGovernance"] };
  return { intro: "Comece confirmando a preocupação principal e quais dados ou serviços mais afetam a operação. Use as respostas para escolher o aprofundamento, sem antecipar produto ou substituição.", keys: [] };
}
function recordHtml(a: Data, executive: boolean): string {
  const fields = FIELDS[executive ? "executive" : "full"];
  const blocks = stages[executive ? "executive" : "full"].map(([title, keys]) => heading(title) + table(keys.filter(k => visible(k, a, executive)).map(k => {
    const f = fields.find(f => f.key === k)!;
    return row(f.question, fieldValue(f, a, executive));
  }).join(""))).join("");
  // Dados de versões anteriores são preservados separadamente; não se confundem
  // com perguntas que a interface atual exibiu nem com inferências do formulário.
  const legacy: Array<[string, string]> = [
    ["sector", "Setor"], ["sectorOther", "Outro setor"], ["notes", "Observações"],
    ["criticalSystems", "Sistemas críticos"], ["endpointOperatingSystem", "Sistema operacional dos computadores"], ["serverOperatingSystem", "Sistema operacional dos servidores"],
    ["endpointVendor", "Fabricante da proteção de endpoint"], ["backupVendor", "Fabricante do backup"], ["backupProduct", "Solução de backup"],
  ];
  const legacyRows = executive ? [] : legacy.filter(([k]) => has(a[k]) && a[k] !== "unknown" && (!Array.isArray(a[k]) || (a[k] as unknown[]).length)).map(([k, label]) => row(label, Array.isArray(a[k]) ? (a[k] as unknown[]).map(text).join(", ") : text(a[k])));
  return blocks + (legacyRows.length ? heading("Informações adicionais salvas de versões anteriores") + table(legacyRows.join("")) : "");
}

interface CrossReading {
  title: string;
  facts: string;
  hypothesis: string;
  strategy: string;
  question: string;
  contribution: string;
  priority: number;
}
interface MeetingBrief { readings: CrossReading[]; opening: string; objective: string }

/** Cruzamentos internos por regras explícitas; não recalcula nem grava notas. */
function buildMeetingBrief(a: Data, executive: boolean, score: unknown, coverage: unknown, allTopics: Topic[]): MeetingBrief {
  const readings: CrossReading[] = [];
  const scoreKnown = has(score) && Number.isFinite(Number(score));
  const scorePhrase = scoreKnown ? `O indicador geral foi ${text(score)}/100.` : "O indicador geral não está disponível.";
  const concern = answer("mainConcern", a, executive);
  const focus = concernFocus(executive ? text(a.mainConcern) : concern);
  const leakConcern = focus.keys.includes("aiGovernance") && focus.keys.includes("protection");
  const concernKnown = !missing(a.mainConcern) && a.mainConcern !== "unsure";
  const good = allTopics.filter(t => t.state === "informed");
  const pending = allTopics.filter(t => t.state === "unknown");
  const attention = allTopics.filter(t => t.state === "attention");
  const highImpact = a.operationalImpact === "major" || a.operationalImpact === "halt";
  const aText = (key: string) => `“${answer(key, a, executive)}”`;
  const add = (r: CrossReading) => readings.push(r);

  if (!executive && ["edr", "managed_edr"].includes(text(a.endpointLevel)) && ["alerts_only", "none"].includes(text(a.endpointResponse))) {
    const overloaded = ["generalist_overloaded", "reactive"].includes(text(a.securityOperationsModel));
    add({ title: "Proteção avançada declarada e capacidade de operação a aprofundar", facts: `${scorePhrase} Proteção dos computadores: ${aText("endpointLevel")}. Tratamento de alertas: ${aText("endpointResponse")}.${overloaded ? ` Rotina da TI: ${aText("securityOperationsModel")}.` : ""}`, hypothesis: "A combinação sugere que a capacidade de acompanhar e usar a proteção pode ser o ponto de atenção. Não demonstra falha do produto nem ausência de recursos na licença.", strategy: "Comece pela rotina de quem recebe os alertas e pelos casos que ficam pendentes. Entenda a capacidade de investigação e contenção antes de discutir troca da ferramenta.", question: "Pode mostrar como foi tratado o último alerta importante, quem atuou e o que acontece quando essa pessoa não está disponível?", contribution: "Se a limitação operacional for confirmada, avaliar gestão e resposta sobre a solução atual ou uma evolução justificada pelo escopo.", priority: 110 + (overloaded ? 5 : 0) });
  }
  if (!executive && ["ngfw", "managed_ngfw"].includes(text(a.firewallLevel)) && ["none", "reactive_it"].includes(text(a.monitoring))) {
    add({ title: "Firewall corporativo informado com acompanhamento limitado", facts: `${scorePhrase} Proteção da internet: ${aText("firewallLevel")}. Acompanhamento dos eventos: ${aText("monitoring")}.`, hypothesis: "O ambiente pode ter recursos que não estão sendo acompanhados com regularidade. As respostas não permitem concluir que o equipamento precise ser substituído.", strategy: "Investigue primeiro serviços ativos, registros disponíveis e responsabilidades pela operação. Identifique o que o equipamento atual já entrega e o que a equipe consegue acompanhar.", question: "Quais eventos do firewall são analisados hoje e como um alerta relevante chega a alguém que possa agir?", contribution: "Avaliar gestão, visibilidade e resposta na borda antes de considerar substituição.", priority: 104 });
  }
  const backupExists = executive ? ["tested", "exists", "partial"].includes(text(a.backup)) : !missing(a.backupLevel) && a.backupLevel !== "none";
  const noRestoreProof = executive ? ["exists", "partial", "unknown"].includes(text(a.backup)) : ["never", "unknown"].includes(text(a.restoreTests)) || !has(a.restoreTests);
  if (backupExists && noRestoreProof) {
    add({ title: "Cópias declaradas e recuperação ainda a validar", facts: `${scorePhrase} Backup: ${aText(executive ? "backup" : "backupLevel")}.${!executive ? ` Teste de recuperação: ${aText("restoreTests")}.` : ""}${highImpact ? ` Impacto de uma parada: ${aText("operationalImpact")}.` : ""}`, hypothesis: "A existência de cópias não esclarece se os dados e serviços necessários podem ser recuperados no tempo esperado. Informação desconhecida sobre o teste precisa ser confirmada com o responsável.", strategy: "Conduza a conversa a partir de um sistema ou conjunto de dados importante. Peça o último exemplo de recuperação e confronte o tempo observado com a necessidade operacional.", question: "O que vocês precisariam recuperar primeiro e quando conseguiram testar essa recuperação pela última vez?", contribution: "Avaliar cobertura, testes e desenho de recuperação; a necessidade pode estar no processo ou no escopo das cópias.", priority: highImpact ? 113 : 100 });
  }
  if (!executive && backupExists && ["same_environment", "none"].includes(text(a.backupIsolation)) && (highImpact || a.sensitiveData === "yes")) {
    add({ title: "Dependência dos dados e separação das cópias", facts: `${scorePhrase} Backup: ${aText("backupLevel")}. Separação: ${aText("backupIsolation")}. Impacto operacional: ${aText("operationalImpact")}.${a.sensitiveData === "yes" ? ` Tratamento de dados pessoais ou sensíveis: ${aText("sensitiveData")}.` : ""}`, hypothesis: "Há motivo para validar se o mesmo incidente poderia atingir os dados principais e as cópias. A resposta não confirma, sozinha, a arquitetura ou o alcance de um possível comprometimento.", strategy: "Peça que o responsável explique onde ficam as cópias e quais credenciais podem alterá-las. Relacione esse desenho aos dados e serviços que o cliente considera essenciais.", question: "Se a conta administrativa ou o ambiente principal fosse comprometido, qual cópia continuaria disponível para recuperação?", contribution: "Avaliar isolamento, imutabilidade e responsabilidades de acesso conforme o desenho confirmado.", priority: 109 });
  }
  if (!executive && backupExists && ["regular", "once"].includes(text(a.restoreTests)) && a.maxDowntime === "4h" && highImpact) {
    add({ title: "Recuperação testada e tolerância curta de parada", facts: `${scorePhrase} Teste: ${aText("restoreTests")}. Tolerância: ${aText("maxDowntime")}. Impacto: ${aText("operationalImpact")}.`, hypothesis: "O teste declarado é um ponto favorável, mas não informa se todos os serviços necessários voltaram dentro das quatro horas toleradas.", strategy: "Reconheça o teste já realizado e aprofunde o resultado medido, as dependências e a ordem de retomada dos serviços.", question: "No último teste, quanto tempo levou para recuperar o serviço completo e quais dependências ficaram fora da simulação?", contribution: "Avaliar ajustes no plano de recuperação se o tempo medido não atender à necessidade do negócio.", priority: 99 });
  }
  if (!executive && a.mfa === "yes" && a.sharedAccounts === "yes") {
    add({ title: "MFA informado e uso de contas compartilhadas", facts: `${scorePhrase} Confirmação além da senha: ${aText("mfa")}. Compartilhamento de contas: ${aText("sharedAccounts")}.`, hypothesis: "As duas práticas podem coexistir. A autenticação adicional não resolve, por si só, a identificação individual das ações ou a retirada do acesso de uma pessoa.", strategy: "Entenda quais contas são compartilhadas, por qual motivo e como são controladas. Aprofunde as exceções antes de recomendar uma mudança geral.", question: "Quando alguém sai da equipe, como vocês retiram apenas o acesso dessa pessoa às contas compartilhadas e identificam suas ações anteriores?", contribution: "Avaliar individualização, privilégios e processo de revogação de acessos.", priority: 103 });
  }
  const monitored = executive ? a.protection === "monitored" : ["managed_soc", "defined_team"].includes(text(a.endpointResponse)) && visible("endpointResponse", a, false);
  const limitedHours = executive ? ["business_hours", "ad_hoc", "no"].includes(text(a.afterHours)) : ["business_hours", "ad_hoc"].includes(text(a.afterHoursResponse));
  if (monitored && limitedHours) {
    add({ title: "Acompanhamento informado com limites fora do expediente", facts: `${scorePhrase} Acompanhamento: ${aText(executive ? "protection" : "endpointResponse")}. Fora do expediente: ${aText(executive ? "afterHours" : "afterHoursResponse")}.`, hypothesis: "O acompanhamento declarado pode estar restrito a determinados horários ou depender de um acionamento eventual. Isso precisa ser distinguido de uma operação contínua.", strategy: "Reconstrua o caminho de um alerta que começa à noite: percepção, contato, decisão e ação. Verifique quem assume cada etapa e se há cobertura contratada.", question: "Se um alerta importante começar no sábado à noite, quem o percebe e quem consegue conter o problema antes do próximo expediente?", contribution: "Avaliar complemento de cobertura e resposta se houver uma necessidade operacional confirmada.", priority: highImpact ? 110 : 102 });
  }
  if (executive && ["outsourced", "shared"].includes(text(a.itOwner)) && a.afterHours === "yes") {
    add({ title: "TI terceirizada e acionamento fora do expediente", facts: `${scorePhrase} Responsável pela TI: ${aText("itOwner")}. Fora do expediente: ${aText("afterHours")}.`, hypothesis: "Existe um canal de apoio declarado, mas o questionário não confirma se o contrato inclui detecção, investigação e contenção de incidentes ou somente suporte técnico.", strategy: "Mapeie o escopo do parceiro atual e reconheça o que já está atendido. Busque entender eventual necessidade complementar, sem presumir insatisfação ou recomendar substituição.", question: "O parceiro atual acompanha alertas de segurança e pode executar contenção fora do expediente? Como esse atendimento está combinado?", contribution: "Avaliar complementaridade na operação de segurança apenas se aparecer uma lacuna de escopo ou cobertura.", priority: 72 });
  }
  if (scoreKnown && Number(score) >= 80 && leakConcern && good.length >= 2) {
    const selected = good.filter(t => focus.keys.includes(t.key)).slice(0, 3);
    const facts = (selected.length ? selected : good.slice(0, 2)).map(t => `${t.title}: “${t.evidence}”`).join(". ");
    add({ title: "Indicador alto e preocupação com vazamento de dados", facts: `${scorePhrase} Preocupação principal: ${concern}. ${facts}.`, hypothesis: "Respostas favoráveis e preocupação com vazamento podem coexistir. A nota não esclarece quais informações preocupam o cliente, por onde poderiam sair ou o que motivou essa preocupação.", strategy: "Comece pelo motivo da preocupação: episódio, exigência, fluxo de compartilhamento ou falta de visibilidade. Depois relacione os controles informados aos caminhos de exposição mencionados, sem tratar a nota alta como encerramento da conversa.", question: "O que fez o vazamento de dados se tornar uma preocupação hoje e em qual situação vocês têm mais dificuldade de acompanhar o uso das informações?", contribution: "Definir o próximo levantamento a partir do caminho de exposição confirmado; não deduzir necessidade de DLP, firewall ou EDR apenas pela preocupação.", priority: 96 });
  }
  if (scoreKnown && Number(score) >= 80 && (pending.length > 0 || (!executive && has(coverage) && Number.isFinite(Number(coverage)) && Number(coverage) < 80))) {
    const unknownFacts = pending.slice(0, 3).map(t => t.title.toLowerCase()).join(", ");
    add({ title: "Indicador favorável com informações ainda não confirmadas", facts: `${scorePhrase}${unknownFacts ? ` Há respostas desconhecidas em ${unknownFacts}.` : ""}${!executive && has(coverage) && Number.isFinite(Number(coverage)) ? ` A cobertura registrada no cálculo é ${text(coverage)}%.` : ""}`, hypothesis: "Uma nota favorável não elimina a incerteza dos campos desconhecidos. A nota é calculada pelos critérios do diagnóstico; campos desconhecidos continuam sem confirmação.", strategy: "Confirme primeiro os campos não conhecidos com quem opera o ambiente. Preserve a nota apresentada e explique os limites das informações que a sustentam.", question: "Quem consegue confirmar esses pontos e trazer um exemplo ou registro de como os controles funcionam hoje?", contribution: "Completar a descoberta antes de sugerir uma intervenção ou definir escopo.", priority: 108 });
  }
  if (concernKnown && !readings.some(r => r.title === "Indicador alto e preocupação com vazamento de dados")) {
    const matching = allTopics.filter(t => focus.keys.includes(t.key) && t.state !== "na");
    if (matching.length) {
      const selected = [...matching].sort((x, y) => (x.state === "attention" ? 0 : x.state === "unknown" ? 1 : 2) - (y.state === "attention" ? 0 : y.state === "unknown" ? 1 : 2)).slice(0, 2);
      add({ title: "Preocupação principal e controles relacionados", facts: `${scorePhrase} Preocupação: ${concern}. ${selected.map(t => `${t.title}: “${t.evidence}”`).join(". ")}.`, hypothesis: "Essas respostas ajudam a escolher o aprofundamento da reunião, mas não confirmam a causa da preocupação nem demonstram que o controle atende a todos os cenários do cliente.", strategy: focus.intro, question: `O que motivou essa preocupação agora? ${selected[0]!.question}`, contribution: "Validar o cenário e a atuação dos controles relacionados antes de associar uma oferta à preocupação.", priority: 80 });
    }
  }
  if (readings.length === 0) {
    const selected = [...attention, ...pending, ...good].slice(0, 2);
    add({ title: attention.length ? "Controles e capacidade de execução a aprofundar" : pending.length ? "Completar o contexto antes de recomendar mudanças" : "Validar a abrangência dos controles informados", facts: `${scorePhrase} ${selected.map(t => `${t.title}: “${t.evidence}”`).join(". ")}${selected.length ? "." : " Não há informações suficientes para uma leitura cruzada específica."}`, hypothesis: attention.length ? "As respostas indicam temas para investigação, sem comprovar uma falha técnica ou definir qual solução seria necessária." : pending.length ? "O contexto ainda possui informações não confirmadas. Não é possível concluir ausência de controles com base nesses campos." : "Os controles declarados são pontos favoráveis; ainda é preciso entender sua abrangência e verificar exemplos de execução.", strategy: focus.intro, question: selected.length ? selected[0]!.question : "Qual é a principal preocupação e quem pode detalhar os controles e a operação do ambiente?", contribution: "Definir um próximo passo proporcional ao que for confirmado, incluindo manter a estrutura atual quando ela atender à necessidade.", priority: 50 });
  }
  readings.sort((x, y) => y.priority - x.priority);
  const top = readings.slice(0, 3);
  const first = top[0]!;
  return {
    readings: top,
    opening: first.strategy,
    objective: attention.length ? "Sair da reunião com a limitação confirmada, seus responsáveis e o próximo levantamento necessário. Avaliar apoio da Concierge conforme o escopo que fizer sentido." : pending.length ? "Sair da reunião com os pontos desconhecidos esclarecidos e as evidências necessárias para decidir o próximo passo." : "Sair da reunião entendendo o motivo da preocupação, a abrangência dos controles e se existe alguma necessidade complementar. A conversa pode confirmar que os controles atuais atendem ao cenário.",
  };
}

function meetingBriefHtml(brief: MeetingBrief): string {
  const card = (r: CrossReading, i: number) => `<div style="margin:14px 0;padding:16px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;"><h3 style="margin:0 0 10px;font-size:16px;color:#0f172a;">${i + 1}. ${escape(r.title)}</h3>${paragraph(`O que sustenta a leitura: ${r.facts}`)}${paragraph(`Hipótese para validar: ${r.hypothesis}`)}${paragraph(`Estratégia sugerida: ${r.strategy}`)}${paragraph(`Pergunta de abertura: ${r.question}`)}${paragraph(`Possível contribuição da Concierge: ${r.contribution}`)}</div>`;
  return heading("Leitura cruzada para preparar a reunião") + paragraph("Esta análise relaciona a nota, as respostas e o contexto declarado. As hipóteses abaixo precisam ser confirmadas na conversa; não são conclusões de uma verificação técnica.") + brief.readings.map(card).join("") + heading("Como conduzir a reunião") + paragraph(`Abordagem inicial: ${brief.opening}`) + paragraph(`Objetivo: ${brief.objective}`);
}

export function buildInternalNotificationEmail(input: InternalEmailInput): { subject: string; html: string } {
  const { assessment: s, answers: a, calculated: c, manager, reportUrl, testRecipient, executive } = input;
  const snapshot = object(c.scoringSnapshot);
  const computed = (key: string): unknown => c[key] ?? snapshot[key];
  const company = text(a.companyName) || text(s.company_name) || "Empresa não informada";
  const contact = text(a.contactName) || text(s.respondent_name) || "Não informado";
  const concern = answer("mainConcern", a, executive);
  const score = s.overall_score ?? c.overallScore ?? snapshot.overall;
  const validScore = has(score) && Number.isFinite(Number(score));
  const focus = concernFocus(executive ? text(a.mainConcern) : concern);
  const allTopics = topics(a, executive);
  const meetingBrief = buildMeetingBrief(a, executive, score, s.coverage_percent ?? computed("completeness"), allTopics);
  const attention = allTopics.filter(t => t.state === "attention");
  const unknown = allTopics.filter(t => t.state === "unknown");
  const informed = allTopics.filter(t => t.state === "informed");
  const contextualDomain = text(computed("contextualPriority"));
  const ordered = allTopics.filter(t => t.state !== "na").sort((x, y) => {
    const rank = (t: Topic) => (t.state === "attention" ? 100 : t.state === "unknown" ? 50 : 0) + (focus.keys.includes(t.key) ? 15 : 0) + (!executive && t.domain === contextualDomain ? 5 : 0) + t.weight;
    return rank(y) - rank(x);
  });
  const next = ordered.slice(0, 3);
  const scale = executive ? positive(a.computerCount) : positive(a.endpointCount || a.devices);
  const context = executive
    ? `${company}: ${scale === "Não informado" ? "quantidade de computadores não informada" : `${scale} computadores/notebooks informados`}${Number(a.internetSpeedMbps) > 0 ? ` e internet principal de ${text(a.internetSpeedMbps)} Mbps` : ""}. Responsabilidade pela TI: ${answer("itOwner", a, true)}.`
    : `${company}: ${scale === "Não informado" ? "quantidade de computadores não informada" : `${scale} computadores/notebooks informados`}, ${Number(a.sites) > 0 ? `${text(a.sites)} unidade(s)` : "quantidade de unidades não informada"}. Capacidade operacional: ${answer("securityOperationsModel", a, false)}.`;
  const reading = attention.length
    ? `Há respostas que merecem aprofundamento em ${attention.map(t => t.title.toLowerCase()).slice(0, 4).join(", ")}${attention.length > 4 ? " e outros temas registrados abaixo" : ""}. Isso orienta a conversa; não confirma uma vulnerabilidade técnica.`
    : unknown.length ? "As respostas disponíveis não indicam pontos de atenção nos temas classificados, mas há informações não confirmadas. Primeiro valide essas informações com o responsável." : "As respostas indicam controles estabelecidos nos temas avaliados. A próxima conversa deve validar o alcance e as evidências desses controles antes de recomendar mudanças.";
  const stateLabel = (t: Topic) => t.state === "attention" ? "Ponto para aprofundar" : t.state === "unknown" ? "Informação a confirmar" : "Controle informado";
  const topicCard = (t: Topic, index: number) => `<div style="margin:12px 0;padding:16px;border:1px solid #e2e8f0;border-left:4px solid ${t.state === "attention" ? "#d97706" : "#0f766e"};border-radius:8px;"><h3 style="margin:0 0 8px;font-size:15px;color:#0f172a;">${index + 1}. ${escape(t.title)}</h3>${paragraph(`${stateLabel(t)}. Resposta registrada: ${t.evidence}`)}${paragraph(`${t.state === "unknown" ? "Não foi possível confirmar esse controle. " : ""}${t.reason}`)}${paragraph(`Pergunta sugerida: ${t.question}`)}${paragraph(`Possível apoio, após validação: ${t.support}`)}</div>`;
  const rawFindings = list(computed("findings"));
  const critical = executive ? [] : list(computed("criticalRules"));
  const dependencies = executive ? [] : list(computed("dependencies"));
  const indicators: Array<[string, unknown]> = executive ? [
    ["Proteção do ambiente", s.endpoint_score ?? c.endpointScore], ["Dados e continuidade", s.continuity_score ?? c.continuityScore],
    ["Contas e acessos", s.identity_score ?? c.identityScore], ["Resposta e governança", s.network_score ?? c.networkScore],
  ] : [
    ["Internet e rede", s.network_score ?? c.networkScore], ["Computadores e dispositivos", s.endpoint_score ?? c.endpointScore],
    ["Dados e recuperação", s.continuity_score ?? c.continuityScore], ["Contas e acessos", s.identity_score ?? c.identityScore],
  ];
  const statusRows = allTopics.map(t => row(t.title, t.state === "na" ? "Uso de IA não informado como aplicável; validar se esse contexto mudar." : `${stateLabel(t)}: ${t.evidence}`)).join("");
  const depth = text(computed("technicalDepth"));
  const depthLabels: Record<string,string> = { basic: "Inicial", informed: "Intermediário", technical: "Detalhado" };
  const readiness = object(computed("commercialReadiness"));
  const extra = executive
    ? paragraph("Este formulário não identifica a solução ou licença de proteção, o firewall, a topologia de rede, a capacidade do backup nem o tempo real de recuperação. Confirme esses itens antes de dimensionar ou preparar proposta. A velocidade do link ou a quantidade de computadores, isoladamente, não definem o equipamento adequado.")
    : table(([ ["firewall", "Internet e rede"], ["endpoint", "Computadores"], ["backup", "Backup"] ] as const).map(([key, label]) => {
      const r = object(readiness[key]);
      const pend = Array.isArray(r.missing) ? r.missing.filter(x => typeof x === "string") as string[] : [];
      return row(label, pend.length ? `Falta confirmar: ${pend.join("; ")}.` : "Validar dados de escopo, solução/licença atual e evidências com a equipe técnica. Ausência de pendências no cálculo não equivale a dimensionamento aprovado.");
    }).join("")) + paragraph(`Profundidade das informações para preparação da conversa: ${depthLabels[depth] || "A confirmar"}. Computadores não são uma contagem independente de usuários. Links são velocidades informadas; segmentação e volume de backup são exibidos nas opções/faixas do formulário.`);
  const impact = answer("operationalImpact", a, executive);
  const impactParagraph = paragraph(`Impacto de uma interrupção, conforme informado: ${impact}. ${impact === "Não sei informar" || impact === "Não informado" ? "Confirme quais serviços seriam afetados e por quanto tempo a operação conseguiria continuar." : "Valide quais serviços sustentam essa resposta e se o tempo de recuperação é compatível com a operação."}`);
  const financial = Array.isArray(computed("impactRange")) ? computed("impactRange") as unknown[] : [];
  const money = (v: unknown) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const financialHtml = !executive && financial.length === 2 && financial.every(x => typeof x === "number" && Number.isFinite(x))
    ? paragraph(`Cenário financeiro ilustrativo já calculado no diagnóstico: ${money(financial[0])} a ${money(financial[1])}. Não representa prejuízo medido, multa nem previsão de perda. Consulte as premissas no relatório antes de usar o valor na conversa.`) : "";
  const link = reportUrl ? `<div style="margin:20px 0;padding:18px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;"><strong style="font-size:14px;color:#0f172a;">Relatório apresentado ao cliente</strong>${paragraph("Abra a devolutiva do cliente e use o botão de download do próprio relatório para baixar o PDF.")}<a href="${escape(reportUrl)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">${executive ? "Abrir relatório executivo" : "Abrir relatório do cliente"}</a>${paragraph("Link interno com validade limitada. Preserve o acesso aos dados do respondente.")}</div>` : "";
  const facts = table(row("Respondente", contact) + row("E-mail de contato", text(a.contactEmail) || s.respondent_email) + (!executive ? row("Cargo", a.contactRole) : "") + row("Preocupação principal", concern));
  const findingsHtml = rawFindings.length ? heading("Achados já registrados pelo diagnóstico") + rawFindings.slice(0, 5).map(f => paragraph(`${text(f.title)}${text(f.situation) ? `: ${text(f.situation)}` : ""}${text(f.consequence) && f.consequence !== f.situation ? ` Consequência possível: ${text(f.consequence)}` : ""}`)).join("") : "";
  const criticalHtml = critical.length ? heading("Regras de atenção acionadas") + critical.map(r => paragraph(`${text(r.title)}: ${text(r.reason)}`)).join("") : "";
  const dependenciesHtml = dependencies.length ? heading("Antes de discutir uma solução") + dependencies.map(d => paragraph(`${text(d.status)}: ${text(d.message)}`)).join("") : "";
  const testNotice = testRecipient ? `<div style="margin:22px 0;padding:14px;background:#fff7ed;border:1px solid #fed7aa;">${paragraph(`Modo de teste: o destinatário previsto é ${manager.name} (${manager.email}). Este envio foi redirecionado para ${testRecipient}.`)}</div>` : "";
  const sourceLabels: Record<string,string> = { executive: "Diagnóstico executivo", linkedin: "LinkedIn", whatsapp: "WhatsApp", email: "E-mail" };
  const source = text(s.source_ref);
  const methodology = text(s.methodology_version) || text(c.methodologyVersion);
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="760" cellpadding="0" cellspacing="0" style="width:100%;max-width:760px;"><tr><td style="padding:26px;background:#0f172a;color:#ffffff;"><p style="margin:0 0 9px;color:#5eead4;font-size:13px;font-weight:bold;">Concierge Segurança Digital</p><h1 style="margin:0;font-size:25px;line-height:1.3;">Novo diagnóstico ${executive ? "executivo" : "completo"}</h1><p style="margin:10px 0 0;font-size:14px;color:#e2e8f0;">Briefing interno para preparar a conversa com o cliente</p></td></tr><tr><td style="padding:26px;background:#ffffff;border:1px solid #e2e8f0;"><h2 style="margin:0 0 12px;font-size:22px;overflow-wrap:anywhere;word-break:break-word;">${escape(company)}</h2>${facts}${heading("Leitura do cenário")}${paragraph(context)}${paragraph(reading)}${paragraph(`Preocupação principal: ${concern}.`)}${paragraph(focus.intro)}${impactParagraph}${link}${heading("Indicadores do diagnóstico")}${table(row("Indicador geral", validScore ? `${text(score)}/100` : "Não avaliado") + indicators.map(([label, value]) => row(label, has(value) && Number.isFinite(Number(value)) ? `${text(value)}/100` : "Não avaliado")).join(""))}${paragraph("Os indicadores refletem respostas declaradas. Não representam percentual de proteção, validação técnica nem comprovação de conformidade.")}${!executive ? paragraph(`Prioridade contextual calculada: ${domains[contextualDomain] || "A confirmar"}. Cobertura das informações no cálculo: ${has(s.coverage_percent) ? `${text(s.coverage_percent)}%` : "não informada"}.`) : ""}${meetingBriefHtml(meetingBrief)}${heading(attention.length ? "O que aprofundar primeiro" : unknown.length ? "O que confirmar primeiro" : "Validações para a próxima conversa")}${!attention.length && !unknown.length ? paragraph("Não foram identificados pontos de atenção pelas respostas disponíveis. Isso não dispensa validar a abrangência e as evidências dos controles informados.") : ""}${next.map(topicCard).join("")}${criticalHtml}${findingsHtml}${dependenciesHtml}${heading("Controles informados e pontos a confirmar")}${table(statusRows)}${heading("Dados para avançar com a equipe técnica")}${extra}${financialHtml}${heading("Registro das respostas por etapa")}${paragraph("Os textos livres abaixo reproduzem o conteúdo gravado. As opções aparecem com o texto do formulário desta versão. Respostas desconhecidas não comprovam ausência de controle. O registro não permite distinguir todos os valores padrão de escolhas explícitas, nem recuperar alterações anteriores à conclusão.")}${recordHtml(a, executive)}${testNotice}${heading("Identificação interna")}${table(row("Executivo de contas", manager.name) + row("Origem", sourceLabels[source] || source || "Não informada") + row("Identificador do diagnóstico", s.id) + row("Metodologia", methodology || "Não informada"))}${paragraph("Uso interno da Concierge. As interpretações e perguntas deste e-mail orientam a validação do cenário. Qualquer recomendação, dimensionamento ou proposta depende da confirmação com o cliente e a equipe técnica.")}</td></tr></table></td></tr></table></body></html>`;
  return { subject: `${executive ? "Novo Diagnóstico Executivo" : "Novo Diagnóstico Completo"} | ${company.replace(/[\r\n]+/g, " ")}`, html };
}
