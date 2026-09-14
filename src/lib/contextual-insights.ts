import type { AssessmentData } from '../types';

import type {
  DomainKey,
  Finding,
  Severity,
} from '../scoring';

export interface ContextualInsight {
  id: string;
  domain: DomainKey;
  eyebrow: string;
  title: string;
  body: string;
  sourceId: string;
  priority: number;
}

export interface ExecutiveFindingPresentation {
  title: string;
  informed: string;
  indication: string;
  practical: string;
}

const clean = (
  value: string | undefined,
) => value?.trim() || '';

const firewallName = (
  data: AssessmentData,
) =>
  [
    clean(data.firewallVendor),
    clean(data.firewallModel),
  ]
    .filter(Boolean)
    .join(' ');

const endpointName = (
  data: AssessmentData,
) =>
  [
    clean(data.endpointVendor),
    clean(data.endpointProduct),
  ]
    .filter(Boolean)
    .join(' ');

const backupName = (
  data: AssessmentData,
) =>
  [
    clean(data.backupVendor),
    clean(data.backupProduct),
  ]
    .filter(Boolean)
    .join(' ');

export const plainDomainLabel = (
  domain: string,
) => {
  if (domain === 'Rede e Perímetro') {
    return 'Internet e rede';
  }

  if (domain === 'Endpoints') {
    return 'Computadores';
  }

  if (
    domain === 'Backup e Continuidade'
  ) {
    return 'Dados e backup';
  }

  if (
    domain === 'Identidade e Acesso'
  ) {
    return 'Contas e acessos';
  }

  return domain;
};

const domainInternalLabel: Record<
  DomainKey,
  string
> = {
  network: 'Rede e Perímetro',
  endpoint: 'Endpoints',
  backup: 'Backup e Continuidade',
  identity: 'Identidade e Acesso',
};

const domainPublicLabel: Record<
  DomainKey,
  string
> = {
  network: 'Internet e rede',
  endpoint: 'Computadores',
  backup: 'Dados e backup',
  identity: 'Contas e acessos',
};

const domainNarrative: Record<
  DomainKey,
  {
    indication: string;
    next: string;
  }
> = {
  network: {
    indication:
      'Pelas respostas, esta foi a área com o menor indicador entre as que conseguimos avaliar.',
    next:
      'Vale confirmar como a internet é protegida, quais eventos são acompanhados e quem percebe quando algo suspeito acontece.',
  },

  endpoint: {
    indication:
      'Pelas respostas, esta foi a área com o menor indicador entre as que conseguimos avaliar.',
    next:
      'Vale confirmar como os computadores são protegidos, se existe visão central dos alertas e quem reage quando algo é detectado.',
  },

  backup: {
    indication:
      'Pelas respostas, esta foi a área com o menor indicador entre as que conseguimos avaliar.',
    next:
      'Vale confirmar se as cópias estão separadas do ambiente principal e se a recuperação já foi testada na prática.',
  },

  identity: {
    indication:
      'Pelas respostas, esta foi a área com o menor indicador entre as que conseguimos avaliar.',
    next:
      'Vale revisar como as contas importantes são protegidas e o que acontece quando uma senha ou acesso é comprometido.',
  },
};

export const operationalImpactLabel = (
  value:
    | AssessmentData['operationalImpact']
    | undefined,
) => {
  switch (value) {
    case 'low':
      return 'A operação conseguiria continuar quase normalmente';

    case 'partial':
      return 'Parte da empresa ficaria parada';

    case 'major':
      return 'A maior parte da empresa ficaria parada';

    case 'halt':
      return 'A operação praticamente pararia';

    default:
      return 'Impacto da parada não confirmado';
  }
};

/**
 * Traduz um finding técnico para linguagem executiva.
 *
 * O fabricante ou produto só entra no texto quando ajuda a contextualizar.
 * Ele nunca é usado sozinho para afirmar que o ambiente é bom ou ruim.
 */
export const presentFinding = (
  finding: Finding,
  data: AssessmentData,
): ExecutiveFindingPresentation => {
  const title =
    finding.title.toLowerCase();

  const fw = firewallName(data);
  const endpoint = endpointName(data);
  const backup = backupName(data);

  if (
    title.includes(
      'depende de um terceiro',
    ) ||
    title.includes(
      'pouca visibilidade',
    ) ||
    title.includes(
      'gestão da rede é terceirizada',
    ) ||
    title.includes(
      'visibilidade recebida',
    )
  ) {
    return {
      title:
        'A gestão existe, mas a visibilidade recebida pela empresa é limitada',

      informed:
        fw
          ? `Você informou que ${fw} é administrado por terceiros e que o acompanhamento recebido é limitado.`
          : 'Você informou que o firewall é administrado por terceiros e que o acompanhamento recebido é limitado.',

      indication:
        'A administração por terceiros pode funcionar bem. O ponto a confirmar é se a empresa recebe visibilidade recorrente sobre eventos relevantes, bloqueios e comportamentos suspeitos.',

      practical:
        'Sem relatórios e acompanhamento claros, eventos relevantes podem ocorrer ou ser bloqueados sem chegar à equipe como informação útil para decisão.',
    };
  }

  if (
    title.includes(
      'mais conectividade do que segurança',
    )
  ) {
    return {
      title:
        'O equipamento atual pode estar cuidando bem da rede, mas com menos recursos para analisar ameaças',

      informed:
        fw
          ? `Você informou que a empresa utiliza ${fw} na conexão com a internet.`
          : finding.situation,

      indication:
        'Esse tipo de equipamento pode atender muito bem funções como roteamento, regras, VPN e separação de redes. Pelas demais respostas, ainda não conseguimos confirmar recursos mais completos para analisar e bloquear ameaças.',

      practical:
        'Sem monitoramento contínuo e uma rotina estruturada de análise, alguns sinais podem ser percebidos apenas depois que já afetaram computadores ou sistemas.',
    };
  }

  if (
    title.includes(
      'demorar mais para ser percebido',
    )
  ) {
    return {
      title:
        'Um ataque pode demorar para ser percebido',

      informed:
        data.monitoring ===
        'reactive_it'
          ? 'Você informou que os eventos são verificados principalmente quando a equipe percebe algum problema ou sintoma.'
          : finding.situation,

      indication:
        'Isso aumenta o intervalo entre o início de uma atividade suspeita e o momento em que ela é analisada.',

      practical:
        'Alguns ataques não começam derrubando sistemas. Eles podem permanecer silenciosos enquanto coletam senhas e acessos ou procuram dados importantes.',
    };
  }

  if (
    title.includes(
      'proteção nos computadores, mas a visibilidade parece limitada',
    )
  ) {
    return {
      title:
        'Existe proteção nos computadores, mas ainda falta visibilidade sobre o que acontece neles',

      informed:
        endpoint
          ? `Você informou utilizar ${endpoint}, mas não conseguimos confirmar uma visão central ampla dos computadores e alertas.`
          : finding.situation,

      indication:
        'A proteção instalada pode bloquear várias ameaças, mas a equipe pode ter menos contexto quando precisa entender o que aconteceu em uma máquina.',

      practical:
        'Em um incidente, pode ser mais difícil descobrir rapidamente quais equipamentos foram afetados e o que precisa ser feito primeiro.',
    };
  }

  if (
    title.includes(
      'alertas podem não virar ação rapidamente',
    )
  ) {
    return {
      title:
        'Existe proteção, mas os alertas ainda precisam de um fluxo de resposta definido',

      informed:
        endpoint
          ? `Você informou utilizar ${endpoint}, mas os alertas são vistos apenas quando necessário ou sem um processo claramente definido.`
          : finding.situation,

      indication:
        'A ferramenta consegue gerar alertas, mas ainda é necessário um processo definido para analisar o alerta, investigar e agir.',

      practical:
        'Um comportamento suspeito pode permanecer aberto por mais tempo até virar investigação, bloqueio do problema ou correção.',
    };
  }

  if (
    title.includes(
      'tecnologia para detectar',
    )
  ) {
    return {
      title:
        'A tecnologia pode detectar o problema, mas a resposta precisa estar estruturada',

      informed:
        endpoint
          ? `Você informou utilizar ${endpoint} e que os alertas não possuem acompanhamento contínuo ou uma resposta claramente definida.`
          : finding.situation,

      indication:
        'Uma tecnologia de detecção consegue gerar sinais importantes, mas eles precisam virar investigação e decisão rapidamente.',

      practical:
        'Um alerta pode existir no painel sem necessariamente virar investigação, isolamento do equipamento ou remoção da ameaça no tempo necessário.',
    };
  }

  if (
    title.includes(
      'mesmo incidente pode alcançar',
    )
  ) {
    return {
      title:
        'Um ransomware pode atingir os arquivos e também a cópia usada para recuperá-los',

      informed:
        backup
          ? `Você informou utilizar ${backup}, mas não foi confirmada uma separação forte entre o ambiente principal e as cópias.`
          : finding.situation,

      indication:
        'Ter backup é importante, mas a proteção da cópia também importa. Quando produção e backup compartilham o mesmo ambiente, conta ou acessos, um único incidente pode alcançar os dois.',

      practical:
        'A empresa pode descobrir durante o incidente que justamente a cópia usada para recuperar os dados também foi apagada, criptografada ou comprometida.',
    };
  }

  if (
    title.includes(
      'não prova que a empresa consegue recuperar',
    )
  ) {
    return {
      title:
        'Ter backup não significa automaticamente conseguir recuperar',

      informed:
        'Você informou que existem cópias, mas que uma restauração real ainda não foi testada.',

      indication:
        'O teste confirma se os arquivos estão íntegros, se os acessos funcionam e quanto tempo a recuperação realmente leva.',

      practical:
        'Sem esse teste, uma limitação pode aparecer somente quando a empresa já estiver parada e precisar dos dados.',
    };
  }

  if (
    title.includes(
      'senha roubada',
    )
  ) {
    return {
      title:
        'Uma senha vazada pode ser suficiente para acessar uma conta',

      informed:
        'Você informou que algumas contas importantes ainda utilizam apenas senha como fator de autenticação.',

      indication:
        'Quando existe uma segunda confirmação, descobrir a senha deixa de ser suficiente para concluir o acesso.',

      practical:
        'Sem essa segunda proteção, uma senha reutilizada, descoberta ou capturada em phishing pode abrir caminho para e-mail, sistemas ou outros serviços da empresa.',
    };
  }

  if (
    title.includes(
      'falhas conhecidas',
    )
  ) {
    return {
      title:
        'Uma falha conhecida pode continuar aberta mesmo depois de existir correção',

      informed:
        finding.situation,

      indication:
        'Sem uma rotina previsível para identificar versões antigas e atualizações pendentes, o intervalo entre a divulgação de uma falha e a correção pode aumentar.',

      practical:
        'Isso cria uma janela maior em que um equipamento pode continuar exposto a uma vulnerabilidade já conhecida publicamente.',
    };
  }

  if (
    title.includes(
      'fora do radar',
    )
  ) {
    return {
      title:
        'Pode existir equipamento conectado que ninguém percebeu que ficou sem proteção',

      informed:
        finding.situation,

      indication:
        'Sem uma lista atualizada dos equipamentos, fica mais difícil confirmar que todos recebem as mesmas atualizações e proteções.',

      practical:
        'Um notebook antigo, máquina temporária ou equipamento esquecido pode continuar conectado sem seguir o padrão do restante da empresa.',
    };
  }

  if (
    title.includes(
      'percepção do usuário',
    )
  ) {
    return {
      title:
        'Uma mensagem bem feita pode colocar toda a decisão nas mãos do usuário',

      informed:
        finding.situation,

      indication:
        'Filtros básicos conseguem barrar muitos spams, mas golpes mais bem construídos podem exigir análise adicional de links, anexos e identidade do remetente.',

      practical:
        'Se uma mensagem falsa chegar à caixa de entrada, a última barreira pode acabar sendo apenas a pessoa perceber sozinha que aquilo é um golpe.',
    };
  }

  if (
    title.includes(
      'decidir tudo na hora',
    )
  ) {
    return {
      title:
        'Durante um ataque não é o melhor momento para descobrir quem deve tomar as decisões',

      informed:
        finding.situation,

      indication:
        'Quando responsáveis, contatos e próximos passos já estão definidos, a empresa reduz decisões improvisadas justamente no momento de maior pressão.',

      practical:
        'Os primeiros minutos podem ser gastos tentando descobrir quem chamar, quem pode desligar sistemas ou quem deve comunicar o problema.',
    };
  }

  return {
    title: finding.title,
    informed:
      finding.situation,
    indication:
      finding.consequence,
    practical:
      'Esse ponto merece validação para confirmar como o controle funciona hoje e quais riscos permanecem no cenário informado.',
  };
};

export function getContextualInsights(
  data: AssessmentData,
  findings: Finding[],
): ContextualInsight[] {
  const insights: ContextualInsight[] =
    [];

  const titles = findings
    .map((finding) =>
      finding.title.toLowerCase(),
    )
    .join(' ');

  if (data.sensitiveData === 'yes') {
    insights.push({
      id: 'anpd-small-company',
      domain: 'identity',
      eyebrow: 'LGPD na prática',
      title:
        'Pequeno porte não elimina a responsabilidade sobre dados pessoais',
      body:
        'A ANPD possui regras específicas para agentes de pequeno porte, mas essas flexibilizações não afastam as demais obrigações da LGPD. Saber onde os dados estão, quem acessa e como são protegidos continua sendo relevante mesmo em empresas menores.',
      sourceId: 'anpd-small-business',
      priority: 108,
    });
  }

  if (
    data.aiUsageGovernance === 'open' ||
    data.aiUsageGovernance === 'partial'
  ) {
    insights.push({
      id: 'ai-data-governance',
      domain: 'identity',
      eyebrow: 'IA e proteção de dados',
      title:
        data.aiUsageGovernance === 'open'
          ? 'Uso de IA sem uma regra definida pode expor informações que não deveriam sair da empresa'
          : 'Orientações sobre IA ajudam, mas regras diferentes entre áreas ainda deixam espaço para risco',
      body:
        'Ferramentas como ChatGPT, Copilot e Gemini podem receber textos, documentos e outros dados enviados pelos usuários. Em julho de 2026, a ANPD publicou um estudo sobre IA generativa destacando possíveis ameaças à privacidade e à proteção de dados. Uma regra simples sobre ferramentas permitidas e quais informações podem ser enviadas já reduz bastante esse ponto cego.',
      sourceId: 'anpd-genai-radar-2026',
      priority: 112,
    });
  } else if (data.aiUsageGovernance === 'controlled') {
    insights.push({
      id: 'ai-data-governance-positive',
      domain: 'identity',
      eyebrow: 'IA e proteção de dados',
      title: 'A empresa já informou ter regras para o uso de Inteligência Artificial',
      body:
        'Definir ferramentas permitidas e limites para o envio de dados é um bom ponto de partida. O próximo passo é manter essas orientações claras, atualizadas e conhecidas por quem utiliza IA no trabalho.',
      sourceId: 'nist-ai-rmf-genai',
      priority: 72,
    });
  }

  if (
    data.firewallMonitoring24x7 === 'no' ||
    data.firewallMonitoring24x7 === 'partial'
  ) {
    insights.push({
      id: 'after-hours-response',
      domain: 'identity',
      eyebrow: 'Fora do expediente',
      title:
        data.firewallMonitoring24x7 === 'no'
          ? 'Um alerta importante à noite pode esperar até o próximo expediente'
          : 'Existe alguém para acionar fora do horário, mas o alerta pode não ser percebido imediatamente',
      body:
        'Boas práticas de resposta a incidentes recomendam responsáveis e formas de acionamento definidos. Essa capacidade pode ser interna, terceirizada ou híbrida; o ponto importante é saber quem recebe o alerta e quem pode iniciar uma resposta quando o problema acontece.',
      sourceId: 'cis-incident-response',
      priority: 106,
    });
  }

  if (
    data.restoreTests === 'never' ||
    data.backupIsolation === 'none' ||
    data.backupIsolation ===
      'same_environment'
  ) {
    insights.push({
      id: 'backup-recovery',
      domain: 'backup',
      eyebrow: 'Um detalhe importante',
      title:
        'Backup e recuperação são coisas diferentes',
      body:
        'Uma cópia só cumpre seu papel quando consegue ser recuperada. Boas práticas de segurança tratam proteção das cópias e testes de restauração como partes essenciais da estratégia de recuperação.',
      sourceId: 'cis-data-recovery',
      priority: 95,
    });
  }

  if (
    data.mfa === 'no' ||
    data.mfa === 'partial'
  ) {
    insights.push({
      id: 'mfa-access',
      domain: 'identity',
      eyebrow: 'Um detalhe importante',
      title:
        'A senha pode deixar de ser a única barreira de acesso',
      body:
        'Uma segunda confirmação reduz o impacto de senhas descobertas, reutilizadas ou capturadas em golpes.',
      sourceId: 'cis-access-control',
      priority: 90,
    });
  }

  if (
    data.monitoring === 'none' ||
    data.monitoring ===
      'reactive_it' ||
    titles.includes(
      'pouca visibilidade',
    )
  ) {
    insights.push({
      id: 'monitoring-visibility',
      domain: 'network',
      eyebrow: 'Um detalhe importante',
      title:
        'Bloquear um evento e perceber um padrão são coisas diferentes',
      body:
        'Logs e monitoramento ajudam a transformar eventos isolados em informação útil. Sem revisão e acompanhamento, um bloqueio ou comportamento suspeito pode acontecer sem que a empresa perceba um padrão.',
      sourceId: 'cis-audit-logs',
      priority: 85,
    });
  }

  if (
    data.vulnerabilityManagement ===
      'none' ||
    data.vulnerabilityManagement ===
      'reactive'
  ) {
    insights.push({
      id: 'vulnerability-window',
      domain: 'endpoint',
      eyebrow: 'Um detalhe importante',
      title:
        'Uma atualização disponível não significa uma atualização aplicada',
      body:
        'Uma rotina de atualização e correção ajuda a localizar falhas conhecidas, priorizar o que merece atenção e acompanhar o que já foi corrigido. Sem uma rotina, uma falha conhecida pode permanecer aberta por mais tempo do que a empresa imagina.',
      sourceId:
        'cis-vulnerability-management',
      priority: 80,
    });
  }

  return insights
    .sort(
      (a, b) =>
        b.priority -
        a.priority,
    )
    .slice(0, 3);
}

/**
 * Narrativa pública principal.
 *
 * Regra:
 * - usa sempre o domínio público prioritário;
 * - só usa um finding se ele pertencer ao mesmo domínio;
 * - nunca mistura "Backup" com texto de "Rede", ou vice-versa.
 */
export function buildExecutiveNarrative(
  data: AssessmentData,
  priority:
    | DomainKey
    | null,
  priorityFinding:
    | Finding
    | undefined,
) {
  const company =
    data.companyName?.trim() ||
    'sua empresa';

  if (!priority) {
    return `Com base nas respostas fornecidas, organizamos os principais pontos que vale confirmar ou revisar em ${company}. O resultado é uma leitura inicial do ambiente e não substitui uma validação técnica.`;
  }

  const publicLabel =
    domainPublicLabel[priority];

  const base =
    domainNarrative[priority];

  const findingMatchesDomain =
    priorityFinding?.domain ===
    domainInternalLabel[priority];

  if (!findingMatchesDomain) {
    return `${publicLabel} foi a área que mais merece atenção neste diagnóstico. ${base.indication} ${base.next}`;
  }

  const presentation =
    presentFinding(
      priorityFinding,
      data,
    );

  return `${publicLabel} foi a área que mais merece atenção neste diagnóstico. ${presentation.indication} ${base.next}`;
}

export function buildImpactContext(
  data: AssessmentData,
) {
  switch (
    data.operationalImpact
  ) {
    case 'low':
      return 'Você informou que, mesmo com os sistemas principais indisponíveis, a empresa conseguiria continuar grande parte do trabalho.';

    case 'partial':
      return 'Você informou que uma indisponibilidade deixaria parte da empresa parada.';

    case 'major':
      return 'Você informou que uma indisponibilidade deixaria a maior parte da empresa parada.';

    case 'halt':
      return 'Você informou que uma indisponibilidade praticamente pararia a operação.';

    default:
      return 'Como o impacto operacional ainda não foi confirmado, a faixa abaixo utiliza uma referência intermediária para a simulação.';
  }
}

export function severityToClientLabel(
  severity: Severity,
) {
  if (severity === 'Alta') {
    return 'Vale revisar primeiro';
  }

  if (severity === 'Média') {
    return 'Vale revisar';
  }

  return 'Acompanhar';
}
