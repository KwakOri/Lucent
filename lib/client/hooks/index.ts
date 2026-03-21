/**
 * Hooks Index
 *
 * 모든 hooks를 한 곳에서 export
 */

// Query Keys
export { queryKeys } from './query-keys';

// Auth Hooks
export {
  useSession,
  useLogin,
  useSignup,
  useLogout,
  useSendVerification,
  useVerifyCode,
  useSignupWithToken,
  useResetPassword,
} from './useAuth';

// Product Hooks
export {
  useProducts,
  useProduct,
  useProductBySlug,
  usePlaySample,
  useMiruruProducts,
} from './useProducts';

// Order Hooks
export {
  useOrders,
  useOrder,
  useCreateOrder,
  useDownloadDigitalProduct,
  useMyOrders,
  useMyVoicePacks,
  useCancelOrder,
} from './useOrders';

// Project Hooks
export { useProjects, useProject, useProjectBySlug } from './useProjects';

// Profile Hooks
export { useProfile, useUpdateProfile } from './useProfile';

// Cart Hooks
export {
  useCart,
  useCartCount,
  useAddToCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
} from './useCart';

// Address Search Hooks
export { useAddressSearch } from './useAddressSearch';

// Artist Hooks
export { useArtists, useArtist, useArtistById } from './useArtists';

// Logs Hooks
export { useLogs, useLog, useLogStats } from './useLogs';

// V2 Catalog Admin Hooks
export {
  useV2AdminProjects,
  useV2AdminProject,
  useCreateV2Project,
  useUpdateV2Project,
  usePublishV2Project,
  useUnpublishV2Project,
  useDeleteV2Project,
  useV2AdminArtists,
  useV2AdminArtist,
  useCreateV2Artist,
  useUpdateV2Artist,
  useLinkV2ArtistToProject,
  useUnlinkV2ArtistFromProject,
  useV2AdminProducts,
  useV2AdminProduct,
  useCreateV2Product,
  useUpdateV2Product,
  useDeleteV2Product,
  useV2AdminVariants,
  useCreateV2Variant,
  useUpdateV2Variant,
  useDeleteV2Variant,
  useV2AdminProductMedia,
  useCreateV2ProductMedia,
  useUpdateV2ProductMedia,
  useDeactivateV2ProductMedia,
  useV2AdminVariantAssets,
  useCreateV2DigitalAsset,
  useUpdateV2DigitalAsset,
  useActivateV2DigitalAsset,
  useDeactivateV2DigitalAsset,
  useV2BundleDefinitions,
  useV2BundleDefinition,
  useCreateV2BundleDefinition,
  useUpdateV2BundleDefinition,
  usePublishV2BundleDefinition,
  useArchiveV2BundleDefinition,
  useCloneV2BundleDefinitionVersion,
  useV2BundleComponents,
  useCreateV2BundleComponent,
  useUpdateV2BundleComponent,
  useDeleteV2BundleComponent,
  useCreateV2BundleComponentOption,
  useUpdateV2BundleComponentOption,
  useDeleteV2BundleComponentOption,
  useValidateV2BundleDefinition,
  usePreviewV2Bundle,
  useResolveV2Bundle,
  useBuildV2BundleOpsContract,
  useBuildV2BundleCanaryReport,
  useV2ProductPublishReadiness,
  useV2CatalogMigrationCompareReport,
  useV2CatalogReadSwitchChecklist,
  useV2CatalogReadSwitchRemediationTasks,
} from './useV2CatalogAdmin';

// V2 Checkout Hooks
export {
  useV2CheckoutCart,
  useV2CartCount,
  useV2AddCartItem,
  useV2UpdateCartItemQuantity,
  useV2RemoveCartItem,
  useV2ValidateCheckout,
  useV2CreateOrder,
  useV2CheckoutOrders,
  useV2CheckoutOrder,
  useV2CancelOrder,
  useV2ApplyPaymentCallback,
  useV2RefundOrder,
  useV2OrderDebug,
} from './useV2Checkout';

// V2 Shop Hooks
export {
  useV2ShopCampaigns,
  useV2ShopCoupons,
  useV2ShopProducts,
  useV2ShopProduct,
  useV2ShopPricePreview,
} from './useV2Shop';
