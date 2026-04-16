#!/bin/bash
set -e

DATA_DIR="${DATA_DIR:-/data}"
PGDATA="${DATA_DIR}/pgdata"
UPLOAD_DIR="${DATA_DIR}/uploads"
PG_BIN="/usr/lib/postgresql/15/bin"

# Ensure data dir exists and has correct permissions
mkdir -p "$DATA_DIR"
chown postgres:postgres "$DATA_DIR" 2>/dev/null || true

# Create upload directory for future file uploads
mkdir -p "$UPLOAD_DIR"
chmod 777 "$UPLOAD_DIR"

# Initialize PostgreSQL data directory if it doesn't exist
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "Initializing PostgreSQL database..."
  rm -rf "$PGDATA"
  mkdir -p "$PGDATA"
  chown postgres:postgres "$PGDATA"

  # Initialize as postgres user
  su postgres -c "$PG_BIN/initdb -D $PGDATA --auth-host=trust --auth-local=trust --encoding=UTF8"

  # Configure PostgreSQL
  cat >> "$PGDATA/postgresql.conf" <<EOF
listen_addresses = '*'
port = 5432
unix_socket_directories = '/tmp'
EOF

  # Allow local connections without password
  cat > "$PGDATA/pg_hba.conf" <<EOF
local   all   all                     trust
host    all   all   127.0.0.1/32      trust
host    all   all   ::1/128            trust
host    all   all   0.0.0.0/0          trust
EOF

  chown postgres:postgres "$PGDATA/postgresql.conf" "$PGDATA/pg_hba.conf"
fi

# Ensure postgres owns the data dir
chown -R postgres:postgres "$PGDATA" 2>/dev/null || true

# Start PostgreSQL as postgres user
echo "Starting PostgreSQL..."
su postgres -c "$PG_BIN/pg_ctl -D $PGDATA -l $DATA_DIR/pg.log -w start" || {
  echo "pg_ctl failed. Checking logs:"
  cat "$DATA_DIR/pg.log" 2>/dev/null || true
  # Try starting directly
  su postgres -c "$PG_BIN/postgres -D $PGDATA" &
  sleep 3
}

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if "$PG_BIN/pg_isready" -h 127.0.0.1 -p 5432 -U postgres &>/dev/null; then
    echo "PostgreSQL is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "PostgreSQL failed to start. Checking logs..."
    cat "$DATA_DIR/pg.log" 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Create database and user if they don't exist
echo "Setting up database..."
"$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U postgres -d postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='ctfguide'" | grep -q 1 || \
  "$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE USER ctfguide WITH PASSWORD 'ctfguide_pwd' LOGIN;"
"$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='ctfguide'" | grep -q 1 || \
  "$PG_BIN/psql" -h 127.0.0.1 -p 5432 -U postgres -d postgres -c "CREATE DATABASE ctfguide OWNER ctfguide;"

echo "Starting CTF Guide API..."
exec node dist/main.js
