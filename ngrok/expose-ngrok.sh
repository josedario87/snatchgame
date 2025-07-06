#!/bin/bash

# SnatchGame ngrok exposure script
echo "🚀 Exponiendo SnatchGame a internet con ngrok..."

# Verificar que ngrok esté disponible
if ! command -v /tmp/ngrok &> /dev/null; then
    echo "❌ ngrok no encontrado. Ejecuta primero la instalación."
    exit 1
fi

# Verificar que los servicios Docker estén corriendo
if ! docker compose ps | grep -q "Up"; then
    echo "❌ Los servicios Docker no están corriendo. Ejecuta: docker compose up -d"
    exit 1
fi

echo "✅ Servicios Docker verificados"
echo "🌐 Exponiendo servicios..."

# Función para matar procesos ngrok existentes
cleanup() {
    echo "🛑 Cerrando túneles ngrok..."
    pkill -f ngrok || true
    exit 0
}

# Configurar trap para cleanup
trap cleanup SIGINT SIGTERM

# Verificar si ngrok está autenticado
AUTH_CHECK=$(/tmp/ngrok config check 2>&1 || echo "not_authenticated")
if [[ "$AUTH_CHECK" == *"not_authenticated"* ]] || [[ "$AUTH_CHECK" == *"authentication failed"* ]]; then
    echo "⚠️  ngrok no está autenticado."
    echo "📋 Pasos para autenticar:"
    echo "   1. Visita: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "   2. Copia tu authtoken"
    echo "   3. Ejecuta: /tmp/ngrok config add-authtoken TU_TOKEN_AQUI"
    echo ""
    echo "❓ ¿Tienes tu authtoken? Introduce tu token (o Enter para continuar sin autenticar):"
    read -r TOKEN
    
    if [[ -n "$TOKEN" ]]; then
        /tmp/ngrok config add-authtoken "$TOKEN"
        echo "✅ Token configurado"
    else
        echo "⚠️  Continuando sin autenticar (túneles temporales)"
    fi
fi

# Exponer Cliente (Puerto 3010)
echo "🎮 Exponiendo Cliente SnatchGame..."
/tmp/ngrok http 3010 --log=stdout > /tmp/ngrok-client.log 2>&1 &
CLIENT_PID=$!

# Exponer Admin (Puerto 3011)  
echo "📊 Exponiendo Admin Dashboard..."
/tmp/ngrok http 3011 --log=stdout > /tmp/ngrok-admin.log 2>&1 &
ADMIN_PID=$!

# Exponer Servidor (Puerto 3067)
echo "🎯 Exponiendo Servidor Colyseus..."
/tmp/ngrok http 3067 --log=stdout > /tmp/ngrok-server.log 2>&1 &
SERVER_PID=$!

# Esperar un momento para que se establezcan los túneles
echo "⏳ Estableciendo túneles..."
sleep 5

# Función para extraer URL de logs de ngrok
get_ngrok_url() {
    local log_file=$1
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if [ -f "$log_file" ]; then
            local url=$(grep -o 'url=https://[^[:space:]]*' "$log_file" | head -1 | cut -d'=' -f2)
            if [ -n "$url" ]; then
                echo "$url"
                return 0
            fi
        fi
        sleep 2
        ((attempt++))
    done
    echo "❌ URL no encontrada"
    return 1
}

# Obtener URLs
echo ""
echo "🌐 URLs públicas de SnatchGame:"
echo "================================"

CLIENT_URL=$(get_ngrok_url "/tmp/ngrok-client.log")
ADMIN_URL=$(get_ngrok_url "/tmp/ngrok-admin.log")  
SERVER_URL=$(get_ngrok_url "/tmp/ngrok-server.log")

echo "🎮 Cliente UI:     $CLIENT_URL"
echo "📊 Admin Panel:    $ADMIN_URL"
echo "🎯 Servidor API:   $SERVER_URL"

echo ""
echo "📋 Instrucciones:"
echo "   • Comparte la URL del Cliente con los jugadores"
echo "   • Usa la URL del Admin para monitorear el juego"
echo "   • Los servicios funcionan normalmente"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   • Estas URLs son temporales (se renuevan cada 2 horas sin cuenta)"
echo "   • Con cuenta gratuita ngrok son permanentes"
echo "   • Presiona Ctrl+C para cerrar todos los túneles"
echo ""

# Mostrar estado de túneles
echo "📡 Estado de túneles:"
echo "   Cliente  PID: $CLIENT_PID"
echo "   Admin    PID: $ADMIN_PID" 
echo "   Servidor PID: $SERVER_PID"

# Mantener el script corriendo
echo "🔄 Túneles activos. Presiona Ctrl+C para cerrar..."
while true; do
    # Verificar que los procesos sigan corriendo
    if ! kill -0 $CLIENT_PID 2>/dev/null || ! kill -0 $ADMIN_PID 2>/dev/null || ! kill -0 $SERVER_PID 2>/dev/null; then
        echo "❌ Uno o más túneles se cerraron inesperadamente"
        cleanup
    fi
    sleep 30
done