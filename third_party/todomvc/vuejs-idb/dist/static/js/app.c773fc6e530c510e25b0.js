webpackJsonp([1],{"4maY":function(e,t,o){"use strict";var n=function(){var e=this,t=e.$createElement,o=e._self._c||t;return o("div",{attrs:{id:"app"}},[o("Todos")],1)},l=[],i={render:n,staticRenderFns:l};t.a=i},EHTI:function(e,t,o){"use strict";function n(e){o("URoA")}Object.defineProperty(t,"__esModule",{value:!0});var l=o("eXNe"),i=o.n(l);for(var s in l)["default","default"].indexOf(s)<0&&function(e){o.d(t,e,function(){return l[e]})}(s);var a=o("mCY7"),r=o("VU/8"),c=n,d=r(i.a,a.a,!1,c,null,null);t.default=d.exports},M93x:function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=o("xJD8"),l=o.n(n);for(var i in n)["default","default"].indexOf(i)<0&&function(e){o.d(t,e,function(){return n[e]})}(i);var s=o("4maY"),a=o("VU/8"),r=a(l.a,s.a,!1,null,null,null);t.default=r.exports},NHnr:function(e,t,o){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}var l=o("7+uW"),i=n(l),s=o("M93x"),a=n(s),r=o("rmnh"),c=n(r);window.VueApp=new i.default({el:"#app",render:function(e){return e(a.default)}});var d=new c.default.Router;["all","active","completed"].forEach(function(e){d.on(e,function(){window.VueApp.filter=e})}),d.configure({notfound:function(){window.location.hash="",window.VueApp.filter="all"}}),d.init()},URoA:function(e,t){},eXNe:function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=o("7+uW"),l=function(e){return e&&e.__esModule?e:{default:e}}(n);t.default={data:function(){return{todos:[],newTodo:"",filter:"all",allDone:!1,editing:null}},filters:{pluralize:function(e){return 1===e?"item":"items"}},directives:{todoFocus:function(e,t){t&&l.default.nextTick(function(t){e.focus()})}},methods:{addTodo:function(){this.todos.push({completed:!1,title:this.newTodo}),this.newTodo=""},deleteTodo:function(e){this.todos=this.todos.filter(function(t){return t!==e})},deleteCompleted:function(){this.todos=this.todos.filter(function(e){return!e.completed})},editTodo:function(e){this.editing=e},doneEdit:function(){this.editing=null}},computed:{remaining:function(){return this.todos.filter(function(e){return!e.completed}).length},completed:function(){return this.todos.filter(function(e){return e.completed}).length},filteredTodos:function(){return"active"===this.filter?this.todos.filter(function(e){return!e.completed}):"completed"===this.filter?this.todos.filter(function(e){return e.completed}):this.todos},allDone:{get:function(){return 0===this.remaining},set:function(e){this.todos.forEach(function(t){t.completed=e})}}}}},mCY7:function(e,t,o){"use strict";var n=function(){var e=this,t=e.$createElement,o=e._self._c||t;return o("section",{staticClass:"todoapp"},[o("header",{staticClass:"header"},[o("h1",[e._v("Todos")]),e._v(" "),o("input",{directives:[{name:"model",rawName:"v-model",value:e.newTodo,expression:"newTodo"}],staticClass:"new-todo",attrs:{type:"text",autofocus:"",autocomplete:"off",placeholder:"What needs to be done?"},domProps:{value:e.newTodo},on:{keyup:function(t){return"button"in t||!e._k(t.keyCode,"enter",13,t.key,"Enter")?e.addTodo(t):null},input:function(t){t.target.composing||(e.newTodo=t.target.value)}}})]),e._v(" "),o("section",{directives:[{name:"show",rawName:"v-show",value:e.todos.length,expression:"todos.length"}],staticClass:"main"},[o("input",{directives:[{name:"model",rawName:"v-model",value:e.allDone,expression:"allDone"}],staticClass:"toggle-all",attrs:{type:"checkbox"},domProps:{checked:Array.isArray(e.allDone)?e._i(e.allDone,null)>-1:e.allDone},on:{change:function(t){var o=e.allDone,n=t.target,l=!!n.checked;if(Array.isArray(o)){var i=e._i(o,null);n.checked?i<0&&(e.allDone=o.concat([null])):i>-1&&(e.allDone=o.slice(0,i).concat(o.slice(i+1)))}else e.allDone=l}}}),e._v(" "),o("ul",{staticClass:"todo-list"},e._l(e.filteredTodos,function(t){return o("li",{staticClass:"todo",class:{completed:t.completed,editing:t===e.editing}},[o("div",{staticClass:"view"},[o("input",{directives:[{name:"model",rawName:"v-model",value:t.completed,expression:"todo.completed"}],staticClass:"toggle",attrs:{type:"checkbox"},domProps:{checked:Array.isArray(t.completed)?e._i(t.completed,null)>-1:t.completed},on:{change:function(o){var n=t.completed,l=o.target,i=!!l.checked;if(Array.isArray(n)){var s=e._i(n,null);l.checked?s<0&&e.$set(t,"completed",n.concat([null])):s>-1&&e.$set(t,"completed",n.slice(0,s).concat(n.slice(s+1)))}else e.$set(t,"completed",i)}}}),e._v(" "),o("label",{on:{dblclick:function(o){e.editTodo(t)}}},[e._v(e._s(t.title))]),e._v(" "),o("button",{staticClass:"destroy",on:{click:function(o){o.preventDefault(),e.deleteTodo(t)}}})]),e._v(" "),o("input",{directives:[{name:"model",rawName:"v-model",value:t.title,expression:"todo.title"},{name:"todoFocus",rawName:"v-todoFocus",value:t===e.editing,expression:"todo === editing"}],staticClass:"edit",attrs:{type:"text"},domProps:{value:t.title},on:{keyup:function(t){return"button"in t||!e._k(t.keyCode,"enter",13,t.key,"Enter")?e.doneEdit(t):null},blur:e.doneEdit,input:function(o){o.target.composing||e.$set(t,"title",o.target.value)}}})])}))]),e._v(" "),o("footer",{directives:[{name:"show",rawName:"v-show",value:e.todos.length>0,expression:"todos.length > 0"}],staticClass:"footer"},[o("span",{staticClass:"todo-count"},[o("strong",[e._v(e._s(e.remaining))]),e._v(" "+e._s(e._f("pluralize")(e.remaining))+" left\n        ")]),e._v(" "),o("ul",{staticClass:"filters"},[o("li",[o("a",{class:{selected:"all"==e.filter},attrs:{href:"#/all"},on:{click:function(t){e.filter="all"}}},[e._v("All")])]),e._v(" "),o("li",[o("a",{class:{selected:"active"==e.filter},attrs:{href:"#/active"},on:{click:function(t){e.filter="active"}}},[e._v("Active")])]),e._v(" "),o("li",[o("a",{class:{selected:"completed"==e.filter},attrs:{href:"#/completed"},on:{click:function(t){e.filter="completed"}}},[e._v("Completed")])])]),e._v(" "),o("button",{directives:[{name:"show",rawName:"v-show",value:e.completed,expression:"completed"}],staticClass:"clear-completed",on:{click:function(t){return t.preventDefault(),e.deleteCompleted(t)}}},[e._v("Clear Completed")])])])},l=[],i={render:n,staticRenderFns:l};t.a=i},xJD8:function(e,t,o){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var n=o("EHTI"),l=function(e){return e&&e.__esModule?e:{default:e}}(n);t.default={name:"app",components:{Todos:l.default}}}},["NHnr"]);
//# sourceMappingURL=app.c773fc6e530c510e25b0.js.map