<template>
  <section class="todoapp">
    <header class="header">
      <h1>Todos</h1>
      <input
        v-model="newTodo"
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
        <li
          v-for="(todo, index) in filteredTodos"
          :class="{completed: todo.done, editing: todo === editing }"
          :key="index"
          class="todo">
          <div class="view">
            <input
              v-model="todo.done"
              type="checkbox"
              class="toggle">
            <label
              @dblclick="editTodo(todo)">{{ todo.title }}</label>
            <button
              class="destroy"
              @click.prevent="deleteTodo(todo)"/>
          </div>
          <input
            v-todoFocus="todo === editing"
            v-model="todo.title"
            type="text"
            class="edit"
            @keyup.enter="doneEdit"
            @blur="doneEdit">
        </li>
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
        @click.prevent="deleteCompleted">Clear Completed</button>
    </footer>
  </section>
</template>

<script>
import Vue from 'vue';

export default {
  filters: {
    pluralize: function(n) {
      return n === 1 ? 'item' : 'items';
    },
  },
  directives: {
    todoFocus(el, value) {
      if (value) {
        Vue.nextTick((_) => {
          el.focus();
        });
      }
    },
  },
  data() {
    return {
      newTodo: '',
      filter: 'all',
      editing: null,
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
    addTodo() {
      this.todos.push({
        done: false,
        title: this.newTodo,
      });
      this.$store.dispatch('addTodo', this.newTodo);
      this.newTodo = '';
    },
    deleteTodo(todo) {
      this.todos = this.todos.filter((t) => t !== todo);
    },
    deleteCompleted() {
      this.todos = this.todos.filter((todo) => !todo.done);
    },
    editTodo(todo) {
      this.editing = todo;
    },
    doneEdit() {
      this.editing = null;
    },
  },
};
</script>

<style src="./todo.css">
</style>
