# 🔧 CORREÇÃO MANUAL DE FETCH - ZAERO BOT

## ⚠️ PROBLEMA IDENTIFICADO

**35 comandos** usam `fetch` ou `axios` **SEM timeout**, causando:
- ❌ Bot trava por 30-60 segundos
- ❌ Fila de mensagens bloqueia
- ❌ Comandos não respondem
- ❌ Erro "fetch failed"

---

## ✅ SOLUÇÃO CRIADA

Criei `lib/fetch-wrapper.js` com funções protegidas:

### `fetchWithTimeout(url, options, timeoutMs)`
- Timeout padrão: 10 segundos
- AbortController automático
- Tratamento de erro claro

### `fetchWithRetry(url, options, retries, timeoutMs)`
- 3 tentativas automáticas
- Intervalo de 1 segundo entre tentativas

### `fetchFirstSuccess(urls, options, timeoutMs)`
- Testa múltiplas APIs em paralelo
- Retorna a primeira que funcionar

---

## 📦 COMANDOS JÁ CORRIGIDOS

✅ `commands/downloads/tiktok.js` - Timeout 10s
✅ `commands/downloads/play.js` - JÁ tinha timeout (bom código)
✅ `commands/utils/chatgpt.js` - Timeout 15s

---

## 🛠️ COMO CORRIGIR OUTROS COMANDOS

### Método 1: Automático (Recomendado)

```bash
bash fix-all-fetches.sh
```

**O que faz:**
- Adiciona timeout em TODOS os fetches
- Cria backups automáticos (.bak)
- Corrige 24 arquivos restantes

---

### Método 2: Manual

Para cada comando que usa `fetch`:

**1. Mudar o import:**
```javascript
// ❌ Antes
import fetch from 'node-fetch'

// ✅ Depois
import { fetchWithTimeout } from '../../lib/fetch-wrapper.js'
```

**2. Substituir fetch:**
```javascript
// ❌ Antes
const res = await fetch(url)

// ✅ Depois (timeout 10s)
const res = await fetchWithTimeout(url, {}, 10000)

// ✅ Ou com timeout customizado
const res = await fetchWithTimeout(url, {}, 15000) // 15s para IA
```

**3. Para múltiplas APIs:**
```javascript
// ✅ Testa todas em paralelo, retorna a primeira que funcionar
const urls = ['api1.com', 'api2.com', 'api3.com']
const res = await fetchFirstSuccess(urls, {}, 10000)
```

---

## 📋 LISTA DE ARQUIVOS A CORRIGIR

### Downloads (Prioridade ALTA)
- [ ] `commands/downloads/fb.js`
- [ ] `commands/downloads/grive.js`
- [ ] `commands/downloads/imagen.js`
- [ ] `commands/downloads/mf.js`
- [ ] `commands/downloads/play2.js`
- [ ] `commands/downloads/twitter.js`
- [ ] `commands/downloads/pinterest.js`

### Anime
- [ ] `commands/anime/inter.js`
- [ ] `commands/anime/ppcouple.js`
- [ ] `commands/anime/waifu.js`

### NSFW
- [ ] `commands/nsfw/danbooru.js`
- [ ] `commands/nsfw/gelbooru.js`
- [ ] `commands/nsfw/rule34.js`
- [ ] `commands/nsfw/xnxx.js`
- [ ] `commands/nsfw/xvideos.js`

### Utils
- [ ] `commands/utils/brat.js`
- [ ] `commands/utils/bratv.js`
- [ ] `commands/utils/emojimix.js`
- [ ] `commands/utils/get.js`
- [ ] `commands/utils/gitclone.js`
- [ ] `commands/utils/qc.js`
- [ ] `commands/utils/qwenvideo.js`
- [ ] `commands/utils/ssweb.js`
- [ ] `commands/utils/sticker.js`
- [ ] `commands/utils/tourl.js`

### Outros
- [ ] `commands/socket/setbanner.js`
- [ ] `commands/socket/seticon.js`
- [ ] `commands/group/testgoodbye.js`
- [ ] `commands/group/testwelcome.js`
- [ ] `commands/gacha/charinfo.js`
- [ ] `commands/gacha/rw.js`
- [ ] `commands/events.js`

---

## 🧪 COMO TESTAR

### 1. Execute o script de correção
```bash
bash fix-all-fetches.sh
```

### 2. Reinicie o bot
```bash
npm start
```

### 3. Teste comandos que antes travavam
```
.tiktok https://tiktok.com/...
.chatgpt explique IA
.play música teste
.fb https://facebook.com/...
```

### 4. Verifique os logs
- ✅ **Antes:** Travava por 30-60s
- ✅ **Agora:** Timeout após 10s com mensagem clara

---

## 📊 TIMEOUTS RECOMENDADOS

| Tipo de Comando | Timeout | Motivo |
|----------------|---------|--------|
| **Downloads** | 10-15s | APIs podem ser lentas |
| **IA/ChatGPT** | 15-20s | Processamento demorado |
| **Imagens** | 10s | Download rápido |
| **APIs simples** | 5-10s | Respostas rápidas |
| **Vídeos** | 20-30s | Arquivos grandes |

---

## 🐛 TROUBLESHOOTING

### Erro: "Module not found: fetch-wrapper"

**Solução:** Verifique se o arquivo existe:
```bash
ls -lh lib/fetch-wrapper.js
```

Se não existir, foi criado acima nesta correção.

---

### Comando ainda trava

**Possíveis causas:**
1. fetch aninhado não corrigido
2. axios sem timeout
3. download de arquivo muito grande

**Solução:**
```javascript
// Para axios
import { createAxiosWithTimeout } from '../../lib/fetch-wrapper.js'
const axios = createAxiosWithTimeout(10000)

// Para download grande
const res = await fetchWithTimeout(url, {}, 30000) // 30s
```

---

### Bot quebrou após correção

**Restaurar backup:**
```bash
cp commands/downloads/tiktok.js.bak commands/downloads/tiktok.js
```

---

## ✅ BENEFÍCIOS

### Antes da Correção
- ❌ Bot trava 30-60s por comando com fetch lento
- ❌ Fila bloqueia completamente
- ❌ Usuário envia 5 comandos = 5 minutos de espera
- ❌ Erro genérico sem explicação

### Depois da Correção
- ✅ Timeout máximo de 10-15s
- ✅ Fila continua processando
- ✅ Usuário envia 5 comandos = 15-20s total
- ✅ Erro claro: "Timeout: API demorou mais de 10s"

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Execute `bash fix-all-fetches.sh`
2. ✅ Reinicie o bot
3. ✅ Teste comandos problemáticos
4. ✅ Monitore logs por 1 hora
5. ✅ Se estável, delete os backups .bak

---

✧ ZÆRØ BOT ✧ | Proteção Global contra Fetch Lento 🚀
