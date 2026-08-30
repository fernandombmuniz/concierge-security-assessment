import type { AssessmentData } from "@/types";

export const SECTION_FIELDS = {
  empresa: ["companyName","sector","sectorOther","contactName","contactRole","contactEmail","users","devices","itTeamSize","sites"],
  rede: ["internetLinkCount","links","networkUsage","firewallLevel","firewallVendor","firewallModel","firewallLicense","vpnRemote","vpnSite","vlans","monitoring","firewallThreatPrevention","networkMaintenance"],
  dispositivos: ["endpointLevel","endpointCount","servers","autoUpdates","localAdmins","byod","endpointCentralManagement","endpointResponse","assetInventory","vulnerabilityManagement", "endpointResponse"],
  continuidade: ["dataLocation","backupLevel","backupVolumeGb","restoreTests","maxDowntime","backupIsolation", "dataLocation"],
  acesso: ["mfa","sharedAccounts","offboarding","emailProtection","incidentResponse","criticalSystems","sensitiveData","incidentHistory","mainConcern","notes"],
} as const satisfies Record<string, readonly (keyof AssessmentData)[]>;

export type SectionKey = keyof typeof SECTION_FIELDS;

export function splitBySection(data: AssessmentData): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
    const answers: Record<string, unknown> = {};
    const record = data as unknown as Record<string, unknown>;
    for (const field of fields) answers[field] = record[field];
    out[section] = answers;
  }
  out["completo"] = { ...data } as unknown as Record<string, unknown>;
  return out;
}

export function summaryFromData(data: AssessmentData) {
  const sector = data.sector === "Outros" ? data.sectorOther || "Outros" : data.sector;
  return {
    company_name: data.companyName || null,
    sector: sector || null,
    respondent_name: data.contactName || null,
    respondent_role: data.contactRole || null,
    respondent_email: data.contactEmail || null,
    users_count: Number.isFinite(data.users) ? data.users : null,
    units_count: Number.isFinite(data.sites) ? data.sites : null,
  };
}
