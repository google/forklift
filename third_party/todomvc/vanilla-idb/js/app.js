/*global app, $on */
(function () {
    'use strict';

    /**
     * Sets up a brand new Todo list.
     *
     * @param {string} name The name of your new to do list.
     */
    function Todo(name) {
        this.storage = new app.Store(name);
        this.model = new app.Model(this.storage);
        this.template = new app.Template();
        this.view = new app.View(this.template);
        this.controller = new app.Controller(this.model, this.view);
    }

    var todo = new Todo('vanilla-idb');

    // Only auto-open the DB if ?open=0 is not passed in the URL.
    var openStore = true;
    const parsedUrl = new URL(window.location.href);
    if (parsedUrl.searchParams.get("open") === "0") {
        openStore = false;
    }

    if (openStore) {
        todo.storage.open({populated: false}, function () {
            // Force the page to update after the DB is opened.
            todo.controller._filter(true);
        });
    }

    function setView() {
        todo.controller.setView(document.location.hash);
    }
    $on(window, 'load', setView);
    $on(window, 'hashchange', setView);

    // Export todo to the window object.
    window.todo = todo;
})();
