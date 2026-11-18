/** Identifica o formulário antes de aplicar o esquema do diagnóstico completo. */
export function isExecutiveAssessmentAnswers(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const answers = value as Record<string, unknown>;
  return answers['executiveAssessment'] === true || (
    typeof answers['itOwner'] === 'string' &&
    typeof answers['protection'] === 'string' &&
    typeof answers['afterHours'] === 'string' &&
    !('network' in answers)
  );
}
