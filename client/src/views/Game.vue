<template>
  <div class="game">
    <div class="game-container">
      <div class="game-header">
        <div class="timer-section">
          <div class="timer" :class="{ 'timer-warning': timeRemaining < 60 }">
            <span class="timer-icon">⏱️</span>
            <span class="timer-text">{{ formatTime(timeRemaining) }}</span>
          </div>
          <div class="game-status" :class="`status-${gameStatus}`">
            {{ gameStatus }}
          </div>
        </div>
      </div>

      <div class="players-section">
        <div v-for="player in players" :key="player.sessionId" class="player-card" 
             :class="{ 'current-player': player.sessionId === sessionId }">
          <div class="player-name">{{ player.name }}</div>
          <div class="player-clicks">
            <span class="clicks-number">{{ player.clicks }}</span>
            <span class="clicks-label">clicks</span>
          </div>
          <div v-if="!player.connected" class="disconnected-badge">Disconnected</div>
        </div>
      </div>

      <div v-if="gameStatus === 'playing'" class="click-area" @click="handleClick">
        <div class="click-button" :class="{ 'clicked': isClicking }">
          <span class="click-icon">👆</span>
          <span class="click-text">CLICK!</span>
        </div>
        <div class="click-hint">Click as fast as you can!</div>
      </div>

      <div v-else-if="gameStatus === 'waiting'" class="waiting-area">
        <div class="waiting-message">
          <div class="spinner"></div>
          <h2>Waiting for opponent...</h2>
          <p>Game will start when another player joins</p>
        </div>
      </div>

      <div v-else-if="gameStatus === 'paused'" class="paused-area">
        <div class="paused-message">
          <span class="pause-icon">⏸️</span>
          <h2>Game Paused</h2>
          <p>Waiting for players to reconnect...</p>
        </div>
      </div>

      <div v-else-if="gameStatus === 'finished'" class="finished-area">
        <div class="finished-message">
          <h2 class="winner-title">🏆 Game Over!</h2>
          <div v-if="winner" class="winner-name">
            Winner: <span>{{ winner }}</span>
          </div>
          <div class="final-scores">
            <div v-for="player in players" :key="player.sessionId" class="final-score">
              <span class="score-name">{{ player.name }}:</span>
              <span class="score-clicks">{{ player.clicks }} clicks</span>
            </div>
          </div>
          <p class="restart-hint">New game starting soon...</p>
        </div>
      </div>

      <div class="game-footer">
        <button @click="leaveGame" class="btn btn-leave">Leave Game</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { colyseusService } from '../services/colyseus';
import { getStateCallbacks } from 'colyseus.js';

const router = useRouter();
const players = ref<any[]>([]);
const gameStatus = ref('waiting');
const timeRemaining = ref(600);
const winner = ref('');
const isClicking = ref(false);

const sessionId = computed(() => colyseusService.sessionId.value);

let clickTimeout: NodeJS.Timeout;

onMounted(() => {
  const room = colyseusService.gameRoom.value;
  
  if (!room) {
    router.push('/');
    return;
  }

  const $ = getStateCallbacks(room);

  $(room.state).listen("gameStatus", (value: string) => {
    gameStatus.value = value;
  });

  $(room.state).listen("timeRemaining", (value: number) => {
    timeRemaining.value = value;
  });

  $(room.state).listen("winner", (value: string) => {
    winner.value = value;
  });

  $(room.state).players.onAdd((player: any) => {
    players.value.push({
      sessionId: player.sessionId,
      name: player.name,
      clicks: player.clicks,
      connected: player.connected
    });

    $(player).listen("clicks", (value: number) => {
      const p = players.value.find(p => p.sessionId === player.sessionId);
      if (p) p.clicks = value;
    });

    $(player).listen("connected", (value: boolean) => {
      const p = players.value.find(p => p.sessionId === player.sessionId);
      if (p) p.connected = value;
    });
  });

  $(room.state).players.onRemove((player: any) => {
    const index = players.value.findIndex(p => p.sessionId === player.sessionId);
    if (index !== -1) {
      players.value.splice(index, 1);
    }
  });

  room.onMessage("gameStart", () => {
    console.log("Game started!");
  });

  room.onMessage("gameEnd", (data) => {
    console.log("Game ended!", data);
  });

  room.onMessage("gamePaused", () => {
    console.log("Game paused");
  });

  room.onMessage("gameRestart", () => {
    console.log("Game restarting");
    players.value.forEach(p => p.clicks = 0);
  });
});

onUnmounted(() => {
  if (clickTimeout) {
    clearTimeout(clickTimeout);
  }
});

function handleClick() {
  if (gameStatus.value !== 'playing') return;
  
  colyseusService.sendClick();
  
  isClicking.value = true;
  clearTimeout(clickTimeout);
  clickTimeout = setTimeout(() => {
    isClicking.value = false;
  }, 100);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function leaveGame() {
  colyseusService.leaveCurrentRoom();
  router.push('/');
}
</script>

<style scoped>
.game {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.game-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  max-width: 900px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.game-header {
  margin-bottom: 30px;
}

.timer-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.timer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 30px;
  background: #f8f9fa;
  border-radius: 50px;
  font-size: 24px;
  font-weight: bold;
}

.timer-warning {
  background: #ffebee;
  color: #c62828;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.timer-icon {
  font-size: 28px;
}

.game-status {
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 14px;
}

.status-waiting {
  background: #e8f5e9;
  color: #4caf50;
}

.status-playing {
  background: #e3f2fd;
  color: #2196f3;
}

.status-paused {
  background: #fff3e0;
  color: #ff9800;
}

.status-finished {
  background: #f3e5f5;
  color: #9c27b0;
}

.players-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.player-card {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 15px;
  text-align: center;
  position: relative;
  border: 3px solid transparent;
  transition: all 0.3s;
}

.player-card.current-player {
  border-color: #667eea;
  background: linear-gradient(145deg, #f5f7ff, #fff);
}

.player-name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.player-clicks {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.clicks-number {
  font-size: 36px;
  font-weight: bold;
  color: #667eea;
}

.clicks-label {
  color: #666;
  font-size: 14px;
}

.disconnected-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ff5252;
  color: white;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.click-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 60px 0;
}

.click-button {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.1s;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
  user-select: none;
}

.click-button:hover {
  transform: scale(1.05);
}

.click-button:active,
.click-button.clicked {
  transform: scale(0.95);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
}

.click-icon {
  font-size: 60px;
  margin-bottom: 10px;
}

.click-text {
  color: white;
  font-size: 24px;
  font-weight: bold;
}

.click-hint {
  margin-top: 20px;
  color: #666;
  font-size: 16px;
}

.waiting-area,
.paused-area,
.finished-area {
  padding: 60px 20px;
  text-align: center;
}

.waiting-message,
.paused-message,
.finished-message {
  max-width: 400px;
  margin: 0 auto;
}

.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.pause-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 20px;
}

.winner-title {
  font-size: 36px;
  color: #333;
  margin-bottom: 20px;
}

.winner-name {
  font-size: 24px;
  margin-bottom: 30px;
}

.winner-name span {
  color: #667eea;
  font-weight: bold;
}

.final-scores {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
}

.final-score {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #e0e0e0;
}

.final-score:last-child {
  border-bottom: none;
}

.score-name {
  font-weight: 600;
  color: #333;
}

.score-clicks {
  color: #667eea;
  font-weight: bold;
}

.restart-hint {
  color: #666;
  font-style: italic;
}

.game-footer {
  margin-top: 40px;
  text-align: center;
}

.btn-leave {
  background: #ef5350;
  color: white;
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-leave:hover {
  background: #e53935;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(239, 83, 80, 0.3);
}

h2 {
  color: #333;
  margin-bottom: 10px;
}

p {
  color: #666;
  font-size: 16px;
}
</style>