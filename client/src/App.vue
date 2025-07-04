<template>
  <div id="app">
    <Home 
      v-if="currentScreen === 'home'" 
      @join-game="onJoinGame" 
      @show-settings="showSettings = true" 
    />
    <Game v-else-if="currentScreen === 'game'" :game-client="gameClient" />
    
    <!-- Settings Modal -->
    <Settings v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Home from '@/components/Home.vue'
import Game from '@/components/Game.vue'
import Settings from '@/components/Settings.vue'
import { GameClient } from '@/services/gameClient'
import { logger } from '@/services/logger'

const currentScreen = ref<'home' | 'game'>('home')
const gameClient = ref<GameClient | null>(null)
const showSettings = ref(false)

const onJoinGame = (client: any) => {
  gameClient.value = client
  currentScreen.value = 'game'
  logger.info('Transitioning to game screen')
  
  // Handle admin kick notification
  client.onAdminKicked((data: any) => {
    // Show alert message
    alert(`🚫 ${data.message}`)
    
    // Return to home screen
    currentScreen.value = 'home'
    gameClient.value = null
    
    logger.info('Player kicked by admin, returned to home screen')
  })

  // Handle round change notification
  client.onRoundChanged((data: any) => {
    // Show alert message
    alert(`🎯 ${data.message}`)
    
    logger.info('Round changed by admin:', data)
  })
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
}
</style>