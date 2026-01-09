"use client";

import { Button } from "@/components/ui/button";
import { useCartCount, useLogout, useSession } from "@/lib/client/hooks";
import { Menu, ShoppingCart, X } from "lucide-react";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition =
        window.scrollY || document.documentElement.scrollTop;
      console.log("scrollPosition => ", scrollPosition);
      setScrolled(scrollPosition > 50);
    };

    // 초기 스크롤 위치 확인
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 스크롤 이동 함수
  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
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
    setMobileMenuOpen(false);
    if (pathname !== "/") {
      router.push("/");
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-transparent pt-3" : "bg-[#f9f9ed]"
        }`}
      >
        <div className="px-4 sm:px-6 lg:px-8">
          <nav
            className={`max-w-6xl mx-auto transition-all duration-300 ${
              scrolled ? "bg-[#1a1a2e] shadow-lg rounded-2xl" : "bg-transparent"
            }`}
          >
            <div className="px-4 sm:px-6">
              <div className="flex items-center justify-between h-18">
                {/* Mobile Menu Button (Left) */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden z-10"
                  aria-label="메뉴 열기"
                >
                  <Menu
                    className={`w-6 h-6 ${
                      scrolled ? "text-white" : "text-[#1a1a2e]"
                    }`}
                  />
                </button>

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
                          {cartCount > 99 ? "99+" : cartCount}
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

                {/* Mobile Cart Button (Right) */}
                <Link href="/cart" className="md:hidden relative">
                  <Button
                    intent={scrolled ? "headerScrolled" : "header"}
                    size="sm"
                    className="relative"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {cartCount && cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Menu Sidebar */}
      <div
        className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Sidebar */}
        <div
          className={`absolute top-0 left-0 h-full w-64 bg-[#1a1a2e] shadow-xl transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <img
              src="/logo.svg"
              alt="Lucent Logo"
              width={24}
              height={33}
              className="brightness-0 invert"
            />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-white"
              aria-label="메뉴 닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col p-4 space-y-2">
            <Button
              intent="headerScrolled"
              size="sm"
              onClick={scrollToTop}
              className="w-full justify-start"
            >
              홈
            </Button>
            <Button
              intent="headerScrolled"
              size="sm"
              onClick={() => scrollToSection("news")}
              className="w-full justify-start"
            >
              뉴스
            </Button>
            <Button
              intent="headerScrolled"
              size="sm"
              onClick={() => scrollToSection("about")}
              className="w-full justify-start"
            >
              소개
            </Button>
            <div className="h-px bg-white/10 my-2" />
            <Link href="/shop" onClick={() => setMobileMenuOpen(false)}>
              <Button
                intent="headerScrolled"
                size="sm"
                className="w-full justify-start"
              >
                굿즈샵
              </Button>
            </Link>
            <Link href="/cart" onClick={() => setMobileMenuOpen(false)}>
              <Button
                intent="headerScrolled"
                size="sm"
                className="w-full justify-start relative"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                장바구니
                {cartCount && cartCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Button>
            </Link>
            <div className="h-px bg-white/10 my-2" />
            {isLoading || isLoggingOut ? (
              <div className="w-full h-9 bg-white/20 rounded-xl animate-pulse" />
            ) : user ? (
              <>
                <Link href="/mypage" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    intent="headerScrolled"
                    size="sm"
                    className="w-full justify-start"
                  >
                    마이페이지
                  </Button>
                </Link>
                <Button
                  intent="headerScrolled"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start"
                >
                  로그아웃
                </Button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  intent="headerScrolled"
                  size="sm"
                  className="w-full justify-start"
                >
                  로그인
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
