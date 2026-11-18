import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import AssessmentLuminaReport from '../components/AssessmentLuminaReport';
import type { AssessmentReportModel } from './assessment-report';
import { generateAssessmentPdf, sanitizePdfFileName } from './report-pdf';

/** Documento independente: nunca busca o relatório completo ou rascunhos no DOM. */
export async function downloadExecutiveReport(model: AssessmentReportModel) {
  if (model.mode !== 'executive') throw new Error('O download exige um diagnóstico executivo.');
  const snapshot = structuredClone(model);
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('data-executive-pdf-source', 'true');
  Object.assign(host.style, { position: 'absolute', left: '-30000px', top: '0', width: '1180px', pointerEvents: 'none' });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<AssessmentLuminaReport model={snapshot} chapter="overview" all />));
    const report = host.querySelector<HTMLElement>('[data-lumina-assessment]');
    if (!report || !report.querySelector('.al-top')?.textContent?.includes('DIAGNÓSTICO EXECUTIVO')) {
      throw new Error('Não foi possível preparar o documento executivo.');
    }
    await generateAssessmentPdf(report, {
      companyName: snapshot.company,
      fileName: `concierge-executive-security-assessment-${sanitizePdfFileName(snapshot.company)}.pdf`,
    });
  } finally {
    root.unmount();
    host.remove();
  }
}
