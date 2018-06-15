// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';
import store from './store';
import App from './App';
import Director from 'director/build/director';

/* eslint-disable no-new */
window.VueApp = new Vue({
  store,
  el: '#app',
  render: (h) => h(App),
});

const router = new Director.Router();

['all', 'active', 'completed'].forEach((visibility) => {
  router.on(visibility, () => {
    window.VueApp.filter = visibility;
  });
});

router.configure({
  notfound: () => {
    window.location.hash = '';
    window.VueApp.filter = 'all';
  },
});

router.init();
