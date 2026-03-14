#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${FE_DIR}/.." && pwd)"
BE_DIR="${ROOT_DIR}/backend"

BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
TEST_EMAIL="${TEST_EMAIL:-verify05@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-test1234}"
MIGRATION_MODE="${MIGRATION_MODE:-reset}" # reset | push
VARIANT_ID="${VARIANT_ID:-}"
DIGITAL_VARIANT_ID="${DIGITAL_VARIANT_ID:-}"
EXPECTED_SHIPPING_FEE="${EXPECTED_SHIPPING_FEE:-3000}"
AUTO_CLEANUP=1
SKIP_MIGRATION=0
KEEP_BACKEND=0

BACKEND_PID=""
DB_CONTAINER=""
BACKEND_LOG="${FE_DIR}/.ops-v2-verify-05-backend.log"
BASE_PORT="$(printf '%s' "$BASE_URL" | sed -nE 's|^https?://[^:/]+:([0-9]+).*$|\1|p')"

STOCK_LOCATION_ID=""
SHIPPING_METHOD_ID=""
SHIPPING_ZONE_ID=""
SHIPPING_PROFILE_ID=""
SHIPPING_RULE_ID=""

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/ops-v2-verify-05-local.sh [options]

Options:
  --migration-mode <reset|push>   DB 반영 방식 (default: reset)
  --variant-id <uuid>             PHYSICAL 검증 variant_id (없으면 ACTIVE+PHYSICAL 1건 자동 선택)
  --digital-variant-id <uuid>     DIGITAL 검증 variant_id (없으면 ACTIVE+DIGITAL 1건 자동 선택 시도)
  --expected-shipping-fee <num>   quote 기대 배송비 (default: 3000)
  --test-email <email>            테스트 계정 이메일 (default: verify05@example.com)
  --test-password <password>      테스트 계정 비밀번호 (default: test1234)
  --base-url <url>                backend base URL (default: http://127.0.0.1:3001)
  --no-cleanup                    검증 후 테스트 데이터/fixture 정리 생략
  --skip-migration                supabase db reset/push 생략
  --keep-backend                  종료 시 백엔드 프로세스를 유지
  --help, -h                      도움말

Examples:
  npm run ops:v2-verify-05:local
  npm run ops:v2-verify-05:local -- --migration-mode push --no-cleanup
  npm run ops:v2-verify-05:local -- --variant-id <UUID> --digital-variant-id <UUID>
EOF
}

log() {
  printf '[ops-v2-verify-05-local] %s\n' "$1"
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

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: ${cmd}" >&2
    exit 1
  fi
}

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

extract_env_value() {
  local key="$1"
  local raw="$2"
  printf '%s\n' "$raw" \
    | awk -F= -v target="$key" '$1 == target {print substr($0, index($0, "=") + 1)}' \
    | tr -d '"' \
    | tail -n 1
}

cleanup_test_data() {
  if [[ -z "${DB_CONTAINER}" ]]; then
    return 0
  fi

  local email_escaped
  email_escaped="$(sql_escape "$TEST_EMAIL")"

  log "cleanup: 테스트 데이터 정리 시작 (${TEST_EMAIL})"
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<SQL
DO \$\$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = '${email_escaped}' LIMIT 1;

  IF v_uid IS NOT NULL THEN
    DELETE FROM public.v2_carts WHERE profile_id = v_uid;
    DELETE FROM public.v2_orders WHERE profile_id = v_uid;
    DELETE FROM public.profiles WHERE id = v_uid;
    DELETE FROM auth.users WHERE id = v_uid;
  END IF;

  DELETE FROM public.email_verifications WHERE email = '${email_escaped}';
END
\$\$;
SQL

  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<SQL
DELETE FROM public.v2_shipping_rate_rules WHERE metadata->>'fixture' = 'verify05';
DELETE FROM public.v2_shipping_profiles WHERE code = 'VERIFY05_PROFILE';
DELETE FROM public.v2_shipping_zones WHERE code = 'VERIFY05_ZONE';
DELETE FROM public.v2_shipping_methods WHERE code = 'VERIFY05_METHOD';
DELETE FROM public.v2_inventory_levels
WHERE location_id IN (
  SELECT id FROM public.v2_stock_locations WHERE code = 'VERIFY05_LOC'
);
DELETE FROM public.v2_stock_locations WHERE code = 'VERIFY05_LOC';
SQL

  log "cleanup: 테스트 데이터/fixture 정리 완료"
}

finalize() {
  local exit_code=$?
  trap - EXIT
  set +e

  if [[ "$AUTO_CLEANUP" -eq 1 ]]; then
    cleanup_test_data
  else
    log "cleanup: --no-cleanup 옵션으로 정리 생략"
  fi

  if [[ -n "${BACKEND_PID}" && "$KEEP_BACKEND" -ne 1 ]]; then
    if kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
      kill "$BACKEND_PID" >/dev/null 2>&1 || true
      sleep 1
    fi
  elif [[ "$KEEP_BACKEND" -eq 1 ]]; then
    log "backend: --keep-backend 옵션으로 프로세스 유지 (pid=${BACKEND_PID})"
  fi

  if [[ -f "$BACKEND_LOG" ]]; then
    if [[ "$KEEP_BACKEND" -eq 1 ]]; then
      log "backend log: ${BACKEND_LOG}"
    elif [[ "$exit_code" -eq 0 ]]; then
      rm -f "$BACKEND_LOG"
    else
      log "backend log preserved for debugging: ${BACKEND_LOG}"
    fi
  fi

  exit "$exit_code"
}

trap finalize EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --migration-mode)
      MIGRATION_MODE="${2:-}"
      shift 2
      ;;
    --variant-id)
      VARIANT_ID="${2:-}"
      shift 2
      ;;
    --digital-variant-id)
      DIGITAL_VARIANT_ID="${2:-}"
      shift 2
      ;;
    --expected-shipping-fee)
      EXPECTED_SHIPPING_FEE="${2:-}"
      shift 2
      ;;
    --test-email)
      TEST_EMAIL="${2:-}"
      shift 2
      ;;
    --test-password)
      TEST_PASSWORD="${2:-}"
      shift 2
      ;;
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --no-cleanup)
      AUTO_CLEANUP=0
      shift
      ;;
    --skip-migration)
      SKIP_MIGRATION=1
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

if [[ "$MIGRATION_MODE" != "reset" && "$MIGRATION_MODE" != "push" ]]; then
  echo "--migration-mode must be one of: reset, push" >&2
  exit 1
fi

require_cmd supabase
require_cmd docker
require_cmd npm
require_cmd node
require_cmd rg
require_cmd curl
require_cmd lsof

if [[ ! -d "${FE_DIR}" || ! -d "${BE_DIR}" ]]; then
  echo "frontend/backend path check failed. expected: ${FE_DIR}, ${BE_DIR}" >&2
  exit 1
fi

if [[ -z "${BASE_PORT}" ]]; then
  echo "--base-url must include an explicit port. current: ${BASE_URL}" >&2
  exit 1
fi

log "step 1/8: local supabase start"
cd "$FE_DIR"
supabase start

if [[ "$SKIP_MIGRATION" -eq 0 ]]; then
  log "step 2/8: migration apply (${MIGRATION_MODE})"
  if [[ "$MIGRATION_MODE" == "reset" ]]; then
    supabase db reset
  else
    supabase db push
  fi
else
  log "step 2/8: migration apply skipped (--skip-migration)"
fi

log "step 3/8: local supabase env extract"
SUPABASE_ENV_RAW="$(supabase status -o env | awk -F= '/^[A-Z_]+=/{print}')"
API_URL="$(extract_env_value "API_URL" "$SUPABASE_ENV_RAW")"
ANON_KEY="$(extract_env_value "ANON_KEY" "$SUPABASE_ENV_RAW")"
SERVICE_ROLE_KEY="$(extract_env_value "SERVICE_ROLE_KEY" "$SUPABASE_ENV_RAW")"

if [[ -z "${API_URL}" || -z "${ANON_KEY}" || -z "${SERVICE_ROLE_KEY}" ]]; then
  echo "failed to read local supabase env values from 'supabase status -o env'" >&2
  exit 1
fi

DB_CONTAINER="$(docker ps --format '{{.Names}}' | rg '^supabase_db_' | head -n 1 || true)"
if [[ -z "${DB_CONTAINER}" ]]; then
  echo "supabase db container not found (expected name starting with supabase_db_)" >&2
  exit 1
fi

log "step 4/8: backend start (local supabase binding)"
EXISTING_BACKEND_PIDS="$(lsof -ti "tcp:${BASE_PORT}" -sTCP:LISTEN | tr '\n' ' ' | xargs || true)"
if [[ -n "${EXISTING_BACKEND_PIDS}" ]]; then
  SAFE_TO_KILL=1
  for pid in ${EXISTING_BACKEND_PIDS}; do
    CMDLINE="$(ps -p "${pid}" -o command= 2>/dev/null || true)"
    if [[ "${CMDLINE}" != *"/promotion/lucent/backend"* ]]; then
      SAFE_TO_KILL=0
      break
    fi
  done

  if [[ "${SAFE_TO_KILL}" -eq 1 ]]; then
    CANDIDATE_PIDS="$(ps -axo pid=,command= | awk '/\/promotion\/lucent\/backend/ && (/npm run start:dev/ || /nest start --watch/ || /\/backend\/dist\/main/) {print $1}')"
    if [[ -n "${CANDIDATE_PIDS}" ]]; then
      log "port ${BASE_PORT} already used by existing lucent backend. stopping old backend process tree: ${CANDIDATE_PIDS}"
      kill ${CANDIDATE_PIDS} >/dev/null 2>&1 || true
    else
      log "port ${BASE_PORT} already used by existing lucent backend. stopping listener pid: ${EXISTING_BACKEND_PIDS}"
      kill ${EXISTING_BACKEND_PIDS} >/dev/null 2>&1 || true
    fi

    if ! wait_port_free "${BASE_PORT}" 30; then
      echo "failed to free port ${BASE_PORT} after stopping existing lucent backend processes" >&2
      exit 1
    fi
  else
    echo "port ${BASE_PORT} is already in use by a non-lucent process. stop it or change --base-url." >&2
    exit 1
  fi
fi

cd "$BE_DIR"
SUPABASE_URL="$API_URL" \
SUPABASE_ANON_KEY="$ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
ADMIN_EMAILS="$TEST_EMAIL" \
V2_FULFILLMENT_WRITE_ENABLED="true" \
V2_FULFILLMENT_ENABLE_SHIPMENT_WRITE="true" \
V2_FULFILLMENT_ENABLE_DIGITAL_WRITE="true" \
npm run start:dev >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "${BASE_URL}/api/health" >/dev/null 2>&1; then
  echo "backend health check failed: ${BASE_URL}/api/health" >&2
  tail -n 120 "$BACKEND_LOG" >&2 || true
  exit 1
fi

log "step 5/8: test user token prepare"
login_token() {
  local email="$1"
  local password="$2"
  curl -sS -X POST "${BASE_URL}/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${email}\",\"password\":\"${password}\"}" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);process.stdout.write(j?.data?.session?.accessToken||j?.data?.session?.access_token||'')}catch{process.stdout.write('')}})"
}

USER_TOKEN="$(login_token "$TEST_EMAIL" "$TEST_PASSWORD")"

if [[ -z "${USER_TOKEN}" ]]; then
  email_escaped="$(sql_escape "$TEST_EMAIL")"
  password_escaped="$(sql_escape "$TEST_PASSWORD")"
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<SQL
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

  USER_TOKEN="$(login_token "$TEST_EMAIL" "$TEST_PASSWORD")"
fi

if [[ -z "${USER_TOKEN}" ]]; then
  echo "failed to create/login test user: ${TEST_EMAIL}" >&2
  exit 1
fi

log "step 6/8: verify fixture prepare"
if [[ -z "${VARIANT_ID}" ]]; then
  VARIANT_ID="$(docker exec "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -t -A -c "
select id
from public.v2_product_variants
where status = 'ACTIVE'
  and fulfillment_type = 'PHYSICAL'
order by created_at asc
limit 1;
")"
  VARIANT_ID="$(printf "%s" "$VARIANT_ID" | tr -d '[:space:]')"
fi

if [[ -z "${DIGITAL_VARIANT_ID}" ]]; then
  DIGITAL_VARIANT_ID="$(docker exec "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -t -A -c "
select id
from public.v2_product_variants
where status = 'ACTIVE'
  and fulfillment_type = 'DIGITAL'
order by created_at asc
limit 1;
")"
  DIGITAL_VARIANT_ID="$(printf "%s" "$DIGITAL_VARIANT_ID" | tr -d '[:space:]')"
fi

if [[ -z "${VARIANT_ID}" ]]; then
  echo "active physical variant not found. pass --variant-id explicitly." >&2
  exit 1
fi

FIXTURE_LINE="$(docker exec "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres -t -A -F',' -c "
WITH loc AS (
  INSERT INTO public.v2_stock_locations (code, name, location_type, country_code, is_active, priority, metadata)
  VALUES ('VERIFY05_LOC', 'VERIFY05 Location', 'WAREHOUSE', 'KR', true, 1, '{\"fixture\":\"verify05\"}'::jsonb)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    location_type = EXCLUDED.location_type,
    is_active = true,
    priority = 1,
    metadata = EXCLUDED.metadata
  RETURNING id
),
mth AS (
  INSERT INTO public.v2_shipping_methods (code, name, method_type, supports_tracking, is_active, metadata)
  VALUES ('VERIFY05_METHOD', 'VERIFY05 Method', 'STANDARD', true, true, '{\"fixture\":\"verify05\"}'::jsonb)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    method_type = EXCLUDED.method_type,
    supports_tracking = EXCLUDED.supports_tracking,
    is_active = true,
    metadata = EXCLUDED.metadata
  RETURNING id
),
zn AS (
  INSERT INTO public.v2_shipping_zones (code, name, country_codes, region_codes, postal_code_patterns, is_active, priority, metadata)
  VALUES ('VERIFY05_ZONE', 'VERIFY05 Zone', ARRAY['KR']::text[], ARRAY[]::text[], ARRAY[]::text[], true, 1, '{\"fixture\":\"verify05\"}'::jsonb)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    country_codes = EXCLUDED.country_codes,
    region_codes = EXCLUDED.region_codes,
    postal_code_patterns = EXCLUDED.postal_code_patterns,
    is_active = true,
    priority = 1,
    metadata = EXCLUDED.metadata
  RETURNING id
),
pf AS (
  INSERT INTO public.v2_shipping_profiles (code, name, ship_mode, default_method_id, is_active, metadata)
  VALUES ('VERIFY05_PROFILE', 'VERIFY05 Profile', 'TOGETHER', (SELECT id FROM mth), true, '{\"fixture\":\"verify05\"}'::jsonb)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    ship_mode = EXCLUDED.ship_mode,
    default_method_id = (SELECT id FROM mth),
    is_active = true,
    metadata = EXCLUDED.metadata
  RETURNING id
),
inv AS (
  INSERT INTO public.v2_inventory_levels (variant_id, location_id, on_hand_quantity, reserved_quantity, safety_stock_quantity, updated_reason, metadata)
  VALUES ('${VARIANT_ID}', (SELECT id FROM loc), 100, 0, 0, 'VERIFY05_INIT', '{\"fixture\":\"verify05\"}'::jsonb)
  ON CONFLICT (variant_id, location_id) DO UPDATE SET
    on_hand_quantity = GREATEST(public.v2_inventory_levels.on_hand_quantity, EXCLUDED.on_hand_quantity),
    reserved_quantity = 0,
    safety_stock_quantity = 0,
    updated_reason = 'VERIFY05_REFRESH',
    metadata = EXCLUDED.metadata
  RETURNING id
),
del_rules AS (
  DELETE FROM public.v2_shipping_rate_rules WHERE metadata->>'fixture' = 'verify05'
),
rule AS (
  INSERT INTO public.v2_shipping_rate_rules (
    shipping_method_id, shipping_zone_id, shipping_profile_id,
    currency_code, condition_type, min_value, max_value, amount, priority,
    is_active, metadata
  )
  VALUES (
    (SELECT id FROM mth), (SELECT id FROM zn), (SELECT id FROM pf),
    'KRW', 'FLAT', NULL, NULL, ${EXPECTED_SHIPPING_FEE}, 1,
    true, '{\"fixture\":\"verify05\"}'::jsonb
  )
  RETURNING id
)
SELECT (SELECT id FROM loc), (SELECT id FROM mth), (SELECT id FROM zn), (SELECT id FROM pf), (SELECT id FROM rule);
")"
FIXTURE_LINE="$(printf "%s" "$FIXTURE_LINE" | tr -d '[:space:]')"

if [[ -z "${FIXTURE_LINE}" ]]; then
  echo "failed to prepare verify fixtures" >&2
  exit 1
fi

IFS=',' read -r STOCK_LOCATION_ID SHIPPING_METHOD_ID SHIPPING_ZONE_ID SHIPPING_PROFILE_ID SHIPPING_RULE_ID <<<"${FIXTURE_LINE}"
if [[ -z "${STOCK_LOCATION_ID}" || -z "${SHIPPING_METHOD_ID}" || -z "${SHIPPING_ZONE_ID}" || -z "${SHIPPING_PROFILE_ID}" || -z "${SHIPPING_RULE_ID}" ]]; then
  echo "invalid fixture ids: ${FIXTURE_LINE}" >&2
  exit 1
fi

log "fixture: variant=${VARIANT_ID}, digital_variant=${DIGITAL_VARIANT_ID:-none}, stock_location=${STOCK_LOCATION_ID}, shipping_method=${SHIPPING_METHOD_ID}, shipping_zone=${SHIPPING_ZONE_ID}, shipping_profile=${SHIPPING_PROFILE_ID}"

log "step 7/8: verify-05 run"
cd "$FE_DIR"

VERIFY05_ARGS=(
  --base-url "$BASE_URL"
  --user-token "$USER_TOKEN"
  --admin-token "$USER_TOKEN"
  --variant-id "$VARIANT_ID"
  --stock-location-id "$STOCK_LOCATION_ID"
  --shipping-method-id "$SHIPPING_METHOD_ID"
  --shipping-zone-id "$SHIPPING_ZONE_ID"
  --shipping-profile-id "$SHIPPING_PROFILE_ID"
  --expected-shipping-fee "$EXPECTED_SHIPPING_FEE"
)

if [[ -n "${DIGITAL_VARIANT_ID}" ]]; then
  VERIFY05_ARGS+=(--digital-variant-id "$DIGITAL_VARIANT_ID")
fi

npm run ops:v2-verify-05 -- "${VERIFY05_ARGS[@]}"

log "step 8/8: done (result: success, cleanup=$([[ "$AUTO_CLEANUP" -eq 1 ]] && echo enabled || echo disabled))"
