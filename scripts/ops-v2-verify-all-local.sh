#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${FE_DIR}/.." && pwd)"
BE_DIR="${ROOT_DIR}/backend"

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
SKIP_RESET=0
KEEP_BACKEND=0
REPORT_DIR="${REPORT_DIR:-}"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
TEST_EMAIL="${TEST_EMAIL:-verify-all-local@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-test1234}"

BACKEND_PID=""
BACKEND_LOG=""
BASE_PORT="$(printf '%s' "$BASE_URL" | sed -nE 's|^https?://[^:/]+:([0-9]+).*$|\1|p')"
DB_CONTAINER=""
FIXTURE_BUNDLE_DEFINITION_ID=""
ADMIN_TOKEN=""

SUMMARY_FILE=""

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/ops-v2-verify-all-local.sh [options]

Options:
  --base-url <url>      backend base URL (default: http://127.0.0.1:3001)
  --report-dir <path>   결과 저장 디렉토리 (default: frontend/reports/v2-rehearsal/<timestamp>)
  --skip-reset          supabase db reset 생략
  --keep-backend        종료 시 백엔드 프로세스 유지
  --help, -h            도움말

Examples:
  bash scripts/ops-v2-verify-all-local.sh
  bash scripts/ops-v2-verify-all-local.sh --skip-reset
  bash scripts/ops-v2-verify-all-local.sh --report-dir /tmp/v2-rehearsal
EOF
}

log() {
  printf '[ops-v2-verify-all-local] %s\n' "$1"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: ${cmd}" >&2
    exit 1
  fi
}

wait_port_free() {
  local port="$1"
  local timeout="${2:-30}"
  local i
  for i in $(seq 1 "$timeout"); do
    if ! lsof -ti "tcp:${port}" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

extract_env_value() {
  local key="$1"
  local raw="$2"
  printf '%s\n' "$raw" \
    | awk -F= -v target="$key" '$1 == target {print substr($0, index($0, "=") + 1)}' \
    | tr -d '"' \
    | tail -n 1
}

append_summary() {
  local line="$1"
  printf '%s\n' "$line" >>"$SUMMARY_FILE"
}

run_step() {
  local slug="$1"
  local description="$2"
  shift 2

  local step_log="${REPORT_DIR}/${slug}.log"
  log "${description}"
  append_summary "- RUN: ${description}"

  if "$@" > >(tee "$step_log") 2>&1; then
    append_summary "  - PASS (log: ${slug}.log)"
  else
    local status=$?
    append_summary "  - FAIL (log: ${slug}.log)"
    return "$status"
  fi
}

stop_existing_backend_if_needed() {
  local existing_pids
  existing_pids="$(lsof -ti "tcp:${BASE_PORT}" -sTCP:LISTEN | tr '\n' ' ' | xargs || true)"
  if [[ -z "${existing_pids}" ]]; then
    return 0
  fi

  local safe_to_kill=1
  local pid cmdline
  for pid in ${existing_pids}; do
    cmdline="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
    if [[ "${cmdline}" != *"/promotion/lucent/backend"* ]]; then
      safe_to_kill=0
      break
    fi
  done

  if [[ "${safe_to_kill}" -ne 1 ]]; then
    echo "port ${BASE_PORT} is already in use by a non-lucent process. stop it or change --base-url." >&2
    exit 1
  fi

  log "existing backend listener detected on ${BASE_PORT}, stopping: ${existing_pids}"
  kill ${existing_pids} >/dev/null 2>&1 || true
  if ! wait_port_free "${BASE_PORT}" 30; then
    echo "failed to free port ${BASE_PORT}" >&2
    exit 1
  fi
}

bootstrap_0102_fixture() {
  if [[ -z "${DB_CONTAINER}" ]]; then
    echo "supabase db container not found (expected name starting with supabase_db_)" >&2
    return 1
  fi

  docker exec -i "${DB_CONTAINER}" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
DO $$
DECLARE
  v_bundle_product_id uuid;
  v_component_variant_id uuid;
  v_definition_id uuid;
  v_next_version integer;
BEGIN
  -- Ensure ACTIVE products have ACTIVE primary media.
  UPDATE public.v2_product_media m
     SET status = 'ACTIVE',
         deleted_at = NULL,
         metadata = COALESCE(m.metadata, '{}'::jsonb) || '{"fixture":"ops-v2-verify-all-local"}'::jsonb,
         updated_at = NOW()
   WHERE m.is_primary = true
     AND m.deleted_at IS NULL
     AND m.product_id IN (
       SELECT p.id
         FROM public.v2_products p
        WHERE p.status = 'ACTIVE'
          AND p.deleted_at IS NULL
     )
     AND m.status <> 'ACTIVE';

  INSERT INTO public.v2_product_media (
    product_id,
    media_type,
    media_role,
    storage_path,
    public_url,
    alt_text,
    sort_order,
    is_primary,
    status,
    metadata
  )
  SELECT
    p.id,
    'IMAGE',
    'PRIMARY',
    format('fixtures/v2-rehearsal/%s-primary.jpg', p.id),
    format('https://example.local/v2-rehearsal/%s-primary.jpg', p.id),
    concat(p.title, ' primary media'),
    0,
    true,
    'ACTIVE',
    '{"fixture":"ops-v2-verify-all-local"}'::jsonb
    FROM public.v2_products p
   WHERE p.status = 'ACTIVE'
     AND p.deleted_at IS NULL
     AND NOT EXISTS (
       SELECT 1
         FROM public.v2_product_media m
        WHERE m.product_id = p.id
          AND m.is_primary = true
          AND m.deleted_at IS NULL
     );

  -- Ensure ACTIVE DIGITAL variants have at least one READY asset.
  UPDATE public.v2_digital_assets da
     SET status = 'READY',
         deleted_at = NULL,
         metadata = COALESCE(da.metadata, '{}'::jsonb) || '{"fixture":"ops-v2-verify-all-local"}'::jsonb,
         updated_at = NOW()
   WHERE da.deleted_at IS NULL
     AND da.status <> 'READY'
     AND da.variant_id IN (
       SELECT pv.id
         FROM public.v2_product_variants pv
         JOIN public.v2_products p ON p.id = pv.product_id
        WHERE pv.fulfillment_type = 'DIGITAL'
          AND pv.status = 'ACTIVE'
          AND pv.deleted_at IS NULL
          AND p.status = 'ACTIVE'
          AND p.deleted_at IS NULL
     );

  INSERT INTO public.v2_digital_assets (
    variant_id,
    asset_role,
    file_name,
    storage_path,
    mime_type,
    file_size,
    version_no,
    checksum,
    status,
    metadata
  )
  SELECT
    pv.id,
    'PRIMARY',
    format('fixture-%s-primary.mp3', replace(pv.id::text, '-', '')),
    format('fixtures/v2-rehearsal/%s-primary.mp3', pv.id),
    'audio/mpeg',
    1024,
    version_seed.next_version,
    md5(pv.id::text),
    'READY',
    '{"fixture":"ops-v2-verify-all-local"}'::jsonb
    FROM public.v2_product_variants pv
    JOIN public.v2_products p ON p.id = pv.product_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(MAX(da.version_no), 0) + 1 AS next_version
        FROM public.v2_digital_assets da
       WHERE da.variant_id = pv.id
    ) AS version_seed ON TRUE
   WHERE pv.fulfillment_type = 'DIGITAL'
     AND pv.status = 'ACTIVE'
     AND pv.deleted_at IS NULL
     AND p.status = 'ACTIVE'
     AND p.deleted_at IS NULL
     AND NOT EXISTS (
       SELECT 1
         FROM public.v2_digital_assets da
        WHERE da.variant_id = pv.id
          AND da.deleted_at IS NULL
     );

  -- Prepare one ACTIVE bundle definition/component fixture for 02 validation.
  -- Reuse existing fixture first to keep repeated runs idempotent.
  SELECT bd.id, bd.bundle_product_id
    INTO v_definition_id, v_bundle_product_id
    FROM public.v2_bundle_definitions bd
   WHERE bd.status = 'ACTIVE'
     AND bd.deleted_at IS NULL
     AND COALESCE(bd.metadata->>'fixture', '') = 'ops-v2-verify-all-local'
   ORDER BY bd.updated_at DESC
   LIMIT 1;

  IF v_bundle_product_id IS NULL THEN
    SELECT p.id
      INTO v_bundle_product_id
      FROM public.v2_products p
     WHERE p.deleted_at IS NULL
       AND p.status = 'ACTIVE'
       AND p.product_kind <> 'BUNDLE'
     ORDER BY
       CASE
         WHEN EXISTS (
           SELECT 1
             FROM public.v2_product_variants pv
            WHERE pv.product_id = p.id
              AND pv.deleted_at IS NULL
              AND pv.status = 'ACTIVE'
              AND pv.fulfillment_type = 'PHYSICAL'
         ) THEN 0
         ELSE 1
       END,
       p.created_at
     LIMIT 1;
  END IF;

  IF v_bundle_product_id IS NULL THEN
    RAISE EXCEPTION 'ops-v2-verify-all-local fixture failed: active bundle candidate product not found';
  END IF;

  IF v_definition_id IS NOT NULL THEN
    SELECT bc.component_variant_id
      INTO v_component_variant_id
      FROM public.v2_bundle_components bc
     WHERE bc.bundle_definition_id = v_definition_id
       AND bc.deleted_at IS NULL
     ORDER BY bc.sort_order ASC, bc.created_at ASC
     LIMIT 1;
  END IF;

  IF v_component_variant_id IS NULL THEN
    SELECT pv.id
      INTO v_component_variant_id
      FROM public.v2_product_variants pv
      JOIN public.v2_products p ON p.id = pv.product_id
     WHERE pv.deleted_at IS NULL
       AND pv.status = 'ACTIVE'
       AND p.deleted_at IS NULL
       AND p.status = 'ACTIVE'
       AND p.product_kind <> 'BUNDLE'
       AND p.id <> v_bundle_product_id
     ORDER BY
       CASE WHEN pv.fulfillment_type = 'DIGITAL' THEN 0 ELSE 1 END,
       pv.created_at
     LIMIT 1;
  END IF;

  IF v_component_variant_id IS NULL THEN
    RAISE EXCEPTION 'ops-v2-verify-all-local fixture failed: active non-bundle component variant not found';
  END IF;

  UPDATE public.v2_products
     SET product_kind = 'BUNDLE',
         metadata = COALESCE(metadata, '{}'::jsonb) || '{"fixture":"ops-v2-verify-all-local"}'::jsonb,
         updated_at = NOW()
   WHERE id = v_bundle_product_id;

  IF v_definition_id IS NULL THEN
    SELECT bd.id
      INTO v_definition_id
      FROM public.v2_bundle_definitions bd
     WHERE bd.bundle_product_id = v_bundle_product_id
       AND bd.status = 'ACTIVE'
       AND bd.deleted_at IS NULL
     ORDER BY bd.version_no DESC
     LIMIT 1;
  END IF;

  IF v_definition_id IS NULL THEN
    SELECT COALESCE(MAX(bd.version_no), 0) + 1
      INTO v_next_version
      FROM public.v2_bundle_definitions bd
     WHERE bd.bundle_product_id = v_bundle_product_id;

    INSERT INTO public.v2_bundle_definitions (
      bundle_product_id,
      anchor_product_id,
      version_no,
      mode,
      status,
      pricing_strategy,
      metadata
    ) VALUES (
      v_bundle_product_id,
      v_bundle_product_id,
      v_next_version,
      'FIXED',
      'ACTIVE',
      'WEIGHTED',
      '{"fixture":"ops-v2-verify-all-local"}'::jsonb
    )
    RETURNING id INTO v_definition_id;
  ELSE
    UPDATE public.v2_bundle_definitions
       SET mode = 'FIXED',
           pricing_strategy = 'WEIGHTED',
           metadata = COALESCE(metadata, '{}'::jsonb) || '{"fixture":"ops-v2-verify-all-local"}'::jsonb,
           updated_at = NOW()
     WHERE id = v_definition_id;
  END IF;

  INSERT INTO public.v2_bundle_components (
    bundle_definition_id,
    component_variant_id,
    is_required,
    min_quantity,
    max_quantity,
    default_quantity,
    sort_order,
    price_allocation_weight,
    metadata
  ) VALUES (
    v_definition_id,
    v_component_variant_id,
    true,
    1,
    1,
    1,
    0,
    1.0,
    '{"fixture":"ops-v2-verify-all-local"}'::jsonb
  )
  ON CONFLICT (bundle_definition_id, component_variant_id)
  DO UPDATE SET
    is_required = true,
    min_quantity = 1,
    max_quantity = 1,
    default_quantity = 1,
    sort_order = 0,
    price_allocation_weight = 1.0,
    metadata = COALESCE(v2_bundle_components.metadata, '{}'::jsonb) || '{"fixture":"ops-v2-verify-all-local"}'::jsonb,
    deleted_at = NULL,
    updated_at = NOW();
END $$;
SQL

  FIXTURE_BUNDLE_DEFINITION_ID="$(docker exec "${DB_CONTAINER}" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -t -A -c "
SELECT bd.id
  FROM public.v2_bundle_definitions bd
 WHERE bd.status = 'ACTIVE'
   AND bd.deleted_at IS NULL
   AND COALESCE(bd.metadata->>'fixture', '') = 'ops-v2-verify-all-local'
 ORDER BY bd.updated_at DESC
 LIMIT 1;
")"
  FIXTURE_BUNDLE_DEFINITION_ID="$(printf '%s' "${FIXTURE_BUNDLE_DEFINITION_ID}" | tr -d '[:space:]')"
  if [[ -z "${FIXTURE_BUNDLE_DEFINITION_ID}" ]]; then
    echo "failed to detect fixture bundle definition id" >&2
    return 1
  fi

  printf 'fixture_bundle_definition_id=%s\n' "${FIXTURE_BUNDLE_DEFINITION_ID}"
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

login_token() {
  local email="$1"
  local password="$2"
  curl -sS -X POST "${BASE_URL}/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);process.stdout.write(j?.data?.session?.accessToken||j?.data?.session?.access_token||'')}catch{process.stdout.write('')}})"
}

issue_local_admin_token() {
  if [[ -z "${DB_CONTAINER}" ]]; then
    echo "supabase db container not found (expected name starting with supabase_db_)" >&2
    return 1
  fi

  ADMIN_TOKEN="$(login_token "${TEST_EMAIL}" "${TEST_PASSWORD}")"
  if [[ -z "${ADMIN_TOKEN}" ]]; then
    local email_escaped
    local password_escaped
    email_escaped="$(sql_escape "${TEST_EMAIL}")"
    password_escaped="$(sql_escape "${TEST_PASSWORD}")"

    docker exec -i "${DB_CONTAINER}" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<SQL
DELETE FROM public.email_verifications
WHERE email='${email_escaped}' AND purpose='signup';

INSERT INTO public.email_verifications
  (email, code, token, hashed_password, purpose, expires_at, verified_at, attempts)
VALUES
  ('${email_escaped}', '123456', '55555555-5555-4555-8555-555555555555', '${password_escaped}', 'signup', NOW() + INTERVAL '10 minutes', NOW(), 0);
SQL

    curl -sS -X POST "${BASE_URL}/api/auth/signup" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"${TEST_EMAIL}\",\"verificationToken\":\"55555555-5555-4555-8555-555555555555\"}" >/dev/null || true

    ADMIN_TOKEN="$(login_token "${TEST_EMAIL}" "${TEST_PASSWORD}")"
  fi

  if [[ -z "${ADMIN_TOKEN}" ]]; then
    echo "failed to create/login admin token user: ${TEST_EMAIL}" >&2
    return 1
  fi

  printf 'admin_token_ready=true email=%s\n' "${TEST_EMAIL}"
}

finalize() {
  local exit_code=$?
  trap - EXIT
  set +e

  if [[ -n "${BACKEND_PID}" && "${KEEP_BACKEND}" -ne 1 ]]; then
    if kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
      kill "${BACKEND_PID}" >/dev/null 2>&1 || true
      sleep 1
    fi
  fi

  if [[ "${exit_code}" -eq 0 ]]; then
    append_summary ""
    append_summary "## Final"
    append_summary "- result: PASS"
  else
    append_summary ""
    append_summary "## Final"
    append_summary "- result: FAIL"
    if [[ -n "${BACKEND_LOG}" ]]; then
      append_summary "- backend_log: ${BACKEND_LOG}"
    fi
  fi

  exit "${exit_code}"
}

trap finalize EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --report-dir)
      REPORT_DIR="${2:-}"
      shift 2
      ;;
    --skip-reset)
      SKIP_RESET=1
      shift
      ;;
    --keep-backend)
      KEEP_BACKEND=1
      shift
      ;;
    --help|-h)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      print_usage
      exit 1
      ;;
  esac
done

require_cmd supabase
require_cmd docker
require_cmd npm
require_cmd node
require_cmd rg
require_cmd curl
require_cmd lsof
require_cmd awk
require_cmd sed

if [[ -z "${BASE_PORT}" ]]; then
  echo "--base-url must include an explicit port. current: ${BASE_URL}" >&2
  exit 1
fi

if [[ -z "${REPORT_DIR}" ]]; then
  REPORT_DIR="${FE_DIR}/reports/v2-rehearsal/${RUN_ID}"
fi
mkdir -p "${REPORT_DIR}"
BACKEND_LOG="${REPORT_DIR}/backend-local-bypass.log"
SUMMARY_FILE="${REPORT_DIR}/summary.md"

cat >"${SUMMARY_FILE}" <<EOF
# V2 통합 리허설 리포트

- generated_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- base_url: ${BASE_URL}
- report_dir: ${REPORT_DIR}

## Steps
EOF

cd "${FE_DIR}"

run_step "01_supabase_start" "step 1/12: local supabase start" supabase start

if [[ "${SKIP_RESET}" -eq 0 ]]; then
  run_step "02_db_reset" "step 2/12: supabase db reset" supabase db reset
else
  append_summary "- SKIP: step 2/12: supabase db reset (--skip-reset)"
fi

run_step "03_db_lint" "step 3/12: supabase db lint" supabase db lint
run_step "04_seed_dummy_local" "step 4/12: ops:v2-seed-dummy:local" npm run ops:v2-seed-dummy:local
run_step "05_verify_04_local" "step 5/12: ops:v2-verify-04:local (--skip-migration)" npm run ops:v2-verify-04:local -- --skip-migration --base-url "${BASE_URL}"
run_step "06_verify_05_local" "step 6/12: ops:v2-verify-05:local (--skip-migration)" npm run ops:v2-verify-05:local -- --skip-migration --base-url "${BASE_URL}"

DB_CONTAINER="$(docker ps --format '{{.Names}}' | rg '^supabase_db_' | head -n 1 || true)"
if [[ -z "${DB_CONTAINER}" ]]; then
  echo "supabase db container not found (expected name starting with supabase_db_)" >&2
  exit 1
fi
run_step "07_bootstrap_0102_fixture" "step 7/12: bootstrap local fixtures for 01/02" bootstrap_0102_fixture

run_step "08_supabase_env" "step 8/12: local supabase env extract" bash -c "
  SUPABASE_ENV_RAW=\"\$(supabase status -o env | awk -F= '/^[A-Z_]+=/{print}')\"
  API_URL=\"\$(printf '%s\n' \"\$SUPABASE_ENV_RAW\" | awk -F= '\$1==\"API_URL\" {print substr(\$0, index(\$0, \"=\")+1)}' | tr -d '\"' | tail -n 1)\"
  ANON_KEY=\"\$(printf '%s\n' \"\$SUPABASE_ENV_RAW\" | awk -F= '\$1==\"ANON_KEY\" {print substr(\$0, index(\$0, \"=\")+1)}' | tr -d '\"' | tail -n 1)\"
  SERVICE_ROLE_KEY=\"\$(printf '%s\n' \"\$SUPABASE_ENV_RAW\" | awk -F= '\$1==\"SERVICE_ROLE_KEY\" {print substr(\$0, index(\$0, \"=\")+1)}' | tr -d '\"' | tail -n 1)\"
  [[ -n \"\$API_URL\" && -n \"\$ANON_KEY\" && -n \"\$SERVICE_ROLE_KEY\" ]]
"

SUPABASE_ENV_RAW="$(supabase status -o env | awk -F= '/^[A-Z_]+=/{print}')"
API_URL="$(extract_env_value "API_URL" "$SUPABASE_ENV_RAW")"
ANON_KEY="$(extract_env_value "ANON_KEY" "$SUPABASE_ENV_RAW")"
SERVICE_ROLE_KEY="$(extract_env_value "SERVICE_ROLE_KEY" "$SUPABASE_ENV_RAW")"

if [[ -z "${API_URL}" || -z "${ANON_KEY}" || -z "${SERVICE_ROLE_KEY}" ]]; then
  echo "failed to read local supabase env values from 'supabase status -o env'" >&2
  exit 1
fi

stop_existing_backend_if_needed

append_summary "- RUN: step 9/12: backend start (LOCAL_ADMIN_BYPASS=true)"
cd "${BE_DIR}"
SUPABASE_URL="${API_URL}" \
SUPABASE_ANON_KEY="${ANON_KEY}" \
SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}" \
LOCAL_ADMIN_BYPASS="true" \
npm run start:dev >"${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
  append_summary "  - FAIL (backend health check failed)"
  tail -n 120 "${BACKEND_LOG}" >&2 || true
  exit 1
fi
append_summary "  - PASS (backend_log: backend-local-bypass.log)"

cd "${FE_DIR}"
run_step "09_admin_token_prepare" "step 10/12: local admin token prepare" issue_local_admin_token
run_step "10_verify_0102" "step 11/12: ops:v2-verify-0102 (report)" npm run ops:v2-verify-0102 -- --base-url "${BASE_URL}" --bundle-definition-id "${FIXTURE_BUNDLE_DEFINITION_ID}" --out "${REPORT_DIR}/verify-0102.md"
run_step "11_verify_06" "step 12/12-A: ops:v2-verify-06 (report)" npm run ops:v2-verify-06 -- --base-url "${BASE_URL}" --admin-token "${ADMIN_TOKEN}" --out "${REPORT_DIR}/verify-06.md"
run_step "12_verify_07" "step 12/12-B: ops:v2-verify-07 (report)" npm run ops:v2-verify-07 -- --base-url "${BASE_URL}" --admin-token "${ADMIN_TOKEN}" --out "${REPORT_DIR}/verify-07.md"

append_summary ""
append_summary "## Artifacts"
append_summary "- [verify-0102.md](./verify-0102.md)"
append_summary "- [verify-06.md](./verify-06.md)"
append_summary "- [verify-07.md](./verify-07.md)"
append_summary "- [01_supabase_start.log](./01_supabase_start.log)"
append_summary "- [03_db_lint.log](./03_db_lint.log)"
append_summary "- [04_seed_dummy_local.log](./04_seed_dummy_local.log)"
append_summary "- [05_verify_04_local.log](./05_verify_04_local.log)"
append_summary "- [06_verify_05_local.log](./06_verify_05_local.log)"
append_summary "- [07_bootstrap_0102_fixture.log](./07_bootstrap_0102_fixture.log)"
append_summary "- [08_supabase_env.log](./08_supabase_env.log)"
append_summary "- [09_admin_token_prepare.log](./09_admin_token_prepare.log)"
append_summary "- [10_verify_0102.log](./10_verify_0102.log)"
append_summary "- [11_verify_06.log](./11_verify_06.log)"
append_summary "- [12_verify_07.log](./12_verify_07.log)"
append_summary "- [backend-local-bypass.log](./backend-local-bypass.log)"

log "done: ${SUMMARY_FILE}"
