import { redirect } from 'next/navigation';

type V2CatalogProductEditRedirectPageProps = {
  params: Promise<{ id: string }>;
};

export default async function V2CatalogProductEditRedirectPage({
  params,
}: V2CatalogProductEditRedirectPageProps) {
  const { id } = await params;
  redirect(`/admin/v2-catalog/products/${id}`);
}
