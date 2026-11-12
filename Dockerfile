# ==========================================
# Etapa 1: Dependencias
# ==========================================
FROM node:22-alpine AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ==========================================
# Etapa 2: Tester (Pruebas unitarias y de seguridad)
# Si algún test falla, el build se interrumpe y la imagen no se genera.
# ==========================================
FROM dependencies AS tester
WORKDIR /app
COPY . .
RUN npm run test

# ==========================================
# Etapa 3: Builder (Compilación y poda de dependencias dev)
# Requiere que la etapa tester haya pasado satisfactoriamente.
# ==========================================
FROM tester AS builder
WORKDIR /app
RUN npm run build
RUN npm prune --omit=dev

# ==========================================
# Etapa 4: Desarrollo local (utilizada por docker-compose)
# ==========================================
FROM dependencies AS development
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "rm -f tsconfig.build.tsbuildinfo && npm run start:dev"]

# ==========================================
# Etapa 5: Producción (Imagen final optimizada y segura)
# ==========================================
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
