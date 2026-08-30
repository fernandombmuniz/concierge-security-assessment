export type FirewallLevel =
  | 'none'
  | 'isp'
  | 'router'
  | 'utm'
  | 'ngfw'
  | 'managed_ngfw'
  | 'unknown';

export type EndpointLevel =
  | 'none'
  | 'basic_av'
  | 'business_av'
  | 'edr'
  | 'managed_edr'
  | 'unknown';

export type BackupLevel =
  | 'none'
  | 'manual'
  | 'automated_local'
  | 'cloud'
  | 'multi_copy'
  | 'managed'
  | 'unknown';

export type MonitoringLevel =
  | 'none'
  | 'reactive_it'
  | 'outsourced_it'
  | 'security_team'
  | 'soc'
  | 'unknown';

export type CapabilityLevel =
  | 'yes'
  | 'partial'
  | 'no'
  | 'unknown';

export type ProcessLevel =
  | 'formal'
  | 'informal'
  | 'none'
  | 'unknown';

export type InventoryLevel =
  | 'managed'
  | 'partial'
  | 'informal'
  | 'none'
  | 'unknown';

export type VulnerabilityLevel =
  | 'continuous'
  | 'regular'
  | 'occasional'
  | 'reactive'
  | 'none'
  | 'unknown';

export type BackupIsolationLevel =
  | 'immutable'
  | 'isolated'
  | 'separate_account'
  | 'same_environment'
  | 'none'
  | 'unknown';

export type EmailProtectionLevel =
  | 'advanced'
  | 'standard'
  | 'basic'
  | 'none'
  | 'unknown';

export type EndpointResponseLevel =
  | 'managed_soc'
  | 'defined_team'
  | 'alerts_only'
  | 'none'
  | 'unknown';

export type DataLocationLevel =
  | 'corporate_central'
  | 'mixed'
  | 'endpoints'
  | 'personal_cloud'
  | 'saas_only'
  | 'unknown';

export interface AssessmentData {
  companyName: string;
  sector: string;
  sectorOther: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;

  users: number;
  devices: number;
  itTeamSize: number;
  sites: number;

  internetLinkCount: number;
  links: { speedMbps: number }[];
  networkUsage: 'light' | 'medium' | 'high';

  firewallLevel: FirewallLevel;
  firewallVendor: string;
  firewallModel: string;
  firewallLicense: 'yes' | 'no' | 'unknown';

  vpnRemote: number;
  vpnSite: number;
  vlans: number;

  monitoring: MonitoringLevel;
  firewallThreatPrevention: CapabilityLevel;
  networkMaintenance: ProcessLevel;

  endpointLevel: EndpointLevel;
  endpointCount: number;
  servers: number;
  autoUpdates: 'yes' | 'no' | 'unknown';
  localAdmins: 'yes' | 'no' | 'unknown';
  byod: 'yes' | 'no' | 'unknown';

  endpointCentralManagement: CapabilityLevel;
  endpointResponse: EndpointResponseLevel;

  assetInventory: InventoryLevel;
  vulnerabilityManagement: VulnerabilityLevel;

  dataLocation: DataLocationLevel;

  backupLevel: BackupLevel;
  backupVolumeGb: number;
  restoreTests: 'regular' | 'once' | 'never' | 'unknown';
  maxDowntime: '4h' | '8h' | '1d' | '2d' | 'more' | 'unknown';
  backupIsolation: BackupIsolationLevel;

  mfa: 'yes' | 'partial' | 'no' | 'unknown';
  sharedAccounts: 'yes' | 'no' | 'unknown';
  offboarding: 'formal' | 'informal' | 'unknown';

  emailProtection: EmailProtectionLevel;
  incidentResponse: ProcessLevel;

  criticalSystems: string[];
  sensitiveData: 'yes' | 'no' | 'unknown';
  incidentHistory: 'yes' | 'no' | 'unknown';

  mainConcern: string;
  notes: string;
}

export const emptyAssessment: AssessmentData = {
  companyName: '',
  sector: '',
  sectorOther: '',
  contactName: '',
  contactRole: '',
  contactEmail: '',

  users: 0,
  devices: 0,
  itTeamSize: 0,
  sites: 1,

  internetLinkCount: 1,
  links: [{ speedMbps: 0 }],
  networkUsage: 'medium',

  firewallLevel: 'unknown',
  firewallVendor: '',
  firewallModel: '',
  firewallLicense: 'unknown',

  vpnRemote: 0,
  vpnSite: 0,
  vlans: 0,

  monitoring: 'unknown',
  firewallThreatPrevention: 'unknown',
  networkMaintenance: 'unknown',

  endpointLevel: 'unknown',
  endpointCount: 0,
  servers: 0,
  autoUpdates: 'unknown',
  localAdmins: 'unknown',
  byod: 'unknown',

  endpointCentralManagement: 'unknown',
  endpointResponse: 'unknown',

  assetInventory: 'unknown',
  vulnerabilityManagement: 'unknown',

  dataLocation: 'unknown',

  backupLevel: 'unknown',
  backupVolumeGb: 0,
  restoreTests: 'unknown',
  maxDowntime: 'unknown',
  backupIsolation: 'unknown',

  mfa: 'unknown',
  sharedAccounts: 'unknown',
  offboarding: 'unknown',

  emailProtection: 'unknown',
  incidentResponse: 'unknown',

  criticalSystems: [],
  sensitiveData: 'unknown',
  incidentHistory: 'unknown',

  mainConcern: '',
  notes: '',
};
