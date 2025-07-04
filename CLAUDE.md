# Guía de Trabajo - SnatchGame

## Instrucciones del Proyecto
Crear un juego multijugador para red local con:
- Servidor central usando Colyseus.io para estado compartido
- Cliente con Vue 3 + CSS + HTML vanilla
- Cliente usa Colyseus.js SDK
- Servidor y clientes en la misma red local

## Estructura del Proyecto
```
/server/          # Servidor Colyseus.io
/client/          # Cliente Vue 3 vanilla
```

## Stack Tecnológico
**Servidor:**
- Colyseus.io (framework de servidor)
- Node.js
- TypeScript

**Cliente:**
- Vue 3 (vanilla, sin build tools)
- HTML vanilla
- CSS vanilla
- Colyseus.js (SDK cliente)
- TypeScript

**UI Administración:**
- Vue 3 (vanilla, sin build tools)
- HTML vanilla
- CSS vanilla
- Colyseus.js (SDK cliente)
- TypeScript

## Convenciones de Código
**Lenguaje:**
- Código: Inglés
- UI/Diálogos: Español
- Comentarios: Inglés

**Naming Conventions:**
- Variables/Funciones: `thisIsAFunction`
- Clases: `ThisIsAClass`
- Constantes globales/env: `THIS_IS_A_GLOBAL_CONSTANT`

**TypeScript:**
- Tipado estricto en todos los componentes
- Tipos auto-generados desde servidor usando schema-codegen
- Homogeneidad de tipos entre los 3 componentes

## Arquitectura - Microservicios

### Desarrollo
```
/server/          # Servidor Colyseus.io + TypeScript (Puerto 2567)
/client/          # Cliente Vue 3 + Express server (Puerto 3000)
/admin/           # UI Admin Vue 3 + Express server (Puerto 3001)
```

### Producción (Docker + Nginx Proxy Manager)
```
snatchgame-server     # Contenedor servidor Colyseus
snatchgame-client     # Contenedor cliente Express
snatchgame-admin      # Contenedor admin Express
nginx-proxy-manager   # Proxy reverso y balanceador
```

**Enrutamiento Producción:**
- `/` → Cliente UI
- `/admin` → Admin UI  
- `/server` → API Servidor Colyseus

## UI de Administración
**Arquitectura:**
- Servidor Express independiente (Puerto 3001)
- Comunicación SSE con servidor Colyseus
- Actualización de estado cada 500ms (polling)
- Una interfaz principal (múltiples conexiones opcionales)

**Funcionalidades principales:**
- Dashboard con estadísticas en tiempo real:
  - Cantidad de jugadores conectados
  - Cantidad de partidas activas  
  - Ronda actual del juego global
  - Estados: esperando jugadores, pausa, juego terminado
  - Nombres de las rondas
- Panel de control:
  - Expulsar jugadores individuales y todos (con notificaciones)
  - Control de rondas global (avanzar/retroceder en todas las salas)
  - Pausar/reanudar juego
  - Cancelar partidas de grupos específicos
- Lista de jugadores detallada:
  - Nombre, sala, rol del juego y tipo de productor
  - Tokens actuales (🦃 pavos, ☕ café, 🌽 maíz)
  - Estado de conexión en tiempo real
- Sistema de notificaciones a clientes:
  - Expulsión con redirección automática
  - Cambios de ronda globales
  - Pausas y reanudaciones
- Panel de debugging para IT profesional
- Transparencia total del estado del servidor

**Usuarios objetivo:**
- Admin no-técnico: Vista simple de estadísticas
- IT profesional: Vista detallada de debugging
- Comentaristas deportivos: Información clara para narración en vivo

## Comandos Importantes

### Desarrollo
- **Servidor**: `cd server && npm run dev` (Puerto 2567)
- **Cliente**: `cd client && npm run dev` (Puerto 3000)  
- **Admin**: `cd admin && npm run dev` (Puerto 3001)

### Generación de Tipos TypeScript
- **Manual**: `cd server && npx schema-codegen src/rooms/GameRoom.ts --ts --output ../client/src/types/`
- **Automático (cliente)**: `cd client && npm run generate-types`
- **Automático (admin)**: `cd admin && npm run generate-types`

### Testing y Debugging
- **Verificar puertos libres**: `lsof -i :2567,3000,3001`
- **Cerrar procesos**: `pkill -f "ts-node-dev" && pkill -f "vite" && pkill -f "node.*server"`
- **Cerrar procesos específicos**: `kill <PID>` (usar PID del proceso)

**IMPORTANTE:** 
- ⚠️ **Siempre cerrar servicios** después de testing/debugging
- ⚠️ **Si servicios no arrancan** probablemente el usuario los levantó manualmente
- ⚠️ **Verificar puertos** antes de iniciar servicios para evitar conflictos

### Producción
- **Build Server**: `cd server && npm run build`
- **Start Server**: `cd server && npm run start`
- **Start Client**: `cd client && npm run start`
- **Start Admin**: `cd admin && npm run start`

### Docker (Producción)
- **Build**: `docker-compose build`
- **Start**: `docker-compose up -d`
- **Stop**: `docker-compose down`
- **Logs**: `docker-compose logs -f [service]`

### Variables de Entorno
- Desarrollo: `.env.development`
- Producción: `.env.production`

### VSCode Tasks
- **Ctrl+Shift+P** → `Tasks: Run Task`
- **Start Server** - Ejecutar solo servidor Colyseus
- **Start Client** - Ejecutar solo cliente UI
- **Start Admin** - Ejecutar solo admin UI  
- **Start All Services** - Ejecutar todos los servicios paralelo
- **Install All Dependencies** - Instalar deps de todos
- **Build Server** - Compilar servidor TypeScript

## Gestión de Tipos TypeScript

### Schema-Codegen (Colyseus)
**Funcionalidad:**
- Genera automáticamente tipos TypeScript desde Schema classes del servidor
- Solo funciona para clases que extienden `Schema` con decoradores `@type`
- Mantiene sincronización perfecta entre servidor y cliente
- Es la práctica oficial recomendada por Colyseus

**Comandos:**
```bash
# Desde directorio server
npx schema-codegen src/rooms/GameRoom.ts --ts --output ../client/src/types/

# Desde directorio client (npm script configurado)
npm run generate-types
```

**Archivos generados:**
```
client/src/types/
├── Player.ts          # Auto-generado desde server/src/rooms/GameRoom.ts
├── GameState.ts       # Auto-generado desde server/src/rooms/GameRoom.ts
└── index.ts           # Re-exports + tipos auxiliares manuales
```

### Tipos No-Schema (Manuales)
**Importante:** Los tipos que NO son Schema classes deben copiarse manualmente:

**Ejemplos de tipos manuales:**
- `GameRoomOptions` (interfaces para opciones)
- `export interface` (interfaces auxiliares)
- `export type` (type aliases)
- Enums, constantes, utilidades

**Ubicación:**
- **Server**: `server/src/rooms/GameRoom.ts` (junto a Schema classes)
- **Cliente**: `client/src/types/index.ts` (copiados manualmente)
- **Admin**: `admin/src/types/index.ts` (copiados manualmente)

**Flujo de trabajo:**
1. **Schema classes**: Se auto-generan con schema-codegen
2. **Tipos auxiliares**: Se copian manualmente cuando se añaden/modifican
3. **Consistencia**: Usar nombres idénticos entre server y client

## API Admin - Arquitectura Técnica

### Endpoints Implementados
**Servidor Colyseus (Puerto 2567):**
- `GET /api/admin/stats` - Estadísticas en tiempo real usando `matchMaker.query()`
- `POST /api/admin/kick-player` - Expulsar jugador específico con notificación
- `POST /api/admin/kick-all-players` - Expulsar todos los jugadores con notificaciones
- `POST /api/admin/pause-game` - Pausar todas las partidas activas
- `POST /api/admin/resume-game` - Reanudar partidas pausadas
- `POST /api/admin/advance-round` - Avanzar ronda globalmente
- `POST /api/admin/previous-round` - Retroceder ronda globalmente
- `POST /api/admin/cancel-game` - Cancelar partidas específicas o todas

### Métodos GameRoom Implementados
- `getInspectData()` - Datos completos para el admin (compatible con monitor oficial)
- `pauseGame()` - Pausar juego con broadcast a clientes
- `resumeGame()` - Reanudar juego con broadcast a clientes
- `advanceRound()` - Avanzar ronda con límite máximo 10
- `previousRound()` - Retroceder ronda con límite mínimo 1
- `_forceClientDisconnect(sessionId)` - Expulsar jugador con notificación
- `_forceDisconnectAllClients()` - Expulsar todos con notificaciones

### Comunicación Cliente-Servidor
**Mensajes del servidor a clientes:**
- `adminKicked` - Notificación de expulsión individual
- `gamePaused` - Notificación de pausa del juego
- `gameResumed` - Notificación de reanudación del juego
- `roundChanged` - Notificación de cambio de ronda global

**Manejo en el cliente:**
- Auto-redirección a home al recibir `adminKicked`
- Alerts informativos para cambios de estado
- Logging detallado de eventos administrativos

### Principios de Diseño
- **API Oficial Colyseus**: Sin hacks de variables globales
- **matchMaker.query()**: Acceso seguro a información de salas
- **matchMaker.remoteRoomCall()**: Ejecución remota de métodos
- **Type Safety**: Sincronización completa TypeScript
- **Error Handling**: Try/catch en todos los endpoints
- **Graceful Notifications**: Delay de 1 segundo para procesar mensajes

## Notas Específicas
- **Offline**: Sin dependencias externas de internet
- **Microservicios**: Arquitectura separada por responsabilidades
- **Red Local**: Funciona completamente en LAN
- **Monorepo**: Un repositorio para todos los servicios
- **Docker**: Orquestación con docker-compose en producción
- **Nginx Proxy Manager**: Enrutamiento y balanceo de carga
- **Variables de Entorno**: Configuración por ambiente (.env)
- **Logging**: Detallado para debugging profesional
- **Tipos TypeScript**: Auto-generación con schema-codegen + copiar tipos auxiliares manualmente
- **Admin Dashboard**: Completamente funcional con control total del juego