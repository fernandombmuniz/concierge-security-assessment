import {
  AssessmentData,
  BackupResponsibilityLevel,
  CapabilityLevel,
  FirewallManagementLevel,
  OperationalImpactLevel,
  SecurityReportingLevel,
  TechnicalDepth,
} from './types';

export type DomainKey = 'network' | 'endpoint' | 'backup' | 'identity';
export type DomainScore = number | null;
export type Severity = 'Alta' | 'Média' | 'Baixa';
export type Confidence = 'Alta' | 'Moderada' | 'Baixa';

export interface Finding {
  domain: string;
  title: string;
  situation: string;
  consequence: string;
  technical: string;
  severity: Severity;
}

export interface CriticalRule {
  id: string;
  domain: DomainKey;
  title: string;
  reason: string;
  severity: Severity;
}

export interface ReadinessArea {
  answered: number;
  total: number;
  percentage: number;
  missing: string[];
}

interface Control {
  known: boolean;
  score: number;
  weight: number;
  critical?: boolean;
  applicable?: boolean;
}

const clamp = (n: number) =>
  Math.max(0, Math.min(100, Math.round(n)));

const safeNumber = (
  value: number | undefined | null,
  fallback = 0,
) => (Number.isFinite(value) ? Number(value) : fallback);

const cleanLabel = (value: string | undefined) =>
  value?.trim() ? value.trim() : '';

export const maturityLevel = (s: DomainScore) =>
  s === null
    ? 'Não avaliado'
    : s >= 80
      ? 'Avançada'
      : s >= 65
        ? 'Adequada'
        : s >= 45
          ? 'Intermediária'
          : s >= 25
            ? 'Básica'
            : 'Muito baixa';

export const confidenceLevel = (
  coverage: number,
): Confidence =>
  coverage >= 80
    ? 'Alta'
    : coverage >= 60
      ? 'Moderada'
      : 'Baixa';

/**
 * V4
 *
 * Campos novos só entram no cálculo quando realmente existem.
 * Isso mantém compatibilidade com assessments antigos.
 *
 * "Não sei" continua reduzindo cobertura sem ser tratado
 * automaticamente como falha.
 */
function scoreControls(items: Control[]) {
  const applicable = items.filter(
    (item) => item.applicable !== false,
  );

  const total = applicable.reduce(
    (sum, item) => sum + item.weight,
    0,
  );

  if (!total) {
    return {
      score: null as DomainScore,
      coverage: 0,
      confidence: 'Baixa' as Confidence,
    };
  }

  const knownWeight = applicable
    .filter((item) => item.known)
    .reduce(
      (sum, item) => sum + item.weight,
      0,
    );

  if (!knownWeight) {
    return {
      score: null as DomainScore,
      coverage: 0,
      confidence: 'Baixa' as Confidence,
    };
  }

  const score = clamp(
    applicable.reduce(
      (sum, item) =>
        sum +
        (item.known ? item.score : 50) *
          item.weight,
      0,
    ) / total,
  );

  const coverage = clamp(
    (knownWeight / total) * 100,
  );

  return {
    score,
    coverage,
    confidence: confidenceLevel(coverage),
  };
}

const yn = (
  value: 'yes' | 'no' | 'unknown' | undefined,
  yes = 100,
  no = 20,
) => ({
  known:
    value !== undefined &&
    value !== 'unknown',
  score:
    value === 'yes'
      ? yes
      : value === 'no'
        ? no
        : 50,
});

const capability = (
  value: CapabilityLevel | undefined,
) => ({
  known:
    value !== undefined &&
    value !== 'unknown',

  score:
    value === 'yes'
      ? 100
      : value === 'partial'
        ? 60
        : value === 'no'
          ? 15
          : 50,
});

const knownOptional = <T extends string>(
  value: T | undefined,
  unknownValue = 'unknown',
) =>
  value !== undefined &&
  value !== unknownValue;

const reportingScore: Record<
  SecurityReportingLevel,
  number
> = {
  periodic: 95,
  on_demand: 70,
  incident_only: 40,
  none: 15,
  unknown: 50,
};

const firewallManagementScore: Record<
  FirewallManagementLevel,
  number
> = {
  internal: 80,
  outsourced: 80,
  isp: 45,
  shared: 85,
  unmanaged: 10,
  unknown: 50,
};

const backupResponsibilityScore: Record<
  BackupResponsibilityLevel,
  number
> = {
  internal: 80,
  outsourced: 85,
  shared: 90,
  nobody: 10,
  unknown: 50,
};

function deriveTechnicalDepth(
  a: AssessmentData,
): TechnicalDepth {
  let points = 0;

  if (cleanLabel(a.firewallVendor)) points += 1;
  if (cleanLabel(a.firewallModel)) points += 1;

  if (cleanLabel(a.endpointVendor)) points += 1;
  if (cleanLabel(a.endpointProduct)) points += 1;

  if (cleanLabel(a.backupVendor)) points += 1;
  if (cleanLabel(a.backupProduct)) points += 1;

  if (
    a.firewallThreatPrevention !== 'unknown'
  ) {
    points += 1;
  }

  if (a.endpointResponse !== 'unknown') {
    points += 1;
  }

  if (a.backupIsolation !== 'unknown') {
    points += 1;
  }

  if (
    a.vulnerabilityManagement !== 'unknown'
  ) {
    points += 1;
  }

  if (points >= 7) return 'technical';
  if (points >= 3) return 'informed';

  return 'basic';
}

function readiness(
  items: Array<[boolean, string]>,
): ReadinessArea {
  const total = items.length;

  const answered = items.filter(
    ([ok]) => ok,
  ).length;

  const missing = items
    .filter(([ok]) => !ok)
    .map(([, label]) => label);

  return {
    answered,
    total,
    percentage: total
      ? clamp((answered / total) * 100)
      : 0,
    missing,
  };
}

function impactShare(
  level: OperationalImpactLevel | undefined,
) {
  switch (level) {
    case 'low':
      return 0.25;

    case 'partial':
      return 0.5;

    case 'major':
      return 0.8;

    case 'halt':
      return 1;

    default:
      return 0.65;
  }
}

function impactMultiplier(
  level: OperationalImpactLevel | undefined,
) {
  switch (level) {
    case 'low':
      return 0.75;

    case 'partial':
      return 1;

    case 'major':
      return 1.35;

    case 'halt':
      return 1.7;

    default:
      return 1;
  }
}

export function scoreAssessment(
  a: AssessmentData,
) {
  /**
   * NETWORK
   *
   * Importante:
   * firewallVendor e firewallModel NÃO alteram score.
   *
   * Produto identifica contexto.
   * Capacidade e operação definem maturidade.
   */
  const firewallBase: Record<
    AssessmentData['firewallLevel'],
    number
  > = {
    none: 0,
    isp: 15,
    router: 50,
    utm: 68,
    ngfw: 82,
    managed_ngfw: 90,
    unknown: 50,
  };

  const monitoring: Record<
    AssessmentData['monitoring'],
    number
  > = {
    none: 10,
    reactive_it: 35,
    outsourced_it: 55,
    security_team: 78,
    soc: 95,
    unknown: 50,
  };

  const maintenance: Record<
    AssessmentData['networkMaintenance'],
    number
  > = {
    formal: 95,
    informal: 60,
    none: 20,
    unknown: 50,
  };

  const license = yn(
    a.firewallLicense,
    100,
    25,
  );

  const threat = capability(
    a.firewallThreatPrevention,
  );

  const networkControls: Control[] = [
    {
      known:
        a.firewallLevel !== 'unknown',

      score:
        firewallBase[a.firewallLevel],

      weight: 25,

      critical: true,
    },

    {
      known:
        a.firewallThreatPrevention !==
        'unknown',

      score: threat.score,

      weight: 25,

      critical: true,
    },

    {
      known:
        a.networkMaintenance !==
        'unknown',

      score:
        maintenance[
          a.networkMaintenance
        ],

      weight: 15,
    },

    {
      known:
        a.monitoring !== 'unknown',

      score:
        monitoring[a.monitoring],

      weight: 20,

      critical: true,
    },

    {
      known:
        a.firewallLicense !== 'unknown' &&
        !['none', 'isp'].includes(
          a.firewallLevel,
        ),

      score: license.score,

      weight: 15,
    },

    /**
     * V4 adaptive.
     * Só entra no score quando o formulário
     * efetivamente coletar esses campos.
     */
    {
      known: knownOptional(
        a.firewallManagement,
      ),

      score: a.firewallManagement
        ? firewallManagementScore[
            a.firewallManagement
          ]
        : 50,

      weight: 10,

      applicable:
        a.firewallManagement !==
        undefined,
    },

    {
      known: knownOptional(
        a.firewallReporting,
      ),

      score: a.firewallReporting
        ? reportingScore[
            a.firewallReporting
          ]
        : 50,

      weight: 10,

      applicable:
        a.firewallReporting !==
        undefined,
    },

    {
      known: knownOptional(
        a.firewallMonitoring24x7,
      ),

      score: capability(
        a.firewallMonitoring24x7,
      ).score,

      weight: 15,

      critical: true,

      applicable:
        a.firewallMonitoring24x7 !==
        undefined,
    },
  ];

  const networkResult =
    scoreControls(networkControls);

  /**
   * ENDPOINT
   */
  const endpointBase: Record<
    AssessmentData['endpointLevel'],
    number
  > = {
    none: 0,
    basic_av: 28,
    business_av: 52,
    edr: 80,
    managed_edr: 94,
    unknown: 50,
  };

  const updates = yn(
    a.autoUpdates,
    100,
    20,
  );

  const central = capability(
    a.endpointCentralManagement,
  );

  const inventory: Record<
    AssessmentData['assetInventory'],
    number
  > = {
    managed: 100,
    partial: 70,
    informal: 45,
    none: 10,
    unknown: 50,
  };

  const vulnerability: Record<
    AssessmentData['vulnerabilityManagement'],
    number
  > = {
    continuous: 100,
    regular: 85,
    occasional: 60,
    reactive: 35,
    none: 10,
    unknown: 50,
  };

  const response: Record<
    AssessmentData['endpointResponse'],
    number
  > = {
    managed_soc: 100,
    defined_team: 80,
    alerts_only: 45,
    none: 15,
    unknown: 50,
  };

  const endpointControls: Control[] = [
    {
      known:
        a.endpointLevel !== 'unknown',

      score:
        endpointBase[
          a.endpointLevel
        ],

      weight: 32,

      critical: true,
    },

    {
      known:
        a.endpointCentralManagement !==
          'unknown' &&
        a.endpointLevel !== 'none',

      score: central.score,

      weight: 14,
    },

    {
      known:
        a.endpointResponse !==
          'unknown' &&
        a.endpointLevel !== 'none',

      score:
        response[
          a.endpointResponse
        ],

      weight: 22,

      critical: true,
    },

    {
      known:
        a.autoUpdates !== 'unknown',

      score: updates.score,

      weight: 12,
    },

    {
      known:
        a.assetInventory !== 'unknown',

      score:
        inventory[
          a.assetInventory
        ],

      weight: 10,
    },

    {
      known:
        a.vulnerabilityManagement !==
        'unknown',

      score:
        vulnerability[
          a.vulnerabilityManagement
        ],

      weight: 10,

      critical: true,
    },
  ];

  const endpointResult =
    scoreControls(endpointControls);

  /**
   * BACKUP
   */
  const backupBase: Record<
    AssessmentData['backupLevel'],
    number
  > = {
    none: 0,
    manual: 20,
    automated_local: 55,
    cloud: 60,
    multi_copy: 80,
    managed: 92,
    unknown: 50,
  };

  const restore: Record<
    AssessmentData['restoreTests'],
    number
  > = {
    regular: 100,
    once: 65,
    never: 10,
    unknown: 50,
  };

  const isolation: Record<
    AssessmentData['backupIsolation'],
    number
  > = {
    immutable: 100,
    isolated: 90,
    separate_account: 75,
    same_environment: 35,
    none: 10,
    unknown: 50,
  };

  const backupControls: Control[] = [
    {
      known:
        a.backupLevel !== 'unknown',

      score:
        backupBase[
          a.backupLevel
        ],

      weight: 40,

      critical: true,
    },

    {
      known:
        a.backupIsolation !==
        'unknown',

      score:
        isolation[
          a.backupIsolation
        ],

      weight: 30,

      critical: true,
    },

    {
      known:
        a.restoreTests !== 'unknown',

      score:
        restore[
          a.restoreTests
        ],

      weight: 30,

      critical: true,
    },

    /**
     * V4 adaptive.
     */
    {
      known: knownOptional(
        a.backupResponsibility,
      ),

      score: a.backupResponsibility
        ? backupResponsibilityScore[
            a.backupResponsibility
          ]
        : 50,

      weight: 10,

      applicable:
        a.backupResponsibility !==
        undefined,
    },
  ];

  const backupResult =
    scoreControls(backupControls);

  /**
   * IDENTITY
   */
  const mfa: Record<
    AssessmentData['mfa'],
    number
  > = {
    yes: 100,
    partial: 60,
    no: 10,
    unknown: 50,
  };

  const shared = yn(
    a.sharedAccounts,
    20,
    100,
  );

  const offboarding: Record<
    AssessmentData['offboarding'],
    number
  > = {
    formal: 100,
    informal: 45,
    unknown: 50,
  };

  const email: Record<
    AssessmentData['emailProtection'],
    number
  > = {
    advanced: 95,
    standard: 75,
    basic: 45,
    none: 10,
    unknown: 50,
  };

  const incident: Record<
    AssessmentData['incidentResponse'],
    number
  > = {
    formal: 95,
    informal: 55,
    none: 15,
    unknown: 50,
  };

  const identityControls: Control[] = [
    {
      known:
        a.mfa !== 'unknown',

      score: mfa[a.mfa],

      weight: 35,

      critical: true,
    },

    {
      known:
        a.sharedAccounts !==
        'unknown',

      score: shared.score,

      weight: 15,
    },

    {
      known:
        a.offboarding !== 'unknown',

      score:
        offboarding[
          a.offboarding
        ],

      weight: 20,
    },

    {
      known:
        a.emailProtection !==
        'unknown',

      score:
        email[
          a.emailProtection
        ],

      weight: 15,
    },

    {
      known:
        a.incidentResponse !==
        'unknown',

      score:
        incident[
          a.incidentResponse
        ],

      weight: 15,
    },
  ];

  const identityResult =
    scoreControls(identityControls);

  const scores = {
    network: networkResult.score,
    endpoint: endpointResult.score,
    backup: backupResult.score,
    identity: identityResult.score,
  };

  const domainCoverage = {
    network: networkResult.coverage,
    endpoint: endpointResult.coverage,
    backup: backupResult.coverage,
    identity: identityResult.coverage,
  };

  const domainConfidence = {
    network:
      networkResult.confidence,

    endpoint:
      endpointResult.confidence,

    backup:
      backupResult.confidence,

    identity:
      identityResult.confidence,
  };

  const evaluated = Object.entries(
    scores,
  ).filter(
    ([, value]) => value !== null,
  ) as [DomainKey, number][];

  const overall = evaluated.length
    ? clamp(
        evaluated.reduce(
          (
            sum,
            [, value],
          ) => sum + value,
          0,
        ) / evaluated.length,
      )
    : null;

  /**
   * Mantemos labels internos compatíveis
   * com a versão atual.
   *
   * No relatório V4 vamos traduzir isso
   * visualmente para linguagem ainda mais simples.
   */
  const labels: Record<
    DomainKey,
    string
  > = {
    network: 'Rede e Perímetro',
    endpoint: 'Endpoints',
    backup: 'Backup e Continuidade',
    identity: 'Identidade e Acesso',
  };

  const findings: Finding[] = [];

  const firewallName = [
    cleanLabel(a.firewallVendor),
    cleanLabel(a.firewallModel),
  ]
    .filter(Boolean)
    .join(' ');

  /**
   * NETWORK FINDINGS
   */
  if (
    a.firewallLevel === 'none' ||
    a.firewallLevel === 'isp'
  ) {
    findings.push({
      domain: labels.network,

      title:
        'A proteção da internet é bastante limitada',

      situation:
        a.firewallLevel === 'isp'
          ? 'A proteção informada depende principalmente do equipamento fornecido pela operadora.'
          : 'Não foi identificada uma camada dedicada de proteção entre a internet e a rede da empresa.',

      consequence:
        'Nesse cenário, a empresa pode ter menos capacidade para bloquear, registrar e entender comportamentos suspeitos antes que eles afetem usuários ou sistemas.',

      technical:
        'Firewall corporativo, inspeção de tráfego, prevenção de intrusão, políticas de acesso e acompanhamento dos eventos.',

      severity: 'Alta',
    });
  }

  if (
    a.firewallLevel === 'router' &&
    a.firewallThreatPrevention !== 'yes'
  ) {
    findings.push({
      domain: labels.network,

      title:
        'O equipamento atual pode estar fazendo mais conectividade do que segurança',

      situation: firewallName
        ? `Você informou o uso de ${firewallName}. Pelas demais respostas, não conseguimos confirmar uma camada ampla de prevenção ativa de ameaças nesse equipamento.`
        : 'Você informou o uso de um roteador/firewall tradicional, mas não conseguimos confirmar uma camada ampla de prevenção ativa de ameaças.',

      consequence:
        'O equipamento pode cumprir muito bem funções como internet, regras, VPN e segmentação. O ponto de atenção é que ameaças mais sofisticadas podem depender de outras camadas para serem identificadas e acompanhadas.',

      technical:
        'IPS, controle de aplicações, inteligência de ameaças, filtragem, análise de malware e monitoramento.',

      severity: 'Média',
    });
  }

  if (
    a.firewallManagement ===
      'outsourced' &&
    (
      a.firewallReporting ===
        'none' ||
      a.firewallReporting ===
        'incident_only'
    ) &&
    (
      a.firewallMonitoring24x7 ===
        'no' ||
      a.firewallMonitoring24x7 ===
        'unknown' ||
      a.firewallMonitoring24x7 ===
        undefined
    )
  ) {
    findings.push({
      domain: labels.network,

      title:
        'Você depende de um terceiro, mas tem pouca visibilidade do que acontece na rede',

      situation:
        'O firewall é administrado por uma empresa terceirizada, porém você informou que não recebe acompanhamento periódico ou recebe informações apenas quando ocorre algum problema.',

      consequence:
        'Uma tentativa de ataque ou um padrão suspeito pode existir sem virar uma informação útil para sua empresa. O problema pode chamar atenção somente quando usuários, sistemas ou a operação começam a sentir os efeitos.',

      technical:
        'Relatórios periódicos, acompanhamento de eventos, correlação de alertas, monitoramento contínuo e processo de resposta.',

      severity: 'Alta',
    });
  }

  if (
    a.firewallThreatPrevention ===
    'no'
  ) {
    findings.push({
      domain: labels.network,

      title:
        'Não identificamos uma camada ativa para analisar ameaças na internet',

      situation:
        'Pelas respostas, não foram confirmados recursos adicionais de inspeção e prevenção de ameaças no equipamento que protege a internet.',

      consequence:
        'Isso aumenta a dependência de outras ferramentas para perceber comportamentos maliciosos que passem pelas regras tradicionais de acesso.',

      technical:
        'IPS, proteção contra malware, controle de aplicações, filtragem e inteligência de ameaças.',

      severity: 'Alta',
    });
  }

  if (
    a.monitoring === 'none' ||
    a.monitoring === 'reactive_it'
  ) {
    findings.push({
      domain: labels.network,

      title:
        'Um ataque pode demorar mais para ser percebido',

      situation:
        a.monitoring === 'none'
          ? 'Não foi identificado acompanhamento regular dos alertas e eventos de segurança.'
          : 'A análise costuma acontecer quando algum problema ou sintoma já chamou atenção.',

      consequence:
        'Alguns eventos podem permanecer sem análise até começarem a afetar pessoas, sistemas ou a operação.',

      technical:
        'Monitoramento contínuo, correlação de alertas, triagem e resposta.',

      severity:
        a.monitoring === 'none'
          ? 'Alta'
          : 'Média',
    });
  }

  if (
    a.networkMaintenance === 'none'
  ) {
    findings.push({
      domain: labels.network,

      title:
        'A manutenção da rede não possui uma rotina definida',

      situation:
        'Não foi informada uma rotina definida de atualização e revisão das configurações dos equipamentos de rede.',

      consequence:
        'Atualizações e revisões importantes podem acabar acontecendo apenas quando aparece algum problema.',

      technical:
        'Gestão de configuração, atualização de firmware e revisão periódica de regras.',

      severity: 'Média',
    });
  }

  /**
   * ENDPOINT FINDINGS
   */
  if (a.endpointLevel === 'none') {
    findings.push({
      domain: labels.endpoint,

      title:
        'Os computadores não possuem uma proteção padronizada',

      situation:
        'Não foi identificada uma camada corporativa de proteção aplicada de forma consistente aos computadores.',

      consequence:
        'A empresa fica mais dependente da percepção dos usuários e de controles isolados para identificar ameaças nos dispositivos.',

      technical:
        'Proteção corporativa de endpoint, gestão central e acompanhamento dos dispositivos.',

      severity: 'Alta',
    });
  }

  if (
    a.endpointLevel === 'basic_av'
  ) {
    const endpointName = [
      cleanLabel(a.endpointVendor),
      cleanLabel(a.endpointProduct),
    ]
      .filter(Boolean)
      .join(' ');

    findings.push({
      domain: labels.endpoint,

      title:
        'Existe antivírus, mas a capacidade de investigação é limitada',

      situation: endpointName
        ? `Você informou utilizar ${endpointName}. Pelas respostas, a proteção identificada está mais próxima de um antivírus básico do que de uma camada completa de investigação e resposta.`
        : 'Existe uma camada de antivírus nos computadores, mas sem indicação de gestão corporativa e investigação mais profunda.',

      consequence:
        'A solução pode bloquear ameaças conhecidas, mas oferecer menos contexto quando é necessário entender o que um programa suspeito fez dentro do computador.',

      technical:
        'Gestão centralizada, análise comportamental, EDR, investigação e resposta.',

      severity: 'Média',
    });
  }

  if (
    a.endpointLevel ===
    'business_av'
  ) {
    findings.push({
      domain: labels.endpoint,

      title:
        'A proteção dos computadores é válida, mas pode faltar capacidade de resposta',

      situation:
        'O ambiente já possui antivírus corporativo, o que é uma camada importante. Pelas respostas, não identificamos capacidade equivalente a EDR para investigar comportamento e apoiar resposta.',

      consequence:
        'Se uma ameaça ultrapassar a prevenção inicial, entender o que aconteceu e conter o problema pode depender mais de investigação manual.',

      technical:
        'EDR, análise comportamental, investigação, contenção e resposta sobre endpoints.',

      severity: 'Média',
    });
  }

  if (
    (
      a.endpointLevel === 'edr' ||
      a.endpointLevel ===
        'managed_edr'
    ) &&
    (
      a.endpointResponse ===
        'none' ||
      a.endpointResponse ===
        'alerts_only'
    )
  ) {
    findings.push({
      domain: labels.endpoint,

      title:
        'Existe tecnologia para detectar, mas a resposta pode não acompanhar',

      situation:
        'Existe uma solução com capacidade de detecção avançada nos computadores, mas os alertas são acompanhados apenas de forma eventual ou sem um responsável claramente definido.',

      consequence:
        'Uma ferramenta pode identificar um comportamento suspeito sem que isso se transforme rapidamente em investigação, contenção e recuperação.',

      technical:
        'Triagem de alertas, investigação, contenção, remediação e processo de resposta.',

      severity: 'Média',
    });
  }

  if (
    a.vulnerabilityManagement ===
      'none' ||
    a.vulnerabilityManagement ===
      'reactive'
  ) {
    findings.push({
      domain: labels.endpoint,

      title:
        'Falhas conhecidas podem permanecer abertas por mais tempo',

      situation:
        'A identificação de vulnerabilidades acontece de forma reativa ou sem uma rotina definida.',

      consequence:
        'Uma correção importante pode existir e ainda assim demorar para chegar aos equipamentos mais relevantes da empresa.',

      technical:
        'Inventário, varredura periódica, priorização e correção de vulnerabilidades.',

      severity: 'Alta',
    });
  }

  if (
    a.assetInventory === 'none' ||
    a.assetInventory === 'informal'
  ) {
    findings.push({
      domain: labels.endpoint,

      title:
        'Pode existir equipamento fora do radar da empresa',

      situation:
        'O inventário de equipamentos foi informado como informal ou indisponível.',

      consequence:
        'Quando não existe uma visão clara de todos os dispositivos, fica mais difícil confirmar se todos estão atualizados e protegidos.',

      technical:
        'Inventário atualizado de ativos, responsáveis e estado de proteção.',

      severity: 'Média',
    });
  }

  /**
   * BACKUP FINDINGS
   */
  if (
    a.backupLevel === 'none' ||
    a.backupLevel === 'manual'
  ) {
    findings.push({
      domain: labels.backup,

      title:
        'Recuperar os dados pode depender demais de ações manuais',

      situation:
        a.backupLevel === 'none'
          ? 'Não foi identificado um processo formal de cópia e proteção dos dados.'
          : 'As cópias dependem de execução manual.',

      consequence:
        'Em uma situação de perda de dados ou ransomware, a empresa pode descobrir somente durante a recuperação que alguma informação importante não estava protegida como esperado.',

      technical:
        'Backup automatizado, retenção, cópias adicionais e objetivos de recuperação.',

      severity: 'Alta',
    });
  }

  if (
    a.backupIsolation === 'none' ||
    a.backupIsolation ===
      'same_environment'
  ) {
    findings.push({
      domain: labels.backup,

      title:
        'O mesmo incidente pode alcançar produção e backup',

      situation:
        'Não foi confirmada uma cópia isolada, imutável ou administrativamente separada do ambiente principal.',

      consequence:
        'Se as mesmas credenciais ou o mesmo ambiente alcançam produção e cópias, um ransomware pode comprometer justamente os dados que seriam usados para recuperar a empresa.',

      technical:
        'Imutabilidade, isolamento, cópia offline ou separação administrativa das credenciais.',

      severity: 'Alta',
    });
  }

  if (a.restoreTests === 'never') {
    findings.push({
      domain: labels.backup,

      title:
        'Ter backup ainda não prova que a empresa consegue recuperar',

      situation:
        'Existem cópias, mas uma restauração real nunca foi testada.',

      consequence:
        'Problemas de senha, integridade, tempo de recuperação ou arquivos ausentes podem aparecer apenas quando a empresa já estiver no meio de um incidente.',

      technical:
        'Testes periódicos de restauração, validação de RTO/RPO e evidência de recuperação.',

      severity: 'Média',
    });
  }

  /**
   * IDENTITY FINDINGS
   */
  if (a.mfa === 'no') {
    findings.push({
      domain: labels.identity,

      title:
        'Uma senha roubada pode ser suficiente para entrar em uma conta',

      situation:
        'Não foi identificado uso de autenticação em duas etapas nas contas importantes.',

      consequence:
        'Se uma senha for descoberta, reutilizada ou capturada em phishing, o invasor pode ter menos barreiras para acessar a conta.',

      technical:
        'MFA em contas corporativas, administrativas e sistemas críticos.',

      severity: 'Alta',
    });
  }

  if (a.sharedAccounts === 'yes') {
    findings.push({
      domain: labels.identity,

      title:
        'Contas compartilhadas dificultam saber quem fez o quê',

      situation:
        'Mais de uma pessoa utiliza a mesma credencial.',

      consequence:
        'Fica mais difícil atribuir ações, investigar problemas e remover o acesso de uma única pessoa sem afetar as demais.',

      technical:
        'Identidades individuais, trilhas de auditoria e revisão de acessos.',

      severity: 'Média',
    });
  }

  if (
    a.emailProtection === 'none' ||
    a.emailProtection === 'basic'
  ) {
    findings.push({
      domain: labels.identity,

      title:
        'O e-mail pode depender demais da percepção do usuário',

      situation:
        'Não foram identificadas camadas adicionais amplas de proteção contra phishing, links e anexos maliciosos.',

      consequence:
        'Mensagens bem construídas podem passar pelos filtros básicos e chegar até alguém que precise decidir sozinho se aquilo é legítimo.',

      technical:
        'Anti-phishing, análise de links e anexos, autenticação de domínio e proteção avançada de e-mail.',

      severity: 'Média',
    });
  }

  if (
    a.incidentResponse === 'none'
  ) {
    findings.push({
      domain: labels.identity,

      title:
        'Em um incidente, a empresa pode precisar decidir tudo na hora',

      situation:
        'Não foi identificado um responsável ou processo previamente definido para coordenar um incidente de segurança.',

      consequence:
        'Quando o tempo é crítico, a equipe pode precisar descobrir durante o próprio incidente quem decide, quem deve ser acionado e o que fazer primeiro.',

      technical:
        'Plano de resposta, responsáveis, contatos, critérios de escalonamento e comunicação.',

      severity: 'Alta',
    });
  }

  /**
   * COMPLETENESS
   */
  const allControls = [
    ...networkControls,
    ...endpointControls,
    ...backupControls,
    ...identityControls,
  ].filter(
    (item) =>
      item.applicable !== false,
  );

  const totalWeight =
    allControls.reduce(
      (sum, item) =>
        sum + item.weight,
      0,
    );

  const knownWeight =
    allControls
      .filter((item) => item.known)
      .reduce(
        (sum, item) =>
          sum + item.weight,
        0,
      );

  const completeness =
    totalWeight
      ? clamp(
          (knownWeight / totalWeight) *
            100,
        )
      : 0;

  /**
   * CONTEXT
   */
  const contextSignals =
    (
      a.sensitiveData === 'yes'
        ? 1
        : 0
    ) +
    (
      a.incidentHistory === 'yes'
        ? 1
        : 0
    ) +
    (
      a.criticalSystems.length > 0
        ? 1
        : 0
    ) +
    (
      ['4h', '8h'].includes(
        a.maxDowntime,
      )
        ? 1
        : 0
    ) +
    (
      a.operationalImpact ===
        'major' ||
      a.operationalImpact ===
        'halt'
        ? 1
        : 0
    );

  const dataDecentralized =
    [
      'mixed',
      'endpoints',
      'personal_cloud',
    ].includes(a.dataLocation);

  const endpointMobilityExposure =
    a.byod === 'yes' ||
    a.dataLocation === 'endpoints' ||
    a.dataLocation ===
      'personal_cloud';

  /**
   * PRIORITY ENGINE
   */
  const priorityFactors: Record<
    DomainKey,
    number
  > = {
    network:
      100 -
      (scores.network ?? 50) +
      (a.sites > 1 ? 8 : 0) +
      (
        a.monitoring === 'none' ||
        a.monitoring ===
          'reactive_it'
          ? 8
          : 0
      ) +
      (
        a.firewallReporting ===
        'none'
          ? 6
          : 0
      ),

    endpoint:
      100 -
      (scores.endpoint ?? 50) +
      (
        a.sensitiveData === 'yes'
          ? 12
          : 0
      ) +
      (
        a.incidentHistory === 'yes'
          ? 8
          : 0
      ) +
      (
        endpointMobilityExposure
          ? 10
          : 0
      ),

    backup:
      100 -
      (scores.backup ?? 50) +
      (
        ['4h', '8h'].includes(
          a.maxDowntime,
        )
          ? 12
          : 0
      ) +
      (
        dataDecentralized
          ? 6
          : 0
      ) +
      (
        a.operationalImpact ===
          'major' ||
        a.operationalImpact ===
          'halt'
          ? 10
          : 0
      ),

    identity:
      100 -
      (scores.identity ?? 50) +
      (
        a.sensitiveData === 'yes'
          ? 10
          : 0
      ) +
      (
        a.emailProtection ===
          'none' ||
        a.emailProtection ===
          'basic'
          ? 6
          : 0
      ),
  };

  const priority =
    evaluated.length
      ? [...evaluated].sort(
          (x, y) =>
            priorityFactors[y[0]] -
            priorityFactors[x[0]],
        )[0][0]
      : null;

  const priorityLevel =
    overall === null
      ? 'Dados insuficientes'
      : overall < 35 ||
          (
            contextSignals >= 3 &&
            overall < 55
          )
        ? 'Crítica'
        : overall < 55 ||
            contextSignals >= 2
          ? 'Alta'
          : overall < 75
            ? 'Moderada'
            : 'Baixa';

  /**
   * DEPENDENCIES
   */
  const dependencies: {
    area: string;
    status:
      | 'Antes'
      | 'Em paralelo';
    message: string;
  }[] = [];

  if (dataDecentralized) {
    dependencies.push({
      area: 'Backup e dados',

      status: 'Antes',

      message:
        'Organizar e centralizar os dados corporativos prioritários antes de definir a estratégia final de backup. Isso reduz pontos dispersos e melhora a cobertura da proteção.',
    });
  }

  if (
    (
      a.assetInventory === 'none' ||
      a.assetInventory ===
        'informal'
    ) &&
    [
      'none',
      'basic_av',
      'business_av',
    ].includes(a.endpointLevel)
  ) {
    dependencies.push({
      area: 'Endpoints',

      status: 'Em paralelo',

      message:
        'Consolidar o inventário de equipamentos durante a evolução da proteção de endpoint, para confirmar cobertura e responsáveis.',
    });
  }

  if (
    (
      a.firewallLevel === 'ngfw' ||
      a.firewallLevel ===
        'managed_ngfw'
    ) &&
    (
      a.monitoring === 'none' ||
      a.monitoring ===
        'reactive_it'
    )
  ) {
    dependencies.push({
      area: 'Rede',

      status: 'Antes',

      message:
        'Validar configuração, serviços ativos e rotina de acompanhamento do firewall atual antes de concluir que a necessidade é substituir o equipamento.',
    });
  }

  /**
   * CRITICAL RULES ENGINE
   *
   * Essas regras não mudam artificialmente o score.
   * Elas identificam combinações que merecem atenção.
   */
  const criticalRules: CriticalRule[] =
    [];

  if (
    a.backupLevel !== 'none' &&
    a.backupLevel !== 'unknown' &&
    a.restoreTests === 'never'
  ) {
    criticalRules.push({
      id: 'backup-without-restore-test',

      domain: 'backup',

      title:
        'Backup existente sem prova de recuperação',

      reason:
        'Há cópias, mas a restauração nunca foi testada. A existência do backup não garante que a operação consiga voltar no tempo esperado.',

      severity: 'Alta',
    });
  }

  if (
    (
      a.backupIsolation === 'none' ||
      a.backupIsolation ===
        'same_environment'
    ) &&
    (
      a.sensitiveData === 'yes' ||
      a.operationalImpact ===
        'major' ||
      a.operationalImpact ===
        'halt'
    )
  ) {
    criticalRules.push({
      id: 'backup-shared-risk',

      domain: 'backup',

      title:
        'Produção e backup podem compartilhar o mesmo risco',

      reason:
        'Não foi confirmada separação suficiente entre o ambiente principal e as cópias usadas para recuperação.',

      severity: 'Alta',
    });
  }

  if (
    a.mfa === 'no' &&
    (
      a.sensitiveData === 'yes' ||
      a.emailProtection ===
        'none' ||
      a.emailProtection ===
        'basic'
    )
  ) {
    criticalRules.push({
      id: 'identity-single-factor',

      domain: 'identity',

      title:
        'Uma senha comprometida pode ter impacto elevado',

      reason:
        'A empresa combina ausência de MFA com dados sensíveis ou proteção limitada de e-mail.',

      severity: 'Alta',
    });
  }

  if (
    (
      a.endpointLevel === 'edr' ||
      a.endpointLevel ===
        'managed_edr'
    ) &&
    (
      a.endpointResponse ===
        'none' ||
      a.endpointResponse ===
        'alerts_only'
    )
  ) {
    criticalRules.push({
      id: 'edr-without-response',

      domain: 'endpoint',

      title:
        'Detecção sem resposta estruturada',

      reason:
        'Existe capacidade de detectar comportamentos avançados, mas não foi confirmada uma operação capaz de transformar alertas em investigação e contenção.',

      severity: 'Média',
    });
  }

  if (
    a.firewallManagement ===
      'outsourced' &&
    a.firewallReporting ===
      'none' &&
    (
      a.monitoring === 'none' ||
      a.monitoring ===
        'reactive_it'
    ) &&
    (
      a.firewallMonitoring24x7 ===
        'no' ||
      a.firewallMonitoring24x7 ===
        'unknown' ||
      a.firewallMonitoring24x7 ===
        undefined
    )
  ) {
    criticalRules.push({
      id:
        'outsourced-firewall-low-visibility',

      domain: 'network',

      title:
        'Firewall terceirizado com pouca visibilidade',

      reason:
        'A gestão é terceirizada, mas não há relatório periódico nem acompanhamento contínuo confirmado.',

      severity: 'Alta',
    });
  }

  /**
   * CURRENT PROFILE x TARGET PROFILE
   *
   * Isto NÃO é "nota oficial NIST".
   *
   * É um alvo contextual interno,
   * inspirado na lógica Current/Target Profile.
   */
  const targetScores: Record<
    DomainKey,
    number
  > = {
    network: 72,
    endpoint: 72,
    backup: 72,
    identity: 72,
  };

  if (a.sensitiveData === 'yes') {
    targetScores.endpoint += 8;
    targetScores.backup += 10;
    targetScores.identity += 10;
  }

  if (a.sites > 1) {
    targetScores.network += 5;
  }

  if (a.vpnRemote > 0) {
    targetScores.network += 4;
    targetScores.identity += 5;
  }

  if (
    a.operationalImpact === 'major' ||
    a.operationalImpact === 'halt'
  ) {
    targetScores.network += 5;
    targetScores.endpoint += 6;
    targetScores.backup += 10;
  }

  if (
    a.incidentHistory === 'yes'
  ) {
    targetScores.network += 3;
    targetScores.endpoint += 3;
    targetScores.backup += 3;
    targetScores.identity += 3;
  }

  (
    Object.keys(
      targetScores,
    ) as DomainKey[]
  ).forEach((key) => {
    targetScores[key] = Math.min(
      95,
      targetScores[key],
    );
  });

  const targetGaps: Record<
    DomainKey,
    number | null
  > = {
    network:
      scores.network === null
        ? null
        : Math.max(
            0,
            targetScores.network -
              scores.network,
          ),

    endpoint:
      scores.endpoint === null
        ? null
        : Math.max(
            0,
            targetScores.endpoint -
              scores.endpoint,
          ),

    backup:
      scores.backup === null
        ? null
        : Math.max(
            0,
            targetScores.backup -
              scores.backup,
          ),

    identity:
      scores.identity === null
        ? null
        : Math.max(
            0,
            targetScores.identity -
              scores.identity,
          ),
  };

  /**
   * OPPORTUNITY ENGINE
   *
   * Continua exclusivamente interno.
   *
   * Não aparece no relatório do cliente.
   * Não altera o score técnico.
   */
  const endpointGap = [
    'none',
    'basic_av',
    'business_av',
  ].includes(a.endpointLevel);

  const backupReady =
    !dataDecentralized;

  const opportunityFit = {
    firewall: clamp(
      (
        100 -
        (scores.network ?? 50)
      ) *
        0.62 +
        (
          a.monitoring === 'none' ||
          a.monitoring ===
            'reactive_it'
            ? 12
            : 0
        ) +
        (
          a.firewallLevel ===
            'router' ||
          a.firewallLevel === 'isp'
            ? 8
            : 0
        ) +
        (
          a.firewallReporting ===
          'none'
            ? 8
            : 0
        ) +
        (
          a.firewallMonitoring24x7 ===
          'no'
            ? 8
            : 0
        ),
    ),

    endpoint: clamp(
      (
        100 -
        (scores.endpoint ?? 50)
      ) *
        0.72 +
        (
          endpointGap
            ? 18
            : 0
        ) +
        (
          a.sensitiveData === 'yes'
            ? 8
            : 0
        ) +
        (
          a.endpointResponse ===
            'none' ||
          a.endpointResponse ===
            'alerts_only'
            ? 6
            : 0
        ),
    ),

    backup: clamp(
      (
        (
          100 -
          (scores.backup ?? 50)
        ) *
          0.72 +
        (
          safeNumber(
            a.backupVolumeGb,
          ) > 0
            ? 5
            : 0
        ) +
        (
          a.restoreTests === 'never'
            ? 8
            : 0
        ) +
        (
          a.backupIsolation ===
            'none' ||
          a.backupIsolation ===
            'same_environment'
            ? 8
            : 0
        )
      ) *
        (
          backupReady
            ? 1
            : 0.72
        ),
    ),

    identity: clamp(
      (
        100 -
        (scores.identity ?? 50)
      ) *
        0.72 +
        (
          a.sensitiveData === 'yes'
            ? 10
            : 0
        ),
    ),
  };

  const opportunityNotes = {
    firewall:
      (
        a.firewallLevel === 'ngfw' ||
        a.firewallLevel ===
          'managed_ngfw'
      ) &&
      (
        a.monitoring === 'none' ||
        a.monitoring ===
          'reactive_it'
      )
        ? 'Validar operação, licenças, serviços ativos, relatórios e monitoramento do firewall atual antes de discutir substituição.'
        : 'Avaliar aderência conforme capacidade real de proteção, visibilidade e operação.',

    endpoint: endpointGap
      ? 'Há espaço para evoluir a proteção dos endpoints; confirmar quantidade elegível, solução atual, gestão central e quem responde aos alertas.'
      : 'Priorizar qualidade da operação e resposta antes de considerar troca de tecnologia.',

    backup: dataDecentralized
      ? 'Existe necessidade de continuidade, porém a estratégia final depende primeiro da organização dos dados prioritários.'
      : 'Ambiente mais preparado para dimensionamento de backup; confirmar volume, servidores, retenção e restauração.',

    identity:
      a.mfa === 'no' ||
      a.mfa === 'partial'
        ? 'Aprofundar MFA e governança de contas.'
        : 'Validar controles de identidade já existentes.',
  };

  /**
   * COMMERCIAL READINESS
   *
   * Não gera proposta.
   * Não gera preço.
   *
   * Apenas diz internamente o que você
   * já tem para começar o pré-dimensionamento manual.
   */
  const linkKnown = a.links.some(
    (link) =>
      safeNumber(
        link.speedMbps,
      ) > 0,
  );

  const endpointQuantity =
    Math.max(
      safeNumber(a.endpointCount),
      safeNumber(a.devices),
      safeNumber(a.users),
    );

  const commercialReadiness = {
    firewall: readiness([
      [
        safeNumber(a.users) > 0,
        'quantidade de usuários',
      ],

      [
        linkKnown,
        'velocidade de pelo menos um link',
      ],

      [
        safeNumber(a.sites) > 0,
        'quantidade de unidades',
      ],

      [
        Number.isFinite(a.vpnRemote),
        'uso de VPN remota',
      ],

      [
        Number.isFinite(a.vpnSite),
        'VPN entre unidades',
      ],

      [
        Number.isFinite(a.vlans),
        'quantidade de VLANs',
      ],

      [
        a.firewallLevel !==
          'unknown',
        'tipo de firewall atual',
      ],

      [
        a.monitoring !== 'unknown',
        'forma de acompanhamento',
      ],
    ]),

    endpoint: readiness([
      [
        endpointQuantity > 0,
        'quantidade de dispositivos',
      ],

      [
        a.endpointLevel !==
          'unknown',
        'tipo de proteção atual',
      ],

      [
        a.endpointResponse !==
          'unknown',
        'forma de resposta aos alertas',
      ],
    ]),

    backup: readiness([
      [
        Number.isFinite(
          a.servers,
        ),
        'quantidade de servidores',
      ],

      [
        safeNumber(
          a.backupVolumeGb,
        ) > 0,
        'volume aproximado de dados',
      ],

      [
        a.backupLevel !== 'unknown',
        'tipo de backup atual',
      ],

      [
        a.restoreTests !==
          'unknown',
        'situação dos testes de restauração',
      ],

      [
        a.dataLocation !== 'unknown',
        'onde os dados ficam',
      ],
    ]),
  };

  /**
   * SNAPSHOT PARA O BRIEFING INTERNO
   */
  const dimensioningSnapshot = {
    firewall: {
      users: safeNumber(a.users),

      devices:
        safeNumber(a.devices),

      sites:
        safeNumber(a.sites, 1),

      linksMbps: a.links
        .map((link) =>
          safeNumber(
            link.speedMbps,
          ),
        )
        .filter(
          (value) => value > 0,
        ),

      vpnRemote:
        safeNumber(a.vpnRemote),

      vpnSite:
        safeNumber(a.vpnSite),

      vlans:
        safeNumber(a.vlans),

      currentTechnology: [
        cleanLabel(a.firewallVendor),
        cleanLabel(a.firewallModel),
      ]
        .filter(Boolean)
        .join(' '),

      management:
        a.firewallManagement ??
        'unknown',

      reporting:
        a.firewallReporting ??
        'unknown',

      monitoring24x7:
        a.firewallMonitoring24x7 ??
        'unknown',
    },

    endpoint: {
      quantity:
        endpointQuantity,

      vendor:
        cleanLabel(
          a.endpointVendor,
        ),

      product:
        cleanLabel(
          a.endpointProduct,
        ),

      protectionLevel:
        a.endpointLevel,

      response:
        a.endpointResponse,
    },

    backup: {
      servers:
        safeNumber(a.servers),

      volumeGb:
        safeNumber(
          a.backupVolumeGb,
        ),

      vendor:
        cleanLabel(
          a.backupVendor,
        ),

      product:
        cleanLabel(
          a.backupProduct,
        ),

      responsibility:
        a.backupResponsibility ??
        'unknown',

      restoreTests:
        a.restoreTests,

      isolation:
        a.backupIsolation,
    },
  };

  /**
   * IMPACTO FINANCEIRO
   *
   * Se operationalImpact ainda não existir
   * (assessment antigo), preservamos a lógica V3.
   *
   * Quando o Bloco 2 começar a coletar
   * operationalImpact, a simulação fica mais contextual.
   */
  const people = Math.max(
    1,
    safeNumber(a.users) ||
      safeNumber(a.endpointCount) ||
      safeNumber(a.devices) ||
      10,
  );

  const hours =
    a.maxDowntime === '4h'
      ? 4
      : a.maxDowntime === '8h'
        ? 8
        : a.maxDowntime === '1d'
          ? 8
          : a.maxDowntime === '2d'
            ? 16
            : a.maxDowntime ===
                'more'
              ? 24
              : 8;

  const round100 = (n: number) =>
    Math.round(n / 100) * 100;

  let affectedPeople = people;

  let productivityLow: number;
  let productivityHigh: number;

  let technicalLow: number;
  let technicalHigh: number;

  let disruptionLow: number;
  let disruptionHigh: number;

  /**
   * Assessment V3.
   * Mantém cálculo anterior.
   */
  if (
    a.operationalImpact === undefined ||
    a.operationalImpact === 'unknown'
  ) {
    productivityLow =
      people * hours * 35;

    productivityHigh =
      people * hours * 65;

    technicalLow = 2000;

    technicalHigh = 6000;

    disruptionLow =
      a.sensitiveData === 'yes' ||
      a.criticalSystems.length > 0
        ? 2500
        : 1000;

    disruptionHigh =
      a.sensitiveData === 'yes' ||
      a.criticalSystems.length > 0
        ? 7000
        : 4000;
  } else {
    /**
     * Assessment V4.
     */
    affectedPeople = Math.max(
      1,
      Math.round(
        people *
          impactShare(
            a.operationalImpact,
          ),
      ),
    );

    productivityLow =
      affectedPeople *
      hours *
      35;

    productivityHigh =
      affectedPeople *
      hours *
      65;

    const serverCount = Math.max(
      0,
      safeNumber(a.servers),
    );

    const deviceCount = Math.max(
      safeNumber(a.endpointCount),
      safeNumber(a.devices),
    );

    technicalLow =
      3000 +
      serverCount * 600 +
      Math.min(
        deviceCount,
        300,
      ) *
        25;

    technicalHigh =
      8000 +
      serverCount * 1800 +
      Math.min(
        deviceCount,
        300,
      ) *
        85;

    const highBusinessContext =
      a.sensitiveData === 'yes' ||
      a.criticalSystems.length > 0 ||
      a.operationalImpact ===
        'major' ||
      a.operationalImpact ===
        'halt';

    const multiplier =
      impactMultiplier(
        a.operationalImpact,
      );

    disruptionLow =
      (
        highBusinessContext
          ? 4500
          : 1800
      ) * multiplier;

    disruptionHigh =
      (
        highBusinessContext
          ? 14000
          : 6500
      ) * multiplier;
  }

  const impactComponents = {
    productivity: [
      round100(productivityLow),
      round100(productivityHigh),
    ] as [number, number],

    technical: [
      round100(technicalLow),
      round100(technicalHigh),
    ] as [number, number],

    disruption: [
      round100(disruptionLow),
      round100(disruptionHigh),
    ] as [number, number],
  };

  const impactRange: [
    number,
    number,
  ] = [
    impactComponents.productivity[0] +
      impactComponents.technical[0] +
      impactComponents.disruption[0],

    impactComponents.productivity[1] +
      impactComponents.technical[1] +
      impactComponents.disruption[1],
  ];

  return {
    scores,

    domainCoverage,

    domainConfidence,

    overall,

    level:
      maturityLevel(overall),

    priority,

    priorityFactors,

    priorityLevel,

    priorityLabel: priority
      ? labels[priority]
      : 'Dados insuficientes',

    labels,

    findings,

    completeness,

    /**
     * Internal / commercial.
     */
    opportunityFit,

    opportunityNotes,

    commercialReadiness,

    dimensioningSnapshot,

    /**
     * Diagnostic intelligence.
     */
    dependencies,

    criticalRules,

    contextSignals,

    targetScores,

    targetGaps,

    technicalDepth:
      deriveTechnicalDepth(a),

    /**
     * Financial simulation.
     */
    impactRange,

    impactComponents,

    impactAssumptions: {
      people,

      affectedPeople,

      hours,

      operationalImpact:
        a.operationalImpact ??
        'unknown',

      productivityHourlyRange: [
        35,
        65,
      ] as [number, number],

      technicalRange:
        impactComponents.technical,

      disclaimer:
        'Simulação de ordem de grandeza baseada nas informações fornecidas. Não representa previsão de prejuízo, multa ou dano real.',
    },

    evaluatedDomains:
      evaluated.length,

    methodologyVersion:
      'v4.0-adaptive-foundation',
  };
}