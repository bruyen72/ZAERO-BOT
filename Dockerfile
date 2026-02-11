# ===================================================================
# DOCKERFILE ZAERO-BOT - VERSÃO ROBUSTA
# Usa Node.js 18 (Debian) que já tem git instalado
# ===================================================================

FROM node:18

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências de produção
RUN npm install --omit=dev

# Copiar todo o código do projeto
COPY . .

# Criar pasta de sessões
RUN mkdir -p Sessions/Owner

# Expor porta da API (se houver)
EXPOSE 3000

# Variável de ambiente
ENV NODE_ENV=production

# Comando de inicialização
CMD ["node", "index.js"]
