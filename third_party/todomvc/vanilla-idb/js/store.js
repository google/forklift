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

/*jshint eqeqeq:false */
(function (window) {
    'use strict';

    var ID = 1;

    /**
     * Creates a new client side storage object and will create an empty
     * collection if no collection already exists.
     *
     * @param {string} name The name of our DB we want to use
     * @param {function} callback Our fake DB uses callbacks because in
     * real life you probably would be making AJAX calls
     */
    function Store(name, callback) {
        callback = callback || function () {};

        this._dbName = name;
        this._objectStoreName = 'todos';
    }

    /**
     * Deletes a database
     * @param {function} callback The callback to fire when the init
     * has completed
     */
    Store.prototype.deleteDatabase = async function (callback) {
        callback = callback || function () {};
        await idb.delete(this._dbName);
        callback(this);
    }

    /**
     * Opens a database
     * @param {object} options If 'populated' is true, will add more
     * object stores and rows to the db at open
     * @param {function} callback The callback to fire when the init
     * has completed
     */
    Store.prototype.open = async function (options, callback) {
        var self = this;
        var firstRun = false;
        self.db = await idb.open(this._dbName, 1, upgradeDB => {
          firstRun = true;
          upgradeDB.createObjectStore(self._objectStoreName, { keyPath: 'id', autoIncrement: true });

          var searchStore = upgradeDB.createObjectStore("search", { keyPath: "id", autoIncrement: true });
          searchStore.createIndex("search_id", "id");
          searchStore.createIndex("search_messageid_index", "messageId");
          searchStore.createIndex("search_itemid_index", "itemId");
          searchStore.createIndex("search_timestamp_index", "timestamp");
        });

        if (firstRun && options.populated) {
          await self.populate();
        }
        callback(self, {todos: []});
    }

    /**
     * Populates a database
     */
    Store.prototype.populate = async function () {
      var transaction = this.db.transaction(['search'], 'readwrite');
      var searchStore = transaction.objectStore('search');

      let numSearch = 100000;

      for (var i = 0; i < numSearch; i++) {
        var searchItem = {
          name: `Search ${i}`,
          messageId: `Message ${i}`,
          itemId: `Item ${i}`,
          timestamp: Date.now()
        };
        await searchStore.put(searchItem);
      }
      await transaction.complete;
    }

    /**
     * Closes a database
     */
    Store.prototype.closeDatabase = function () {
        this.db.close();
    }

    /**
     * Finds items based on a query given as a JS object
     *
     * @param {object} query The query to match against (i.e. {foo: 'bar'})
     * @param {function} callback     The callback to fire when the query has
     * completed running
     *
     * @example
     * db.find({foo: 'bar', hello: 'world'}, function (data) {
     *     // data will return any items that have foo: bar and
     *     // hello: world in their properties
     * });
     */
    Store.prototype.find = async function (query, callback) {
        if (!callback) {
            return;
        }
        var self = this;

        await this.findAll(async function(todos) {
          await callback.call(self, todos.filter(function (todo) {
            for (var q in query) {
              if (query[q] !== todo[q]) {
                return false;
              }
            }
            return true;
          }));
        });
    };

    /**
     * Will retrieve all data from the collection
     *
     * @param {function} callback The callback to fire upon retrieving data
     */
    Store.prototype.findAll = async function (callback) {
        callback = callback || function () {};
        if (!this.db) {
          return;
        }
        var todos = [];
        var transaction = this.db.transaction(this._objectStoreName);
        transaction.objectStore(this._objectStoreName).iterateCursor(cursor => {
            if (!cursor) return;
            todos.push(cursor.value);
            cursor.continue();
        });
        await transaction.complete;
        await callback.call(this, todos);
    };

    /**
     * Will save the given data to the DB. If no item exists it will create a new
     * item, otherwise it'll simply update an existing item's properties
     *
     * @param {object} updateData The data to save back into the DB
     * @param {function} callback The callback to fire after saving
     * @param {number} id An optional param to enter an ID of an item to update
     */
    Store.prototype.save = async function (updateData, callback, id) {
        callback = callback || function () {};
        var transaction = this.db.transaction(this._objectStoreName, 'readwrite');
        var objectStore = transaction.objectStore(this._objectStoreName);
        var request;
        if (id) {
          var data = await objectStore.get(id);
          for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
              data[key] = updateData[key];
            }
          }
          await objectStore.put(data);
        } else {
          await objectStore.add(updateData);
        }
        await transaction.complete;
        callback.call(this);
    };

    /**
     * Will remove an item from the Store based on its ID
     *
     * @param {number} id The ID of the item you want to remove
     * @param {function} callback The callback to fire after saving
     */
    Store.prototype.remove = async function (id, callback) {
        var transaction = this.db.transaction(this._objectStoreName, 'readwrite');
        var objectStore = transaction.objectStore(this._objectStoreName);
        await objectStore.delete(id);
        await transaction.complete;
        callback.call(this);
    };

    /**
     * Will drop all storage and start fresh
     *
     * @param {function} callback The callback to fire after dropping the data
     */
    Store.prototype.drop = async function (callback) {
        var data = {todos: []};

        await this.findAll(async function(todos) {
          var transaction = this.db.transaction(this._objectStoreName, 'readwrite');
          var objectStore = transaction.objectStore(this._objectStoreName);
          todos.forEach(function (todo) {
            objectStore.delete(todo.id);
          });
          await transaction.complete;
          callback.call(this, data.todos);
        });
    };

    // Export to window
    window.app = window.app || {};
    window.app.Store = Store;
})(window);
