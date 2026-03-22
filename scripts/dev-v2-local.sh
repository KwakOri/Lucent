#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${FE_DIR}/.." && pwd)"
BE_DIR="${ROOT_DIR}/backend"

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PORT="${BACKEND_PORT:-3001}"
LOCAL_ADMIN_BYPASS_VALUE="${LOCAL_ADMIN_BYPASS:-true}"
RESET_DB=0
KEEP_BACKEND=0
USE_LOCAL_SUPABASE=0

BACKEND_PID=""
BACKEND_LOG="${FE_DIR}/.tmp/dev-v2-local-backend.log"
BACKEND_LOG_TAIL_PID=""
FRONTEND_ENV_FILE="${FE_DIR}/.env.local"
BACKEND_ENV_FILE="${BE_DIR}/.env"

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/dev-v2-local.sh [options]

Options:
  --use-local-supabase  로컬 Supabase를 기동해서 연결 (기본: 원격 DB)
  --reset-db            --use-local-supabase 모드에서 supabase db reset 실행
  --frontend-port <n>   프론트 포트 (default: 3000)
  --backend-port <n>    백엔드 포트 (default: 3001)
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
    --frontend-port)
      FRONTEND_PORT="$2"
      shift 2
      ;;
    --backend-port)
      BACKEND_PORT="$2"
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
  SUPABASE_URL_VALUE="$(extract_env_value "API_URL" "${SUPABASE_ENV_RAW}")"
  SUPABASE_ANON_KEY_VALUE="$(extract_env_value "ANON_KEY" "${SUPABASE_ENV_RAW}")"
  SUPABASE_SERVICE_ROLE_KEY_VALUE="$(extract_env_value "SERVICE_ROLE_KEY" "${SUPABASE_ENV_RAW}")"

  if [[ -z "${SUPABASE_URL_VALUE}" || -z "${SUPABASE_ANON_KEY_VALUE}" || -z "${SUPABASE_SERVICE_ROLE_KEY_VALUE}" ]]; then
    echo "failed to read local supabase env values from 'supabase status -o env'" >&2
    exit 1
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

if lsof -ti "tcp:${BACKEND_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "backend port ${BACKEND_PORT} already in use. stop the process or use --backend-port." >&2
  exit 1
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

log "starting frontend on http://127.0.0.1:${FRONTEND_PORT}"
log "supabase target: ${SUPABASE_URL_VALUE}"
cd "${FE_DIR}"
NEXT_PUBLIC_SUPABASE_URL="${SUPABASE_URL_VALUE}" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY_VALUE}" \
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY_VALUE}" \
BACKEND_API_URL="${BACKEND_BASE_URL}" \
NEXT_PUBLIC_BACKEND_API_URL="${BACKEND_BASE_URL}" \
npm run dev -- --port "${FRONTEND_PORT}"
