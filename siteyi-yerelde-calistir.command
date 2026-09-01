#!/bin/zsh
cd "$(dirname "$0")"

PORT=8087
URL="http://localhost:${PORT}/ogretmen-araclari.html"

if lsof -nP -iTCP:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Site zaten calisiyor: ${URL}"
  open "${URL}"
  exit 0
fi

echo "Kemal Ogretmenim yerel site baslatiliyor..."
echo "Adres: ${URL}"
(sleep 1; open "${URL}") &
python3 -m http.server "${PORT}"
