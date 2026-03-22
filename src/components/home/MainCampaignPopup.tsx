'use client';

import { useState } from 'react';

const DISMISS_STORAGE_KEY = 'lucent:main-campaign-popup-dismissed-date';
const TARGET_LINK =
  'https://www.lucentlabel.shop/shop?campaign_id=7769084e-ddf0-4dd0-b462-3b9592e38410';
const BACKGROUND_IMAGE_SRC = '/popup_image.png';

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function MainCampaignPopup() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const todayKey = getTodayKey();
    const dismissedDate = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    return dismissedDate !== todayKey;
  });
  const [dismissForTodayOnClose, setDismissForTodayOnClose] = useState(false);

  const handleClose = () => {
    if (dismissForTodayOnClose) {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, getTodayKey());
    } else {
      window.localStorage.removeItem(DISMISS_STORAGE_KEY);
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4">
      <div className="relative h-[600px] w-[600px] max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-2xl">
        <label className="absolute left-3 top-3 z-20 flex cursor-pointer items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-sm font-medium text-white">
          <input
            type="checkbox"
            checked={dismissForTodayOnClose}
            onChange={(event) => setDismissForTodayOnClose(event.target.checked)}
            className="h-4 w-4 cursor-pointer accent-white"
            aria-label="하루동안 보지않기"
          />
          <span>하루동안 보지않기</span>
        </label>

        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-20 h-8 w-8 rounded-full bg-black/50 text-lg font-semibold text-white cursor-pointer"
          aria-label="팝업 닫기"
        >
          ×
        </button>

        <img
          src={BACKGROUND_IMAGE_SRC}
          alt="메인 캠페인 팝업"
          className="h-full w-full object-cover"
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
