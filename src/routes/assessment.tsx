import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/assessment")({
  beforeLoad: () => {
    throw redirect({ to: "/diagnostico", replace: true });
  },
});
