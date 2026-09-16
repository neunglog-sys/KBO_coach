#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "root 권한으로 실행해야 합니다." >&2
  exit 1
fi

repo_dir=/opt/kbo
env_file="$repo_dir/.env"
unit_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
app_dir="${KBO_APP_DIR:-/opt/kbo-current}"

# 자동배포 설치 전처럼 current 심볼릭 링크가 아직 없을 때는 저장소를 사용한다.
if [ ! -d "$app_dir" ]; then
  app_dir="$repo_dir"
fi

if [ ! -f "$env_file" ] || [ ! -x "$repo_dir/.venv/bin/python" ]; then
  echo "/opt/kbo의 .env 또는 Python 가상환경을 찾을 수 없습니다." >&2
  exit 1
fi

if ! grep -q '^INTERNAL_TOKEN=.' "$env_file"; then
  umask 077
  printf '\nINTERNAL_TOKEN=%s\n' "$(openssl rand -hex 24)" >> "$env_file"
fi

# API 서비스와 notify_games.py의 내부 크롤 호출 포트를 일치시킨다.
if grep -q '^PORT=' "$env_file"; then
  sed -i 's/^PORT=.*/PORT=8000/' "$env_file"
else
  printf '\nPORT=8000\n' >> "$env_file"
fi
chmod 0600 "$env_file"

install -d -m 0755 /usr/local/share/kbo
install -m 0755 "$unit_dir/kbo-internal-job.sh" /usr/local/sbin/kbo-internal-job
install -m 0755 "$unit_dir/kbo-rag-refresh.py" /usr/local/sbin/kbo-rag-refresh
install -m 0644 "$app_dir/data/knowledge-base/rag_auto_refresh.sql" /usr/local/share/kbo/rag_auto_refresh.sql

for unit in \
  kbo-internal-job@.service \
  kbo-notify.timer \
  kbo-daily-crawl.timer \
  kbo-lineup.timer \
  kbo-rag-refresh.service \
  kbo-rag-refresh.timer; do
  install -m 0644 "$unit_dir/$unit" "/etc/systemd/system/$unit"
done

/opt/kbo/.venv/bin/python /usr/local/sbin/kbo-rag-refresh --install-schema
systemctl daemon-reload
if [ "${KBO_SKIP_API_RESTART:-0}" != "1" ]; then
  systemctl restart kbo-api.service
fi
systemctl enable --now \
  kbo-notify.timer \
  kbo-daily-crawl.timer \
  kbo-lineup.timer \
  kbo-rag-refresh.timer

echo "KBO crawler and RAG refresh timers installed"
