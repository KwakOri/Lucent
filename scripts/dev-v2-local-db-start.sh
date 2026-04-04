#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SUPABASE_MINIMAL_SERVICES=1
SUPABASE_MINIMAL_EXCLUDES="studio,logflare,realtime,storage-api,imgproxy,supavisor,edge-runtime,vector,postgres-meta,mailpit"
RESET_DB=0

source "${SCRIPT_DIR}/_local-supabase-env.sh"

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/dev-v2-local-db-start.sh [options]

Options:
  --reset-db                supabase db reset 실행
  --full-supabase-services  Supabase 전체 서비스 기동
  --minimal-supabase-services
                            Supabase 최소 서비스 기동 (기본값)
  --help, -h                도움말
EOF
}

log() {
  printf '[dev-v2-local-db] %s\n' "$1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --reset-db)
      RESET_DB=1
      shift
      ;;
    --full-supabase-services)
      SUPABASE_MINIMAL_SERVICES=0
      shift
      ;;
    --minimal-supabase-services)
      SUPABASE_MINIMAL_SERVICES=1
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
if [[ "${SUPABASE_MINIMAL_SERVICES}" -eq 1 ]]; then
  log "starting local supabase (minimal services: db/kong/rest/auth)"
  npx supabase start \
    -x "${SUPABASE_MINIMAL_EXCLUDES}" \
    --ignore-health-check
else
  log "starting local supabase (full services)"
  npx supabase start
fi

if [[ "${RESET_DB}" -eq 1 ]]; then
  log "running supabase db reset"
  npx supabase db reset
fi

load_local_supabase_env
log "local supabase ready: ${LOCAL_SUPABASE_API_URL}"
