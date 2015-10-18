/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

FlareTail.app = {};

/* ------------------------------------------------------------------------------------------------------------------
 * Router
 * ------------------------------------------------------------------------------------------------------------------ */

/*
 * Get a Router instance. The routes can be defined on the app's controllers using regular expressions, e.g.
 * BzDeck.controllers.DetailsPage.route = '/bug/(\\d+)';
 *
 * [argument] app (Object) app namespace containing configurations and controllers
 * [return] router (Object) a new Router, when called with `new`
 */
FlareTail.app.Router = function Router (app) {
  // Specify the base URL of the app, without a trailing slash
  this.root = app.config.app.root.match(/(.*)\/$/)[1] || '';
  // Specify the launch path
  this.launch_path = app.config.app.launch_path || app.config.app.root || '/';
  // Specify the routes
  this.routes = new Map();

  // Retrieve the routes from app controllers
  for (let prop in app.controllers) {
    let controller = app.controllers[prop];

    if ('route' in controller) {
      this.routes.set(new RegExp(`^${this.root}${controller.route}$`), controller);
    }
  }

  window.addEventListener('popstate', event => this.locate());
};

/*
 * Find a route usually by the URL. If found, create a new instance of the corresponding controller. If not found, the
 * specified pathname is invalid, so nativate to the app's launch path instead.
 *
 * [argument] path (String, optional) URL pathname used to find a route
 * [return] result (Boolean) whether a route is found
 */
FlareTail.app.Router.prototype.locate = function (path = location.pathname) {
  for (let [re, constructor] of this.routes) {
    let match = path.match(re);

    if (match) {
      // Call the constructor when a route is found
      // Pass arguments based on the RegExp pattern, taking numeric arguments into account
      new constructor(...[for (arg of match.slice(1)) isNaN(arg) ? arg : Number(arg)]);

      return true;
    }
  }

  // Couldn't find a route; go to the launch path
  this.navigate(this.launch_path);

  return false;
};

/*
 * Navigate to the specified URL pathname by manipulating the browser history.
 *
 * [argument] path (String) URL pathname to go
 * [argument] state (Object, optional) history state object
 * [argument] replace (Boolean, optional) if true, the current history state will be replaced, otherwise appended
 * [return] none
 */
FlareTail.app.Router.prototype.navigate = function (path, state = {}, replace = false) {
  state.previous = replace && history.state && history.state.previous ? history.state.previous : location.pathname;

  let args = [state, 'Loading...', this.root + path]; // l10n

  replace ? history.replaceState(...args) : history.pushState(...args);
  window.dispatchEvent(new PopStateEvent('popstate'));

  if (FlareTail.debug) {
    console.info(replace ? 'History replaced:' : 'History added:', path, state);
  }
};

/* ------------------------------------------------------------------------------------------------------------------
 * Events
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Events = function Events () {};

FlareTail.app.Events.prototype = Object.create(Object.prototype);
FlareTail.app.Events.prototype.constructor = FlareTail.app.Events;

FlareTail.app.Events.prototype.helpers = FlareTail.helpers;

/*
 * Publish an event asynchronously on a separate thread.
 *
 * [argument] topic (String) An event name. Shorthand syntax is supported: :Updated in BugModel means BugModel:Updated,
 *                  :Error in SessionController means SessionController:Error, and so on.
 * [argument] data (Object, optional) Data to pass the subscribers. If the instance has set the id property, that id
 *                  will be automatically appended to the data
 * [return] none
 */
FlareTail.app.Events.prototype.trigger = function (topic, data = {}) {
  if (topic.match(/^:/)) {
    topic = this.constructor.name + topic;
  }

  let id = this.id;

  if (FlareTail.debug) {
    console.info('Event triggered:', topic, id || '(global)', data);
  }

  this.helpers.event.trigger(window, topic, { detail: { id, data }});
};

/*
 * Subscribe an event.
 *
 * [argument] topic (String) An event name. Shorthand syntax is supported: M:Updated in BugView means BugModel:Updated,
 *                  V:AppMenuItemSelected in ToolbarController means ToolbarView:AppMenuItemSelected, and so on
 * [argument] callback (Function) A function called whenever the specified event is fired
 * [argument] global (Boolean, optional) If true, the callback function will be fired even when the event detail object
 *                  and the instance have different id properties. Otherwise, the identity will be respected
 * [return] none
 */
FlareTail.app.Events.prototype.on = function (topic, callback, global = false) {
  topic = topic.replace(/^([MVC]):/, (match, prefix) => {
    return this.constructor.name.match(/(.*)(Model|View|Controller)$/)[1]
            + { M: 'Model', V: 'View', C: 'Controller' }[prefix] + ':';
  });

  window.addEventListener(topic, event => {
    if (!global && event.detail && event.detail.id && this.id && event.detail.id !== this.id) {
      return false;
    }

    callback(event.detail.data);

    return true;
  });
};

/* ------------------------------------------------------------------------------------------------------------------
 * DataSource
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.DataSource = function DataSource () {};

FlareTail.app.DataSource.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.DataSource.prototype.constructor = FlareTail.app.DataSource;

/* ------------------------------------------------------------------------------------------------------------------
 * DataSource: IndexedDB
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.DataSource.IndexedDB = function IDBDataSource () {};

FlareTail.app.DataSource.IndexedDB.prototype = Object.create(FlareTail.app.DataSource.prototype);
FlareTail.app.DataSource.IndexedDB.prototype.constructor = FlareTail.app.DataSource.IndexedDB;

/*
 * Open a local IndexedDB database by name, and return it.
 *
 * [argument] name (String) name of the database
 * [argument] version (Integer) database version
 * [return] database (Promise -> IDBDatabase or Error) the target database
 */
FlareTail.app.DataSource.IndexedDB.prototype.open_database = function (name, version = 1) {
  let request = indexedDB.open(name, version);

  return new Promise((resolve, reject) => {
    // Create object stores when the database is created or upgraded
    request.addEventListener('upgradeneeded', event => {
      if (typeof this.onupgradeneeded === 'function') {
        this.onupgradeneeded(event);
      }
    });

    request.addEventListener('success', event => {
      this.database = event.target.result;
      resolve(event.target.result);
    });

    request.addEventListener('error', event => {
      reject(new Error('Failed to open the database. \
                        Make sure you’re not using private browsing mode or IndexedDB doesn’t work.'))
    });
  });
};

/*
 * Get a IndexedDB store in a convenient way.
 *
 * [argument] name (String) name of the object store
 * [argument] return_request (Boolean) if true, operation methods return IDBRequest instead of result Array
 * [return] store (Object) set of operation methods that return a Promise
 */
FlareTail.app.DataSource.IndexedDB.prototype.get_store = function (name, return_request = false) {
  let store = this.database.transaction(name, 'readwrite').objectStore(name);

  let send = request => new Promise((resolve, reject) => {
    request.addEventListener('success', event => resolve(return_request ? event.target : event.target.result));
    request.addEventListener('error', event => reject(event.target.error));
  });

  return {
    obj: store, // IDBObjectStore
    save: obj => send(store.put(Object.assign({}, obj))), // Deproxify the object before saving
    get: key => send(store.get(key)),
    get_all: () => send(store.mozGetAll()),
    delete: key => send(store.delete(key)),
    clear: () => send(store.clear()),
  };
};

/* ------------------------------------------------------------------------------------------------------------------
 * Model
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Model = function Model () {};

FlareTail.app.Model.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.Model.prototype.constructor = FlareTail.app.Model;

/*
 * Get a proxified 'this' object, so consumers can access data seamlessly using obj.prop instead of obj.data.prop
 *
 * [argument] none
 * [return] this (Proxy) proxified 'this' object
 */
FlareTail.app.Model.prototype.proxy = function (data) {
  return new Proxy(this, {
    get: (obj, prop) => prop in this ? this[prop] : this.data[prop],
    set: (obj, prop, value) => {
      prop in this ? this[prop] = value : this.data[prop] = value;

      return true; // The set trap must return true (Bug 1132522)
    },
  });
};

/*
 * Cache data as a new Proxy, so the object is automatically saved when a property is modifled.
 *
 * [argument] data (Object) raw data object
 * [return] data (Proxy) proxified data object
 */
FlareTail.app.Model.prototype.cache = function (data) {
  // Deproxify the object just in case
  data = Object.assign({}, data);

  return this.data = new Proxy(data, {
    set: (obj, prop, value) => {
      obj[prop] = value;
      this.datasource.get_store(this.store_name).save(obj);

      return true; // The set trap must return true (Bug 1132522)
    },
  });
};

/*
 * Save data in the local IndexedDB storage.
 *
 * [argument] data (Object, optional) raw data object
 * [return] item (Promise -> Proxy) proxified instance of the model object
 */
FlareTail.app.Model.prototype.save = function (data = undefined) {
  if (data) {
    this.cache(data);
  }

  return this.datasource.get_store(this.store_name).save(this.data).then(() => {
    if (FlareTail.debug) {
      console.info('Data saved:', this.constructor.name, this.data);
    }

    return Promise.resolve(this.proxy());
  });
};

/* ------------------------------------------------------------------------------------------------------------------
 * Collection, a set of Models
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Collection = function Collection () {};

FlareTail.app.Collection.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.Collection.prototype.constructor = FlareTail.app.Collection;

/*
 * Load the all data from local IndexedDB, create a new model instance for each item, then cache them in a new Map for
 * faster access.
 *
 * [argument] none
 * [return] items (Promise -> Map(String or Number, Proxy)) new instances of the model object
 */
FlareTail.app.Collection.prototype.load = function () {
  let store = this.datasource.get_store(this.store_name);

  return store.get_all().then(items => {
    this.map = new Map(items.map(item => {
      let key = item[store.obj.keyPath],
          value;

      if (this.model) {
        // Get a new instance
        value = new this.model(item);
      } else if (this.store_type === 'simple') {
        // Use the value only
        value = item.value;
      } else {
        // Use the object as is
        value = item;
      }

      return [key, value];
    }));

    return Promise.resolve(this.map);
  });
};

/*
 * Set or add an item data to the database.
 *
 * [argument] key (Number or String) key of the item
 * [argument] value (Mixed) raw data object or any value
 * [return] item (Proxy) new instance of the model object
 */
FlareTail.app.Collection.prototype.set = function (key, value) {
  if (this.model) {
    value = new this.model(value);
    value.save();
  } else {
    let store = this.datasource.get_store(this.store_name);

    // Support simple key-value data
    store.save(this.store_type === 'simple' ? { [store.obj.keyPath]: key, value } : value);

    if (FlareTail.debug) {
      console.info('Data saved:', this.constructor.name, key, value);
    }
  }

  this.map.set(key, value);

  return value;
};

/*
 * Get an item by a specific key.
 *
 * [argument] key (Number or String) key of the item
 * [argument] fallback_data (Object, optional) if an item is not found, create a new model object with this data
 * [return] item (Proxy or undefined) new instance of the model object
 */
FlareTail.app.Collection.prototype.get = function (key, fallback_data = undefined) {
  if (this.has(key)) {
    return this.map.get(key);
  }

  if (fallback_data) {
    return this.set(key, fallback_data);
  }

  return undefined;
};

/*
 * Get items by specific keys.
 *
 * [argument] keys (Array(String or Number) or Set(String or Number)) key list
 * [return] items (Map(String or Number, Proxy)) new instances of the model object
 */
FlareTail.app.Collection.prototype.get_some = function (keys) {
  return new Map([for (key of keys) [key, this.get(key)]]);
};

/*
 * Get all items locally-stored in IndexedDB.
 *
 * [argument] none
 * [return] items (Map(String or Number, Proxy)) new instances of the model object
 */
FlareTail.app.Collection.prototype.get_all = function () {
  return this.map;
};

/*
 * Check if an item with a specific key is in the database.
 *
 * [argument] key (Number or String) key of the item
 * [return] result (Boolean) whether the item exists
 */
FlareTail.app.Collection.prototype.has = function (key) {
  return this.map.has(key);
};

/*
 * Delete an item by a specific key.
 *
 * [argument] key (Number or String) key of the item
 * [return] result (Promise -> undefined)
 */
FlareTail.app.Collection.prototype.delete = function (key) {
  this.map.delete(key);

  return this.datasource.get_store(this.store_name).delete(key);
};

/* ------------------------------------------------------------------------------------------------------------------
 * View
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.View = function View () {};

FlareTail.app.View.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.View.prototype.constructor = FlareTail.app.View;

FlareTail.app.View.prototype.get_fragment = FlareTail.helpers.content.get_fragment;
FlareTail.app.View.prototype.get_template = FlareTail.helpers.content.get_template;
FlareTail.app.View.prototype.fill = FlareTail.helpers.content.fill;
FlareTail.app.View.prototype.widgets = FlareTail.widgets;

/* ------------------------------------------------------------------------------------------------------------------
 * Helper
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Helper = function Helper () {};

FlareTail.app.Helper.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.Helper.prototype.constructor = FlareTail.app.Helper;

FlareTail.app.Helper.prototype.get_fragment = FlareTail.helpers.content.get_fragment;
FlareTail.app.Helper.prototype.get_template = FlareTail.helpers.content.get_template;
FlareTail.app.Helper.prototype.fill = FlareTail.helpers.content.fill;
FlareTail.app.Helper.prototype.widgets = FlareTail.widgets;

/* ------------------------------------------------------------------------------------------------------------------
 * Controller
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Controller = function Controller () {};

FlareTail.app.Controller.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.Controller.prototype.constructor = FlareTail.app.Controller;
