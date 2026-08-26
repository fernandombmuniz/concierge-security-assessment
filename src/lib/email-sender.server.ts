/**
 * Camada de envio de e-mail (server-only).
 *
 * O envio usa a infraestrutura gerenciada de e-mail do projeto. Enquanto o
 * domínio remetente não estiver configurado/verificado, esta camada devolve
 * "not_configured" — o assessment continua salvo e concluído, e a notificação
 * fica registrada como pendente para reprocessamento posterior.
 */
export type SendResult =
  | { status: "sent" }
  | { status: "not_configured"; error: string }
  | { status: "failed"; error: string };

export async function sendInternalReportEmail(_args: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<SendResult> {
  const senderDomain = process.env["SENDER_DOMAIN"];
  const apiKey = process.env["LOVABLE_API_KEY"];

  if (!senderDomain || !apiKey) {
    return {
      status: "not_configured",
      error: "Domínio remetente de e-mail ainda não configurado para o projeto.",
    };
  }

  try {
    const response = await fetch("https://api.lovable.dev/emails/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": _args.idempotencyKey,
      },
      body: JSON.stringify({
        domain: senderDomain,
        to: _args.to,
        subject: _args.subject,
        html: _args.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return { status: "failed", error: `${response.status}: ${detail.slice(0, 500)}` };
    }
    return { status: "sent" };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "erro desconhecido" };
  }
}
