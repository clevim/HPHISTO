# HΦSTO — Node + Express + SQLite
FROM node:22-alpine

# dependências nativas do better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /data

ENV PORT=8080
ENV DB_PATH=/data/hphisto.db

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://localhost:8080/api/health >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
