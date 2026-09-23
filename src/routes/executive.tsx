import { createFileRoute } from '@tanstack/react-router';
import ExecutiveAssessmentPreview from '@/pages/ExecutiveAssessmentPreview';

const title = 'Diagnóstico Executivo | Concierge Security Assessment';
const description = 'Preview local de um diagnóstico executivo rápido de segurança para empresários, diretores e gestores.';

export const Route = createFileRoute('/executive')({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: ExecutiveAssessmentPreview,
});
