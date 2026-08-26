import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/concluido")({
  beforeLoad: () => {
    throw redirect({ to: "/resultado", search: { success: "true" } as never, replace: true });
  },
});
