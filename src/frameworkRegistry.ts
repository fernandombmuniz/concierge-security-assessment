import type { DomainKey } from './scoring';

export interface FrameworkMapping {
  controlId: string;
  domain: DomainKey;
  title: string;
  nist: string[];
  cis: string[];
  rationale: string;
}

/**
 * Mapeamento de referência da metodologia Concierge V3.0.
 * Os códigos indicam alinhamento temático. A pontuação é metodologia própria
 * da Concierge e não deve ser apresentada como score oficial NIST ou CIS.
 */
export const FRAMEWORK_MAPPINGS: FrameworkMapping[] = [
  { controlId:'network.firewall', domain:'network', title:'Filtragem e política de perímetro', nist:['PR.IR'], cis:['CIS 12'], rationale:'Proteção e gestão da infraestrutura de rede.' },
  { controlId:'network.threatPrevention', domain:'network', title:'Prevenção ativa de ameaças', nist:['PR.IR','DE.CM'], cis:['CIS 12','CIS 13'], rationale:'Capacidade de prevenir e detectar tráfego malicioso.' },
  { controlId:'network.monitoring', domain:'network', title:'Monitoramento e resposta operacional', nist:['DE.CM','RS.MA'], cis:['CIS 8','CIS 13'], rationale:'Coleta, análise e acompanhamento de eventos.' },
  { controlId:'endpoint.protection', domain:'endpoint', title:'Proteção de endpoints', nist:['PR.PS','DE.CM'], cis:['CIS 10'], rationale:'Defesas contra malware e detecção comportamental.' },
  { controlId:'endpoint.inventory', domain:'endpoint', title:'Inventário de ativos', nist:['ID.AM'], cis:['CIS 1'], rationale:'Conhecimento e gestão dos ativos corporativos.' },
  { controlId:'endpoint.vulnerability', domain:'endpoint', title:'Gestão de vulnerabilidades', nist:['ID.RA','PR.PS'], cis:['CIS 7'], rationale:'Identificação e correção contínua de vulnerabilidades.' },
  { controlId:'backup.recovery', domain:'backup', title:'Recuperação de dados', nist:['RC.RP'], cis:['CIS 11'], rationale:'Automação, proteção e validação da recuperação.' },
  { controlId:'backup.isolation', domain:'backup', title:'Isolamento das cópias', nist:['PR.DS','RC.RP'], cis:['CIS 11'], rationale:'Redução do risco de comprometimento simultâneo da produção e backup.' },
  { controlId:'identity.mfa', domain:'identity', title:'Autenticação multifator', nist:['PR.AA'], cis:['CIS 6'], rationale:'Fortalecimento da autenticação de contas importantes.' },
  { controlId:'identity.lifecycle', domain:'identity', title:'Ciclo de vida de acessos', nist:['PR.AA'], cis:['CIS 5','CIS 6'], rationale:'Identidades individuais e remoção tempestiva de acessos.' },
  { controlId:'identity.email', domain:'identity', title:'Proteção de e-mail', nist:['PR.DS','DE.CM'], cis:['CIS 9'], rationale:'Redução da exposição a phishing, links e anexos maliciosos.' },
  { controlId:'identity.incidentResponse', domain:'identity', title:'Preparação para incidentes', nist:['RS.MA','RS.AN'], cis:['CIS 17'], rationale:'Papéis, processo e coordenação para resposta a incidentes.' },
];
