'use client';

import dynamic from 'next/dynamic';

const MainCampaignPopup = dynamic(
  () =>
    import('@/components/home/MainCampaignPopup').then(
      (module) => module.MainCampaignPopup
    ),
  { ssr: false }
);

export function MainCampaignPopupClient() {
  return <MainCampaignPopup />;
}
