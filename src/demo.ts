import {AssessmentData,emptyAssessment} from './types';
export const demoAssessment:AssessmentData={...emptyAssessment,
 companyName:'Empresa Demo SMB',sector:'Serviços',contactName:'Cliente Demo',contactRole:'Gestor',contactEmail:'demo@empresa.com',users:20,devices:26,sites:1,
 internetLinkCount:3,links:[{speedMbps:500}],networkUsage:'light',firewallLevel:'router',firewallVendor:'MikroTik',firewallLicense:'unknown',vpnRemote:2,vpnSite:1,vlans:3,monitoring:'reactive_it',
 endpointLevel:'business_av',endpointCount:26,servers:2,autoUpdates:'yes',localAdmins:'yes',byod:'no',
 backupLevel:'cloud',backupVolumeGb:700,restoreTests:'once',maxDowntime:'1d',
 mfa:'partial',sharedAccounts:'yes',offboarding:'informal',sensitiveData:'yes',incidentHistory:'no',mainConcern:'Ransomware e indisponibilidade',notes:'Cenário fictício para validação local da interface.'
};
