#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_URL="${BACKEND_API_URL:-${NEXT_PUBLIC_BACKEND_API_URL:-http://127.0.0.1:${BACKEND_PORT:-3001}}}"

source "${SCRIPT_DIR}/_local-supabase-env.sh"

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/dev-v2-local-frontend.sh [options]

Options:
  --frontend-port <n>  프론트 포트 (default: 3000)
  --backend-url <url>  backend API base URL (default: http://127.0.0.1:3001)
  --help, -h           도움말
EOF
}

log() {
  printf '[dev-v2-local-frontend] %s\n' "$1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --frontend-port)
      FRONTEND_PORT="$2"
      shift 2
      ;;
    --backend-url)
      BACKEND_URL="$2"
      shift 2
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

log "starting frontend on http://127.0.0.1:${FRONTEND_PORT}"
log "supabase target: ${LOCAL_SUPABASE_API_URL}"
log "backend target: ${BACKEND_URL}"

NEXT_PUBLIC_SUPABASE_URL="${LOCAL_SUPABASE_API_URL}" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="${LOCAL_SUPABASE_ANON_KEY}" \
SUPABASE_SERVICE_ROLE_KEY="${LOCAL_SUPABASE_SERVICE_ROLE_KEY}" \
BACKEND_API_URL="${BACKEND_URL}" \
NEXT_PUBLIC_BACKEND_API_URL="${BACKEND_URL}" \
npm run dev -- --port "${FRONTEND_PORT}"
