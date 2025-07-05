# 🚀 Guía de Deployment - SnatchGame

## 📋 Resumen

Este documento detalla el proceso completo de deployment de SnatchGame en producción usando Docker, Gitea Actions y Nginx Proxy Manager.

## 🏗️ Arquitectura de Producción

### Componentes del Sistema

```
┌────────────────────────────────────────────────────────────────┐
│                    Nginx Proxy Manager                        │
│                    (Red "principal")                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  🌐 snatchGame.interno.com ──► snatchgame-client:3000         │
│  🎯 snatchGameServer.interno.com ──► snatchgame-server:2567   │  
│  📊 snatchgGameAdmin.interno.com ──► snatchgame-admin:3001    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Servicios Docker

| Servicio | Imagen | Puerto Interno | Puerto Externo | Descripción |
|----------|--------|----------------|----------------|-------------|
| `snatchgame-server` | `gitea.interno.com/nucleo000/snatchgame-server:latest` | 2567 | 3067 | Servidor Colyseus |
| `snatchgame-client` | `gitea.interno.com/nucleo000/snatchgame-client:latest` | 3000 | 3010 | Cliente Vue + Express |
| `snatchgame-admin` | `gitea.interno.com/nucleo000/snatchgame-admin:latest` | 3001 | 3011 | Admin Vue + Express |

## 🔧 Configuración de URLs

### Separación Interna/Externa

El sistema utiliza una arquitectura de **doble URL** para optimizar la comunicación:

#### URLs Externas (HTTPS)
- **Propósito**: Comunicación navegador ↔ servicios
- **Protocolo**: HTTPS/WSS (seguro)
- **Destino**: Nginx Proxy Manager

```
Cliente Frontend → https://snatchGameServer.interno.com (WebSocket)
Admin Frontend → https://snatchGameServer.interno.com (Fetch API)
```

#### URLs Internas (HTTP)
- **Propósito**: Comunicación contenedor ↔ contenedor  
- **Protocolo**: HTTP (rápido, sin SSL)
- **Destino**: Directo entre contenedores

```
Admin Server → http://snatchgame-server:2567 (SSE, Control API)
Client Server → http://snatchgame-server:2567 (Health checks)
```

### Variables de Entorno

```yaml
# En docker-compose.yml
environment:
  - NODE_ENV=production
  - SERVER_URL=http://snatchgame-server:2567          # URL interna
  - PUBLIC_SERVER_URL=https://snatchGameServer.interno.com  # URL externa
```

## 🐳 Docker Configuration

### Dockerfiles

#### Servidor (server/Dockerfile)
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache git wget
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build && npm prune --production
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:2567/health || exit 1
CMD ["npm", "start"]
```

#### Cliente y Admin (client/Dockerfile, admin/Dockerfile)
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache git wget
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:prod  # Skips type generation in Docker
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["npm", "start"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  snatchgame-server:
    image: gitea.interno.com/nucleo000/snatchgame-server:latest
    container_name: snatchgame-server
    ports:
      - "3067:2567"
    environment:
      - NODE_ENV=production
      - PORT=2567
    networks:
      - principal
      - snatchgame-network
    restart: unless-stopped

  snatchgame-client:
    image: gitea.interno.com/nucleo000/snatchgame-client:latest
    container_name: snatchgame-client
    ports:
      - "3010:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SERVER_URL=http://snatchgame-server:2567
      - PUBLIC_SERVER_URL=https://snatchGameServer.interno.com
    depends_on:
      - snatchgame-server
    networks:
      - principal
      - snatchgame-network
    restart: unless-stopped

  snatchgame-admin:
    image: gitea.interno.com/nucleo000/snatchgame-admin:latest
    container_name: snatchgame-admin
    ports:
      - "3011:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SERVER_URL=http://snatchgame-server:2567
      - PUBLIC_SERVER_URL=https://snatchGameServer.interno.com
    depends_on:
      - snatchgame-server
    networks:
      - principal
      - snatchgame-network
    restart: unless-stopped

networks:
  principal:
    external: true
  snatchgame-network:
    driver: bridge
```

## ⚙️ CI/CD Pipeline

### Gitea Actions (.gitea/workflows/build-and-deploy.yml)

```yaml
name: Build and Deploy SnatchGame

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-server:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'server/') || github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Build and push server image
        run: |
          docker build -t gitea.interno.com/nucleo000/snatchgame-server:latest ./server
          docker push gitea.interno.com/nucleo000/snatchgame-server:latest

  build-client:
    runs-on: ubuntu-latest  
    if: contains(github.event.head_commit.modified, 'client/') || github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Build and push client image
        run: |
          docker build -t gitea.interno.com/nucleo000/snatchgame-client:latest ./client
          docker push gitea.interno.com/nucleo000/snatchgame-client:latest

  build-admin:
    runs-on: ubuntu-latest
    if: contains(github.event.head_commit.modified, 'admin/') || github.event_name == 'pull_request'  
    steps:
      - uses: actions/checkout@v4
      - name: Build and push admin image
        run: |
          docker build -t gitea.interno.com/nucleo000/snatchgame-admin:latest ./admin
          docker push gitea.interno.com/nucleo000/snatchgame-admin:latest

  deploy:
    runs-on: ubuntu-latest
    needs: [build-server, build-client, build-admin]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          docker-compose down
          docker-compose pull
          docker-compose up -d
```

### Conditional Building

El pipeline utiliza **conditional building** basado en archivos modificados:

- **server/** → Builds `snatchgame-server`
- **client/** → Builds `snatchgame-client`  
- **admin/** → Builds `snatchgame-admin`
- **Pull requests** → Builds todo pero no deploya

## 🔄 Optimizaciones SSE

### Problema Identificado
La comunicación SSE entre el navegador y los contenedores Docker presentaba latencia alta (~10 segundos entre actualizaciones).

### Solución Implementada

#### Headers Anti-Buffering
```javascript
// admin/server.js
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',        // Disable nginx buffering
  'Content-Encoding': 'identity'     // Disable compression
});
```

#### Polling Optimizado
```javascript
// Reducido de 500ms a 250ms para updates más rápidos
const pollInterval = setInterval(async () => {
  // Fetch game stats...
}, 250);
```

#### Heartbeat Mechanism
```javascript
// Keepalive cada 30 segundos
const heartbeatInterval = setInterval(() => {
  res.write(': heartbeat\n\n');
}, 30000);
```

#### Auto-reconexión Cliente
```javascript
// admin/src/services/adminService.ts
this.eventSource.onerror = (error) => {
  // Auto-reconnect after 5 seconds
  setTimeout(() => {
    if (!this.isConnected) {
      this.connect(this.callback!);
    }
  }, 5000);
};
```

## 🚀 Proceso de Deployment

### 1. Push a Main Branch
```bash
git add .
git commit -m "feature: new functionality"
git push gitea main
```

### 2. Automatic CI/CD
- Gitea Actions detecta cambios
- Builds las imágenes necesarias
- Push al registry interno
- Deploy automático en producción

### 3. Verificación
```bash
# Verificar estado de contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Health check manual
curl -f http://localhost:3067/health
curl -f http://localhost:3010/health  
curl -f http://localhost:3011/health
```

### 4. Rollback si es Necesario
```bash
# Rollback a versión anterior
docker-compose down
git checkout <previous-commit>
docker-compose up -d --build
```

## 🔧 Comandos de Mantenimiento

### Development to Production
```bash
# Build local para testing
docker-compose build

# Deploy en producción
docker-compose up -d

# Rebuild completo tras cambios
docker-compose down && docker-compose up -d --build
```

### Monitoring
```bash
# Logs de servicio específico
docker-compose logs -f snatchgame-server
docker-compose logs -f snatchgame-client
docker-compose logs -f snatchgame-admin

# Estadísticas de recursos
docker stats

# Estado de redes
docker network ls
docker network inspect snatchgame_principal
```

### Troubleshooting
```bash
# Verificar conectividad entre contenedores
docker exec snatchgame-admin curl http://snatchgame-server:2567/health

# Reiniciar servicio específico
docker-compose restart snatchgame-admin

# Limpiar imágenes antiguas
docker image prune -f
```

## 📊 Monitoring y Salud del Sistema

### Health Checks
Todos los servicios incluyen health checks automáticos:

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:2567/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Logs Estructurados
```javascript
// Logs con timestamps y prefijos para debugging
console.log(`[SSE] Connection #${connectionId} established. Total: ${sseConnections}`);
console.log(`[SSE] Stats fetched successfully in ${fetchTime}ms`);
```

### Métricas de Rendimiento
- **SSE Update Frequency**: 250ms
- **Heartbeat Interval**: 30s
- **Auto-reconnect Delay**: 5s
- **Health Check Interval**: 30s

## 🔒 Seguridad

### HTTPS/WSS
- Todas las comunicaciones externas usan HTTPS/WSS
- Certificados SSL manejados por Nginx Proxy Manager
- Comunicación interna HTTP (rápida y segura dentro de Docker)

### Network Isolation
- Red `principal`: Comunicación con Nginx
- Red `snatchgame-network`: Comunicación interna entre servicios
- Puertos expuestos mínimos

### Environment Variables
- Configuración sensitive via variables de entorno
- Separación clara desarrollo/producción
- No secrets hardcoded en código

## 📈 Escalabilidad

### Horizontal Scaling
```yaml
# Múltiples instancias del mismo servicio
snatchgame-server-1:
  image: gitea.interno.com/nucleo000/snatchgame-server:latest
  # ...
snatchgame-server-2:
  image: gitea.interno.com/nucleo000/snatchgame-server:latest
  # ...
```

### Load Balancing
- Nginx Proxy Manager puede distribuir carga
- Health checks aseguran disponibilidad
- Auto-restart en caso de fallas

## 🎯 Próximos Pasos

1. **Monitoring Avanzado**: Prometheus + Grafana
2. **Backup Automático**: Estrategia de backups de datos
3. **Blue-Green Deployment**: Deploy sin downtime
4. **Resource Limits**: CPU/Memory limits por contenedor
5. **Log Aggregation**: ELK Stack o similar

---

> 📝 **Nota**: Esta documentación refleja el estado actual del sistema al 2025-07-05. Actualizar tras modificaciones significativas.