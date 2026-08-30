import { AssessmentData, emptyAssessment } from './types';

export interface Submission {
  id: string;
  createdAt: string;
  data: AssessmentData;
}

const KEY = 'concierge-client-assessments-v2';
const DRAFT = 'concierge-client-assessment-draft-v2';
const LAST_ID = 'concierge-client-last-assessment-id-v2';
const EDITING_ID = 'concierge-client-editing-id-v2';
const STEP = 'concierge-client-assessment-step-v2';

export function saveSubmission(data: AssessmentData) {
  const editingId = localStorage.getItem(EDITING_ID);
  const all = listSubmissions();

  if (editingId) {
    const existingIndex = all.findIndex((x) => x.id === editingId);
    if (existingIndex > -1) {
      all[existingIndex].data = data;
      all[existingIndex].createdAt = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(all));
      localStorage.setItem(LAST_ID, editingId);
      localStorage.removeItem(EDITING_ID);
      return all[existingIndex];
    }
  }

  const item = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    data,
  };

  all.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(all));
  localStorage.setItem(LAST_ID, item.id);
  localStorage.removeItem(EDITING_ID);

  return item;
}

export function listSubmissions(): Submission[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function getSubmission(id: string): Submission | undefined {
  return listSubmissions().find((x) => x.id === id);
}

export function saveDraft(data: AssessmentData) {
  localStorage.setItem(DRAFT, JSON.stringify(data));
}

export function loadDraft(): AssessmentData {
  try {
    return {
      ...emptyAssessment,
      ...JSON.parse(localStorage.getItem(DRAFT) || '{}'),
    };
  } catch {
    return emptyAssessment;
  }
}

export function clearDraft() {
  localStorage.removeItem(DRAFT);
  localStorage.removeItem(EDITING_ID);
  localStorage.removeItem(STEP);
}

/**
 * Remove todo o estado local que pertence ao respondente anterior.
 *
 * Use somente quando a aplicação identifica explicitamente o início de um
 * NOVO assessment. A atribuição comercial (ref/src) e os dados enviados ao
 * Supabase não são apagados por esta função.
 *
 * Isso evita que um navegador compartilhado exponha rascunhos ou resultados
 * do último respondente ao abrir um novo link público.
 */
export function clearPreviousRespondentState() {
  localStorage.removeItem(DRAFT);
  localStorage.removeItem(EDITING_ID);
  localStorage.removeItem(STEP);
  localStorage.removeItem(LAST_ID);
  localStorage.removeItem(KEY);
}
