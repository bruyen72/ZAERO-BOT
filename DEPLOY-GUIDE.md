# 🚀 GUIA DE DEPLOY - ZÆRØ BOT

## 📋 Comparação de Plataformas

| Plataforma | ✅ Funciona | Conexão Persistente | Custo | Recomendação |
|-----------|------------|---------------------|-------|--------------|
| **Render** | ✅ SIM | ✅ SIM | Free/Pago | ⭐⭐⭐⭐⭐ MELHOR |
| **Koyeb** | ✅ SIM | ✅ SIM | Free/Pago | ⭐⭐⭐⭐ Ótimo |
| **Railway** | ✅ SIM | ✅ SIM | $5/mês | ⭐⭐⭐⭐ Bom |
| **Vercel** | ⚠️ LIMITADO | ❌ NÃO | Free/Pago | ⭐⭐ Não recomendado |

---

## ⚠️ IMPORTANTE: Por que Vercel NÃO é ideal?

### Problemas do Vercel:
1. ❌ **Serverless** - Cada request cria uma nova instância
2. ❌ **Sem WebSocket persistente** - WhatsApp desconecta a cada request
3. ❌ **Timeout curto** - 10s (free) ou 60s (pro)
4. ❌ **Sessão não persiste** - Precisa reconectar sempre

### O que funciona no Vercel:
- ✅ Interface web (QR Code, status)
- ✅ API endpoints básicos
- ❌ **Bot WhatsApp completo** (não mantém conexão)

---

## 🏆 RECOMENDAÇÃO: RENDER (Melhor opção FREE)

### Por que Render?
- ✅ **Free tier generoso** - 750h/mês grátis
- ✅ **Conexão persistente** - Perfeito para WhatsApp
- ✅ **Auto-deploy** com GitHub
- ✅ **Logs em tempo real**
- ✅ **SSL/HTTPS automático**

### Limitações:
- ⏸️ Desliga após 15min de inatividade (free tier)
- 🔄 Demora ~30s para reiniciar

---

## 📦 DEPLOY NO RENDER (PASSO A PASSO)

### 1. Preparar o Projeto

Certifique-se que tem:
- ✅ `package.json` configurado
- ✅ `render.yaml` (vou criar)
- ✅ Código no GitHub

### 2. Criar conta no Render

1. Acesse https://render.com
2. Faça login com GitHub
3. Autorize acesso ao repositório

### 3. Criar Web Service

1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub
3. Configure:
   - **Name:** `zaero-bot`
   - **Region:** `Frankfurt (Europe)` (mais próximo do Brasil)
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `npm run web`
   - **Plan:** `Free`

### 4. Variáveis de Ambiente (opcional)

Se quiser proteger suas chaves de API:
```env
STELLAR_API_KEY=YukiWaBot
NODE_ENV=production
PORT=3000
```

### 5. Deploy!

- Clique em **"Create Web Service"**
- Aguarde ~5 minutos
- ✅ Bot online!

---

## 📦 DEPLOY NO KOYEB (ALTERNATIVA)

### Vantagens:
- ✅ Não desliga por inatividade (free tier)
- ✅ Deploy automático
- ✅ SSL incluído

### Desvantagens:
- ⚠️ Free tier mais limitado (100h/mês em 2026)

### Passo a passo:

1. Acesse https://koyeb.com
2. Criar conta
3. **New App** → **GitHub**
4. Selecione repositório
5. Configure:
   - **Build command:** `npm install`
   - **Run command:** `npm run web`
   - **Port:** `3000`
   - **Instance:** `Free`

---

## 🐳 DEPLOY COM DOCKER (Render/Railway/Qualquer)

Se a plataforma suportar Docker, use o `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "run", "web"]
```

---

## 🔧 CONFIGURAÇÕES NECESSÁRIAS

### Para Render (render.yaml)

Arquivo criado automaticamente neste guia.

### Para Koyeb

Não precisa de arquivo de configuração - configure pela interface.

### Para Railway

Detecta automaticamente o `package.json`.

---

## 🌐 ACESSO APÓS DEPLOY

Após o deploy, você terá uma URL tipo:
- Render: `https://zaero-bot.onrender.com`
- Koyeb: `https://zaero-bot-usuario.koyeb.app`

### Acessar interface web:
```
https://seu-bot.onrender.com
```

### Conectar WhatsApp:
1. Abra a URL
2. Escolha "QR Code" ou "Código de Pareamento"
3. Escaneie/digite no WhatsApp
4. ✅ Bot conectado!

---

## 🔒 SEGURANÇA

### Variáveis sensíveis:
- ❌ **NÃO commite** no GitHub:
  - Chaves de API privadas
  - Tokens
  - Senhas

- ✅ **Use variáveis de ambiente** na plataforma

### .gitignore deve incluir:
```
.env
Sessions/
node_modules/
*.log
```

---

## 📊 MONITORAMENTO

### Render:
- Logs em tempo real no dashboard
- Notificações de deploy

### Koyeb:
- Logs no dashboard
- Métricas de uso

### Logs importantes:
```
✅ WhatsApp conectado!
📨 Mensagem recebida
✅ main.js processado
```

---

## 🐛 TROUBLESHOOTING

### Bot desconecta frequentemente (Render Free):
- ✅ Normal - desliga após 15min de inatividade
- 💡 Solução: Use um monitor (UptimeRobot) para fazer ping a cada 5min

### Comandos não funcionam:
1. Verifique logs
2. Confirme que `npm run web` está rodando
3. Verifique se porta 3000 está exposta

### Fetch failed:
- ✅ JÁ CORRIGIDO nesta sessão!
- Todas as correções já aplicadas

---

## 🎯 CHECKLIST ANTES DO DEPLOY

- [ ] Todos os comandos testados localmente
- [ ] `npm run web` funciona
- [ ] `.env` não está no GitHub
- [ ] `package.json` tem script "web"
- [ ] `render.yaml` configurado (se usar Render)
- [ ] Código commitado no GitHub
- [ ] `.gitignore` configurado

---

## 🚀 PRÓXIMOS PASSOS APÓS DEPLOY

1. ✅ Testar conexão WhatsApp
2. ✅ Testar comandos principais (.menu, .ping, .imagen)
3. ✅ Configurar monitor (opcional)
4. ✅ Compartilhar URL com usuários
5. 🎉 Bot online 24/7!

---

✧ ZÆRØ BOT ✧ | Deploy Guide 2026
