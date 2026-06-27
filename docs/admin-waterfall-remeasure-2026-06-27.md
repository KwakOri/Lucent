# Admin Waterfall Remeasure - 2026-06-27

## Scope

- Environment: local frontend `localhost:3000`, local backend `localhost:3001`, local Supabase.
- Browser: Playwright with system Chrome.
- Method: warm-up pass, then measured pass using admin SSR auth cookies and existing timing headers.
- Local artifact: `output/playwright/waterfall-20260627/waterfall.json` (ignored by git).

## Measured Pass

| Route | API count | Max API | Proxy total | Backend app total | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| `/admin` | 2 | 373.9ms | 363.6ms | 356.7ms | `200:1`, `500:1` before fix |
| `/admin/v2-catalog/products` | 2 | 308.4ms | 140.5ms | 79.6ms | `200:2` |
| `/admin/v2-catalog/products/projects/:projectId` | 2 | 207.6ms | 48.4ms | 44.8ms | `200:2` |
| `/admin/v2-catalog/campaigns` | 5 | 141.1ms | 79.0ms | 57.3ms | `200:5` |
| `/admin/v2-catalog/campaigns/:campaignId` | 11 | 310.7ms | 185.1ms | 127.6ms | `200:11` |
| `/admin/v2-catalog/campaigns/:campaignId/pricing` | 10 | 196.7ms | 169.0ms | 140.6ms | `200:10` |

## Findings

- Project product list is no longer the main bottleneck. It now loads with 2 API calls: project detail and project-list aggregate.
- Campaign list is also acceptable after earlier aggregate work. The measured pass used 5 API calls, all successful.
- Admin dashboard had a first-call `500` followed by a successful React Query retry. Root cause was the fallback sales item facts query relying on a PostgREST embedded campaign relationship from `campaign_id_snapshot`.
- Backend fix: `fetchSalesItemFactsFallback` now resolves campaign types with a separate `v2_campaigns` lookup and applies campaign type filtering by campaign IDs instead of an embedded relation.
- Dashboard retest after the backend fix: 6 direct BFF calls returned `200` every time. Backend app duration stabilized around 99-118ms after the first warm call.

## Remaining Candidates

- Campaign detail still fans out to 11 API calls. The slowest calls are not individually heavy, but the page has too many small requests.
- Campaign pricing still fans out to 10 API calls and includes per-product variant requests even though bulk variant data is also available.
- Recommended next task: reduce campaign detail/pricing fan-out by reusing bulk maps or adding a focused page aggregate endpoint.

## Verification

- Backend build: `./node_modules/.bin/nest build`
- Dashboard direct retest: 6 consecutive `GET /api/v2/admin/ops/dashboard/overview?preset=LAST_7_DAYS` calls with admin bearer auth returned `200`.
