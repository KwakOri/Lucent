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

BACKEND_PID=""
BACKEND_LOG="${FE_DIR}/.tmp/dev-v2-local-backend.log"

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/dev-v2-local.sh [options]

Options:
  --reset-db            supabase db reset 실행
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

log "starting local supabase"
cd "${FE_DIR}"
npx supabase start

if [[ "${RESET_DB}" -eq 1 ]]; then
  log "running supabase db reset"
  npx supabase db reset
fi

SUPABASE_ENV_RAW="$(npx supabase status -o env | awk -F= '/^[A-Z_]+=/{print}')"
API_URL="$(extract_env_value "API_URL" "${SUPABASE_ENV_RAW}")"
ANON_KEY="$(extract_env_value "ANON_KEY" "${SUPABASE_ENV_RAW}")"
SERVICE_ROLE_KEY="$(extract_env_value "SERVICE_ROLE_KEY" "${SUPABASE_ENV_RAW}")"

if [[ -z "${API_URL}" || -z "${ANON_KEY}" || -z "${SERVICE_ROLE_KEY}" ]]; then
  echo "failed to read local supabase env values from 'supabase status -o env'" >&2
  exit 1
fi

if lsof -ti "tcp:${BACKEND_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "backend port ${BACKEND_PORT} already in use. stop the process or use --backend-port." >&2
  exit 1
fi

BACKEND_BASE_URL="http://127.0.0.1:${BACKEND_PORT}"

log "starting backend on ${BACKEND_BASE_URL} (LOCAL_ADMIN_BYPASS=${LOCAL_ADMIN_BYPASS_VALUE})"
cd "${BE_DIR}"
SUPABASE_URL="${API_URL}" \
SUPABASE_ANON_KEY="${ANON_KEY}" \
SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}" \
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
log "supabase target: ${API_URL}"
cd "${FE_DIR}"
NEXT_PUBLIC_SUPABASE_URL="${API_URL}" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="${ANON_KEY}" \
SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}" \
BACKEND_API_URL="${BACKEND_BASE_URL}" \
NEXT_PUBLIC_BACKEND_API_URL="${BACKEND_BASE_URL}" \
npm run dev -- --port "${FRONTEND_PORT}"

