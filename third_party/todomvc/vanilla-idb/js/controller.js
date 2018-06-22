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

(function (window) {
    'use strict';

    /**
     * Takes a model and view and acts as the controller between them
     *
     * @constructor
     * @param {object} model The model instance
     * @param {object} view The view instance
     */
    function Controller(model, view) {
        var self = this;
        self.model = model;
        self.view = view;

        self.view.bind('newTodo', function (title) {
            self.addItem(title);
        });

        self.view.bind('itemEdit', function (item) {
            self.editItem(item.id);
        });

        self.view.bind('itemEditDone', function (item) {
            self.editItemSave(item.id, item.title);
        });

        self.view.bind('itemEditCancel', function (item) {
            self.editItemCancel(item.id);
        });

        self.view.bind('itemRemove', function (item) {
            self.removeItem(item.id);
        });

        self.view.bind('itemToggle', function (item) {
            self.toggleComplete(item.id, item.completed);
        });

        self.view.bind('removeCompleted', function () {
            self.removeCompletedItems();
        });

        self.view.bind('toggleAll', function (status) {
            self.toggleAll(status.completed);
        });
    }

    /**
     * Loads and initialises the view
     *
     * @param {string} '' | 'active' | 'completed'
     */
    Controller.prototype.setView = async function (locationHash) {
        var route = locationHash.split('/')[1];
        var page = route || '';
        await this._updateFilterState(page);
    };

    /**
     * An event to fire on load. Will get all items and display them in the
     * todo-list
     */
    Controller.prototype.showAll = async function () {
        var self = this;
        await self.model.read(function (data) {
            self.view.render('showEntries', data);
        });
    };

    /**
     * Renders all active tasks
     */
    Controller.prototype.showActive = async function () {
        var self = this;
        await self.model.read({ completed: false }, function (data) {
            self.view.render('showEntries', data);
        });
    };

    /**
     * Renders all completed tasks
     */
    Controller.prototype.showCompleted = async function () {
        var self = this;
        await self.model.read({ completed: true }, function (data) {
            self.view.render('showEntries', data);
        });
    };

    /**
     * An event to fire whenever you want to add an item. Simply pass in the event
     * object and it'll handle the DOM insertion and saving of the new item.
     */
    Controller.prototype.addItem = async function (title) {
        var self = this;

        if (title.trim() === '') {
            return;
        }

        await self.model.create(title, async function () {
            self.view.render('clearNewTodo');
            await self._filter(true);
        });
    };

    /*
     * Triggers the item editing mode.
     */
    Controller.prototype.editItem = async function (id) {
        var self = this;
        await self.model.read(id, function (data) {
            self.view.render('editItem', {id: id, title: data[0].title});
        });
    };

    /*
     * Finishes the item editing mode successfully.
     */
    Controller.prototype.editItemSave = async function (id, title) {
        var self = this;
        title = title.trim();

        if (title.length !== 0) {
            await self.model.update(id, {title: title}, function () {
                self.view.render('editItemDone', {id: id, title: title});
            });
        } else {
            await self.removeItem(id);
        }
    };

    /*
     * Cancels the item editing mode.
     */
    Controller.prototype.editItemCancel = async function (id) {
        var self = this;
        await self.model.read(id, function (data) {
            self.view.render('editItemDone', {id: id, title: data[0].title});
        });
    };

    /**
     * By giving it an ID it'll find the DOM element matching that ID,
     * remove it from the DOM and also remove it from storage.
     *
     * @param {number} id The ID of the item to remove from the DOM and
     * storage
     */
    Controller.prototype.removeItem = async function (id) {
        var self = this;
        await self.model.remove(id, function () {
            self.view.render('removeItem', id);
        });

        await self._filter();
    };

    /**
     * Will remove all completed items from the DOM and storage.
     */
    Controller.prototype.removeCompletedItems = async function () {
        var self = this;
        await self.model.read({ completed: true }, async function (data) {
            for (var item of data) {
                await self.removeItem(item.id);
            }
        });

        await self._filter();
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
    Controller.prototype.toggleComplete = async function (id, completed, silent) {
        var self = this;
        await self.model.update(id, { completed: completed }, function () {
            self.view.render('elementComplete', {
                id: id,
                completed: completed
            });
        });

        if (!silent) {
            await self._filter();
        }
    };

    /**
     * Will toggle ALL checkboxes' on/off state and completeness of models.
     * Just pass in the event object.
     */
    Controller.prototype.toggleAll = async function (completed) {
        var self = this;
        await self.model.read({ completed: !completed }, async function (data) {
            for (var item of data) {
                await self.toggleComplete(item.id, completed, true);
            }
        });

        await self._filter();
    };

    /**
     * Updates the pieces of the page which change depending on the remaining
     * number of todos.
     */
    Controller.prototype._updateCount = async function () {
        var self = this;
        await self.model.getCount(function (todos) {
            self.view.render('updateElementCount', todos.active);
            self.view.render('clearCompletedButton', {
                completed: todos.completed,
                visible: todos.completed > 0
            });

            self.view.render('toggleAll', {checked: todos.completed === todos.total});
            self.view.render('contentBlockVisibility', {visible: todos.total > 0});
        });
    };

    /**
     * Re-filters the todo items, based on the active route.
     * @param {boolean|undefined} force  forces a re-painting of todo items.
     */
    Controller.prototype._filter = async function (force) {
        var activeRoute = this._activeRoute.charAt(0).toUpperCase() + this._activeRoute.substr(1);

        // Update the elements on the page, which change with each completed todo
        await this._updateCount();

        // If the last active route isn't "All", or we're switching routes, we
        // re-create the todo item elements, calling:
        //   this.show[All|Active|Completed]();
        if (force || this._lastActiveRoute !== 'All' || this._lastActiveRoute !== activeRoute) {
            this['show' + activeRoute]();
        }

        this._lastActiveRoute = activeRoute;
    };

    /**
     * Simply updates the filter nav's selected states
     */
    Controller.prototype._updateFilterState = async function (currentPage) {
        // Store a reference to the active route, allowing us to re-filter todo
        // items as they are marked complete or incomplete.
        this._activeRoute = currentPage;

        if (currentPage === '') {
            this._activeRoute = 'All';
        }

        await this._filter();

        this.view.render('setFilter', currentPage);
    };

    // Export to window
    window.app = window.app || {};
    window.app.Controller = Controller;
})(window);
