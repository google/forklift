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

/*jshint laxbreak:true */
(function (window) {
    'use strict';

    var htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#x27;',
        '`': '&#x60;'
    };

    var escapeHtmlChar = function (chr) {
        return htmlEscapes[chr];
    };

    var reUnescapedHtml = /[&<>"'`]/g;
    var reHasUnescapedHtml = new RegExp(reUnescapedHtml.source);

    var escape = function (string) {
        return (string && reHasUnescapedHtml.test(string))
            ? string.replace(reUnescapedHtml, escapeHtmlChar)
            : string;
    };

    var formatDate = function (datetime) {
      var date = new Date(datetime);
      return `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;
    }

    /**
     * Sets up defaults for all the Template methods such as a default template
     *
     * @constructor
     */
    function Template() {
        this.defaultTemplate
        =    '<li data-id="{{id}}" class="{{completed}}">'
        +        '<div class="view">'
        +            '<input class="toggle" type="checkbox" {{checked}}>'
        +            '<label>{{title}} '
        +            '<div class="view-info">Created: {{createdAt}}, '
        +            'Due: {{dueAt}}</div> '
        +            '</label>'
        +            '<button class="destroy"></button>'
        +        '</div>'
        +    '</li>';
    }

    /**
     * Creates an <li> HTML string and returns it for placement in your app.
     *
     * NOTE: In real life you should be using a templating engine such as Mustache
     * or Handlebars, however, this is a vanilla JS example.
     *
     * @param {object} data The object containing keys you want to find in the
     *                      template to replace.
     * @returns {string} HTML String of an <li> element
     *
     * @example
     * view.show({
     *    id: 1,
     *    title: "Hello World",
     *    completed: 0,
     * });
     */
    Template.prototype.show = function (data) {
        var i, l;
        var view = '';

        for (i = 0, l = data.length; i < l; i++) {
            var template = this.defaultTemplate;
            var completed = '';
            var checked = '';

            if (data[i].completed) {
                completed = 'completed';
                checked = 'checked';
            }

            template = template.replace('{{id}}', data[i].id);
            template = template.replace('{{title}}', escape(data[i].title));
            template = template.replace('{{createdAt}}', formatDate(data[i].createdAt));
            template = template.replace('{{dueAt}}', formatDate(data[i].dueAt));
            template = template.replace('{{completed}}', completed);
            template = template.replace('{{checked}}', checked);

            view = view + template;
        }

        return view;
    };

    /**
     * Displays a counter of how many to dos are left to complete
     *
     * @param {number} activeTodos The number of active todos.
     * @returns {string} String containing the count
     */
    Template.prototype.itemCounter = function (activeTodos) {
        var plural = activeTodos === 1 ? '' : 's';

        return '<strong>' + activeTodos + '</strong> item' + plural + ' left';
    };

    /**
     * Updates the text within the "Clear completed" button
     *
     * @param  {[type]} completedTodos The number of completed todos.
     * @returns {string} String containing the count
     */
    Template.prototype.clearCompletedButton = function (completedTodos) {
        if (completedTodos > 0) {
            return 'Clear completed';
        } else {
            return '';
        }
    };

    // Export to window
    window.app = window.app || {};
    window.app.Template = Template;
})(window);
