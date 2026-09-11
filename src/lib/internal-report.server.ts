import type { AssessmentData } from "@/types";

import {
  scoreAssessment,
  maturityLevel,
} from "@/scoring";

import {
  selectTopFindings,
} from "@/lib/finding-priority";

import {
  buildPriorityPlan,
} from "@/lib/priority-engine";

/**
 * Relatório interno enviado exclusivamente ao Account Manager.
 *
 * Objetivos:
 * 1. permitir leitura executiva rápida;
 * 2. indicar quais frentes merecem aprofundamento;
 * 3. mostrar o que já pode ser pré-dimensionado;
 * 4. mostrar exatamente o que ainda precisa ser confirmado;
 * 5. preservar a separação entre diagnóstico técnico e oportunidade comercial.
 *
 * Este conteúdo NÃO é exibido ao cliente.
 */

const LABELS: Record<string, string> = {
  none: "Não / inexistente",
  unknown: "Não sei informar",

  yes: "Sim",
  no: "Não",
  partial: "Parcial",

  light: "Leve",
  medium: "Médio",
  high: "Intenso",

  isp: "Equipamento / gestão da operadora",
  router: "Roteador ou firewall tradicional",
  utm: "UTM",
  ngfw: "NGFW",
  managed_ngfw: "NGFW com gestão especializada",

  internal: "Equipe interna",
  outsourced: "Empresa terceirizada",
  shared: "Equipe interna + terceirizada",
  unmanaged: "Sem responsável definido",

  periodic: "Relatórios / acompanhamento periódico",
  on_demand: "Apenas quando solicitado",
  incident_only: "Principalmente quando ocorre problema",

  reactive_it: "TI verifica quando aparece problema",
  outsourced_it: "TI terceirizada acompanha",
  security_team: "Equipe especializada de segurança",
  soc: "Acompanhamento contínuo / SOC",

  basic_av: "Antivírus individual / básico",
  business_av: "Antivírus corporativo",
  edr: "EDR / XDR",
  managed_edr: "EDR / XDR gerenciado",

  managed_soc: "Equipe especializada acompanha e responde",
  defined_team: "Responsável / equipe definida",
  alerts_only: "Alertas vistos quando necessário",

  managed: "Gerenciado",
  informal: "Informal",
  formal: "Formal",

  continuous: "Contínuo",
  regular: "Periódico",
  occasional: "Ocasional",
  reactive: "Reativo",

  manual: "Cópias manuais",
  automated_local: "Backup automatizado local",
  cloud: "Backup automatizado em nuvem",
  multi_copy: "Mais de uma cópia / local",

  immutable: "Cópia imutável",
  isolated: "Cópia isolada / offline",
  separate_account: "Administração separada",
  same_environment: "Mesmo ambiente / credenciais",

  corporate_central: "Dados corporativos centralizados",
  mixed: "Dados distribuídos entre vários locais",
  endpoints: "Principalmente nos computadores",
  personal_cloud: "Contas pessoais / locais não gerenciados",
  saas_only: "Principalmente em sistemas SaaS",

  advanced: "Proteção avançada",
  standard: "Proteção adicional administrada",
  basic: "Proteção básica",

  low: "Operação continua quase normalmente",
  major: "Maior parte da empresa fica parada",
  halt: "Operação praticamente para",

  "4h": "Até 4 horas",
  "8h": "Até 8 horas",
  "1d": "Até 1 dia",
  "2d": "Até 2 dias",
  more: "Mais de 2 dias",

  once: "Já testou alguma vez",
  never: "Nunca testou",
};

const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const label = (value: unknown) =>
  typeof value === "string" &&
  LABELS[value]
    ? LABELS[value]
    : value;

const show = (value: unknown) => {
  const output = label(value);

  if (
    output === null ||
    output === undefined ||
    output === ""
  ) {
    return "Não informado";
  }

  return esc(output);
};

const numberOrDash = (
  value: number | null | undefined,
) =>
  Number.isFinite(value)
    ? String(value)
    : "—";

const money = (value: number) =>
  new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    },
  ).format(
    Number.isFinite(value)
      ? value
      : 0,
  );

function rows(
  items: [string, unknown][],
) {
  return items
    .map(
      ([key, value]) =>
        `<tr>
          <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;vertical-align:top;width:46%">
            ${esc(key)}
          </td>
          <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600">
            ${show(value)}
          </td>
        </tr>`,
    )
    .join("");
}

function table(
  items: [string, unknown][],
) {
  return `
    <table style="width:100%;border-collapse:collapse">
      ${rows(items)}
    </table>
  `;
}

function section(
  title: string,
  body: string,
) {
  return `
    <h2 style="
      margin:28px 0 8px;
      font-size:13px;
      letter-spacing:.12em;
      text-transform:uppercase;
      color:#0f766e;
      border-bottom:1px solid #e2e8f0;
      padding-bottom:6px;
    ">
      ${esc(title)}
    </h2>

    ${body}
  `;
}

function badge(
  text: string,
  kind:
    | "high"
    | "medium"
    | "low"
    | "neutral" = "neutral",
) {
  const styles = {
    high:
      "background:#fff7ed;color:#c2410c;border:1px solid #fed7aa",

    medium:
      "background:#ecfeff;color:#0e7490;border:1px solid #a5f3fc",

    low:
      "background:#ecfdf5;color:#047857;border:1px solid #a7f3d0",

    neutral:
      "background:#f8fafc;color:#475569;border:1px solid #e2e8f0",
  };

  return `
    <span style="
      display:inline-block;
      padding:4px 9px;
      border-radius:999px;
      font-size:11px;
      font-weight:700;
      ${styles[kind]}
    ">
      ${esc(text)}
    </span>
  `;
}

function fitLabel(
  value: number,
) {
  if (value >= 70) {
    return {
      text: "Alta aderência",
      kind: "high" as const,
    };
  }

  if (value >= 45) {
    return {
      text: "Aderência moderada",
      kind: "medium" as const,
    };
  }

  return {
    text: "Baixa aderência",
    kind: "low" as const,
  };
}

function readinessStatus(
  percentage: number,
) {
  if (percentage >= 85) {
    return {
      text:
        "Dados suficientes para iniciar pré-dimensionamento",
      kind: "low" as const,
    };
  }

  if (percentage >= 60) {
    return {
      text:
        "Pré-dimensionável com algumas confirmações",
      kind: "medium" as const,
    };
  }

  return {
    text:
      "Ainda faltam dados importantes",
    kind: "high" as const,
  };
}

function readinessBlock(
  title: string,
  fit: number,
  readiness: {
    answered: number;
    total: number;
    percentage: number;
    missing: string[];
  },
  note: string,
) {
  const fitState =
    fitLabel(fit);

  const readinessState =
    readinessStatus(
      readiness.percentage,
    );

  const missing =
    readiness.missing.length
      ? `
        <div style="margin-top:10px;font-size:12px;color:#475569">
          <b>Confirmar:</b>
          ${esc(
            readiness.missing.join(
              ", ",
            ),
          )}
        </div>
      `
      : `
        <div style="margin-top:10px;font-size:12px;color:#047857;font-weight:700">
          Nenhuma informação essencial pendente nesta etapa.
        </div>
      `;

  return `
    <div style="
      border:1px solid #e2e8f0;
      border-radius:12px;
      padding:15px;
      margin-bottom:12px;
    ">
      <div style="
        display:flex;
        justify-content:space-between;
        gap:12px;
        align-items:flex-start;
        flex-wrap:wrap;
      ">
        <div style="
          font-size:16px;
          font-weight:700;
          color:#0f172a;
        ">
          ${esc(title)}
        </div>

        <div>
          ${badge(
            fitState.text,
            fitState.kind,
          )}
        </div>
      </div>

      <div style="margin-top:9px">
        ${badge(
          `${readiness.answered}/${readiness.total} dados · ${readiness.percentage}%`,
          readinessState.kind,
        )}
      </div>

      <div style="
        margin-top:9px;
        font-size:12px;
        color:#475569;
      ">
        ${esc(
          readinessState.text,
        )}
      </div>

      ${missing}

      <div style="
        margin-top:10px;
        padding-top:10px;
        border-top:1px solid #f1f5f9;
        font-size:12px;
        line-height:1.55;
        color:#64748b;
      ">
        ${esc(note)}
      </div>
    </div>
  `;
}

export interface ReportContext {
  data: AssessmentData;
  accountManagerName: string | null;
  source: string | null;
  completedAt: string;
  methodologyVersion: string;
  assessmentId: string;
}

export function buildInternalReport(
  ctx: ReportContext,
): {
  subject: string;
  html: string;
} {
  const a = ctx.data;

  const r =
    scoreAssessment(a);

  const sector =
    a.sector === "Outros"
      ? a.sectorOther ||
        "Outros"
      : a.sector;

  const company =
    a.companyName ||
    "Empresa não informada";

  const topFindings =
    selectTopFindings(
      r.findings,
      r.priority,
      r.criticalRules,
      3,
    );

  const priorityPlan =
    buildPriorityPlan(
      a,
      r,
      3,
    );

  const priorityPlanHtml =
    priorityPlan.items.length
      ? priorityPlan.items
          .map(
            (item) => `
              <div style="
                border:1px solid #dbeafe;
                border-radius:10px;
                padding:14px;
                margin-bottom:12px;
                background:#f8fafc;
              ">
                <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
                  <div>
                    <div style="font-size:11px;color:#0f766e;font-weight:700;text-transform:uppercase;letter-spacing:.08em">
                      Prioridade ${item.rank} · ${esc(item.domainLabel)}
                    </div>
                    <div style="margin-top:5px;font-size:15px;font-weight:700;color:#0f172a">
                      ${esc(item.title)}
                    </div>
                  </div>
                  <div style="white-space:nowrap;font-size:11px;font-weight:700;color:#0f766e;background:#f0fdfa;border:1px solid #99f6e4;border-radius:999px;padding:4px 8px">
                    ${esc(item.urgency)}
                  </div>
                </div>

                <p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:#334155">
                  <b>Lacuna:</b> ${esc(item.gap)}
                </p>

                <p style="margin:7px 0 0;font-size:13px;line-height:1.55;color:#0f172a">
                  <b>Ação recomendada:</b> ${esc(item.action)}
                </p>

                <p style="margin:7px 0 0;font-size:12px;line-height:1.55;color:#64748b">
                  <b>Esforço sugerido:</b> ${esc(item.effort)}
                  ${item.domainScore === null ? "" : ` · <b>Indicador da área:</b> ${item.domainScore}/100`}
                </p>

                ${item.commercialHint ? `
                  <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.55;color:#0369a1">
                    <b>Leitura comercial interna:</b> ${esc(item.commercialHint)}
                  </div>
                ` : ""}
              </div>
            `,
          )
          .join("")
      : `<p style="font-size:13px;color:#64748b">Dados insuficientes para gerar um plano de prioridades confiável.</p>`;

  const findingsHtml =
    topFindings.length
      ? topFindings
          .map(
            (
              finding,
              index,
            ) => `
              <div style="
                border:1px solid #e2e8f0;
                border-radius:10px;
                padding:14px;
                margin-bottom:12px;
              ">
                <div style="
                  font-size:11px;
                  color:#0f766e;
                  font-weight:700;
                  text-transform:uppercase;
                  letter-spacing:.08em;
                ">
                  #${index + 1}
                  ·
                  ${esc(
                    finding.domain,
                  )}
                  ·
                  ${esc(
                    finding.severity,
                  )}
                </div>

                <div style="
                  margin-top:5px;
                  font-size:15px;
                  font-weight:700;
                  color:#0f172a;
                ">
                  ${esc(
                    finding.title,
                  )}
                </div>

                <p style="
                  margin:8px 0 0;
                  font-size:13px;
                  line-height:1.55;
                  color:#334155;
                ">
                  <b>Situação:</b>
                  ${esc(
                    finding.situation,
                  )}
                </p>

                <p style="
                  margin:6px 0 0;
                  font-size:13px;
                  line-height:1.55;
                  color:#334155;
                ">
                  <b>Impacto:</b>
                  ${esc(
                    finding.consequence,
                  )}
                </p>

                <p style="
                  margin:6px 0 0;
                  font-size:12px;
                  line-height:1.55;
                  color:#64748b;
                ">
                  <b>Ponto técnico:</b>
                  ${esc(
                    finding.technical,
                  )}
                </p>
              </div>
            `,
          )
          .join("")
      : `
        <p style="
          font-size:13px;
          color:#334155;
        ">
          Nenhum achado prioritário foi gerado pelas respostas informadas.
        </p>
      `;

  const criticalRulesHtml =
    r.criticalRules.length
      ? r.criticalRules
          .map(
            (rule) => `
              <div style="
                border-left:4px solid #f59e0b;
                background:#fffbeb;
                padding:11px 13px;
                margin-bottom:9px;
                border-radius:7px;
              ">
                <div style="
                  font-size:13px;
                  font-weight:700;
                  color:#92400e;
                ">
                  ${esc(
                    rule.title,
                  )}
                </div>

                <div style="
                  margin-top:3px;
                  font-size:12px;
                  line-height:1.5;
                  color:#78350f;
                ">
                  ${esc(
                    rule.reason,
                  )}
                </div>
              </div>
            `,
          )
          .join("")
      : `
        <p style="
          font-size:13px;
          color:#64748b;
        ">
          Nenhuma regra crítica adicional foi acionada.
        </p>
      `;

  const firewallReadiness =
    r.commercialReadiness
      .firewall;

  const endpointReadiness =
    r.commercialReadiness
      .endpoint;

  const backupReadiness =
    r.commercialReadiness
      .backup;

  const firewallSnapshot =
    r.dimensioningSnapshot
      .firewall;

  const endpointSnapshot =
    r.dimensioningSnapshot
      .endpoint;

  const backupSnapshot =
    r.dimensioningSnapshot
      .backup;

  const firewallTechnology =
    firewallSnapshot
      .currentTechnology ||
    show(a.firewallLevel);

  const links =
    firewallSnapshot
      .linksMbps.length
      ? firewallSnapshot
          .linksMbps
          .map(
            (speed) =>
              `${speed} Mbps`,
          )
          .join(" + ")
      : "Não informado";

  const endpointTechnology =
    [
      endpointSnapshot.vendor,
      endpointSnapshot.product,
    ]
      .filter(Boolean)
      .join(" ") ||
    show(
      endpointSnapshot
        .protectionLevel,
    );

  const backupTechnology =
    [
      backupSnapshot.vendor,
      backupSnapshot.product,
    ]
      .filter(Boolean)
      .join(" ") ||
    show(a.backupLevel);

  const opportunityBlocks = `
    ${readinessBlock(
      "Firewall / Rede",
      r.opportunityFit.firewall,
      firewallReadiness,
      r.opportunityNotes.firewall,
    )}

    ${readinessBlock(
      "Endpoint",
      r.opportunityFit.endpoint,
      endpointReadiness,
      r.opportunityNotes.endpoint,
    )}

    ${readinessBlock(
      "Backup",
      r.opportunityFit.backup,
      backupReadiness,
      r.opportunityNotes.backup,
    )}
  `;

  const internalPriority =
    [
      {
        name: "Firewall / Rede",
        score:
          r.opportunityFit.firewall,
      },
      {
        name: "Endpoint",
        score:
          r.opportunityFit.endpoint,
      },
      {
        name: "Backup",
        score:
          r.opportunityFit.backup,
      },
    ].sort(
      (a, b) =>
        b.score - a.score,
    )[0];

  const html = `
<!doctype html>

<html lang="pt-BR">
  <body style="
    margin:0;
    background:#ffffff;
    font-family:Arial,Helvetica,sans-serif;
  ">
    <div style="
      max-width:720px;
      margin:0 auto;
      padding:24px 26px;
    ">

      <div style="
        border-bottom:2px solid #0f766e;
        padding-bottom:12px;
      ">
        <div style="
          font-size:12px;
          letter-spacing:.2em;
          text-transform:uppercase;
          color:#0f766e;
          font-weight:700;
        ">
          Concierge Security Assessment
        </div>

        <h1 style="
          margin:6px 0 0;
          font-size:22px;
          color:#0f172a;
        ">
          Novo diagnóstico recebido
        </h1>

        <p style="
          margin:7px 0 0;
          font-size:13px;
          color:#64748b;
        ">
          Briefing interno para preparação da abordagem e da reunião.
        </p>
      </div>

      ${section(
        "Visão rápida",
        `
          <div style="
            border:1px solid #ccfbf1;
            background:#f0fdfa;
            border-radius:12px;
            padding:16px;
          ">
            <div style="
              font-size:12px;
              text-transform:uppercase;
              letter-spacing:.09em;
              color:#0f766e;
              font-weight:700;
            ">
              Frente com maior aderência interna
            </div>

            <div style="
              margin-top:5px;
              font-size:20px;
              font-weight:700;
              color:#0f172a;
            ">
              ${esc(
                internalPriority.name,
              )}
            </div>

            <div style="
              margin-top:6px;
              font-size:13px;
              color:#475569;
            ">
              Fit interno:
              <b>
                ${internalPriority.score}/100
              </b>
            </div>

            <p style="
              margin:9px 0 0;
              font-size:12px;
              line-height:1.55;
              color:#64748b;
            ">
              Este indicador é exclusivamente comercial e não altera o score técnico apresentado ao cliente.
            </p>
          </div>
        `,
      )}

      ${section(
        "Empresa e contato",
        table([
          [
            "Empresa",
            company,
          ],

          [
            "Setor",
            sector,
          ],

          [
            "Contato",
            a.contactName,
          ],

          [
            "Cargo",
            a.contactRole,
          ],

          [
            "E-mail",
            a.contactEmail,
          ],

          [
            "Usuários",
            a.users,
          ],

          [
            "Equipamentos",
            a.endpointCount ||
              a.devices,
          ],

          [
            "Servidores",
            a.servers,
          ],

          [
            "Unidades",
            a.sites,
          ],
        ]),
      )}

      ${section(
        "Responsável comercial",
        table([
          [
            "Account Manager",
            ctx.accountManagerName ??
              "Não atribuído",
          ],

          [
            "Origem",
            ctx.source ??
              "Não informada",
          ],
        ]),
      )}

      ${section(
        "Resumo técnico",
        table([
          [
            "Indicador geral",
            r.overall === null
              ? "Não avaliado"
              : `${r.overall}/100`,
          ],

          [
            "Classificação",
            maturityLevel(
              r.overall,
            ),
          ],

          [
            "Cobertura do diagnóstico",
            `${r.completeness}%`,
          ],

          [
            "Principal prioridade técnica",
            r.priorityLabel,
          ],

          [
            "Nível de prioridade",
            r.priorityLevel,
          ],

          [
            "Profundidade técnica percebida",
            r.technicalDepth,
          ],
        ]),
      )}

      ${section(
        "Plano de prioridades",
        `
          <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#475569">
            Os principais achados foram organizados em uma ordem sugerida de atenção, considerando criticidade e contexto do ambiente.
          </p>
          ${priorityPlanHtml}
        `,
      )}

      ${section(
        "3 achados que mais importam",
        findingsHtml,
      )}

      ${section(
        "Regras críticas acionadas",
        criticalRulesHtml,
      )}

      ${section(
        "Preparação comercial",
        `
          <p style="
            margin:0 0 14px;
            font-size:13px;
            line-height:1.6;
            color:#475569;
          ">
            Estes indicadores servem apenas para preparar a conversa do Account Manager.
            Eles não aparecem no relatório do cliente e não representam recomendação automática de produto.
          </p>

          ${opportunityBlocks}
        `,
      )}

      ${section(
        "Firewall · dados para reunião",
        table([
          [
            "Usuários",
            firewallSnapshot.users,
          ],

          [
            "Dispositivos",
            firewallSnapshot.devices,
          ],

          [
            "Unidades",
            firewallSnapshot.sites,
          ],

          [
            "Links",
            links,
          ],

          [
            "Tecnologia atual",
            firewallTechnology,
          ],

          [
            "Gestão",
            firewallSnapshot.management,
          ],

          [
            "Relatórios",
            firewallSnapshot.reporting,
          ],

          [
            "Monitoramento 24x7",
            firewallSnapshot.monitoring24x7,
          ],

          [
            "Acessos remotos",
            firewallSnapshot.vpnRemote,
          ],

          [
            "VPN entre unidades",
            firewallSnapshot.vpnSite,
          ],

          [
            "VLANs",
            firewallSnapshot.vlans,
          ],

          [
            "Proteção contra ameaças",
            a.firewallThreatPrevention,
          ],

          [
            "Licenciamento ativo",
            a.firewallLicense,
          ],
        ]),
      )}

      ${section(
        "Endpoint · dados para reunião",
        table([
          [
            "Quantidade elegível",
            endpointSnapshot.quantity,
          ],

          [
            "Solução atual",
            endpointTechnology,
          ],

          [
            "Nível atual",
            endpointSnapshot.protectionLevel,
          ],

          [
            "Gestão central",
            a.endpointCentralManagement,
          ],

          [
            "Resposta aos alertas",
            endpointSnapshot.response,
          ],

          [
            "Atualizações automáticas",
            a.autoUpdates,
          ],

          [
            "Inventário",
            a.assetInventory,
          ],

          [
            "Gestão de vulnerabilidades",
            a.vulnerabilityManagement,
          ],
        ]),
      )}

      ${section(
        "Backup · dados para reunião",
        table([
          [
            "Servidores",
            backupSnapshot.servers,
          ],

          [
            "Volume aproximado",
            backupSnapshot.volumeGb
              ? `${backupSnapshot.volumeGb} GB`
              : "Não informado",
          ],

          [
            "Solução atual",
            backupTechnology,
          ],

          [
            "Responsável",
            backupSnapshot.responsibility,
          ],

          [
            "Onde estão os dados",
            a.dataLocation,
          ],

          [
            "Isolamento",
            backupSnapshot.isolation,
          ],

          [
            "Teste de restauração",
            backupSnapshot.restoreTests,
          ],

          [
            "Tempo tolerável de parada",
            a.maxDowntime,
          ],

          [
            "Impacto informado",
            a.operationalImpact,
          ],
        ]),
      )}

      ${section(
        "O que ainda falta confirmar",
        `
          <div style="
            border:1px solid #e2e8f0;
            border-radius:12px;
            padding:15px;
          ">
            <div style="
              font-size:13px;
              font-weight:700;
              color:#0f172a;
            ">
              Firewall
            </div>

            <div style="
              margin-top:5px;
              font-size:12px;
              line-height:1.55;
              color:#64748b;
            ">
              ${
                firewallReadiness
                  .missing.length
                  ? esc(
                      firewallReadiness
                        .missing.join(
                          ", ",
                        ),
                    )
                  : "Nenhuma pendência essencial identificada."
              }
            </div>

            <div style="
              margin-top:14px;
              font-size:13px;
              font-weight:700;
              color:#0f172a;
            ">
              Endpoint
            </div>

            <div style="
              margin-top:5px;
              font-size:12px;
              line-height:1.55;
              color:#64748b;
            ">
              ${
                endpointReadiness
                  .missing.length
                  ? esc(
                      endpointReadiness
                        .missing.join(
                          ", ",
                        ),
                    )
                  : "Nenhuma pendência essencial identificada."
              }
            </div>

            <div style="
              margin-top:14px;
              font-size:13px;
              font-weight:700;
              color:#0f172a;
            ">
              Backup
            </div>

            <div style="
              margin-top:5px;
              font-size:12px;
              line-height:1.55;
              color:#64748b;
            ">
              ${
                backupReadiness
                  .missing.length
                  ? esc(
                      backupReadiness
                        .missing.join(
                          ", ",
                        ),
                    )
                  : "Nenhuma pendência essencial identificada."
              }
            </div>
          </div>
        `,
      )}

      ${section(
        "Contexto do cliente",
        table([
          [
            "Dados pessoais / sensíveis",
            a.sensitiveData,
          ],

          [
            "Histórico de incidente",
            a.incidentHistory,
          ],

          [
            "Principal preocupação",
            a.mainConcern,
          ],

          [
            "Sistemas críticos",
            a.criticalSystems
              ?.length
              ? a.criticalSystems.join(
                  ", ",
                )
              : "Não informado",
          ],
        ]),
      )}

      ${section(
        "Cenário financeiro ilustrativo",
        table([
          [
            "Faixa calculada",
            `${money(
              r.impactRange[0],
            )} a ${money(
              r.impactRange[1],
            )}`,
          ],

          [
            "Pessoas consideradas",
            r.impactAssumptions
              .affectedPeople,
          ],

          [
            "Duração utilizada",
            `${r.impactAssumptions.hours}h`,
          ],

          [
            "Impacto operacional",
            r.impactAssumptions
              .operationalImpact,
          ],
        ]),
      )}

      <p style="
        margin:8px 0 0;
        font-size:11px;
        line-height:1.55;
        color:#94a3b8;
      ">
        ${esc(
          r.impactAssumptions
            .disclaimer,
        )}
      </p>

      ${section(
        "Metodologia e registro",
        table([
          [
            "Versão da metodologia",
            r.methodologyVersion ||
              ctx.methodologyVersion,
          ],

          [
            "Conclusão",
            new Date(
              ctx.completedAt,
            ).toLocaleString(
              "pt-BR",
            ),
          ],

          [
            "Cobertura",
            `${r.completeness}%`,
          ],

          [
            "Domínios avaliados",
            `${r.evaluatedDomains} de 4`,
          ],

          [
            "Assessment ID",
            ctx.assessmentId,
          ],
        ]),
      )}

      <p style="
        margin:24px 0 0;
        padding:13px 14px;
        background:#f1f5f9;
        border-radius:10px;
        font-size:12px;
        color:#475569;
        line-height:1.6;
      ">
        Este briefing é interno. O Security Assessment representa um diagnóstico inicial baseado nas informações fornecidas pelo respondente. Qualquer recomendação, dimensionamento ou proposta deverá ser validada pelo Account Manager e pela equipe técnica antes de apresentação ao cliente.
      </p>

    </div>
  </body>
</html>
  `;

  return {
    subject:
      `Novo Security Assessment | ${company}`,

    html,
  };
}