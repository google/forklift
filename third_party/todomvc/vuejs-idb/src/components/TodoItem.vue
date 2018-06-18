<template>
  <li
    :class="{completed: todo.done, editing: editing }"
    class="todo">
    <div class="view">
      <input
        :checked="todo.done"
        type="checkbox"
        class="toggle"
        @change="toggleTodo(todo)">
      <label
        @dblclick="editing = true">
        {{ todo.text }}</label>
      <button
        class="destroy"
        @click.prevent="removeTodo(todo)"/>
    </div>
    <input
      v-focus="editing"
      v-show="editing"
      :value="todo.text"
      type="text"
      class="edit"
      @keyup.enter="doneEdit"
      @keyup.esc="cancelEdit"
      @blue="doneEdit">
  </li>
</template>

<script>
import {mapActions} from 'vuex';

export default {
  name: 'TodoItem',
  directives: {
    focus(el, {value}, {context}) {
      if (value) {
        context.$nextTick((_) => {
          el.focus();
        });
      }
    },
  },
  props: {
    todo: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      editing: false,
    };
  },
  methods: {
    ...mapActions(['editTodo', 'removeTodo', 'toggleTodo']),
    doneEdit(e) {
      const value = e.target.value.trim();
      const {todo} = this;
      if (!value) {
        this.removeTodo(todo);
      } else if (this.editing) {
        this.editTodo({
          todo,
          value,
        });
        this.editing = false;
      }
    },
    cancelEdit(e) {
      e.target.value = this.todo.text;
      this.editing = false;
    },
  },
};
</script>
