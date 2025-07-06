#!/bin/bash

echo "🧪 Test rápido de la carpeta ngrok"
echo "=================================="

# Verificar que estamos en la carpeta correcta
if [[ ! -f "setup-complete.sh" ]]; then
    echo "❌ Error: Ejecuta desde la carpeta ngrok/"
    exit 1
fi

echo "✅ Carpeta ngrok encontrada"

# Verificar que ngrok está disponible
if [[ ! -f "/tmp/ngrok" ]]; then
    echo "❌ Error: ngrok no está instalado en /tmp/ngrok"
    exit 1
fi

echo "✅ ngrok encontrado"

# Verificar que Docker está disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker no está disponible"
    exit 1
fi

echo "✅ Docker encontrado"

# Verificar que las imágenes existen
echo "🔍 Verificando imágenes Docker..."
if docker images | grep -q "snatchgame-server"; then
    echo "✅ Imagen server encontrada"
else
    echo "⚠️  Imagen server no encontrada"
fi

if docker images | grep -q "snatchgame-client"; then
    echo "✅ Imagen client encontrada"
else
    echo "⚠️  Imagen client no encontrada"
fi

if docker images | grep -q "snatchgame-admin"; then
    echo "✅ Imagen admin encontrada"
else
    echo "⚠️  Imagen admin no encontrada"
fi

# Verificar configuración ngrok
echo "🔍 Verificando configuración ngrok..."
if /tmp/ngrok config check &>/dev/null; then
    echo "✅ ngrok configurado correctamente"
else
    echo "⚠️  ngrok no está autenticado"
    echo "   Ejecuta: /tmp/ngrok config add-authtoken TU_TOKEN"
fi

echo ""
echo "🎯 LISTO PARA USAR:"
echo "   ./setup-complete.sh"
echo ""
echo "📋 Si hay problemas:"
echo "   • Asegúrate de tener tu authtoken de ngrok configurado"
echo "   • Verifica que las imágenes Docker estén builds"
echo "   • Ejecuta desde la carpeta ngrok/"