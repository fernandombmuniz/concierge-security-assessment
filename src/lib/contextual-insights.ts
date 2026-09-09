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
    )
  ) {
    return {
      title:
        'A proteção existe, mas sua empresa enxerga pouco do que acontece nela',

      informed:
        fw
          ? `Você informou que ${fw} é administrado por terceiros e que o acompanhamento recebido é limitado.`
          : 'Você informou que o firewall é administrado por terceiros e que o acompanhamento recebido é limitado.',

      indication:
        'Existe alguém cuidando do equipamento, mas isso não garante que sua empresa receba uma visão contínua sobre tentativas de ataque, bloqueios ou comportamentos suspeitos.',

      practical:
        'Um problema pode estar acontecendo ou sendo bloqueado sem virar uma informação útil para a empresa. Em outros casos, ele só chama atenção quando começa a afetar usuários ou sistemas.',
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
        'Esse tipo de equipamento pode atender muito bem funções como roteamento, regras, VPN e separação de redes. Pelas demais respostas, ainda não conseguimos confirmar uma camada mais ampla de análise e prevenção de ameaças.',

      practical:
        'Parte da segurança pode depender de outras ferramentas ou de alguém perceber sintomas depois que algo já chegou aos computadores ou sistemas.',
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
        'Isso reduz a visibilidade entre o momento em que algo suspeito começa e o momento em que alguém decide investigar.',

      practical:
        'Alguns ataques não começam derrubando sistemas. Eles podem permanecer silenciosos enquanto coletam credenciais, exploram acessos ou procuram dados importantes.',
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
        'Existe proteção, mas um alerta ainda pode ficar esperando alguém agir',

      informed:
        endpoint
          ? `Você informou utilizar ${endpoint}, mas os alertas são vistos apenas quando necessário ou sem um processo claramente definido.`
          : finding.situation,

      indication:
        'A ferramenta consegue gerar alertas, mas o valor deles depende de alguém analisar e decidir o que fazer.',

      practical:
        'Um comportamento suspeito pode permanecer aberto por mais tempo até virar investigação, contenção ou correção.',
    };
  }

  if (
    title.includes(
      'tecnologia para detectar',
    )
  ) {
    return {
      title:
        'A ferramenta pode detectar o problema, mas alguém ainda precisa agir',

      informed:
        endpoint
          ? `Você informou utilizar ${endpoint} e que os alertas não possuem acompanhamento contínuo ou uma resposta claramente definida.`
          : finding.situation,

      indication:
        'Uma tecnologia de detecção consegue gerar sinais importantes, mas eles precisam virar investigação e decisão rapidamente.',

      practical:
        'Um alerta pode existir no painel sem necessariamente virar contenção, investigação ou remoção da ameaça no tempo necessário.',
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
        'Ter backup é importante, mas a proteção da cópia também importa. Quando produção e backup compartilham o mesmo ambiente, conta ou credenciais, um único incidente pode alcançar os dois.',

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
        'O teste confirma se os arquivos estão íntegros, se as credenciais funcionam e quanto tempo a recuperação realmente leva.',

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
        'Uma senha vazada pode ser suficiente para alguém entrar em uma conta',

      informed:
        'Você informou que algumas contas importantes ainda dependem apenas da senha.',

      indication:
        'Quando existe uma segunda confirmação, descobrir a senha deixa de ser suficiente para concluir o acesso.',

      practical:
        'Sem essa camada adicional, uma senha reutilizada, descoberta ou capturada em phishing pode abrir caminho para e-mail, sistemas ou outros serviços da empresa.',
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
      'Esse ponto merece uma revisão para confirmar como funciona hoje e qual impacto pode ter caso algo saia do esperado.',
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
      eyebrow: 'Você sabia?',
      title:
        'Empresas pequenas também podem ser fiscalizadas pela ANPD',
      body:
        'Em 2023, uma microempresa brasileira recebeu duas multas simples de R$ 7.200, totalizando R$ 14.400, além de advertência. O caso não significa que sua empresa teria a mesma sanção, mas mostra que pequeno porte não elimina responsabilidades relacionadas à LGPD.',
      sourceId: 'anpd-first-fine',
      priority: 100,
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
        'A gestão de vulnerabilidades existe para localizar, priorizar e acompanhar correções. Sem uma rotina, uma falha conhecida pode permanecer aberta por mais tempo do que a empresa imagina.',
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
    .slice(0, 2);
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
