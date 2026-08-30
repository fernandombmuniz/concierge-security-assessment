/**
 * Sessão do assessment no navegador.
 *
 * Guarda apenas o identificador e o token de edição do próprio respondente,
 * permitindo salvar as respostas no banco em tempo real sem exigir login.
 * O rascunho local existente continua funcionando exatamente como antes.
 */
const KEY = 'concierge-assessment-session-v1';

export interface AssessmentSession {
  assessmentId: string;
  editToken: string;
  ref: string | null;
  source: string | null;
  consentAt: string;
}

export function loadSession(): AssessmentSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AssessmentSession;
    return parsed?.assessmentId && parsed?.editToken ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AssessmentSession) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

const ATTRIBUTION_KEY = 'concierge-assessment-attribution-v1';

/** Guarda ref (Account Manager) e src (origem) durante a navegação. */
export function rememberAttribution(
  ref: string | null,
  source: string | null,
) {
  if (typeof window === 'undefined') return;

  const current = readAttribution();
  const next = {
    ref: ref ?? current.ref,
    source: source ?? current.source,
  };

  localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
}

/**
 * Define uma atribuição limpa para um novo assessment público.
 *
 * Diferente de rememberAttribution(), valores ausentes não são herdados do
 * respondente anterior. Isso impede, por exemplo, que um `src` antigo seja
 * associado a um novo cliente que abriu apenas `?ref=fernando`.
 */
export function resetAttribution(
  ref: string | null,
  source: string | null,
) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(
    ATTRIBUTION_KEY,
    JSON.stringify({ ref, source }),
  );
}

export function readAttribution(): {
  ref: string | null;
  source: string | null;
} {
  if (typeof window === 'undefined') {
    return { ref: null, source: null };
  }

  try {
    const parsed = JSON.parse(
      localStorage.getItem(ATTRIBUTION_KEY) || '{}',
    );

    return {
      ref: parsed.ref ?? null,
      source: parsed.source ?? null,
    };
  } catch {
    return { ref: null, source: null };
  }
}
