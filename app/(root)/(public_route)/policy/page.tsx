import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-[900px] mx-auto">
        <div className="mb-8">
          <Link href="/">
            <Button intent="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl p-8 md:p-12 border border-neutral-200">
          <div className="mb-8 pb-6 border-b border-neutral-200">
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              배송/교환/환불 정책
            </h1>
            <p className="text-sm text-text-secondary">
              최종 수정일: 2026년 2월 18일
            </p>
          </div>

          <div className="space-y-10 text-text-primary">
            <section className="space-y-6">
              <h2 className="text-2xl font-bold">📦 배송 안내</h2>

              <div>
                <h3 className="text-lg font-semibold mb-2">1. 배송 방식</h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>• 모든 실물 상품은 우체국 택배를 통해 배송됩니다.</li>
                  <li>
                    • 상품은 결제 완료 후 순차적으로 제작 및 출고됩니다.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  2. 제작 및 배송 기간
                </h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>
                    • 대부분의 상품은 주문 제작 방식으로 운영됩니다.
                  </li>
                  <li>• 기본 제작 기간은 약 2주 소요됩니다.</li>
                  <li>
                    • 제작 완료 후, 영업일 기준 약 5일 이내 배송됩니다.
                  </li>
                  <li>
                    • 영업일은 주말 및 공휴일을 제외한 평일 기준입니다.
                  </li>
                  <li>
                    • 상품 종류 및 제작 상황에 따라 일정은 변동될 수 있습니다.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">3. 배송비 안내</h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>• 기본 배송비: 3,500원</li>
                  <li>• 제주 지역 추가 배송비: 3,000원</li>
                  <li>
                    • 제주 외 도서산간 지역 추가 배송비: 5,000원
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-bold">
                🔄 교환 및 반품 안내 (실물 상품)
              </h2>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  1. 주문 취소 가능 시점
                </h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>
                    • 상품이 제작 단계에 들어가기 전까지 취소 가능합니다.
                  </li>
                  <li>• 제작이 시작된 이후에는 취소가 불가능합니다.</li>
                  <li>• 부분 취소는 불가합니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  2. 단순 변심에 의한 취소/반품
                </h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>• 제작 전 단계: 전액 환불 가능</li>
                  <li>• 제작 시작 이후: 환불 불가</li>
                  <li>
                    • 맞춤 제작 상품 특성상 단순 변심으로 인한 반품은 제한됩니다.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  3. 상품 불량 및 오배송
                </h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>
                    • 상품 하자 또는 오배송의 경우 교환을 우선으로 처리합니다.
                  </li>
                  <li>
                    • 동일 상품 교환이 어려운 경우 환불 처리됩니다.
                  </li>
                  <li>• 해당 배송비는 당사가 부담합니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  4. 반품이 불가능한 경우
                </h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>• 사용 흔적이 있는 경우</li>
                  <li>• 상품 포장이 훼손된 경우</li>
                  <li>• 맞춤 제작 상품</li>
                  <li>
                    • 전자적 다운로드가 완료된 디지털 상품
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-6">
              <h2 className="text-2xl font-bold">
                💻 디지털 상품 환불 정책 (환불 불가 고지 강화형)
              </h2>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-900 mb-2">📌 중요 안내</p>
                <p className="text-red-800 leading-relaxed">
                  본 사이트에서 판매되는 디지털 상품(음원, 파일, 템플릿 등)은
                  구매 즉시 다운로드 또는 이용이 가능한 상품으로, 전자상거래법
                  제17조 제2항에 따른 청약철회가 제한되는 상품에 해당합니다.
                  구매 시 아래 내용에 동의한 것으로 간주됩니다.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">1. 환불 규정</h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>• 디지털 상품은 구매 완료 즉시 환불이 불가합니다.</li>
                  <li>• 다운로드 여부와 관계없이 환불이 불가합니다.</li>
                  <li>
                    • 구매 후 7일 이내 미다운로드 상태라도 환불이 불가합니다.
                  </li>
                  <li>• 크리에이터 정산 이후에도 환불은 불가합니다.</li>
                  <li>
                    • 단순 변심, 착오 구매, 기기 미호환 등의 사유로도 환불이
                    불가합니다.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  2. 주문 취소 가능 시점
                </h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>• 입금 확인 전까지 취소 가능합니다.</li>
                  <li>
                    • 입금 확인 및 결제 완료 이후에는 취소가 불가합니다.
                  </li>
                  <li>• 부분 취소는 불가합니다.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  3. 라이선스 및 이용 제한
                </h3>
                <ul className="space-y-1 text-text-secondary">
                  <li>
                    • 구매자는 개인 사용 범위 내에서만 이용 가능합니다.
                  </li>
                  <li>
                    • 무단 복제, 재배포, 공유, 상업적 재판매를 금지합니다.
                  </li>
                  <li>• 위반 시 법적 책임이 발생할 수 있습니다.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">🛑 취소 규정 요약</h2>
              <div className="overflow-x-auto">
                <table className="w-full border border-neutral-200 rounded-lg overflow-hidden text-sm">
                  <thead className="bg-neutral-100 text-text-primary">
                    <tr>
                      <th className="text-left px-4 py-3 border-b border-neutral-200">
                        상품 유형
                      </th>
                      <th className="text-left px-4 py-3 border-b border-neutral-200">
                        취소 가능 시점
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-text-secondary">
                    <tr>
                      <td className="px-4 py-3 border-b border-neutral-200">
                        실물 상품
                      </td>
                      <td className="px-4 py-3 border-b border-neutral-200">
                        제작 시작 전까지
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">디지털 상품</td>
                      <td className="px-4 py-3">입금 확인 전까지</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold">📞 고객센터 안내</h2>
              <ul className="space-y-1 text-text-secondary">
                <li>
                  • 교환 및 반품 접수는 공식 트위터 계정 DM을 통해 접수해주시기
                  바랍니다.
                </li>
                <li>• 문의는 순차적으로 답변드립니다.</li>
                <li>
                  • 운영 시간 외 접수 건은 다음 영업일에 처리됩니다.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold">⚖ 법적 고지</h2>
              <ul className="space-y-1 text-text-secondary">
                <li>
                  • 본 사이트는 「전자상거래 등에서의 소비자보호에 관한
                  법률」을 준수합니다.
                </li>
                <li>
                  • 디지털 상품은 동 법 제17조 제2항에 따라 청약철회가
                  제한됩니다.
                </li>
                <li>
                  • 사업자 정보 및 개인정보처리방침은 별도 페이지에서 확인하실
                  수 있습니다.
                </li>
              </ul>
            </section>

          </div>

          <div className="mt-12 pt-8 border-t border-neutral-200 flex flex-wrap gap-3">
            <Link href="/terms">
              <Button intent="secondary">이용약관</Button>
            </Link>
            <Link href="/privacy">
              <Button intent="secondary">개인정보처리방침</Button>
            </Link>
            <Link href="/">
              <Button intent="primary">홈으로 돌아가기</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
