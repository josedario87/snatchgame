# 🎮 Snatch or Share - Cliente

Cliente web para el juego multijugador Snatch or Share, basado en el trabajo de Elinor Ostrom sobre instituciones y cooperación.

## 🛠️ Stack Tecnológico

- **Vue 3** (Composition API, vanilla sin build tools)
- **TypeScript** (tipado estricto)
- **Vite** (development server)
- **Colyseus.js** (cliente WebSocket)
- **Express** (servidor estático en producción)

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- npm 9+
- Servidor Snatch or Share ejecutándose (puerto 2567)

### Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Generar tipos TypeScript desde el servidor
npm run generate-types

# Iniciar servidor de desarrollo (puerto 3000)
npm run dev
```

### Comandos Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo con hot reload
npm run generate-types   # Generar tipos desde servidor Colyseus

# Producción
npm run build           # Compilar proyecto para producción
npm run preview         # Vista previa del build
npm run start           # Servidor Express en producción

# Utilidades
npm run serve           # Servidor Express con nodemon
```

## 🏗️ Arquitectura del Cliente

### Estructura de Directorios

```
client/
├── src/
│   ├── components/          # Componentes Vue
│   │   ├── Game.vue        # Componente principal del juego
│   │   ├── PlayerCard.vue  # Tarjeta de jugador
│   │   ├── TradeOfferCard.vue # Tarjeta de oferta comercial
│   │   ├── MakeOfferForm.vue  # Formulario para ofertas
│   │   ├── ScrollableOffers.vue # Contenedor de ofertas con scroll
│   │   └── OfferModal.vue  # Modal para hacer ofertas
│   ├── services/           # Servicios y lógica de negocio
│   │   ├── gameClient.ts   # Cliente Colyseus
│   │   └── logger.ts       # Sistema de logging
│   ├── types/              # Tipos TypeScript
│   │   ├── GameState.ts    # (Auto-generado)
│   │   ├── Player.ts       # (Auto-generado)
│   │   ├── TradeOffer.ts   # (Auto-generado)
│   │   ├── TokenInventory.ts # (Auto-generado)
│   │   └── index.ts        # Tipos auxiliares
│   ├── App.vue            # Componente raíz
│   └── main.ts            # Punto de entrada
├── index.html             # Template HTML
├── server.js              # Servidor Express (producción)
└── vite.config.ts         # Configuración Vite
```

### Componentes Principales

#### Game.vue
Componente principal que maneja:
- Layout responsivo (desktop/móvil)
- Estado del juego en tiempo real
- Coordinación entre componentes hijos

#### PlayerCard.vue
Tarjeta de jugador con:
- Modo compacto para otros jugadores
- Modo expandido para jugador actual
- Click para hacer ofertas

#### TradeOfferCard.vue
Muestra ofertas comerciales:
- Información de tokens ofrecidos/solicitados
- Botones de acción (Aceptar/Rechazar/Snatch)
- Estados visuales según tipo de oferta

#### MakeOfferForm.vue
Formulario optimizado con:
- Botones +/- prominentes
- Input compacto para números
- Validación en tiempo real

## 🔄 Generación de Tipos

El cliente utiliza tipos auto-generados desde el servidor Colyseus:

```bash
# Generar tipos automáticamente
npm run generate-types

# Comando manual equivalente
cd ../server && npx schema-codegen src/rooms/GameRoom.ts --ts --output ../client/src/types/
```

**Tipos Auto-generados:**
- `GameState.ts` - Estado principal del juego
- `Player.ts` - Información del jugador
- `TradeOffer.ts` - Ofertas comerciales
- `TokenInventory.ts` - Inventario de tokens

**Tipos Manuales:**
- `GameRoomOptions` - Opciones de sala
- Interfaces auxiliares en `index.ts`

## 🎯 Funcionalidades del Cliente

### Layout Responsivo

**Desktop:**
- Layout de 2 columnas (jugadores | ofertas)
- Jugador actual prominente abajo
- Panel de ofertas con scroll customizado

**Móvil:**
- Layout vertical adaptativo
- Cards de jugadores compactas
- Ofertas optimizadas horizontalmente

### Interacciones

- **Click en PlayerCard** → Abre modal de oferta
- **Botones +/-** → Incrementar/decrementar tokens
- **Formulario modal** → Crear ofertas dirigidas
- **Scroll customizado** → Navegación suave de ofertas

### Estado en Tiempo Real

- Conexión WebSocket con Colyseus
- Sincronización automática de estado
- Reactivity de Vue 3 con estado del servidor

## 🔧 Configuración

### Variables de Entorno

```env
# Desarrollo (.env.development)
VITE_SERVER_URL=ws://localhost:2567

# Producción (.env.production)  
VITE_SERVER_URL=ws://tu-servidor-produccion:2567
```

### Configuración del Servidor

El cliente incluye un servidor Express para producción:

```javascript
// server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
```

## 🔍 Debugging

### Logger del Cliente

```typescript
import { logger } from '@/services/logger'

// Logs automáticos del estado del juego
logger.gameStateChange(state)
logger.gameComponentUpdate(updates)
logger.clickSent()
```

### DevTools

- Vue DevTools para componentes
- Network tab para conexiones WebSocket
- Console para logs del gameClient

## 📱 Compatibilidad

- **Navegadores**: Chrome 90+, Firefox 88+, Safari 14+
- **Dispositivos**: Desktop, tablet, móvil
- **Resoluciones**: 320px - 1920px+

## 🎮 Uso del Cliente

1. **Espera**: Pantalla de espera hasta 3 jugadores
2. **Asignación**: Roles de productor asignados aleatoriamente
3. **Trading**: Interfaz de intercambio con ofertas
4. **Ofertas**: Click en jugadores para hacer ofertas
5. **Respuestas**: Aceptar, rechazar o hacer "snatch"

## 🚀 Despliegue

### Desarrollo
```bash
npm run dev
# Cliente disponible en http://localhost:3000
```

### Producción
```bash
npm run build
npm run start
# Servidor Express sirviendo build estático
```

### Docker (desde raíz del proyecto)
```bash
docker-compose up client
```

## 🤝 Contribución

Ver [CLAUDE.md](../CLAUDE.md) para guías de desarrollo y convenciones del proyecto.