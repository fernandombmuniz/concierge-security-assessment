import { createFileRoute } from "@tanstack/react-router";
import InternalResults from "@/pages/InternalResults";

export const Route = createFileRoute("/interno/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Relatório interno | Concierge Security Assessment" },
      { name: "description", content: "Relatório interno detalhado do diagnóstico de segurança." },
      { property: "og:title", content: "Relatório interno | Concierge Security Assessment" },
      { property: "og:description", content: "Relatório interno detalhado do diagnóstico de segurança." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InternalResults,
});
