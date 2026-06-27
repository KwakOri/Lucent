# Admin Waterfall Remeasure - 2026-06-27

## Scope

- Environment: local frontend `localhost:3000`, local backend `localhost:3001`, local Supabase.
- Browser: Playwright with system Chrome.
- Method: warm-up pass, then measured pass using admin SSR auth cookies and existing timing headers.
- Baseline local artifact: `output/playwright/waterfall-20260627/waterfall.json` (ignored by git).
- Post WN-314 local artifact: `output/playwright/waterfall-20260627/waterfall-post-wn314.json` (ignored by git).

## Baseline Measured Pass

| Route | API count | Max API | Proxy total | Backend app total | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| `/admin` | 2 | 373.9ms | 363.6ms | 356.7ms | `200:1`, `500:1` before fix |
| `/admin/v2-catalog/products` | 2 | 308.4ms | 140.5ms | 79.6ms | `200:2` |
| `/admin/v2-catalog/products/projects/:projectId` | 2 | 207.6ms | 48.4ms | 44.8ms | `200:2` |
| `/admin/v2-catalog/campaigns` | 5 | 141.1ms | 79.0ms | 57.3ms | `200:5` |
| `/admin/v2-catalog/campaigns/:campaignId` | 11 | 310.7ms | 185.1ms | 127.6ms | `200:11` |
| `/admin/v2-catalog/campaigns/:campaignId/pricing` | 10 | 196.7ms | 169.0ms | 140.6ms | `200:10` |

## Post WN-314 Measured Pass

| Route | API count | Max API | Proxy total | Backend app total | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| `/admin` | 1 | 320.0ms | 184.6ms | 181.4ms | `200:1` |
| `/admin/v2-catalog/products` | 2 | 276.1ms | 153.0ms | 42.8ms | `200:2` |
| `/admin/v2-catalog/products/projects/:projectId` | 2 | 128.5ms | 46.6ms | 41.2ms | `200:2` |
| `/admin/v2-catalog/campaigns` | 5 | 208.6ms | 103.5ms | 84.5ms | `200:5` |
| `/admin/v2-catalog/campaigns/:campaignId` | 1 | 183.4ms | 79.4ms | 73.0ms | `200:1` |
| `/admin/v2-catalog/campaigns/:campaignId/pricing` | 8 | 264.9ms | 276.6ms | 137.7ms | `200:8` |

## Findings

- Project product list is no longer the main bottleneck. It now loads with 2 API calls: project detail and project-list aggregate.
- Campaign list is also acceptable after earlier aggregate work. The measured pass used 5 API calls, all successful.
- Admin dashboard had a first-call `500` followed by a successful React Query retry. Root cause was the fallback sales item facts query relying on a PostgREST embedded campaign relationship from `campaign_id_snapshot`.
- Backend fix: `fetchSalesItemFactsFallback` now resolves campaign types with a separate `v2_campaigns` lookup and applies campaign type filtering by campaign IDs instead of an embedded relation.
- Dashboard retest after the backend fix: 6 direct BFF calls returned `200` every time. Backend app duration stabilized around 99-118ms after the first warm call.
- Campaign pricing was reduced from 10 API calls to 8 API calls by reusing the bulk variants map and removing per-product variant requests.
- Campaign detail was reduced from 11 API calls to 1 aggregate detail-context API call after WN-314.
- Post WN-314, every measured admin route returned only `200` responses.

## Remaining Candidates

- Campaign pricing still fans out to 8 API calls. The largest remaining opportunity is a focused pricing aggregate endpoint that returns campaign, targets, base price list/items, products, variants map, and inventory locations together.
- Campaign list still uses 5 API calls. It is not the current hot spot, but it can be collapsed later if the page becomes a frequent operator entry point.
- Product list and project product list are acceptable at 2 API calls each.
- Recommended next task: evaluate whether the campaign pricing aggregate endpoint is worth the extra backend/frontend contract surface.

## Verification

- Backend build: `./node_modules/.bin/nest build`
- Dashboard direct retest: 6 consecutive `GET /api/v2/admin/ops/dashboard/overview?preset=LAST_7_DAYS` calls with admin bearer auth returned `200`.
- Frontend targeted lint for WN-313/WN-314 changed files.
- Post WN-314 browser remeasure: warm-up pass followed by measured pass across 6 admin routes using admin SSR auth cookies.
