#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_PORT="${1:-5500}"
PROXY_PORT="${2:-8081}"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js tidak ditemukan."
  echo "Install Node.js dulu, lalu jalankan ulang skrip ini."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Error: python3 tidak ditemukan."
  echo "python3 dibutuhkan untuk static server lokal."
  exit 1
fi

echo "Menjalankan static server di http://127.0.0.1:${WEB_PORT}"
python3 -m http.server "${WEB_PORT}" --directory "${ROOT_DIR}" >/tmp/marvell-cms-http.log 2>&1 &
HTTP_PID=$!

cleanup() {
  if kill -0 "${HTTP_PID}" >/dev/null 2>&1; then
    kill "${HTTP_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

if [[ -x "${ROOT_DIR}/node_modules/.bin/decap-server" ]]; then
  DECAP_CMD=("${ROOT_DIR}/node_modules/.bin/decap-server" --port "${PROXY_PORT}")
elif command -v decap-server >/dev/null 2>&1; then
  DECAP_CMD=(decap-server --port "${PROXY_PORT}")
elif command -v npx >/dev/null 2>&1; then
  DECAP_CMD=(npx --yes decap-server --port "${PROXY_PORT}")
elif command -v npm >/dev/null 2>&1; then
  DECAP_CMD=(npm exec --yes decap-server -- --port "${PROXY_PORT}")
else
  echo "Error: npx/npm tidak ditemukan."
  echo "Install npm (biasanya ikut Node.js), lalu jalankan ulang skrip ini."
  exit 1
fi

if [[ "${PROXY_PORT}" != "8081" ]]; then
  echo "Peringatan: admin/config.yml sekarang mengarah ke http://127.0.0.1:8081/api/v1."
  echo "Jika proxy port diubah ke ${PROXY_PORT}, CMS lokal mungkin tidak terhubung."
fi

echo "Menjalankan Decap local backend proxy di http://127.0.0.1:${PROXY_PORT}"
echo "Buka backend di: http://127.0.0.1:${WEB_PORT}/admin/"
echo "Tekan Ctrl+C untuk berhenti."

cd "${ROOT_DIR}"
"${DECAP_CMD[@]}"
