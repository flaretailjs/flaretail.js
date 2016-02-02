/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Declare the FlareTail.js namespace. Use `var` to avoid redeclaration.
 * @namespace
 */
var FlareTail = FlareTail || {};

/**
 * Provide a lightweight application framework.
 */
FlareTail.app = FlareTail.app || {};

/**
 * Provide an app bare-bones object.
 */
FlareTail.app.AbstractWorker = class AbstractWorker {
  /**
   * Get a Worker instance.
   * @constructor
   * @argument {String} name - App name.
   * @return {Object} app
   */
  constructor (name) {
    this.name = name;

    return ({
      datasources: {},
      collections: {},
      models: {},
      handlers: {},
    });
  }
}

/**
 * Provide app base functionalities. 
 * @extends FlareTail.app.Events
 */
FlareTail.app.Base = class Base extends FlareTail.app.Events {}

FlareTail.app.Base.prototype.helpers = FlareTail.helpers;

/**
 * Provide app datasource functionalities. 
 * @extends FlareTail.app.Base
 */
FlareTail.app.DataSource = class DataSource extends FlareTail.app.Base {}

/**
 * Provide IndexedDB datasource functionalities. 
 * @extends FlareTail.app.DataSource
 */
FlareTail.app.IDBDataSource = class IDBDataSource extends FlareTail.app.DataSource {
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
 * @extends FlareTail.app.Base
 */
FlareTail.app.Model = class Model extends FlareTail.app.Base {
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
 * @extends FlareTail.app.Base
 */
FlareTail.app.Collection = class Collection extends FlareTail.app.Base {
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
 * Provide app handler functionalities. 
 * @extends FlareTail.app.Base
 */
FlareTail.app.Handler = class Handler extends FlareTail.app.Base {}
