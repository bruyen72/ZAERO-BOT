# ✧ ZÆRØ BOT ✧

<div align="center">

![ZÆRØ BOT](https://img.shields.io/badge/ZÆRØ%20BOT-v2.0-blue?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge&logo=node.js)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Multi%20Device-25D366?style=for-the-badge&logo=whatsapp)
![Status](https://img.shields.io/badge/Status-Online-success?style=for-the-badge)

**Bot WhatsApp Multi-Device completo com +500 comandos**

[Deploy](#-deploy) • [Instalação](#-instalação-local) • [Comandos](#-comandos) • [Suporte](#-suporte)

</div>

---

## 📋 Sobre

**ZÆRØ BOT** é um bot WhatsApp completo e otimizado com suporte Multi-Device usando a biblioteca Baileys.

### ✨ Destaques

- ⚡ **Performance otimizada** - Processamento paralelo de mensagens
- 🔒 **Proteção contra timeouts** - Fetch com timeout em todos os comandos
- 🌐 **Interface Web** - Conecte via QR Code ou código de pareamento
- 🎨 **+500 comandos** - Downloads, IA, jogos, utilidades e muito mais
- 🐳 **Deploy fácil** - Pronto para Render, Koyeb, Railway
- 🔧 **Altamente configurável** - Personalize completamente

---

## 🚀 Deploy

### Render (Recomendado - Free)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

1. Fork este repositório
2. Crie conta no [Render](https://render.com)
3. New + → Web Service
4. Conecte seu fork
5. Deploy automático! ✅

**Leia o guia completo:** [DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md)

### Outras Plataformas

- 🟢 **Koyeb** - Suportado
- 🟣 **Railway** - Suportado
- 🐳 **Docker** - `Dockerfile` incluído
- ⚠️ **Vercel** - Não recomendado (limitações de WebSocket)

---

## 💻 Instalação Local

### Requisitos

- Node.js 20+
- Git
- WhatsApp (celular ou web)

### Passo a Passo

```bash
# Clone o repositório
git clone https://github.com/bruyen72/Z-R-BOT.git
cd Z-R-BOT

# Instale dependências
npm install

# Inicie o bot (escolha um modo)
npm run web      # Interface web (http://localhost:3000)
npm start        # Terminal com QR Code
npm run terminal # Terminal interativo
```

### Conectar WhatsApp

**Modo Web:**
1. Execute `npm run web`
2. Abra http://localhost:3000
3. Escaneie QR Code ou use código de pareamento

**Modo Terminal:**
1. Execute `npm start`
2. Escaneie QR Code no terminal

---

## 📦 Comandos

### Categorias

| Categoria | Comandos | Exemplos |
|-----------|----------|----------|
| 🤖 **IA** | ChatGPT, Gemini | `.chatgpt explique IA` |
| 📥 **Downloads** | TikTok, YouTube, Instagram | `.tiktok [url]`, `.play música` |
| 🖼️ **Imagens** | Google Images, Stickers | `.imagen pokemon`, `.sticker` |
| 🎮 **Jogos** | Gacha, RPG, Quiz | `.gacha`, `.rw` |
| 👥 **Grupo** | Admin, Moderação | `.kick @user`, `.promote` |
| 🔧 **Utilidades** | Tradutor, QR Code | `.tradutor pt texto` |
| 🎨 **Diversão** | Memes, Reactions | `.meme`, `.hug @user` |

**Total:** 529 comandos carregados

### Comandos Principais

```bash
.menu              # Menu completo
.ping              # Latência do bot
.chatgpt [texto]   # IA ChatGPT
.imagen [termo]    # Busca imagens Google
.play [música]     # Download YouTube
.tiktok [url]      # Download TikTok
.sticker           # Criar sticker
```

---

## ⚙️ Configuração

### Variáveis de Ambiente (opcional)

```env
# .env (não commitar!)
STELLAR_API_KEY=sua_chave
NODE_ENV=production
PORT=3000
```

### Personalização

Edite `settings.js`:
```javascript
global.owner = ['5565984660212']  // Seu número
global.botName = "MEU BOT"
global.botLogo = "./logo.png"
```

---

## 🔧 Desenvolvimento

### Testar Comandos

```bash
npm run test
# ou
npm run deploy:check
```

### Estrutura de Pastas

```
Z-R-BOT/
├── api/              # Interface web
├── commands/         # Todos os comandos
│   ├── downloads/
│   ├── utils/
│   ├── anime/
│   └── ...
├── lib/              # Bibliotecas core
│   ├── fetch-wrapper.js  # Fetch com timeout
│   ├── message.js        # Handler de mensagens
│   └── cache.js          # Sistema de cache
├── Sessions/         # Sessões WhatsApp (não commitar!)
├── settings.js       # Configurações globais
└── main.js           # Processador principal
```

---

## 🐛 Troubleshooting

### Bot não responde
- Verifique se está conectado: `✅ WhatsApp conectado!`
- Confirme que o número é admin/owner
- Teste com `.ping`

### Erro "fetch failed"
- ✅ **JÁ CORRIGIDO!** Todos os comandos têm timeout

### Deploy Render desliga
- Normal no free tier (15min de inatividade)
- Use UptimeRobot para manter online

**Mais soluções:** [DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md#-troubleshooting)

---

## 📊 Performance

### Otimizações Aplicadas

- ✅ Processamento paralelo de mensagens (MAX_CONCURRENT = 5)
- ✅ Plugins executam em paralelo
- ✅ Fetch com timeout (10-45s dependendo do comando)
- ✅ Cache de 10 minutos para buscas
- ✅ SSL/TLS ignorado para CDNs problemáticos
- ✅ Timeout dinâmico por categoria de comando

### Antes vs Depois

| Métrica | Antes | Depois |
|---------|-------|--------|
| Processamento | Sequencial | Paralelo (5x) |
| Fetch timeout | Nenhum | 10-45s |
| Comandos lentos | Travavam | Timeout claro |
| Downloads | 30-60s | 2-5s |

---

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

**✧ ZÆRØ BOT ✧**

---

## ⭐ Suporte

Se este projeto foi útil, considere dar uma ⭐!

**Problemas?** Abra uma [Issue](https://github.com/bruyen72/Z-R-BOT/issues)

---

<div align="center">

**✧ ZÆRØ BOT ✧**

*Bot WhatsApp Multi-Device Completo*

![Made with](https://img.shields.io/badge/Made%20with-Node.js-green?style=flat-square)
![Baileys](https://img.shields.io/badge/Powered%20by-Baileys-blue?style=flat-square)

</div>
