"use client";

import { Button } from "@/components/ui/button";
import { useLogout, useSession, useCartCount } from "@/hooks";
import { ShoppingCart } from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Header() {
  const { user, isLoading } = useSession();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: cartCount } = useCartCount();

  const handleLogout = () => {
    logout();
  };

  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 스크롤 이동 함수
  const scrollToSection = (sectionId: string) => {
    // 홈페이지가 아닌 경우 홈으로 이동 후 스크롤
    if (pathname !== "/") {
      router.push(`/#${sectionId}`);
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 최상단으로 이동
  const scrollToTop = () => {
    if (pathname !== "/") {
      router.push("/");
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={`sticky top-0 z-50 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
        scrolled ? "pt-3" : ""
      }`}
    >
      <nav
        className={`max-w-6xl mx-auto transition-all duration-300 ${
          scrolled ? "bg-[#1a1a2e] shadow-lg rounded-2xl" : "bg-transparent"
        }`}
      >
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-18">
            {/* Left Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                intent={scrolled ? "headerScrolled" : "header"}
                size="sm"
                onClick={scrollToTop}
              >
                홈
              </Button>
              <Button
                intent={scrolled ? "headerScrolled" : "header"}
                size="sm"
                onClick={() => scrollToSection("news")}
              >
                뉴스
              </Button>
              <Button
                intent={scrolled ? "headerScrolled" : "header"}
                size="sm"
                onClick={() => scrollToSection("about")}
              >
                소개
              </Button>
            </div>

            {/* Center Logo */}
            <button
              onClick={scrollToTop}
              className="absolute left-1/2 -translate-x-1/2"
            >
              <img
                src="/logo.svg"
                alt="Lucent Logo"
                width={30}
                height={41}
                className={`transition-all duration-300 ${
                  scrolled ? "brightness-0 invert" : "opacity-90"
                }`}
              />
            </button>

            {/* Right Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {/* 프로젝트 페이지 개발 중 - 임시 비활성화 */}
              {/* <Link href="/projects">
                <Button
                  intent={scrolled ? "headerScrolled" : "header"}
                  size="sm"
                >
                  프로젝트
                </Button>
              </Link> */}
              <Link href="/shop">
                <Button
                  intent={scrolled ? "headerScrolled" : "header"}
                  size="sm"
                >
                  굿즈샵
                </Button>
              </Link>
              <Link href="/cart">
                <Button
                  intent={scrolled ? "headerScrolled" : "header"}
                  size="sm"
                  className="relative"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount && cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Button>
              </Link>
              {isLoading || isLoggingOut ? (
                <div className="w-20 h-9 bg-neutral-200/20 rounded-xl animate-pulse" />
              ) : user ? (
                <>
                  <Link href="/mypage">
                    <Button
                      intent={scrolled ? "headerScrolled" : "header"}
                      size="sm"
                    >
                      마이페이지
                    </Button>
                  </Link>
                  <Button
                    intent={scrolled ? "headerScrolled" : "header"}
                    size="sm"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button
                    intent={scrolled ? "headerScrolled" : "header"}
                    size="sm"
                  >
                    로그인
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
