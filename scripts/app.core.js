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
 * Provide app event functionalities. This can be used for inter-thread communications.
 */
FlareTail.app.Events = class Events {
  /**
   * Publish an event asynchronously through a BroadcastChannel.
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

    let bc = new BroadcastChannel(topic),
        id = this.id;

    if (FlareTail.debug) {
      console.info('Event triggered:', topic, id || '(global)', data);
    }

    bc.postMessage({ id, data });
    bc.close(); // Can be disconnected immediately
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
    topic = topic.replace(/^([MVCH]):/, (match, prefix) => {
      return this.constructor.name.match(/(.*)(Model|View|Controller|Handler)$/)[1]
              + { M: 'Model', V: 'View', C: 'Controller', H: 'Handler' }[prefix] + ':';
    });

    (new BroadcastChannel(topic)).addEventListener('message', event => {
      if (!global && event.data && event.data.id && this.id && event.data.id !== this.id) {
        return false;
      }

      callback(event.data.data);

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
