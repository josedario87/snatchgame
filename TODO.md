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

