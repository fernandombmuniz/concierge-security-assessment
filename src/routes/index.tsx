import { createFileRoute } from "@tanstack/react-router";
import LandingPage from "@/pages/LandingPage";

const title = "Concierge Security Assessment | Diagnóstico de Segurança";
const description =
  "Avaliação inicial da postura de segurança da sua empresa: rede, dispositivos, continuidade e acessos em 6 a 8 minutos.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: LandingPage,
});
