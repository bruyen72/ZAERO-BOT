# 🚀 GUIA COMPLETO: EVOLUTION API NO RENDER

## ✨ O QUE VAMOS FAZER:

1. ✅ Criar serviço Evolution API no Render
2. ✅ Configurar variáveis de ambiente
3. ✅ Conectar WhatsApp via API REST
4. ✅ Testar conexão

**TEMPO ESTIMADO:** 10-15 minutos

---

## 📋 PASSO 1: CRIAR WEB SERVICE NO RENDER

### 1.1 Acessar Render Dashboard
- Acesse: https://dashboard.render.com
- Clique em **"New +"** → **"Web Service"**

### 1.2 Conectar Repositório
Você tem DUAS opções:

#### OPÇÃO A: Usar repositório oficial (RECOMENDADO)
```
Repository: https://github.com/EvolutionAPI/evolution-api
Branch: main
```

#### OPÇÃO B: Fork para seu GitHub (mais controle)
1. Acesse: https://github.com/EvolutionAPI/evolution-api
2. Clique em **"Fork"** (canto superior direito)
3. Use seu fork no Render

### 1.3 Configurações Básicas
```yaml
Name: evolution-api-zaero
Region: Oregon (US West)
Branch: main
Runtime: Node
Build Command: npm install
Start Command: npm run start:prod
```

---

## 🔐 PASSO 2: CONFIGURAR VARIÁVEIS DE AMBIENTE

Clique em **"Advanced"** → **"Add Environment Variable"**

### Variáveis OBRIGATÓRIAS:

```bash
# API Key (escolha uma senha forte)
AUTHENTICATION_API_KEY=sua-senha-super-secreta-123

# Configuração do servidor
SERVER_URL=https://evolution-api-zaero.onrender.com
SERVER_PORT=8080

# Database (PostgreSQL do Render - grátis)
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=sua-connection-string-postgres

# Storage
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true

# Logs
LOG_LEVEL=ERROR
LOG_COLOR=true

# Instâncias
DEL_INSTANCE=false
```

### 2.1 Criar PostgreSQL Database (GRÁTIS)

1. No Render Dashboard: **"New +"** → **"PostgreSQL"**
2. Nome: `evolution-api-db`
3. Database: `evolution`
4. User: `evolution`
5. Region: `Oregon` (mesma do web service)
6. Plan: **Free**

7. **Copie a "Internal Database URL"**:
   ```
   postgresql://evolution:password@dpg-xxx/evolution
   ```

8. Cole em `DATABASE_CONNECTION_URI` do Web Service

---

## 🎯 PASSO 3: ADICIONAR PERSISTENT DISK

⚠️ **CRÍTICO:** Sem isso, sessões do WhatsApp serão perdidas!

1. No Web Service, vá em **"Disks"**
2. **"Add Disk"**:
   ```
   Name: evolution-sessions
   Mount Path: /evolution/instances
   Size: 1 GB
   ```

---

## 🚀 PASSO 4: FAZER DEPLOY

1. Clique em **"Create Web Service"**
2. Aguarde 3-5 minutos
3. Logs devem mostrar:
   ```
   ✅ Listening on port 8080
   ✅ Evolution API is running
   ```

---

## 📱 PASSO 5: CONECTAR WHATSAPP

### 5.1 Obter URL da API

Sua Evolution API estará em:
```
https://evolution-api-zaero.onrender.com
```

### 5.2 Criar Instância via Postman/Insomnia/cURL

**Endpoint:** `POST /instance/create`

**Headers:**
```json
{
  "apikey": "sua-senha-super-secreta-123"
}
```

**Body:**
```json
{
  "instanceName": "zaero-bot",
  "qrcode": true,
  "integration": "WHATSAPP-BAILEYS"
}
```

**cURL:**
```bash
curl -X POST https://evolution-api-zaero.onrender.com/instance/create \
  -H "apikey: sua-senha-super-secreta-123" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "zaero-bot",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

**Resposta:**
```json
{
  "instance": {
    "instanceName": "zaero-bot",
    "status": "created"
  },
  "qrcode": {
    "code": "2@abc123...",
    "base64": "data:image/png;base64,..."
  }
}
```

### 5.3 Conectar WhatsApp

**Endpoint:** `GET /instance/connect/zaero-bot`

**Headers:**
```json
{
  "apikey": "sua-senha-super-secreta-123"
}
```

**cURL:**
```bash
curl https://evolution-api-zaero.onrender.com/instance/connect/zaero-bot \
  -H "apikey: sua-senha-super-secreta-123"
```

**Retorna QR Code:**
```json
{
  "qrcode": {
    "base64": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

### 5.4 Escanear QR Code

1. Copie o `base64` do QR Code
2. Cole em: https://base64.guru/converter/decode/image
3. Ou use o QR no terminal da Evolution API
4. **Escaneie com WhatsApp:**
   - WhatsApp → Aparelhos conectados
   - Conectar um aparelho
   - Escaneie o QR

---

## ✅ PASSO 6: VERIFICAR CONEXÃO

**Endpoint:** `GET /instance/connectionState/zaero-bot`

**cURL:**
```bash
curl https://evolution-api-zaero.onrender.com/instance/connectionState/zaero-bot \
  -H "apikey: sua-senha-super-secreta-123"
```

**Resposta se conectado:**
```json
{
  "instance": {
    "instanceName": "zaero-bot",
    "state": "open"
  }
}
```

---

## 📨 PASSO 7: ENVIAR MENSAGEM DE TESTE

**Endpoint:** `POST /message/sendText/zaero-bot`

**Body:**
```json
{
  "number": "5565984660212",
  "text": "🎉 Evolution API funcionando!"
}
```

**cURL:**
```bash
curl -X POST https://evolution-api-zaero.onrender.com/message/sendText/zaero-bot \
  -H "apikey: sua-senha-super-secreta-123" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5565984660212",
    "text": "🎉 Evolution API funcionando!"
  }'
```

---

## 🎨 INTERFACE WEB (BONUS)

Evolution API tem interface web!

Acesse: `https://evolution-api-zaero.onrender.com`

- ✅ Ver instâncias
- ✅ Conectar WhatsApp visualmente
- ✅ Ver QR Code
- ✅ Gerenciar conexões

**Login:**
- API Key: `sua-senha-super-secreta-123`

---

## 🔧 CONFIGURAÇÕES AVANÇADAS (OPCIONAL)

### Webhook para receber mensagens

```bash
# Adicione às variáveis de ambiente:
WEBHOOK_ENABLED=true
WEBHOOK_URL=https://seu-bot.onrender.com/webhook
WEBHOOK_BY_EVENTS=true
```

### Chatwoot Integration

```bash
CHATWOOT_ENABLED=true
CHATWOOT_ACCOUNT_ID=seu-account-id
CHATWOOT_TOKEN=seu-token
CHATWOOT_URL=https://app.chatwoot.com
```

### Typebot Integration

```bash
TYPEBOT_ENABLED=true
TYPEBOT_API_VERSION=latest
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

- **API Docs**: https://doc.evolution-api.com
- **GitHub**: https://github.com/EvolutionAPI/evolution-api
- **Postman Collection**: https://documenter.getpostman.com/view/20416578/Uzs3YnFh

---

## 🐛 TROUBLESHOOTING

### Erro: "Unauthorized"
✅ Verifique se o `apikey` está correto

### Erro: "Instance not found"
✅ Crie a instância primeiro com `/instance/create`

### QR Code não conecta
✅ Gere novo QR: `GET /instance/connect/zaero-bot`
✅ Escaneie RÁPIDO (expira em 40 segundos)

### Sessão perdida após restart
✅ Verifique se o Disk está montado em `/evolution/instances`

### Database error
✅ Confirme que a `DATABASE_CONNECTION_URI` está correta
✅ Database PostgreSQL deve estar rodando

---

## 💡 PRÓXIMOS PASSOS

Agora que a Evolution API está rodando:

### Opção 1: Usar Evolution API standalone
- Use os endpoints HTTP para tudo
- Seu bot atual não é mais necessário

### Opção 2: Integrar com seu bot atual
- Modifique `api/index.js` para fazer requests HTTP
- Remova código Baileys
- Use Evolution API como backend

### Opção 3: Webhook
- Configure webhook da Evolution API
- Aponte para seu bot atual
- Receba mensagens via HTTP POST

---

## 🎯 TESTE COMPLETO

Execute estes comandos para testar TUDO:

```bash
# 1. Criar instância
curl -X POST https://evolution-api-zaero.onrender.com/instance/create \
  -H "apikey: sua-senha" \
  -H "Content-Type: application/json" \
  -d '{"instanceName": "test", "qrcode": true}'

# 2. Conectar (pega QR)
curl https://evolution-api-zaero.onrender.com/instance/connect/test \
  -H "apikey: sua-senha"

# 3. Verificar estado
curl https://evolution-api-zaero.onrender.com/instance/connectionState/test \
  -H "apikey: sua-senha"

# 4. Enviar mensagem
curl -X POST https://evolution-api-zaero.onrender.com/message/sendText/test \
  -H "apikey: sua-senha" \
  -H "Content-Type: application/json" \
  -d '{"number": "5565984660212", "text": "Teste!"}'
```

---

**🔥 PRONTO! Evolution API está configurada e funcionando!** 🚀

Qualquer dúvida, consulte: https://doc.evolution-api.com
