# 🎮 SnatchGame

[![Version](https://img.shields.io/badge/version-0.0.1--alpha-orange.svg)](https://github.com/username/snatchgame)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![Vue.js](https://img.shields.io/badge/vue-3.0+-brightgreen.svg)](https://vuejs.org/)
[![Colyseus](https://img.shields.io/badge/colyseus-0.16+-purple.svg)](https://colyseus.io/)

Un juego multijugador en tiempo real de velocidad de clicks, construido con **Colyseus.io** y **Vue 3** para redes locales.

> ⚠️ **Proyecto en desarrollo** - Actualmente en fase Alpha (v0.0.1-alpha)

## 🚀 Características

- **🌐 Multijugador en tiempo real** - Hasta 8 jugadores simultáneos
- **⚡ Sincronización instantánea** - Estado compartido con Colyseus.io
- **🔥 Juego de velocidad** - Compite presionando el botón más rápido
- **📱 Responsive** - Funciona en desktop y móvil
- **🛠️ Sistema de debugging** - Logs configurables para desarrollo
- **🎯 Red local** - Sin dependencias de internet
- **📊 UI de administración** - Panel para monitorear partidas

## 🎯 Cómo Jugar

1. **Únete a una partida** - Presiona "Unirse a partida"
2. **Espera jugadores** - Mínimo 2 jugadores para comenzar
3. **¡Click Battle!** - Presiona el botón gigante lo más rápido posible
4. **Compite** - Ve el scoreboard en tiempo real

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
# Servidor
cd server
npm install

# Cliente
cd ../client
npm install

# Admin (opcional)
cd ../admin
npm install
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

# Terminal 3 - Admin (opcional)
cd admin
npm run dev
```

### URLs de desarrollo
- **Cliente**: http://localhost:3000
- **Servidor**: http://localhost:2567
- **Admin**: http://localhost:3001

### Producción
```bash
# Build
npm run build

# Deploy con Docker
docker-compose up -d
```

## 🎮 Demo

### Pantalla Principal
![Home Screen](docs/images/home-screen.png)

### Esperando Jugadores
![Waiting Screen](docs/images/waiting-screen.png)

### Jugando
![Game Screen](docs/images/game-screen.png)

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
VITE_SERVER_URL=wss://your-domain.com
NODE_ENV=production
PORT=2567
```

### Configuración de Logs
- **Desarrollo**: Logs habilitados por defecto
- **Producción**: Logs deshabilitados por defecto
- **Usuario**: Configurable en "Configuración" → "Logs de depuración"

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client UI     │    │  Colyseus       │    │   Admin UI      │
│   (Vue 3)       │◄──►│   Server        │◄──►│   (Vue 3)       │
│   Port 3000     │    │   Port 2567     │    │   Port 3001     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Docker +       │
                    │  Nginx Proxy    │
                    └─────────────────┘
```

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
├── 📁 server/          # Colyseus.io backend
│   ├── src/
│   │   ├── rooms/      # Game rooms
│   │   ├── schema/     # Data schemas
│   │   └── index.ts    # Entry point
│   └── package.json
├── 📁 client/          # Vue 3 frontend
│   ├── src/
│   │   ├── components/ # Vue components
│   │   ├── services/   # Game client & logger
│   │   ├── types/      # Auto-generated types
│   │   └── main.ts
│   └── package.json
├── 📁 admin/           # Admin dashboard
├── 📁 docs/            # Documentation
├── 🐳 docker-compose.yml
├── 📋 CLAUDE.md        # Development guide
└── 📖 README.md        # This file
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

- [ ] 🎨 Themes y customización
- [ ] 🏆 Sistema de logros
- [ ] 📊 Estadísticas detalladas
- [ ] 🔊 Efectos de sonido
- [ ] 📱 PWA support
- [ ] 🌍 Multi-idioma
- [ ] 🔒 Sistema de autenticación

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