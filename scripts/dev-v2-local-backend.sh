#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${FE_DIR}/.." && pwd)"
BE_DIR="${ROOT_DIR}/backend"

BACKEND_PORT="${BACKEND_PORT:-3001}"
LOCAL_ADMIN_BYPASS_VALUE="${LOCAL_ADMIN_BYPASS:-true}"
BACKEND_NODE_ENV_VALUE="${BACKEND_NODE_ENV:-}"

source "${SCRIPT_DIR}/_local-supabase-env.sh"

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/dev-v2-local-backend.sh [options]

Options:
  --backend-port <n>  백엔드 포트 (default: 3001)
  --no-admin-bypass   LOCAL_ADMIN_BYPASS=false로 실행
  --help, -h          도움말
EOF
}

log() {
  printf '[dev-v2-local-backend] %s\n' "$1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-port)
      BACKEND_PORT="$2"
      shift 2
      ;;
    --no-admin-bypass)
      LOCAL_ADMIN_BYPASS_VALUE="false"
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

cd "${FE_DIR}"
load_local_supabase_env

log "starting backend on http://127.0.0.1:${BACKEND_PORT}"
log "supabase target: ${LOCAL_SUPABASE_API_URL}"
log "LOCAL_ADMIN_BYPASS=${LOCAL_ADMIN_BYPASS_VALUE}"

cd "${BE_DIR}"
if [[ -n "${BACKEND_NODE_ENV_VALUE}" ]]; then
  NODE_ENV="${BACKEND_NODE_ENV_VALUE}" \
  SUPABASE_URL="${LOCAL_SUPABASE_API_URL}" \
  SUPABASE_ANON_KEY="${LOCAL_SUPABASE_ANON_KEY}" \
  SUPABASE_SERVICE_ROLE_KEY="${LOCAL_SUPABASE_SERVICE_ROLE_KEY}" \
  LOCAL_ADMIN_BYPASS="${LOCAL_ADMIN_BYPASS_VALUE}" \
  PORT="${BACKEND_PORT}" \
  npm run start:dev
else
  SUPABASE_URL="${LOCAL_SUPABASE_API_URL}" \
  SUPABASE_ANON_KEY="${LOCAL_SUPABASE_ANON_KEY}" \
  SUPABASE_SERVICE_ROLE_KEY="${LOCAL_SUPABASE_SERVICE_ROLE_KEY}" \
  LOCAL_ADMIN_BYPASS="${LOCAL_ADMIN_BYPASS_VALUE}" \
  PORT="${BACKEND_PORT}" \
  npm run start:dev
fi
