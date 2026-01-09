import { Header, Footer } from "@/components/layout";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <div className="w-full overflow-x-hidden">
        {children}
      </div>
      <Footer />
    </>
  );
}
