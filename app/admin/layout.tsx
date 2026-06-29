import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/server/utils/supabase';
import { AdminSidebar } from '@/src/components/admin/AdminSidebar';

export const metadata = {
  title: 'Admin - Lucent Management',
  description: 'Lucent Management 관리자 페이지',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. 로그인 확인
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirect=/admin');
  }

  // 2. 관리자 권한 확인
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-[#f9f9ed] text-[#1a1a2e]">
      <AdminSidebar />

      <div className="lg:pl-28">
        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
