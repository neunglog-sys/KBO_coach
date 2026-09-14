#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "root 권한으로 실행해야 합니다." >&2
  exit 1
fi

repo_dir=/opt/kbo
if [ ! -d "$repo_dir/.git" ] || [ ! -x "$repo_dir/.venv/bin/uvicorn" ]; then
  echo "/opt/kbo 저장소 또는 Python 가상환경을 찾을 수 없습니다." >&2
  exit 1
fi

install -d -m 0755 /var/lib/kbo-deploy /opt/kbo-releases /var/www/kbo-releases
install -m 0755 "$repo_dir/infra/ncp/kbo-auto-deploy.sh" /usr/local/sbin/kbo-auto-deploy
install -m 0644 "$repo_dir/infra/ncp/kbo-auto-deploy.service" /etc/systemd/system/kbo-auto-deploy.service
install -m 0644 "$repo_dir/infra/ncp/kbo-auto-deploy.timer" /etc/systemd/system/kbo-auto-deploy.timer

ln -sfn /opt/kbo /opt/kbo-current

if grep -q '^WorkingDirectory=' /etc/systemd/system/kbo-api.service; then
  sed -i 's|^WorkingDirectory=.*|WorkingDirectory=/opt/kbo-current|' /etc/systemd/system/kbo-api.service
fi

git -c safe.directory="$repo_dir" -C "$repo_dir" fetch --quiet --depth=50 origin dev
git -c safe.directory="$repo_dir" -C "$repo_dir" rev-parse origin/dev > /var/lib/kbo-deploy/current.sha

systemctl daemon-reload
systemctl restart kbo-api
systemctl enable --now kbo-auto-deploy.timer

echo "NCP 자동배포 타이머 설치 완료"
systemctl --no-pager status kbo-auto-deploy.timer
