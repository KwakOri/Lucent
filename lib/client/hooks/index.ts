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
