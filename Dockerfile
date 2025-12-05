FROM node:18-alpine

WORKDIR /app

# Primero copiar solo package.json
COPY package.json .

# Instalar dependencias (no usar npm ci sin package-lock.json)
RUN npm install --production

# Luego copiar el resto
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/index.js"]