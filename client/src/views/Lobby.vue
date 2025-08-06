<template>
  <div class="lobby">
    <div class="lobby-container">
      <h1 class="title">🎮 Snatch Game</h1>
      <div class="subtitle">Competitive Clicker Battle</div>

      <div class="player-section">
        <div class="name-input-group">
          <input
            v-model="inputName"
            @keyup.enter="updateName"
            type="text"
            placeholder="Enter your name"
            class="name-input"
            maxlength="20"
          />
          <button @click="updateName" class="btn btn-secondary">Set Name</button>
        </div>
        <div class="current-name">
          Playing as: <span class="player-name">{{ playerName || 'guest' }}</span>
        </div>
      </div>

      <div class="main-actions">
        <button @click="handleQuickPlay" class="btn btn-primary btn-large" :disabled="isJoining">
          <span v-if="!isJoining">⚡ Quick Play</span>
          <span v-else>Finding match...</span>
        </button>
      </div>

      <div class="rooms-section">
        <h2>Available Rooms</h2>
        <div v-if="availableRooms.length === 0" class="no-rooms">
          No rooms available. Click Quick Play to start a new game!
        </div>
        <div v-else class="rooms-list">
          <div
            v-for="room in availableRooms"
            :key="room.roomId"
            class="room-card"
            @click="joinRoom(room.roomId)"
          >
            <div class="room-info">
              <span class="room-id">Room #{{ room.roomId.slice(0, 6) }}</span>
              <span class="room-players">{{ room.playerCount }}/2 players</span>
            </div>
            <span class="room-status" :class="`status-${room.status}`">
              {{ room.status }}
            </span>
          </div>
        </div>
      </div>

      <div class="online-players">
        <h3>Online Players</h3>
        <div class="players-grid">
          <div
            v-for="player in onlinePlayers"
            :key="player.sessionId"
            class="player-tag"
            :class="{ 'in-game': player.inGame }"
          >
            {{ player.name }}
            <span v-if="player.inGame" class="status-dot">🎮</span>
          </div>
        </div>
        <div class="player-count">Total: {{ totalPlayers }} players online</div>
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
const inputName = ref('');
const isJoining = ref(false);
const availableRooms = ref<any[]>([]);
const onlinePlayers = ref<any[]>([]);
const totalPlayers = ref(0);

const playerName = computed(() => colyseusService.playerName.value);

onMounted(async () => {
  try {
    const room = await colyseusService.joinLobby();
    const $ = getStateCallbacks(room);
    
    $(room.state).listen("availableRooms", (value: any) => {
      availableRooms.value = value || [];
    });

    $(room.state).listen("totalPlayers", (value: number) => {
      totalPlayers.value = value;
    });

    $(room.state).players.onAdd((player: any) => {
      const exists = onlinePlayers.value.find(p => p.sessionId === player.sessionId);
      if (!exists) {
        onlinePlayers.value.push({
          sessionId: player.sessionId,
          name: player.name,
          inGame: player.inGame
        });
      }

      $(player).listen("name", (value: string) => {
        const p = onlinePlayers.value.find(p => p.sessionId === player.sessionId);
        if (p) p.name = value;
      });

      $(player).listen("inGame", (value: boolean) => {
        const p = onlinePlayers.value.find(p => p.sessionId === player.sessionId);
        if (p) p.inGame = value;
      });
    });

    $(room.state).players.onRemove((player: any) => {
      const index = onlinePlayers.value.findIndex(p => p.sessionId === player.sessionId);
      if (index !== -1) {
        onlinePlayers.value.splice(index, 1);
      }
    });
  } catch (error) {
    console.error('Failed to join lobby:', error);
  }
});

onUnmounted(() => {
  // Don't leave the current room - it might be a game room now
  console.log('Lobby component unmounting...');
});

async function updateName() {
  if (inputName.value.trim()) {
    await colyseusService.setPlayerName(inputName.value.trim());
    inputName.value = '';
  }
}

async function handleQuickPlay() {
  isJoining.value = true;
  console.log('Starting quickPlay...');
  try {
    const gameRoom = await colyseusService.quickPlay();
    console.log('Game room joined:', gameRoom?.id, 'Full room object:', gameRoom);
    
    // Leave the lobby room before navigating
    if (colyseusService.lobbyRoom.value) {
      console.log('Leaving lobby room...');
      colyseusService.lobbyRoom.value.leave();
      colyseusService.lobbyRoom.value = null;
    }
    
    console.log('Navigating to /game...');
    await router.push('/game');
    console.log('Navigation complete');
  } catch (error) {
    console.error('Failed to join game:', error);
    isJoining.value = false;
  }
}

async function joinRoom(roomId: string) {
  isJoining.value = true;
  try {
    // For direct room joining, we can use joinGameRoom directly
    const gameRoom = await colyseusService.joinGameRoom(roomId);
    // Leave the lobby room before navigating
    if (colyseusService.lobbyRoom.value) {
      colyseusService.lobbyRoom.value.leave();
      colyseusService.lobbyRoom.value = null;
    }
    router.push('/game');
  } catch (error) {
    console.error('Failed to join room:', error);
    isJoining.value = false;
  }
}
</script>

<style scoped>
.lobby {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.lobby-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.title {
  font-size: 3rem;
  text-align: center;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-top: 10px;
  font-size: 1.2rem;
}

.player-section {
  margin: 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
}

.name-input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.name-input {
  flex: 1;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.name-input:focus {
  outline: none;
  border-color: #667eea;
}

.current-name {
  text-align: center;
  color: #666;
  font-size: 1.1rem;
}

.player-name {
  color: #667eea;
  font-weight: bold;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #667eea;
  color: white;
}

.btn-secondary:hover {
  background: #5a67d8;
}

.btn-large {
  padding: 18px 36px;
  font-size: 20px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.main-actions {
  text-align: center;
  margin: 40px 0;
}

.rooms-section {
  margin: 40px 0;
}

.rooms-section h2 {
  color: #333;
  margin-bottom: 20px;
}

.no-rooms {
  text-align: center;
  padding: 30px;
  background: #f8f9fa;
  border-radius: 10px;
  color: #666;
}

.rooms-list {
  display: grid;
  gap: 15px;
}

.room-card {
  padding: 15px 20px;
  background: #f8f9fa;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.room-card:hover {
  border-color: #667eea;
  transform: translateX(5px);
}

.room-info {
  display: flex;
  gap: 20px;
  align-items: center;
}

.room-id {
  font-weight: bold;
  color: #333;
}

.room-players {
  color: #666;
}

.room-status {
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.status-waiting {
  background: #e8f5e9;
  color: #4caf50;
}

.status-playing {
  background: #fff3e0;
  color: #ff9800;
}

.status-finished {
  background: #f3e5f5;
  color: #9c27b0;
}

.online-players {
  margin-top: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
}

.online-players h3 {
  color: #333;
  margin-bottom: 15px;
}

.players-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.player-tag {
  padding: 6px 12px;
  background: white;
  border-radius: 20px;
  font-size: 14px;
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.player-tag.in-game {
  border-color: #667eea;
  background: #f5f7ff;
}

.status-dot {
  font-size: 12px;
}

.player-count {
  text-align: center;
  color: #666;
  font-size: 14px;
}
</style>