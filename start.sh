#!/bin/sh

# Iniciar el servidor Colyseus en background
echo "Starting Colyseus server..."
cd /app/server && node dist/server/src/index.js &

# Esperar un momento para que el servidor inicie
sleep 2

# Servir el cliente compilado
echo "Starting client server..."
cd /app/client && serve -s dist -l 3000 &

# Mantener el contenedor corriendo
wait