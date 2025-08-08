import { createRouter, createWebHistory } from 'vue-router';
import Lobby from '../views/Lobby.vue';
import Game from '../views/Game.vue';
import Dashboard from '../views/Dashboard.vue';
import DemoGame from '../views/DemoGame.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Lobby',
      component: Lobby
    },
    {
      path: '/game',
      name: 'Game',
      component: Game
    },
    {
      path: '/demo',
      name: 'DemoGame',
      component: DemoGame
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard
    }
  ]
});

export default router;
