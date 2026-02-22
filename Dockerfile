# ===================================================================
# DOCKERFILE ZAERO-BOT - VERSAO ROBUSTA
# ===================================================================

FROM node:20

WORKDIR /app

# FFmpeg para transcode de video RedGifs/WhatsApp
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p Sessions/Owner

EXPOSE 3000

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=768 --expose-gc"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "index.js"]
