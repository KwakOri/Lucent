import { redirect } from 'next/navigation';

export default function AdminShippingPage() {
  redirect('/admin/production-shipping?tab=shipping-candidates');
}
