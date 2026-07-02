import { redirect } from 'next/navigation';

type CampaignPricingRedirectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function V2CatalogCampaignPricingRedirectPage({
  params,
}: CampaignPricingRedirectPageProps) {
  const { id } = await params;
  redirect(`/admin/v2-catalog/campaigns/${id}`);
}
