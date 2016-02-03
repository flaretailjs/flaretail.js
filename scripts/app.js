/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Provide a lightweight application framework.
 */
FlareTail.app = {};

/*
 * Provide app router functionalities. The routes can be defined on the app's controllers using regular expressions,
 * e.g. BzDeck.controllers.DetailsPage.route = '/bug/(\\d+)';
 */
FlareTail.app.Router = class Router {
  /**
   * Get a Router instance.
   * @constructor
   * @argument {Object} app - App namespace containing configurations and controllers.
   * @return {Object} router
   */
  constructor (app) {
    // Specify the base URL of the app, without a trailing slash
    this.root = app.config.app.root.match(/(.*)\/$/)[1] || '';
    // Specify the launch path
    this.launch_path = app.config.app.launch_path || app.config.app.root || '/';
    // Specify the routes
    this.routes = new Map();

    // Retrieve the routes from app controllers
    for (let [prop, controller] of Object.entries(app.controllers)) {
      if ('route' in controller) {
        this.routes.set(new RegExp(`^${this.root}${controller.route}$`), controller);
      }
    }

    window.addEventListener('popstate', event => this.locate());
  }

  /**
   * Find a route usually by the URL. If found, create a new instance of the corresponding controller. If not found, the
   * specified pathname is invalid, so nativate to the app's launch path instead.
   * @argument {String} [path=location.pathname] - URL pathname used to find a route.
   * @return {Boolean} result - Whether a route is found.
   */
  locate (path = location.pathname) {
    for (let [re, constructor] of this.routes) {
      let match = path.match(re);

      if (match) {
        // Call the constructor when a route is found
        // Pass arguments based on the RegExp pattern, taking numeric arguments into account
        new constructor(...match.slice(1).map(arg => isNaN(arg) ? arg : Number(arg)));

        return true;
      }
    }

    // Couldn't find a route; go to the launch path
    this.navigate(this.launch_path);

    return false;
  }

  /**
   * Navigate to the specified URL pathname by manipulating the browser history.
   * @argument {String} path - URL pathname to go.
   * @argument {Object} [state={}] - History state object.
   * @argument {Boolean} [replace=false] - If true, the current history state will be replaced, otherwise appended.
   * @return {undefined}
   */
  navigate (path, state = {}, replace = false) {
    state.previous = replace && history.state && history.state.previous ? history.state.previous : location.pathname;

    let args = [state, 'Loading...', this.root + path]; // l10n

    replace ? history.replaceState(...args) : history.pushState(...args);
    window.dispatchEvent(new PopStateEvent('popstate'));

    if (FlareTail.debug) {
      console.info(replace ? 'History replaced:' : 'History added:', path, state);
    }
  }
}

/**
 * Provide app event functionalities. 
 */
FlareTail.app.Events = class Events {
  /**
   * Publish an event asynchronously on a separate thread.
   * @argument {String} topic - An event name. Shorthand syntax is supported: :Updated in BugModel means
   *  BugModel:Updated, :Error in SessionController means SessionController:Error, and so on.
   * @argument {Object} [data={}] - Data to pass the subscribers. If the instance has set the id property, that id will
   *  be automatically appended to the data.
   * @return {undefined}
   */
  trigger (topic, data = {}) {
    if (topic.match(/^:/)) {
      topic = this.constructor.name + topic;
    }

    let id = this.id;

    if (FlareTail.debug) {
      console.info('Event triggered:', topic, id || '(global)', data);
    }

    this.helpers.event.trigger(window, topic, { detail: { id, data }});
  }

  /**
   * Subscribe an event.
   * @argument {String} topic - Event name. Shorthand syntax is supported: M:Updated in BugView means BugModel:Updated,
   *  V:AppMenuItemSelected in ToolbarController means ToolbarView:AppMenuItemSelected, and so on.
   * @argument {Function} callback - Function called whenever the specified event is fired.
   * @argument {Boolean} [global=false] - If true, the callback function will be fired even when the event detail object
   *  and the instance have different id properties. Otherwise, the identity will be respected.
   * @return {undefined}
   */
  on (topic, callback, global = false) {
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
  }

  /**
   * Subscribe an event with an automatically determined callback. So this is the 'on' function's shorthand. For
   * example, if the topic is 'V:NavigationRequested', on_navigation_requested will be set as the callback function.
   * @argument {String} topic - See the 'on' function above for details.
   * @argument {Boolean} [global=false] - See the 'on' function above for details.
   * @return {undefined}
   */
  subscribe (topic, global = false) {
    this.on(topic, data => this[topic.replace(/^.+?\:/, 'on').replace(/([A-Z])/g, '_$1').toLowerCase()](data), global);
  }
}

FlareTail.app.Events.prototype.helpers = FlareTail.helpers,

/**
 * Provide app datasource functionalities. 
 * @extends FlareTail.app.Events
 */
FlareTail.app.DataSource = class DataSource extends FlareTail.app.Events {}

/**
 * Provide IndexedDB datasource functionalities. 
 * @extends FlareTail.app.DataSource
 */
FlareTail.app.DataSource.IndexedDB = class IDBDataSource extends FlareTail.app.DataSource {
  /**
   * Open a local IndexedDB database by name, and return it.
   * @argument {String} name - Name of the database.
   * @argument {Integer} version - Database version.
   * @return {Promise.<(IDBDatabase|Error)>} database - The target database.
   */
  open_database (name, version = 1) {
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
  }

  /**
   * Get a IndexedDB store in a convenient way.
   * @argument {String} name - Name of the object store.
   * @argument {Boolean} [return_request=false] - If true, operation methods return IDBRequest instead of result Array.
   * @return {Object} store - Set of operation methods that return a Promise.
   */
  get_store (name, return_request = false) {
    let store = this.database.transaction(name, 'readwrite').objectStore(name);

    let send = request => new Promise((resolve, reject) => {
      request.addEventListener('success', event => resolve(return_request ? event.target : event.target.result));
      request.addEventListener('error', event => reject(event.target.error));
    });

    return {
      obj: store, // IDBObjectStore
      save: obj => send(store.put(Object.assign({}, obj))), // Deproxify the object before saving
      get: key => send(store.get(key)),
      get_all: () => send(store.getAll()),
      delete: key => send(store.delete(key)),
      clear: () => send(store.clear()),
    };
  }
}

/**
 * Provide app model functionalities. 
 * @extends FlareTail.app.Events
 */
FlareTail.app.Model = class Model extends FlareTail.app.Events {
  /**
   * Get a proxified `this` object, so consumers can access data seamlessly using obj.prop instead of obj.data.prop.
   * @argument {undefined}
   * @return {Proxy} this - Proxified `this` object.
   */
  proxy () {
    return new Proxy(this, {
      get: (obj, prop) => prop in this ? this[prop] : this.data[prop],
      set: (obj, prop, value) => {
        prop in this ? this[prop] = value : this.data[prop] = value;

        return true; // The set trap must return true (Bug 1132522)
      },
    });
  }

  /**
   * Cache data as a new Proxy, so the object is automatically saved when a property is modifled.
   * @argument {Object} data - Raw data object.
   * @return {Proxy} data - Proxified data object.
   */
  cache (data) {
    // Deproxify the object just in case
    data = Object.assign({}, data);

    return this.data = new Proxy(data, {
      set: (obj, prop, value) => {
        obj[prop] = value;
        this.datasource.get_store(this.store_name).save(obj);

        return true; // The set trap must return true (Bug 1132522)
      },
    });
  }

  /**
   * Save data in the local IndexedDB storage.
   * @argument {Object} [data] - Raw data object.
   * @return {Promise.<Proxy>} item - Proxified instance of the model object.
   */
  save (data = undefined) {
    if (data) {
      this.cache(data);
    }

    return this.datasource.get_store(this.store_name).save(this.data).then(() => {
      if (FlareTail.debug) {
        console.info('Data saved:', this.constructor.name, this.data);
      }

      return Promise.resolve(this.proxy());
    });
  }
}

/**
 * Provide app collection functionalities. 
 * @extends FlareTail.app.Events
 */
FlareTail.app.Collection = class Collection extends FlareTail.app.Events {
  /**
   * Load the all data from local IndexedDB, create a new model instance for each item, then cache them in a new Map for
   * faster access.
   * @argument {undefined}
   * @return {Promise.<Map.<(String|Number), Proxy>>} items - Promise to be resolved in model instances.
   */
  load () {
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
  }

  /**
   * Set or add an item data to the database.
   * @argument {(Number|String)} key - Key of the item.
   * @argument {*} value - Raw data object or any value.
   * @return {Promise.<Proxy>} item - Promise to be resolved in a model instance.
   */
  set (key, value) {
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

    return Promise.resolve(value);
  }

  /**
   * Get an item by a specific key.
   * @argument {(Number|String)} key - Key of the item.
   * @argument {Object} [fallback_value] - If an item is not found, create a new model object with this value.
   * @return {Promise.<(Proxy|undefined)>} item - Promise to be resolved in a model instance.
   */
  get (key, fallback_value = undefined) {
    return this.has(key).then(has => {
      if (has) {
        return this.map.get(key);
      }

      if (fallback_value) {
        return this.set(key, fallback_value);
      }

      return undefined;
    });
  }

  /**
   * Get items by specific keys.
   * @argument {(Array|Set).<(String|Number)>} keys - Key list.
   * @return {Promise.<Map.<(String|Number), Proxy>>} items - Promise to be resolved in model instances.
   */
  get_some (keys) {
    return Promise.resolve(new Map([...keys].map(key => [key, this.map.get(key)])));
  }

  /**
   * Get all items locally-stored in IndexedDB.
   * @argument {undefined}
   * @return {Promise.<Map.<(String|Number), Proxy>>} items - Promise to be resolved in model instances.
   */
  get_all () {
    return Promise.resolve(this.map);
  }

  /**
   * Check if an item with a specific key is in the database.
   * @argument {(Number|String)} key - Key of the item.
   * @return {Promise.<Boolean>} result - Promise to be resolved in whether the item exists.
   */
  has (key) {
    return Promise.resolve(this.map.has(key));
  }

  /**
   * Delete an item by a specific key.
   * @argument {(Number|String)} key - Key of the item.
   * @return {Promise.<undefined>} result
   */
  delete (key) {
    this.map.delete(key);

    return this.datasource.get_store(this.store_name).delete(key);
  }
}

/**
 * Provide app view functionalities. 
 * @extends FlareTail.app.Events
 */
FlareTail.app.View = class View extends FlareTail.app.Events {}

FlareTail.app.View.prototype.get_fragment = FlareTail.helpers.content.get_fragment;
FlareTail.app.View.prototype.get_template = FlareTail.helpers.content.get_template;
FlareTail.app.View.prototype.fill = FlareTail.helpers.content.fill;
FlareTail.app.View.prototype.widgets = FlareTail.widgets;

/**
 * Provide app helper functionalities. 
 * @extends FlareTail.app.View
 */
FlareTail.app.Helper = class Helper extends FlareTail.app.View {}

/**
 * Provide app controller functionalities. 
 * @extends FlareTail.app.Events
 */
FlareTail.app.Controller = class Controller extends FlareTail.app.Events {}
