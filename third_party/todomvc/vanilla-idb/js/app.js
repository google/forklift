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

/*global app, $on */
(() => {
  'use strict';

  class Todo {
    /** Sets up a brand new Todo list.
     *
     * @param {string} name The name of your new to do list.
     */
    constructor(name) {
      this.storage = new app.Store(name);
      this.model = new app.Model(this.storage);
      this.template = new app.Template();
      this.view = new app.View(this.template);
      this.controller = new app.Controller(this.model, this.view);
    }
  }

  const todo = new Todo('vanilla-idb');

  // Only auto-open the DB if ?open=0 is not passed in the URL.
  const parsedUrl = new URL(window.location.href);
  const openStore = (parsedUrl.searchParams.get("open") !== "0");

  if (openStore) {
    todo.storage.open({ populated: false }).then(() => {
      // Force the page to update after the DB is opened.
      todo.controller._filter(true);
    });
  }

  const setView = () => {
    todo.controller.setView(document.location.hash);
  };
  $on(window, 'load', setView);
  $on(window, 'hashchange', setView);

  // Export todo to the window object.
  window.todo = todo;
})();
