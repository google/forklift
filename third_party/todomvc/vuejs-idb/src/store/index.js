import DB from './db';
import Vue from 'vue';
import Vuex from 'vuex';
import actions from './actions';
import mutations from './mutations';
import plugins from './plugins';

const STORAGE_KEY = 'vuejs-idb';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    todos: [],
    db: new DB(STORAGE_KEY),
  },
  actions,
  mutations,
  plugins,
});
