# TODO - SnatchGame

## Problemas Técnicos Pendientes

### TypeScript - Tipos en Game.vue
**Problema:** Se tuvo que usar `any` en Game.vue para el prop `gameClient` debido a incompatibilidades de tipos entre Vue y la clase GameClient.

**Archivo afectado:** `client/src/components/Game.vue`
```typescript
const props = defineProps<{
  gameClient: any  // TEMPORAL - debería ser GameClient
}>()
```

**Causa:** Vue está infiriendo mal el tipo de GameClient cuando se pasa como prop/emit, causando errores como:
```
Type 'GameClient' is missing the following properties from type 'GameClient': client, room
```

**Solución pendiente:** 
- Investigar la causa raíz del problema de inferencia de tipos
- Posiblemente usar una interface en lugar de clase
- O definir tipos de props más explícitos

**Prioridad:** Media (funciona pero no es tipo-seguro)

### Admin API - Métodos pauseGame y resumeGame
**Problema:** Los endpoints `/api/admin/pause-game` y `/api/admin/resume-game` usan `matchMaker.remoteRoomCall` para llamar métodos que no existen en GameRoom.

**Archivos afectados:** 
- `server/src/app.config.ts` - Endpoints que llaman a `pauseGame` y `resumeGame`
- `server/src/rooms/GameRoom.ts` - Falta implementar los métodos

**Solución pendiente:**
- Implementar método `pauseGame()` en GameRoom.ts
- Implementar método `resumeGame()` en GameRoom.ts  
- Los métodos deben modificar `gamePhase` en el estado del juego
- Agregar logs apropiados para debugging

**Prioridad:** Alta (endpoints fallarán hasta que se implemente)