// @ts-nocheck
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY não configurada.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const testEmail =
      Deno.env.get("TEST_EMAIL_OVERRIDE");

    if (!testEmail) {
      throw new Error(
        "TEST_EMAIL_OVERRIDE não configurado."
      );
    }

    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:
            "Concierge Security Assessment <onboarding@resend.dev>",
          to: [testEmail],
          subject:
            "Teste | Concierge Security Assessment",
          html: `
            <div style="
              font-family:Arial,sans-serif;
              max-width:640px;
              margin:auto;
              padding:32px;
            ">
              <h2>Concierge Security Assessment</h2>

              <p>
                Se você recebeu este e-mail,
                a integração entre Supabase Edge Functions
                e Resend está funcionando corretamente.
              </p>

              <p>
                <strong>Status:</strong>
                teste concluído com sucesso.
              </p>
            </div>
          `,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data,
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        resend: data,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});