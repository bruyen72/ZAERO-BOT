# 🚀 Guia de Deploy - Fly.io

## ✅ Correções Aplicadas

### 1. **Health Check Corrigido**
- ❌ Antes: `path = "/"` (endpoint sem health check específico)
- ✅ Agora: `path = "/health"` (endpoint dedicado que retorna status OK)

### 2. **Timings Otimizados**
- `grace_period`: 60s → 30s (mais rápido para detectar problemas)
- `interval`: 30s → 15s (verificações mais frequentes)

### 3. **Estratégia de Deploy**
- Adicionado: `strategy = "immediate"` para deploy mais rápido

### 4. **Arquivos Otimizados**
- Criado `.flyignore` para reduzir tamanho do upload
- Health check do Docker também otimizado

---

## 📋 Passo a Passo para Deploy

### **1. Instalar Fly CLI** (se ainda não instalou)
```bash
# Windows (PowerShell como Admin)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### **2. Login no Fly.io**
```bash
fly auth login
```

### **3. Verificar se o app existe**
```bash
fly apps list
```

### **4. Se o app NÃO existe, criar:**
```bash
fly launch --no-deploy
# Escolher:
# - App name: zaero-bot
# - Region: gru (São Paulo)
# - NÃO criar banco de dados
```

### **5. Deploy da Aplicação**
```bash
fly deploy
```

### **6. Verificar Status**
```bash
# Ver logs em tempo real
fly logs

# Ver status da app
fly status

# Abrir no navegador
fly open
```

### **7. Configurar Variáveis de Ambiente** (se necessário)
```bash
# Exemplo: adicionar variáveis secretas
fly secrets set OWNER_NUMBER=5511999999999
fly secrets set API_KEY=sua_chave_aqui
```

---

## 🔍 Troubleshooting

### **Problema: "Health check failed"**
```bash
# Ver logs detalhados
fly logs

# Verificar se o servidor está rodando
fly ssh console
# Dentro do container:
curl http://localhost:3000/health
```

### **Problema: "Cannot connect to machine"**
```bash
# Reiniciar a máquina
fly machine restart

# Ou destruir e recriar
fly apps destroy zaero-bot
fly launch
```

### **Problema: "Out of memory"**
```bash
# Aumentar memória no fly.toml
# [[vm]]
#   memory_mb = 1024  # ou 2048
```

---

## 🔧 Comandos Úteis

```bash
# Ver todas as apps
fly apps list

# Ver máquinas rodando
fly machine list

# SSH na máquina
fly ssh console

# Ver métricas
fly dashboard

# Destruir app (CUIDADO!)
fly apps destroy zaero-bot
```

---

## ✅ Verificação de Sucesso

Após o deploy, você deve ver:
1. ✅ Build completo sem erros
2. ✅ Health check passando (`/health` retorna status 200)
3. ✅ URL acessível: `https://zaero-bot.fly.dev`
4. ✅ Logs mostrando: "🚀 Servidor rodando na porta 3000"

---

## 📱 Conectar WhatsApp

Após deploy bem-sucedido:
1. Acesse: `https://zaero-bot.fly.dev`
2. Clique em "Conectar com QR Code" ou "Conectar com Código"
3. Escaneie o QR ou digite o código no WhatsApp

---

## ⚠️ Importante

- **Não commite** arquivos `.env` ou `Sessions/`
- Use `fly secrets` para variáveis sensíveis
- O bot reinicia automaticamente se cair
- Mínimo de 1 máquina sempre rodando (`min_machines_running = 1`)
