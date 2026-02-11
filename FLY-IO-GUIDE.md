# 🚀 DEPLOY NO FLY.IO - ZÆRØ BOT

## ✅ Por que Fly.io?

- 🌎 **Data center no Brasil** (gru - São Paulo) - Baixa latência!
- ⚡ **Sempre online** - Não desliga por inatividade
- 💰 **Free tier generoso** - $5 de crédito grátis/mês
- 🔄 **Auto-deploy** - Conecta com GitHub
- 🐳 **Suporta Docker** - Deploy otimizado

---

## 📋 CONFIGURAÇÃO RECOMENDADA

### Interface Web Fly.io:

| Campo | Valor Recomendado |
|-------|-------------------|
| **App name** | `zaero-bot` |
| **Organization** | Personal |
| **Branch** | `main` |
| **Region** | `gru` (São Paulo, Brazil) |
| **Internal port** | `3000` ⚠️ NÃO 8080! |
| **CPU** | `shared-cpu-1x` (OK) |
| **Memory** | `512MB` ou `1GB` ⚠️ NÃO 256MB! |

### Environment Variables (Opcional):

```
NODE_ENV = production
PORT = 3000
```

---

## 🔧 CONFIGURAÇÃO VIA INTERFACE WEB

### Passo 1: Configure corretamente

Na tela do Fly.io que você está vendo:

1. ✅ **App name:** `zaero-bot` (OK)
2. ✅ **Region:** `gru - São Paulo` (OK)
3. ❌ **Internal port:** Mude de `8080` para `3000`
4. ⚠️ **Memory:** Mude de `256MB` para `512MB`

### Passo 2: Config path (fly.toml)

- **Config path:** Deixe `./fly.toml`
- O arquivo `fly.toml` já está no repositório!

### Passo 3: Database

- **NÃO** selecione Managed Postgres
- Bot não precisa de database externo

### Passo 4: Deploy!

Clique em **"Deploy"** e aguarde ~3-5 minutos

---

## 🎯 PASSO A PASSO COMPLETO

### 1. Commitar fly.toml no GitHub

```bash
cd "C:\Users\laboratorio\Downloads\ZÆRØ BOT"
git add fly.toml FLY-IO-GUIDE.md
git commit -m "🚀 Adiciona configuração Fly.io"
git push
```

### 2. Configurar na Interface Web

Siga as configurações acima na interface do Fly.io

### 3. Deploy!

Clique em **"Deploy"** e aguarde

### 4. Monitorar Deploy

Você verá logs em tempo real:
```
Building...
npm install
Deploying...
✅ Deploy successful!
```

### 5. Acessar Bot

URL gerada: `https://zaero-bot.fly.dev`

---

## 📊 APÓS O DEPLOY

### Conectar WhatsApp:

1. Acesse `https://zaero-bot.fly.dev`
2. Escolha QR Code ou Código de Pareamento
3. Conecte seu WhatsApp
4. ✅ Bot online!

### Verificar Logs:

Via Fly.io CLI:
```bash
fly logs -a zaero-bot
```

Ou na dashboard do Fly.io.

---

## 💰 CUSTOS (Free Tier)

Fly.io dá **$5 de crédito grátis/mês**.

**Uso estimado do bot:**
- CPU: ~$2/mês
- Memória (512MB): ~$3/mês
- **Total: ~$5/mês** ✅ Cabe no free tier!

**Dica:** Monitore uso na dashboard

---

## ⚙️ CONFIGURAÇÃO AVANÇADA (fly.toml)

O arquivo `fly.toml` já está otimizado com:

✅ **Port 3000** (correto)
✅ **auto_stop_machines = false** (sempre online)
✅ **min_machines_running = 1** (pelo menos 1 rodando)
✅ **512MB RAM** (mínimo recomendado)
✅ **Health checks** (verifica se bot está OK)
✅ **Region: gru** (São Paulo)

---

## 🐛 TROUBLESHOOTING

### Bot desconecta do WhatsApp

**Problema:** Memória insuficiente (256MB)
**Solução:** Aumente para 512MB ou 1GB

### Deploy falha

**Possíveis causas:**
1. Porta errada (8080 em vez de 3000)
2. Memória muito baixa
3. fly.toml mal configurado

**Solução:** Use o `fly.toml` que criei

### Como aumentar memória?

Na dashboard Fly.io:
1. **Settings** → **VM Size**
2. Mude para `512MB` ou `1GB`
3. Restart app

---

## 📈 MONITORAMENTO

### Via CLI:
```bash
# Instalar Fly CLI
brew install flyctl  # Mac
# ou
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"  # Windows

# Ver logs
fly logs -a zaero-bot

# Ver status
fly status -a zaero-bot

# Escalar memória
fly scale memory 512 -a zaero-bot
```

### Via Dashboard:
- Acesse https://fly.io/dashboard
- Selecione `zaero-bot`
- Veja métricas, logs, status

---

## 🔄 UPDATES FUTUROS

Quando atualizar o código:

```bash
git add .
git commit -m "Descrição da atualização"
git push
```

Fly.io detecta e faz **auto-deploy** automaticamente! ✨

---

## ✅ CHECKLIST

Antes de clicar em Deploy:

- [ ] ✅ `fly.toml` commitado no GitHub
- [ ] ✅ Internal port = **3000** (não 8080)
- [ ] ✅ Memory = **512MB** (não 256MB)
- [ ] ✅ Region = **gru** (São Paulo)
- [ ] ✅ Branch = **main**
- [ ] ✅ Config path = `./fly.toml`
- [ ] ❌ Database = **NÃO** selecionado

---

## 🎉 VANTAGENS FLY.IO

| Vantagem | Descrição |
|----------|-----------|
| 🇧🇷 **Brasil** | Servidor em São Paulo |
| ⚡ **Rápido** | Latência baixíssima |
| 🔄 **Auto-deploy** | Conecta com GitHub |
| 💰 **Free tier** | $5 grátis/mês |
| 🛠️ **Fácil** | Interface simples |
| 📊 **Logs** | Em tempo real |

---

## 🆚 FLY.IO vs RENDER

| Aspecto | Fly.io | Render |
|---------|--------|--------|
| **Servidor BR** | ✅ São Paulo | ❌ Frankfurt |
| **Sempre online** | ✅ Sim | ⚠️ Desliga (free) |
| **Custo** | ~$5/mês | Grátis* |
| **Auto-deploy** | ✅ Sim | ✅ Sim |
| **Latência** | 🏆 Melhor | Boa |

*Render free desliga após 15min de inatividade

---

✧ ZÆRØ BOT ✧ | Fly.io Deploy Guide
