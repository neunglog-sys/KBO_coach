#!/usr/bin/env bash
set -Eeuo pipefail

# GitHub의 dev 브랜치를 확인하고 검증된 rolling bundle만 적용한다.
# 공개 저장소이므로 서버 인바운드 SSH 개방이나 GitHub PAT가 필요 없다.

REPO_DIR=/opt/kbo
BACKEND_RELEASES=/opt/kbo-releases
FRONTEND_RELEASES=/var/www/kbo-releases
BACKEND_CURRENT=/opt/kbo-current
FRONTEND_CURRENT=/var/www/kbo-current
STATE_DIR=/var/lib/kbo-deploy
STATE_FILE="$STATE_DIR/current.sha"
LOCK_FILE=/run/lock/kbo-auto-deploy.lock
RELEASE_URL=https://github.com/neunglog-sys/KBO_coach/releases/download/ncp-dev

exec 9>"$LOCK_FILE"
flock -n 9 || exit 0

log() {
  printf '[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

safe_remove_tree() {
  local base target resolved_base resolved_target
  base="$1"
  target="$2"
  resolved_base="$(realpath -m "$base")"
  resolved_target="$(realpath -m "$target")"
  case "$resolved_target" in
    "$resolved_base"/*) rm -rf -- "$resolved_target" ;;
    *) log "refusing to remove unexpected path: $resolved_target"; return 1 ;;
  esac
}

cleanup_releases() {
  local base current current_real kept dir dir_real
  base="$1"
  current="$2"
  current_real="$(realpath -m "$current")"
  kept=0

  while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    dir_real="$(realpath -m "$dir")"
    if [ "$dir_real" = "$current_real" ]; then
      continue
    fi
    if [ "$kept" -lt 1 ]; then
      kept=$((kept + 1))
      continue
    fi
    safe_remove_tree "$base" "$dir_real"
  done < <(find "$base" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' \
    | sort -nr | cut -d' ' -f2-)
}

install_self_update() {
  local target_sha candidate
  target_sha="$1"
  candidate="$(mktemp)"
  if git -c safe.directory="$REPO_DIR" -C "$REPO_DIR" show "$target_sha:infra/ncp/kbo-auto-deploy.sh" > "$candidate" 2>/dev/null \
      && bash -n "$candidate"; then
    install -m 0755 "$candidate" /usr/local/sbin/kbo-auto-deploy
  fi
  rm -f -- "$candidate"
}

install -d -m 0755 "$BACKEND_RELEASES" "$FRONTEND_RELEASES" "$STATE_DIR"

git -c safe.directory="$REPO_DIR" -C "$REPO_DIR" fetch --quiet --depth=50 origin dev
target_sha="$(git -c safe.directory="$REPO_DIR" -C "$REPO_DIR" rev-parse origin/dev)"
current_sha="$(cat "$STATE_FILE" 2>/dev/null || true)"

if [ "$target_sha" = "$current_sha" ]; then
  exit 0
fi

log "new dev commit detected: $target_sha"
install_self_update "$target_sha"

tmp_dir="$(mktemp -d)"
trap 'safe_remove_tree /tmp "$tmp_dir"' EXIT

# GitHub Actions가 해당 커밋 검증을 끝내기 전이면 조용히 종료하고 다음 타이머에서 재시도한다.
if ! curl -fsSL --retry 2 --connect-timeout 10 --max-time 60 \
    -o "$tmp_dir/backend-sha.txt" "$RELEASE_URL/backend-sha.txt?v=$target_sha"; then
  log "deployment bundle is not ready yet"
  exit 0
fi

bundle_sha="$(tr -d '\r\n' < "$tmp_dir/backend-sha.txt")"
if [ "$bundle_sha" != "$target_sha" ]; then
  log "deployment marker still points to an older commit"
  exit 0
fi

if ! curl -fsSL --retry 2 --connect-timeout 10 --max-time 900 \
    -o "$tmp_dir/frontend-dist.tar.gz" "$RELEASE_URL/frontend-dist.tar.gz?v=$target_sha"; then
  log "frontend bundle is not ready yet"
  exit 0
fi

if tar -tzf "$tmp_dir/frontend-dist.tar.gz" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
  log "unsafe path found in frontend archive"
  exit 1
fi

new_backend="$BACKEND_RELEASES/$target_sha"
new_frontend="$FRONTEND_RELEASES/$target_sha"
backend_tmp="$new_backend.tmp.$$"
frontend_tmp="$new_frontend.tmp.$$"

safe_remove_tree "$BACKEND_RELEASES" "$backend_tmp" 2>/dev/null || true
safe_remove_tree "$FRONTEND_RELEASES" "$frontend_tmp" 2>/dev/null || true
install -d -m 0755 "$backend_tmp" "$frontend_tmp"

git -c safe.directory="$REPO_DIR" -C "$REPO_DIR" archive "$target_sha" -- \
  services data integrations apps model scripts requirements.txt Procfile \
  | tar -x -C "$backend_tmp"
ln -s /opt/kbo/.env "$backend_tmp/.env"

tar --no-same-owner --no-same-permissions -xzf "$tmp_dir/frontend-dist.tar.gz" \
  -C "$frontend_tmp"
frontend_sha="$(tr -d '\r\n' < "$frontend_tmp/.deploy-sha" 2>/dev/null || true)"
if [ "$frontend_sha" != "$target_sha" ]; then
  log "frontend archive belongs to a different commit"
  exit 0
fi
rm -f -- "$frontend_tmp/.deploy-sha"
chmod -R a+rX "$backend_tmp" "$frontend_tmp"

mv "$backend_tmp" "$new_backend"
mv "$frontend_tmp" "$new_frontend"

previous_backend="$(realpath -m "$BACKEND_CURRENT")"
previous_frontend="$(realpath -m "$FRONTEND_CURRENT")"

if [ ! -f "$previous_backend/requirements.txt" ] \
    || ! cmp -s "$previous_backend/requirements.txt" "$new_backend/requirements.txt"; then
  log "installing updated Python requirements"
  /opt/kbo/.venv/bin/pip install --disable-pip-version-check -r "$new_backend/requirements.txt"
fi

ln -sfn "$new_backend" "$BACKEND_CURRENT"
ln -sfn "$new_frontend" "$FRONTEND_CURRENT"
systemctl restart kbo-api
systemctl reload nginx

healthy=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 http://127.0.0.1:8000/ >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  log "health check failed; rolling back"
  ln -sfn "$previous_backend" "$BACKEND_CURRENT"
  ln -sfn "$previous_frontend" "$FRONTEND_CURRENT"
  systemctl restart kbo-api
  systemctl reload nginx
  exit 1
fi

printf '%s\n' "$target_sha" > "$STATE_FILE.tmp"
mv "$STATE_FILE.tmp" "$STATE_FILE"
cleanup_releases "$BACKEND_RELEASES" "$BACKEND_CURRENT"
cleanup_releases "$FRONTEND_RELEASES" "$FRONTEND_CURRENT"
log "deployment completed: $target_sha"
