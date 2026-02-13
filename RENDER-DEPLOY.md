# 🚀 GUIA DE DEPLOY NO RENDER - ZAERO-BOT

**Última atualização:** 11/02/2026

---

## ⚡ DEPLOY RÁPIDO (3 Passos)

### **Passo 1: Configurar no Render**

1. Acesse [render.com](https://render.com) e faça login
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório GitHub: `bruyen72/ZAERO-BOT`
4. Configure:
   - **Name:** `zaero-bot`
   - **Region:** Oregon (Free)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node index.js`
   - **Instance Type:** Free

### **Passo 2: Variáveis de Ambiente (Opcional)**

No painel do Render, adicione:

```
NODE_ENV=production
NODE_VERSION=18.19.0
```

### **Passo 3: Deploy**

Clique em **"Create Web Service"** e aguarde o deploy!

---

## ✅ USANDO render.yaml (Recomendado)

O projeto já inclui um arquivo `render.yaml` configurado:

```yaml
services:
  - type: web
    name: zaero-bot
    runtime: node
    region: oregon
    plan: free
    branch: main
    buildCommand: npm install
    startCommand: node index.js
    envVars:
      - key: NODE_VERSION
        value: 18.19.0
      - key: NODE_ENV
        value: production
    autoDeploy: true
```

**Vantagem:** O Render detecta automaticamente e usa essas configurações!

---

## 🐳 DEPLOY COM DOCKER (Alternativa)

Se preferir usar Docker no Render:

### **1. Configurar no Render**
- **Build Command:** (deixe vazio)
- **Start Command:** (deixe vazio)
- O Render detectará o `Dockerfile` automaticamente

### **2. Build Local (Teste)**
```bash
# Construir imagem
docker build -t zaero-bot .

# Executar
docker run -p 3000:3000 -v $(pwd)/Sessions:/app/Sessions zaero-bot
```

### **3. Usar Docker Compose (Local)**
```bash
docker-compose up -d
```

---

## 📱 CONECTAR O BOT APÓS DEPLOY

### **Opção A: Via Logs do Render**

1. No painel do Render, vá em **"Logs"**
2. Aguarde aparecer o QR Code
3. Escaneie com WhatsApp
4. ✅ Conectado!

### **Opção B: Via Interface Web**

Se a API web estiver configurada:

1. Acesse: `https://seu-projeto.onrender.com`
2. Use a interface para gerar QR Code ou código
3. Conecte via WhatsApp

---

## ⚠️ IMPORTANTE - PERSISTÊNCIA DE SESSÃO

### **Problema:** Render Free apaga arquivos após inatividade

**Solução 1: Usar Banco de Dados Externo (Recomendado)**
- Configure MongoDB, Redis ou PostgreSQL
- Salve credenciais lá em vez de arquivos

**Solução 2: Render Paid Plan**
- Planos pagos mantêm arquivos persistentes
- A partir de $7/mês

**Solução 3: Reconectar Automaticamente**
- O bot já tem lógica de reconexão
- Mas precisará escanear QR novamente se a sessão for perdida

---

## 🔧 CONFIGURAÇÕES AVANÇADAS

### **Manter o Serviço Ativo (Free Plan)**

O plano gratuito do Render hiberna após 15 minutos de inatividade.

**Solução:** Usar UptimeRobot para fazer ping
1. Acesse [uptimerobot.com](https://uptimerobot.com)
2. Adicione monitor HTTP(s)
3. URL: `https://seu-projeto.onrender.com`
4. Intervalo: 5 minutos

### **Aumentar Timeout**

Se o bot demora para conectar:

No `render.yaml`, adicione:
```yaml
healthCheckPath: /health
```

E crie endpoint no código:
```javascript
app.get('/health', (req, res) => {
  res.status(200).send('OK')
})
```

---

## 📊 MONITORAMENTO

### **Ver Logs em Tempo Real**
```bash
# Instalar Render CLI
npm install -g @render-cli/cli

# Login
render login

# Ver logs
render logs -s zaero-bot
```

### **No Painel Web**
- Acesse: Dashboard → seu-projeto → **Logs**
- Veja conexão, erros, status em tempo real

---

## 🐛 TROUBLESHOOTING

### **Erro: "Dockerfile: no such file or directory"**

✅ **RESOLVIDO!** Agora o projeto tem:
- `render.yaml` (configuração automática)
- `Dockerfile` (para deploy Docker)

### **Erro: "Module not found"**

```bash
# Build command correto:
npm install

# Start command correto:
node index.js
```

### **Bot não conecta**

1. Verifique logs do Render
2. Aguarde até ver: `⏳ Aguardando novo login...`
3. Se aparecer QR, copie e escaneie
4. Se não aparecer, use interface web

### **Sessão perdida após restart**

É normal no plano free. Opções:
1. Reconectar manualmente (escanear QR)
2. Usar plano pago ($7/mês) para persistência
3. Migrar credenciais para DB externo

---

## 💰 CUSTOS

| Plano | Preço | Persistência | Uptime |
|-------|-------|--------------|--------|
| **Free** | $0 | ❌ Não | 750h/mês |
| **Starter** | $7/mês | ✅ Sim | 24/7 |
| **Standard** | $25/mês | ✅ Sim | 24/7 |

---

## 🔄 ATUALIZAÇÃO AUTOMÁTICA

Com `autoDeploy: true` no `render.yaml`:

1. Faça mudanças no código
2. `git push origin main`
3. ✅ Render faz deploy automaticamente!

---

## 📦 ALTERNATIVAS AO RENDER

### **Railway**
- Similar ao Render
- $5/mês para persistência
- Deploy: `railway up`

### **Fly.io**
- Gratuito com limitações
- Boa persistência
- Deploy: `fly deploy`

### **Heroku**
- Não tem mais plano free
- A partir de $7/mês
- Deploy: `git push heroku main`

### **VPS (Digital Ocean, AWS, etc)**
- Controle total
- A partir de $5/mês
- Mais configuração necessária

---

## ✅ CHECKLIST DE DEPLOY

Antes de fazer deploy, verifique:

- [ ] ✅ `package.json` tem todas dependências
- [ ] ✅ `render.yaml` está configurado
- [ ] ✅ `.gitignore` protege pasta `Sessions/`
- [ ] ✅ Código está no branch `main`
- [ ] ✅ Testou localmente: `node index.js --qr`
- [ ] ✅ Bot conecta e mantém sessão local

---

## 🎯 RESULTADO ESPERADO

Após deploy bem-sucedido:

```
✅ Build: Success
✅ Deploy: Live
✅ Status: Running
✅ Logs: Showing "⏳ Aguardando novo login..."
```

Agora você pode:
1. Escanear QR Code (se aparecer nos logs)
2. Ou usar interface web: `https://seu-projeto.onrender.com`
3. Conectar bot ao WhatsApp
4. ✅ Bot funcionando em produção!

---

## 📚 RECURSOS ADICIONAIS

- 📖 [Documentação Render](https://render.com/docs)
- 📖 [Render + Node.js](https://render.com/docs/deploy-node-express-app)
- 📖 [Render YAML Spec](https://render.com/docs/yaml-spec)
- 🐳 [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)

---

**🚀 Bom deploy!**

Se tiver problemas, consulte os logs e a documentação completa em `README-CORREÇÕES.md`
