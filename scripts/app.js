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

// Publish
FlareTail.app.Events.prototype.trigger = function (topic, data = {}) {
  if (topic.match(/^:/)) {
    topic = this.constructor.name + topic;
    topic += this.id ? ':' + this.id : '';
  }

  FlareTail.util.event.trigger(window, topic, { 'detail': data });
};

// Subscribe
FlareTail.app.Events.prototype.on = function (topic, callback) {
  if (topic.match(/^[VC]:/)) {
    topic = topic.replace(/^V:/, this.constructor.name.replace(/(.*)Controller$/, '$1View:'));
    topic = topic.replace(/^C:/, this.constructor.name.replace(/(.*)View$/, '$1Controller:'));
    topic += this.id ? ':' + this.id : '';
  }

  window.addEventListener(topic, event => callback(event.detail));
};

/* ------------------------------------------------------------------------------------------------------------------
 * Model
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Model = function Model () {};

FlareTail.app.Model.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.Model.prototype.constructor = FlareTail.app.Model;

FlareTail.app.Model.prototype.get_transaction = function (db_name, store_name) {
  let app = window[document.querySelector('meta[name="application-name"]').content]; // FIXME

  return app.models[db_name].database.transaction(store_name, 'readwrite');
};

FlareTail.app.Model.prototype.get_store = function (db_name, store_name) {
  let store = this.get_transaction(db_name, store_name).objectStore(store_name),
      send = request => new Promise((resolve, reject) => {
        request.addEventListener('success', event => resolve(event.target.result));
        request.addEventListener('error', event => reject(event.target.error));
      });

  return {
    'save': obj => send(store.put(Object.assign({}, obj))), // Deproxify the object before saving
    'get': key => send(store.get(key)),
    'get_all': () => send(store.mozGetAll()),
    'delete': key => send(store.delete(key)),
    'clear': () => send(store.clear()),
  };
};

FlareTail.app.Model.prototype.open_database = function (req) {
  return new Promise((resolve, reject) => {
    req.addEventListener('success', event => resolve(event.target.result));
    req.addEventListener('error', event => reject(new Error('Failed to open the database. Make sure you’re not using \
                                                             private browsing mode or IndexedDB doesn’t work.')));
  });
};

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
      this.store.save(obj);

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

  return this.store.save(this.data).then(() => Promise.resolve(this.proxy()));
};

/* ------------------------------------------------------------------------------------------------------------------
 * Collection
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.app.Collection = function Collection () {};

FlareTail.app.Collection.prototype = Object.create(FlareTail.app.Events.prototype);
FlareTail.app.Collection.prototype.constructor = FlareTail.app.Collection;

FlareTail.app.Collection.prototype.key_name = 'id';
FlareTail.app.Collection.prototype.map = new Map();

FlareTail.app.Collection.prototype.get_transaction = function (db_name, store_name) {
  let app = window[document.querySelector('meta[name="application-name"]').content]; // FIXME

  return app.models[db_name].database.transaction(store_name, 'readwrite');
};

FlareTail.app.Collection.prototype.get_store = function (db_name, store_name) {
  let store = this.get_transaction(db_name, store_name).objectStore(store_name),
      send = request => new Promise((resolve, reject) => {
        request.addEventListener('success', event => resolve(event.target.result));
        request.addEventListener('error', event => reject(event.target.error));
      });

  return {
    'save': obj => send(store.put(Object.assign({}, obj))), // Deproxify the object before saving
    'get': key => send(store.get(key)),
    'get_all': () => send(store.mozGetAll()),
    'delete': key => send(store.delete(key)),
    'clear': () => send(store.clear()),
  };
};

FlareTail.app.Collection.prototype.open_database = function (req) {
  return new Promise((resolve, reject) => {
    req.addEventListener('success', event => resolve(event.target.result));
    req.addEventListener('error', event => reject(new Error('Failed to open the database. Make sure you’re not using \
                                                             private browsing mode or IndexedDB doesn’t work.')));
  });
};

/*
 * Load the all data from local IndexedDB, create a new model instance for each item, then cache them in a new Map for
 * faster access.
 *
 * [argument] none
 * [return] items (Promise -> Map(String or Number, Proxy)) new instances of the model object
 */
FlareTail.app.Collection.prototype.load = function () {
  return this.get_store(this.db_name, this.store_name).get_all().then(items => {
    this.map = new Map([for (item of items) [item[this.key_name], new this.model(item)]]);

    return Promise.resolve(this.map);
  });
};

/*
 * Add an item data to the database.
 *
 * [argument] data (Object) raw data object
 * [return] item (Proxy) new instance of the model object
 */
FlareTail.app.Collection.prototype.add = function (data) {
  let item = new this.model(data);

  item.save();
  this.map.set(item[this.key_name], item);

  return item;
};

/*
 * Check if an item with a specific key is in the database.
 *
 * [argument] key (Number or String) key of the item
 * [return] result (Boolean) whether the item exists
 */
FlareTail.app.Collection.prototype.has = function (key) {
  if (typeof key === 'string' && key.match(/^\d+$/)) {
    key = Number.parseInt(key);
  }

  return this.map.has(key);
};

/*
 * Get an item by a specific key.
 *
 * [argument] key (Number or String) key of the item
 * [argument] fallback_data (Object, optional) if an item is not found, create a new model object with this data
 * [return] item (Proxy or undefined) new instance of the model object
 */
FlareTail.app.Collection.prototype.get = function (key, fallback_data = undefined) {
  if (typeof key === 'string' && key.match(/^\d+$/)) {
    key = Number.parseInt(key);
  }

  if (this.has(key)) {
    return this.map.get(key);
  }

  if (fallback_data) {
    fallback_data[this.key_name] = key;

    return this.add(fallback_data);
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
