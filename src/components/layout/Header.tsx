"use client";

import { Button } from "@/components/ui/button";
import { useCartCount, useLogout, useSession } from "@/lib/client/hooks";
import { Menu, ShoppingCart, X } from "lucide-react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, memo } from "react";

// Throttle utility
function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastRan = 0;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastRan >= delay) {
      func.apply(this, args);
      lastRan = now;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastRan = Date.now();
      }, delay - (now - lastRan));
    }
  };
}

// Navigation items
const NAV_ITEMS = [
  { label: "홈", action: "scrollToTop" as const },
  { label: "뉴스", action: "news" as const },
  { label: "소개", action: "about" as const },
] as const;

// Cart Badge Component
const CartBadge = memo(({ count }: { count?: number }) => {
  if (!count || count <= 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
});

CartBadge.displayName = "CartBadge";

export function Header() {
  const { user, isAdmin, isLoading } = useSession();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { data: cartCount } = useCartCount();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Scroll detection with throttle
  useEffect(() => {
    const handleScroll = throttle(() => {
      setScrolled(window.scrollY > 50);
    }, 100);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Navigation handlers
  const scrollToSection = useCallback((sectionId: string) => {
    setMobileMenuOpen(false);
    if (pathname !== "/") {
      router.push(`/#${sectionId}`);
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, [pathname, router]);

  const scrollToTop = useCallback(() => {
    setMobileMenuOpen(false);
    if (pathname !== "/") {
      router.push("/");
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname, router]);

  const handleNavClick = useCallback((action: (typeof NAV_ITEMS)[number]["action"]) => {
    if (action === "scrollToTop") {
      scrollToTop();
    } else {
      scrollToSection(action);
    }
  }, [scrollToTop, scrollToSection]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Dynamic button intent
  const buttonIntent = useMemo(
    () => (scrolled ? "headerScrolled" : "header"),
    [scrolled]
  );

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
                  onClick={toggleMobileMenu}
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
                  {isAdmin && (
                    <Link href="/admin">
                      <Button intent={buttonIntent} size="sm">
                        ADMIN
                      </Button>
                    </Link>
                  )}
                  {NAV_ITEMS.map((item) => (
                    <Button
                      key={item.label}
                      intent={buttonIntent}
                      size="sm"
                      onClick={() => handleNavClick(item.action)}
                    >
                      {item.label}
                    </Button>
                  ))}
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
                  <Link href="/shop">
                    <Button intent={buttonIntent} size="sm">
                      굿즈샵
                    </Button>
                  </Link>
                  <Link href="/cart">
                    <Button intent={buttonIntent} size="sm" className="relative">
                      <ShoppingCart className="w-4 h-4" />
                      <CartBadge count={cartCount} />
                    </Button>
                  </Link>
                  {isLoading || isLoggingOut ? (
                    <div className="w-20 h-9 bg-neutral-200/20 rounded-xl animate-pulse" />
                  ) : user ? (
                    <>
                      <Link href="/mypage">
                        <Button intent={buttonIntent} size="sm">
                          마이페이지
                        </Button>
                      </Link>
                      <Button intent={buttonIntent} size="sm" onClick={() => logout()}>
                        로그아웃
                      </Button>
                    </>
                  ) : (
                    <Link href="/login">
                      <Button intent={buttonIntent} size="sm">
                        로그인
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Mobile Cart Button (Right) */}
                <Link href="/cart" className="md:hidden relative">
                  <Button intent={buttonIntent} size="sm" className="relative">
                    <ShoppingCart className="w-4 h-4" />
                    <CartBadge count={cartCount} />
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
          onClick={closeMobileMenu}
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
              onClick={closeMobileMenu}
              className="text-white"
              aria-label="메뉴 닫기"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex flex-col p-4 space-y-2">
            {isAdmin && (
              <>
                <Link href="/admin" onClick={closeMobileMenu}>
                  <Button
                    intent="headerScrolled"
                    size="sm"
                    className="w-full justify-start"
                  >
                    ADMIN
                  </Button>
                </Link>
                <div className="h-px bg-white/10 my-2" />
              </>
            )}
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.label}
                intent="headerScrolled"
                size="sm"
                onClick={() => handleNavClick(item.action)}
                className="w-full justify-start"
              >
                {item.label}
              </Button>
            ))}
            <div className="h-px bg-white/10 my-2" />
            <Link href="/shop" onClick={closeMobileMenu}>
              <Button
                intent="headerScrolled"
                size="sm"
                className="w-full justify-start"
              >
                굿즈샵
              </Button>
            </Link>
            <Link href="/cart" onClick={closeMobileMenu}>
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
                <Link href="/mypage" onClick={closeMobileMenu}>
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
                  onClick={() => logout()}
                  className="w-full justify-start"
                >
                  로그아웃
                </Button>
              </>
            ) : (
              <Link href="/login" onClick={closeMobileMenu}>
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
