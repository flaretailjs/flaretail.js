/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Provide a lightweight application framework.
 */
FlareTail.app = {};

/*
 * Provide app router functionalities.
 */
FlareTail.app.Router = class Router {
  /**
   * Get a Router instance.
   * @constructor
   * @param {String} root - The app's root path. Usually '/'.
   * @param {String} launch_path - The app's launch path.
   * @param {Object} routes - Custom routes. The key is a pattern, value is an Object contains `view` (Object) and
   *  `catch_all` (Boolean, optional). See the example below.
   * @returns {Router}
   * @example
   *  BzDeck.router = new FlareTail.app.Router(BzDeck.config.app, {
   *    '/bug/(\\d+)': { view: BzDeck.DetailsPageView },
   *    '/home/(\\w+)': { view: BzDeck.HomePageView, catch_all: true },
   *    '/settings': { view: BzDeck.SettingsPageView },
   *  });
   */
  constructor ({ root, launch_path } = {}, routes) {
    // Specify the base URL of the app, without a trailing slash
    this.root = root.match(/(.*)\/$/)[1] || '';
    // Specify the launch path
    this.launch_path = launch_path || root || '/';
    // Specify the routes
    this.routes = routes;

    window.addEventListener('popstate', event => this.locate());
  }

  /**
   * Find a route usually by the URL. If found, create a new instance of the corresponding view. If not found, the
   * specified pathname is invalid, so navigate to the app's launch path instead.
   * @param {String} [path=location.pathname] - URL pathname used to find a route.
   * @returns {Object} A view instance if found.
   */
  locate (path = location.pathname) {
    for (const [pattern, { view, catch_all, map }] of Object.entries(this.routes)) {
      const match = path.match(new RegExp(`^${this.root}${pattern}$`));
      let instance;

      if (match) {
        const args = match.slice(1).map(arg => isNaN(arg) ? arg : Number(arg));

        if (map) {
          // Find an existing instance from the map
          instance = catch_all ? [...map.values()][0] : map.get(path);
        } else {
          this.routes[pattern].map = new Map();
        }

        if (instance) {
          if (FlareTail.debug) {
            console.info(`[Router] Reactivating to an existing ${view.name} instance for ${path}`);
          }

          if (instance.reactivate) {
            instance.reactivate(...args);
          }
        } else {
          if (FlareTail.debug) {
            console.info(`[Router] Creating a new ${view.name} instance for ${path}`);
          }

          // Call the constructor when a route is found
          // Pass arguments based on the RegExp pattern, taking numeric arguments into account
          instance = new view(...args);
          this.routes[pattern].map.set(path, instance);
        }

        return instance;
      }
    }

    if (FlareTail.debug) {
      console.info(`[Router] A route for ${path} could not be found`);
    }

    // Couldn't find a route; go to the launch path
    this.navigate(this.launch_path);

    return undefined;
  }

  /**
   * Navigate to the specified URL pathname by manipulating the browser history.
   * @param {String} path - URL pathname to go.
   * @param {Object} [state={}] - History state object.
   * @param {Boolean} [replace=false] - If true, the current history state will be replaced, otherwise appended.
   */
  navigate (path, state = {}, replace = false) {
    state.previous = replace && history.state && history.state.previous ? history.state.previous : location.pathname;

    const args = [state, 'Loading...', this.root + path]; // l10n

    replace ? history.replaceState(...args) : history.pushState(...args);
    window.dispatchEvent(new PopStateEvent('popstate'));

    if (FlareTail.debug) {
      console.info(replace ? 'History replaced:' : 'History added:', path, state);
    }
  }
}

/**
 * Provide app event functionalities. This is the base class of other app framework classes.
 */
FlareTail.app.Events = class Events {
  /**
   * Activate an instance. This should be called by all the derived classes using super().
   * @param {String} [id] - Unique instance identifier. If omitted, a random 7-character hash will be assigned. A View
   *  and the corresponding Presenter as well as its sub-Views/Presenters should share the same ID, otherwise their
   *  communication through events won't work.
   * @returns {Events} New Events instance.
   */
  constructor (id) {
    this.id = id || URL.createObjectURL(new Blob()).substr(-7);
  }

  /**
   * Publish an event asynchronously.
   * @param {String} topic - An event name. Shorthand syntax is supported: #Updated in BugModel means BugModel#Updated,
   *  #Error in SessionPresenter means SessionPresenter#Error, and so on.
   * @param {Object} [data={}] - Data to pass the subscribers. If the instance has set the id property, that id will be
   *  automatically appended to the data. Note that the data will be cloned. Proxy will be automatically deproxified
   *  before being posted but complex objects like Error or URLSearchParams cannot be transferred and throw. See the
   *  following MDN document for details.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm MDN}
   */
  trigger (topic, data = {}) {
    topic = topic.match(/^#/) ? this.constructor.name + topic : topic;
    data = Object.assign({}, data);

    (new BroadcastChannel(topic)).postMessage({ id: this.id, data });

    if (FlareTail.debug) {
      console.info('[Event]', topic, this.id, data);
    }
  }

  /**
   * Subscribe an event.
   * @param {String} topic - Event name. Shorthand syntax is supported: M#Updated in BugView means BugModel#Updated,
   *  V#AppMenuItemSelected in ToolbarPresenter means ToolbarView#AppMenuItemSelected, and so on.
   * @param {Function} callback - Function called whenever the specified event is fired.
   * @param {Boolean} [global=false] - If true, the callback function will be fired even when the event detail object
   *  and the instance have different id properties. Otherwise, the identity will be respected.
   */
  on (topic, callback, global = false) {
    topic = topic.replace(/^([MVP])#/, (match, prefix) => {
      return this.constructor.name.match(/(.*)(Model|View|Presenter)$/)[1]
              + { M: 'Model', V: 'View', P: 'Presenter' }[prefix] + '#';
    });

    (new BroadcastChannel(topic)).addEventListener('message', event => {
      if (global || event.data.id === this.id) {
        callback(event.data.data);
      }
    });
  }

  /**
   * Subscribe an event with an automatically determined callback. So this is the 'on' function's shorthand. For
   * example, if the topic is 'V#NavigationRequested', on_navigation_requested will be set as the callback function.
   * @param {String} topic - See the 'on' function above for details.
   * @param {Boolean} [global=false] - See the 'on' function above for details.
   */
  subscribe (topic, global = false) {
    this.on(topic, data => this[topic.replace(/^.+?\#/, 'on').replace(/([A-Z])/g, '_$1').toLowerCase()](data), global);
  }
}

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
   * @param {String} name - Name of the database.
   * @param {Integer} version - Database version.
   * @returns {Promise.<(IDBDatabase|Error)>} The target database.
   */
  async open_database (name, version = 1) {
    const request = indexedDB.open(name, version);

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
   * @param {String} name - Name of the object store.
   * @param {Boolean} [return_request=false] - If true, operation methods return IDBRequest instead of result Array.
   * @returns {Object} Set of operation methods that return a Promise.
   */
  get_store (name, return_request = false) {
    const store = this.database.transaction(name, 'readwrite').objectStore(name);
    const send = request => new Promise((resolve, reject) => {
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
   * @returns {Proxy} Proxified `this` object.
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
   * Cache data as a new Proxy, so the object is automatically saved when a property is modified.
   * @param {Object} data - Raw data object.
   * @returns {Proxy} Proxified data object.
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
   * @param {Object} [data] - Raw data object.
   * @returns {Promise.<Proxy>} Proxified instance of the model object.
   */
  async save (data = undefined) {
    if (data) {
      this.cache(data);
    }

    await this.datasource.get_store(this.store_name).save(this.data);

    if (FlareTail.debug) {
      console.info('Data saved:', this.constructor.name, this.data);
    }

    return Promise.resolve(this.proxy());
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
   * @returns {Promise.<Map.<(String|Number), Proxy>>} Model instances.
   */
  async load () {
    const store = this.datasource.get_store(this.store_name);
    const items = await store.get_all();

    this.map = new Map(items.map(item => {
      const key = item[store.obj.keyPath];
      let value;

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
  }

  /**
   * Set or add an item data to the database.
   * @param {(Number|String)} key - Key of the item.
   * @param {*} value - Raw data object or any value.
   * @returns {Promise.<Proxy>} Model instance.
   */
  set (key, value) {
    if (this.model) {
      value = new this.model(value);
      value.save();
    } else {
      const store = this.datasource.get_store(this.store_name);

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
   * @param {(Number|String)} key - Key of the item.
   * @param {Object} [fallback_value] - If an item is not found, create a new model object with this value.
   * @returns {Promise.<(Proxy|undefined)>} Model instance.
   */
  async get (key, fallback_value = undefined) {
    const has_key = await this.has(key);

    if (has_key) {
      return this.map.get(key);
    }

    if (fallback_value) {
      return this.set(key, fallback_value);
    }

    return undefined;
  }

  /**
   * Get items by specific keys.
   * @param {(Array|Set).<(String|Number)>} keys - Key list.
   * @returns {Promise.<Map.<(String|Number), Proxy>>} Model instances.
   */
  async get_some (keys) {
    return Promise.resolve(new Map([...keys].map(key => [key, this.map.get(key)])));
  }

  /**
   * Get all items locally-stored in IndexedDB.
   * @returns {Promise.<Map.<(String|Number), Proxy>>} Model instances.
   */
  async get_all () {
    return Promise.resolve(this.map);
  }

  /**
   * Check if an item with a specific key is in the database.
   * @param {(Number|String)} key - Key of the item.
   * @returns {Promise.<Boolean>} whether the item exists.
   */
  async has (key) {
    return Promise.resolve(this.map.has(key));
  }

  /**
   * Delete an item by a specific key.
   * @param {(Number|String)} key - Key of the item.
   * @returns {Promise.<undefined>} result
   */
  async delete (key) {
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

/**
 * Provide app helper functionalities.
 * @extends FlareTail.app.View
 */
FlareTail.app.Helper = class Helper extends FlareTail.app.View {}

/**
 * Provide app presenter functionalities.
 * @extends FlareTail.app.Events
 */
FlareTail.app.Presenter = class Presenter extends FlareTail.app.Events {}
