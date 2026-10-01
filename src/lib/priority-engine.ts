import type { AssessmentData } from '../types';
import type {
  DomainKey,
  Finding,
} from '../scoring';
import { rankFindings } from './finding-priority';
import type { scoreAssessment } from '../scoring';
import { presentFinding } from './contextual-insights';

export type PriorityEffort = 'Baixo' | 'Médio' | 'Alto';
export type PriorityUrgency = 'Alta' | 'Média' | 'Baixa';

export interface PriorityPlanItem {
  rank: number;
  domain: DomainKey | null;
  domainLabel: string;
  domainScore: number | null;
  title: string;
  currentState: string;
  gap: string;
  action: string;
  risk: string;
  effort: PriorityEffort;
  urgency: PriorityUrgency;
  rationale: string[];
  commercialHint: string | null;
}

export interface PriorityPlan {
  items: PriorityPlanItem[];
  summary: string;
}

type AssessmentScore = ReturnType<typeof scoreAssessment>;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const domainFromFinding = (
  domain: string,
): DomainKey | null => {
  switch (domain) {
    case 'Rede e Perímetro':
      return 'network';
    case 'Endpoints':
      return 'endpoint';
    case 'Backup e Continuidade':
      return 'backup';
    case 'Identidade e Acesso':
      return 'identity';
    default:
      return null;
  }
};

const domainPublicLabel: Record<DomainKey, string> = {
  network: 'Internet e rede',
  endpoint: 'Computadores e dispositivos',
  backup: 'Dados e recuperação',
  identity: 'Contas e acessos',
};

const commercialHint: Record<DomainKey, string> = {
  network: 'Avaliar aderência a Concierge Firewall, visibilidade e monitoramento da rede.',
  endpoint: 'Avaliar aderência a Concierge Endpoint e capacidade de detecção/resposta.',
  backup: 'Avaliar aderência a Concierge Backup e desenho de recuperação.',
  identity: 'Avaliar controles de identidade, proteção de e-mail e serviços complementares.',
};

const actionForFinding = (finding: Finding) => {
  const text = normalize(
    `${finding.title} ${finding.technical}`,
  );

  if (
    text.includes('terceiro') &&
    (text.includes('visibilidade') || text.includes('relatorio'))
  ) {
    return {
      gap: 'A gestão existe, mas faltam evidências recorrentes de visibilidade, acompanhamento e resposta.',
      action:
        'Definir uma rotina simples de acompanhamento, com alertas importantes, responsáveis e critérios claros para saber quando agir.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('firewall') ||
    text.includes('internet') ||
    text.includes('rede') ||
    text.includes('ips')
  ) {
    if (
      text.includes('monitor') ||
      text.includes('alerta') ||
      text.includes('percebido')
    ) {
      return {
        gap: 'O acompanhamento de eventos ocorre de forma reativa ou não possui uma rotina contínua claramente definida.',
        action:
          'Definir alertas, responsáveis e uma rotina de resposta para eventos importantes da internet e da rede.',
        effort: 'Médio' as const,
      };
    }

    return {
      gap: 'Pelas respostas, a proteção da conexão com a internet parece ter recursos limitados para analisar, registrar e bloquear ameaças.',
      action:
        'Revisar como a internet é protegida, quais recursos de segurança estão ativos, como são atualizados e se conseguem registrar e bloquear ameaças.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('endpoint') ||
    text.includes('computador') ||
    text.includes('antivirus') ||
    text.includes('edr')
  ) {
    if (
      text.includes('resposta') ||
      text.includes('alerta') ||
      text.includes('investig')
    ) {
      return {
        gap: 'Existe proteção ou geração de alertas, mas ainda falta uma rotina clara para analisar e agir quando algo importante aparece.',
        action:
          'Definir quem recebe os alertas, quando um computador deve ser isolado e como a investigação e a correção são registradas.',
        effort: 'Médio' as const,
      };
    }

    return {
      gap: 'A proteção dos dispositivos não está padronizada ou não oferece visibilidade central suficiente.',
      action:
        'Padronizar a proteção dos computadores, centralizar o acompanhamento e confirmar quais computadores e servidores estão cobertos.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('vulnerab') ||
    text.includes('falhas conhecidas')
  ) {
    return {
      gap: 'Não foi confirmada uma rotina clara para encontrar e corrigir falhas conhecidas nos computadores.',
      action:
        'Manter uma lista atualizada dos equipamentos e uma rotina periódica para revisar atualizações e falhas conhecidas.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('inventario') ||
    text.includes('fora do radar')
  ) {
    return {
      gap: 'A empresa pode não ter uma visão completa de todos os equipamentos que precisam estar protegidos.',
      action:
        'Manter uma lista simples dos computadores e servidores, com responsável, sistema operacional e situação da proteção.',
      effort: 'Baixo' as const,
    };
  }

  if (
    text.includes('backup') ||
    text.includes('restaur') ||
    text.includes('recuper') ||
    text.includes('copia')
  ) {
    if (
      text.includes('restaur') ||
      text.includes('prova que a empresa consegue recuperar')
    ) {
      return {
        gap: 'A existência das cópias ainda não foi validada por uma recuperação real e documentada.',
        action:
          'Executar um teste controlado de restauração, medir tempo de recuperação e registrar falhas, responsáveis e evidências.',
        effort: 'Baixo' as const,
      };
    }

    if (
      text.includes('isol') ||
      text.includes('imut') ||
      text.includes('mesmo incidente')
    ) {
      return {
        gap: 'Os dados principais e suas cópias podem estar próximos demais e acabar afetados pelo mesmo incidente.',
        action:
          'Manter pelo menos uma cópia separada e protegida para reduzir a chance de o mesmo incidente atingir os dados e o backup.',
        effort: 'Médio' as const,
      };
    }

    return {
      gap: 'O processo de proteção dos dados possui etapas manuais relevantes ou não apresenta continuidade claramente definida.',
      action:
        'Automatizar as cópias, definir retenção e responsáveis e alinhar objetivos de recuperação com a tolerância de parada da empresa.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('mfa') ||
    text.includes('senha roubada') ||
    text.includes('autenticacao')
  ) {
    return {
      gap: 'Algumas contas importantes ainda podem depender apenas de senha ou usar uma segunda confirmação só em parte dos acessos.',
      action:
        'Ativar uma segunda confirmação nas contas administrativas, no e-mail e nos sistemas mais importantes, começando pelos acessos de maior impacto.',
      effort: 'Baixo' as const,
    };
  }

  if (text.includes('compartilh')) {
    return {
      gap: 'Contas compartilhadas dificultam saber quem fez cada ação e remover o acesso de uma única pessoa.',
      action:
        'Usar contas individuais sempre que possível e revisar permissões e remoção de acessos quando alguém muda de função ou sai da empresa.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('email') ||
    text.includes('phishing')
  ) {
    return {
      gap: 'A proteção atual de e-mail pode deixar mensagens suspeitas chegarem ao usuário sem uma verificação adicional.',
      action:
        'Revisar a proteção contra golpes por e-mail, links e anexos e definir o que acontece quando alguém reporta uma mensagem suspeita.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('incidente') ||
    text.includes('resposta')
  ) {
    return {
      gap: 'Não está suficientemente claro quem decide, quem executa e quem deve ser acionado durante um incidente.',
      action:
        'Definir responsáveis, contatos e passos básicos para isolar o problema, recuperar a operação e comunicar quem precisa saber.',
      effort: 'Baixo' as const,
    };
  }

  return {
    gap: 'O controle informado apresenta uma lacuna relevante em relação ao nível de proteção esperado para o contexto avaliado.',
    action: `Revisar e formalizar os controles relacionados a ${finding.technical.toLowerCase()}, validando responsáveis, cobertura e evidências de funcionamento.`,
    effort: 'Médio' as const,
  };
};

const urgencyFromFinding = (
  finding: Finding,
  isCritical: boolean,
): PriorityUrgency => {
  if (isCritical || finding.severity === 'Alta') return 'Alta';
  if (finding.severity === 'Média') return 'Média';
  return 'Baixa';
};

/**
 * Priority Engine V4.2
 *
 * Usa a mesma fonte de verdade do scoring e dos findings. Ele não cria
 * benchmark nem altera a nota técnica. O objetivo é transformar os achados
 * já calculados em uma sequência executável de revisão e melhoria.
 */
export function buildPriorityPlan(
  data: AssessmentData,
  result: AssessmentScore,
  limit = 3,
): PriorityPlan {
  const ranked = rankFindings(
    result.findings,
    result.priority,
    result.criticalRules,
  );

  const criticalDomains = new Set(
    result.criticalRules.map((rule) => rule.domain),
  );

  const selected: typeof ranked = [];
  const usedDomains = new Map<string, number>();
  const usedTitles = new Set<string>();
  const usedActions = new Set<string>();

  for (const candidate of ranked) {
    if (selected.length >= limit) break;

    const domain = domainFromFinding(candidate.finding.domain);
    const count = usedDomains.get(candidate.finding.domain) ?? 0;

    if (count >= 2) continue;

    const normalizedTitle = normalize(candidate.finding.title);
    if (usedTitles.has(normalizedTitle)) continue;

    const actionSignature = normalize(actionForFinding(candidate.finding).action);
    if (usedActions.has(actionSignature)) continue;

    selected.push(candidate);
    usedDomains.set(candidate.finding.domain, count + 1);
    usedTitles.add(normalizedTitle);
    usedActions.add(actionSignature);
  }

  const items = selected.map((candidate, index): PriorityPlanItem => {
    const rank = index + 1;
    const finding = candidate.finding;
    const domain = domainFromFinding(finding.domain);
    const action = actionForFinding(finding);
    const presentation = presentFinding(finding, data);
    const isCritical = Boolean(domain && criticalDomains.has(domain));

    const contextualReasons = [...candidate.reasons];

    if (data.sensitiveData === 'yes') {
      contextualReasons.push('contexto com dados sensíveis informado');
    }

    if (data.incidentHistory === 'yes') {
      contextualReasons.push('histórico de incidente informado');
    }

    return {
      rank,
      domain,
      domainLabel: domain ? domainPublicLabel[domain] : finding.domain,
      domainScore: domain ? result.scores[domain] : null,
      title: presentation.title,
      currentState: presentation.informed,
      gap: action.gap,
      action: action.action,
      risk: presentation.practical,
      effort: action.effort,
      urgency: urgencyFromFinding(finding, isCritical),
      rationale: Array.from(new Set(contextualReasons)),
      commercialHint: domain ? commercialHint[domain] : null,
    };
  });

  const fallbackCandidates: Omit<PriorityPlanItem, 'rank'>[] = [
    {
      domain: 'endpoint',
      domainLabel: domainPublicLabel.endpoint,
      domainScore: result.scores.endpoint,
      title: 'Validar continuamente a superfície de exposição',
      currentState: 'Mesmo com os principais controles presentes, novas vulnerabilidades e ativos podem surgir ao longo do tempo.',
      gap: 'Maturidade técnica não elimina a necessidade de descobrir vulnerabilidades, ativos esquecidos e mudanças que aumentam a exposição.',
      action: 'Manter uma rotina de gestão de vulnerabilidades e, periodicamente, complementar a validação com testes técnicos do ambiente.',
      risk: 'Sem validação recorrente, controles aparentemente maduros podem conviver com falhas novas ou configurações que perderam eficácia.',
      effort: 'Médio',
      urgency: 'Baixa',
      rationale: ['evolução contínua de segurança'],
      commercialHint: 'Avaliar gestão de vulnerabilidades, análise de vulnerabilidade, pentest ou BAS conforme o cenário.',
    },
    {
      domain: 'backup',
      domainLabel: domainPublicLabel.backup,
      domainScore: result.scores.backup,
      title: 'Testar a capacidade real de resposta e recuperação',
      currentState: 'Controles instalados precisam ser exercitados para confirmar se pessoas, processos e tecnologia funcionam juntos durante um incidente.',
      gap: 'Ter ferramentas e procedimentos documentados não prova, sozinho, que a organização consegue detectar, conter e recuperar no tempo esperado.',
      action: 'Executar testes controlados de restauração e exercícios de resposta, registrando tempo, responsáveis, dificuldades e melhorias necessárias.',
      risk: 'Falhas de coordenação e recuperação costumam aparecer apenas quando o processo é testado de ponta a ponta.',
      effort: 'Médio',
      urgency: 'Baixa',
      rationale: ['validação da resiliência'],
      commercialHint: 'Avaliar exercícios de resposta, serviços de preparação, recuperação e validações controladas.',
    },
    {
      domain: 'identity',
      domainLabel: domainPublicLabel.identity,
      domainScore: result.scores.identity,
      title: 'Evoluir pessoas, identidades e comportamento seguro',
      currentState: 'Ambientes tecnicamente maduros ainda dependem de decisões humanas, contas bem administradas e regras claras para novos usos de tecnologia.',
      gap: 'Phishing, privilégios excessivos, uso inadequado de IA e mudanças de função continuam criando risco mesmo quando firewall, endpoint e backup estão estruturados.',
      action: 'Revisar acessos privilegiados, regras de uso de IA e práticas de conscientização, incluindo simulações e acompanhamento dos pontos recorrentes.',
      risk: 'Controles técnicos não eliminam fraude, abuso de credenciais, engenharia social ou exposição acidental de informação.',
      effort: 'Médio',
      urgency: 'Baixa',
      rationale: ['evolução de identidade e risco humano'],
      commercialHint: 'Avaliar awareness, simulação de phishing, IAM/IGA/PAM e governança de IA/dados conforme aderência.',
    },
    {
      domain: 'network',
      domainLabel: domainPublicLabel.network,
      domainScore: result.scores.network,
      title: 'Revisar se visibilidade e monitoramento acompanham a evolução do ambiente',
      currentState: 'Mudanças de links, aplicações, usuários e serviços alteram o que precisa ser observado e protegido.',
      gap: 'Uma configuração adequada hoje pode perder aderência quando o ambiente muda ou quando alertas deixam de ser revisados com a mesma frequência.',
      action: 'Revisar periodicamente políticas, eventos relevantes, cobertura de monitoramento e critérios de escalação para incidentes.',
      risk: 'Sem revisão, a organização pode manter tecnologia adequada com baixa visibilidade operacional.',
      effort: 'Baixo',
      urgency: 'Baixa',
      rationale: ['melhoria contínua da operação'],
      commercialHint: 'Avaliar serviços gerenciados, SOC, monitoramento e revisão periódica de configuração conforme necessidade.',
    },
  ];

  const signatures = new Set(items.map((item) => normalize(`${item.title} ${item.action}`)));

  for (const fallback of fallbackCandidates) {
    if (items.length >= limit) break;
    const signature = normalize(`${fallback.title} ${fallback.action}`);
    if (signatures.has(signature)) continue;
    items.push({ ...fallback, rank: items.length + 1 });
    signatures.add(signature);
  }

  const summary = result.findings.length
    ? 'As prioridades abaixo organizam os achados e os próximos passos de evolução em uma ordem sugerida de atenção.'
    : 'Os controles informados indicam uma base mais estruturada. As prioridades abaixo focam validação, resiliência e evolução contínua.';

  return { items, summary };
}
