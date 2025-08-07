# Colyseus: Guía de Integración para Snatchgame

Esta guía resume las APIs de Colyseus necesarias para: un lobby unificado, salas de juego (máx. 2 jugadores) y un dashboard para inspección/acciones por sala y globales.

## Conceptos Clave
- Rooms: unidades de ejecución con ciclo de vida (`onCreate`, `onJoin`, `onLeave`, `onDispose`).
- Schema: sincroniza estado autoritativo del servidor a clientes con `@type`.
- Mensajería: `room.onMessage(type, handler)`, `client.send(type, payload)`, `room.broadcast(type, payload)`.
- Matchmaker: descubrimiento/control de salas (`matchMaker.query`, `remoteRoomCall`, `stats`).
- Monitor: panel listo para usar en Express (`@colyseus/monitor`).

## Lobby Unificado
- Definir una sala pública única `lobby` que gestione nombres, matchmaking y listado.
- API útil: `gameServer.define("lobby", LobbyRoom)`, `setPrivate(false)`, `enableRealtimeListing()` en salas de juego para listar.
- Mensajes recomendados: `setName`, `quickPlay`, `joinRoom`.

Ejemplo (server/src/rooms/LobbyRoom.ts):
```ts
export class LobbyRoom extends Room<LobbyState> {
  onCreate() {
    this.setState(new LobbyState());
    this.onMessage("setName", (client, name) => {/* validar + asignar */});
    this.onMessage("quickPlay", async (client) => {
      // Crear o elegir una sala "game" con cupo
      const rooms = await matchMaker.query({ name: "game", locked: false });
      const target = rooms.find(r => r.clients < r.maxClients) ||
                     await matchMaker.createRoom("game", { maxClients: 2 });
      client.send("gameJoined", { roomId: target.roomId || target.roomId });
    });
  }
}
```

## Game Rooms (2 jugadores)
- Definición: `gameServer.define("game", GameRoom).filterBy(["maxClients"]).enableRealtimeListing()`.
- Capacidad: `maxClients = 2;` en la clase de la sala.
- Re-conexión: `await this.allowReconnection(client, 30);` para tolerancia a fallos.
- Ticks: usar `this.setSimulationInterval((deltaTime) => { /* actualizar timer */ }, 1000);`.

Ejemplo (server/src/rooms/GameRoom.ts):
```ts
export class GameRoom extends Room<GameState> {
  maxClients = 2;
  onCreate() {
    this.setState(new GameState());
    this.onMessage("click", (client) => {/* sumar clicks si PLAYING */});
  }
  onJoin(client, { playerName }) {
    this.state.addPlayer(client.sessionId, playerName);
    if (this.state.players.size === 2) this.state.startGame();
  }
  onLeave(client) {
    this.state.players.get(client.sessionId)!.connected = false;
    this.allowReconnection(client, 30);
  }
}
```

## Estado Autoritativo (Schema)
- Definir modelos con `@type` y colecciones `MapSchema`/`ArraySchema`.
- Patrón: solo el servidor muta estado; clientes envían mensajes de intención.

Ejemplo:
```ts
export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") gameStatus: GameStatus = GameStatus.WAITING;
  @type("number") timeRemaining = 600;
}
```

## Dashboard y Control Administrativo
- Monitor integrado: `app.use("/colyseus", monitor());` para ver salas/CCU.
- REST/Admin personalizado vía `matchMaker`:
  - Listar: `await matchMaker.query({ name: "game" });`
  - Llamar métodos remotos: `await matchMaker.remoteRoomCall(roomId, "getState");`
  - Acciones por sala: `await matchMaker.remoteRoomCall(roomId, "broadcast", ["admin:pause"]);`

Ejemplos (server/src/adminApi.ts):
```ts
router.get("/rooms", async (_, res) => {
  const rooms = await matchMaker.query({});
  res.json(rooms);
});
router.post("/rooms/:roomId/restart", async (req, res) => {
  await matchMaker.remoteRoomCall(req.params.roomId, "broadcast", ["admin:restart"]);
  res.json({ success: true });
});
```

Acciones globales (todas las salas "game"):
```ts
const rooms = await matchMaker.query({ name: "game" });
await Promise.all(rooms.map(r => matchMaker.remoteRoomCall(r.roomId, "broadcast", ["admin:pause"])));
```

## Buenas Prácticas
- Validar inputs en `onMessage` y nunca confiar en el cliente.
- Usar `metadata`/`filterBy` para matchmaking por atributos.
- Mantener `maxClients` y reglas de inicio/pausa dentro del servidor.
- Exponer solo métodos necesarios para `remoteRoomCall` (p. ej., `getState`).

Referencias: documentación oficial Colyseus (Rooms, Schema, Matchmaker, Monitor).

## Configuración de WebSocket (Cliente)
- Variable de entorno en Vite: `VITE_WS_URL`.
- Si no se define, el cliente usa `ws(s)://<hostname>:3000` según el protocolo actual.
- Ejemplos:
  - Desarrollo local: `VITE_WS_URL=ws://localhost:3000`
  - Producción (TLS): `VITE_WS_URL=wss://api.midominio.com`

## Configuración de REST API (Cliente)
- Variable de entorno en Vite: `VITE_API_URL` con la base completa del API (incluye `/api`).
- Si no se define, el cliente usa `http(s)://<hostname>:3000/api` según el protocolo actual.
- Ejemplos:
  - Desarrollo local: `VITE_API_URL=http://localhost:3000/api`
  - Producción (TLS): `VITE_API_URL=https://api.midominio.com/api`
