/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Declare the FlareTail library namespace.
 * @namespace
 */
const FlareTail = {};

/**
 * Determine if the debug mode is enabled.
 * @member {Boolean}
 */
FlareTail.debug = (() => {
  'use strict';

  return 'URL' in window && (new URL(location)).searchParams.get('debug') === 'true';
})();

/**
 * Determine if the library is compatible with the browser through feature detection.
 * @member {Boolean}
 */
FlareTail.compatible = (() => {
  'use strict';

  const features = [
    'Proxy' in window, // Firefox 4
    'IDBObjectStore' in window, // Firefox 4
    'createObjectURL' in URL, // Firefox 4
    'matchMedia' in window, // Firefox 6
    'WeakMap' in window, // Firefox 6
    'Blob' in window, // Firefox 13
    'Set' in window, // Firefox 13
    'MutationObserver' in window, // Firefox 14
    'buttons' in MouseEvent.prototype, // Firefox 15
    'isNaN' in Number, // Firefox 15
    'scrollTopMax' in Element.prototype, // Firefox 16
    'indexedDB' in window, // unprefixed with Firefox 16
    'onwheel' in window, // Firefox 17
    'origin' in location, // Firefox 21
    'HTMLTemplateElement' in window, // Firefox 22
    'remove' in Element.prototype, // Firefox 23
    'parseInt' in Number, // Firefox 25
    'createTBody' in HTMLTableElement.prototype, // Firefox 25
    'find' in Array.prototype, // Firefox 25
    'entries' in Array.prototype, // Firefox 28
    'Promise' in window, // Firefox 29
    'CSS' in window && 'escape' in CSS, // Firefox 31
    'Symbol' in window && 'iterator' in Symbol && Symbol.iterator in StyleSheetList.prototype, // Firefox 31, 36
    'Symbol' in window && 'iterator' in Symbol && Symbol.iterator in CSSRuleList.prototype, // Firefox 32, 36
    'assign' in Object, // Firefox 34
    'matches' in Element.prototype, // Firefox 34
    'fetch' in window, // Firefox 39
    'includes' in String.prototype, // Firefox 40
    'includes' in Array.prototype, // enabled in all channels with Firefox 43
    'getAll' in IDBObjectStore.prototype, // unprefixed with Firefox 44
    'entries' in Object || 'Iterator' in window, // Firefox 45; use the Iterator polyfill below for older versions
    'insertAdjacentElement' in Element.prototype, // Firefox 48
  ];

  let compatible = true;

  try {
    // (Strict) feature detection & arrow function expression (Firefox 22)
    if (!features.every(item => item)) {
      throw new Error;
    }

    // Destructuring assignment (Firefox 2)
    // for...of loop (Firefox 13)
    for (const [key, value] of new Map([[1, 'a'], [2, 'b'], [3, 'c']])) if (key === 1) {}

    // Direct Proxy (Firefox 18; constructor)
    new Proxy({}, {});

    // Spread operation in function calls (Firefox 27)
    [0, 1, 2].push(...[3, 4, 5]);

    // ES6 shorthand properties in object literals (Firefox 33)
    const a = 1, b = 2, c = { a, b };

    // ES6 computed property names (Firefox 34)
    const k = 'id', d = { [k]: a };

    // ES6 Template Literals (Firefox 34)
    const e = `a: ${a}, b: ${b}`;

    // ES6 Intl API time zone support (Firefox 52)
    if ((new Date(Date.UTC(2012, 11, 6, 12, 0, 0)))
          .toLocaleString(undefined, { hour: 'numeric', timeZone: 'US/Pacific' }) !== '4 AM') {
      throw new Error;
    }

    // ES7 async functions
    const f = async () => {};
  } catch (ex) {
    compatible = false;
    console.log(ex, features);
  }

  return compatible;
})();

/**
 * Detect the current user environment mainly based on the browser's user agent string. This utility only considers
 * Gecko-based products for now.
 * @member {Object}
 * @see {@link https://developer.mozilla.org/en-US/docs/Gecko_user_agent_string_reference MDN}
 */
FlareTail.env = (() => {
  'use strict';

  const env = {
    device: { type: 'unknown', desktop: false, mobile: false, tablet: false, phone: false },
    platform: { name: 'unknown', windows: false, macintosh: false, linux: false, android: false },
    touch: { enabled: window.matchMedia('(-moz-touch-enabled: 1)').matches }
  };

  const ua_str = navigator.userAgent;
  const pf_match = ua_str.match(/Windows|Macintosh|Linux|Android/);

  // Platform
  if (pf_match) {
    env.platform.name = pf_match[0].toLowerCase();
    env.platform[env.platform.name] = true;
  }

  // Device
  if (ua_str.includes('Mobile')) {
    env.device.type = 'mobile-phone';
    env.device.mobile = true;
    env.device.phone = true;
  } else if (ua_str.includes('Tablet')) {
    env.device.type = 'mobile-tablet';
    env.device.mobile = true;
    env.device.tablet = true;
  } else {
    env.device.type = 'desktop';
    env.device.desktop = true;
  }

  // Set device and platform data attributes on `<html>`
  document.documentElement.dataset.device = env.device.type;
  document.documentElement.dataset.platform = env.platform.name;

  return env;
})();

/**
 * Provide various utility functions.
 * @member {Object}
 */
FlareTail.util = {};

/**
 * Provide functions to manipulate HTML content.
 */
FlareTail.util.Content = class {
  /**
   * Fill DOM nodes with data using Microdata, and optionally set arbitrary attributes. This method also supports simple
   * if-else switches in the markup; use the `data-if` and `data-else` attributes.
   * @example
   *  ```html
   *  <span itemprop="creator" itemscope itemtype="http://schema.org/Person" data-attrs="title data-id">
   *    <meta itemprop="email">
   *    <span itemprop="name"></span>
   *    <span data-if="image">
   *      <img itemprop="image" alt="">
   *    </span>
   *    <span data-else>
   *      No image provided.
   *    </span>
   *  </span>
   *  ```
   *  ```js
   *  FlareTail.util.Content.fill($bug.querySelector('[itemprop="creator"]'), {
   *    // Schema.org data
   *    name: 'Kohei Yoshino', email: 'kohei.yoshino@gmail.com', image: 'kohei.png'
   *  }, {
   *    // Attributes
   *    title: 'Kohei Yoshino\nkohei.yoshino@gmail.com', 'data-id': 232883
   *  });
   *  ```
   * @static
   * @param {HTMLElement} $scope - A DOM element with the `itemscope` attribute.
   * @param {Object} data - Keys are the `itemprop` attribute.
   * @param {Object} [attrs] - Attributes to be set according to the `data-attrs` attribute.
   * @returns {HTMLElement} The scope element itself.
   */
  static fill ($scope, data, attrs = {}) {
    /**
     * Iterate over the child nodes of a given element.
     * @param {HTMLElement} $scope - A parent element.
     * @param {Object} data - A map of properties and those values. See the example above.
     */
    const iterate = ($scope, data) => {
      for (const [prop, value] of Object.entries(data)) {
        for (const $prop of $scope.querySelectorAll(`[itemprop=${prop}]`)) {
          // Unlike Microdata API's `Element.properties`, `Element.querySelectorAll` doesn't consider `itemscope`s.
          // Check if the node is in the same `itemscope`
          if ($prop.parentElement.closest('[itemscope]') !== $scope) {
            continue;
          }

          // Multiple items
          if (Array.isArray(value)) {
            const $parent = $prop.parentElement;
            const $_item = $parent.removeChild($prop);

            $parent.innerHTML = ''; // Empty the loop before adding items

            for (const _value of value) {
              const $item = $parent.appendChild($_item.cloneNode(true));

              typeof _value === 'object' ? iterate($item, _value) : set_value($item, _value);
            }
          } else {
            typeof value === 'object' ? iterate($prop, value) : set_value($prop, value);
          }
        }
      }
    };

    /**
     * Set an arbitrary value on a given element. This mimics the now-deprecated Microdata API's `Element.itemValue`
     * property.
     * @param {HTMLElement} $item - A target element.
     * @param {String} value - Any value.
     * @see {@link https://www.w3.org/TR/microdata/#dom-itemvalue Microdata API Spec}
     */
    const set_value = ($item, value) => {
      if (value === undefined) {
        return;
      }

      const tag = $item.tagName.toLowerCase();

      if (tag === 'meta') {
        $item.content = value;
      } else if (['audio', 'embed', 'iframe', 'img', 'source', 'track', 'video'].includes(tag)) {
        $item.src = value;
      } else if (['a', 'area', 'link'].includes(tag)) {
        $item.href = value;
      } else if (tag === 'object') {
        $item.data = value;
      } else if (['data', 'meter'].includes(tag)) {
        $item.value = value;
      } else if (tag === 'time') {
        FlareTail.util.DateTime.fill_element($item, value);
      } else {
        $item.textContent = value;
      }

      // Set the URL as the link label if empty
      if (tag === 'a' && $item.href === value && !$item.text) {
        $item.text = value.replace(/^https?:\/\//, '').replace(/\/$/, '');
      }
    };

    $scope.setAttribute('aria-busy', 'true');

    // Microdata
    iterate($scope, data);

    // Attributes
    for (const [attr, value] of Object.entries(attrs)) {
      const $items = [...$scope.querySelectorAll(`[data-attrs~="${CSS.escape(attr)}"]`)];

      if ($scope.matches(`[data-attrs~="${CSS.escape(attr)}"]`)) {
        $items.push($scope);
      }

      for (const $item of $items) if (value !== undefined) {
        $item.setAttribute(attr, value);
      }
    }

    // Support simple if-else switches
    for (const $if of $scope.querySelectorAll('[data-if]')) {
      // Hide the element if the data is undefined
      const hidden = $if.hidden = !data[$if.getAttribute('data-if')];
      const $next = $if.nextElementSibling;

      if ($next && $next.hasAttribute('data-else')) {
        $next.hidden = !hidden;
      }
    }

    $scope.removeAttribute('aria-busy');

    return $scope;
  }

  /**
   * Get the `DocumentFragment` from a template, clone it, and optionally set the `id` and other WAI-ARIA attributes on
   * the child nodes.
   * @static
   * @param {String} id - A template ID.
   * @param {String} [prefix] - Any prefix that will be used to replace the `id` and other attributes with a placeholder
   *  prefix called `TID`, like `<div id="TID-container" aria-controls="TID-another-container">`.
   * @returns {DocumentFragment} A fragment retrieved from the template.
   */
  static get_fragment (id, prefix = undefined) {
    const $fragment = document.getElementById(id).content.cloneNode(true);

    if (prefix) {
      for (const attr of ['id', 'aria-owns', 'aria-controls', 'aria-labelledby']) {
        for (const $element of $fragment.querySelectorAll(`[${attr}]`)) {
          $element.setAttribute(attr, $element.getAttribute(attr).replace(/TID/, prefix));
        }
      }
    }

    return $fragment;
  }

  /**
   * Get the actual element node from a given template, instead of the `DocumentFragment`.
   * @static
   * @param {...String} args - Arguments for the `get_fragment` method, including the ID of the template.
   * @returns {HTMLElement} A copy of the element found in the template.
   */
  static get_template (...args) {
    return this.get_fragment(...args).firstElementChild;
  }
}

/**
 * Provide event-related functions.
 */
FlareTail.util.Event = class {
  /**
   * Prevent the default browser action and propagation at the same time.
   * @static
   * @param {Event} event - Any event.
   * @returns {Boolean} Always `false`.
   */
  static ignore (event) {
    event.preventDefault();
    event.stopPropagation();

    return false;
  }

  /**
   * Set multiple event listeners as once on a given element.
   * @static
   * @param {Object} obj - A class or object containing event handlers as the member functions.
   * @param {HTMLElement} $target - A target node that fires events on it.
   * @param {Array.<String>} types - Event types, like `['click', 'keydown']`.
   * @param {Boolean} [capture=false] - Whether the events should captured.
   * @param {Boolean} [once=false] - Whether the event handler should be removed after called once.
   */
  static bind (obj, $target, types, capture = false, once = false) {
    if ($target) {
      for (const type of types) if (obj[`on${type}`]) {
        $target.addEventListener(type, obj, { capture, once });
      }
    }
  }

  /**
   * Remove multiple event listeners as once from a given element.
   * @static
   * @param {Object} obj - A class or object containing event handlers as the member functions.
   * @param {HTMLElement} $target - A target node that fires events on it.
   * @param {Array.<String>} types - Event types, like `['click', 'keydown']`.
   * @param {Boolean} [capture=false] - Whether the events should captured.
   */
  static unbind (obj, $target, types, capture = false) {
    if ($target) {
      for (const type of types) if (obj[`on${type}`]) {
        $target.removeEventListener(type, obj, { capture });
      }
    }
  }

  /**
   * Fire a custom event on a given element.
   * @static
   * @param {HTMLElement} $target - A target node that fires events on it.
   * @param {String} type - An event type.
   * @param {Object} [init] - An event options including the `detail`.
   * @param {Boolean} [async=true] - Whether the event should be called asynchronously.
   */
  static trigger ($target, type, init = {}, async = true) {
    const callback = () => $target.dispatchEvent(new CustomEvent(type, init));

    async ? (async () => callback())() : callback();
  }
}

/**
 * Provide keyboard shortcut-related functions.
 */
FlareTail.util.Keybind = class {
  /**
   * Assign keyboard shortcuts on a given element.
   * @static
   * @param {Element} $target - A target element.
   * @param {Object.<String, Function>} map - A mapping of keybind patterns (`S`, `Accel+Shift+R`, `Accel+O`, etc.
   *  Multiple pattern should be separated with `|`) and function. Possible key values can be found at MDN. The
   *  supported modifiers here include `Alt`, `Shift` and `Accel`; for platform independent, `Control` and `Meta` are
   *  not supported.
   * @see {@link https://developer.mozilla.org/docs/Web/API/KeyboardEvent/key MDN}
   * @see {@link https://developer.mozilla.org/docs/Web/API/KeyboardEvent/getModifierState MDN}
   */
  static assign ($target, map) {
    const bindings = new Set();

    for (const [_combos, command] of Object.entries(map)) for (const _combo of _combos.split('|')) {
      const combo = _combo.split('+');
      const key = combo.pop().toLowerCase().replace('Space', ' '); // Space is an exception
      const modifiers = new Set(combo);

      bindings.add([key, modifiers, command]);
    }

    $target.addEventListener('keydown', event => {
      let found = false;

      outer: for (const [key, modifiers, command] of bindings) {
        // Check the key value
        if (event.key.toLowerCase() !== key) {
          continue;
        }

        // Check modifier keys
        for (const mod of ['Alt', 'Shift', 'Accel']) {
          if (modifiers.has(mod) && !event.getModifierState(mod) ||
              !modifiers.has(mod) && event.getModifierState(mod)) {
            continue outer;
          }
        }

        // Execute command
        found = true;
        command(event);

        break;
      }

      return found ? FlareTail.util.Event.ignore(event) : true;
    });
  }

  /**
   * Fire a `keydown` event on a given element to call the event handler for an assigned keyboard shortcut.
   * @static
   * @param {Element} $target - A target element.
   * @param {String} key - A key name like `ArrowDown`.
   * @see {@link https://developer.mozilla.org/docs/Web/API/KeyboardEvent/key MDN}
   */
  static dispatch ($target, key) {
    $target.dispatchEvent(new KeyboardEvent('keydown', { key }));
  }
}

/**
 * Provide preference-related functions.
 */
FlareTail.util.Prefs = class {
}

/**
 * Provide date and time-related functions.
 */
FlareTail.util.DateTime = class {
  /**
   * Start the auto-updater.
   * @static
   */
  static start_updater () {
    this.updater = window.setInterval(() => this.update_elements(this.options), this.options.updater_interval * 1000);
    document.addEventListener('visibilitychange', event => this.onvisibilitychange());
  }

  /**
   * Stop the auto-updater.
   * @static
   */
  static stop_updater () {
    window.clearInterval(this.updater);
    document.removeEventListener('visibilitychange', event => this.on_visibilitychange());

    delete this.updater;
  }

  /**
   * Called whenever a `visibilitychange` event is fired on the `document`. Stop the updater when the page is hidden.
   * @static
   */
  static onvisibilitychange () {
    if (!document.hidden && this.options.relative && this.options.updater_enabled && !this.updater) {
      this.update_elements(this.options);
      this.start_updater();
    } else if (this.updater) {
      this.stop_updater();
    }
  }

  /**
   * Called whenever an option has been changed. This is a `Proxy` handler.
   * @static
   * @param {Object} obj - The options.
   * @param {String} prop - A property name.
   * @param {*} value - A new property value.
   * @returns {Boolean} Always `true`, otherwise the `Proxy` will raise an error.
   */
  static on_option_changed (obj, prop, value) {
    obj[prop] = value;

    // Update timezone & format on the current view
    this.update_elements(this.options);

    // Start or stop the timer if the relative option is changed
    if (prop === 'relative' || prop === 'updater_enabled') {
      if (!document.hidden && this.options.relative && this.options.updater_enabled && !this.updater) {
        this.start_updater();
      } else if (this.updater) {
        this.stop_updater();
      }
    }

    return true;
  }

  /**
   * Update the label on all `<time>` elements on the document.
   * @static
   * @param {Boolean} [relative=false] - Whether a relative date format will be used.
   * @param {Boolean} [simple=false] - Whether a rather simple date format will be used.
   */
  static update_elements ({ relative = this.options.relative, simple = this.options.simple }) {
    for (const $time of document.querySelectorAll('time')) {
      const data = $time.dataset;
      const time = this.format($time.dateTime, {
        relative: data.relative ? JSON.parse(data.relative) : relative,
        simple: data.simple ? JSON.parse(data.simple) : simple,
        timezone: this.options.timezone,
        locale: this.options.locale,
      });

      if ($time.textContent !== time) {
        $time.textContent = time;
      }
    }
  }

  /**
   * Update the label on a given `<time>` element.
   * @static
   * @param {HTMLElement} $time - A target `<time>` element.
   * @param {String} datetime - A date string in the ISO 8601 format.
   * @param {Boolean} [relative=false] - Whether a relative date format will be used.
   * @param {Boolean} [simple=false] - Whether a rather simple date format will be used.
   * @returns {HTMLElement} The `<time>` element itself.
   */
  static fill_element ($time, datetime, { relative = this.options.relative, simple = this.options.simple } = {}) {
    const data = $time.dataset;

    $time.dateTime = datetime;
    $time.title = (new Date(datetime)).toString();
    $time.textContent = this.format(datetime, {
      relative: data.relative ? JSON.parse(data.relative) : relative,
      simple: data.simple ? JSON.parse(data.simple) : simple,
    });

    return $time;
  }

  /**
   * Convert a date into a human-readable format with given options.
   * @static
   * @param {String} datetime - A date string in the ISO 8601 format.
   * @param {Boolean} [relative=false] - Whether a relative date format will be used.
   * @param {Boolean} [simple=false] - Whether a rather simple date format will be used.
   * @param {String} [timezone] - A time zone that will be used for the formatting.
   * @param {String} [locale] - A locale name that will be used for the formatting.
   * @returns {String} A formatted date string.
   */
  static format (datetime, { relative = false, simple = false, timezone = undefined, locale = undefined } = {}) {
    const now = new Date();
    const date = new Date(datetime);
    const delta = now - date;
    const timeZone = timezone; // Intl API option, doesn't match our naming convention

    if (relative) {
      const patterns = [
        [1000 * 60 * 60 * 24 * 365, '%dyr', 'Last year', '%d years ago'],
        [1000 * 60 * 60 * 24 * 30, '%dmo', 'Last month', '%d months ago'],
        [1000 * 60 * 60 * 24, '%dd', 'Yesterday', '%d days ago'],
        [1000 * 60 * 60, '%dh', '1 hour ago', '%d hours ago'],
        [1000 * 60, '%dm', '1 minute ago', '%d minutes ago'],
        [1000, '%ds', 'Just now', '%d seconds ago'],
        [0, 'Now', 'Just now', 'Just now'] // Less than 1 second
      ];

      const _format = (ms, _simple, singular, plural) => {
        const value = Math.floor(delta / ms);

        return (simple ? _simple : value === 1 ? singular : plural).replace('%d', value);
      };

      for (const pattern of patterns) if (delta > pattern[0]) {
        return _format(...pattern);
      }
    }

    if (simple && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      const dates = now.getDate() - date.getDate();

      if (dates === 0) {
        return date.toLocaleTimeString(locale, { hour: 'numeric', minute: 'numeric', hour12: false, timeZone });
      }

      if (dates === 1) {
        return 'Yesterday';
      }
    }

    if (simple) {
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', timeZone });
    }

    return date.toLocaleDateString(locale, { hour: 'numeric', minute: 'numeric', hour12: false, timeZone });
  }
}

/**
 * @static
 * @member {Proxy} Options for the `DateTime` class.
 * @property {Boolean} [relative=false] - Whether a relative date format will be used.
 * @property {Boolean} [simple=false] - Whether a rather simple date format will be used.
 * @property {String} [timezone] - A time zone that will be used for the formatting.
 * @property {String} [locale] - A locale name that will be used for the formatting.
 * @property {Boolean} [updater_enabled=false] - Whether the auto-updater should be enabled by default.
 * @property {Number} [updater_interval=60] - An update interval in seconds. The default is 60 seconds = 1 minute.
 */
FlareTail.util.DateTime.options = new Proxy({
  relative: false,
  simple: false,
  timezone: undefined,
  locale: undefined,
  updater_enabled: false,
  updater_interval: 60,
}, {
  set: (...args) => FlareTail.util.DateTime.on_option_changed(...args),
});

/**
 * Provide network-related functions.
 */
FlareTail.util.Network = class {
  /**
   * Send a request to an API, decode the response JSON, and return the result.
   * @static
   * @param {String} url - A resource URL.
   * @param {String} [body] - A request body to be POSTed.
   * @returns {Promise.<(Object|Array)>} A result object or array.
   */
  static async json (url, body = undefined) {
    const response = await window.fetch(new Request(url, {
      method: body ? 'POST' : 'GET',
      headers: new Headers({ Accept: 'application/json' }),
      body,
    }));

    return response.json();
  }

  /**
   * Send a request to an API that requires JSON-P, and return the result.
   * @static
   * @param {String} url - A resource URL.
   * @returns {Promise.<(Object|Array)>} A result object or array.
   */
  static async jsonp (url) {
    const $script = document.body.appendChild(document.createElement('script'));
    const callback_id = 'jsonp_' + Date.now();
    const cleanup = () => { $script.remove(); delete window[callback_id]; };

    return new Promise((resolve, reject) => {
      window[callback_id] = data => resolve(data);
      $script.addEventListener('load', event => cleanup(), { once: true });
      $script.addEventListener('error', event => { cleanup(); reject(new Error()); }, { once: true });
      $script.src = url + '?callback=' + callback_id;
    });
  }
}

/**
 * Provide browser history-related functions.
 */
FlareTail.util.History = class {
}

/**
 * Provide localization-related functions.
 */
FlareTail.util.L10N = class {
}

/**
 * Provide internationalization-related functions.
 */
FlareTail.util.I18N = class {
}

/**
 * Provide CSS-related functions.
 */
FlareTail.util.Style = class {
  /**
   * Get the computed CSS property value for a given element.
   * @static
   * @param {HTMLElement} $element - A target element.
   * @param {String} property - A CSS property name.
   * @returns {String} A property value.
   */
  static get ($element, property) {
    return window.getComputedStyle($element, null).getPropertyValue(property);
  }
}

/**
 * Provide object-related functions.
 */
FlareTail.util.Object = class {
  /**
   * Clone an object. This can also be used to convert a `Proxy` to a normal object.
   * @static
   * @param {(Object|Proxy)} obj - An original object.
   * @returns {Object} A cloned object.
   */
  static clone (obj) {
    return Object.assign({}, obj);
  }
}

/**
 * Provide array-related functions.
 */
FlareTail.util.Array = class {
  /**
   * Clone an array. Note that this is a shallow copy. Non-primitive array members, such as objects, will not be cloned.
   * @static
   * @param {Array} array - An orignal array.
   * @returns {Array} A cloned array.
   */
  static clone (array) {
    return [...array];
  }

  /**
   * Join array members to create a string in a human-readable format, like "A, B and C".
   * @static
   * @param {(Array|Set)} set - An original array.
   * @param {String} [tag] - An optional HTML tag name that will be used to enclose each value, like `strong`.
   * @returns {String} A formatted string.
   * @todo Require localization of the joiner.
   */
  static join (set, tag = undefined) {
    const open_tag = tag ? `<${tag}>` : '';
    const close_tag = tag ? `</${tag}>` : '';
    const array = [...set].map(item => open_tag + FlareTail.util.String.sanitize(item) + close_tag);
    const last = array.pop();

    return array.length ? array.join(', ') + ' and ' + last : last;
  }

  /**
   * Sort an array in a better way.
   * @static
   * @param {Array} array - An original array.
   * @param {String} [order=ascending] - A sorting direction, `ascending` or `descending`.
   * @param {String} [type=string] - The data type of each member, like `integer`, `boolean` or `time`.
   * @param {String} [key] - A key to be used when sorting objects, such as `id`.
   * @returns {Array} A sorted array.
   */
  static sort (array, { order = 'ascending', type = 'string', key = undefined } = {}) {
    // Normalization: ignore brackets for comparison
    const normalized_values = new Map();
    const normalize = str => {
      let value = normalized_values.get(str);

      if (!value) {
        value = str.replace(/[\"\'\(\)\[\]\{\}<>«»_]/g, '').toLowerCase();
        normalized_values.set(str, value);
      }

      return value;
    };

    array.sort((a, b) => {
      if (order === 'descending') {
        [a, b] = [b, a]; // reverse()
      }

      const a_val = a.data ? a.data[key] : a[key];
      const b_val = b.data ? b.data[key] : b[key];

      if (!a_val || !b_val) {
        return true;
      }

      switch (type) {
        case 'integer': {
          return a_val > b_val;
        }

        case 'boolean': {
          return a_val < b_val;
        }

        case 'time': {
          return new Date(a_val) > new Date(b_val);
        }

        default: {
          return normalize(a_val) > normalize(b_val);
        }
      }
    });

    return array;
  }

  /**
   * Split an array into chunks, like the PHP `array_chunk` function.
   * @static
   * @param {Array.<*>} array - An array to be split.
   * @param {Number} size - A number of items in each chunk.
   * @returns {Array.<Array.<*>>} A multidimensional array.
   * @see {@link https://secure.php.net/manual/en/function.array-chunk.php PHP}
   */
  static chunk (array, size) {
    const chunks = [];

    for (let i = 0; i < array.length; i = i + size) {
      chunks.push(array.slice(i, i + size));
    }

    return chunks;
  }
}

/**
 * Provide string-related functions.
 */
FlareTail.util.String = class {
  /**
   * Convert any HTML tags in a given string to character entity references, so that the string can be used safely.
   * @static
   * @param {String} str - An orignal string.
   * @returns {String} A sanitized string.
   */
  static sanitize (str) {
    const $p = document.createElement('p');

    $p.textContent = str;

    return $p.innerHTML;
  }

  /**
   * Remove any HTML tags from a given string, so that the string can be used safely.
   * @static
   * @param {String} str - An orignal string.
   * @returns {String} A string without tags.
   */
  static strip_tags (str) {
    const $p = document.createElement('p');

    $p.innerHTML = str;

    return $p.textContent;
  }
}

/**
 * Provide number-related functions.
 */
FlareTail.util.Number = class {
  /**
   * Format a number in a file size format with a unit like KB.
   * @static
   * @param {Number} number - A number to be formatted.
   * @param {Number} [fixed=1] - A number of digits to appear after the decimal point.
   * @returns {String} A formatted file size with a unit and thousands separators.
   * @todo Support languages other than English.
   */
  static format_file_size (number, fixed = 1) {
    const units = { 1000: 'KB', 1000000: 'MB', 1000000000: 'GB', 1000000000000: 'TB' };
    let rounder = 1;
    let unit = number === 1 ? 'byte' : 'bytes';

    for (const [_rounder, _unit] of Object.entries(units)) {
      if (number >= _rounder) {
        rounder = _rounder;
        unit = _unit;
      }
    }

    return `${Number((number / rounder).toFixed(fixed)).toLocaleString('en-US')} ${unit}`;
  }
}

/**
 * Provide regular expression-related functions.
 */
FlareTail.util.RegExp = class {
  /**
   * Quote any regular expression characters in a string, like the PHP `preg_quote` function, so that the string can be
   * used safely for regular expressions.
   * @static
   * @param {String} str - An orignal string.
   * @returns {String} An escaped string.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions MDN}
   * @see {@link https://secure.php.net/manual/en/function.preg-quote.php PHP}
   */
  static escape (str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Provide miscellaneous functions.
 */
FlareTail.util.Misc = class {
  /**
   * Generate a GUID.
   * @static
   * @returns {String} A GUID, such as `80B2A9ED-9103-4847-B69B-0BC37F7F7CF6`.
   */
  static uuidgen () {
    const url = URL.createObjectURL(new Blob());

    // Immediately remove the URL as it won't be used anymore
    URL.revokeObjectURL(url);

    return url.substr(-36).toUpperCase();
  }

  /**
   * Generate a random hash.
   * @static
   * @param {Number} [length=7] How many characters to be included in the hash, maximum of 32.
   * @param {Boolean} [starts_with_char=false] Whether the hash should start with a character instead of a number, so
   *  that it can also be used for the `id` attribute on an HTML element.
   * @returns {String} A hash, such as `f7f7cf6`.
   */
  static hash (length = 7, starts_with_char = false) {
    for (;;) {
      const str = Array(length).fill(0).map(() => Math.floor((Math.random() * 16)).toString(16)).join('');

      if (!starts_with_char || starts_with_char && str.match(/^\D/)) {
        return str;
      }
    }
  }
}
