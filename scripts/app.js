/**
 * FlareTail App Framework
 * Copyright © 2015 Kohei Yoshino. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

'use strict';

let FlareTail = FlareTail || {};

FlareTail.app = {};

/* ------------------------------------------------------------------------------------------------------------------
 * Router
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Router = function Router (app) {
  // Specify the base URL of the app, without a trailing slash
  this.root = app.config.app.root.match(/(.*)\/$/)[1] || '';
  // Specify the launch path
  this.launch_path = app.config.app.launch_path || app.config.app.root || '/';
  // Retrieve routes from app components
  this.routes = new Map([for (component of Iterator(app.controllers)) if ('route' in component[1])
                          [new RegExp('^' + this.root + component[1].route + '$'), component[1]]]);

  window.addEventListener('popstate', event => this.locate());
};

FlareTail.app.Router.prototype.locate = function (path = location.pathname) {
  for (let [re, constructor] of this.routes) {
    let match = path.match(re);

    if (match) {
      new constructor(...match.slice(1));

      return;
    }
  }

  // Couldn't find a route; go to the launch path
  this.navigate(this.launch_path);
};

FlareTail.app.Router.prototype.navigate = function (path, state = {}, replace = false) {
  state.previous = replace && history.state && history.state.previous ? history.state.previous : location.pathname;

  let args = [state, 'Loading...', this.root + path]; // l10n

  replace ? history.replaceState(...args) : history.pushState(...args);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

/* ------------------------------------------------------------------------------------------------------------------
 * Events
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Events = function Events () {};

FlareTail.app.Events.prototype = Object.create(Object.prototype);
FlareTail.app.Events.prototype.constructor = FlareTail.app.Events;

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

  if (!data.id && this.id) {
    data.id = this.id;
  }

  if (FlareTail.debug) {
    console.info('Event triggered:', topic, data);
  }

  FlareTail.util.event.trigger(window, topic, { 'detail': data });
};

/*
 * Subscribe an event.
 *
 * [argument] topic (String) An event name. Shorthand syntax is supported: M:Updated in BugView means BugModel:Updated,
 *                  V:AppMenuItemSelected in ToolbarController means ToolbarView:AppMenuItemSelected, and so on. When
 *                  shorthand syntax is used, the callback function will be fired only when both the event detail object
 *                  and the instance have the same id property
 * [argument] callback (Function) A function called whenever the specified event is fired
 * [return] none
 */
FlareTail.app.Events.prototype.on = function (topic, callback) {
  let identity = false;

  topic = topic.replace(/^([MVC]):/, (match, prefix) => {
    identity = true;

    return this.constructor.name.match(/(.*)(Model|View|Controller)$/)[1]
            + { 'M': 'Model', 'V': 'View', 'C': 'Controller' }[prefix] + ':';
  });

  window.addEventListener(topic, event => {
    if (identity && event.detail && event.detail.id && this.id && event.detail.id !== this.id) {
      return false;
    }

    callback(event.detail);

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
 * [return] database (Promise -> IDBDatabase or Error) the target database
 */
FlareTail.app.DataSource.IndexedDB.prototype.open_database = function (name) {
  let request = indexedDB.open(name);

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
    'obj': store, // IDBObjectStore
    'save': obj => send(store.put(Object.assign({}, obj))), // Deproxify the object before saving
    'get': key => send(store.get(key)),
    'get_all': () => send(store.mozGetAll()),
    'delete': key => send(store.delete(key)),
    'clear': () => send(store.clear()),
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
    'get': (obj, prop) => prop in this ? this[prop] : this.data[prop],
    'set': (obj, prop, value) => {
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
    'get': (obj, prop) => obj[prop], // Always require the get trap (Bug 895223)
    'set': (obj, prop, value) => {
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

  return this.datasource.get_store(this.store_name).save(this.data).then(() => Promise.resolve(this.proxy()));
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
      } else if (this.store_type === 'simple' && item.value) {
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
 * [return] result (Boolean) true
 */
FlareTail.app.Collection.prototype.delete = function (key) {
  this.datasource.get_store(this.store_name).delete(key);
  this.map.delete(key);

  return true;
};

/* ------------------------------------------------------------------------------------------------------------------
 * View
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.View = function View () {};

FlareTail.app.View.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.View.prototype.constructor = FlareTail.app.View;

FlareTail.app.View.prototype.get_fragment = FlareTail.util.content.get_fragment;
FlareTail.app.View.prototype.fill = FlareTail.util.content.fill;
FlareTail.app.View.prototype.widget = FlareTail.widget;

/* ------------------------------------------------------------------------------------------------------------------
 * Controller
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Controller = function Controller () {};

FlareTail.app.Controller.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.Controller.prototype.constructor = FlareTail.app.Controller;

/* ------------------------------------------------------------------------------------------------------------------
 * Auto Activation
 * ------------------------------------------------------------------------------------------------------------------ */

window.addEventListener('DOMContentLoaded', event => {
  let app = window[document.querySelector('meta[name="application-name"]').content];

  // Activate router
  app.router = new FlareTail.app.Router(app);
});
