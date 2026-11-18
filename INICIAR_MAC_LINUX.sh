#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' 'Node.js e npm precisam estar instalados. Consulte README.md.'
  exit 1
fi
if [[ ! -f .env.local && ! -f .env ]]; then
  printf '%s\n' 'Copie .env.local da pasta atual do Assessment para esta pasta e execute novamente.'
  exit 1
fi
printf '%s\n' 'Preparando e iniciando Concierge Assessment Lumina V3. Para encerrar, pressione Ctrl+C.'
exec npm run dev -- --host 127.0.0.1 --port 8080 --strictPort --open
