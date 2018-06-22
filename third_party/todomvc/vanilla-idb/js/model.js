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
     * Creates a new Model instance and hooks up the storage.
     *
     * @constructor
     * @param {object} storage A reference to the client side storage class
     */
    function Model(storage) {
        this.storage = storage;
    }

    /**
     * Creates a new todo model
     *
     * @param {string} [title] The title of the task
     * @param {function} [callback] The callback to fire after the model is created
     */
    Model.prototype.create = async function (title, callback) {
        title = title || '';
        callback = callback || function () {};

        var newItem = {
            title: title.trim(),
            completed: false
        };

        await this.storage.save(newItem, callback);
    };

    /**
     * Finds and returns a model in storage. If no query is given it'll simply
     * return everything. If you pass in a string or number it'll look that up as
     * the ID of the model to find. Lastly, you can pass it an object to match
     * against.
     *
     * @param {string|number|object} [query] A query to match models against
     * @param {function} [callback] The callback to fire after the model is found
     *
     * @example
     * model.read(1, func); // Will find the model with an ID of 1
     * model.read('1'); // Same as above
     * //Below will find a model with foo equalling bar and hello equalling world.
     * model.read({ foo: 'bar', hello: 'world' });
     */
    Model.prototype.read = async function (query, callback) {
        var queryType = typeof query;
        callback = callback || function () {};

        if (queryType === 'function') {
            callback = query;
            return await this.storage.findAll(callback);
        } else if (queryType === 'string' || queryType === 'number') {
            query = parseInt(query, 10);
            await this.storage.find({ id: query }, callback);
        } else {
            await this.storage.find(query, callback);
        }
    };

    /**
     * Updates a model by giving it an ID, data to update, and a callback to fire when
     * the update is complete.
     *
     * @param {number} id The id of the model to update
     * @param {object} data The properties to update and their new value
     * @param {function} callback The callback to fire when the update is complete.
     */
    Model.prototype.update = async function (id, data, callback) {
        await this.storage.save(data, callback, id);
    };

    /**
     * Removes a model from storage
     *
     * @param {number} id The ID of the model to remove
     * @param {function} callback The callback to fire when the removal is complete.
     */
    Model.prototype.remove = async function (id, callback) {
        await this.storage.remove(id, callback);
    };

    /**
     * WARNING: Will remove ALL data from storage.
     *
     * @param {function} callback The callback to fire when the storage is wiped.
     */
    Model.prototype.removeAll = async function (callback) {
        await this.storage.drop(callback);
    };

    /**
     * Returns a count of all todos
     */
    Model.prototype.getCount = async function (callback) {
        var todos = {
            active: 0,
            completed: 0,
            total: 0
        };

        await this.storage.findAll(async function (data) {
            data.forEach(function (todo) {
                if (todo.completed) {
                    todos.completed++;
                } else {
                    todos.active++;
                }

                todos.total++;
            });
            callback(todos);
        });
    };

    // Export to window
    window.app = window.app || {};
    window.app.Model = Model;
})(window);
