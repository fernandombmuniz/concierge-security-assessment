import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import logo from "@/assets/logo-concierge.jpg";

const title = "Acesso interno | Concierge Security Assessment";
const description = "Área restrita da equipe Concierge para acompanhamento dos diagnósticos.";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void nav({ to: "/interno" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void nav({ to: "/interno" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/interno` },
        });
        if (error) throw error;
        setMsg("Conta criada. Confirme o e-mail para acessar o painel interno.");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Não foi possível autenticar.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMsg("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    void nav({ to: "/interno" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-dashboard-animate bg-grid-tech px-4 py-12">
      <div className="glass-card w-full max-w-md p-8">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Concierge Segurança Digital" className="h-10 rounded-lg" />
          <div>
            <div className="text-xs font-bold uppercase tracking-[.2em] text-teal-400">
              Uso interno Concierge
            </div>
            <h1 className="text-xl font-bold text-white">Acesso do Account Manager</h1>
          </div>
        </div>

        <form onSubmit={submit} className="mt-7 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">E-mail corporativo</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none focus:border-teal-500/60"
              placeholder="nome@concierge.seg.br"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Senha</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none focus:border-teal-500/60"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white transition hover:bg-teal-500 disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
            {mode === "signin" ? "Entrar" : "Criar acesso"}
          </button>
        </form>

        <button
          onClick={google}
          className="mt-3 w-full rounded-xl border border-slate-700/70 bg-slate-950/40 px-5 py-3 font-semibold text-slate-200 transition hover:border-teal-500/40"
        >
          Entrar com Google
        </button>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMsg(null);
          }}
          className="mt-4 text-sm text-teal-300 hover:text-teal-200"
        >
          {mode === "signin" ? "Primeiro acesso? Criar conta" : "Já tenho acesso"}
        </button>

        {msg && <p className="mt-4 text-sm text-amber-300">{msg}</p>}

        <p className="mt-6 flex items-start gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-slate-600" />
          Apenas e-mails cadastrados como Account Manager visualizam os diagnósticos vinculados.
        </p>
      </div>
    </main>
  );
}
