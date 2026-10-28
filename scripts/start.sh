#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; . ./.env; set +a; fi
if [ -n "${GCLOUD_DIR:-}" ]; then PATH="$GCLOUD_DIR:$PATH"; export PATH; fi
if [ -n "${NODE_DIR:-}" ]; then PATH="$NODE_DIR:$PATH"; export PATH; fi
VENV_DIR="${FYP_VENV:-.venv}"
if [ ! -x "$VENV_DIR/bin/python" ]; then echo '请先按 README 创建虚拟环境并安装依赖。' >&2; exit 1; fi
exec "$VENV_DIR/bin/uvicorn" app.main:app --host 127.0.0.1 --port "${PORT:-8000}"
