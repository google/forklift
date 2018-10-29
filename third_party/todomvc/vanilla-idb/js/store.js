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
  class DatabaseUtils {
    /** Wrap an IndexedDB request into a Promise.
     *
     * This should not be used for open().
     *
     * @param {IDBRequest} request the request to be wrapped
     * @returns {Promise<Object>} promise that resolves with the request's
     *     result, or rejects with an error
     */
    static async promiseForRequest(request) {
      return new Promise((resolve, reject) => {
        request.onsuccess = event => { resolve(event.target.result); };
        request.onerror = event => { reject(event.target.error); };
        request.onblocked = event => {
          reject(event.target.error ||
                  (new Error("blocked by other database connections")));
        };
        request.onupgradeneeded = event => {
          reject(event.target.error ||
                  (new Error("unexpected upgradeneeded event")));
        };
      });
    }

    /** Wrap an IndexedDB database open request into a Promise.
     *
     * This is intended to be used by open().
     *
     * @param {IDBOpenDBRequest} request the request to be wrapped
     * @returns {Promise<{database: idbDatabase, transaction: IDBTransaction?}>}
     *     promise that resolves with an object whose "database" property is the
     *     newly opened database; if an upgradeneeded event is received, the
     *     "transaction" property holds the upgrade transaction
     */
    static async promiseForOpenRequest(request) {
      return new Promise((resolve, reject) => {
        request.onsuccess = event => {
          resolve({ database: event.target.result, transaction: null });
        };
        request.onerror = event => { reject(event.target.error); };
        request.onblocked = event => {
          reject(event.target.error ||
                  (new Error("blocked by other database connections")));
        };
        request.onupgradeneeded = event => {
          resolve({
            database: event.target.result,
            transaction: event.target.transaction
          });
        };
      });
    }

    /** Wrap an IndexedDB transaction into a Promise.
     *
     * @param {IDBTransaction} transaction the transaction to be wrapped
     * @returns {Promise<Object>} promise that resolves with undefined when the
     *     transaction is completed, or rejects with an error if the transaction
     *     is aborted or errors out
     */
    static async promiseForTransaction(transaction) {
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => { resolve(); };
        transaction.onabort = event => { reject(event.target.error); };
        transaction.onerror = event => { reject(event.target.error); };
      });
    }

    /** Apply a database schema to an IndexedDB database.
     *
     * This must be called from a versionchange transaction.
     *
     * The current implementation builds the schema from scratch, i.e. does not
     * support diffing.
     *
     * @param {Object} dbSchema the schema applied to the database
     * @param {IDBDatabase} idbDatabase the database that the schema is applied
     *     to; must be in the middle of a versionchange transaction
     */
    static applySchema(dbSchema, idbDatabase) {
      for (let storeName in dbSchema) {
        if (!dbSchema.hasOwnProperty(storeName)) continue;

        const storeSchema = dbSchema[storeName];
        DatabaseUtils.applySchemaStore(storeSchema, storeName, idbDatabase);
      }
    }

    /** Apply a store schema to an IndexedDB object store.
     *
     * This must be called from a versionchange transaction.
     *
     * The current implementation builds the store from scratch, i.e. does not
     * support diffing.
     *
     * @param {Object} storeSchema the schema applied to the object store
     * @param {string} storeName the name given to the newly created store
     * @param {IDBDatabase} idbDatabase the database that the schema is applied
     *     to; must be in the middle of a versionchange transaction
     * @return {IDBObjectStore} the newly created object store
     */
    static applySchemaStore(storeSchema, storeName, idbDatabase) {
      const indexes = storeSchema.indexes || [];
      const options = Object.assign({}, storeSchema);
      delete options.indexes;

      const idbStore = idbDatabase.createObjectStore(storeName, options);
      for (let index of indexes) {
        const indexOptions = Object.assign({}, index);
        const indexName = index.name;
        delete indexOptions.name;
        const indexKey = index.keyPath;
        delete indexOptions.keyPath;

        idbStore.createIndex(indexName, indexKey, indexOptions);
      }
      return idbStore;
    }
  }

  class Database {
    /** Delete a database.
     *
     * @param {string} dbName The name of the databse to be deleted.
     */
    static async delete(dbName) {
      const request = indexedDB.deleteDatabase(dbName);
      return await DatabaseUtils.promiseForRequest(request);
    }

    /** Open a database.
     *
     * @param {string} dbName the name of the database to be opened
     * @param {object} dbSchema the description of the database structure
     * @return {Promise<Database>} promise that resolves with a new Database
     *     instance for the open database
     */
    static async open(dbName, dbSchema) {
      const request = indexedDB.open(dbName, 1);
      const result = await DatabaseUtils.promiseForOpenRequest(request);

      let idbDatabase = null;
      if (result.transaction === null) {
        idbDatabase = result.database;
      } else {
        DatabaseUtils.applySchema(dbSchema, result.database);
        idbDatabase = await DatabaseUtils.promiseForRequest(request);
      }

      return new Database(dbName, dbSchema, idbDatabase);
    }

    /** Do not instantiate directly. Use Database.open() instead.
     *
     * @param {string} dbName the database's name
     * @param {Object} dbSchema the database's schema
     * @param {IDBDatabase} idbDatabase the IndexedDB instance wrapped by this
     */
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
     * @param {string} storeName the name of the store getting wiped
     * @return {Promise<void>} promise that resolves with undefined when the
     *     store is wiped
     */
    async clearStore(storeName) {
      const transaction =
          this._idbDatabase.transaction([storeName], 'readwrite');
      const transactionPromise =
          DatabaseUtils.promiseForTransaction(transaction);

      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.clear();
      await DatabaseUtils.promiseForRequest(request);
      await transactionPromise;
    }

    /** Counts the number of objects that match a set of queries.
     *
     * @param {Array<{index?: string, range?: IDBKeyRange>}>} queries array with
     *     the queries; each query targets the index named |index|, or the
     *     object store (if the index does not exist); each query targets the
     *     |range| key range, or the entire object store / index if the range
     *     does not exist
     * @return {Promise<Array<number>} promise that resolves to an array with an
     *     entry for each query; the entry is the number of records matching the
     *     query
     */
    async count(storeName, queries) {
      const transaction =
          this._idbDatabase.transaction([storeName], 'readonly');
      const transactionPromise =
          DatabaseUtils.promiseForTransaction(transaction);

      const objectStore = transaction.objectStore(storeName);
      const resultPromises = [];
      for (let query of queries) {
        const dataSource = ('index' in query) ? objectStore.index(query.index)
                                              : objectStore;
        const request = ('range' in query) ? dataSource.count(query.range)
                                           : dataSource.count();
        resultPromises.push(DatabaseUtils.promiseForRequest(request));
      }
      const results = await Promise.all(resultPromises);
      await transactionPromise;
      return results;
    }

    /** Deletes an object from a store.
     *
     * @param {string} storeName the name of the store losing an object
     * @param {object} objectKey the primary key of the object to be deleted
     * @return {Promise<void>} promise that resolves to undefined when the
     *     object is deleted
     */
    async delete(storeName, objectKey) {
      const transaction =
          this._idbDatabase.transaction([storeName], 'readwrite');
      const transactionPromise =
          DatabaseUtils.promiseForTransaction(transaction);

      const objectStore = transaction.objectStore(storeName);
      const request = objectStore.delete(objectKey);
      await DatabaseUtils.promiseForRequest(request);
      await transactionPromise;
    }

    /** Reads from a store by iterating a cursor.
     *
     * @param {string} storeName the name of the store being read
     * @param {{index?: string, range?: IDBKeyRange}} query narrows down the
     *     data being read
     * @param {function(IDBCursor): boolean} cursorCallback called for each
     *     cursor yielded by the iteration; must return a truthy value to
     *     continue iteration, or a falsey value to stop iterating
     */
    async iterateCursor(storeName, query, cursorCallback) {
      const transaction =
          this._idbDatabase.transaction([storeName], 'readonly');
      const transactionPromise =
          DatabaseUtils.promiseForTransaction(transaction);

      const objectStore = transaction.objectStore(storeName);
      const dataSource = ('index' in query) ? objectStore.index(query.index)
                                            : objectStore;
      const request = ('range' in query) ? dataSource.openCursor(query.range)
                                          : dataSource.openCursor();
      while (true) {
        const cursor = await DatabaseUtils.promiseForRequest(request);
        if (!cursor)
          break;  // The iteration completed.

        const willContinue = cursorCallback(cursor);
        if (!willContinue)
          break;
        cursor.continue();
      }

      await transactionPromise;
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
        transaction.onerror = (event) => { resolve(event.target.error); };
        transaction.oncomplete = () => { resolve(); };

        const objectStore = transaction.objectStore(storeName);
        const dataSource = ('index' in query) ? objectStore.index(query.index)
                                              : objectStore;
        const request = ('range' in query) ? dataSource.openCursor(query.range)
                                           : dataSource.openCursor();

        request.onerror = (event) => { reject(event.target.error); };
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (!cursor) return;  // The iteration completed.

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
     * @param {string} storeName the name of the store receiving the objects
     * @param {Array<object>} objects the objects written to the store
     * @return {Promise<void>} promise that resolves to undefined when all the
     *     objects are written
     */
    async putBatch(storeName, objects) {
      const transaction =
          this._idbDatabase.transaction([storeName], 'readwrite');
      const transactionPromise =
          DatabaseUtils.promiseForTransaction(transaction);

      const objectStore = transaction.objectStore(storeName);
      const requestPromises = [];
      for (let object of objects) {
        const request = objectStore.put(object);
        requestPromises.push(DatabaseUtils.promiseForRequest(request));
      }
      await Promise.all(requestPromises);
      await transactionPromise;
    }

    /** Reads and writes a modified object in a single transaction.
     * @param {string} storeName the name of the changed object store
     * @param {Object} objectKey the primary key of the changed object
     * @param {function(Object) => Object} modifyCallback called with the old
     *     object, must return the modified object
     * @return {Promise<void>} promise that resolves to undefined when the
     *     modified object is written to the database
     */
    async readModifyWrite(storeName, objectKey, modifyCallback) {
      const transaction =
          this._idbDatabase.transaction([storeName], 'readwrite');
      const transactionPromise =
          DatabaseUtils.promiseForTransaction(transaction);

      const objectStore = transaction.objectStore(storeName);
      const getRequest = objectStore.get(objectKey);
      const oldObject = await DatabaseUtils.promiseForRequest(getRequest);

      const newObject = modifyCallback(oldObject);
      const putRequest = (objectStore.keyPath === null) ?
          objectStore.put(newObject, objectKey) : objectStore.put(newObject);
      await DatabaseUtils.promiseForRequest(putRequest);
      await transactionPromise;
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
