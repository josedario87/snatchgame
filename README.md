# 🎮 SnatchGame

[![Version](https://img.shields.io/badge/version-0.0.8--alpha-orange.svg)](https://github.com/username/snatchgame)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/vue-3.0+-brightgreen.svg)](https://vuejs.org/)
[![Colyseus](https://img.shields.io/badge/colyseus-0.16+-purple.svg)](https://colyseus.io/)

Un juego multijugador educativo que simula la evolución de instituciones y cooperación, basado en el **"Snatch Game"** de **Elinor Ostrom**. Construido con **Colyseus.io** y **Vue 3** para redes locales.

> ✨ **Admin Dashboard Completo** - Versión Alpha (v0.0.8-alpha) con interfaz de administración profesional

## 🎓 Sobre el Juego

**Snatch or Share** es una simulación interactiva que permite a los participantes experimentar cómo las reglas, la confianza y los arreglos institucionales afectan la cooperación en intercambios descentralizados. Basado en el trabajo de la Nobel de Economía **Elinor Ostrom** sobre gobernanza de recursos comunes.

### 🎯 Objetivos Educativos
- Demostrar la evolución de instituciones en el intercambio
- Experimentar con diferentes sistemas de gobernanza  
- Entender el rol de la confianza en la cooperación
- Aplicar conceptos de teoría de juegos en tiempo real

## 🚀 Características del Juego

- **👥 Multijugador exacto** - Salas de exactamente 3 jugadores
- **🎭 Roles únicos** - Productor de Pavos, Café o Maíz
- **⚡ Tiempo real** - Sincronización instantánea con Colyseus.io
- **🔄 Sistema de intercambio** - Ofertas, negociaciones y "snatch"
- **📊 Cálculo automático** - Puntuación basada en tokens
- **📱 Responsive** - Interfaz optimizada para desktop y móvil
- **🎯 Red local** - Funciona completamente offline
- **📈 Progresión por rondas** - 5 rondas con reglas evolutivas
- **🎛️ Admin Dashboard** - Interfaz completa de administración y monitoreo
- **🔔 Notificaciones** - Sistema completo de alertas para jugadores

## 🎮 Cómo Jugar

### Preparación
1. **Únete a una sala** - Exactamente 3 jugadores requeridos
2. **Rol asignado** - Recibes un rol de productor único al azar
3. **Tokens iniciales** - Comienzas con 5 tokens de tu tipo

### Mecánicas de Juego
1. **Haz ofertas** - Click en otros jugadores para ofertar
2. **Responde ofertas** - Acepta, rechaza o haz "snatch"
3. **Acumula puntos** - Tokens propios = 1pt, ajenos = 2pts
4. **Estrategia** - Coopera o compite según las reglas de la ronda

### Progresión (5 Rondas)
- **Ronda 1-2**: Estado de naturaleza (sin reglas)
- **Ronda 3**: Reglas contraproductivas
- **Ronda 4**: Normas sociales (shame tokens)
- **Ronda 5**: Gobernanza institucional (juez rotativo)

## 🛠️ Stack Tecnológico

### Backend
- **[Colyseus.io](https://colyseus.io/)** - Framework multijugador en tiempo real
- **Node.js** + **TypeScript**
- **Express.js**

### Frontend
- **[Vue 3](https://vuejs.org/)** - Composition API
- **TypeScript** - Tipado estricto
- **Vite** - Build tool ultra-rápido
- **CSS vanilla** - Estilos custom

### Desarrollo
- **Schema-codegen** - Sincronización automática de tipos
- **Hot reload** - Desarrollo en vivo
- **ESLint + Prettier** - Calidad de código

## 📦 Instalación

### Prerrequisitos
- **Node.js** >= 18.0.0
- **npm** >= 8.0.0

### 1. Clonar el repositorio
```bash
git clone https://github.com/username/snatchgame.git
cd snatchgame
```

### 2. Instalar dependencias
```bash
# Instalar todas las dependencias automáticamente
npm run install:all

# O manualmente:
# Servidor
cd server && npm install

# Cliente  
cd ../client && npm install

# Admin
cd ../admin && npm install
```

## 🚀 Ejecución

### Desarrollo

#### Opción 1: VSCode Tasks (Recomendado)
```bash
# Presiona Ctrl+Shift+P → "Tasks: Run Task"
# Selecciona "Start All Services"
```

#### Opción 2: Manual
```bash
# Terminal 1 - Servidor
cd server
npm run dev

# Terminal 2 - Cliente
cd client
npm run dev

# Terminal 3 - Admin Dashboard
cd admin
npm run dev
```

### URLs de desarrollo
- **Cliente**: http://localhost:3000
- **Servidor**: http://localhost:2567 
- **Admin Dashboard**: http://localhost:3001
- **Monitor Colyseus**: http://localhost:2567/monitor

### Producción con Docker

**URLs de Producción:**
- **Cliente**: https://snatchGame.interno.com
- **Servidor**: https://snatchGameServer.interno.com
- **Admin Dashboard**: https://snatchgGameAdmin.interno.com

```bash
# Build todas las imágenes
docker-compose build

# Deploy en producción
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f

# Rebuild y redeploy tras cambios
docker-compose down && docker-compose up -d --build
```

## 🎮 Interfaz del Juego

### Vista Desktop
- **Layout de 2 columnas**: Jugadores a la izquierda, ofertas a la derecha
- **Jugador actual prominente**: Tarjeta grande en la parte inferior
- **Otros jugadores compactos**: Tarjetas pequeñas y clickeables
- **Panel de ofertas**: Scroll customizado con ofertas en tiempo real

### Vista Móvil  
- **Layout vertical**: Jugadores arriba, ofertas abajo
- **Formulario modal**: Ofertas en modal flotante
- **Botones optimizados**: +/- táctiles para cantidades
- **Scroll adaptativo**: Altura limitada con navegación suave

### Componentes Principales
- **PlayerCard**: Información de jugador con tokens y puntos
- **TradeOfferCard**: Ofertas con acciones (Accept/Reject/Snatch)
- **MakeOfferForm**: Formulario con botones +/- intuitivos
- **OfferModal**: Modal flotante para crear ofertas dirigidas

## 🎛️ Admin Dashboard

El **Admin Dashboard** proporciona control completo y monitoreo en tiempo real del juego, diseñado tanto para administradores técnicos como para comentaristas no-técnicos.

### 📊 Características Principales

#### **Información en Tiempo Real**
- **👥 Lista de Jugadores Detallada**: Nombre, sala, rol, tipo de productor y tokens actuales
- **📈 Estadísticas Globales**: Jugadores conectados, partidas activas, ronda actual
- **🎯 Estado del Juego**: En progreso, pausado, esperando jugadores
- **🔄 Actualización Automática**: SSE con polling cada 500ms

#### **Control de Jugadores**
- **🚫 Expulsar Jugador Individual**: Con notificación al cliente y redirección automática
- **🚫🚫 Expulsar Todos los Jugadores**: Vaciar todas las salas con notificaciones apropiadas
- **👤 Información Detallada**: Ver tokens específicos (🦃 pavos, ☕ café, 🌽 maíz)

#### **Control del Juego**
- **⏸️ Pausar Juego**: Pausar todas las partidas activas
- **▶️ Reanudar Juego**: Reanudar partidas pausadas
- **⏮️ Retroceder Ronda**: Cambio global a ronda anterior (mínimo 1)
- **⏭️ Avanzar Ronda**: Cambio global a ronda siguiente (máximo 10)

#### **Notificaciones a Clientes**
- **🔔 Expulsión**: Mensaje personalizado y redirección automática
- **🎯 Cambio de Ronda**: Notificación inmediata de nuevas rondas
- **⏸️ Estado del Juego**: Alertas de pausa/reanudación

### 🎯 Usuarios Objetivo
- **👨‍💼 Administrador No-Técnico**: Vista limpia con estadísticas esenciales
- **👨‍💻 IT Profesional**: Información de debugging y estado técnico detallado
- **🎙️ Comentaristas Deportivos**: Información clara para narración en vivo

### 🏗️ Arquitectura Técnica
- **API Oficial Colyseus**: Uso de `matchMaker.query()` y `matchMaker.remoteRoomCall()`
- **Comunicación Bidireccional**: SSE para updates, HTTP para control
- **Sin Variables Globales**: Implementación limpia y mantenible
- **Type Safety**: Sincronización completa de tipos TypeScript
- **Separación URLs**: URLs internas HTTP para contenedores, HTTPS para clientes
- **Optimización SSE**: Anti-buffering headers, polling optimizado (250ms), heartbeat

## ⚙️ Configuración

### Variables de Entorno

**Desarrollo** (`.env.development`):
```env
VITE_SERVER_URL=ws://localhost:2567
NODE_ENV=development
PORT=2567
```

**Producción** (`.env.production`):
```env
NODE_ENV=production
# Servidor
PORT=2567
# Cliente
SERVER_URL=http://snatchgame-server:2567
PUBLIC_SERVER_URL=https://snatchGameServer.interno.com
# Admin
SERVER_URL=http://snatchgame-server:2567
PUBLIC_SERVER_URL=https://snatchGameServer.interno.com
```

### Configuración de Logs
- **Desarrollo**: Logs habilitados por defecto
- **Producción**: Logs deshabilitados por defecto
- **Usuario**: Configurable en "Configuración" → "Logs de depuración"

## 🏗️ Arquitectura

### Desarrollo
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client UI     │    │  Colyseus       │    │   Admin UI      │
│   (Vue 3)       │◄──►│   Server        │◄──►│   (Vue 3 + SSE) │
│   Port 3000     │    │   Port 2567     │    │   Port 3001     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Producción con Docker
```
┌────────────────────────────────────────────────────────────────┐
│                    Nginx Proxy Manager                        │
│                      Red "principal"                          │
├────────────────────────────────────────────────────────────────┤
│  https://snatchGame.interno.com                               │
│       ↓ (Puerto 3010)                                         │
│  ┌─────────────────┐     ┌─────────────────┐                  │
│  │ snatchgame-     │     │ snatchgame-     │                  │
│  │ client          │◄────┤ server          │                  │
│  │ (Vue + Express) │     │ (Colyseus)      │                  │
│  │ Puerto 3000     │     │ Puerto 2567     │                  │
│  └─────────────────┘     └─────────────────┘                  │
│           ▲                       ▲                           │
│           │                       │                           │
│           │               ┌─────────────────┐                  │
│           └───────────────┤ snatchgame-     │                  │
│                           │ admin           │                  │
│                           │ (Vue + Express) │                  │
│   https://snatchgGameAdmin.interno.com     │                  │
│                           │ Puerto 3001     │                  │
│                           └─────────────────┘                  │
│                               ↑ (Puerto 3011)                 │
└────────────────────────────────────────────────────────────────┘
```

### Separación de URLs en Producción

**URLs Externas (HTTPS - Navegador → Nginx):**
- Cliente: `https://snatchGame.interno.com`
- Servidor: `https://snatchGameServer.interno.com` 
- Admin: `https://snatchgGameAdmin.interno.com`

**URLs Internas (HTTP - Contenedor → Contenedor):**
- Servidor: `http://snatchgame-server:2567`
- Cliente API: `http://snatchgame-client:3000`
- Admin API: `http://snatchgame-admin:3001`

### Comunicación Admin
- **SSE (Server-Sent Events)**: Servidor → Admin UI
- **Polling**: Actualización cada 250ms (optimizado)
- **Control**: Admin → Servidor (HTTP endpoints)
- **Heartbeat**: Keepalive cada 30 segundos

### Sincronización de Tipos
```bash
# Los tipos se generan automáticamente del servidor al cliente
npm run generate-types
```

## 🧪 Testing

```bash
# Servidor
cd server
npm test

# Cliente
cd client
npm test

# E2E
npm run test:e2e
```

## 📁 Estructura del Proyecto

```
snatchgame/
├── 📁 server/              # Colyseus.io backend
│   ├── src/
│   │   ├── rooms/
│   │   │   └── GameRoom.ts # Lógica principal del juego
│   │   ├── app.config.ts   # Configuración Colyseus
│   │   └── index.ts        # Entry point
│   └── README.md           # Documentación del servidor
├── 📁 client/              # Vue 3 frontend  
│   ├── src/
│   │   ├── components/     # Componentes Vue
│   │   │   ├── Game.vue    # Componente principal
│   │   │   ├── PlayerCard.vue
│   │   │   ├── TradeOfferCard.vue
│   │   │   ├── MakeOfferForm.vue
│   │   │   ├── ScrollableOffers.vue
│   │   │   └── OfferModal.vue
│   │   ├── services/       # Game client & logger
│   │   │   ├── gameClient.ts
│   │   │   └── logger.ts
│   │   ├── types/          # Auto-generated types
│   │   │   ├── GameState.ts
│   │   │   ├── Player.ts
│   │   │   ├── TradeOffer.ts
│   │   │   └── TokenInventory.ts
│   │   └── main.ts
│   ├── server.js           # Express server (producción)
│   └── README.md           # Documentación del cliente
├── 📁 admin/               # Admin dashboard
│   ├── src/
│   │   ├── components/     # Componentes Vue admin
│   │   ├── services/       # Admin service
│   │   │   └── adminService.ts
│   │   └── main.ts
│   ├── server.js           # Express server (producción)
│   └── README.md           # Documentación del admin
├── 🎮 gameRules.md         # Reglas del juego detalladas
├── 🐳 docker-compose.yml   # Orquestación Docker
├── 📋 CLAUDE.md            # Guía de desarrollo
└── 📖 README.md            # Este archivo
```

## 🤝 Contribuir

1. **Fork** el proyecto
2. **Crea** una feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add AmazingFeature'`)
4. **Push** a la branch (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### Guías de contribución
- Sigue las convenciones de código existentes
- Añade tests para nuevas características
- Actualiza la documentación si es necesario
- Los commits deben ser descriptivos

## 🐛 Debugging

### Logs de desarrollo
1. Ve a **Configuración** en la UI
2. Habilita **"Logs de depuración"**
3. Abre **DevTools** (F12) para ver logs detallados

### Comandos útiles
```bash
# Verificar puertos libres
lsof -i :2567,3000,3001

# Cerrar procesos
pkill -f "ts-node-dev" && pkill -f "vite"

# Regenerar tipos
cd client && npm run generate-types
```

## 🚀 Deploy

### Docker (Recomendado)
```bash
# Build y start
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual
```bash
# Build servidor
cd server && npm run build

# Build cliente
cd client && npm run build

# Start producción
npm run start
```

## 📋 Roadmap

### Funcionalidades del Juego
- [x] 🎮 Ronda 1: Estado de naturaleza (completado)
- [ ] 🎭 Ronda 2-5: Implementar reglas evolutivas
- [ ] 👨‍⚖️ Sistema de Judge rotativo
- [ ] 😔 Shame tokens y penalizaciones
- [ ] 📊 Estadísticas por ronda
- [ ] 🏆 Sistema de puntuación final

### Mejoras de UI/UX
- [x] 📱 Layout responsivo optimizado
- [x] 🎯 Formulario con botones +/-
- [x] 🔄 Scroll customizado para ofertas
- [ ] 🎨 Themes y customización visual
- [ ] 🔊 Efectos de sonido y feedback
- [ ] ⚡ Animaciones de transición
- [ ] 📊 Gráficos y visualizaciones

### Infraestructura
- [x] 📈 UI de administración completa
  - [x] Dashboard con estadísticas en tiempo real
  - [x] Panel de control para administrar partidas
  - [x] Sistema de expulsión de jugadores
  - [x] Pausa/reanudación de partidas
  - [x] Control de rondas globales
  - [x] Información detallada de jugadores con tokens
  - [x] Notificaciones automáticas a clientes
  - [x] Optimización SSE (250ms polling, heartbeat, anti-buffering)
  - [ ] Historial de partidas anteriores
- [x] 🐳 Docker en producción
  - [x] Dockerfiles para todos los servicios
  - [x] Docker Compose con orquestación completa
  - [x] Gitea Actions CI/CD pipeline
  - [x] Separación URLs internas/externas para SSL
  - [x] Red principal para Nginx Proxy Manager
  - [x] Health checks y restart policies
- [ ] 📱 PWA support
- [ ] 🌍 Multi-idioma (EN/ES)
- [ ] 🔒 Sistema de salas privadas
- [ ] 📄 Exportar resultados (PDF/CSV)

## 📄 Licencia

Este proyecto está bajo la licencia **MIT**. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autores

- **NucleoServices** - *Desarrollo inicial* - [@draganel](https://github.com/draganel)

## 📞 Soporte

¿Encontraste un bug? ¿Tienes una sugerencia?

- 🐛 **Issues**: [GitHub Issues](https://github.com/username/snatchgame/issues)
- 💬 **Discusiones**: [GitHub Discussions](https://github.com/username/snatchgame/discussions)
- 📧 **Email**: support@nucleoservices.com

---

<div align="center">

**⭐ ¡Dale una estrella si te gusta el proyecto! ⭐**

Hecho con ❤️ por **NucleoServices**

</div>