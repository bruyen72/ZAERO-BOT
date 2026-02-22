# 🔧 Correção do Sistema de Fetch de Mídia

## 📋 Problema Identificado

Os comandos que dependem de mídia externa (18+, anime, downloads) estavam falhando com o erro:
```
Failed to fetch stream from https://cdn.yuki-wabot.my.id/files/MKAP.mp4
```

### Causas do Erro

1. **CDN fora do ar ou lento** - Links morrem, dão timeout, retornam 403/404/5xx
2. **Bloqueio de bots** - Servidores bloqueiam requisições sem User-Agent/Referer adequados
3. **Arquivos grandes + timeout** - Conexões lentas estouram o tempo limite
4. **Falta de fallback** - Se uma URL falha, o bot não tenta alternativas
5. **Código original** - Enviava URL diretamente ao Baileys sem validação prévia

---

## ✅ Solução Implementada

### 1. Novo Módulo: `lib/mediaFetcher.js`

Sistema robusto de fetch com:

- ✓ **Validação HEAD** antes de baixar (verifica status 200, content-type, tamanho)
- ✓ **Sistema de fallback** - tenta múltiplas URLs automaticamente
- ✓ **Timeout configurável** - 5s para HEAD, 30s para download
- ✓ **Retry com backoff exponencial** - 3 tentativas: 1s, 3s, 7s
- ✓ **Headers corretos** - User-Agent, Accept, Accept-Language, etc.
- ✓ **Download via buffer** - evita problemas de stream
- ✓ **Logs detalhados** - rastreamento completo de cada tentativa
- ✓ **Mensagens amigáveis** - retorna mensagens claras ao usuário quando tudo falha

### 2. Funções Principais

#### `fetchNsfwMedia(commandName, nsfwData)`
Para comandos NSFW que usam `lib/nsfw.json`:
```javascript
import { fetchNsfwMedia } from '../../lib/mediaFetcher.js';

const nsfwData = JSON.parse(fs.readFileSync('./lib/nsfw.json'));
const result = await fetchNsfwMedia('blowjob', nsfwData);

if (!result) {
  // Todas URLs falharam
  return m.reply('Fonte temporariamente indisponível');
}

// Envia com buffer ao invés de URL
await client.sendMessage(m.chat, {
  video: result.buffer,
  gifPlayback: true,
  caption: 'Legenda aqui'
});
```

#### `fetchMediaSafe(url, options)`
Para comandos que recebem uma URL de API:
```javascript
import { fetchMediaSafe } from '../../lib/mediaFetcher.js';

const buffer = await fetchMediaSafe(url, {
  validateFirst: true,  // Faz HEAD antes de baixar
  retries: 3,           // Número de tentativas
  logPrefix: '[MeuCmd]' // Prefixo nos logs
});

if (!buffer) {
  return m.reply('Falha ao baixar mídia');
}

await client.sendMessage(m.chat, { video: buffer });
```

#### `fetchMediaWithFallback(urls, validateFirst)`
Para múltiplas URLs com fallback automático:
```javascript
const urls = ['url1.mp4', 'url2.mp4', 'url3.mp4'];
const result = await fetchMediaWithFallback(urls, true);
```

---

## 📁 Comandos Corrigidos

### Comandos NSFW (18+)
- ✅ `commands/nsfw/inter.js` - blowjob, anal, fuck, etc.
- ✅ `commands/nsfw/gelbooru.js` - busca por tags no Gelbooru
- ✅ `commands/nsfw/rule34.js` - busca por tags no Rule34

### Comandos de Anime
- ✅ `commands/anime/inter.js` - hug, kiss, slap, etc. (Tenor API)
- ✅ `commands/anime/waifu.js` - waifu e neko (waifu.pics API)

### Eventos
- ✅ `commands/events.js` - GIFs de boas-vindas e despedida

---

## 🎯 Configuração

O sistema possui configurações ajustáveis em `lib/mediaFetcher.js`:

```javascript
const CONFIG = {
  HEAD_TIMEOUT: 5000,           // Timeout para validação (5s)
  DOWNLOAD_TIMEOUT: 30000,      // Timeout para download (30s)
  RETRIES_PER_URL: 3,           // Tentativas por URL
  RETRY_DELAYS: [1000, 3000, 7000], // Delays entre tentativas
  DEFAULT_HEADERS: {            // Headers para evitar bloqueio
    'User-Agent': 'Mozilla/5.0 ...',
    'Accept': '*/*',
    // ...
  }
};
```

Para alterar em runtime:
```javascript
import { setConfig } from './lib/mediaFetcher.js';
setConfig('DOWNLOAD_TIMEOUT', 60000); // 60 segundos
```

---

## 📊 Logs e Debug

O sistema registra logs detalhados no console:

```
[MediaFetcher] Buscando mídia NSFW para comando: blowjob
[MediaFetcher] URLs disponíveis: 10
[MediaFetcher] Tentando URL 1/10: https://cdn.yuki-wabot.my.id/files/vQpT.mp4
[MediaFetcher] Validação HEAD: {status: 200, valid: true, type: 'video/mp4', size: '2.45KB'}
[MediaFetcher] Tentativa 1/3 para https://cdn.yuki-wabot.my.id/files/vQpT.mp4
[MediaFetcher] ✓ Download bem-sucedido: 2.45MB de https://cdn.yuki-wabot.my.id/files/vQpT.mp4
[MediaFetcher] ✓✓ Sucesso total! URL funcionou
```

---

## 🚀 Como Aplicar em Novos Comandos

1. Importe o módulo:
```javascript
import { fetchMediaSafe } from '../../lib/mediaFetcher.js';
```

2. Ao invés de:
```javascript
// ❌ ANTES (problemático)
await client.sendMessage(m.chat, {
  video: { url: videoUrl }
});
```

3. Faça:
```javascript
// ✅ DEPOIS (robusto)
const buffer = await fetchMediaSafe(videoUrl);
if (!buffer) {
  return m.reply('Mídia indisponível');
}
await client.sendMessage(m.chat, {
  video: buffer
});
```

---

## 🔄 Melhorias Futuras Sugeridas

- [ ] Cache de buffers (evita re-download do mesmo arquivo)
- [ ] CDN alternativo próprio (backup quando yuki-wabot cair)
- [ ] Compressão de vídeos grandes antes de enviar
- [ ] Métricas de sucesso/falha por comando
- [ ] Rate limiting para evitar ban de APIs

---

## 📞 Suporte

Se um comando ainda estiver falhando após esta correção:

1. Verifique os logs no console
2. Teste manualmente a URL no navegador
3. Verifique se o CDN está online
4. Reporte no GitHub com logs completos

---

**Data da correção:** 2026-02-11
**Arquivos principais criados:**
- `lib/mediaFetcher.js` - Sistema robusto de fetch
- `CORRECAO-FETCH-MEDIA.md` - Esta documentação

**Comandos atualizados:** 6 arquivos (nsfw/inter.js, nsfw/gelbooru.js, nsfw/rule34.js, anime/inter.js, anime/waifu.js, events.js)
