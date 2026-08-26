import { createFileRoute } from "@tanstack/react-router";
import ClientResults from "@/pages/ClientResults";

const title = "Resultado do diagnóstico | Concierge Security Assessment";
const description =
  "Visão consolidada da maturidade de segurança da sua empresa por domínio, com pontos que merecem atenção.";

export const Route = createFileRoute("/resultado")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientResults,
});
