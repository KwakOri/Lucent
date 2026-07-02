# Admin Mobile And Feedback UI Polish Checklist

Last updated: 2026-06-30

## Goal

관리자 리디자인 완료 route가 모바일/태블릿에서도 깨지지 않도록 header action, sticky action, table overflow, feedback UI를 새 관리자 디자인 방향에 맞춰 공통화한다.

Design direction:
- background: warm ivory `#f9f9ed`
- surface: white with beige border `#e7e3d3`
- primary action/text: deep navy `#1a1a2e`
- accent: amber/gold `#f59e0b`, `#a35200`
- mobile behavior: actions stack cleanly, no horizontal text overlap, long tables scroll inside framed surfaces

## Viewport QA Matrix

- [x] `360 x 740` - narrow Android width, stacked header actions and toast width
- [x] `390 x 844` - common iPhone width, mobile admin top bar and drawer
- [x] `768 x 1024` - tablet portrait, cards and form actions
- [x] `1024 x 768` - tablet landscape, table overflow and desktop transition
- [x] `1440 x 1000` - desktop baseline, floating sidebar and page headers

## Route Coverage

Representative route groups for visual QA:

- [x] `/admin` - dashboard, urgent order actions, loading state
- [x] `/admin/orders` - dense table/list, mobile filter/action wrapping
- [x] `/admin/orders/[id]` - destructive confirmations and order action cluster
- [x] `/admin/production-shipping` - wide operational tables and saved-view action bars
- [x] `/admin/content/posts` - content list actions, card media, filters
- [x] `/admin/content/posts/new` and `/admin/content/posts/[id]` - editor sticky actions and preview column
- [x] `/admin/v2-catalog/projects` - page header action and project cards
- [x] `/admin/v2-catalog/products` - filters, wide product table, mobile cards
- [x] `/admin/v2-catalog/products/[id]` - top-right actions, option/media sections
- [x] `/admin/v2-catalog/campaigns` and `/admin/v2-catalog/campaigns/[id]` - campaign actions and nested tables
- [x] `/admin/v2-catalog/assets` - filters, delete confirmation, media card actions
- [x] `/admin/v2-catalog/bundles` - component/option management actions
- [x] `/admin/v2-ops`, `/admin/v2-ops/rbac`, `/admin/v2-ops/stats` - ops tabs, filters, loading state
- [x] `/admin/legacy`, `/admin/artists`, `/admin/projects`, `/admin/products` - legacy bridge mobile cards/forms
- [hold] `/admin/shipping/print/[batchId]` - print-first UI; only verify no global feedback regression
- [hold] redirect-only routes - no visible UI

## Mobile Header And Action Checklist

- [x] `AdminPageHeader` actions become full-width stacked controls on small screens and compact right-aligned controls from `sm` upward
- [x] Page titles/descriptions wrap without overlapping action controls
- [x] Primary actions keep navy visual priority, secondary actions remain beige
- [x] Header action groups do not force horizontal page scroll at `360px`
- [x] Sticky form/footer action rows stack on mobile and return to inline layout on tablet/desktop
- [x] Icon-only destructive actions keep stable square dimensions
- [x] Mobile admin top bar uses the warm admin theme and keeps title/link from colliding
- [x] Mobile admin drawer uses the same beige border/nav active language as desktop

## Table/List Responsiveness

- [x] Wide tables remain inside `overflow-x-auto` framed surfaces
- [x] Mobile card alternatives remain available for legacy artists/projects/products
- [x] Filters use single-column stacking on mobile and grid/flex layouts on larger screens
- [x] Long names, URLs, messages, and IDs truncate or wrap inside their containers
- [x] Empty/loading/error states keep card padding and readable text on mobile

## Feedback UI Theme Checklist

- [x] `Loading` uses admin navy/gold colors and readable muted text
- [x] `Loading fullScreen` uses warm ivory overlay with blur and does not hide beneath admin sidebar
- [x] `Toast` uses white surface, beige border, navy text, semantic icon chips, and no blue default surface
- [x] `Toast` width is viewport-safe at `320px-390px` and long Korean text wraps
- [x] Toast positions collapse safely to full-width mobile lanes while preserving desktop positions
- [x] `Modal` surface uses rounded admin card, beige border, warm shadow, and semantic tone borders
- [x] `Modal` opens as a mobile-friendly sheet/contained surface without exceeding viewport height
- [x] Modal header/footer/content spacing is responsive and action buttons stack on mobile
- [x] Modal options (`size`, `position`, `tone`, `className`, `zIndex`) are honored by the renderer
- [x] Admin destructive confirmations can use themed modal instead of browser-native confirm where touched

## Validation

- [x] Targeted lint for admin feedback/components
- [x] Production build
- [x] Playwright screenshots for feedback routes at mobile/tablet/desktop widths
- [x] Admin route browser access checked; unauthenticated Playwright session redirects `/admin` to `/login?redirect=/admin`
- [x] No remaining route checklist items from `docs/admin-route-redesign-checklist.md`

Artifacts:
- `output/playwright/admin-mobile-feedback-wn407/toast-mobile-long.png`
- `output/playwright/admin-mobile-feedback-wn407/modal-mobile-danger.png`
- `output/playwright/admin-mobile-feedback-wn407/modal-mobile-danger-360.png`
- `output/playwright/admin-mobile-feedback-wn407/modal-tablet-danger.png`
- `output/playwright/admin-mobile-feedback-wn407/modal-desktop-danger.png`

Measured checks:
- `360px` toast: viewport `360`, document scroll width `360`, toast box `left 12 / right 348 / width 336`
- `360px` modal: viewport `360`, document scroll width `360`, modal surface `left 12 / right 348 / width 336`
