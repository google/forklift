<template>
  <section class="todoapp">
    <TodosHeader/>
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
import TodoItem from './TodoItem.vue';
import TodosHeader from './TodosHeader.vue';
import {mapActions} from 'vuex';

export default {
  components: {TodosHeader, TodoItem},
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
  created() {
    // Only auto-open the DB if ?open=0 is not passed in the URL.
    let openDB = true;
    const parsedUrl = new URL(window.location.href);
    if (parsedUrl.searchParams.get('open') === '0') {
      openDB = false;
    }
    if (openDB) {
      this.$store.dispatch('asyncStoreInit');
    }
  },
  methods: {
    ...mapActions(['clearCompleted']),
  },
};
</script>

<style src="./todo.css">
</style>
