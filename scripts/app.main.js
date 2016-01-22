/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Declare the FlareTail.js namespace.
 * @namespace
 */
var FlareTail = FlareTail || {};

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
    for (let [name, component] of Object.entries(app)) {
      if (name.match(/.+Controller$/) && 'route' in component.prototype) {
        this.routes.set(new RegExp(`^${this.root}${component.prototype.route}$`), component);
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

/**
 * Provide worker proxy functionalities. This typically offers the frontend catch-all mechanism for backend Collections,
 * forwarding all method calls from the main thread to the service worker and receiving the results from the worker.
 * This allows Controllers to seamlessly access Collections.
 */
FlareTail.app.WorkerProxy = class WorkerProxy {
  /**
   * Get a WorkerProxy instance.
   * @constructor
   * @argument {String} class_name - Name of the target class on the worker.
   * @return {Proxy} proxy - The catch-all magic mechanism. Functions on this proxy will return a Promise.
   */
  constructor (class_name) {
    return new Proxy({}, {
      get: (obj, func_name) => new Proxy(() => {}, {
        apply: (_obj, _this, args) => new Promise(resolve => {
          let listener = event => {
            let [ service, type, detail ] = event.data;

            if (service === class_name && type === func_name) {
              if (FlareTail.debug) {
                console.info('[WorkerProxy] received message:', class_name, func_name, detail);
              }

              navigator.serviceWorker.removeEventListener('message', listener);
              resolve(detail);
            }
          };

          if (FlareTail.debug) {
            console.info('[WorkerProxy] sent message:', class_name, func_name, args);
          }

          navigator.serviceWorker.addEventListener('message', listener);
          navigator.serviceWorker.ready.then(reg => reg.active.postMessage([class_name, func_name, args]));
        }),
      }),
    });
  }
}
