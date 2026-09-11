import type { AssessmentData } from '../types';
import type {
  DomainKey,
  Finding,
} from '../scoring';
import { rankFindings } from './finding-priority';
import type { scoreAssessment } from '../scoring';

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
        'Definir uma rotina de relatórios de segurança, eventos relevantes, responsáveis por triagem e critérios de escalonamento.',
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
          'Definir monitoramento de eventos, triagem, responsáveis, alertas prioritários e processo de resposta para a camada de rede.',
        effort: 'Médio' as const,
      };
    }

    return {
      gap: 'A camada de borda não demonstra, pelas respostas, capacidade suficiente de prevenção, visibilidade e controle de ameaças.',
      action:
        'Revisar a arquitetura de proteção da internet, os serviços de segurança ativos, políticas, atualizações e capacidade de registrar e bloquear ameaças.',
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
        gap: 'Existe capacidade de proteção ou detecção, mas a resposta aos alertas não está suficientemente estruturada.',
        action:
          'Definir quem recebe alertas, como ocorre a triagem, quando um equipamento deve ser isolado e como investigação e remediação são registradas.',
        effort: 'Médio' as const,
      };
    }

    return {
      gap: 'A proteção dos dispositivos não está padronizada ou não oferece visibilidade central suficiente.',
      action:
        'Padronizar a proteção dos endpoints, centralizar a gestão e confirmar cobertura dos dispositivos e servidores elegíveis.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('vulnerab') ||
    text.includes('falhas conhecidas')
  ) {
    return {
      gap: 'Não há evidência de um ciclo contínuo para identificar, priorizar e corrigir vulnerabilidades.',
      action:
        'Estabelecer inventário de ativos, varreduras periódicas, priorização por criticidade e acompanhamento da correção.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('inventario') ||
    text.includes('fora do radar')
  ) {
    return {
      gap: 'A empresa não possui visão suficientemente confiável dos ativos que precisam estar protegidos.',
      action:
        'Consolidar um inventário mínimo de dispositivos, responsáveis, sistema operacional, criticidade e estado de proteção.',
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
        gap: 'Produção e backup podem compartilhar credenciais, administração ou alcance do mesmo incidente.',
        action:
          'Criar separação administrativa e uma cópia isolada ou imutável, reduzindo a possibilidade de comprometimento simultâneo.',
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
      gap: 'Contas relevantes ainda podem utilizar apenas senha ou ter MFA aplicado somente de forma parcial.',
      action:
        'Priorizar MFA para contas administrativas, e-mail e sistemas críticos e revisar exceções que ainda utilizam autenticação de fator único.',
      effort: 'Baixo' as const,
    };
  }

  if (text.includes('compartilh')) {
    return {
      gap: 'Credenciais compartilhadas reduzem rastreabilidade e dificultam revogação individual de acesso.',
      action:
        'Migrar contas compartilhadas para identidades individuais e revisar permissões, trilhas de auditoria e processo de desligamento.',
      effort: 'Médio' as const,
    };
  }

  if (
    text.includes('email') ||
    text.includes('phishing')
  ) {
    return {
      gap: 'A filtragem atual pode permitir que mensagens suspeitas cheguem ao usuário sem uma camada adicional de análise.',
      action:
        'Revisar proteção contra phishing, links e anexos, autenticação de domínio e resposta a mensagens maliciosas reportadas.',
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
        'Formalizar um fluxo mínimo de resposta com responsáveis, contatos, critérios de severidade, contenção, recuperação e comunicação.',
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

  for (const candidate of ranked) {
    if (selected.length >= limit) break;

    const domain = domainFromFinding(candidate.finding.domain);
    const count = usedDomains.get(candidate.finding.domain) ?? 0;

    if (count >= 2) continue;

    const normalizedTitle = normalize(candidate.finding.title);
    if (usedTitles.has(normalizedTitle)) continue;

    selected.push(candidate);
    usedDomains.set(candidate.finding.domain, count + 1);
    usedTitles.add(normalizedTitle);
  }

  const items = selected.map((candidate, index): PriorityPlanItem => {
    const rank = index + 1;
    const finding = candidate.finding;
    const domain = domainFromFinding(finding.domain);
    const action = actionForFinding(finding);
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
      title: finding.title,
      currentState: finding.situation,
      gap: action.gap,
      action: action.action,
      risk: finding.consequence,
      effort: action.effort,
      urgency: urgencyFromFinding(finding, isCritical),
      rationale: Array.from(new Set(contextualReasons)),
      commercialHint: domain ? commercialHint[domain] : null,
    };
  });

  const summary = items.length
    ? 'As prioridades abaixo organizam os achados por criticidade e contexto, em uma ordem sugerida de atenção.'
    : 'Não houve dados suficientes para gerar um plano de prioridades confiável.';

  return { items, summary };
}
