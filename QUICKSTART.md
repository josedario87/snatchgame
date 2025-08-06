# Quick Start Guide

## 🚀 Running the Project

The project is now ready to run! Both server and client are configured and running.

### Current Status:
- ✅ **Server**: Running on http://localhost:3000
- ✅ **Client**: Running on http://localhost:5173
- ✅ **WebSocket**: ws://localhost:3000
- ✅ **Admin Monitor**: http://localhost:3000/colyseus
- ✅ **Admin Dashboard**: http://localhost:5173/dashboard

## 📝 How to Use

### For Players:
1. Open http://localhost:5173 in your browser
2. Enter your desired username
3. Click "Quick Play" to join a game
4. Click as fast as you can when the game starts!
5. Games last 10 minutes, winner is the one with most clicks

### For Admins:
1. Open http://localhost:5173/dashboard to access the admin panel
2. Monitor all active games and players
3. Control games: pause, resume, restart, or kick players
4. View real-time statistics

## 🛠️ Development Commands

If you need to restart the services:

```bash
# Kill existing processes
pkill -f "ts-node"
pkill -f "vite"

# Start server (from server directory)
cd server
npx ts-node src/index.ts

# Start client (from client directory - in another terminal)
cd client
npm run dev
```

## 🎮 Game Flow

1. **Lobby**: Players join and set their names
2. **Matchmaking**: Automatic pairing when 2 players are ready
3. **Battle**: 10-minute clicking competition
4. **Results**: Winner announced, new game starts automatically

## 📊 Monitoring

- **Colyseus Monitor**: http://localhost:3000/colyseus - Built-in room monitoring
- **Admin Dashboard**: http://localhost:5173/dashboard - Custom admin interface
- **API Health**: http://localhost:3000/health - Server health check

## 🔍 Troubleshooting

If you encounter issues:

1. Check server is running: `curl http://localhost:3000/health`
2. Check client is accessible: Open http://localhost:5173
3. Check console for WebSocket connection errors
4. Ensure ports 3000 and 5173 are not in use by other applications

## 🎯 Next Steps

The MVP is complete with:
- ✅ Real-time multiplayer gameplay
- ✅ Automatic matchmaking
- ✅ Unique player naming system
- ✅ Admin controls
- ✅ Professional UI with animations
- ✅ WebSocket communication
- ✅ TypeScript throughout

You can now:
- Test the game with multiple browser tabs
- Customize the UI styles
- Add sound effects
- Implement additional game modes
- Deploy to production