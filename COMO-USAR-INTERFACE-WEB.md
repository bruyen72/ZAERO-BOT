# 🌐 Como Usar a Interface Web do ZÆRØ BOT

## 📋 Problema Identificado e Resolvido

Você estava tentando rodar o bot, mas tinha **dois arquivos diferentes**:
- `index.js` (raiz) → Bot de terminal (sem interface gráfica)
- `api/index.js` → Servidor web com interface gráfica

## ✅ Solução

### Opção 1: Interface Web (Recomendado)
Para usar a interface web com QR Code visual:

```bash
npm run web
```

Depois acesse no navegador: **http://localhost:3000**

### Opção 2: Terminal (Tradicional)
Para usar no terminal (modo texto):

```bash
npm run terminal
# ou
npm start
```

## 🔧 O que foi Corrigido

### 1. **Scripts no package.json**
Adicionei novos comandos:
- `npm run web` → Inicia servidor web (porta 3000)
- `npm run terminal` → Inicia bot no terminal
- `npm start` → Inicia bot no terminal (padrão)

### 2. **Encoding dos Arquivos**
Removi BOM (Byte Order Mark) UTF-8 de:
- `public/script.js`
- `api/index.js`

Isso previne erros de encoding no navegador.

## 📱 Como Conectar via Interface Web

1. Execute: `npm run web`
2. Abra: http://localhost:3000
3. Escolha um método:

### Método 1: QR Code
- Clique em "Gerar QR Code"
- Escaneie com WhatsApp

### Método 2: Código de Pareamento
- Digite seu número (ex: +5511999999999)
- Clique em "Gerar Código"
- Digite o código de 8 dígitos no WhatsApp

## ⚠️ Observações Importantes

- A interface web **limpa a sessão automaticamente** antes de conectar
- Use `npm run web` para interface gráfica
- Use `npm run terminal` para modo terminal
- **Nunca compartilhe** seus códigos de conexão!

## 🐛 Problemas Comuns

### Erro: "Cannot GET /api/status"
**Solução:** Você está rodando `npm start` ao invés de `npm run web`

### Porta 3000 já em uso
**Solução:** Mude a porta no arquivo `api/index.js`:
```javascript
const PORT = process.env.PORT || 3000  // Mude para 3001, 8080, etc
```

### QR Code não aparece
**Solução:**
1. Verifique o console do navegador (F12)
2. Certifique-se que o servidor está rodando
3. Recarregue a página

## 📞 Suporte

Se tiver problemas:
1. Verifique o console do navegador (F12)
2. Verifique o terminal onde o servidor está rodando
3. Tente limpar a pasta `Sessions/Owner` e reconectar

---

✧ ZÆRØ BOT ✧ | Made with ❤️
