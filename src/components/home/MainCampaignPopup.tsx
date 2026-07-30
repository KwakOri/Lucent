'use client';

import { useEffect, useState } from 'react';

const DISMISS_STORAGE_KEY =
  'lucent:main-campaign-popup:b80cf948-d4a8-4e7e-8253-518b9b3aec7b:dismissed-date';
const TARGET_LINK =
  'https://www.lucentlabel.shop/shop?campaign_id=b80cf948-d4a8-4e7e-8253-518b9b3aec7b';
const BACKGROUND_IMAGE_SRC = '/popup_thumbnail_pukong.png';
const CAMPAIGN_START_AT = new Date('2026-07-30T18:00:00+09:00').getTime();
const CAMPAIGN_END_AT = new Date('2026-08-31T00:00:00+09:00').getTime();
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;
const KOREAN_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getKoreanDateKey(date = new Date()): string {
  const dateParts = KOREAN_DATE_FORMATTER.formatToParts(date);
  const year = dateParts.find(({ type }) => type === 'year')?.value;
  const month = dateParts.find(({ type }) => type === 'month')?.value;
  const day = dateParts.find(({ type }) => type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function isWithinCampaignPeriod(now = Date.now()): boolean {
  return now >= CAMPAIGN_START_AT && now < CAMPAIGN_END_AT;
}

export function MainCampaignPopup() {
  const [isWithinDisplayPeriod, setIsWithinDisplayPeriod] = useState(() =>
    isWithinCampaignPeriod(),
  );
  const [isClosed, setIsClosed] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    const todayKey = getKoreanDateKey();
    const dismissedDate = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    return dismissedDate === todayKey;
  });
  const [dismissForTodayOnClose, setDismissForTodayOnClose] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const syncCampaignPeriod = () => {
      const now = Date.now();
      setIsWithinDisplayPeriod(isWithinCampaignPeriod(now));

      const nextBoundary =
        now < CAMPAIGN_START_AT
          ? CAMPAIGN_START_AT
          : now < CAMPAIGN_END_AT
            ? CAMPAIGN_END_AT
            : null;

      if (nextBoundary !== null) {
        timeoutId = window.setTimeout(
          syncCampaignPeriod,
          Math.min(nextBoundary - now, MAX_TIMEOUT_DELAY_MS),
        );
      }
    };

    syncCampaignPeriod();

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleClose = () => {
    if (dismissForTodayOnClose) {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, getKoreanDateKey());
    } else {
      window.localStorage.removeItem(DISMISS_STORAGE_KEY);
    }
    setIsClosed(true);
  };

  if (!isWithinDisplayPeriod || isClosed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4">
      <div
        className="relative aspect-square overflow-hidden rounded-2xl shadow-2xl"
        style={{
          width: 'min(600px, calc(100vw - 2rem), calc(100dvh - 2rem))',
        }}
      >
        <label className="absolute left-3 top-3 z-20 flex cursor-pointer items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-sm font-medium text-white">
          <input
            type="checkbox"
            checked={dismissForTodayOnClose}
            onChange={(event) =>
              setDismissForTodayOnClose(event.target.checked)
            }
            className="h-4 w-4 cursor-pointer accent-white"
            aria-label="하루동안 보지않기"
          />
          <span>하루동안 보지않기</span>
        </label>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-20 h-8 w-8 cursor-pointer rounded-full bg-black/50 text-lg font-semibold text-white"
          aria-label="팝업 닫기"
        >
          ×
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element -- project policy uses native img instead of next/image. */}
        <img
          src={BACKGROUND_IMAGE_SRC}
          alt="푸콩이 첫 번째 생일 굿즈 팝업"
          className="h-full w-full object-contain"
        />

        <a
          href={TARGET_LINK}
          className="absolute bottom-6 right-5 z-10 h-14 w-56 cursor-pointer"
          aria-label="캠페인 페이지로 이동"
        />
      </div>
    </div>
  );
}
