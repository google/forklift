/*
 * Everything in this repo is MIT License unless otherwise specified.
 *
 * Copyright (c) Addy Osmani, Sindre Sorhus, Pascal Hartig, Stephen Sawchuk.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/*global qs, qsa, $on, $parent, $delegate */

((window) => {
  /** View that abstracts away the browser's DOM completely.
   *
   * It has two simple entry points:
   *   - bind(eventName, handler)
   *     Takes a todo application event and registers the handler
   *   - render(command, parameterObject)
   *     Renders the given command with the options
   */
  class View {
    constructor(template) {
      this.template = template;

      this.ENTER_KEY = 13;
      this.ESCAPE_KEY = 27;

      this.$todoList = qs('.todo-list');
      this.$todoItemCounter = qs('.todo-count');
      this.$clearCompleted = qs('.clear-completed');
      this.$main = qs('.main');
      this.$footer = qs('.footer');
      this.$toggleAll = qs('.toggle-all');
      this.$newTodo = qs('.new-todo');
    }

    _removeItem(id) {
      const listItem = qs(`[data-id="${id}"]`);
      if (!listItem) return;

      this.$todoList.removeChild(listItem);
    }

    _clearCompletedButton(completedCount, visible) {
      this.$clearCompleted.innerHTML =
          this.template.clearCompletedButton(completedCount);
      this.$clearCompleted.style.display = visible ? 'block' : 'none';
    }

    _setFilter(currentPage) {
      qs('.filters .selected').className = '';
      qs('.filters [href="#/' + currentPage + '"]').className = 'selected';
    }

    _elementComplete(id, completed) {
      const listItem = qs(`[data-id="${id}"]`);
      if (!listItem) return;

      listItem.classList.toggle('completed', completed);

      // In case it was toggled from an event and not by clicking the checkbox
      qs('input', listItem).checked = completed;
    }

    _editItem(id, title) {
      const listItem = qs(`[data-id="${id}"]`);
      if (!listItem) return;

      listItem.classList.add('editing');

      const input = document.createElement('input');
      input.className = 'edit';

      listItem.appendChild(input);
      input.focus();
      input.value = title;
    }

    _editItemDone(id, title) {
      const listItem = qs(`[data-id="${id}"]`);
      if (!listItem) return;

      const input = qs('input.edit', listItem);
      listItem.removeChild(input);

      listItem.classList.remove('editing');

      qsa('label', listItem).forEach((label) => {
        label.textContent = title;
      });
    }

    render(viewCmd, parameter) {
      const viewCommands = {
        showEntries: () => {
          this.$todoList.innerHTML = this.template.show(parameter);
        },
        removeItem: () => {
          this._removeItem(parameter);
        },
        updateElementCount: () => {
          this.$todoItemCounter.innerHTML =
              this.template.itemCounter(parameter);
        },
        clearCompletedButton: () => {
          this._clearCompletedButton(parameter.completed, parameter.visible);
        },
        contentBlockVisibility: () => {
          this.$main.style.display = this.$footer.style.display =
              parameter.visible ? 'block' : 'none';
        },
        toggleAll: () => {
          this.$toggleAll.checked = parameter.checked;
        },
        setFilter: () => {
          this._setFilter(parameter);
        },
        clearNewTodo: () => {
          this.$newTodo.value = '';
        },
        elementComplete: () => {
          this._elementComplete(parameter.id, parameter.completed);
        },
        editItem: () => {
          this._editItem(parameter.id, parameter.title);
        },
        editItemDone: () => {
          this._editItemDone(parameter.id, parameter.title);
        },
      };

      viewCommands[viewCmd]();
    }

    _itemId(element) {
      const li = $parent(element, 'li');
      return parseInt(li.dataset.id, 10);
    }

    _bindItemEditDone(handler) {
      $delegate(this.$todoList, 'li .edit', 'blur', (event) => {
        if (!event.target.dataset.iscanceled) {
          handler({ id: this._itemId(this), title: event.target.value });
        }
      });

      $delegate(this.$todoList, 'li .edit', 'keypress', (event) => {
        if (event.keyCode === this.ENTER_KEY) {
          // Remove the cursor from the input when you hit enter just like if it
          // were a real form
          event.target.blur();
        }
      });
    }

    _bindItemEditCancel(handler) {
      $delegate(this.$todoList, 'li .edit', 'keyup', (event) => {
        if (event.keyCode === this.ESCAPE_KEY) {
          event.target.dataset.iscanceled = true;
          event.target.blur();

          handler({ id: this._itemId(event.target) });
        }
      });
    }

    bind(eventName, handler) {
      switch (eventName) {
        case 'newTodo':
          $on(this.$newTodo, 'change', () => { handler(this.$newTodo.value); });
          break;
        case 'removeCompleted':
          $on(this.$clearCompleted, 'click', () => { handler(); });
          break;
        case 'toggleAll':
          $on(this.$toggleAll, 'click', (event) => {
            handler({ completed: event.target.checked });
          });
          break;
        case 'itemEdit':
          $delegate(this.$todoList, 'li label', 'dblclick', (event) => {
            handler({ id: this._itemId(event.target) });
          });
          break;
        case 'itemRemove':
          $delegate(this.$todoList, '.destroy', 'click', (event) => {
            handler({ id: this._itemId(event.target) });
          });
          break;
        case 'itemToggle':
          $delegate(this.$todoList, '.toggle', 'click', (event) => {
            handler({
              id: this._itemId(event.target),
              completed: event.target.checked,
            });
          });
          break;
        case 'itemEditDone':
          this._bindItemEditDone(handler);
          break;
        case 'itemEditCancel':
          this._bindItemEditCancel(handler);
          break;
      }
    }
  }

  // Export to window
  window.app = window.app || {};
  window.app.View = View;
})(window);
