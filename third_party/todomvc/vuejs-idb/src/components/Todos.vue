<template>
  <section class="todoapp">
    <header class="header">
      <h1>Todos</h1>
      <input
        type="text"
        class="new-todo"
        autofocus
        autocomplete="off"
        placeholder="What needs to be done?"
        @keyup.enter="addTodo">
    </header>
    <section
      v-show="todos.length"
      v-cloak
      class="main">
      <input
        v-model="allDone"
        type="checkbox"
        class="toggle-all">
      <ul class="todo-list">
        <TodoItem
          v-for="(todo, index) in filteredTodos"
          :key="index"
          :todo="todo"/>
      </ul>
    </section>
    <footer
      v-show="todos.length > 0"
      class="footer">
      <span class="todo-count">
        <strong>{{ remaining }}</strong> {{ remaining | pluralize }} left
      </span>
      <ul class="filters">
        <li>
          <a
            :class="{selected: filter == 'all'}"
            href="#/all"
            @click="filter = 'all'">All</a>
        </li>
        <li>
          <a
            :class="{selected: filter == 'active'}"
            href="#/active"
            @click="filter = 'active'">Active</a>
        </li>
        <li>
          <a
            :class="{selected: filter == 'completed'}"
            href="#/completed"
            @click="filter = 'completed'">Completed</a>
        </li>
      </ul>
      <button
        v-show="completed"
        class="clear-completed"
        @click.prevent="clearCompleted">Clear Completed</button>
    </footer>
  </section>
</template>

<script>
import {mapActions} from 'vuex';
import TodoItem from './TodoItem.vue';

export default {
  components: {TodoItem},
  filters: {
    pluralize: function(n) {
      return n === 1 ? 'item' : 'items';
    },
  },
  data() {
    return {
      filter: 'all',
      editing: false,
    };
  },
  computed: {
    todos() {
      return this.$store.state.todos;
    },
    remaining() {
      return this.todos.filter((todo) => !todo.done).length;
    },
    completed() {
      return this.todos.filter((todo) => todo.done).length;
    },
    filteredTodos() {
      if (this.filter === 'active') {
        return this.todos.filter((todo) => !todo.done);
      } else if (this.filter === 'completed') {
        return this.todos.filter((todo) => todo.done);
      }

      return this.todos;
    },
    allDone: {
      get() {
        return this.remaining === 0;
      },
      set(value) {
        this.todos.forEach((todo) => {
          todo.done = value;
        });
      },
    },
  },
  methods: {
    ...mapActions(['clearCompleted']),
    addTodo(e) {
      const text = e.target.value;
      if (text.trim()) {
        this.$store.dispatch('addTodo', text);
      }
      e.target.value = '';
    },
  },
};
</script>

<style src="./todo.css">
</style>
