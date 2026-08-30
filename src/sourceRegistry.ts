/**
 * Biblioteca de referências oficiais exibidas no relatório.
 *
 * As fontes sustentam a relevância dos controles avaliados. As notas,
 * pesos, severidades e faixas de maturidade pertencem ao modelo interno
 * Concierge e não devem ser apresentados como uma pontuação CIS/NIST.
 */
export interface SourceEntry {
  id: string;
  organization: string;
  reportTitle: string;
  year: string;
  statement: string;
  sourceUrl: string;
  validated: boolean;
  domains?: string[];
  findingKeywords?: string[];
}

const SOURCES: SourceEntry[] = [
  {
    id: 'nist-csf-2',
    organization: 'NIST',
    reportTitle: 'Cybersecurity Framework (CSF) 2.0',
    year: '2024',
    statement: 'O CSF 2.0 organiza resultados de cibersegurança em Governar, Identificar, Proteger, Detectar, Responder e Recuperar, apoiando a priorização e a comunicação de riscos.',
    sourceUrl: 'https://www.nist.gov/cyberframework',
    validated: true,
    domains: ['Rede e Perímetro', 'Endpoints', 'Backup e Continuidade', 'Identidade e Acesso'],
  },
  {
    id: 'cis-network-infrastructure',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 12 · Network Infrastructure Management',
    year: 'v8.1',
    statement: 'O CIS recomenda manter e gerenciar ativamente os dispositivos de rede, incluindo atualização, configuração segura e revisão da infraestrutura.',
    sourceUrl: 'https://www.cisecurity.org/controls/network-infrastructure-management',
    validated: true,
    domains: ['Rede e Perímetro'],
    findingKeywords: ['perímetro', 'firewall', 'infraestrutura de rede', 'manutenção'],
  },
  {
    id: 'cis-audit-logs',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 8 · Audit Log Management',
    year: 'v8.1',
    statement: 'O CIS recomenda coletar, revisar, alertar e reter logs que possam ajudar a detectar, compreender ou recuperar-se de um incidente.',
    sourceUrl: 'https://www.cisecurity.org/controls/audit-log-management',
    validated: true,
    domains: ['Rede e Perímetro'],
    findingKeywords: ['acompanhamento', 'reativo', 'monitoramento', 'alertas'],
  },
  {
    id: 'cis-network-monitoring',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 13 · Network Monitoring and Defense',
    year: 'v8.1',
    statement: 'O CIS trata monitoramento e defesa de rede como uma capacidade contínua para ampliar visibilidade e resposta diante de ameaças.',
    sourceUrl: 'https://www.cisecurity.org/controls/cis-controls-list',
    validated: true,
    domains: ['Rede e Perímetro'],
    findingKeywords: ['prevenção ativa', 'ameaças', 'inspeção'],
  },
  {
    id: 'cis-malware-defense',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 10 · Malware Defenses',
    year: 'v8.1',
    statement: 'O CIS recomenda controles para prevenir ou controlar a instalação, execução e propagação de códigos maliciosos nos ativos da organização.',
    sourceUrl: 'https://www.cisecurity.org/controls/cis-controls-list',
    validated: true,
    domains: ['Endpoints'],
    findingKeywords: ['detectar comportamentos', 'computadores', 'endpoint', 'proteção atual'],
  },
  {
    id: 'cis-vulnerability-management',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 7 · Continuous Vulnerability Management',
    year: 'v8.1',
    statement: 'O CIS recomenda manter um processo para identificar, priorizar e corrigir vulnerabilidades nos ativos da organização.',
    sourceUrl: 'https://www.cisecurity.org/controls/cis-controls-list',
    validated: true,
    domains: ['Endpoints'],
    findingKeywords: ['vulnerabilidade'],
  },
  {
    id: 'cis-asset-inventory',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 1 · Inventory and Control of Enterprise Assets',
    year: 'v8.1',
    statement: 'O CIS recomenda manter conhecimento atualizado dos ativos conectados ao ambiente para apoiar proteção, atualização e responsabilização.',
    sourceUrl: 'https://www.cisecurity.org/controls/cis-controls-list',
    validated: true,
    domains: ['Endpoints'],
    findingKeywords: ['ativos', 'inventário', 'visibilidade'],
  },
  {
    id: 'cis-access-control',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 6 · Access Control Management',
    year: 'v8.1',
    statement: 'O CIS recomenda criar, atribuir, gerenciar e revogar credenciais e privilégios, além de reforçar autenticação para acessos relevantes.',
    sourceUrl: 'https://www.cisecurity.org/controls/access-control-management',
    validated: true,
    domains: ['Endpoints', 'Identidade e Acesso'],
    findingKeywords: ['privilégios', 'administrador', 'mfa', 'senha', 'compartilhadas', 'acesso'],
  },
  {
    id: 'cis-data-recovery',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 11 · Data Recovery',
    year: 'v8.1',
    statement: 'O CIS recomenda práticas de recuperação capazes de restaurar ativos a um estado confiável, incluindo backup automatizado, proteção das cópias e testes de recuperação.',
    sourceUrl: 'https://www.cisecurity.org/controls/data-recovery',
    validated: true,
    domains: ['Backup e Continuidade'],
    findingKeywords: ['recuperação', 'backup', 'cópias', 'restauração'],
  },
  {
    id: 'cis-email-browser',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 9 · Email and Web Browser Protections',
    year: 'v8.1',
    statement: 'O CIS recomenda ampliar a proteção de e-mail e navegação para reduzir a exposição a conteúdo malicioso e técnicas de engenharia social.',
    sourceUrl: 'https://www.cisecurity.org/controls/cis-controls-list',
    validated: true,
    domains: ['Identidade e Acesso'],
    findingKeywords: ['e-mail', 'phishing'],
  },
  {
    id: 'cis-incident-response',
    organization: 'Center for Internet Security',
    reportTitle: 'CIS Control 17 · Incident Response Management',
    year: 'v8.1',
    statement: 'O CIS recomenda definir capacidade de resposta a incidentes com responsáveis, procedimentos, comunicação e critérios de escalonamento.',
    sourceUrl: 'https://www.cisecurity.org/controls/cis-controls-list',
    validated: true,
    domains: ['Identidade e Acesso'],
    findingKeywords: ['incidente', 'resposta'],
  },
  {
    id: 'anpd-first-fine',
    organization: 'ANPD',
    reportTitle: 'Primeira multa por descumprimento à LGPD',
    year: '2023',
    statement: 'Em 2023, a ANPD aplicou duas multas simples à microempresa Telekall Infoservice, totalizando R$ 14.400, além de advertência. O caso é específico e não representa estimativa de sanção para outras empresas.',
    sourceUrl: 'https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aplica-a-primeira-multa-por-descumprimento-a-lgpd',
    validated: true,
  },
  {
    id: 'anpd-small-business',
    organization: 'ANPD',
    reportTitle: 'Regulamento para agentes de tratamento de pequeno porte',
    year: '2022',
    statement: 'A ANPD prevê tratamento regulatório diferenciado para agentes de pequeno porte, mas esclarece que as flexibilizações não afastam o cumprimento dos demais dispositivos da LGPD.',
    sourceUrl: 'https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022',
    validated: true,
  },
];

export function getValidatedSource(id: string): SourceEntry | null {
  const entry = SOURCES.find((source) => source.id === id);
  return entry?.validated ? entry : null;
}

export function getValidatedSourceForDomain(domain: string): SourceEntry | null {
  return SOURCES.find((source) => source.validated && source.domains?.includes(domain)) ?? null;
}

export function getValidatedSourceForFinding(title: string, domain: string): SourceEntry | null {
  const normalizedTitle = title.toLowerCase();
  const specific = SOURCES.find((source) =>
    source.validated &&
    source.domains?.includes(domain) &&
    source.findingKeywords?.some((keyword) => normalizedTitle.includes(keyword.toLowerCase())),
  );
  return specific ?? getValidatedSourceForDomain(domain);
}
