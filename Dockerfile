# ZÆRØ BOT - Dockerfile para deploy
FROM node:20-alpine

# Metadados
LABEL maintainer="ZÆRØ BOT"
LABEL description="WhatsApp Bot com Baileys"

# Diretório de trabalho
WORKDIR /app

# Instala dependências do sistema (INCLUINDO GIT!)
RUN apk add --no-cache \
    git \
    ffmpeg \
    python3 \
    make \
    g++

# Copia package.json
COPY package*.json ./

# Instala dependências do Node
RUN npm install --omit=dev

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
HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000;require('http').get('http://127.0.0.1:'+p+'/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Inicia bot
CMD ["npm", "run", "web"]
