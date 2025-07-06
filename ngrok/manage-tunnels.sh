#!/bin/bash

# SnatchGame - Gestor de túneles ngrok
echo "🌐 SnatchGame Tunnel Manager"
echo "============================"

# Función para extraer URLs dinámicamente
get_urls() {
    # Primero intentar usar la API de ngrok (puerto 4040)
    if curl -s http://localhost:4040/api/tunnels > /tmp/ngrok-api.json 2>/dev/null; then
        # Extraer URLs usando jq o parsing manual
        if command -v jq > /dev/null; then
            CLIENT_URL=$(jq -r '.tunnels[] | select(.name=="snatchgame-client") | .public_url' /tmp/ngrok-api.json 2>/dev/null)
            ADMIN_URL=$(jq -r '.tunnels[] | select(.name=="snatchgame-admin") | .public_url' /tmp/ngrok-api.json 2>/dev/null)
            SERVER_URL=$(jq -r '.tunnels[] | select(.name=="snatchgame-server") | .public_url' /tmp/ngrok-api.json 2>/dev/null)
        else
            # Parsing manual sin jq
            CLIENT_URL=$(grep -o '"snatchgame-client"[^}]*"public_url":"[^"]*"' /tmp/ngrok-api.json | grep -o 'https://[^"]*' | head -1)
            ADMIN_URL=$(grep -o '"snatchgame-admin"[^}]*"public_url":"[^"]*"' /tmp/ngrok-api.json | grep -o 'https://[^"]*' | head -1)
            SERVER_URL=$(grep -o '"snatchgame-server"[^}]*"public_url":"[^"]*"' /tmp/ngrok-api.json | grep -o 'https://[^"]*' | head -1)
        fi
    else
        # Fallback a logs si la API no está disponible
        if [[ -f /tmp/ngrok-all.log ]]; then
            CLIENT_URL=$(grep "snatchgame-client" /tmp/ngrok-all.log | grep -o 'url=https://[^[:space:]]*' | cut -d'=' -f2 | tail -1)
            ADMIN_URL=$(grep "snatchgame-admin" /tmp/ngrok-all.log | grep -o 'url=https://[^[:space:]]*' | cut -d'=' -f2 | tail -1)
            SERVER_URL=$(grep "snatchgame-server" /tmp/ngrok-all.log | grep -o 'url=https://[^[:space:]]*' | cut -d'=' -f2 | tail -1)
        fi
    fi
    
    # Validar que las URLs no estén vacías
    [[ -z "$CLIENT_URL" ]] && CLIENT_URL="No disponible"
    [[ -z "$ADMIN_URL" ]] && ADMIN_URL="No disponible"
    [[ -z "$SERVER_URL" ]] && SERVER_URL="No disponible"
}

# Obtener URLs actuales
get_urls

# Función para mostrar estado
show_status() {
    # Refrescar URLs antes de mostrar
    get_urls
    
    echo ""
    echo "📊 ESTADO ACTUAL:"
    echo "=================="
    
    # Verificar si ngrok está corriendo
    if pgrep ngrok > /dev/null; then
        echo "✅ ngrok: ACTIVO"
    else
        echo "❌ ngrok: INACTIVO"
    fi
    
    # Verificar Docker
    if docker compose ps | grep -q "Up"; then
        echo "✅ Docker: ACTIVO"
    else
        echo "❌ Docker: INACTIVO"
    fi
    
    echo ""
    echo "🌐 URLs PÚBLICAS:"
    if [[ "$CLIENT_URL" != "No disponible" ]]; then
        echo "🎮 CLIENTE: $CLIENT_URL"
        echo "📊 ADMIN:   $ADMIN_URL"
        echo "🎯 SERVER:  $SERVER_URL"
    else
        echo "⚠️  URLs no disponibles (ngrok no está corriendo o logs no encontrados)"
    fi
}

# Función para iniciar túneles
start_tunnels() {
    echo "🚀 Iniciando túneles..."
    
    # Asegurar que Docker esté corriendo
    if ! docker compose ps | grep -q "Up"; then
        echo "🐳 Iniciando servicios Docker..."
        docker compose -f docker-compose.ngrok.yml up -d
        sleep 10
    fi
    
    # Asegurar que ngrok no esté corriendo
    if pgrep ngrok > /dev/null; then
        echo "⚠️  ngrok ya está corriendo"
    else
        echo "🌐 Iniciando túneles ngrok..."
        nohup /tmp/ngrok start --all > /tmp/ngrok-all.log 2>&1 &
        sleep 5
        echo "✅ Túneles iniciados"
    fi
}

# Función para parar túneles
stop_tunnels() {
    echo "🛑 Parando túneles..."
    pkill -f ngrok 2>/dev/null || true
    echo "✅ Túneles detenidos"
}

# Función para reiniciar túneles
restart_tunnels() {
    echo "🔄 Reiniciando túneles..."
    stop_tunnels
    sleep 3
    start_tunnels
}

# Función para mostrar logs
show_logs() {
    echo "📄 Logs de ngrok:"
    echo "=================="
    if [[ -f /tmp/ngrok-all.log ]]; then
        tail -20 /tmp/ngrok-all.log
    else
        echo "No se encontraron logs"
    fi
}

# Menú principal
case "${1:-status}" in
    "start")
        start_tunnels
        show_status
        ;;
    "stop")
        stop_tunnels
        show_status
        ;;
    "restart")
        restart_tunnels
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "urls")
        get_urls
        echo "🌐 URLs de SnatchGame:"
        if [[ "$CLIENT_URL" != "No disponible" ]]; then
            echo "🎮 CLIENTE: $CLIENT_URL"
            echo "📊 ADMIN:   $ADMIN_URL"
            echo "🎯 SERVER:  $SERVER_URL"
            echo ""
            echo "📋 Para copiar fácilmente:"
            echo "Cliente: $CLIENT_URL"
        else
            echo "⚠️  URLs no disponibles. Ejecuta: ./manage-tunnels.sh start"
        fi
        ;;
    "status"|*)
        show_status
        echo ""
        echo "💡 COMANDOS DISPONIBLES:"
        echo "   ./manage-tunnels.sh start    - Iniciar túneles"
        echo "   ./manage-tunnels.sh stop     - Parar túneles"
        echo "   ./manage-tunnels.sh restart  - Reiniciar túneles"
        echo "   ./manage-tunnels.sh logs     - Ver logs"
        echo "   ./manage-tunnels.sh urls     - Mostrar URLs"
        echo ""
        if [[ "$CLIENT_URL" != "No disponible" ]]; then
            echo "🎮 PARA JUGAR:"
            echo "   Abre: $CLIENT_URL"
            echo ""
            echo "📊 PARA ADMINISTRAR:"
            echo "   Abre: $ADMIN_URL"
        else
            echo "⚠️  Para obtener URLs ejecuta: ./manage-tunnels.sh start"
        fi
        ;;
esac