import type {
  CriticalRule,
  DomainKey,
  Finding,
} from '../scoring';

export interface RankedFinding {
  finding: Finding;
  score: number;
  reasons: string[];
}

const severityWeight: Record<
  Finding['severity'],
  number
> = {
  Alta: 300,
  Média: 180,
  Baixa: 80,
};

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

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    );

/**
 * Identifica findings muito parecidos.
 *
 * Não precisa ser perfeito.
 * A função existe apenas para evitar
 * mostrar ao cliente três cartões que
 * expliquem essencialmente a mesma coisa.
 */
const findingTheme = (
  finding: Finding,
) => {
  const text = normalize(
    `${finding.title} ${finding.technical}`,
  );

  if (
    text.includes('backup') ||
    text.includes('restaur') ||
    text.includes('recuper') ||
    text.includes('copia') ||
    text.includes('imut')
  ) {
    if (
      text.includes('restaur') ||
      text.includes('teste')
    ) {
      return 'backup-recovery';
    }

    if (
      text.includes('isol') ||
      text.includes('imut') ||
      text.includes('mesmo ambiente')
    ) {
      return 'backup-isolation';
    }

    return 'backup-general';
  }

  if (
    text.includes('firewall') ||
    text.includes('internet') ||
    text.includes('rede')
  ) {
    if (
      text.includes('monitor') ||
      text.includes('acompanha') ||
      text.includes('visibilidade') ||
      text.includes('alerta')
    ) {
      return 'network-monitoring';
    }

    if (
      text.includes('ameaca') ||
      text.includes('ips') ||
      text.includes('prevenc')
    ) {
      return 'network-protection';
    }

    return 'network-general';
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
      return 'endpoint-response';
    }

    if (
      text.includes('vulnerab') ||
      text.includes('atualiza')
    ) {
      return 'endpoint-vulnerability';
    }

    if (
      text.includes('inventario') ||
      text.includes('ativos')
    ) {
      return 'endpoint-inventory';
    }

    return 'endpoint-protection';
  }

  if (
    text.includes('senha') ||
    text.includes('mfa') ||
    text.includes('conta') ||
    text.includes('acesso')
  ) {
    if (
      text.includes('compartilh')
    ) {
      return 'identity-shared';
    }

    if (
      text.includes('mfa') ||
      text.includes('senha')
    ) {
      return 'identity-authentication';
    }

    return 'identity-general';
  }

  if (
    text.includes('email') ||
    text.includes('phishing')
  ) {
    return 'email';
  }

  if (
    text.includes('incidente') ||
    text.includes('resposta')
  ) {
    return 'incident-response';
  }

  return normalize(
    finding.title,
  );
};

export function rankFindings(
  findings: Finding[],
  priority: DomainKey | null,
  criticalRules: CriticalRule[],
): RankedFinding[] {
  const criticalDomains =
    new Set<DomainKey>(
      criticalRules.map(
        (rule) => rule.domain,
      ),
    );

  return findings
    .map((finding) => {
      const reasons: string[] =
        [];

      let score =
        severityWeight[
          finding.severity
        ];

      const domain =
        domainFromFinding(
          finding.domain,
        );

      /**
       * O domínio escolhido pela engine
       * como prioridade precisa aparecer
       * com vantagem real no relatório.
       */
      if (
        domain &&
        priority === domain
      ) {
        score += 130;

        reasons.push(
          'domínio prioritário',
        );
      }

      /**
       * Uma Critical Rule não altera
       * artificialmente a nota do domínio,
       * mas precisa influenciar o que
       * mostramos primeiro ao cliente.
       */
      if (
        domain &&
        criticalDomains.has(domain)
      ) {
        score += 110;

        reasons.push(
          'regra crítica associada',
        );
      }

      /**
       * Algumas combinações têm valor
       * explicativo maior porque mostram
       * uma falsa sensação de segurança:
       *
       * tem backup, mas não recupera;
       * tem EDR, mas ninguém reage;
       * tem terceiro, mas não há visibilidade.
       */
      const title = normalize(
        finding.title,
      );

      if (
        title.includes(
          'nao prova que a empresa consegue recuperar',
        ) ||
        title.includes(
          'mesmo incidente pode alcançar',
        ) ||
        title.includes(
          'tecnologia para detectar',
        ) ||
        title.includes(
          'depende de um terceiro',
        ) ||
        title.includes(
          'pouca visibilidade',
        ) ||
        title.includes(
          'gestao da rede e terceirizada',
        ) ||
        title.includes(
          'visibilidade recebida',
        )
      ) {
        score += 70;

        reasons.push(
          'combinação contextual relevante',
        );
      }

      return {
        finding,
        score,
        reasons,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score,
    );
}

/**
 * Seleciona os findings exibidos
 * publicamente.
 *
 * Regras:
 * - máximo 3
 * - máximo 2 do mesmo domínio
 * - evita repetir o mesmo tema
 */
export function selectTopFindings(
  findings: Finding[],
  priority: DomainKey | null,
  criticalRules: CriticalRule[],
  limit = 3,
): Finding[] {
  const ranked =
    rankFindings(
      findings,
      priority,
      criticalRules,
    );

  const selected: Finding[] =
    [];

  const domainCount =
    new Map<string, number>();

  const usedThemes =
    new Set<string>();

  for (
    const item of ranked
  ) {
    if (
      selected.length >= limit
    ) {
      break;
    }

    const finding =
      item.finding;

    const currentDomainCount =
      domainCount.get(
        finding.domain,
      ) ?? 0;

    if (
      currentDomainCount >= 2
    ) {
      continue;
    }

    const theme =
      findingTheme(finding);

    if (
      usedThemes.has(theme)
    ) {
      continue;
    }

    selected.push(finding);

    domainCount.set(
      finding.domain,
      currentDomainCount + 1,
    );

    usedThemes.add(theme);
  }

  /**
   * Fallback:
   * se a deduplicação deixou menos
   * que o limite, completamos com os
   * melhores restantes.
   */
  if (
    selected.length < limit
  ) {
    for (
      const item of ranked
    ) {
      if (
        selected.length >= limit
      ) {
        break;
      }

      if (
        selected.includes(
          item.finding,
        )
      ) {
        continue;
      }

      selected.push(
        item.finding,
      );
    }
  }

  return selected;
}