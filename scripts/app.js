/**
 * FlareTail App Framework
 * Copyright © 2014 Kohei Yoshino. All rights reserved.
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
  this.routes = new Map([for (component of Iterator(app)) if ('route' in component[1])
                          [new RegExp('^' + this.root + component[1].route + '$'), component[1].connect]]);

  window.addEventListener('popstate', event => this.locate());
};

FlareTail.app.Router.prototype.locate = function (path = location.pathname) {
  for (let [re, connect] of this.routes) {
    let match = path.match(re);

    if (match) {
      connect(...match.slice(1));

      return;
    }
  }

  // Couldn't find a route; go to the launch path
  this.navigate(this.launch_path);
};

FlareTail.app.Router.prototype.navigate = function (path, data = {}, replace = false) {
  let args = [data, 'Loading...', this.root + path]; // l10n

  replace ? history.replaceState(...args) : history.pushState(...args);
  window.dispatchEvent(new PopStateEvent('popstate'));
};
