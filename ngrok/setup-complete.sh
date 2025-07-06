#!/bin/bash

echo "🚀 SnatchGame - Setup Completo (Orden Correcto)"
echo "==============================================="

# Paso 1: Parar todo lo existente
echo "🛑 Limpiando procesos existentes..."
pkill -f ngrok 2>/dev/null || true
cd .. && docker compose down 2>/dev/null && cd ngrok || true

# Paso 2: Iniciar servicios Docker PRIMERO (sin URLs públicas)
echo "🐳 Iniciando servicios Docker básicos..."
cd .. && docker compose -f ngrok/docker-compose.ngrok.yml up -d && cd ngrok

# Esperar a que estén listos
echo "⏳ Esperando servicios Docker..."
sleep 15

# Verificar que Docker esté funcionando
echo "🔍 Verificando servicios locales..."
for port in 3010 3011 3067; do
    if curl -f http://localhost:$port/health &>/dev/null; then
        echo "✅ Puerto $port: OK"
    else
        echo "❌ Puerto $port: FALLO"
        echo "Error: Docker no está funcionando correctamente"
        exit 1
    fi
done

# Paso 3: Crear túneles ngrok
echo ""
echo "🌐 Creando túneles ngrok..."
/tmp/ngrok start --all > /tmp/ngrok-startup.log 2>&1 &

# Esperar a que ngrok se establezca
echo "⏳ Esperando túneles ngrok..."
sleep 10

# Paso 4: Obtener URLs de ngrok
echo "📡 Obteniendo URLs de ngrok..."
if curl -s http://localhost:4040/api/tunnels > /tmp/ngrok-api.json 2>/dev/null; then
    CLIENT_URL=$(grep -o '"snatchgame-client"[^}]*"public_url":"[^"]*"' /tmp/ngrok-api.json | grep -o 'https://[^"]*' | head -1)
    ADMIN_URL=$(grep -o '"snatchgame-admin"[^}]*"public_url":"[^"]*"' /tmp/ngrok-api.json | grep -o 'https://[^"]*' | head -1)
    SERVER_URL=$(grep -o '"snatchgame-server"[^}]*"public_url":"[^"]*"' /tmp/ngrok-api.json | grep -o 'https://[^"]*' | head -1)
    
    if [[ -n "$SERVER_URL" && -n "$CLIENT_URL" && -n "$ADMIN_URL" ]]; then
        echo "✅ URLs obtenidas exitosamente"
        echo "   Server: $SERVER_URL"
        echo "   Client: $CLIENT_URL" 
        echo "   Admin:  $ADMIN_URL"
    else
        echo "❌ No se pudieron obtener todas las URLs"
        exit 1
    fi
else
    echo "❌ No se pudo conectar a la API de ngrok"
    exit 1
fi

# Paso 5: Reconfigurar Docker con URLs reales
echo ""
echo "🔄 Reconfigurando Docker con URLs públicas..."

# Crear docker-compose con URLs reales
cat > /tmp/docker-compose-final.yml << EOF
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
      - PUBLIC_SERVER_URL=$SERVER_URL
    depends_on:
      - snatchgame-server
    networks:
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
      - PUBLIC_SERVER_URL=$SERVER_URL
    depends_on:
      - snatchgame-server
    networks:
      - snatchgame-network
    restart: unless-stopped

networks:
  snatchgame-network:
    driver: bridge
EOF

# Reiniciar Docker con configuración final
cd .. && docker compose down && cd ngrok
cd .. && docker compose -f /tmp/docker-compose-final.yml up -d && cd ngrok

echo "⏳ Esperando servicios reconfigurados..."
sleep 20

# Paso 6: Verificación final
echo ""
echo "🔍 Verificación final..."

# Verificar que el cliente devuelva la URL correcta
echo "Verificando configuración del cliente..."
CLIENT_CONFIG=$(curl -s https://$(echo $CLIENT_URL | cut -d'/' -f3)/api/config 2>/dev/null || echo "Error")

if [[ "$CLIENT_CONFIG" == *"$SERVER_URL"* ]]; then
    echo "✅ Cliente configurado correctamente"
else
    echo "⚠️  Cliente aún no está configurado. Config actual: $CLIENT_CONFIG"
fi

# Resultado final
echo ""
echo "🎉 ¡SnatchGame está LIVE en internet!"
echo "===================================="
echo ""
echo "🌐 URLs PÚBLICAS:"
echo "🎮 CLIENTE (jugadores):  $CLIENT_URL"
echo "📊 ADMIN (control):      $ADMIN_URL"
echo "🎯 SERVIDOR (API):       $SERVER_URL"
echo ""
echo "📋 INSTRUCCIONES:"
echo "   1. Abre: $CLIENT_URL"
echo "   2. Comparte esa URL con otros jugadores"
echo "   3. Usa: $ADMIN_URL para administrar"
echo ""
echo "✅ Sistema completamente configurado"
echo "⚠️  Mantén esta terminal abierta para mantener túneles activos"

# Función de cleanup
cleanup() {
    echo ""
    echo "🛑 Cerrando túneles y servicios..."
    pkill -f ngrok 2>/dev/null || true
    cd .. && docker compose -f /tmp/docker-compose-final.yml down 2>/dev/null && cd ngrok || true
    rm -f /tmp/docker-compose-final.yml /tmp/ngrok-api.json 2>/dev/null || true
    echo "✅ Limpieza completada"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Mantener script corriendo
echo ""
echo "🔄 Túneles activos. Presiona Ctrl+C para cerrar todo"
while true; do
    if ! pgrep ngrok > /dev/null; then
        echo "❌ ngrok se cerró inesperadamente"
        cleanup
    fi
    sleep 30
done