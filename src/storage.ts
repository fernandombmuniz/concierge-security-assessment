import { AssessmentData, emptyAssessment } from './types';
export interface Submission {id:string; createdAt:string; data:AssessmentData;}
const KEY='concierge-client-assessments-v2';
const DRAFT='concierge-client-assessment-draft-v2';
export function saveSubmission(data:AssessmentData){
  const editingId = localStorage.getItem('concierge-client-editing-id-v2');
  const all = listSubmissions();
  
  if (editingId) {
    const existingIndex = all.findIndex(x => x.id === editingId);
    if (existingIndex > -1) {
      all[existingIndex].data = data;
      all[existingIndex].createdAt = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(all));
      localStorage.setItem('concierge-client-last-assessment-id-v2', editingId);
      localStorage.removeItem('concierge-client-editing-id-v2');
      return all[existingIndex];
    }
  }

  const item = {id:crypto.randomUUID(),createdAt:new Date().toISOString(),data};
  all.unshift(item);
  localStorage.setItem(KEY,JSON.stringify(all));
  localStorage.setItem('concierge-client-last-assessment-id-v2', item.id);
  localStorage.removeItem('concierge-client-editing-id-v2');
  return item;
}
export function listSubmissions():Submission[]{try {return JSON.parse(localStorage.getItem(KEY)||'[]');} catch {return [];}}
export function getSubmission(id:string):Submission|undefined{return listSubmissions().find(x=>x.id===id);}
export function saveDraft(data:AssessmentData){localStorage.setItem(DRAFT,JSON.stringify(data));}
export function loadDraft():AssessmentData{try{return {...emptyAssessment,...JSON.parse(localStorage.getItem(DRAFT)||'{}')}}catch{return emptyAssessment}}
export function clearDraft(){
  localStorage.removeItem(DRAFT);
  localStorage.removeItem('concierge-client-editing-id-v2');
  localStorage.removeItem('concierge-client-assessment-step-v2');
}
