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

((window) => {
  class Controller {
    /** Takes a model and view and builds the controller between them.
     *
     * @param {object} model The model instance
     * @param {object} view The view instance
     */
    constructor(model, view) {
      this.model = model;
      this.view = view;

      this.view.bind('newTodo', (title) => {
        this.addItem(title);
      });

      this.view.bind('itemEdit', (item) => {
        this.editItem(item.id);
      });

      this.view.bind('itemEditDone', (item) => {
        this.editItemSave(item.id, item.title);
      });

      this.view.bind('itemEditCancel', (item)  => {
        this.editItemCancel(item.id);
      });

      this.view.bind('itemRemove', (item) => {
        this.removeItem(item.id);
      });

      this.view.bind('itemToggle', (item) => {
        this.toggleComplete(item.id, item.completed);
      });

      this.view.bind('removeCompleted', () => {
        this.removeCompletedItems();
      });

      this.view.bind('toggleAll', (status) => {
        this.toggleAll(status.completed);
      });
    }

    /** Loads and initializes the view.
     *
     * @param {string} '' | 'active' | 'completed'
     */
    async setView(locationHash) {
      const route = locationHash.split('/')[1];
      const page = route || '';
      await this._updateFilterState(page);
    }

    /**
     * An event to fire on load. Will get all items and display them in the
     * todo-list
     */
    async showAll() {
      await this.model.read((data) => {
        this.view.render('showEntries', data);
      });
    }

    /** Renders all active tasks. */
    async showActive() {
      await this.model.read({ completed: false }, (data) => {
        this.view.render('showEntries', data);
      });
    };

    /** Renders all completed tasks. */
    async showCompleted() {
      await this.model.read({ completed: true }, (data) => {
        this.view.render('showEntries', data);
      });
    };

    /**
     * An event to fire whenever you want to add an item. Simply pass in the event
     * object and it'll handle the DOM insertion and saving of the new item.
     */
    async addItem(title) {
      if (title.trim() === '') {
        return;
      }

      await this.model.create(title, async () => {
        this.view.render('clearNewTodo');
        await this._filter(true);
      });
    };

    /** Triggers the item editing mode. */
    async editItem(id) {
      await this.model.read(id, (data) => {
        this.view.render('editItem', { id: id, title: data[0].title });
      });
    };

    /** Finishes the item editing mode successfully. */
    async editItemSave(id, title) {
      title = title.trim();

      if (title.length !== 0) {
        await this.model.update(id, {title: title}, () => {
          this.view.render('editItemDone', { id: id, title: title });
        });
      } else {
        await this.removeItem(id);
      }
    };

    /** Cancels the item editing mode. */
    async editItemCancel(id) {
      await this.model.read(id, (data) => {
        this.view.render('editItemDone', { id: id, title: data[0].title });
      });
    };

    /**
     * By giving it an ID it'll find the DOM element matching that ID,
     * remove it from the DOM and also remove it from storage.
     *
     * @param {number} id The ID of the item to remove from the DOM and
     * storage
     */
    async removeItem(id) {
      await this.model.remove(id);
      this.view.render('removeItem', id);

      await this._filter();
    };

    /** Will remove all completed items from the DOM and storage. */
    async removeCompletedItems() {
      await this.model.read({ completed: true }, async (data) => {
        for (let item of data) {
          await this.removeItem(item.id);
        }
      });

      await this._filter();
    };

    /**
     * Give it an ID of a model and a checkbox and it will update the item
     * in storage based on the checkbox's state.
     *
     * @param {number} id The ID of the element to complete or uncomplete
     * @param {object} checkbox The checkbox to check the state of complete
     *                          or not
     * @param {boolean|undefined} silent Prevent re-filtering the todo items
     */
    async toggleComplete(id, completed, silent) {
      await this.model.update(id, { completed: completed }, () => {
        this.view.render('elementComplete', { id: id, completed: completed });
      });

      if (!silent) {
        await this._filter();
      }
    };

    /**
     * Will toggle ALL checkboxes' on/off state and completeness of models.
     * Just pass in the event object.
     */
    async toggleAll(completed) {
      await this.model.read({ completed: !completed }, async (data) => {
        for (let item of data) {
          await this.toggleComplete(item.id, completed, true);
        }
      });

      await this._filter();
    };

    /**
     * Updates the pieces of the page which change depending on the remaining
     * number of todos.
     */
    async _updateCount() {
      await this.model.getCount((todos) => {
        this.view.render('updateElementCount', todos.active);
        this.view.render('clearCompletedButton', {
          completed: todos.completed,
          visible: todos.completed > 0
        });

        this.view.render('toggleAll', {
          checked: todos.completed === todos.total
        });
        this.view.render('contentBlockVisibility', {
          visible: todos.total > 0
        });
      });
    };

    /** Re-filters the todo items, based on the active route.
     *
     * @param {boolean|undefined} force  forces a re-painting of todo items.
     */
    async _filter(force) {
      const activeRoute = this._activeRoute.charAt(0).toUpperCase() +
                          this._activeRoute.substr(1);

      // Update the elements on the page, which change with each completed todo.
      await this._updateCount();

      // If the last active route isn't "All", or we're switching routes, we
      // re-create the todo item elements, calling:
      //   this.show[All|Active|Completed]();
      if (force || this._lastActiveRoute !== 'All' ||
          this._lastActiveRoute !== activeRoute) {
        this['show' + activeRoute]();
      }

      this._lastActiveRoute = activeRoute;
    };

    /** Updates the filter nav's selected states. */
    async _updateFilterState(currentPage) {
      // Store a reference to the active route, allowing us to re-filter todo
      // items as they are marked complete or incomplete.
      this._activeRoute = currentPage;

      if (currentPage === '') {
        this._activeRoute = 'All';
      }

      await this._filter();

      this.view.render('setFilter', currentPage);
    };
  }

  // Export to window
  window.app = window.app || {};
  window.app.Controller = Controller;
})(window);
