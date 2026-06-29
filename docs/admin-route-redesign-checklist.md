# Admin Route Redesign Checklist

Last updated: 2026-06-30

## Goal

관리자 페이지 전체를 새 대시보드와 v2 상품 상세 페이지의 디자인 방향으로 점진 리디자인한다.

Design direction:
- background: warm ivory `#f9f9ed`
- primary text/action: deep navy `#1a1a2e`
- surface: white cards with beige border `#e7e3d3`
- accent: amber/gold for emphasis, status colors only where semantic
- shape: 20-22px page surfaces, 12-16px controls and inner cards
- density: operational, scan-friendly sections rather than marketing hero layouts

## Route Structure

```mermaid
flowchart TD
  A["/admin"] --> CORE["Core operations"]
  A --> LEGACY["Legacy admin"]
  A --> V2CAT["/admin/v2-catalog"]
  A --> V2OPS["/admin/v2-ops"]
  A --> MORE["/admin/more"]

  CORE --> ORDERS["/orders<br/>/orders/[id]"]
  CORE --> FULFILL["/production-shipping<br/>/production<br/>/shipping<br/>/shipping/print/[batchId]"]
  CORE --> CONTENT["/content/posts<br/>/content/posts/new<br/>/content/posts/[id]"]
  CORE --> SUPPORT["/refunds<br/>/logs"]

  LEGACY --> LARTISTS["/artists<br/>/artists/new<br/>/artists/[id]/edit"]
  LEGACY --> LPROJECTS["/projects<br/>/projects/new<br/>/projects/[id]/edit"]
  LEGACY --> LPRODUCTS["/products<br/>/products/new<br/>/products/[id]/edit"]
  LEGACY --> LHOME["/legacy"]

  V2CAT --> VCATHOME["/v2-catalog"]
  V2CAT --> PROJECTS["/projects<br/>/projects/new<br/>/projects/[id]<br/>/projects/[id]/edit<br/>/projects/[id]/settings<br/>/projects/[id]/campaigns"]
  V2CAT --> PRODUCTS["/products<br/>/products/new<br/>/products/projects/[projectId]<br/>/products/[id]<br/>/products/[id]/edit<br/>/products/[id]/variants/new<br/>/products/[id]/variants/[variantId]/edit"]
  V2CAT --> CAMPAIGNS["/campaigns<br/>/campaigns/new<br/>/campaigns/[id]<br/>/campaigns/[id]/edit<br/>/campaigns/[id]/targets/new<br/>/campaigns/[id]/targets/[targetId]/edit<br/>/campaigns/[id]/pricing"]
  V2CAT --> V2MISC["/artists<br/>/artists/new<br/>/artists/[id]/edit<br/>/assets<br/>/bundles<br/>/pricing<br/>/readiness"]

  V2OPS --> OPSHOME["/v2-ops"]
  V2OPS --> RBAC["/v2-ops/rbac"]
  V2OPS --> STATS["/v2-ops/stats"]
```

## Route Inventory And Checklist

Legend:
- `[x]` design renewed
- `[~]` first pass in progress
- `[ ]` pending
- `[hold]` low priority or special-purpose screen

### Global Admin Shell

- [x] `/admin` - dashboard renewed
- [x] `/admin/more` - 기타 관리 hub
- [x] `/admin/layout.tsx` - shell aligned with warm background and floating sidebar

### Core Operations

- [x] `/admin/orders`
- [x] `/admin/orders/[id]`
- [x] `/admin/production-shipping`
- [hold] `/admin/production` - redirect route to unified fulfillment screen, no visible UI
- [hold] `/admin/shipping` - redirect route to unified fulfillment screen, no visible UI
- [hold] `/admin/shipping/print/[batchId]` - print layout, preserve print-first UI
- [x] `/admin/refunds`
- [x] `/admin/logs`

### Content

- [x] `/admin/content/posts`
- [x] `/admin/content/posts/new`
- [x] `/admin/content/posts/[id]`

### Legacy Admin

- [x] `/admin/legacy`
- [x] `/admin/artists`
- [x] `/admin/artists/new`
- [x] `/admin/artists/[id]/edit`
- [x] `/admin/projects`
- [x] `/admin/projects/new`
- [x] `/admin/projects/[id]/edit`
- [x] `/admin/products`
- [x] `/admin/products/new`
- [x] `/admin/products/[id]/edit`

### V2 Catalog Hub

- [x] `/admin/v2-catalog`
- [x] `/admin/v2-catalog/projects`
- [x] `/admin/v2-catalog/projects/[id]`
- [x] `/admin/v2-catalog/projects/new`
- [x] `/admin/v2-catalog/projects/[id]/edit`
- [x] `/admin/v2-catalog/projects/[id]/settings`
- [x] `/admin/v2-catalog/projects/[id]/campaigns`

### V2 Products

- [x] `/admin/v2-catalog/products`
- [x] `/admin/v2-catalog/products/new`
- [x] `/admin/v2-catalog/products/[id]` - product detail renewed
- [x] `/admin/v2-catalog/products/[id]/edit`
- [x] `/admin/v2-catalog/products/[id]/variants/new`
- [x] `/admin/v2-catalog/products/[id]/variants/[variantId]/edit`
- [x] `/admin/v2-catalog/products/projects/[projectId]`

### V2 Campaigns

- [x] `/admin/v2-catalog/campaigns`
- [x] `/admin/v2-catalog/campaigns/new`
- [x] `/admin/v2-catalog/campaigns/[id]`
- [x] `/admin/v2-catalog/campaigns/[id]/edit`
- [x] `/admin/v2-catalog/campaigns/[id]/targets/new`
- [x] `/admin/v2-catalog/campaigns/[id]/targets/[targetId]/edit`
- [hold] `/admin/v2-catalog/campaigns/[id]/pricing` - redirect route, no visible UI
- [hold] `/admin/v2-catalog/pricing` - redirect route, no visible UI

### V2 Catalog Misc

- [x] `/admin/v2-catalog/artists`
- [x] `/admin/v2-catalog/artists/new`
- [x] `/admin/v2-catalog/artists/[id]/edit`
- [x] `/admin/v2-catalog/assets`
- [x] `/admin/v2-catalog/bundles`
- [x] `/admin/v2-catalog/readiness`

### V2 Ops

- [x] `/admin/v2-ops`
- [x] `/admin/v2-ops/rbac`
- [x] `/admin/v2-ops/stats`

## Page Redesign Order

1. Navigation hubs: `/admin/more`, `/admin/v2-catalog`, `/admin/v2-catalog/projects`
2. Project-centered catalog flow: project detail, project campaigns, project products
3. Global catalog fallbacks: products, campaigns, artists, assets, bundles, readiness
4. Forms and editors: project/product/campaign create and edit routes
5. Core ops: orders, production/shipping, refunds, logs
6. Content and legacy routes
7. Print and redirect routes, only if their surface is visible to admins

## Per-Page Acceptance Checklist

Each redesigned page should satisfy:
- [x] Uses the new admin surface language: white card, beige border, navy text, amber accent
- [x] Primary actions are visually clear and right-aligned in page headers where appropriate
- [x] Tables/lists use scan-friendly row density and stable empty/loading/error states
- [x] Back/list links preserve the current project or workflow context where available
- [x] Mobile layout keeps controls readable without horizontal text overlap
- [x] No `next/image`; render images with `<img>` when needed
- [x] Route remains reachable from sidebar, `/admin/more`, dashboard, or contextual links
- [x] Lint/build pass after the page batch
