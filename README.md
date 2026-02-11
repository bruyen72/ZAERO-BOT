# 🤖 ZAERO-BOT - Bot WhatsApp Multi-Dispositivo

[![GitHub](https://img.shields.io/badge/GitHub-bruyen72%2FZAERO--BOT-blue?style=for-the-badge&logo=github)](https://github.com/bruyen72/ZAERO-BOT)
[![Baileys](https://img.shields.io/badge/Baileys-7.0.0--rc.9-green?style=for-the-badge)](https://github.com/WhiskeySockets/Baileys)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-Funcional-success?style=for-the-badge)](https://github.com/bruyen72/ZAERO-BOT)

> 🚀 **Bot WhatsApp profissional** com **persistência de sessão estável**, **1000+ comandos**, sistema de **economia**, **gacha**, **SubBots** e muito mais!

---

## ✅ CORREÇÕES APLICADAS (11/02/2026)

Este repositório foi **completamente corrigido** para resolver problemas de **persistência de sessão** com o Baileys.

### **Problemas Resolvidos:**

| ❌ Antes | ✅ Agora |
|---------|----------|
| Bot perdia sessão após reiniciar | **Sessão persistente estável** |
| Bot MORRIA ao desconectar no celular | **Reconecta automaticamente** |
| QR Code sempre solicitado | **QR apenas na primeira vez** |
| Reconexão instável (loops infinitos) | **Reconexão controlada com delay** |
| Configurações problemáticas | **Otimizado para estabilidade** |

### **7 Correções Críticas Aplicadas:**

1. ✅ **Flag shouldRestart** - Controla reconexões e previne loops
2. ✅ **Tratamento de loggedOut** - Reconecta em vez de morrer
3. ✅ **Delay de 3s** - Reconexões aceitas pelo WhatsApp
4. ✅ **markOnlineOnConnect: true** - Estabilidade melhorada
5. ✅ **Verificação de sessão** - Só reconecta se sessão válida
6. ✅ **Comando síncrono** - `fs.rmSync()` em vez de `exec()`
7. ✅ **Função init() inteligente** - Detecção automática de sessão

📚 **Documentação Completa:** [Leia aqui](./README-CORREÇÕES.md)

---

## 🚀 INSTALAÇÃO RÁPIDA

### **Pré-requisitos:**
- Node.js 18+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))

### **Passo 1: Clonar o Repositório**
```bash
git clone https://github.com/bruyen72/ZAERO-BOT.git
cd ZAERO-BOT
```

### **Passo 2: Instalar Dependências**
```bash
npm install
```

### **Passo 3: Iniciar o Bot**

**Opção A: QR Code (Recomendado)**
```bash
node index.js --qr
```

**Opção B: Código de Pareamento**
```bash
node index.js --code
```

### **Passo 4: Conectar ao WhatsApp**

1. Abra WhatsApp no celular
2. Vá em **Aparelhos Conectados** → **Conectar novo aparelho**
3. Escaneie o QR Code que aparecer no terminal
4. Aguarde a mensagem: `✅ Conectado a: Seu Nome`

---

## ✅ TESTE DE PERSISTÊNCIA

```bash
# 1. Conecte o bot (passo acima)
# 2. Pare o bot
Ctrl+C

# 3. Reinicie
node index.js

# ✅ ESPERADO: Bot reconecta SEM pedir novo QR Code!
```

---

## 📦 FUNCIONALIDADES

### **🎮 1000+ Comandos Organizados:**

| Categoria | Comandos | Descrição |
|-----------|----------|-----------|
| 📥 **Downloads** | `!play`, `!yt`, `!tiktok`, `!instagram` | Download de mídia |
| 💰 **Economia** | `!daily`, `!work`, `!casino`, `!slots` | Sistema de moedas |
| 🎴 **Gacha** | `!claim`, `!harem`, `!trade` | Coleção de personagens |
| 👥 **Grupo** | `!kick`, `!promote`, `!welcome` | Gerenciamento |
| 👤 **Perfil** | `!profile`, `!marry`, `!level` | Sistema de perfis |
| 🎨 **Utilidades** | `!sticker`, `!translate`, `!chatgpt` | Ferramentas |
| 🔞 **NSFW** | `!rule34`, `!xnxx` | Conteúdo adulto |
| 👑 **Owner** | `!exec`, `!restart`, `!update` | Comandos do dono |

### **🔧 Recursos Técnicos:**

- ✅ **Persistência de Sessão** (baseado em `useMultiFileAuthState`)
- ✅ **Reconexão Automática** (com delay adequado)
- ✅ **SubBots** (múltiplas instâncias gerenciadas)
- ✅ **Interface Web** (gerenciamento via browser)
- ✅ **API REST** (integração externa)
- ✅ **Banco de Dados JSON** (persistente)
- ✅ **Cache Otimizado** (NodeCache)
- ✅ **Carregador Dinâmico** (hot reload de comandos)

---

## 📖 DOCUMENTAÇÃO

| Arquivo | Descrição |
|---------|-----------|
| **[README-CORREÇÕES.md](./README-CORREÇÕES.md)** | 📘 **COMECE AQUI** - Guia prático de uso |
| **[RESUMO-FINAL.md](./RESUMO-FINAL.md)** | 📊 Visão geral das mudanças |
| **[RELATORIO-COMPARACAO-TECNICA.md](./RELATORIO-COMPARACAO-TECNICA.md)** | 🔬 Análise técnica profunda |
| **[MUDANCAS-APLICADAS.md](./MUDANCAS-APLICADAS.md)** | 📝 Lista de correções (antes/depois) |
| **[GUIA-TESTE-RAPIDO.md](./GUIA-TESTE-RAPIDO.md)** | 🧪 Testes e troubleshooting |
| **[COMANDOS-COMPLETOS.md](./COMANDOS-COMPLETOS.md)** | 📚 Lista de todos os comandos |
| **[DEPLOY.md](./DEPLOY.md)** | 🚀 Guia de deploy em produção |

---

## 🌐 DEPLOY EM PRODUÇÃO

### **Render / Heroku / Railway:**

1. Faça fork deste repositório
2. Configure variáveis de ambiente (opcional):
   ```
   BOT_NUMBER=+5511999999999
   OWNER_NUMBER=+5511888888888
   ```
3. Faça deploy
4. ✅ Bot conecta automaticamente se já tiver sessão

### **VPS (Ubuntu/Debian):**

```bash
# Instalar PM2
npm install -g pm2

# Iniciar bot
pm2 start index.js --name zaero-bot

# Salvar configuração
pm2 save
pm2 startup
```

---

## 🐛 PROBLEMAS COMUNS

### **Bot não conecta após reiniciar**
```bash
# Solução: Apagar sessão e reconectar
rm -rf ./Sessions/Owner
node index.js --qr
```

### **QR Code não aparece**
```bash
# Solução: Forçar modo QR
node index.js --qr
```

### **Erro: Cannot find module '@whiskeysockets/baileys'**
```bash
# Solução: Instalar dependências
npm install
```

### **Bot conecta mas desconecta logo depois**
```bash
# Solução: Atualizar Baileys e limpar sessão
npm update @whiskeysockets/baileys
rm -rf ./Sessions/Owner
node index.js --qr
```

---

## 🤝 CONTRIBUINDO

Contribuições são bem-vindas! Sinta-se à vontade para:

1. 🐛 Reportar bugs via [Issues](https://github.com/bruyen72/ZAERO-BOT/issues)
2. 💡 Sugerir novas funcionalidades
3. 🔧 Enviar Pull Requests

---

## 📜 LICENÇA

Este projeto é de código aberto. Use com responsabilidade.

---

## ⚠️ IMPORTANTE

- ✅ Use apenas para fins educacionais e legais
- ❌ **NÃO** commite credenciais (pasta `Sessions/` está no `.gitignore`)
- ❌ **NÃO** use para spam ou atividades ilegais
- ✅ Respeite os [Termos de Serviço do WhatsApp](https://www.whatsapp.com/legal/terms-of-service)

---

## 📊 ESTATÍSTICAS

- **1000+ Comandos** implementados
- **200+ Arquivos** no projeto
- **37.000+ Linhas** de código
- **7 Correções Críticas** aplicadas
- **5 Documentos** detalhados criados

---

## 🎯 STATUS DO PROJETO

✅ **Funcional e Estável**
- Persistência de sessão: ✅ OK
- Reconexão automática: ✅ OK
- Tratamento de logout: ✅ OK
- Deploy em produção: ✅ PRONTO
- Comandos: ✅ 1000+ FUNCIONANDO

---

## 📞 SUPORTE

Se encontrar problemas:

1. Leia a [documentação completa](./README-CORREÇÕES.md)
2. Verifique [problemas comuns](#-problemas-comuns)
3. Consulte o [guia de testes](./GUIA-TESTE-RAPIDO.md)
4. Abra uma [issue no GitHub](https://github.com/bruyen72/ZAERO-BOT/issues)

---

## 🌟 CRÉDITOS

- **Baileys**: [@WhiskeySockets](https://github.com/WhiskeySockets/Baileys)
- **Correções e Análise**: Claude Sonnet 4.5 (Anthropic)
- **Desenvolvimento Original**: Destroy & Yuki Suou
- **Manutenção Atual**: [@bruyen72](https://github.com/bruyen72)

---

## 🔗 LINKS ÚTEIS

- **[GitHub](https://github.com/bruyen72/ZAERO-BOT)** - Repositório oficial
- **[Baileys Docs](https://whiskeysockets.github.io/)** - Documentação Baileys
- **[Node.js](https://nodejs.org/)** - Download Node.js
- **[Issues](https://github.com/bruyen72/ZAERO-BOT/issues)** - Reportar problemas

---

<div align="center">

**⭐ Se este projeto te ajudou, deixe uma estrela no repositório! ⭐**

[![GitHub stars](https://img.shields.io/github/stars/bruyen72/ZAERO-BOT?style=social)](https://github.com/bruyen72/ZAERO-BOT/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/bruyen72/ZAERO-BOT?style=social)](https://github.com/bruyen72/ZAERO-BOT/network/members)

---

**Desenvolvido com ❤️ por [bruyen72](https://github.com/bruyen72)**

**Última atualização:** 11/02/2026

</div>
