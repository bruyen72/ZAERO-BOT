# 🚀 Deploy ZÆRØ BOT no Render

Guia completo para fazer deploy do bot WhatsApp no **Render** - plataforma recomendada para bots WhatsApp em 2026.

## 📋 Por que Render?

✅ **Vantagens sobre Fly.io**:
- ✅ WebSocket funciona perfeitamente (essencial para WhatsApp)
- ✅ Deploy mais simples e confiável
- ✅ Suporte nativo a persistent disks (sessões do WhatsApp)
- ✅ Plano gratuito generoso (750h/mês)
- ✅ Melhor documentação e suporte da comunidade
- ✅ Sem problemas de proxy/forwarding que afetam Fly.io

## 🎯 Pré-requisitos

1. **Conta no Render** (gratuita)
   - Acesse: https://render.com
   - Cadastre-se com GitHub (recomendado)

2. **Repositório no GitHub**
   - Código já deve estar commitado
   - Link: https://github.com/bruyen72/ZAERO-BOT

3. **Node.js 21.7.3+** (já configurado no projeto)

## 📦 Configuração do Projeto

Arquivos já criados:
- ✅ `render.yaml` - Configuração principal
- ✅ `.renderignore` - Otimização de deploy
- ✅ `api/index.js` - Servidor com health check
- ✅ `package.json` - Dependências corretas

## 🚀 Passo a Passo do Deploy

### 1️⃣ Fazer Push do Código

```bash
# Commit todas as alterações
git add .
git commit -m "feat: Adiciona configuração Render"
git push origin main
```

### 2️⃣ Criar Web Service no Render

1. **Acesse o Dashboard**: https://dashboard.render.com
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório GitHub
4. Selecione: `bruyen72/ZAERO-BOT`

### 3️⃣ Configurar o Serviço

**Configurações Básicas**:
- **Name**: `zaero-bot` (ou qualquer nome)
- **Region**: `Oregon (US West)` (melhor latência para Brasil)
- **Branch**: `main`
- **Root Directory**: (deixe vazio)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run web`

**Environment Variables** (já configuradas no render.yaml):
- `NODE_ENV` = `production`
- `PORT` = `3000`

**Advanced Settings**:
- **Health Check Path**: `/health`
- **Auto-Deploy**: `Yes` (deploy automático a cada push)

### 4️⃣ Adicionar Persistent Disk (CRÍTICO!)

⚠️ **IMPORTANTE**: Sem disco persistente, a sessão do WhatsApp será perdida a cada restart!

1. Na página de configuração do serviço, role até **"Disks"**
2. Clique em **"Add Disk"**
3. Configure:
   - **Name**: `whatsapp-sessions`
   - **Mount Path**: `/app/Sessions`
   - **Size**: `1 GB` (suficiente para sessões)

### 5️⃣ Deploy!

1. Clique em **"Create Web Service"**
2. Aguarde o build e deploy (2-5 minutos)
3. Render exibirá logs em tempo real

## ✅ Verificar Deploy

### Logs de Sucesso

Você deve ver no console:
```
✅ Database carregado
🚀 Servidor rodando na porta 3000
🌐 Acesse: http://localhost:3000
✅ Pronto para receber conexões externas
```

### Testar Aplicação

1. **Health Check**:
   - Acesse: `https://zaero-bot.onrender.com/health`
   - Deve retornar: `{"status":"ok","uptime":123,"timestamp":"..."}`

2. **Interface Web**:
   - Acesse: `https://zaero-bot.onrender.com`
   - Deve carregar a página de conexão do WhatsApp

3. **Conectar WhatsApp**:
   - Escolha **QR Code** (método mais confiável)
   - OU **Código de Pareamento** (8 dígitos)

## 🔧 Troubleshooting

### ❌ Erro "Application failed to respond"

**Causa**: Servidor não iniciou corretamente
**Solução**:
```bash
# Verifique os logs no Dashboard
# Procure por erros de dependências
npm install  # Rodar localmente para testar
```

### ❌ Erro "Module not found: 'cors'"

**Causa**: Dependências não instaladas
**Solução**: O render.yaml já configura `npm install` como buildCommand
```bash
# Força rebuild no Render
# Dashboard → Settings → Manual Deploy → Clear build cache & deploy
```

### ❌ Código de Pareamento Não Funciona

**Causa**: Rate limit do WhatsApp ou número inválido
**Solução**:
1. **Use QR Code** (mais confiável)
2. Certifique-se do formato: `5511999999999` (DDI + DDD + número)
3. Aguarde 10 minutos entre tentativas

### ❌ Sessão Perdida Após Restart

**Causa**: Disco persistente não configurado
**Solução**:
1. Dashboard → Settings → Disks
2. Add Disk: `whatsapp-sessions` → `/app/Sessions` → 1GB

### ❌ Bot Desconecta Constantemente

**Causa**: Plano free dorme após 15min de inatividade
**Solução**:
1. **Opção 1**: Upgrade para plano pago ($7/mês)
2. **Opção 2**: Use um serviço de "keep-alive" (UptimeRobot, etc)
3. **Opção 3**: Configure auto-reconnect no código (já implementado)

## 📊 Monitoramento

### Logs em Tempo Real

```bash
# Via Dashboard
Render Dashboard → zaero-bot → Logs (tab)

# Filtrar erros
Procure por linhas com ❌ ou ERROR
```

### Métricas

- **CPU Usage**: Deve estar < 50% (plano free)
- **Memory**: ~200-300MB de uso
- **Uptime**: Verificar health checks

### Webhooks (Opcional)

Configure notificações de deploy:
- Dashboard → Settings → Notifications
- Webhook URL ou Email

## 🔐 Segurança

### Variáveis de Ambiente (Recomendado)

Se precisar adicionar credenciais:

1. Dashboard → Environment
2. **Add Environment Variable**
3. Exemplo:
   - `API_KEY` = `sua-chave-secreta`
   - `OWNER_NUMBER` = `5511999999999`

### HTTPS

✅ Render fornece HTTPS automático
- Certificado SSL gratuito
- Renovação automática

## 💰 Planos e Limites

### Free Plan
- ✅ 750 horas/mês (suficiente para 1 serviço)
- ✅ 100GB de bandwidth
- ⚠️ Dorme após 15min de inatividade
- ⚠️ Restart automático pode desconectar WhatsApp

### Starter Plan ($7/mês)
- ✅ Sem sleep (sempre ativo)
- ✅ Mais CPU e RAM
- ✅ Ideal para produção

## 🔄 Atualizações Automáticas

✅ **Auto-deploy ativado** no render.yaml

Toda vez que você fizer push:
```bash
git add .
git commit -m "feat: Nova funcionalidade"
git push origin main
# ↓ Deploy automático no Render
```

## 📚 Links Úteis

- 📖 [Documentação Render](https://render.com/docs)
- 🐛 [Status Page](https://status.render.com)
- 💬 [Community Forum](https://community.render.com)
- 📧 [Suporte](https://render.com/support)

## ✨ Diferenças vs Fly.io

| Recurso | Render | Fly.io |
|---------|--------|--------|
| WebSocket para WhatsApp | ✅ Funciona | ❌ Problemas conhecidos |
| Setup | ✅ Simples | ⚠️ Complexo |
| Persistent Storage | ✅ Disk nativo | ⚠️ Volumes separados |
| Plano Free | ✅ 750h/mês | ⚠️ Sleep agressivo |
| Latência Brasil | ⚠️ Oregon (EUA) | ✅ GRU (São Paulo) |
| Suporte | ✅ Excelente | ⚠️ Limitado |

## 🎯 Próximos Passos

Após deploy bem-sucedido:

1. ✅ Conectar WhatsApp (QR ou Código)
2. ✅ Testar comandos básicos
3. ✅ Configurar grupos e permissões
4. ✅ Monitorar logs e performance
5. 💡 Considerar upgrade para Starter Plan (produção)

---

**🤖 Bot desenvolvido por**: The-King-Destroy
**📦 Repositório**: https://github.com/bruyen72/ZAERO-BOT
**🚀 Deploy**: Render (recomendado para WhatsApp bots)
