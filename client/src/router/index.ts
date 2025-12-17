import { createRouter, createWebHistory } from 'vue-router';
import Lobby from '../views/Lobby.vue';
import Game from '../views/Game.vue';
import Dashboard from '../views/Dashboard.vue';
import DemoGame from '../views/DemoGame.vue';
import UuidSelector from '../views/UuidSelector.vue';
import Leaderboard from '../views/Leaderboard.vue';
import Credits from '../views/Credits.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/:uuid',
      name: 'LobbyWithUuid',
      component: Lobby
    },
    {
      path: '/open-snatchsave',
      name: 'OpenSnatchSave',
      component: Dashboard
    },
    {
      path: '/:uuid/game',
      name: 'GameWithUuid',
      component: Game
    },
    {
      path: '/:uuid/demo',
      name: 'DemoGameWithUuid',
      component: DemoGame
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: Dashboard
    },
    {
      path: '/leaderboard',
      name: 'Leaderboard',
      component: Leaderboard
    },
    {
      path: '/credits',
      name: 'Credits',
      component: Credits
    },
    {
      path: '/',
      name: 'UuidSelector',
      component: UuidSelector
    },
    {
      // Redirect old missing-uuid path to the new selector
      path: '/missing-uuid',
      redirect: '/'
    }
  ]
});

export default router;
