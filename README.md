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