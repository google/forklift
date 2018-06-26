export default {
  async asyncStoreInit({state, commit}) {
    await state.db.open({populated: false});
    let res = await state.db.findAll();
    commit('initializeTodos', res);
  },

  async addTodo({state, commit}, text) {
    let todo = {text, done: false};
    todo.id = await state.db.save(todo);
    commit('addTodo', todo);
  },

  async removeTodo({state, commit}, todo) {
    await state.db.remove(todo.id);
    commit('removeTodo', todo);
  },

  async toggleTodo({state, commit}, todo) {
    todo.done = !todo.done;
    state.db.save(todo, todo.id);
    commit('editTodo', {todo});
  },

  async editTodo({state, commit}, {todo, value}) {
    todo.text = value;
    await state.db.save(todo, todo.id);
    commit('editTodo', {todo});
  },

  async clearCompleted({state, commit, dispatch}) {
    let filtered = state.todos.filter((todo) => todo.done);
    for (let todo of filtered) {
      await dispatch('removeTodo', todo);
    }
  },

  async openDatabase({state}, options) {
    await state.db.open(options);
  },

  closeDatabase({state}) {
    state.db.closeDatabase();
  },

  async deleteDatabase({state}) {
    await state.db.deleteDatabase();
  },
};
