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
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Page Content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
