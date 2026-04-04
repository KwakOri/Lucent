"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useV2ShopCampaigns } from "@/lib/client/hooks";
import type { V2ShopCampaign } from "@/lib/client/api/v2-shop.api";

function parseIsoTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function isOngoingCampaign(campaign: V2ShopCampaign, now: Date): boolean {
  const startTimestamp = parseIsoTimestamp(campaign.starts_at);
  const endTimestamp = parseIsoTimestamp(campaign.ends_at);

  if (startTimestamp && startTimestamp > now.getTime()) {
    return false;
  }
  if (endTimestamp && endTimestamp < now.getTime()) {
    return false;
  }
  return true;
}

function formatDateRange(startsAt: string | null, endsAt: string | null): string {
  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const startTimestamp = parseIsoTimestamp(startsAt);
  const endTimestamp = parseIsoTimestamp(endsAt);
  const startLabel = startTimestamp
    ? dateFormatter.format(new Date(startTimestamp))
    : "상시";
  const endLabel = endTimestamp
    ? dateFormatter.format(new Date(endTimestamp))
    : "종료 시 안내";
  return `${startLabel} ~ ${endLabel}`;
}

export function PopupSection() {
  const { data: campaigns = [], isLoading, isError } = useV2ShopCampaigns({
    channel: "WEB",
  });

  const ongoingPopups = useMemo(() => {
    const now = new Date();
    return campaigns
      .filter((campaign) => campaign.campaign_type === "POPUP")
      .filter((campaign) => isOngoingCampaign(campaign, now))
      .sort((left, right) => {
        const leftTime = parseIsoTimestamp(left.starts_at) ?? 0;
        const rightTime = parseIsoTimestamp(right.starts_at) ?? 0;
        return rightTime - leftTime;
      });
  }, [campaigns]);

  return (
    <section id="popup" className="bg-[#f8fbff] px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-4xl font-bold text-[#1a1a2e]">POPUP</h2>
          <p className="text-lg text-[#1a1a2e]/70">현재 진행 중인 팝업을 확인해 보세요</p>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-[#d8e7f6] bg-white px-6 py-10 text-center text-[#1a1a2e]/60">
            진행 중인 팝업을 불러오는 중입니다.
          </div>
        ) : null}

        {!isLoading && isError ? (
          <div className="rounded-3xl border border-[#ffd8d8] bg-[#fff7f7] px-6 py-10 text-center text-[#ad3f3f]">
            팝업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : null}

        {!isLoading && !isError && ongoingPopups.length === 0 ? (
          <div className="rounded-3xl border border-[#d8e7f6] bg-white px-6 py-10 text-center text-[#1a1a2e]/60">
            현재 진행 중인 팝업이 없습니다.
          </div>
        ) : null}

        {!isLoading && !isError && ongoingPopups.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {ongoingPopups.map((popup) => {
              const popupPath = `/shop?campaign_id=${encodeURIComponent(popup.id)}`;
              return (
                <Link
                  key={popup.id}
                  href={popupPath}
                  className="group overflow-hidden rounded-3xl border border-[#cde0f3] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[12/5] bg-[#dceefe]">
                    {popup.shop_banner_public_url ? (
                      <img
                        src={popup.shop_banner_public_url}
                        alt={popup.shop_banner_alt_text || `${popup.name} 팝업 배너`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-xl font-semibold text-[#1a1a2e]/70">
                        {popup.name}
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-[#66B5F3] px-3 py-1 text-xs font-semibold text-white">
                      진행중
                    </span>
                  </div>

                  <div className="px-6 py-5">
                    <h3 className="mb-2 text-2xl font-bold text-[#1a1a2e]">{popup.name}</h3>
                    <p className="mb-3 line-clamp-2 text-sm text-[#1a1a2e]/65">
                      {popup.description || "루센트 팝업에서 아티스트 굿즈를 만나보세요."}
                    </p>
                    <p className="text-sm font-medium text-[#4a88b9]">
                      기간: {formatDateRange(popup.starts_at, popup.ends_at)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
