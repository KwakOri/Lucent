extract_supabase_env_value() {
  local key="$1"
  local raw="$2"
  printf '%s\n' "${raw}" \
    | awk -F= -v target="${key}" '$1 == target {print substr($0, index($0, "=") + 1)}' \
    | tr -d '"' \
    | tail -n 1
}

load_local_supabase_env() {
  local supabase_env_raw

  supabase_env_raw="$(npx supabase status -o env | awk -F= '/^[A-Z_]+=/{print}')"
  LOCAL_SUPABASE_API_URL="$(extract_supabase_env_value "API_URL" "${supabase_env_raw}")"
  LOCAL_SUPABASE_ANON_KEY="$(extract_supabase_env_value "ANON_KEY" "${supabase_env_raw}")"
  LOCAL_SUPABASE_SERVICE_ROLE_KEY="$(
    extract_supabase_env_value "SERVICE_ROLE_KEY" "${supabase_env_raw}"
  )"

  if [[ -z "${LOCAL_SUPABASE_API_URL}" || -z "${LOCAL_SUPABASE_ANON_KEY}" || -z "${LOCAL_SUPABASE_SERVICE_ROLE_KEY}" ]]; then
    echo "failed to read local supabase env values. run 'npm run dev:v2-local:db:start' first." >&2
    return 1
  fi
}
