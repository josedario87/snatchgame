#!/bin/bash

echo "🔄 Actualizando URLs de ngrok en Docker..."

# Función para obtener URLs de ngrok
get_ngrok_urls() {
    if curl -s http://localhost:4040/api/tunnels > /tmp/ngrok-api.json 2>/dev/null; then
        CLIENT_URL=$(grep -o '"snatchgame-client"[^}]*"public_url":"[^"]*"' /tmp/ngrok-api.json | grep -o 'https://[^"]*' | head -1)
        ADMIN_URL=$(grep -o '"snatchgame-admin"[^}]*"public_url":"[^"]*"' /tmp/ngrok-api.json | grep -o 'https://[^"]*' | head -1)
        SERVER_URL=$(grep -o '"snatchgame-server"[^}]*"public_url":"[^"]*"' /tmp/ngrok-api.json | grep -o 'https://[^"]*' | head -1)
    else
        echo "❌ No se pudo conectar a la API de ngrok"
        exit 1
    fi
    
    if [[ -z "$SERVER_URL" ]]; then
        echo "❌ No se pudo obtener la URL del servidor"
        exit 1
    fi
}

# Obtener URLs actuales
get_ngrok_urls

echo "🌐 URLs detectadas:"
echo "   Server: $SERVER_URL"
echo "   Client: $CLIENT_URL"
echo "   Admin:  $ADMIN_URL"

# Crear docker-compose temporal con URLs reales
echo "📝 Creando configuración Docker actualizada..."

cat > /tmp/docker-compose-ngrok-updated.yml << EOF
version: '3.8'

services:
  # Servidor Colyseus
  snatchgame-server:
    image: gitea.interno.com/nucleo000/snatchgame-server:latest
    container_name: snatchgame-server
    ports:
      - "3067:2567"
    environment:
      - NODE_ENV=production
      - PORT=2567
    networks:
      - snatchgame-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:2567/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Cliente Vue UI
  snatchgame-client:
    image: gitea.interno.com/nucleo000/snatchgame-client:latest
    container_name: snatchgame-client
    ports:
      - "3010:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - SERVER_URL=http://snatchgame-server:2567
      - PUBLIC_SERVER_URL=$SERVER_URL
    depends_on:
      - snatchgame-server
    networks:
      - snatchgame-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Admin Dashboard
  snatchgame-admin:
    image: gitea.interno.com/nucleo000/snatchgame-admin:latest
    container_name: snatchgame-admin
    ports:
      - "3011:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - SERVER_URL=http://snatchgame-server:2567
      - PUBLIC_SERVER_URL=$SERVER_URL
    depends_on:
      - snatchgame-server
    networks:
      - snatchgame-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  snatchgame-network:
    driver: bridge
EOF

echo "🔄 Reiniciando servicios Docker con URLs actualizadas..."

# Parar servicios actuales
docker compose -f docker-compose.ngrok.yml down 2>/dev/null || true

# Iniciar con nueva configuración
docker compose -f /tmp/docker-compose-ngrok-updated.yml up -d

# Esperar a que estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 15

# Verificar que estén funcionando
echo "🔍 Verificando servicios..."
for port in 3010 3011 3067; do
    if curl -f http://localhost:$port/health &>/dev/null; then
        echo "✅ Puerto $port: OK"
    else
        echo "❌ Puerto $port: FALLO"
    fi
done

echo ""
echo "🎉 Configuración actualizada!"
echo "🌐 URLs públicas:"
echo "   🎮 Cliente: $CLIENT_URL"
echo "   📊 Admin:   $ADMIN_URL"
echo "   🎯 Server:  $SERVER_URL"
echo ""
echo "🔍 Verificar configuración del cliente:"
curl -s https://$(echo $CLIENT_URL | cut -d'/' -f3)/api/config

echo ""
echo ""
echo "✅ ¡Todo listo! Prueba abrir: $CLIENT_URL"