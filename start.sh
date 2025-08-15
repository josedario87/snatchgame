#!/bin/sh

# Iniciar el servidor Colyseus en background (puerto 2567)
echo "Starting Colyseus server..."
cd /app/server && PORT=2567 node dist/server/src/index.js &

# Esperar un momento para que el servidor inicie
sleep 2

# Servir el cliente compilado (puerto 3000)
echo "Starting client server..."
cd /app/client && serve -s dist -p 3000 &

# Mantener el contenedor corriendo
wait