#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mysql_bin=${EMA_MYSQL_BIN:-/usr/local/mysql/bin}
for binary in mysqld mysql mysqladmin; do
  [[ -x $mysql_bin/$binary ]] || { echo 'Set EMA_MYSQL_BIN to the MySQL binary directory.' >&2; exit 1; }
done
umask 077
mkdir -p output/local
state=$(mktemp -d "$PWD/output/local/mysql-integration.XXXXXX")
runtime=$(mktemp -d /tmp/ema-v2-test.XXXXXX)
mysql_pid=
cleanup() {
  if [[ -n $mysql_pid ]]; then
    kill "$mysql_pid" 2>/dev/null || true
    wait "$mysql_pid" 2>/dev/null || true
  fi
  rmdir "$runtime" 2>/dev/null || true
  echo "Disposable database and log location: $state"
}
trap cleanup EXIT
trap 'exit 130' INT TERM
"$mysql_bin/mysqld" --no-defaults --initialize-insecure --datadir="$state/data" --log-error="$state/init.log"
export DB_SOCKET="$runtime/mysql.sock" DB_NAME=ema_v2_test DB_USER=ema_v2
unset DB_ADDR
"$mysql_bin/mysqld" --no-defaults --datadir="$state/data" --socket="$DB_SOCKET" \
  --skip-networking --mysqlx=OFF --pid-file="$runtime/mysql.pid" --log-error="$state/server.log" &
mysql_pid=$!
for ((attempt=0; attempt<60; attempt++)); do
  if "$mysql_bin/mysqladmin" --no-defaults --socket="$DB_SOCKET" -uroot ping >/dev/null 2>&1; then break; fi
  kill -0 "$mysql_pid" 2>/dev/null || { echo "Check $state/server.log" >&2; exit 1; }
  sleep 1
done
DB_PASSWORD=$(openssl rand -hex 24)
export DB_PASSWORD
"$mysql_bin/mysql" --no-defaults --socket="$DB_SOCKET" -uroot <<SQL
CREATE DATABASE ema_v2_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ema_v2'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ema_v2_test.* TO 'ema_v2'@'localhost';
SQL
cd backend
EMA_V2_DISPOSABLE_TEST=1 EMA_TEST_DB=1 go test -mod=readonly -count=1 ./...
go vet ./...
