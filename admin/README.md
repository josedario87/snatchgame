# 🎛️ SnatchGame Admin Dashboard

[![Version](https://img.shields.io/badge/version-0.0.8--alpha-orange.svg)](https://github.com/username/snatchgame)
[![Vue.js](https://img.shields.io/badge/vue-3.0+-brightgreen.svg)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://www.typescriptlang.org/)

**Interfaz de administración completa** para el control y monitoreo en tiempo real del juego **SnatchGame**. Diseñada para administradores técnicos, personal no-técnico y comentaristas deportivos.

## 📊 Características Principales

### **🔄 Monitoreo en Tiempo Real**
- **👥 Lista de Jugadores Detallada**: Nombre, sala, rol, tipo de productor
- **🎯 Estado de Tokens**: Cantidad actual de 🦃 pavos, ☕ café, 🌽 maíz por jugador
- **📈 Estadísticas Globales**: Jugadores conectados, partidas activas, ronda actual
- **🔗 Estado de Conexión**: Indicador visual de jugadores conectados/desconectados
- **⚡ Actualización Automática**: SSE con polling cada 500ms

### **🎮 Control del Juego**
- **⏮️ Retroceder Ronda**: Cambio global a ronda anterior (mínimo 1)
- **⏭️ Avanzar Ronda**: Cambio global a ronda siguiente (máximo 10)
- **⏸️ Pausar Juego**: Pausar todas las partidas activas
- **▶️ Reanudar Juego**: Reanudar partidas pausadas

### **👥 Gestión de Jugadores**
- **🚫 Expulsar Jugador Individual**: Con notificación automática al cliente
- **🚫🚫 Expulsar Todos los Jugadores**: Vaciar todas las salas con notificaciones
- **🏠 Redirección Automática**: Los jugadores expulsados vuelven al home
- **📱 Notificaciones Inmediatas**: Alerts personalizados para cada acción

### **🎯 Usuarios Objetivo**
- **👨‍💼 Administrador No-Técnico**: Vista limpia con estadísticas esenciales
- **👨‍💻 IT Profesional**: Información de debugging y estado técnico
- **🎙️ Comentaristas Deportivos**: Información clara para narración en vivo

## 🏗️ Arquitectura Técnica

### **Stack Tecnológico**
- **Frontend**: Vue 3 + Composition API + TypeScript
- **Build Tool**: Vite (desarrollo) + Express (producción)
- **Comunicación**: HTTP (control) + fetch API
- **Styling**: CSS vanilla con diseño responsivo
- **Types**: Auto-generados desde servidor con schema-codegen

### **Comunicación con Servidor**
```typescript
// Admin Service comunica con servidor Colyseus
adminService.kickPlayer(playerId)      // → POST /api/admin/kick-player
adminService.advanceRound()            // → POST /api/admin/advance-round
adminService.pauseGame()               // → POST /api/admin/pause-game
```

### **Arquitectura del Sistema**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin UI      │    │  Colyseus       │    │   Game Client   │
│   Port 3001     │───▶│   Server        │◄──▶│   Port 3000     │
│   (Vue 3)       │    │   Port 2567     │    │   (Vue 3)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───── HTTP/Fetch ──────┘                       │
                                 │                       │
                     ┌───────────▼───────────┐          │
                     │   Notifications       │          │
                     │   (adminKicked,       │◄─────────┘
                     │    roundChanged)      │
                     └───────────────────────┘
```

## 🚀 Instalación y Ejecución

### **Prerrequisitos**
- Node.js >= 18.0.0
- npm >= 8.0.0
- Servidor Colyseus ejecutándose en puerto 2567

### **Desarrollo**
```bash
# Desde el directorio admin
cd admin

# Instalar dependencias
npm install

# Generar tipos desde servidor
npm run generate-types

# Iniciar desarrollo
npm run dev
```

### **Producción**
```bash
# Build para producción
npm run build

# Iniciar servidor Express
npm start
```

### **URLs**
- **Desarrollo**: http://localhost:3001
- **Producción**: Configurado según variables de entorno

## 📁 Estructura del Proyecto

```
admin/
├── src/
│   ├── components/          # Componentes Vue
│   ├── services/            # Servicios de comunicación
│   │   └── adminService.ts  # API client para servidor Colyseus
│   ├── types/               # Tipos auto-generados
│   │   ├── GameState.ts     # Estado del juego
│   │   ├── Player.ts        # Información de jugador
│   │   ├── TokenInventory.ts # Inventario de tokens
│   │   └── index.ts         # Re-exports y tipos auxiliares
│   ├── App.vue             # Componente principal
│   └── main.ts             # Entry point
├── server.js               # Express server (producción)
├── package.json            # Dependencias y scripts
├── vite.config.ts          # Configuración Vite
└── README.md               # Este archivo
```

## 🎨 Interfaz de Usuario

### **Dashboard Principal**
```
📊 SnatchGame Dashboard                           🟢 Conectado
┌─────────────────────────────────────────────────────────────┐
│ 👥 Jugadores: 6    🎮 Partidas: 2    🎯 Ronda: 3           │
│ 📊 Estado: En progreso                                      │
└─────────────────────────────────────────────────────────────┘

🎛️ Control del Juego
┌─────────────────────────────────────────────────────────────┐
│ ⏮️ Retroceder  ⏭️ Avanzar  ⏸️ Pausar  ▶️ Reanudar        │
│      Ronda       Ronda      Juego     Juego                │
│                                                             │
│ 🚫 Expulsar     🚫🚫 Expulsar                              │
│    Jugador         Jugadores                                │
└─────────────────────────────────────────────────────────────┘

👥 Lista de Jugadores (6)
┌─────────────────────────────────────────────────────────────┐
│ Juan Carlos           🟢      Sala: a3f2b1                  │
│ Comerciante          🦃 Productor de Pavos                  │
│ 🦃 3  ☕ 2  🌽 1                            🚫 Expulsar     │
├─────────────────────────────────────────────────────────────┤
│ María López           🟢      Sala: a3f2b1                  │
│ Comerciante          ☕ Productor de Café                   │
│ 🦃 1  ☕ 4  🌽 2                            🚫 Expulsar     │
└─────────────────────────────────────────────────────────────┘
```

### **Responsive Design**
- **Desktop**: Layout de 2 columnas con información completa
- **Tablet**: Layout adaptativo con botones optimizados
- **Mobile**: Layout vertical con información esencial

## ⚙️ Configuración

### **Variables de Entorno**
```env
# .env.development
VITE_ADMIN_PORT=3001
NODE_ENV=development

# .env.production  
VITE_ADMIN_PORT=3001
NODE_ENV=production
```

### **AdminService Configuration**
```typescript
// src/services/adminService.ts
class AdminService {
  private serverUrl = 'http://localhost:2567' // Colyseus server
  
  // Todos los métodos apuntan al servidor Colyseus
  async kickPlayer(playerId: string) { /* ... */ }
  async advanceRound() { /* ... */ }
  // ...
}
```

## 🔧 API Reference

### **AdminService Methods**

#### **Control de Jugadores**
```typescript
// Expulsar jugador específico
await adminService.kickPlayer('player-session-id')

// Expulsar todos los jugadores
await adminService.kickAllPlayers()
```

#### **Control del Juego**
```typescript
// Pausar todas las partidas
await adminService.pauseGame()

// Reanudar partidas pausadas
await adminService.resumeGame()
```

#### **Control de Rondas**
```typescript
// Avanzar ronda globalmente
await adminService.advanceRound()

// Retroceder ronda globalmente
await adminService.previousRound()
```

#### **Gestión de Partidas**
```typescript
// Cancelar partida específica
await adminService.cancelGame('room-id')

// Cancelar todas las partidas
await adminService.cancelGame()
```

### **Endpoints del Servidor**
Todos los endpoints están en el **servidor Colyseus** (puerto 2567):

- `GET /api/admin/stats` - Estadísticas en tiempo real
- `POST /api/admin/kick-player` - Expulsar jugador específico
- `POST /api/admin/kick-all-players` - Expulsar todos los jugadores
- `POST /api/admin/pause-game` - Pausar juego
- `POST /api/admin/resume-game` - Reanudar juego
- `POST /api/admin/advance-round` - Avanzar ronda
- `POST /api/admin/previous-round` - Retroceder ronda
- `POST /api/admin/cancel-game` - Cancelar partida

## 🔔 Sistema de Notificaciones

### **Notificaciones a Clientes**
El admin puede enviar notificaciones automáticas que los clientes reciben:

```typescript
// El cliente recibe estos mensajes automáticamente
client.onMessage("adminKicked", (data) => {
  alert("🚫 Has sido expulsado por el administrador")
  // Auto-redirección a home screen
})

client.onMessage("roundChanged", (data) => {
  alert(`🎯 ${data.message}`) // "Ronda 3 - Cambio realizado por el administrador"
})
```

### **Experiencia del Usuario**
1. **Admin ejecuta acción** (expulsar, cambiar ronda, etc.)
2. **Servidor procesa** usando API oficial de Colyseus
3. **Clientes reciben notificación** inmediata y automática
4. **Redirección automática** cuando corresponde (expulsión)

## 🛠️ Desarrollo

### **Scripts Disponibles**
```bash
# Desarrollo con hot reload
npm run dev

# Generar tipos desde servidor
npm run generate-types

# Build para producción
npm run build

# Preview del build
npm run preview

# Servidor Express (producción)
npm start
```

### **Debugging**
```bash
# Verificar que el servidor Colyseus esté ejecutándose
curl http://localhost:2567/

# Verificar endpoint de stats
curl http://localhost:2567/api/admin/stats

# Ver logs del admin en desarrollo
npm run dev
# Abrir DevTools (F12) para logs detallados
```

### **Type Generation**
```bash
# Los tipos se generan automáticamente desde el servidor
cd admin
npm run generate-types

# Esto ejecuta:
# cd ../server && npx schema-codegen src/rooms/GameRoom.ts --ts --output ../admin/src/types/
```

## 🚀 Deploy

### **Docker (Recomendado)**
```bash
# Desde el directorio raíz del proyecto
docker-compose up -d

# El admin estará disponible en el puerto configurado
```

### **Manual**
```bash
# Build admin
cd admin
npm run build

# Start en producción
npm start
```

## 🤝 Contribuir

### **Estructura de Contribución**
1. **Servidor primero**: Implementar nuevos endpoints en `/server/src/app.config.ts`
2. **GameRoom methods**: Agregar métodos necesarios en `/server/src/rooms/GameRoom.ts`
3. **AdminService**: Actualizar `/admin/src/services/adminService.ts`
4. **UI Components**: Modificar `/admin/src/App.vue` según necesidad
5. **Types**: Regenerar con `npm run generate-types`

### **Convenciones**
- **Endpoints**: Prefijo `/api/admin/` para todas las rutas admin
- **Métodos GameRoom**: Prefijo `_` para métodos admin (ej: `_forceClientDisconnect`)
- **Notificaciones**: Mensajes descriptivos en español para usuarios
- **Error Handling**: Try/catch en todos los métodos async

## 📄 Licencia

Este microservicio es parte del proyecto **SnatchGame** bajo licencia **MIT**.

## 🙋‍♂️ Soporte

- **Documentación Principal**: `/README.md` (directorio raíz)
- **Guía Técnica**: `/CLAUDE.md` 
- **Issues**: [GitHub Issues](https://github.com/username/snatchgame/issues)

---

<div align="center">

**🎛️ Admin Dashboard Completo para SnatchGame**

*Control total • Monitoreo en tiempo real • Notificaciones automáticas*

</div>