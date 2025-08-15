FROM node:18-alpine

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Instalar dependencias
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copiar código fuente
COPY . .

# Compilar servidor y cliente
RUN cd server && npm run build
RUN cd client && npx vite build

# Instalar serve para servir archivos estáticos
RUN npm install -g serve

# Script de inicio
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Exponer puertos
EXPOSE 3000 2567

# Ejecutar ambos servicios
CMD ["/app/start.sh"]