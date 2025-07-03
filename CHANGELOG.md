# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planeado
- Sistema de logros
- Efectos de sonido
- PWA support
- Multi-idioma
- Sistema de autenticación

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