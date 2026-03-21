import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-[800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button intent="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-xl p-8 md:p-12 border border-neutral-200">
          {/* Page Title */}
          <div className="mb-8 pb-6 border-b border-neutral-200">
            <h1 className="text-4xl font-bold text-text-primary mb-2">
              이용약관
            </h1>
            <p className="text-sm text-text-secondary">
              최종 수정일: 2026년 2월 18일
            </p>
          </div>

          {/* Terms Content */}
          <div className="space-y-8 text-text-primary">
            <section>
              <h2 className="text-2xl font-bold mb-4">제1조 (목적)</h2>
              <p className="leading-relaxed text-text-secondary">
                본 약관은 Lucent Management(이하 &quot;회사&quot;)가 제공하는 서비스의
                이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">제2조 (용어의 정의)</h2>
              <div className="space-y-2 text-text-secondary">
                <p>1. &quot;서비스&quot;란 회사가 제공하는 모든 서비스를 의미합니다.</p>
                <p>
                  2. &quot;회원&quot;이란 본 약관에 동의하고 회원가입을 한 자를 말합니다.
                </p>
                <p>
                  3. &quot;디지털 상품&quot;이란 보이스팩 등 디지털 형태로 제공되는 상품을
                  말합니다.
                </p>
                <p>
                  4. &quot;실물 굿즈&quot;이란 물리적 형태로 제공되는 상품을 말합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">
                제3조 (약관의 효력 및 변경)
              </h2>
              <div className="space-y-2 text-text-secondary">
                <p>
                  1. 본 약관은 서비스를 이용하고자 하는 모든 회원에 대하여 그
                  효력을 발생합니다.
                </p>
                <p>
                  2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본
                  약관을 변경할 수 있습니다.
                </p>
                <p>
                  3. 약관이 변경되는 경우 회사는 변경사항을 시행일자 7일 전부터
                  공지합니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">
                제4조 (서비스의 제공 및 변경)
              </h2>
              <div className="space-y-2 text-text-secondary">
                <p>1. 회사는 다음과 같은 서비스를 제공합니다:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>디지털 상품(보이스팩 등) 판매</li>
                  <li>실물 굿즈 판매</li>
                  <li>프로젝트 정보 제공</li>
                </ul>
                <p>
                  2. 회사는 상당한 이유가 있는 경우 운영상, 기술상의 필요에 따라
                  제공하고 있는 서비스를 변경할 수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">제5조 (회원가입)</h2>
              <div className="space-y-2 text-text-secondary">
                <p>
                  1. 회원가입은 이용자가 약관의 내용에 동의하고, 회사가 정한
                  양식에 따라 회원정보를 기입하여 회원가입 신청을 하고 회사가
                  이를 승낙함으로써 체결됩니다.
                </p>
                <p>
                  2. 회사는 다음 각 호에 해당하는 신청에 대해서는 승낙을 하지
                  않거나 사후에 이용계약을 해지할 수 있습니다:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>타인의 명의를 도용한 경우</li>
                  <li>허위 정보를 기재한 경우</li>
                  <li>관련 법령을 위반한 경우</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">
                제6조 (개인정보의 보호)
              </h2>
              <p className="leading-relaxed text-text-secondary">
                회사는 관련 법령이 정하는 바에 따라 회원의 개인정보를
                보호하기 위해 노력합니다. 개인정보의 보호 및 사용에 대해서는{' '}
                <Link
                  href="/privacy"
                  className="text-primary-500 hover:text-primary-600 underline"
                >
                  개인정보처리방침
                </Link>
                이 적용됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">제7조 (구매 및 결제)</h2>
              <div className="space-y-2 text-text-secondary">
                <p>1. 본 서비스는 계좌이체를 통한 결제만 지원합니다.</p>
                <p>2. 주문 후 안내된 계좌로 입금하셔야 합니다.</p>
                <p>
                  3. 입금 확인은 관리자가 수동으로 진행하며, 영업일 기준 1-3일
                  소요될 수 있습니다.
                </p>
                <p>
                  4. 입금 확인 후 디지털 상품은 즉시 다운로드 가능하며, 실물
                  굿즈는 제작 및 배송이 시작됩니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">제8조 (환불 및 취소)</h2>
              <div className="space-y-2 text-text-secondary">
                <p>
                  1. 디지털 상품은 결제 완료 후 즉시 이용 가능한 콘텐츠로,
                  전자상거래법 제17조 제2항에 따라 청약철회(환불)가 제한됩니다.
                </p>
                <p>
                  2. 실물 굿즈는 제작 시작 전 단계에서만 취소 가능하며, 제작이
                  시작된 이후에는 취소가 불가능합니다.
                </p>
                <p>
                  3. 상세한 배송/교환/반품 및 환불 기준은{' '}
                  <Link
                    href="/policy"
                    className="text-primary-500 hover:text-primary-600 underline"
                  >
                    배송/교환/환불 정책
                  </Link>
                  을 따릅니다.
                </p>
                <p>
                  4. 상품 하자 또는 오배송의 경우 동일 상품 교환을 우선으로
                  처리하며, 교환이 어려운 경우 환불 처리됩니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">제9조 (책임 제한)</h2>
              <div className="space-y-2 text-text-secondary">
                <p>
                  1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여
                  서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이
                  면제됩니다.
                </p>
                <p>
                  2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여
                  책임을 지지 않습니다.
                </p>
                <p>
                  3. 회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지
                  못하거나 상실한 것에 대하여 책임을 지지 않습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">제10조 (분쟁 해결)</h2>
              <div className="space-y-2 text-text-secondary">
                <p>
                  1. 회사와 회원 간 발생한 분쟁에 관한 소송은 민사소송법상의
                  관할법원에 제소합니다.
                </p>
                <p>
                  2. 회사와 회원 간 제기된 소송에는 대한민국 법을 적용합니다.
                </p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-neutral-200 flex justify-center gap-4">
            <Link href="/">
              <Button intent="primary">홈으로 돌아가기</Button>
            </Link>
            <Link href="/privacy">
              <Button intent="secondary">개인정보처리방침 보기</Button>
            </Link>
            <Link href="/policy">
              <Button intent="secondary">배송/교환/환불 정책 보기</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
