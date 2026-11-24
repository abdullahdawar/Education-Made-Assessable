#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
root=$PWD
profile=${EMA_DEV_PROFILE:-standard}
[[ $profile =~ ^[a-z][a-z0-9-]{0,31}$ ]] || { echo 'Invalid development profile.' >&2; exit 2; }
state="$root/output/local/dev-profiles/$profile"
lock="$state/running"
mode=${1:-start}

if [[ $mode == stop ]]; then
  if [[ ! -d $lock ]]; then
    echo 'Education Made Assessable development server is stopped.'
    exit 0
  fi
  touch "$lock/stop"
  for ((attempt=0; attempt<30; attempt++)); do
    [[ -d $lock ]] || exit 0
    sleep 1
  done
  echo 'Shutdown has not completed. Check the start terminal.' >&2
  exit 1
fi
[[ $mode == start ]] || { echo 'Usage: scripts/dev.sh [start|stop]' >&2; exit 2; }

mysql_bin=${EMA_MYSQL_BIN:-/usr/local/mysql/bin}
web_port=${EMA_WEB_PORT:-5173}
api_port=${EMA_API_PORT:-8080}
bundle=${EMA_BUNDLE:-}
if [[ $profile == standard && -z $bundle && -z ${EMA_ASSETS:-} ]]; then
  export EMA_ASSETS="$root/output/local/v2-grade-1"
  if [[ ! -f $state/grade-1-imported ]]; then
    bundle="$EMA_ASSETS/import.json"
  fi
  default_content=true
else
  export EMA_ASSETS=${EMA_ASSETS:-"$state/assets"}
  default_content=false
fi

for command in go node npm openssl curl; do command -v "$command" >/dev/null || { echo "Install $command first." >&2; exit 1; }; done
for binary in mysqld mysql mysqladmin; do
  [[ -x $mysql_bin/$binary ]] || { echo 'Set EMA_MYSQL_BIN to a MySQL 8 binary directory.' >&2; exit 1; }
done
for port in "$web_port" "$api_port"; do
  [[ $port =~ ^[0-9]{4,5}$ ]] && ((10#$port >= 1024 && 10#$port <= 65535)) || { echo 'Choose valid unprivileged ports.' >&2; exit 2; }
done
[[ $web_port != "$api_port" ]] || { echo 'Choose different frontend and API ports.' >&2; exit 2; }

umask 077
mkdir -p "$state"
mkdir "$lock" || { echo "Development startup is already running. Use scripts/dev.sh stop." >&2; exit 1; }
runtime=
mysql_pid=
api_pid=
web_pid=
cleanup() {
  trap - EXIT INT TERM
  for pid in "$web_pid" "$api_pid" "$mysql_pid"; do
    [[ -z $pid ]] || kill "$pid" 2>/dev/null || true
  done
  for pid in "$web_pid" "$api_pid" "$mysql_pid"; do
    [[ -z $pid ]] || wait "$pid" 2>/dev/null || true
  done
  if [[ -e $lock/stop ]]; then rm -f "$lock/stop"; fi
  rmdir "$lock"
  if [[ -n $runtime ]]; then
    if [[ -f $runtime/api ]]; then rm -f "$runtime/api"; fi
    rmdir "$runtime" 2>/dev/null || true
  fi
}
trap cleanup EXIT
trap 'exit 0' INT TERM
runtime=$(mktemp -d "${TMPDIR:-/tmp}/ema-v2.XXXXXX")
# macOS limits Unix-domain socket paths to about 104 bytes.
if (("${#runtime}" > 85)); then
  rmdir "$runtime"
  runtime=$(mktemp -d /tmp/ema-v2.XXXXXX)
fi
export DB_SOCKET="$runtime/mysql.sock"
export DB_NAME=ema_platform_v2_dev DB_USER=ema_v2
unset DB_ADDR

if [[ ! -d $state/mysql-data ]]; then
  "$mysql_bin/mysqld" --no-defaults --initialize-insecure --datadir="$state/mysql-data" --log-error="$state/mysql-init.log"
fi
"$mysql_bin/mysqld" --no-defaults --datadir="$state/mysql-data" --socket="$DB_SOCKET" \
  --skip-networking --mysqlx=OFF --pid-file="$runtime/mysql.pid" --log-error="$state/mysql.log" &
mysql_pid=$!
for ((attempt=0; attempt<60; attempt++)); do
  [[ ! -e $lock/stop ]] || exit 0
  if "$mysql_bin/mysqladmin" --no-defaults --socket="$DB_SOCKET" -uroot ping >/dev/null 2>&1; then break; fi
  kill -0 "$mysql_pid" 2>/dev/null || { echo "Check $state/mysql.log" >&2; exit 1; }
  sleep 1
done
if [[ ! -e $state/database-password ]]; then
  (set -o noclobber; openssl rand -hex 24 > "$state/database-password")
fi
DB_PASSWORD=$(cat "$state/database-password")
[[ $DB_PASSWORD =~ ^[a-f0-9]{48}$ ]] || { echo 'Invalid generated development database password file.' >&2; exit 1; }
export DB_PASSWORD
"$mysql_bin/mysql" --no-defaults --socket="$DB_SOCKET" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS ema_platform_v2_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'ema_v2'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ema_platform_v2_dev.* TO 'ema_v2'@'localhost';
SQL

(cd backend && go build -mod=readonly -o "$runtime/api" ./cmd/api)
"$runtime/api" migrate
if [[ $default_content == true && -n $bundle && ! -f $bundle ]]; then
  command -v python3 >/dev/null || { echo 'Install Python 3 to prepare the Grade 1 content.' >&2; exit 1; }
  if [[ -e $EMA_ASSETS ]]; then
    echo "Incomplete Grade 1 migration at $EMA_ASSETS. Preserve it elsewhere and rerun the migration." >&2
    exit 1
  fi
  if [[ ! -x $state/migration-venv/bin/python ]]; then python3 -m venv "$state/migration-venv"; fi
  "$state/migration-venv/bin/python" -m pip install -r curriculum/tools/requirements-v2-migration.txt
  "$state/migration-venv/bin/python" curriculum/tools/migrate-grade-1-v2.py
fi
mkdir -p "$EMA_ASSETS/resources"
if [[ -n $bundle ]]; then
  "$runtime/api" content import "$bundle"
  if [[ $default_content == true ]]; then touch "$state/grade-1-imported"; fi
fi
if [[ ! -x frontend/node_modules/.bin/vite ]]; then (cd frontend && npm ci --no-audit --no-fund); fi
export EMA_API_ADDR="127.0.0.1:$api_port"
export EMA_API_ORIGIN="http://$EMA_API_ADDR"
"$runtime/api" &
api_pid=$!
(cd frontend && exec ./node_modules/.bin/vite --host 127.0.0.1 --port "$web_port" --strictPort) &
web_pid=$!
for ((attempt=0; attempt<25; attempt++)); do
  [[ ! -e $lock/stop ]] || exit 0
  kill -0 "$api_pid" "$web_pid" 2>/dev/null || { echo 'A development service exited during startup.' >&2; exit 1; }
  if curl --fail --silent "http://127.0.0.1:$web_port/api/v2/grades" >/dev/null; then
    echo "Education Made Assessable is ready at http://127.0.0.1:$web_port"
    until [[ -e $lock/stop ]]; do
      kill -0 "$api_pid" "$web_pid" "$mysql_pid" 2>/dev/null || { echo 'A development service exited unexpectedly.' >&2; exit 1; }
      sleep 1
    done
    exit 0
  fi
  sleep 1
done
echo 'Development services did not become ready.' >&2
exit 1
