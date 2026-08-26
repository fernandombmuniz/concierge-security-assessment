import { createFileRoute } from "@tanstack/react-router";
import InternalDashboard from "@/pages/InternalDashboard";

export const Route = createFileRoute("/interno/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel interno | Concierge Security Assessment" },
      { name: "description", content: "Área interna Concierge para acompanhamento dos diagnósticos." },
      { property: "og:title", content: "Painel interno | Concierge Security Assessment" },
      { property: "og:description", content: "Área interna Concierge para acompanhamento dos diagnósticos." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InternalDashboard,
});
