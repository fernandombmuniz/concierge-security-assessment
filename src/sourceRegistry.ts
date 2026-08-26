/**
 * Source Registry — Biblioteca de Evidências Validadas
 *
 * Uma fonte só pode ser exibida ao cliente se `validated === true`.
 * NÃO adicionar fontes com dados inventados, estimados ou não verificados.
 * Cada entrada deve ser revisada e aprovada manualmente antes de ser marcada como validated.
 */

export interface SourceEntry {
  id: string;
  organization: string;
  reportTitle: string;
  year: string;
  statement: string;
  sourceUrl: string;
  validated: boolean;
}

// Biblioteca de fontes. Por padrão, nenhuma fonte está validada.
// Para ativar uma fonte, altere validated para true SOMENTE após verificação.
const SOURCES: SourceEntry[] = [
  // Exemplo de estrutura — NÃO validado, não será exibido.
  // {
  //   id: 'verizon-dbir-2024-network',
  //   organization: 'Verizon',
  //   reportTitle: 'Data Breach Investigations Report 2024',
  //   year: '2024',
  //   statement: 'Pending review.',
  //   sourceUrl: 'https://www.verizon.com/business/resources/reports/dbir/',
  //   validated: false,
  // },
];

/**
 * Retorna uma fonte validada pelo ID, ou null se não existir ou não estiver validada.
 * O componente deve verificar se o retorno é null antes de renderizar.
 */
export function getValidatedSource(id: string): SourceEntry | null {
  const entry = SOURCES.find(s => s.id === id);
  if (!entry || !entry.validated) return null;
  return entry;
}

/**
 * Retorna a primeira fonte validada para um domínio/contexto, ou null.
 * Pode ser usada para busca por tag quando múltiplas fontes cobrirem o mesmo domínio.
 */
export function getValidatedSourceForDomain(_domain: string): SourceEntry | null {
  // Implementação futura: filtrar por tags de domínio quando fontes forem cadastradas.
  return null;
}
