# 🚀 GUIA DE TESTE RÁPIDO - ZAERO-BOT CORRIGIDO

## ⚡ TESTE RÁPIDO (5 minutos)

### **Passo 1: Limpar Sessão Antiga (se existir)**
```bash
# Windows (PowerShell)
Remove-Item -Recurse -Force .\Sessions\Owner

# Windows (CMD)
rmdir /s /q Sessions\Owner

# Linux/Mac
rm -rf ./Sessions/Owner
```

### **Passo 2: Instalar Dependências**
```bash
npm install
```

### **Passo 3: Iniciar o Bot**

**Opção A: QR Code**
```bash
node index.js --qr
```

**Opção B: Código de Pareamento**
```bash
node index.js --code
```

### **Passo 4: Conectar ao WhatsApp**

**Se usou QR Code:**
1. Aguarde o QR aparecer no terminal
2. Abra WhatsApp no celular
3. Vá em: **Aparelhos Conectados** → **Conectar novo aparelho**
4. Escaneie o QR
5. ✅ Aguarde a mensagem: `✅ Conectado a: Seu Nome`

**Se usou Código:**
1. Quando solicitado, digite seu número: `+5511999999999`
2. Aguarde o código aparecer: `ABCD-EFGH`
3. Abra WhatsApp no celular
4. Vá em: **Aparelhos Conectados** → **Conectar usando código**
5. Digite o código
6. ✅ Aguarde a mensagem: `✅ Conectado a: Seu Nome`

---

## ✅ VERIFICAÇÕES DE FUNCIONAMENTO

### **✅ Teste 1: Persistência de Sessão**

1. **Com bot conectado**, pare o bot: `Ctrl+C`
2. Verifique se a pasta `Sessions/Owner` **existe** e tem arquivos:
   ```
   Sessions/Owner/
   ├── creds.json
   ├── pre-keys/
   └── app-state-sync/
   ```
3. Reinicie o bot: `node index.js`
4. ✅ **ESPERADO:** Bot reconecta **SEM pedir novo QR Code**
5. ✅ Mensagem aparece: `📂 Sessão encontrada, iniciando reconexão automática...`

**Se funcionou:** 🎉 **PERSISTÊNCIA DE SESSÃO OK!**

---

### **✅ Teste 2: Logout no Celular**

1. **Com bot conectado**
2. Abra WhatsApp no celular
3. Vá em: **Aparelhos Conectados**
4. Clique no dispositivo conectado
5. Clique em **Sair desta conta**
6. ✅ **ESPERADO no terminal:**
   ```
   🚪 Dispositivo desconectado via celular. Apagando sessão e reiniciando...
   🗑️ Pasta session apagada com sucesso.
   ⏳ Nenhuma sessão encontrada. Aguardando novo login...
   ```
7. ✅ Novo QR Code deve aparecer automaticamente

**Se funcionou:** 🎉 **TRATAMENTO DE LOGOUT OK!**

---

### **✅ Teste 3: Reconexão Automática**

1. **Com bot conectado**
2. **Desconecte a internet** do computador por 30 segundos
3. ✅ **ESPERADO no terminal:**
   ```
   🔄 Se perdió la conexión al servidor, reconectando...
   ```
4. **Reconecte a internet**
5. ✅ **ESPERADO:** Bot reconecta automaticamente em 3 segundos
6. ✅ Mensagem aparece: `✅ Conectado a: Seu Nome`

**Se funcionou:** 🎉 **RECONEXÃO AUTOMÁTICA OK!**

---

### **✅ Teste 4: Comandos Básicos**

Envie mensagens para o bot no WhatsApp:

```
!menu
!ping
!help
```

✅ **ESPERADO:** Bot responde normalmente

---

## 🐛 PROBLEMAS COMUNS

### **Problema: "Error: Cannot find module '@whiskeysockets/baileys'"**

**Solução:**
```bash
npm install @whiskeysockets/baileys@latest
```

---

### **Problema: QR Code não aparece**

**Solução:**
1. Limpe a sessão: `rmdir /s /q Sessions\Owner`
2. Reinicie: `node index.js --qr`

---

### **Problema: Bot conecta mas desconecta logo depois**

**Possíveis Causas:**
1. ❌ WhatsApp bloqueou o número (muitas conexões em pouco tempo)
2. ❌ Versão do Baileys desatualizada
3. ❌ Número já conectado em outro bot

**Solução:**
```bash
# Atualizar Baileys
npm update @whiskeysockets/baileys

# Limpar sessão e tentar novamente
rmdir /s /q Sessions\Owner
node index.js --qr
```

---

### **Problema: "Sessão encontrada" mas não conecta**

**Solução:**
```bash
# Apagar sessão corrompida
rmdir /s /q Sessions\Owner

# Iniciar do zero
node index.js --qr
```

---

## 📱 TESTE DE INTERFACE WEB (Opcional)

Se o bot tem interface web (`api/index.js`):

1. Inicie: `node index.js`
2. Abra navegador: `http://localhost:3000` (ou porta configurada)
3. ✅ Interface deve carregar
4. Clique em "Conectar via QR Code" ou "Conectar via Código"
5. Siga os passos de conexão

---

## 📊 LOGS IMPORTANTES

### **✅ Log de Conexão Bem-Sucedida:**
```
📂 Sessão encontrada, iniciando reconexão automática...
✅ Conectado a: Bruno Ruthes
```

### **✅ Log de Primeira Conexão:**
```
⏳ Nenhuma sessão encontrada. Aguardando novo login...
[ ✿ ] Escanea este código QR
█████████████████████████████
█████████████████████████████
✅ Conectado a: Bruno Ruthes
```

### **✅ Log de Reconexão após Desconexão:**
```
❌ Conexão fechada. Razão: 408
🔄 Tiempo de conexión agotado, reconectando...
✅ Conectado a: Bruno Ruthes
```

### **❌ Log de Erro Crítico (Sessão Corrompida):**
```
❌ Conexão fechada. Razão: 401
❌ Erro crítico de sessão. Apagando e reiniciando...
🗑️ Sessão corrompida apagada.
⏳ Nenhuma sessão encontrada. Aguardando novo login...
```

---

## 🎯 CHECKLIST FINAL

Antes de colocar em produção, verifique:

- [ ] ✅ Teste 1 passou (Persistência de Sessão)
- [ ] ✅ Teste 2 passou (Logout no Celular)
- [ ] ✅ Teste 3 passou (Reconexão Automática)
- [ ] ✅ Teste 4 passou (Comandos Básicos)
- [ ] ✅ Bot não cria loops infinitos de reconexão
- [ ] ✅ Sessão persiste após reiniciar máquina
- [ ] ✅ Logs aparecem corretamente
- [ ] ✅ Nenhum erro crítico no console

---

## 🚀 DEPLOY EM PRODUÇÃO

### **Render / Heroku / Railway**

1. Certifique-se que `package.json` tem:
   ```json
   {
     "scripts": {
       "start": "node index.js"
     }
   }
   ```

2. Configure variáveis de ambiente (se necessário):
   ```
   BOT_NUMBER=+5511999999999
   OWNER_NUMBER=+5511888888888
   ```

3. Faça deploy normalmente

4. ✅ Bot deve conectar automaticamente se já tiver sessão

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verifique os logs no console
2. Leia o arquivo `RELATORIO-COMPARACAO-TECNICA.md`
3. Leia o arquivo `MUDANCAS-APLICADAS.md`
4. Verifique se todas as correções foram aplicadas

---

**Status:** ✅ **BOT PRONTO PARA TESTE**

**Data:** 11/02/2026
