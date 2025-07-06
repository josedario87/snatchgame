# 📁 Contenido de la Carpeta ngrok/

## 🚀 Scripts Principales

### **`setup-complete.sh`** ⭐ **PRINCIPAL**
- **Función**: Script todo-en-uno que hace el setup completo
- **Uso**: `./setup-complete.sh`
- **Hace**: 
  1. Limpia procesos anteriores
  2. Inicia Docker con configuración básica
  3. Crea túneles ngrok y obtiene URLs
  4. Reconfigura Docker con URLs reales
  5. Verifica que todo funcione
  6. Mantiene túneles activos

### **`manage-tunnels.sh`** 🛠️ **GESTIÓN**
- **Función**: Gestiona túneles ngrok existentes
- **Uso**: 
  - `./manage-tunnels.sh status` - Ver estado
  - `./manage-tunnels.sh start` - Iniciar túneles
  - `./manage-tunnels.sh stop` - Parar túneles
  - `./manage-tunnels.sh urls` - Ver URLs actuales
  - `./manage-tunnels.sh restart` - Reiniciar todo

### **`test.sh`** 🧪 **VERIFICACIÓN**
- **Función**: Verifica que todo esté listo para usar
- **Uso**: `./test.sh`
- **Verifica**: ngrok, Docker, imágenes, configuración

## 🔧 Scripts Auxiliares

### **`update-ngrok-urls.sh`**
- **Función**: Actualiza URLs de Docker con ngrok (usado por setup-complete)
- **Uso**: `./update-ngrok-urls.sh`

### **`setup-ngrok.sh`**
- **Función**: Setup inicial con configuración manual
- **Uso**: `./setup-ngrok.sh`

### **`expose-ngrok.sh`**
- **Función**: Script simple para exponer servicios
- **Uso**: `./expose-ngrok.sh`

## 📄 Archivos de Configuración

### **`docker-compose.ngrok.yml`**
- **Función**: Configuración Docker optimizada para ngrok
- **Contenido**: Servicios sin URLs hardcodeadas
- **Usado por**: Todos los scripts

### **`README.md`**
- **Función**: Documentación completa de uso
- **Contenido**: Instrucciones, ejemplos, troubleshooting

### **`ARCHIVOS.md`** (este archivo)
- **Función**: Descripción de todos los archivos
- **Contenido**: Qué hace cada script y archivo

## 🎯 Uso Recomendado

### **Para Usuarios Normales:**
```bash
cd ngrok
./setup-complete.sh
```

### **Para Debugging:**
```bash
# Verificar que todo esté listo
./test.sh

# Ver estado actual
./manage-tunnels.sh status

# Ver solo las URLs
./manage-tunnels.sh urls
```

### **Para Reinicios:**
```bash
# Reiniciar todo
./manage-tunnels.sh restart

# O hacer setup completo desde cero
./setup-complete.sh
```

## 📋 Dependencias

### **Externas:**
- ngrok instalado en `/tmp/ngrok`
- Docker funcionando
- Imágenes Docker construidas
- Authtoken de ngrok configurado

### **Internas:**
- Todos los scripts están en la misma carpeta
- Rutas relativas configuradas correctamente
- Scripts ejecutables (`chmod +x`)

## 🎉 Resultado

Después de ejecutar `./setup-complete.sh` obtienes:
- 🎮 URL del cliente para jugadores
- 📊 URL del admin para control
- 🎯 URL del servidor (configurada automáticamente)
- ✅ Sistema funcionando en internet