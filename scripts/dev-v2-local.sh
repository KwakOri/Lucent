#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${FE_DIR}/.." && pwd)"
BE_DIR="${ROOT_DIR}/backend"

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
FRONTEND_PORT_EXPLICIT=0
FRONTEND_PORT_AUTO_FALLBACK_TRIES="${FRONTEND_PORT_AUTO_FALLBACK_TRIES:-20}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
BACKEND_PORT_EXPLICIT=0
BACKEND_PORT_AUTO_FALLBACK_TRIES="${BACKEND_PORT_AUTO_FALLBACK_TRIES:-20}"
LOCAL_ADMIN_BYPASS_VALUE="${LOCAL_ADMIN_BYPASS:-true}"
RESET_DB=0
KEEP_BACKEND=0
USE_LOCAL_SUPABASE=0
SYNC_LINKED_DATA=0

BACKEND_PID=""
BACKEND_LOG="${FE_DIR}/.tmp/dev-v2-local-backend.log"
BACKEND_LOG_TAIL_PID=""
FRONTEND_ENV_FILE="${FE_DIR}/.env.local"
BACKEND_ENV_FILE="${BE_DIR}/.env"
SUPABASE_PROJECT_ID="$(
  awk -F= '/^project_id[[:space:]]*=/{gsub(/[[:space:]"]/, "", $2); print $2; exit}' "${FE_DIR}/supabase/config.toml"
)"
LOCAL_DB_CONTAINER="supabase_db_${SUPABASE_PROJECT_ID:-frontend}"
LOCAL_DB_URL_VALUE=""

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/dev-v2-local.sh [options]

Options:
  --use-local-supabase  로컬 Supabase를 기동해서 연결 (기본: 원격 DB)
  --reset-db            --use-local-supabase 모드에서 supabase db reset 실행
  --sync-linked-data    linked 원격 DB(public + auth.users/identities) 데이터를 덤프해 로컬 DB로 복원 (자동으로 --use-local-supabase + --reset-db 적용)
  --frontend-port <n>   프론트 포트 (default: 3000, 직접 지정 시 점유되면 실패)
  --backend-port <n>    백엔드 포트 (default: 3001, 직접 지정 시 점유되면 실패)
  --no-admin-bypass     LOCAL_ADMIN_BYPASS=false로 실행
  --keep-backend        스크립트 종료 시 백엔드 프로세스 유지
  --help, -h            도움말
EOF
}

log() {
  printf '[dev-v2-local] %s\n' "$1"
}

extract_env_value() {
  local key="$1"
  local raw="$2"
  printf '%s\n' "$raw" \
    | awk -F= -v target="$key" '$1 == target {print substr($0, index($0, "=") + 1)}' \
    | tr -d '"' \
    | tail -n 1
}

normalize_env_literal() {
  local value="$1"
  value="$(printf '%s' "${value}" | tr -d '\r')"
  value="$(printf '%s' "${value}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"

  if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf '%s' "${value}"
}

extract_env_value_from_file() {
  local key="$1"
  local file="$2"

  if [[ ! -f "${file}" ]]; then
    return 0
  fi

  local raw
  raw="$(
    awk -F= -v target="${key}" '$1 == target {print substr($0, index($0, "=") + 1)}' "${file}" \
      | tail -n 1
  )"
  normalize_env_literal "${raw}"
}

resolve_env_value() {
  local cli_value="$1"
  local frontend_key="$2"
  local backend_key="$3"
  local label="$4"
  local frontend_value
  local backend_value

  if [[ -n "${cli_value}" ]]; then
    printf '%s' "${cli_value}"
    return 0
  fi

  frontend_value="$(extract_env_value_from_file "${frontend_key}" "${FRONTEND_ENV_FILE}")"
  if [[ -n "${frontend_value}" ]]; then
    printf '%s' "${frontend_value}"
    return 0
  fi

  backend_value="$(extract_env_value_from_file "${backend_key}" "${BACKEND_ENV_FILE}")"
  if [[ -n "${backend_value}" ]]; then
    printf '%s' "${backend_value}"
    return 0
  fi

  echo "missing ${label}. set env or configure ${FRONTEND_ENV_FILE} / ${BACKEND_ENV_FILE}." >&2
  exit 1
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

is_port_in_use() {
  local port="$1"
  lsof -ti "tcp:${port}" -sTCP:LISTEN >/dev/null 2>&1
}

find_available_port() {
  local start_port="$1"
  local tries="${2:-20}"
  local i
  local candidate

  for i in $(seq 0 "${tries}"); do
    candidate=$((start_port + i))
    if ! is_port_in_use "${candidate}"; then
      printf '%s' "${candidate}"
      return 0
    fi
  done
  return 1
}

run_local_db_sql_file() {
  local sql_file="$1"

  if command -v psql >/dev/null 2>&1; then
    if [[ -z "${LOCAL_DB_URL_VALUE}" ]]; then
      echo "failed to resolve local DB_URL from supabase status output" >&2
      exit 1
    fi
    psql "${LOCAL_DB_URL_VALUE}" -v ON_ERROR_STOP=1 -f "${sql_file}"
    return 0
  fi

  if ! docker ps --format '{{.Names}}' | grep -qx "${LOCAL_DB_CONTAINER}"; then
    echo "local db container not found: ${LOCAL_DB_CONTAINER}" >&2
    echo "install psql locally or ensure supabase local containers are running." >&2
    exit 1
  fi

  docker exec -i "${LOCAL_DB_CONTAINER}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "${sql_file}"
}

truncate_local_target_tables() {
  local truncate_sql="${FE_DIR}/.tmp/dev-v2-local-truncate-target-tables.sql"
  cat > "${truncate_sql}" <<'SQL'
DO $$
DECLARE
  truncate_stmt text;
BEGIN
  SELECT
    'TRUNCATE TABLE '
    || string_agg(format('%I.%I', schemaname, tablename), ', ')
    || ' CASCADE'
  INTO truncate_stmt
  FROM pg_tables
  WHERE schemaname = 'public'
     OR (
      schemaname = 'auth'
      AND tablename IN ('users', 'identities')
    );

  IF truncate_stmt IS NOT NULL THEN
    EXECUTE truncate_stmt;
  END IF;
END $$;
SQL

  run_local_db_sql_file "${truncate_sql}"
  rm -f "${truncate_sql}"
}

prepare_local_schema_for_linked_import() {
  local compat_sql="${FE_DIR}/.tmp/dev-v2-local-linked-import-compat.sql"
  cat > "${compat_sql}" <<'SQL'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'order_item_status'
  ) THEN
    ALTER TYPE order_item_status ADD VALUE IF NOT EXISTS 'PAID';
    ALTER TYPE order_item_status ADD VALUE IF NOT EXISTS 'MAKING';
    ALTER TYPE order_item_status ADD VALUE IF NOT EXISTS 'READY_TO_SHIP';
    ALTER TYPE order_item_status ADD VALUE IF NOT EXISTS 'SHIPPING';
    ALTER TYPE order_item_status ADD VALUE IF NOT EXISTS 'DONE';
  END IF;
END $$;
SQL

  run_local_db_sql_file "${compat_sql}"
  rm -f "${compat_sql}"
}

sync_linked_data_to_local() {
  local timestamp
  local dump_file

  timestamp="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "${FE_DIR}/supabase/backups"
  dump_file="${FE_DIR}/supabase/backups/remote-data-copy-${timestamp}.sql"

  log "dumping linked remote data to ${dump_file}"
  cd "${FE_DIR}"
  npx supabase db dump --linked --data-only --schema public,auth \
    --exclude auth.schema_migrations \
    --exclude auth.instances \
    --exclude auth.audit_log_entries \
    --exclude auth.flow_state \
    --exclude auth.mfa_amr_claims \
    --exclude auth.mfa_challenges \
    --exclude auth.mfa_factors \
    --exclude auth.oauth_authorizations \
    --exclude auth.oauth_client_states \
    --exclude auth.oauth_clients \
    --exclude auth.oauth_consents \
    --exclude auth.one_time_tokens \
    --exclude auth.refresh_tokens \
    --exclude auth.saml_providers \
    --exclude auth.saml_relay_states \
    --exclude auth.sessions \
    --exclude auth.sso_domains \
    --exclude auth.sso_providers \
    --exclude auth.custom_oauth_providers \
    --exclude auth.webauthn_challenges \
    --exclude auth.webauthn_credentials \
    --use-copy -f "${dump_file}"

  log "clearing local public + auth.users/identities data before import"
  truncate_local_target_tables

  log "preparing local schema compatibility for linked data import"
  prepare_local_schema_for_linked_import

  log "importing linked remote dump into local DB"
  run_local_db_sql_file "${dump_file}"
}

cleanup() {
  if [[ -n "${BACKEND_LOG_TAIL_PID}" ]] && kill -0 "${BACKEND_LOG_TAIL_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_LOG_TAIL_PID}" >/dev/null 2>&1 || true
    wait "${BACKEND_LOG_TAIL_PID}" >/dev/null 2>&1 || true
  fi

  if [[ "${KEEP_BACKEND}" -eq 1 ]]; then
    return 0
  fi

  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    log "stopping backend pid=${BACKEND_PID}"
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
    wait "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --use-local-supabase)
      USE_LOCAL_SUPABASE=1
      shift
      ;;
    --reset-db)
      RESET_DB=1
      shift
      ;;
    --sync-linked-data)
      SYNC_LINKED_DATA=1
      shift
      ;;
    --frontend-port)
      FRONTEND_PORT="$2"
      FRONTEND_PORT_EXPLICIT=1
      shift 2
      ;;
    --backend-port)
      BACKEND_PORT="$2"
      BACKEND_PORT_EXPLICIT=1
      shift 2
      ;;
    --no-admin-bypass)
      LOCAL_ADMIN_BYPASS_VALUE="false"
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

trap cleanup EXIT INT TERM

mkdir -p "${FE_DIR}/.tmp"
: > "${BACKEND_LOG}"

if [[ "${RESET_DB}" -eq 1 && "${USE_LOCAL_SUPABASE}" -eq 0 ]]; then
  log "--reset-db requested, switching to --use-local-supabase mode"
  USE_LOCAL_SUPABASE=1
fi

if [[ "${SYNC_LINKED_DATA}" -eq 1 && "${USE_LOCAL_SUPABASE}" -eq 0 ]]; then
  log "--sync-linked-data requested, switching to --use-local-supabase mode"
  USE_LOCAL_SUPABASE=1
fi

if [[ "${SYNC_LINKED_DATA}" -eq 1 && "${RESET_DB}" -eq 0 ]]; then
  log "--sync-linked-data requested, enabling --reset-db"
  RESET_DB=1
fi

SUPABASE_URL_VALUE=""
SUPABASE_ANON_KEY_VALUE=""
SUPABASE_SERVICE_ROLE_KEY_VALUE=""

if [[ "${USE_LOCAL_SUPABASE}" -eq 1 ]]; then
  log "starting local supabase"
  cd "${FE_DIR}"
  npx supabase start

  if [[ "${RESET_DB}" -eq 1 ]]; then
    log "running supabase db reset"
    npx supabase db reset
  fi

  SUPABASE_ENV_RAW="$(npx supabase status -o env | awk -F= '/^[A-Z_]+=/{print}')"
  LOCAL_DB_URL_VALUE="$(extract_env_value "DB_URL" "${SUPABASE_ENV_RAW}")"
  SUPABASE_URL_VALUE="$(extract_env_value "API_URL" "${SUPABASE_ENV_RAW}")"
  SUPABASE_ANON_KEY_VALUE="$(extract_env_value "ANON_KEY" "${SUPABASE_ENV_RAW}")"
  SUPABASE_SERVICE_ROLE_KEY_VALUE="$(extract_env_value "SERVICE_ROLE_KEY" "${SUPABASE_ENV_RAW}")"

  if [[ -z "${SUPABASE_URL_VALUE}" || -z "${SUPABASE_ANON_KEY_VALUE}" || -z "${SUPABASE_SERVICE_ROLE_KEY_VALUE}" ]]; then
    echo "failed to read local supabase env values from 'supabase status -o env'" >&2
    exit 1
  fi

  if [[ "${SYNC_LINKED_DATA}" -eq 1 ]]; then
    sync_linked_data_to_local
  fi
else
  log "using remote supabase settings (env -> .env.local -> backend/.env)"
  SUPABASE_URL_VALUE="$(
    resolve_env_value \
      "${NEXT_PUBLIC_SUPABASE_URL:-${SUPABASE_URL:-}}" \
      "NEXT_PUBLIC_SUPABASE_URL" \
      "SUPABASE_URL" \
      "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL"
  )"
  SUPABASE_ANON_KEY_VALUE="$(
    resolve_env_value \
      "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-}}" \
      "NEXT_PUBLIC_SUPABASE_ANON_KEY" \
      "SUPABASE_ANON_KEY" \
      "SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY"
  )"
  SUPABASE_SERVICE_ROLE_KEY_VALUE="$(
    resolve_env_value \
      "${SUPABASE_SERVICE_ROLE_KEY:-}" \
      "SUPABASE_SERVICE_ROLE_KEY" \
      "SUPABASE_SERVICE_ROLE_KEY" \
      "SUPABASE_SERVICE_ROLE_KEY"
  )"
fi

if is_port_in_use "${BACKEND_PORT}"; then
  if [[ "${BACKEND_PORT_EXPLICIT}" -eq 1 ]]; then
    echo "backend port ${BACKEND_PORT} already in use. stop the process or choose another --backend-port." >&2
    exit 1
  fi

  original_backend_port="${BACKEND_PORT}"
  fallback_start_port=$((BACKEND_PORT + 1))
  fallback_backend_port="$(
    find_available_port "${fallback_start_port}" "${BACKEND_PORT_AUTO_FALLBACK_TRIES}" || true
  )"
  if [[ -z "${fallback_backend_port}" ]]; then
    echo "backend port ${BACKEND_PORT} already in use and no fallback port found near ${fallback_start_port}." >&2
    echo "stop the process or use --backend-port." >&2
    exit 1
  fi

  BACKEND_PORT="${fallback_backend_port}"
  log "backend port ${original_backend_port} already in use, using fallback port ${BACKEND_PORT}"
fi

BACKEND_BASE_URL="http://127.0.0.1:${BACKEND_PORT}"

log "starting backend on ${BACKEND_BASE_URL} (LOCAL_ADMIN_BYPASS=${LOCAL_ADMIN_BYPASS_VALUE})"
cd "${BE_DIR}"
(
  tail -n 0 -f "${BACKEND_LOG}" 2>/dev/null | sed -u 's/^/[backend] /'
) &
BACKEND_LOG_TAIL_PID=$!

SUPABASE_URL="${SUPABASE_URL_VALUE}" \
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY_VALUE}" \
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY_VALUE}" \
LOCAL_ADMIN_BYPASS="${LOCAL_ADMIN_BYPASS_VALUE}" \
PORT="${BACKEND_PORT}" \
npm run start:dev >"${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "${BACKEND_BASE_URL}/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "${BACKEND_BASE_URL}/api/health" >/dev/null 2>&1; then
  echo "backend health check failed: ${BACKEND_BASE_URL}/api/health" >&2
  tail -n 120 "${BACKEND_LOG}" >&2 || true
  exit 1
fi

if is_port_in_use "${FRONTEND_PORT}"; then
  if [[ "${FRONTEND_PORT_EXPLICIT}" -eq 1 ]]; then
    echo "frontend port ${FRONTEND_PORT} already in use. stop the process or choose another --frontend-port." >&2
    exit 1
  fi

  original_frontend_port="${FRONTEND_PORT}"
  fallback_frontend_start_port=$((FRONTEND_PORT + 1))
  fallback_frontend_port="$(
    find_available_port "${fallback_frontend_start_port}" "${FRONTEND_PORT_AUTO_FALLBACK_TRIES}" || true
  )"
  if [[ -z "${fallback_frontend_port}" ]]; then
    echo "frontend port ${FRONTEND_PORT} already in use and no fallback port found near ${fallback_frontend_start_port}." >&2
    echo "stop the process or use --frontend-port." >&2
    exit 1
  fi

  FRONTEND_PORT="${fallback_frontend_port}"
  log "frontend port ${original_frontend_port} already in use, using fallback port ${FRONTEND_PORT}"
fi

log "starting frontend on http://127.0.0.1:${FRONTEND_PORT}"
log "supabase target: ${SUPABASE_URL_VALUE}"
cd "${FE_DIR}"
NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL_VALUE}" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY_VALUE}" \
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY_VALUE}" \
BACKEND_API_URL="${BACKEND_BASE_URL}" \
NEXT_PUBLIC_BACKEND_API_URL="${BACKEND_BASE_URL}" \
npm run dev -- --port "${FRONTEND_PORT}"
