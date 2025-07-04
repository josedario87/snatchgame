# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planeado
- Ronda 2-5: Implementar reglas evolutivas
- Sistema de Judge rotativo
- Shame tokens y penalizaciones
- Efectos de sonido
- PWA support
- Multi-idioma

## [0.0.8-alpha] - 2025-07-04

### Added
- **Admin Dashboard Completo**: UI de administración con información detallada de jugadores
- **Control de Jugadores**: Expulsar jugadores individuales y todos los jugadores
- **Control de Rondas Global**: Avanzar y retroceder rondas en todas las salas simultáneamente
- **Control de Juego**: Pausar y reanudar juegos desde el admin
- **Notificaciones a Clientes**: Los jugadores reciben notificaciones cuando son expulsados o cuando cambian las rondas
- **Información Detallada de Jugadores**: Nombre, sala, rol, tipo de productor y tokens actuales
- **Redirección Automática**: Los clientes expulsados vuelven automáticamente al home

### Changed
- **API Oficial de Colyseus**: Refactorizado todos los endpoints admin para usar `matchMaker.query()` y `matchMaker.remoteRoomCall()`
- **Arquitectura sin Variables Globales**: Eliminado el hack de variables globales por implementación oficial
- **UI Admin Mejorada**: Información más clara y organizada para comentaristas no-técnicos

### Fixed
- **Notificación de Expulsión**: Los clientes ahora reciben notificación correcta cuando son expulsados
- **URLs del Admin Service**: Corregido para llamar al servidor Colyseus (puerto 2567) en lugar del admin (puerto 3001)
- **Expulsión Masiva**: Todos los jugadores reciben notificación apropiada cuando se expulsan todos

### Technical
- **GameRoom Methods**: Implementado `pauseGame()`, `resumeGame()`, `advanceRound()`, `previousRound()`, `_forceClientDisconnect()`, `_forceDisconnectAllClients()`, `getInspectData()`
- **Client Notifications**: Manejo de mensajes `adminKicked`, `gamePaused`, `gameResumed`, `roundChanged`
- **Type Safety**: Mantenida sincronización de tipos TypeScript entre servidor y clientes

## [0.0.5-alpha] - 2025-01-04

### Añadido
- **🎮 Juego Snatch or Share completo**
  - Implementación del "Snatch Game" de Elinor Ostrom
  - Sistema de roles únicos: Productor de Pavos, Café, Maíz
  - Exactamente 3 jugadores por sala
  - Tokens múltiples (turkey, coffee, corn)
  - Sistema de puntuación: tokens propios = 1pt, ajenos = 2pts

- **🔄 Sistema de ofertas comerciales**
  - Ofertas simultáneas entre jugadores
  - Límite de 2 ofertas por target por jugador
  - Respuestas: Accept, Reject, Snatch
  - Cumplimiento parcial automático
  - Todas las ofertas son públicas

- **🎨 UI/UX completamente rediseñada**
  - Layout responsivo optimizado (desktop/móvil)
  - Componentes modulares: PlayerCard, TradeOfferCard, MakeOfferForm
  - Modal flotante para crear ofertas
  - Scroll customizado para lista de ofertas
  - Botones +/- prominentes para cantidades
  - Input compacto optimizado para números de 3 dígitos

- **📱 Mejoras móviles**
  - Layout vertical adaptativo
  - Cards de ofertas horizontales y compactas
  - Botones táctiles optimizados
  - Altura diferencial desktop vs móvil

### Changed
- **🏗️ Arquitectura del servidor**
  - GameState con múltiples tipos de tokens
  - Player con rol de productor y tokens individuales
  - TradeOffer con inventarios de offering/requesting
  - Asignación automática de roles únicos

- **⚙️ Sistema de tipos**
  - Regeneración automática desde servidor
  - TokenInventory schema separado
  - Interfaces para ofertas comerciales
  - GameRoomOptions actualizado

- **🎯 Lógica del juego**
  - Ronda 1: Estado de naturaleza implementado
  - Ofertas más recientes aparecen arriba
  - Validación de límites por jugador
  - Cálculo automático de puntos en tiempo real

### Fixed
- **🐛 Problemas de layout**
  - Overflow vertical en desktop eliminado
  - Altura móvil permite scroll natural
  - Posicionamiento de elementos mejorado

- **⚡ Rendimiento**
  - Componentización reduce bundle size
  - CSS encapsulado por componente
  - Reactivity optimizada con computed properties

- **📚 Documentación completa**
  - README.md principal actualizado con enfoque educativo
  - README.md específico del servidor con API y schemas
  - README.md específico del cliente con componentes
  - gameRules.md con lógica detallada del juego
  - Roadmap actualizado con progreso real

### Technical
- **📊 Schemas Colyseus**: GameState, Player, TradeOffer, TokenInventory
- **🧩 Componentes Vue**: 6 componentes modulares especializados
- **📋 Validación**: Límites de tokens, ofertas y jugadores
- **🔄 Estado**: Sincronización en tiempo real mejorada
- **🛠️ Build**: Generación automática de tipos client/server

## [0.0.1-alpha] - 2025-01-03

### Añadido
- **Funcionalidad core del juego**
  - Juego multijugador de click battle en tiempo real
  - Soporte para hasta 8 jugadores simultáneos
  - Scoreboard en tiempo real
  - Auto-inicio cuando hay 2+ jugadores
  - Auto-pausa cuando <2 jugadores

- **Arquitectura técnica**
  - Servidor Colyseus.io con TypeScript
  - Cliente Vue 3 con Composition API
  - Sincronización automática de tipos con schema-codegen
  - Sistema de logging configurable
  - Variables de entorno por ambiente

- **UI/UX**
  - Pantalla de home con branding
  - Pantalla de espera con contador de jugadores
  - Pantalla de juego con botón animado
  - Modal de configuración
  - Diseño responsive

- **Desarrollo**
  - VSCode tasks para desarrollo
  - Hot reload en desarrollo
  - TypeScript estricto en todo el proyecto
  - Sistema de tipos compartidos
  - Docker setup para producción

- **Documentación**
  - README.md completo
  - CLAUDE.md para desarrollo interno
  - .gitignore comprehensivo
  - Estructura de proyecto documentada

### Características técnicas
- **Backend**: Colyseus.io 0.16+, Node.js 18+, TypeScript, Express
- **Frontend**: Vue 3, TypeScript, Vite, CSS vanilla
- **Desarrollo**: Schema-codegen, ESLint, Hot reload
- **Deploy**: Docker, docker-compose, Nginx proxy

### Estado actual
- ✅ Funcionalidad básica del juego completamente funcional
- ✅ Multijugador en tiempo real working
- ✅ UI responsive y animada
- ✅ Sistema de logging configurable
- ✅ Documentación completa
- ⚠️ En desarrollo activo - versión Alpha

---

## Formato de versiones

- **Major.Minor.Patch-PreRelease**
- **Alpha**: Desarrollo inicial, funcionalidad básica
- **Beta**: Características completas, testing intensivo
- **RC**: Release Candidate, listo para producción
- **Stable**: Versión estable para uso general

### Tipos de cambios
- `Added` para nuevas características
- `Changed` para cambios en funcionalidad existente
- `Deprecated` para características que serán removidas
- `Removed` para características removidas
- `Fixed` para bug fixes
- `Security` para fixes de vulnerabilidades