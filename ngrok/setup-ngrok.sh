#!/bin/bash

# SnatchGame - Setup completo para ngrok
set -e

echo "🚀 Configurando SnatchGame para exposición con ngrok..."

# Verificar ngrok
if ! command -v /tmp/ngrok &> /dev/null; then
    echo "❌ ngrok no encontrado. Instalando..."
    wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz -O /tmp/ngrok.tgz
    tar -xzf /tmp/ngrok.tgz -C /tmp/
    chmod +x /tmp/ngrok
    echo "✅ ngrok instalado"
fi

# Verificar autenticación
echo "🔐 Verificando autenticación ngrok..."
if ! /tmp/ngrok config check &>/dev/null; then
    echo "⚠️  ngrok no está autenticado."
    echo "📋 Para obtener túneles estables:"
    echo "   1. Regístrate gratis en: https://dashboard.ngrok.com/signup"
    echo "   2. Copia tu authtoken de: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "   3. Pégalo aquí (o Enter para usar túneles temporales):"
    read -r TOKEN
    
    if [[ -n "$TOKEN" ]]; then
        /tmp/ngrok config add-authtoken "$TOKEN"
        echo "✅ Token configurado - tendrás túneles estables"
    else
        echo "⚠️  Usando túneles temporales (se renuevan cada 2 horas)"
    fi
fi

# Parar servicios existentes
echo "🛑 Parando servicios existentes..."
docker compose down 2>/dev/null || true
pkill -f ngrok 2>/dev/null || true

# Iniciar servicios Docker
echo "🐳 Iniciando servicios Docker..."
docker compose -f docker-compose.ngrok.yml up -d

# Esperar a que estén healthy
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Verificar health
for port in 3010 3011 3067; do
    if ! curl -f http://localhost:$port/health &>/dev/null; then
        echo "❌ Servicio en puerto $port no está respondiendo"
        exit 1
    fi
done
echo "✅ Todos los servicios están listos"

# Función para iniciar ngrok y obtener URL
start_ngrok_tunnel() {
    local port=$1
    local service=$2
    local log_file="/tmp/ngrok-$service.log"
    
    echo "🌐 Iniciando túnel para $service (puerto $port)..."
    
    # Iniciar ngrok en background
    /tmp/ngrok http $port --log=stdout > "$log_file" 2>&1 &
    local pid=$!
    
    # Esperar a que la URL esté disponible
    local url=""
    local attempts=0
    while [[ -z "$url" && $attempts -lt 30 ]]; do
        sleep 2
        if [[ -f "$log_file" ]]; then
            url=$(grep -o 'url=https://[^[:space:]]*' "$log_file" | head -1 | cut -d'=' -f2)
        fi
        ((attempts++))
    done
    
    if [[ -n "$url" ]]; then
        echo "✅ $service: $url"
        echo "$url"
    else
        echo "❌ No se pudo obtener URL para $service"
        return 1
    fi
}

# Iniciar túneles
echo ""
echo "🌐 Iniciando túneles ngrok..."
SERVER_URL=$(start_ngrok_tunnel 3067 "server")
CLIENT_URL=$(start_ngrok_tunnel 3010 "client")
ADMIN_URL=$(start_ngrok_tunnel 3011 "admin")

# Verificar que todas las URLs se obtuvieron
if [[ -z "$SERVER_URL" || -z "$CLIENT_URL" || -z "$ADMIN_URL" ]]; then
    echo "❌ Error obteniendo URLs de ngrok"
    exit 1
fi

# Parar servicios para reconfigurar
echo ""
echo "🔄 Reconfigurando servicios con URLs públicas..."
docker compose -f docker-compose.ngrok.yml down

# Actualizar docker-compose con URLs reales
sed "s|NGROK_SERVER_URL|$SERVER_URL|g" docker-compose.ngrok.yml > /tmp/docker-compose-configured.yml

# Reiniciar servicios con nueva configuración
echo "🐳 Reiniciando servicios con configuración ngrok..."
docker compose -f /tmp/docker-compose-configured.yml up -d

# Esperar a que estén listos nuevamente
echo "⏳ Esperando servicios reconfigurados..."
sleep 15

# Mostrar resultado final
echo ""
echo "🎉 ¡SnatchGame está disponible en internet!"
echo "========================================"
echo ""
echo "🎮 CLIENTE (Jugadores):    $CLIENT_URL"
echo "📊 ADMIN (Administración): $ADMIN_URL"
echo "🎯 SERVIDOR (API):         $SERVER_URL"
echo ""
echo "📋 Instrucciones:"
echo "   • Comparte la URL del CLIENTE con los jugadores"
echo "   • Usa la URL del ADMIN para controlar el juego"
echo "   • Los jugadores pueden unirse desde cualquier lugar del mundo"
echo ""
echo "⚠️  Importante:"
if /tmp/ngrok config check &>/dev/null; then
    echo "   • Túneles ESTABLES (con cuenta ngrok)"
    echo "   • URLs permanentes mientras el script esté corriendo"
else
    echo "   • Túneles TEMPORALES (sin cuenta ngrok)"
    echo "   • URLs válidas por 2 horas máximo"
fi
echo "   • No cerrar esta terminal para mantener túneles activos"
echo "   • Presionar Ctrl+C para cerrar todos los túneles"
echo ""

# Función de cleanup
cleanup() {
    echo ""
    echo "🛑 Cerrando túneles y servicios..."
    pkill -f ngrok 2>/dev/null || true
    docker compose -f /tmp/docker-compose-configured.yml down 2>/dev/null || true
    rm -f /tmp/docker-compose-configured.yml 2>/dev/null || true
    echo "✅ Limpieza completada"
    exit 0
}

# Configurar trap
trap cleanup SIGINT SIGTERM

# Mantener script corriendo
echo "🔄 Túneles activos. Para cerrar presiona Ctrl+C"
echo "💡 Tip: Prueba abrir $CLIENT_URL en tu navegador"
echo ""

# Loop principal
while true; do
    # Verificar que ngrok siga corriendo
    if ! pgrep ngrok > /dev/null; then
        echo "❌ Procesos ngrok terminaron inesperadamente"
        cleanup
    fi
    
    # Verificar que Docker siga corriendo
    if ! docker compose -f /tmp/docker-compose-configured.yml ps | grep -q "Up"; then
        echo "❌ Servicios Docker se cerraron inesperadamente"
        cleanup
    fi
    
    sleep 30
done