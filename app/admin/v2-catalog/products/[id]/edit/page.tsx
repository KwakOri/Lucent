import { redirect } from 'next/navigation';

export default async function V2CatalogProductEditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { id } = await params;
  redirect(`/admin/v2-catalog/products/${id}`);
}
