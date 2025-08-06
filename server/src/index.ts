import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { monitor } from "@colyseus/monitor";

import { GameRoom } from "./rooms/GameRoom";
import { LobbyRoom } from "./rooms/LobbyRoom";
import { adminRouter } from "./adminApi";

const port = Number(process.env.PORT) || 3000;
const app = express();

app.use(cors());
app.use(express.json());

const server = createServer(app);
const gameServer = new Server({
  server,
});

gameServer.define("lobby", LobbyRoom)
  .filterBy(["maxClients"]);

gameServer.define("game", GameRoom)
  .filterBy(["maxClients"])
  .enableRealtimeListing();

app.use("/api", adminRouter);

app.use("/colyseus", monitor());

app.get("/health", (req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

gameServer.listen(port);

console.log(`🎮 Snatch Game Server is running on port ${port}`);
console.log(`📊 Monitor: http://localhost:${port}/colyseus`);
console.log(`🌐 WebSocket: ws://localhost:${port}`);
console.log(`🔧 Admin API: http://localhost:${port}/api`);