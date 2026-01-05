import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Lucent Management",
  description:
    "숨겨진 감정과 목소리가 자연스럽게 드러나는 순간을 기록하는 레이블",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`antialiased`}>
        <Providers>{children}</Providers>
        <div id="modal-root" />
        <div id="toast-root" />
      </body>
    </html>
  );
}
