# Imagem base Node.js 18
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código do projeto
COPY . .

# Criar pasta de sessões (será montada como volume)
RUN mkdir -p Sessions/Owner

# Expor porta (se usar API web)
EXPOSE 3000

# Comando de inicialização
CMD ["node", "index.js"]
