import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-neutral-900 text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-bold mb-4">Lucent Management</h3>
            <p className="text-neutral-400 text-sm">
              숨겨진 감정과 목소리가 자연스럽게 드러나는 순간을 기록하는 레이블
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {/* 프로젝트 페이지 개발 중 - 임시 비활성화 */}
              {/* <li>
                <Link href="/projects" className="text-neutral-400 hover:text-white transition-colors text-sm">
                  프로젝트
                </Link>
              </li> */}
              <li>
                <Link href="/shop" className="text-neutral-400 hover:text-white transition-colors text-sm">
                  상점
                </Link>
              </li>
              <li>
                <Link href="/mypage" className="text-neutral-400 hover:text-white transition-colors text-sm">
                  마이페이지
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-neutral-400 hover:text-white transition-colors text-sm">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-neutral-400 hover:text-white transition-colors text-sm">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-neutral-800 pt-8 text-center">
          <p className="text-neutral-500 text-sm">
            © {new Date().getFullYear()} Lucent Management. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
