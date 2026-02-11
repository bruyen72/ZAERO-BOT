#!/bin/bash

# Script para adicionar timeout em todos os fetches automaticamente

echo "🔧 Corrigindo todos os comandos com fetch..."

# Lista de arquivos que usam fetch (excluindo os já corrigidos)
files=(
  "commands/downloads/fb.js"
  "commands/downloads/grive.js"
  "commands/downloads/imagen.js"
  "commands/downloads/mf.js"
  "commands/downloads/play2.js"
  "commands/downloads/twitter.js"
  "commands/downloads/pinterest.js"
  "commands/anime/inter.js"
  "commands/anime/ppcouple.js"
  "commands/anime/waifu.js"
  "commands/nsfw/danbooru.js"
  "commands/nsfw/gelbooru.js"
  "commands/nsfw/rule34.js"
  "commands/nsfw/xnxx.js"
  "commands/nsfw/xvideos.js"
  "commands/utils/brat.js"
  "commands/utils/bratv.js"
  "commands/utils/emojimix.js"
  "commands/utils/get.js"
  "commands/utils/gitclone.js"
  "commands/utils/qc.js"
  "commands/utils/qwenvideo.js"
  "commands/utils/ssweb.js"
  "commands/utils/sticker.js"
  "commands/utils/tourl.js"
)

count=0

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Backup
    cp "$file" "${file}.bak"

    # Substitui import fetch
    sed -i "s/import fetch from 'node-fetch'/import { fetchWithTimeout } from '..\/..\/lib\/fetch-wrapper.js'/g" "$file"
    sed -i "s/import fetch from \"node-fetch\"/import { fetchWithTimeout } from '..\/..\/lib\/fetch-wrapper.js'/g" "$file"

    # Substitui fetch( por fetchWithTimeout(
    sed -i "s/await fetch(/await fetchWithTimeout(/g" "$file"
    sed -i "s/= fetch(/= fetchWithTimeout(/g" "$file"

    echo "✅ Corrigido: $file"
    ((count++))
  fi
done

echo ""
echo "📊 Total de arquivos corrigidos: $count"
echo "💾 Backups criados com extensão .bak"
echo ""
echo "⚠️  IMPORTANTE: Teste o bot após essa correção!"
echo "   Se algo quebrar, restaure com: cp arquivo.js.bak arquivo.js"
