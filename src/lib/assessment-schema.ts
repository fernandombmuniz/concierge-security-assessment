import { z } from "zod";
import { emptyAssessment, type AssessmentData } from "@/types";

const text = (max = 500) => z.string().max(max).catch("");
const num = z.coerce.number().finite().min(0).max(10_000_000).catch(0);
const enumOf = <T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.enum(values).catch(fallback as never);

/** Valida/normaliza no servidor o mesmo formato usado pelo formulário. */
export const assessmentDataSchema = z.object({
  companyName: text(200),
  sector: text(120),
  sectorOther: text(120),
  contactName: text(160),
  contactRole: text(160),
  contactEmail: text(200),
  users: num,
  devices: num,
  itTeamSize: num,
  sites: num,

  internetLinkCount: num,
  links: z.array(z.object({ speedMbps: num })).max(20).catch([{ speedMbps: 0 }]),
  networkUsage: enumOf(["light", "medium", "high"], "medium"),
  firewallLevel: enumOf(
    ["none", "isp", "router", "utm", "ngfw", "managed_ngfw", "unknown"],
    "unknown",
  ),
  firewallVendor: text(120),
  firewallModel: text(120),
  firewallLicense: enumOf(["yes", "no", "unknown"], "unknown"),
  vpnRemote: num,
  vpnSite: num,
  vlans: num,
  monitoring: enumOf(
    ["none", "reactive_it", "outsourced_it", "security_team", "soc", "unknown"],
    "unknown",
  ),

  endpointLevel: enumOf(
    ["none", "basic_av", "business_av", "edr", "managed_edr", "unknown"],
    "unknown",
  ),
  endpointCount: num,
  servers: num,
  autoUpdates: enumOf(["yes", "no", "unknown"], "unknown"),
  localAdmins: enumOf(["yes", "no", "unknown"], "unknown"),
  byod: enumOf(["yes", "no", "unknown"], "unknown"),

  backupLevel: enumOf(
    ["none", "manual", "automated_local", "cloud", "multi_copy", "managed", "unknown"],
    "unknown",
  ),
  backupVolumeGb: num,
  restoreTests: enumOf(["regular", "once", "never", "unknown"], "unknown"),
  maxDowntime: enumOf(["4h", "8h", "1d", "2d", "more", "unknown"], "unknown"),

  mfa: enumOf(["yes", "partial", "no", "unknown"], "unknown"),
  sharedAccounts: enumOf(["yes", "no", "unknown"], "unknown"),
  offboarding: enumOf(["formal", "informal", "unknown"], "unknown"),

  criticalSystems: z.array(z.string().max(160)).max(50).catch([]),
  sensitiveData: enumOf(["yes", "no", "unknown"], "unknown"),
  incidentHistory: enumOf(["yes", "no", "unknown"], "unknown"),
  mainConcern: text(500),
  notes: text(4000),
});

export function parseAssessmentData(input: unknown): AssessmentData {
  const merged = { ...emptyAssessment, ...(typeof input === "object" && input ? input : {}) };
  return assessmentDataSchema.parse(merged) as AssessmentData;
}
