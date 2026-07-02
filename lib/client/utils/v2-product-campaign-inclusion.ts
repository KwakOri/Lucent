import type {
  V2Campaign,
  V2CampaignTarget,
} from '@/lib/client/api/v2-catalog-admin.api';

export type ProductDefaultCampaignOption = {
  projectId: string;
  campaignId: string;
  campaignName: string;
  excludedProductTargetId?: string | null;
};

function getIncludedProjectIds(
  campaign: V2Campaign,
  targets: V2CampaignTarget[],
): string[] {
  const projectIds = new Set<string>();
  if (campaign.project_id) {
    projectIds.add(campaign.project_id);
  }
  targets
    .filter((target) => !target.is_excluded && target.target_type === 'PROJECT')
    .forEach((target) => projectIds.add(target.target_id));
  return Array.from(projectIds);
}

export function buildDefaultCampaignOptions(params: {
  campaigns: V2Campaign[];
  targetsByCampaignId: Record<string, { targets: V2CampaignTarget[] }>;
  productId?: string | null;
}): ProductDefaultCampaignOption[] {
  const options = new Map<string, ProductDefaultCampaignOption>();

  params.campaigns
    .filter(
      (campaign) =>
        campaign.campaign_type === 'ALWAYS_ON' &&
        campaign.status !== 'ARCHIVED' &&
        !campaign.deleted_at,
    )
    .forEach((campaign) => {
      const targets = params.targetsByCampaignId[campaign.id]?.targets || [];
      const excludedProductTarget =
        params.productId
          ? targets.find(
              (target) =>
                target.is_excluded &&
                target.target_type === 'PRODUCT' &&
                target.target_id === params.productId,
            )
          : null;

      getIncludedProjectIds(campaign, targets).forEach((projectId) => {
        if (options.has(projectId)) {
          return;
        }
        options.set(projectId, {
          projectId,
          campaignId: campaign.id,
          campaignName: campaign.name,
          excludedProductTargetId: excludedProductTarget?.id || null,
        });
      });
    });

  return Array.from(options.values());
}

export function findDefaultCampaignOption(
  options: ProductDefaultCampaignOption[],
  projectId: string,
): ProductDefaultCampaignOption | null {
  return options.find((option) => option.projectId === projectId) || null;
}
