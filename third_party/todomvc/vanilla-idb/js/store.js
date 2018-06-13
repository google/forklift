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

    // promiseWrapIDBRequest is a Promise-based helper that wraps
    // an IDBRequest object with onsuccess and onerror callbacks in
    // a promise.
    function promiseWrapIDBRequest(request) {
      var promise = new Promise(function (resolve, reject) {
        request.onsuccess = function (event) {
          resolve(event);
        };
        request.onerror = function (event) {
          reject(event);
        };
      });
      return promise;
    }

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
    Store.prototype.deleteDatabase = function (callback) {
        var self = this;
        var request = indexedDB.deleteDatabase(this._dbName);
        request.onerror = function (event) {
          throw DOMException(event.error);
        };
        request.onsuccess = function (event) {
          callback(self);
        };
    }

    /**
     * Opens a database
     * @param {object} options If 'populated' is true, will add more
     * object stores and rows to the db at open
     * @param {function} callback The callback to fire when the init
     * has completed
     */
    Store.prototype.open = function (options, callback) {
        var self = this;
        var request = indexedDB.open(this._dbName, 1);
        var firstRun = false;
        request.onupgradeneeded = function(event) {
          firstRun = true;
          var db = event.target.result;

          db.createObjectStore(
            self._objectStoreName,
            { keyPath: 'id',
              autoIncrement: true
            }
          );

          if (options.populated) {
            var searchStore = db.createObjectStore(
              "search",
              { keyPath: "id",
                autoIncrement: true
              }
            );
            searchStore.createIndex("search_id", "id");
            searchStore.createIndex("search_messageid_index", "messageId");
            searchStore.createIndex("search_itemid_index", "itemId");
            searchStore.createIndex("search_timestamp_index", "timestamp");
          }
        };
        request.onsuccess = async function(event) {
          self.db = event.target.result;
          if (firstRun && options.populated) {
            await self.populate(event.target.result);
          }
          callback(self, {todos: []});
        };
        // TODO implement onerror handler
    }

    /**
     * Populates a database
     */
    Store.prototype.populate = async function (db) {
      var transaction = db.transaction(['search'], 'readwrite');
      var searchStore = transaction.objectStore('search');

      let numSearch = 100000;

      for (var i = 0; i < numSearch; i++) {
        var searchItem = {
          name: `Search ${i}`,
          messageId: `Message ${i}`,
          itemId: `Item ${i}`,
          timestamp: Date.now()
        };
        var request = searchStore.put(searchItem);
        try {
          await promiseWrapIDBRequest(request);
        } catch(e) {
          console.error(`Failed to put item ${i}`);
          throw e;
        }
        // TODO await onComplete().
      }
    }

    /**
     * Closes a database
     */
    Store.prototype.closeDatabase = function () {
        var self = this;
        self.db.close();
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
    Store.prototype.find = function (query, callback) {
        if (!callback) {
            return;
        }
        var self = this;

        this.findAll(function(todos) {
          callback.call(self, todos.filter(function (todo) {
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
    Store.prototype.findAll = function (callback) {
        callback = callback || function () {};
        if (!this.db) {
          return;
        }
        var todos = [];
        var self = this;
        var transaction = this.db.transaction(this._objectStoreName);
        var objectStore = transaction.objectStore(this._objectStoreName);
        objectStore.openCursor().onsuccess = function (event) {
          var cursor = event.target.result;
          if (cursor) {
            todos.push(cursor.value);
            cursor.continue();
          } else {
            callback.call(self, todos);
          }
        };
        // TODO implement onerror handler
    };

    /**
     * Will save the given data to the DB. If no item exists it will create a new
     * item, otherwise it'll simply update an existing item's properties
     *
     * @param {object} updateData The data to save back into the DB
     * @param {function} callback The callback to fire after saving
     * @param {number} id An optional param to enter an ID of an item to update
     */
    Store.prototype.save = function (updateData, callback, id) {
        callback = callback || function () {};
        var self = this;
        var transaction = this.db.transaction(this._objectStoreName, 'readwrite');
        transaction.oncomplete = function (event) {
          callback.call(self);
        };
        var objectStore = transaction.objectStore(this._objectStoreName);
        var request;
        if (id) {
          request = objectStore.get(id);
          request.onsuccess = function (event) {
            var data = event.target.result;
            for (var key in updateData) {
              if (updateData.hasOwnProperty(key)) {
                data[key] = updateData[key];
              }
            }
            var request = objectStore.put(data);
            request.onsuccess = function (event) {
            };
            request.onerror = function (event) {
              throw DOMException(event.error);
            };
          };
          request.onerror = function (event) {
            throw DOMException(event.error);
          };
        } else {
          request = objectStore.add(updateData);
          request.onsuccess = function (event) {
          };
          request.onerror = function (event) {
            throw DOMException(event.error);
          };
        }
    };

    /**
     * Will remove an item from the Store based on its ID
     *
     * @param {number} id The ID of the item you want to remove
     * @param {function} callback The callback to fire after saving
     */
    Store.prototype.remove = function (id, callback) {
        var transaction = this.db.transaction(this._objectStoreName, 'readwrite');
        transaction.oncomplete = function (event) {
          callback.call(self);
        };
        var objectStore = transaction.objectStore(this._objectStoreName);
        var request = objectStore.delete(id);
        var self = this;
        request.onsuccess = function (event) {
        };
    };

    /**
     * Will drop all storage and start fresh
     *
     * @param {function} callback The callback to fire after dropping the data
     */
    Store.prototype.drop = function (callback) {
        var data = {todos: []};

        var self = this;
        this.findAll(function(todos) {
          var transaction = this.db.transaction(this._objectStoreName, 'readwrite');
          transaction.oncomplete = function (event) {
            callback.call(self, data.todos);
          };
          var objectStore = transaction.objectStore(this._objectStoreName);
          todos.forEach(function (todo) {
            objectStore.delete(todo.id);
          });
        });
    };

    // Export to window
    window.app = window.app || {};
    window.app.Store = Store;
})(window);
