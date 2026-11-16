# ==========================================
# Etapa 1: Dependencias
# ==========================================
FROM node:22-alpine AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ==========================================
# Etapa 2: Tester (Pruebas unitarias y de seguridad obligatorias)
# Si algún test falla, el build se detiene antes de publicar la imagen.
# ==========================================
FROM dependencies AS tester
WORKDIR /app
COPY . .
RUN npm run test

# ==========================================
# Etapa 3: Builder (Compilación limpia con límite de memoria)
# Hereda de tester para garantizar que solo código validado llegue a producción.
# ==========================================
FROM tester AS builder
WORKDIR /app
RUN NODE_OPTIONS="--max-old-space-size=512" npm run build
# Eliminamos dependencias de desarrollo para aligerar el tamaño final
RUN npm prune --omit=dev

# ==========================================
# Etapa 4: Desarrollo local (usada por docker-compose en local)
# ==========================================
FROM dependencies AS development
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["sh", "-c", "rm -f tsconfig.build.tsbuildinfo && npm run start:dev"]

# ==========================================
# Etapa 5: Producción (Imagen final optimizada para GCP)
# ==========================================
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Nota: Asegúrate de que la carpeta 'public' exista en tu proyecto. 
# Si no la usas, puedes comentar o eliminar la siguiente línea.
COPY --from=builder /app/public ./public

USER node

EXPOSE 3000

CMD ["node", "--max-old-space-size=256", "dist/main.js"]
