import type { AssessmentData } from "@/types";
import { scoreAssessment, maturityLevel } from "@/scoring";

/**
 * Relatório interno (briefing comercial/técnico) enviado exclusivamente ao
 * Account Manager responsável. Nada disso é exibido ao cliente.
 */

const LABELS: Record<string, string> = {
  none: "Sem proteção / não existe",
  isp: "Proteção fornecida pela operadora",
  router: "Roteador ou firewall básico",
  utm: "UTM",
  ngfw: "NGFW",
  managed_ngfw: "NGFW com gestão especializada",
  unknown: "Não sei informar",
  yes: "Sim",
  no: "Não",
  partial: "Apenas em algumas contas",
  light: "Leve",
  medium: "Médio",
  high: "Intenso",
  reactive_it: "TI reativa",
  outsourced_it: "TI terceirizada",
  security_team: "Equipe de segurança",
  soc: "SOC",
  basic_av: "Antivírus gratuito / individual",
  business_av: "Antivírus corporativo",
  edr: "EDR / XDR",
  managed_edr: "EDR / XDR gerenciado",
  manual: "Cópias manuais",
  automated_local: "Backup automatizado local",
  cloud: "Backup automatizado em nuvem",
  multi_copy: "Mais de uma cópia / local",
  managed: "Backup gerenciado com política",
  regular: "Sim, periodicamente",
  once: "Já testamos alguma vez",
  never: "Nunca testamos",
  "4h": "Até 4 horas",
  "8h": "Até 8 horas",
  "1d": "Até 1 dia",
  "2d": "Até 2 dias",
  more: "Mais de 2 dias",
  formal: "Sim, existe processo definido",
  informal: "É feito caso a caso",
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const label = (v: unknown) => (typeof v === "string" && LABELS[v] ? LABELS[v] : v);
const show = (v: unknown) => {
  const out = label(v);
  if (out === null || out === undefined || out === "" || out === 0) return "Não informado";
  return esc(out);
};

function rows(items: [string, unknown][]) {
  return items
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;vertical-align:top;width:46%">${esc(k)}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">${show(v)}</td></tr>`,
    )
    .join("");
}

function section(title: string, body: string) {
  return `<h2 style="margin:28px 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#0f766e;border-bottom:1px solid #e2e8f0;padding-bottom:6px">${esc(title)}</h2>${body}`;
}

const table = (items: [string, unknown][]) =>
  `<table style="width:100%;border-collapse:collapse">${rows(items)}</table>`;

export interface ReportContext {
  data: AssessmentData;
  accountManagerName: string | null;
  source: string | null;
  completedAt: string;
  methodologyVersion: string;
  assessmentId: string;
}

export function buildInternalReport(ctx: ReportContext): { subject: string; html: string } {
  const a = ctx.data;
  const r = scoreAssessment(a);
  const sector = a.sector === "Outros" ? a.sectorOther || "Outros" : a.sector;
  const company = a.companyName || "Empresa não informada";

  const findings = r.findings.length
    ? r.findings
        .map(
          (f) => `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:12px">
        <div style="font-size:12px;color:#0f766e;font-weight:700;text-transform:uppercase;letter-spacing:.08em">${esc(f.domain)} · Severidade ${esc(f.severity)}</div>
        <div style="margin-top:4px;font-size:15px;font-weight:700;color:#0f172a">${esc(f.title)}</div>
        <p style="margin:8px 0 0;font-size:13px;color:#334155"><b>Situação encontrada:</b> ${esc(f.situation)}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#334155"><b>Por que merece atenção / possível impacto:</b> ${esc(f.consequence)}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#334155"><b>Ponto técnico avaliado:</b> ${esc(f.technical)}</p>
      </div>`,
        )
        .join("")
    : `<p style="font-size:13px;color:#334155">Nenhum achado gerado pelas respostas informadas.</p>`;

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:680px;margin:0 auto;padding:24px 26px">
    <div style="border-bottom:2px solid #0f766e;padding-bottom:12px">
      <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#0f766e;font-weight:700">Concierge Security Assessment</div>
      <h1 style="margin:6px 0 0;font-size:22px;color:#0f172a">Novo diagnóstico recebido</h1>
    </div>

    ${section(
      "Empresa",
      table([
        ["Empresa", company],
        ["Setor", sector],
        ["Contato", a.contactName],
        ["Cargo", a.contactRole],
        ["E-mail", a.contactEmail],
        ["Usuários", a.users],
        ["Unidades", a.sites],
      ]),
    )}

    ${section(
      "Responsável comercial",
      table([
        ["Account Manager", ctx.accountManagerName ?? "Não atribuído (acesso sem link individual)"],
        ["Origem", ctx.source ?? "Não informada"],
      ]),
    )}

    ${section(
      "Resumo do diagnóstico",
      table([
        ["Score geral", r.overall === null ? "Não avaliado" : `${r.overall}/100`],
        ["Classificação", maturityLevel(r.overall)],
        ["Cobertura do diagnóstico", `${r.completeness}%`],
        ["Prioridade identificada", r.priorityLabel],
      ]),
    )}

    ${section(
      "Maturidade por domínio",
      table([
        [
          "Rede e Perímetro",
          r.scores.network === null
            ? "Não avaliado"
            : `${r.scores.network}/100 — ${maturityLevel(r.scores.network)}`,
        ],
        [
          "Endpoints",
          r.scores.endpoint === null
            ? "Não avaliado"
            : `${r.scores.endpoint}/100 — ${maturityLevel(r.scores.endpoint)}`,
        ],
        [
          "Backup e Continuidade",
          r.scores.backup === null
            ? "Não avaliado"
            : `${r.scores.backup}/100 — ${maturityLevel(r.scores.backup)}`,
        ],
        [
          "Identidade e Acesso",
          r.scores.identity === null
            ? "Não avaliado"
            : `${r.scores.identity}/100 — ${maturityLevel(r.scores.identity)}`,
        ],
      ]),
    )}

    ${section(
      "Ambiente informado",
      table([
        ["Usuários", a.users],
        ["Computadores e notebooks", a.endpointCount || a.devices],
        ["Servidores", a.servers],
        ["Equipe de TI", a.itTeamSize],
        ["Unidades", a.sites],
      ]),
    )}

    ${section(
      "Rede e perímetro",
      table([
        ["Tipo de proteção atual", a.firewallLevel],
        ["Acompanhamento de segurança", a.monitoring],
        ["Licenciamento de segurança ativo", a.firewallLicense],
        ["Fabricante", a.firewallVendor],
        ["Modelo", a.firewallModel],
        ["Quantidade de links", a.internetLinkCount],
        ["Velocidade total (Mbps)", a.links?.[0]?.speedMbps],
        ["Perfil de utilização", a.networkUsage],
        ["Acessos VPN remotos", a.vpnRemote],
        ["VPNs entre unidades", a.vpnSite],
        ["VLANs", a.vlans],
      ]),
    )}

    ${section(
      "Endpoints",
      table([
        ["Proteção dos computadores", a.endpointLevel],
        ["Computadores e notebooks", a.endpointCount || a.devices],
        ["Servidores", a.servers],
        ["Atualizações automáticas", a.autoUpdates],
        ["Usuários com administrador local", a.localAdmins],
        ["Uso de computadores pessoais (BYOD)", a.byod],
      ]),
    )}

    ${section(
      "Backup e continuidade",
      table([
        ["Proteção de dados atual", a.backupLevel],
        ["Volume aproximado a proteger (GB)", a.backupVolumeGb],
        ["Testes de restauração", a.restoreTests],
        ["Tempo máximo de indisponibilidade aceitável", a.maxDowntime],
      ]),
    )}

    ${section(
      "Identidade e acesso",
      table([
        ["MFA nas contas importantes", a.mfa],
        ["Contas compartilhadas", a.sharedAccounts],
        ["Processo de offboarding", a.offboarding],
        ["Trata dados pessoais ou sensíveis", a.sensitiveData],
        ["Histórico de incidentes", a.incidentHistory],
        ["Principal preocupação", a.mainConcern],
        ["Sistemas críticos", a.criticalSystems?.join(", ")],
        ["Observações", a.notes],
      ]),
    )}

    ${section("Achados identificados", findings)}

    ${section(
      "Pré-dimensionamento",
      table([
        ["Usuários", a.users],
        ["Equipe de TI", a.itTeamSize],
        ["Unidades / sites", a.sites],
        ["Computadores e notebooks", a.endpointCount || a.devices],
        ["Servidores", a.servers],
        ["Links de internet", a.internetLinkCount],
        ["Velocidade total (Mbps)", a.links?.[0]?.speedMbps],
        ["Perfil de utilização da internet", a.networkUsage],
        ["Acessos VPN remotos", a.vpnRemote],
        ["VPNs entre unidades", a.vpnSite],
        ["VLANs", a.vlans],
        ["Fabricante / modelo do firewall", `${a.firewallVendor} ${a.firewallModel}`.trim()],
        ["Licenciamento de segurança", a.firewallLicense],
        ["Volume de dados a proteger (GB)", a.backupVolumeGb],
        ["Tempo máximo de indisponibilidade", a.maxDowntime],
        [
          "Cenário operacional estimado (referência interna)",
          `R$ ${r.impactRange[0].toLocaleString("pt-BR")} a R$ ${r.impactRange[1].toLocaleString("pt-BR")}`,
        ],
      ]),
    )}

    ${section(
      "Metodologia",
      table([
        ["Versão da metodologia", ctx.methodologyVersion],
        ["Conclusão", new Date(ctx.completedAt).toLocaleString("pt-BR")],
        ["Cobertura das respostas", `${r.completeness}%`],
        ["Domínios avaliados", `${r.evaluatedDomains} de 4`],
        ["Referência interna do assessment", ctx.assessmentId],
      ]),
    )}

    <p style="margin:22px 0 0;padding:12px 14px;background:#f1f5f9;border-radius:10px;font-size:12px;color:#475569;line-height:1.6">
      Este Security Assessment representa um diagnóstico inicial baseado nas informações fornecidas pelo respondente
      e deverá ser revisado pela equipe Concierge antes de qualquer recomendação técnica ou comercial definitiva.
    </p>
  </div>
</body></html>`;

  return { subject: `Novo Security Assessment | ${company}`, html };
}
