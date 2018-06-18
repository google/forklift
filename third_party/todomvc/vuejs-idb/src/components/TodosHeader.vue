<template>
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
</template>

<script>
export default {
  name: 'TodosHeader',
  methods: {
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
