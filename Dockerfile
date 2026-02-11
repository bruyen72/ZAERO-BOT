# ZÆRØ BOT - Dockerfile para deploy
FROM node:20-alpine

# Metadados
LABEL maintainer="ZÆRØ BOT"
LABEL description="WhatsApp Bot com Baileys"

# Diretório de trabalho
WORKDIR /app

# Instala dependências do sistema
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++

# Copia package.json
COPY package*.json ./

# Instala dependências do Node
RUN npm install --production

# Copia código
COPY . .

# Cria diretório de sessões
RUN mkdir -p Sessions/Owner

# Expõe porta
EXPOSE 3000

# Variável de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Inicia bot
CMD ["npm", "run", "web"]
