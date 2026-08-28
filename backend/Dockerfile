FROM node:20-alpine

# Instalar dependencias de compilación para C++ nativo (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src ./src

ENV PORT=7000
ENV DATA_DIR=/app/data

EXPOSE 7000

CMD ["node", "src/server.js"]
