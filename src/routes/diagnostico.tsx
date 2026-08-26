import { createFileRoute } from "@tanstack/react-router";
import AssessmentForm from "@/pages/AssessmentForm";

const title = "Diagnóstico | Concierge Security Assessment";
const description =
  "Responda o diagnóstico de segurança da Concierge: rede e perímetro, dispositivos, continuidade e identidade.";

export const Route = createFileRoute("/diagnostico")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentForm,
});
