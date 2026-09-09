import { z } from 'zod';
import {
  emptyAssessment,
  type AssessmentData,
} from '@/types';

const text = (max = 500) =>
  z.string().max(max).catch('');

const num = z.coerce
  .number()
  .finite()
  .min(0)
  .max(10_000_000)
  .catch(0);

const enumOf = <
  T extends readonly [
    string,
    ...string[],
  ],
>(
  values: T,
  fallback: T[number],
) =>
  z
    .enum(values)
    .catch(
      fallback as never,
    );

/**
 * Valida e normaliza o mesmo formato
 * utilizado pelo formulário do Security Assessment.
 *
 * Importante:
 * O Zod remove campos desconhecidos por padrão.
 * Por isso todos os campos V4.1 usados pelo scoring,
 * relatório e briefing interno precisam existir aqui.
 */
export const assessmentDataSchema =
  z.object({
    /**
     * EMPRESA E CONTATO
     */
    companyName:
      text(200),

    sector:
      text(120),

    sectorOther:
      text(120),

    contactName:
      text(160),

    contactRole:
      text(160),

    contactEmail:
      text(200),

    users:
      num,

    devices:
      num,

    itTeamSize:
      num,

    sites:
      num,

    /**
     * INTERNET E REDE
     */
    internetLinkCount:
      num,

    links: z
      .array(
        z.object({
          speedMbps:
            num,
        }),
      )
      .max(20)
      .catch([
        {
          speedMbps: 0,
        },
      ]),

    networkUsage:
      enumOf(
        [
          'light',
          'medium',
          'high',
        ],
        'medium',
      ),

    firewallLevel:
      enumOf(
        [
          'none',
          'isp',
          'router',
          'utm',
          'ngfw',
          'managed_ngfw',
          'unknown',
        ],
        'unknown',
      ),

    firewallVendor:
      text(120),

    firewallModel:
      text(120),

    firewallLicense:
      enumOf(
        [
          'yes',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    firewallManagement:
      enumOf(
        [
          'internal',
          'outsourced',
          'isp',
          'shared',
          'unmanaged',
          'unknown',
        ],
        'unknown',
      ),

    firewallReporting:
      enumOf(
        [
          'periodic',
          'on_demand',
          'incident_only',
          'none',
          'unknown',
        ],
        'unknown',
      ),

    firewallMonitoring24x7:
      enumOf(
        [
          'yes',
          'partial',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    vpnRemote:
      num,

    vpnSite:
      num,

    vlans:
      num,

    monitoring:
      enumOf(
        [
          'none',
          'reactive_it',
          'outsourced_it',
          'security_team',
          'soc',
          'unknown',
        ],
        'unknown',
      ),

    firewallThreatPrevention:
      enumOf(
        [
          'yes',
          'partial',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    networkMaintenance:
      enumOf(
        [
          'formal',
          'informal',
          'none',
          'unknown',
        ],
        'unknown',
      ),

    /**
     * COMPUTADORES / ENDPOINT
     *
     * O formulário V4.1 pergunta apenas se existe proteção.
     * A classificação efetiva é inferida depois no scoring.
     *
     * Mantemos os valores antigos para compatibilidade
     * com assessments já salvos.
     */
    endpointLevel:
      enumOf(
        [
          'none',
          'basic_av',
          'business_av',
          'edr',
          'managed_edr',
          'unknown',
        ],
        'unknown',
      ),

    endpointVendor:
      text(120),

    endpointProduct:
      text(180),

    endpointCount:
      num,

    servers:
      num,

    autoUpdates:
      enumOf(
        [
          'yes',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    localAdmins:
      enumOf(
        [
          'yes',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    byod:
      enumOf(
        [
          'yes',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    endpointCentralManagement:
      enumOf(
        [
          'yes',
          'partial',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    endpointResponse:
      enumOf(
        [
          'managed_soc',
          'defined_team',
          'alerts_only',
          'none',
          'unknown',
        ],
        'unknown',
      ),

    assetInventory:
      enumOf(
        [
          'managed',
          'partial',
          'informal',
          'none',
          'unknown',
        ],
        'unknown',
      ),

    vulnerabilityManagement:
      enumOf(
        [
          'continuous',
          'regular',
          'occasional',
          'reactive',
          'none',
          'unknown',
        ],
        'unknown',
      ),

    /**
     * DADOS E BACKUP
     */
    dataLocation:
      enumOf(
        [
          'corporate_central',
          'mixed',
          'endpoints',
          'personal_cloud',
          'saas_only',
          'unknown',
        ],
        'unknown',
      ),

    backupLevel:
      enumOf(
        [
          'none',
          'manual',
          'automated_local',
          'cloud',
          'multi_copy',
          'managed',
          'unknown',
        ],
        'unknown',
      ),

    backupVendor:
      text(120),

    backupProduct:
      text(180),

    backupResponsibility:
      enumOf(
        [
          'internal',
          'outsourced',
          'shared',
          'nobody',
          'unknown',
        ],
        'unknown',
      ),

    backupVolumeGb:
      num,

    restoreTests:
      enumOf(
        [
          'regular',
          'once',
          'never',
          'unknown',
        ],
        'unknown',
      ),

    maxDowntime:
      enumOf(
        [
          '4h',
          '8h',
          '1d',
          '2d',
          'more',
          'unknown',
        ],
        'unknown',
      ),

    backupIsolation:
      enumOf(
        [
          'immutable',
          'isolated',
          'separate_account',
          'same_environment',
          'none',
          'unknown',
        ],
        'unknown',
      ),

    operationalImpact:
      enumOf(
        [
          'low',
          'partial',
          'major',
          'halt',
          'unknown',
        ],
        'unknown',
      ),

    /**
     * CONTAS, IDENTIDADE E RESPOSTA
     */
    mfa:
      enumOf(
        [
          'yes',
          'partial',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    sharedAccounts:
      enumOf(
        [
          'yes',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    offboarding:
      enumOf(
        [
          'formal',
          'informal',
          'unknown',
        ],
        'unknown',
      ),

    emailProtection:
      enumOf(
        [
          'advanced',
          'standard',
          'basic',
          'none',
          'unknown',
        ],
        'unknown',
      ),

    incidentResponse:
      enumOf(
        [
          'formal',
          'informal',
          'none',
          'unknown',
        ],
        'unknown',
      ),

    criticalSystems:
      z
        .array(
          z
            .string()
            .max(160),
        )
        .max(50)
        .catch([]),

    sensitiveData:
      enumOf(
        [
          'yes',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    incidentHistory:
      enumOf(
        [
          'yes',
          'no',
          'unknown',
        ],
        'unknown',
      ),

    mainConcern:
      text(500),

    notes:
      text(4000),
  });

export function parseAssessmentData(
  input: unknown,
): AssessmentData {
  const merged = {
    ...emptyAssessment,
    ...(typeof input ===
      'object' &&
    input
      ? input
      : {}),
  };

  return assessmentDataSchema.parse(
    merged,
  ) as AssessmentData;
}
