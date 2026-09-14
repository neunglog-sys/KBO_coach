#!/usr/bin/env bash
set -Eeuo pipefail

job="${1:-}"
case "$job" in
  notify) timeout_s=110 ;;
  crawl) timeout_s=900 ;;
  lineup) timeout_s=120 ;;
  *) echo "unknown KBO job: $job" >&2; exit 2 ;;
esac

env_file=/opt/kbo/.env
token="$(awk -F= '$1 == "INTERNAL_TOKEN" { value=substr($0, index($0, "=")+1) } END { print value }' "$env_file")"
token="${token%\"}"
token="${token#\"}"
token="${token%\'}"
token="${token#\'}"

if [ -z "$token" ]; then
  echo "INTERNAL_TOKEN is not configured" >&2
  exit 1
fi

exec curl --fail --silent --show-error \
  --connect-timeout 5 --max-time "$timeout_s" \
  -X POST -H "X-Internal-Token: $token" \
  "http://127.0.0.1:8000/internal/$job"
