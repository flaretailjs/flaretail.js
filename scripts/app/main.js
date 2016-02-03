/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Provide an app bare-bones object.
 */
FlareTail.app.AbstractMain = class AbstractMain {
  /**
   * Get a Main instance.
   * @constructor
   * @argument {String} name - App name.
   * @return {Object} app
   */
  constructor (name) {
    this.name = name;

    return ({
      controllers: {},
      views: { pages: {} },
      // Those components are actually in the service worker; use WorkerProxy to get access
      datasources: {},
      collections: {},
      handlers: {},
      // Shared workers
      workers: {},
    });
  }
}

/**
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
 * Provide app base functionalities. 
 * @extends FlareTail.app.Events
 */
FlareTail.app.Base = class View extends FlareTail.app.Events {}

FlareTail.app.Base.prototype.helpers = FlareTail.helpers;

/**
 * Provide app view functionalities. 
 * @extends FlareTail.app.Base
 */
FlareTail.app.View = class View extends FlareTail.app.Base {}

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
 * @extends FlareTail.app.Base
 */
FlareTail.app.Controller = class Controller extends FlareTail.app.Base {}

/**
 * Provide worker proxy functionalities. This typically offers the frontend catch-all mechanism for backend Collections,
 * forwarding all method calls from the main thread to the service worker and receiving the results from the worker.
 * This allows Controllers to seamlessly access Collections.
 */
FlareTail.app.WorkerProxy = class WorkerProxy {
  /**
   * Get a WorkerProxy instance.
   * @constructor
   * @argument {String} object_path - Path to the target object on the worker, like 'BzDeck.collections.bugs'.
   * @argument {SharedWorker} [worker=undefined] If specified, use the shared worker instead of the service worker.
   * @return {Proxy} proxy - The catch-all magic mechanism. Functions on this proxy will return a Promise.
   */
  constructor (object_path, worker = undefined) {
    return new Proxy({}, {
      get: (obj, func_name) => new Proxy(() => {}, {
        apply: (_obj, _this, args) => new Promise((resolve, reject) => {
          let id = FlareTail.helpers.misc.uuidgen(),
              func_path = [object_path, func_name].join('.'),
              message = { type: 'WorkerProxyRequest', id, func_path, args };

          let listener = event => {
            if (event.data.type !== 'WorkerProxyResponse' || event.data.id !== id) {
              return;
            }

            if (worker) {
              worker.port.removeEventListener('message', listener);
            } else {
              navigator.serviceWorker.removeEventListener('message', listener);
            }

            if (FlareTail.debug) {
              console.info('[WorkerProxyResponse]', func_path, event.data.result);
            }

            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data.result);
            }
          };

          if (FlareTail.debug) {
            console.info('[WorkerProxyRequest]', func_path, args);
          }

          if (worker) {
            worker.port.addEventListener('message', listener);
            worker.port.postMessage(message);
          } else {
            navigator.serviceWorker.addEventListener('message', listener);
            navigator.serviceWorker.ready.then(reg => reg.active.postMessage(message));
          }
        }),
      }),
    });
  }
}
