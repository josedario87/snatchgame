# Snatch or Share: A Game of Governance

**App-Based Multiplayer Game Inspired by Elinor Ostrom**

## Overview

Snatch or Share is a mobile-based multiplayer game that lets participants experience how rules, trust, and institutional arrangements affect cooperation in decentralized exchanges. Based on Elinor Ostrom's "Snatch Game" (from *Understanding Institutional Diversity*), it's designed for workshops to simulate the evolution of governance in public goods settings — like those needed for EUDR compliance.

## Participants and Grouping

- Players sign in with their real names
- The system randomly assigns players into 2-person groups (Group 1 to Group N)
- Each group plays through five rounds of structured interaction
- A shared plenary dashboard shows all groups in parallel for debriefing

## What Are Tokens and Points?

### Tokens = Tradable Goods

Each player starts with **10 tokens** of a specific good:
- Either **Turkeys** or **Ears of Corn**

Tokens represent units of what the player produces (e.g. a household with 10 turkeys)

### Points = Value of What You Hold

Each player values goods differently:
- Their own tokens = **1 point each**
- The other player's tokens = **2 points each**

So:
| Scenario | Points |
|----------|--------|
| Holding 10 of your own | 10 points |
| Holding 5 of own + 5 of other | 15 points |
| Holding 10 of own + 5 snatched | 20 points |

> **Tokens** are used in gameplay (offered, accepted, snatched).
> **Points** are calculated after each round based on the player's inventory.
> The goal is to **maximize point value** through strategic decisions.

## Game Progression (5 Variants)

### G1: State of Nature
- All players are Traders. No enforcement or roles
- Player 1 (P1) is prompted to offer a trade
- Player 2 (P2) responds:
  - **Accept** → both exchange tokens → each ends with ~15 points
  - **Refuse** → no trade → each stays at 10 points
  - **Snatch** → snatcher takes offer without paying → 20 points; offerer left with 5

> No trust = no cooperation = suboptimal outcomes

### G2: Counterproductive Rule
- New rule: *"P2 can force P1 to make an offer"*
- Players still have freedom to snatch
- Reduces agency, invites exploitation

### G3: Soft Norms (Shame Tokens)
- P1 can assign **1 shame token** after being snatched
- Shame tokens accumulate across games
- Social deterrents emerge, but without enforcement may be inconsistently applied

### G4: Minimal Property Rights
- P1 can **report** a snatch to the system
- If confirmed:
  - Goods are returned to P1
  - P1 also receives what was requested (compensation)

> Governance stabilizes expectations → trust emerges

### G5: Cheap Talk
- P1 can send a **pre-round message** to P2 before making an offer
- Tests whether communication alone improves cooperation

## System Diagrams

The game logic is documented in Mermaid diagrams:

| Diagram | Description |
|---------|-------------|
| [`game-overview.mmd`](game-overview.mmd) | High-level game flow |
| [`game-sequence.mmd`](game-sequence.mmd) | Detailed sequence diagram |
| [`game-state-machine.mmd`](game-state-machine.mmd) | State transitions |
| [`data-model.mmd`](data-model.mmd) | Data structures |
| [`g1-no-property.mmd`](g1-no-property.mmd) | G1 variant flow |
| [`g2-counterproductive-rule.mmd`](g2-counterproductive-rule.mmd) | G2 variant flow |
| [`g3-shame-token.mmd`](g3-shame-token.mmd) | G3 variant flow |
| [`g4-min-property-rights.mmd`](g4-min-property-rights.mmd) | G4 variant flow |
| [`g5-cheap-talk.mmd`](g5-cheap-talk.mmd) | G5 variant flow |
| [`matchmaking.mmd`](matchmaking.mmd) | Matchmaking logic |
| [`tournament-orchestration.mmd`](tournament-orchestration.mmd) | Tournament flow |

## System Capabilities

### Real-Time Multiplayer
- WebSocket-based communication using **Colyseus.js**
- Server-authoritative state management
- Automatic reconnection with session persistence
- 60Hz update rate for real-time feel

### Player Management
- UUID-based player identification
- Persistent player names and colors
- Shame token tracking across sessions
- Automatic matchmaking into game rooms

### Game Control (Admin Dashboard)
- **Room Management**: Create, pause, resume, restart games
- **Player Control**: Kick players, view stats per room
- **Global Controls**:
  - Pause/resume all games simultaneously
  - Change game variant (G1-G5) globally
  - Shuffle players between rooms
  - Send all players to lobby
- **Real-time Monitoring**: CCU, room status, player actions

### Data & Analytics
- Server-Sent Events (SSE) for live dashboard updates
- Export/import game state (`.snatchSave` format)
- Event logging with filtering capabilities
- Leaderboard with score calculations

### Deployment
- Docker containerized deployment
- Nginx reverse proxy support
- SSL/TLS integration

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Colyseus.js, Express, TypeScript |
| **Frontend** | Vue 3, Vite, TypeScript |
| **Real-time** | WebSockets (uWebSockets) |
| **State** | Colyseus Schema (delta compression) |
| **Deployment** | Docker, Nginx |

## Project Structure

```
snatchgame/
├── server/                 # Backend Colyseus server
│   ├── src/
│   │   ├── rooms/          # Game and Lobby rooms
│   │   ├── schemas/        # State schemas
│   │   ├── utils/          # Utilities (name manager)
│   │   ├── adminApi.ts     # Admin REST API
│   │   └── index.ts        # Server entry point
│   └── package.json
│
├── client/                 # Frontend Vue application
│   ├── src/
│   │   ├── views/          # Vue components
│   │   ├── services/       # Colyseus client service
│   │   ├── router/         # Vue Router
│   │   └── main.ts         # App entry point
│   └── package.json
│
├── deploy/                 # Deployment configurations
│   ├── Dockerfile          # Docker image build
│   ├── dockerignore        # Files to ignore in build
│   └── start.sh            # Container startup script
│
├── *.mmd                   # Mermaid diagrams
└── shared/                 # Shared types
```

## Quick Start

```bash
# Install dependencies
npm run install:all

# Start development (server + client)
npm run dev
```

### URLs (Development)
- **Game**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5173/dashboard
- **Colyseus Monitor**: http://localhost:3000/colyseus
- **API**: http://localhost:3000/api

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/rooms` | List all active rooms |
| `GET /api/rooms/:id/stats` | Room statistics |
| `POST /api/rooms/:id/pause` | Pause a game |
| `POST /api/rooms/:id/resume` | Resume a game |
| `POST /api/rooms/:id/restart` | Restart a game |
| `POST /api/admin/pause-all` | Pause all games |
| `POST /api/admin/shuffle-players` | Redistribute players |
| `GET /api/admin/namemanager/export` | Export state |
| `GET /api/dashboard-stream` | SSE dashboard updates |

## Acknowledgments

This project was commissioned by the **Alliance of Bioversity International and CIAT** (CGIAR) for educational workshops on governance and cooperation.

**Project Sponsors:**
- Federico Ceballos - Alliance Bioversity-CIAT
- Brian King - Alliance Bioversity-CIAT

**Developer:**
- José Darío - [Nucleo Rio Frio](https://github.com/josedario87)

Based on Elinor Ostrom's "Snatch Game" from *Understanding Institutional Diversity*.

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

*Developed by José Darío for educational workshops on governance and cooperation.*
