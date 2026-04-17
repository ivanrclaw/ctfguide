#!/bin/bash
set -e

DATA_DIR="${DATA_DIR:-/data}"
UPLOAD_DIR="${DATA_DIR}/uploads"

# Ensure data dirs exist
mkdir -p "$DATA_DIR" "$UPLOAD_DIR"
chmod 777 "$UPLOAD_DIR"

echo "Starting CTF Guide API..."
exec node dist/main.js
