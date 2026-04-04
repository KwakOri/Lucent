import { redirect } from 'next/navigation';

export default function AdminProductionPage() {
  redirect('/admin/production-shipping?tab=production-candidates');
}
