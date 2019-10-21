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
((window) => {
  class Database {
    /** Delete a database.
     *
     * @param {string} dbName The name of the databse to be deleted.
     */
    static async delete(dbName) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => { resolve(true); }
        request.onerror = (event) => { reject(event.target.error); };
      });
    }

    /** Open a database.
     *
     * @param {string} dbName The name of the databse to be opened.
     * @param {object} dbSchema Description of the database structure.
     */
    static async open(dbName, dbSchema) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = (event) => { reject(event.target.error); };
        request.onsuccess = (event) => {
          const idbDatabase = event.target.result;
          const db = new Database(dbName, dbSchema, idbDatabase);
          resolve(db);
        };
        request.onupgradeneeded = (event) => {
          const idbDatabase = event.target.result;
          const transaction = event.target.transaction;
          for (let storeName in dbSchema) {
            if (!dbSchema.hasOwnProperty(storeName)) continue;

            const storeDetails = dbSchema[storeName];
            const indexes = storeDetails.indexes || [];
            const options = Object.assign({}, storeDetails);
            delete options.indexes;

            const store = idbDatabase.createObjectStore(storeName, options);
            for (let index of indexes) {
              const indexOptions = Object.assign({}, index);
              const indexName = index.name;
              delete indexOptions.name;
              const indexKey = index.keyPath;
              delete indexOptions.keyPath;

              store.createIndex(indexName, indexKey, indexOptions);
            }
          }
          if (transaction.commit)
            transaction.commit();
        };
      });
    }

    /** Do not instantiate directly. Use Database.open() instead. */
    constructor(dbName, dbSchema, idbDatabase) {
      this._dbName = dbName;
      this._dbSchema = dbSchema;
      this._idbDatabase = idbDatabase;
    }

    /** Closes the underlying database. All future operations will fail. */
    close() {
      this._idbDatabase.close();
    }

    /** Deletes all objects from a store.
     *
     * @param [string] storeName The name of the store getting wiped
     */
    async clearStore(storeName) {
      return new Promise((resolve, reject) => {
        const transaction = this._idbDatabase.transaction([storeName],
                                                          'readwrite');
        transaction.onerror = (event) => { reject(event.target.error); };
        transaction.oncomplete = () => { resolve(); };

        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.clear();
        request.onerror = (event) => { reject(event.target.error); };
        if (transaction.commit)
          transaction.commit();
      });
    }

    /** Counts the number of objects that match a set of queries.
     *
     * @param [array<{index?: string, range?: IDBKeyRange>] queries
     * @param [IDBKeyRange?] keyRange The range of keys being counted; null
     *                                if the entire object store / index is
     *                                counted
     */
    async count(storeName, queries) {
      return new Promise((resolve, reject) => {
        const results = [];
        const transaction = this._idbDatabase.transaction([storeName],
                                                          'readonly');
        transaction.onerror = (event) => { reject(event.target.error); };
        transaction.oncomplete = () => { resolve(results); };

        for (let query of queries) {
          let resultIndex = results.length;
          results.push(0);

          const objectStore = transaction.objectStore(storeName);
          const dataSource = ('index' in query) ? objectStore.index(query.index)
                                                : objectStore;
          const request = ('range' in query) ? dataSource.count(query.range)
                                            : dataSource.count();
          request.onerror = (event) => { reject(event.target.error); };
          request.onsuccess = (event) => {
            results[resultIndex] = event.target.result;
          };
          if (transaction.commit)
            transaction.commit();
        }
      });
    }

    /** Deletes an object from a store.
     *
     * @param [string] storeName The name of the store losing an object
     * @param [object] objectKey The primary key of the object to be deleted
     */
    async delete(storeName, objectKey) {
      return new Promise((resolve, reject) => {
        const transaction = this._idbDatabase.transaction([storeName],
                                                          'readwrite');
        transaction.onerror = (event) => { reject(event.target.error); };
        transaction.oncomplete = () => { resolve(); };

        const objectStore = transaction.objectStore(storeName);
        const request = objectStore.delete(objectKey);
        request.onerror = (event) => { reject(event.target.error); };
        if (transaction.commit)
          transaction.commit();
      });
    }

    /** Reads from a store by iterating a cursor.
     *
     * @param [string] storeName The name of the store being read
     * @param [{index?: string, range?: IDBKeyRange}] query Narrows down the
     *                                                      data being read.
     * @param [function(IDBCursor)] cursorCallback Called for each cursor
     *                                             yielded by the iteration
     */
    async iterateCursor(storeName, query, cursorCallback) {
      return new Promise((resolve, reject) => {
        const transaction = this._idbDatabase.transaction([storeName],
                                                          'readonly');
        transaction.onerror = (event) => { reject(event.target.error); };
        transaction.oncomplete = () => { resolve(); };

        const objectStore = transaction.objectStore(storeName);
        const dataSource = ('index' in query) ? objectStore.index(query.index)
                                              : objectStore;
        const request = ('range' in query) ? dataSource.openCursor(query.range)
                                           : dataSource.openCursor();

        request.onerror = (event) => { reject(event.target.error); };
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) {
            if (transaction.commit)
              transaction.commit();
            return;  // The iteration completed.
          }

          try {
            const willContinue = cursorCallback(cursor);
            if (willContinue)
              cursor.continue();
          } catch (callbackError) {
            reject(callbackError);
          }
        };
      });

    }

    /** Writes an array of objects to a store in a single transaction.
     *
     * @param [string] storeName The name of the store receiving the objects
     * @param [array<object>] objects The objects to be written to the store
     */
    async putBatch(storeName, objects) {
      return new Promise((resolve, reject) => {
        const transaction = this._idbDatabase.transaction([storeName],
                                                          'readwrite');
        transaction.onerror = (event) => { reject(event.target.error); };
        transaction.oncomplete = () => { resolve(); };

        const objectStore = transaction.objectStore(storeName);
        for (let object of objects) {
          const request = objectStore.put(object);
          request.onerror = (event) => { reject(event.target.error); };
        }
        if (transaction.commit)
          transaction.commit();
      });
    }

    async readModifyWrite(storeName, objectKey, modifyCallback) {
      return new Promise((resolve, reject) => {
        const transaction = this._idbDatabase.transaction([storeName],
                                                          'readwrite');
        transaction.onerror = (event) => { reject(event.target.error); };
        transaction.oncomplete = () => { resolve(); };

        const objectStore = transaction.objectStore(storeName);
        const getRequest = objectStore.get(objectKey);
        getRequest.onerror = (event) => { resolve(event.target.error); };
        getRequest.onsuccess = (event) => {
          const oldObject = event.target.result;
          let newObject;
          try {
            newObject = modifyCallback(oldObject);
          } catch (callbackError) {
            reject(callbackError);
          }
          const putRequest = (objectStore.keyPath === null) ?
              objectStore.put(newObject, objectKey) :
              objectStore.put(newObject);
          putRequest.onerror = (event) => { reject(event.target.error); };
          if (transaction.commit)
            transaction.commit();
        };
      });
    }
  };

  class Store {
    /**
     * Creates a new client side storage object and will create an empty
     * collection if no collection already exists.
     *
     * @param {string} name The name of our DB we want to use
    */
    constructor(name) {
      this._dbName = name;
      this._db = null;
    }


    /** Deletes the database. */
    async deleteDatabase() {
      if (this._db)
        await this.close();
      await Database.delete(this._dbName);
    }

    /** Opens a database.
     *
     * @param {object} options If 'populated' is true, will add more
     *                         object stores and rows to the db at open
     */
    async open(options) {
      let firstRun = false;
      this._db = await Database.open(this._dbName, {
        todos: { keyPath: 'id', autoIncrement: true },
        search: { keyPath: 'id', autoIncrement: true, indexes: [
          { name: 'id', keyPath: 'id', unique: true },
          { name: 'messageId', keyPath: 'messageId' },
          { name: 'itemId', keyPath: 'itemId' },
          { name: 'timestamp', keyPath: 'timestamp' },
        ]},
      });

      const counts = await this._db.count('todos', [{}]);
      const isEmpty = counts[0] === 0;
      if (isEmpty && options.populated) {
        await this.populate();
      }
    }

    /** Populates a database. */
    async populate() {
      const searchStoreSize = 100000;
      const transactionSize = 2000;

      let itemId = 0;
      while (itemId < searchStoreSize) {
        const searchItems = [];
        for (let i = 0; i < transactionSize; ++i) {
          searchItems.push({
            name: `Search ${itemId}`,
            messageId: `Message ${itemId}`,
            itemId: `Item ${itemId}`,
            timestamp: Date.now(),
          });
          itemId += 1;
        }
        await this._db.putBatch('search', searchItems);
      }
    }

    /** Closes a database. */
    closeDatabase() {
      this._db.close();
      this._db = null;
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
    async find(query, callback) {
      if (!callback) return;

      // TODO: Write a rudimentary query engine that uses the indexes.
      await this.findAll(async (todos) => {
        await callback(todos.filter((todo) => {
          for (let q in query) {
            if (query[q] !== todo[q]) {
              return false;
            }
          }
          return true;
        }));
      });
    }

    /**
     * Will retrieve all data from the collection
     *
     * @param {function} callback The callback to fire upon retrieving data
     */
    async findAll(callback) {
      callback = callback || (() => {});
      if (!this._db) return;

      const todos = [];
      await this._db.iterateCursor('todos', {}, (cursor) => {
        todos.push(cursor.value);
        return true;
      });
      await callback.call(this, todos);
    }

    /**
     * Will save the given data to the DB. If no item exists it will create a new
     * item, otherwise it'll simply update an existing item's properties
     *
     * @param {number?} id The ID of an item to update; null creates a new item
     * @param {object} updateData The data to save back into the DB
     * @param {function} callback The callback to fire after saving
     */
    async save(id, updateData, callback) {
      callback = callback || (() => {});

      if (id !== null) {
        await this._db.readModifyWrite('todos', id, (data) => {
          for (let key in updateData) {
            if (updateData.hasOwnProperty(key)) {
              data[key] = updateData[key];
            }
          }
          return data;
        });
      } else {
        await this._db.putBatch('todos', [updateData]);
      }

      callback.call(this);
    }

    /**
     * Will remove an item from the Store based on its ID
     *
     * @param {number} id The ID of the item you want to remove
     */
    async remove(id) {
      await this._db.delete('todos', id);
    }

    /**
     * Will drop all storage and start fresh
     *
     * @param {function} callback The callback to fire after dropping the data
     */
    async drop() {
      await this._db.clearStore('todos');
    }
  }

  // Export to window
  window.app = window.app || {};
  window.app.Store = Store;
})(window);
