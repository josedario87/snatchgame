# 🌐 SnatchGame - Ngrok Internet Exposure

Esta carpeta contiene todo lo necesario para exponer SnatchGame a internet usando ngrok.

## 🚀 Uso Rápido

### **Método Fácil (Recomendado):**
```bash
cd ngrok
./setup-complete.sh
```

¡Eso es todo! El script hará todo automáticamente y te dará las URLs públicas.

## 📁 Archivos Incluidos

### **Scripts Principales:**

- **`setup-complete.sh`** - 🎯 **Script principal** - Hace todo automáticamente
- **`manage-tunnels.sh`** - 🛠️ Gestión de túneles (start/stop/status/urls)
- **`update-ngrok-urls.sh`** - 🔄 Actualiza URLs de Docker con ngrok
- **`docker-compose.ngrok.yml`** - 🐳 Configuración Docker para ngrok

### **Scripts Adicionales:**
- **`setup-ngrok.sh`** - Setup inicial con configuración manual
- **`expose-ngrok.sh`** - Script simple para exponer servicios

## 🔧 Métodos de Uso

### **1. Automático (Más Fácil):**
```bash
./setup-complete.sh
```
- ✅ Hace todo en orden correcto
- ✅ URLs dinámicas automáticas
- ✅ Verificación completa
- ✅ Mantiene túneles activos

### **2. Manual (Más Control):**
```bash
# Ver estado
./manage-tunnels.sh status

# Iniciar túneles
./manage-tunnels.sh start

# Ver URLs actuales
./manage-tunnels.sh urls

# Parar túneles
./manage-tunnels.sh stop

# Reiniciar todo
./manage-tunnels.sh restart
```

### **3. Solo actualizar URLs:**
```bash
./update-ngrok-urls.sh
```

## 📋 Prerrequisitos

### **1. Cuenta ngrok (Gratis):**
1. Regístrate en: https://dashboard.ngrok.com/signup
2. Obtén tu authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
3. Configúralo una vez:
   ```bash
   /tmp/ngrok config add-authtoken TU_TOKEN_AQUI
   ```

### **2. Docker funcionando:**
- Los servicios de SnatchGame deben estar builds
- Docker compose debe estar disponible

## 🌐 URLs que obtendrás

Después de ejecutar el setup obtendrás 3 URLs públicas:

- **🎮 CLIENTE** - Para que los jugadores se conecten
- **📊 ADMIN** - Para administrar el juego
- **🎯 SERVIDOR** - API del juego (configurado automáticamente)

## 🛠️ Solución de Problemas

### **Error: "authentication failed"**
```bash
# Configura tu authtoken de ngrok
/tmp/ngrok config add-authtoken TU_TOKEN
```

### **Error: "port already in use"**
```bash
# Limpia procesos anteriores
pkill -f ngrok
docker compose down
```

### **URLs no funcionan**
```bash
# Reinicia todo el setup
./manage-tunnels.sh restart
```

### **Docker no responde**
```bash
# Verifica que los servicios estén construidos
cd .. && docker compose ps
```

## 📊 Flujo de Funcionamiento

```
1. 🛑 Limpia procesos anteriores
   ↓
2. 🐳 Inicia servicios Docker (localhost)
   ↓
3. 🌐 Crea túneles ngrok → Obtiene URLs públicas
   ↓
4. 🔄 Reconfigura Docker con URLs reales
   ↓
5. ✅ Verifica que todo funcione
   ↓
6. 🎉 ¡Sistema funcionando en internet!
```

## 🔍 Verificación

### **Verificar que funciona:**
```bash
# 1. Ver estado
./manage-tunnels.sh status

# 2. Ver URLs
./manage-tunnels.sh urls

# 3. Probar cliente
curl https://TU_URL_CLIENTE/health
```

### **URLs correctas:**
- Cliente debe devolver: `{"status":"healthy","service":"snatchgame-client"}`
- Admin debe devolver: `{"status":"healthy","service":"snatchgame-admin"}`
- Servidor debe devolver: `{"status":"healthy"}`

## 🎯 Comando de Un Solo Paso

Para usuarios experimentados:
```bash
cd ngrok && ./setup-complete.sh
```

## ⚠️ Notas Importantes

- **Mantén la terminal abierta** - Los túneles se cierran si cierras la terminal
- **URLs dinámicas** - Cambian cada vez que reinicias ngrok
- **Primera vez** - ngrok puede pedir "Visit Site" en el navegador
- **Cuenta gratuita** - Túneles estables mientras esté activo

## 🎮 Para Jugar

1. Ejecuta: `./setup-complete.sh`
2. Copia la URL del CLIENTE
3. Comparte con amigos
4. ¡Jueguen desde cualquier lugar del mundo!

---

> 💡 **Tip**: Guarda las URLs que te dé el script, son válidas mientras mantengas la terminal abierta.