# Etapa 1: Compilación
FROM node:24-alpine AS builder

WORKDIR /app

# Instalar dependencias completas para la compilación
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar frontend (Vite) y backend (esbuild)
COPY . .
RUN npm run build

# Etapa 2: Imagen final de ejecución (mínima y segura)
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

# Instalar únicamente dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar artefactos generados desde la etapa de compilación
COPY --from=builder /app/dist ./dist

# Usuario sin privilegios por seguridad
USER node

EXPOSE 8080

CMD ["node", "dist/server.cjs"]
