# Snatch Game - Competitive Clicker

A real-time multiplayer competitive clicker game built with Colyseus.js and Vue 3.

## Features

- 🎮 Real-time multiplayer gameplay
- 🏆 10-minute competitive clicking battles
- 👥 2 players per room with automatic matchmaking
- 🎯 Unique player naming system with auto-increment
- 🎛️ Admin dashboard for game management
- 📊 Real-time statistics and monitoring
- 🔄 Automatic reconnection support
- ⏸️ Pause/Resume/Restart game controls

## Tech Stack

- **Backend**: Colyseus.js, Express, TypeScript
- **Frontend**: Vue 3, Vite, TypeScript
- **Real-time**: WebSockets
- **Styling**: Custom CSS

## System Architecture

### How It Works

The game uses a client-server architecture with WebSocket connections for real-time communication:

#### 1. **Connection Flow**
```
Player → Lobby Room → Game Room → Game Session
```

1. **Initial Connection**: When a player opens the app, they automatically join the `LobbyRoom`
2. **Name Assignment**: Players receive a unique name (guest, guest-2, etc.) with auto-increment per unique base name
3. **Matchmaking**: Players click "Quick Play" to find or create a game room
4. **Room Transition**: Players leave the lobby and join a `GameRoom` (max 2 players)
5. **Game Start**: When 2 players are in a room, the game automatically starts

#### 2. **Room Management**

**LobbyRoom**:
- Single shared room for all waiting players
- Manages unique player names
- Handles matchmaking requests
- Shows available game rooms
- Tracks which players are in games

**GameRoom**:
- Individual rooms with exactly 2 players maximum
- Manages game state (waiting, playing, paused, finished)
- 10-minute countdown timer
- Click counting and winner determination
- Auto-restart after game ends

#### 3. **State Synchronization**

The game uses Colyseus Schema for state management:

```typescript
GameState {
  players: Map<Player>    // Connected players
  gameStatus: string       // waiting|playing|paused|finished
  timeRemaining: number    // Seconds left in game
  winner: string          // Winner's name
}

Player {
  sessionId: string
  name: string
  clicks: number
  connected: boolean
}
```

**State Updates**:
- Server authoritative - only server can modify state
- Automatic synchronization to all clients
- Delta compression - only changes are sent
- 60Hz update rate for real-time feel

#### 4. **Communication Protocol**

**Client → Server Messages**:
- `setName`: Change player name in lobby
- `quickPlay`: Request matchmaking
- `click`: Register a click in game
- `joinRoom`: Join specific room

**Server → Client Messages**:
- `gameJoined`: Room ID to join
- `playerInfo`: Player's session info
- `gameStart`: Game has started
- `gameEnd`: Game finished with results
- `gamePaused`: Game paused
- `gameRestart`: Game restarting

**State Callbacks**:
- `onAdd`: Player joined
- `onRemove`: Player left
- `onChange`: Property changed
- `listen`: Specific field updates

#### 5. **Name Management System**

```
Base: "jose"
- First jose → "jose"
- Second jose → "jose-2"
- Third jose → "jose-3"

Base: "maria"
- First maria → "maria"
- Second maria → "maria-2"
```

- Names are managed by a singleton NameManager
- Each unique base name has its own counter
- Names are released when players disconnect
- Names persist when moving between rooms

#### 6. **Game Flow Sequence**

1. **Lobby Phase**:
   ```
   Connect → Assign Name → Show Online Players → Wait for Action
   ```

2. **Matchmaking**:
   ```
   Quick Play → Find Available Room → No Room? Create New → Join Room
   ```

3. **Waiting Phase**:
   ```
   Join Room → Show "Waiting for opponent" → Display Players (1/2)
   ```

4. **Game Phase**:
   ```
   2 Players Connected → Start Timer → Enable Clicking → Count Clicks
   ```

5. **End Phase**:
   ```
   Timer Reaches 0 → Determine Winner → Show Results → Auto-restart in 5s
   ```

#### 7. **Reconnection Handling**

- 30-second grace period for disconnected players
- Game pauses if a player disconnects during play
- Game resumes when player reconnects
- Maintains click count and game state

#### 8. **Admin Dashboard**

The dashboard connects via HTTP REST API and WebSocket monitoring:

**REST Endpoints** (Port 3000):
- `GET /api/rooms` - List all active rooms
- `GET /api/rooms/:id/stats` - Get room statistics
- `POST /api/rooms/:id/pause` - Pause a game
- `POST /api/rooms/:id/restart` - Restart a game
- `POST /api/rooms/:id/kick/:playerId` - Kick a player

**Real-time Monitoring**:
- Total CCU (Concurrent Users)
- Active rooms and their status
- Player statistics per room
- Live game state updates

## Installation

```bash
# Install all dependencies
npm run install:all
```

## Development

```bash
# Start both server and client in development mode
npm run dev
```

This will start:
- Server on http://localhost:3000
- Client on http://localhost:5173

### Environment Variables (Client)

Create `client/.env` (or copy `client/.env.example`) to configure endpoints:

```
VITE_WS_URL=ws://localhost:3000
VITE_API_URL=http://localhost:3000/api
```

For production over HTTPS, use `wss://` for `VITE_WS_URL` and an HTTPS API base for `VITE_API_URL`.

## URLs

- **Game**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5173/dashboard
- **Colyseus Monitor**: http://localhost:3000/colyseus
- **API Endpoints**: http://localhost:3000/api

## Project Structure

```
snatchgame/
├── server/                 # Backend Colyseus server
│   ├── src/
│   │   ├── rooms/         # Game and Lobby rooms
│   │   ├── schemas/       # State schemas
│   │   ├── utils/         # Utilities (name manager)
│   │   ├── adminApi.ts    # Admin REST API
│   │   └── index.ts       # Server entry point
│   └── package.json
│
├── client/                 # Frontend Vue application
│   ├── src/
│   │   ├── views/         # Vue components (Lobby, Game, Dashboard)
│   │   ├── services/      # Colyseus client service
│   │   ├── router/        # Vue Router
│   │   └── main.ts        # App entry point
│   └── package.json
│
└── shared/                 # Shared types between client and server
    └── types.ts
```

## Game Rules

1. Players enter the lobby and choose a username
2. Click "Quick Play" to join or create a game room
3. Game starts when 2 players join a room
4. Players have 10 minutes to click as fast as possible
5. The player with the most clicks wins
6. Games automatically restart after finishing

## Admin Dashboard

The admin dashboard provides:
- View all active rooms and their status
- Pause/Resume games in progress
- Restart games
- Kick players from rooms
- View real-time statistics
- Monitor server performance

## API Endpoints

- `GET /api/rooms` - List all active rooms
- `GET /api/rooms/:roomId/stats` - Get room statistics
- `POST /api/rooms/:roomId/pause` - Pause a game
- `POST /api/rooms/:roomId/resume` - Resume a game
- `POST /api/rooms/:roomId/restart` - Restart a game
- `POST /api/rooms/:roomId/kick/:playerId` - Kick a player
- `GET /api/stats` - Get global server statistics
