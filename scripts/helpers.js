/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

let FlareTail = {};

FlareTail.debug = 'URLSearchParams' in window &&
                    (new URLSearchParams(location.search.substr(1))).get('debug') === 'true';

FlareTail.helpers = {};

/* ------------------------------------------------------------------------------------------------------------------
 * Compatibility
 * ------------------------------------------------------------------------------------------------------------------ */

{
  let features = [
    'toLocaleFormat' in Date.prototype, // Gecko specific
    'Worker' in window, // Firefox 3.5
    'FileReader' in window, // Firefox 3.6
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
    'isInteger' in Number, // Firefox 16
    'indexedDB' in window, // unprefixed with Firefox 16
    'onwheel' in window, // Firefox 17
    'origin' in location, // Firefox 21
    'HTMLTemplateElement' in window, // Firefox 22
    'Notification' in window, // Firefox 22
    'CSS' in window && 'supports' in CSS, // Firefox 23
    'remove' in Element.prototype, // Firefox 23
    'parseInt' in Number, // Firefox 25
    'createTBody' in HTMLTableElement.prototype, // Firefox 25
    'find' in Array.prototype, // Firefox 25
    'entries' in Array.prototype, // Firefox 28
    'Promise' in window, // Firefox 29
    'SharedWorker' in window, // Firefox 29
    'URLSearchParams' in window, // Firefox 29
    'CSS' in window && 'escape' in CSS, // Firefox 31
    'getBoxQuads' in Element.prototype, // Firefox 31
    'Symbol' in window && 'iterator' in Symbol && Symbol.iterator in StyleSheetList.prototype, // Firefox 31, 36
    'Symbol' in window && 'iterator' in Symbol && Symbol.iterator in CSSRuleList.prototype, // Firefox 32, 36
    'ServiceWorker' in window, // Firefox 33
    'assign' in Object, // Firefox 34
    'matches' in Element.prototype, // Firefox 34
    'mediaDevices' in navigator, // Firefox 36
    'BroadcastChannel' in window, // Firefox 38
    'fetch' in window, // Firefox 39
    'includes' in String.prototype, // Firefox 40
    'CacheStorage' in window, // Firefox 41
    'includes' in Array.prototype, // enabled in all channels with Firefox 43
    'getAll' in IDBObjectStore.prototype, // unprefixed with Firefox 44
    'entries' in Object || 'Iterator' in window, // Firefox 45; use the Iterator polyfill below for older versions
    'Permissions' in window, // Firefox 45
  ];

  let compatible = true;

  try {
    // (Strict) feature detection & arrow function expression (Firefox 22)
    if (!features.every(item => item)) {
      throw new Error;
    }

    // Destructuring assignment (Firefox 2)
    // for...of loop (Firefox 13)
    for (let [key, value] of new Map([[1, 'a'], [2, 'b'], [3, 'c']])) if (key === 1) {}

    // Direct Proxy (Firefox 18; constructor)
    new Proxy({}, {});

    // Spread operation in function calls (Firefox 27)
    [0, 1, 2].push(...[3, 4, 5]);

    // ES6 shorthand properties in object literals (Firefox 33)
    let a = 1, b = 2, c = { a, b };

    // ES6 computed property names (Firefox 34)
    let k = 'id', d = { [k]: a };

    // ES6 Template Literals (Firefox 34)
    let e = `a: ${a}, b: ${b}`;
  } catch (ex) {
    compatible = false;
    console.log(ex, features);
  }

  Object.defineProperty(FlareTail, 'compatible', {
    enumerable: true,
    value: compatible
  });
}

/* ------------------------------------------------------------------------------------------------------------------
 * Content
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.content = {};

/**
 * Fill DOM nodes with data using Microdata, and optionally set arbitrary attributes. This method also supports simple
 * if-else switches in the markup; use the data-if and data-else attributes.
 *
 * @example Markup:
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
 * @example JavaScript:
 *  FlareTail.helpers.content.fill($bug.querySelector('[itemprop="creator"]'), {
 *    // Schema.org data
 *    name: 'Kohei Yoshino', email: 'kohei.yoshino@gmail.com', image: 'kohei.png'
 *  }, {
 *    // Attributes
 *    title: 'Kohei Yoshino\nkohei.yoshino@gmail.com', 'data-id': 232883
 *  });
 * @argument {Element} $scope - DOM element with the itemscope attribute.
 * @argument {Object} data - Keys are the itemprop attribute.
 * @argument {Object} [attrs={}] - Attributes to be set according to the data-attrs attribute.
 * @return {Element} $scope
 */
FlareTail.helpers.content.fill = function ($scope, data, attrs = {}) {
  let iterate = ($scope, data) => {
    for (let [prop, value] of Object.entries(data)) {
      for (let $prop of $scope.querySelectorAll(`[itemprop=${prop}]`)) {
        // Unlike Microdata API's Element.properties, Element.querySelectorAll doesn't consider itemscopes.
        // Check if the node is in the same itemscope
        if ($prop.parentElement.closest('[itemscope]') !== $scope) {
          continue;
        }

        // Multiple items
        if (Array.isArray(value)) {
          let $parent = $prop.parentElement,
              $_item = $parent.removeChild($prop);

          $parent.innerHTML = ''; // Empty the loop before adding items

          for (let _value of value) {
            let $item = $parent.appendChild($_item.cloneNode(true));

            typeof _value === 'object' ? iterate($item, _value) : fill($item, _value);
          }
        } else {
          typeof value === 'object' ? iterate($prop, value) : fill($prop, value);
        }
      }
    }
  };

  let fill = ($item, value) => {
    if (value === undefined) {
      return;
    }

    let tag = $item.tagName.toLowerCase();

    // Mimic Microdata API's Element.itemValue
    // http://www.w3.org/TR/microdata/#dom-itemvalue
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
      FlareTail.helpers.datetime.fill_element($item, value);
    } else {
      $item.textContent = value;
    }

    // Set the URL as the link label if empty
    if (tag === 'a' && $item.href === value && !$item.text) {
      $item.text = value;
    }

    // Set WAI-ARIA attribute when necessary
    if ($item.matches('meta[role="checkbox"]')) {
      $item.setAttribute('aria-checked', value);
    }
  };

  $scope.setAttribute('aria-busy', 'true');

  // Microdata
  iterate($scope, data);

  // Attributes
  for (let [attr, value] of Object.entries(attrs)) {
    let $items = [...$scope.querySelectorAll(`[data-attrs~="${CSS.escape(attr)}"]`)];

    if ($scope.matches(`[data-attrs~="${CSS.escape(attr)}"]`)) {
      $items.push($scope);
    }

    for (let $item of $items) if (value !== undefined) {
      $item.setAttribute(attr, value);
    }
  }

  // Support simple if-else switches
  for (let $if of $scope.querySelectorAll('[data-if]')) {
    // Hide the element if the data is undefined
    let hidden = $if.hidden = !data[$if.getAttribute('data-if')],
        $next = $if.nextElementSibling;

    if ($next && $next.hasAttribute('data-else')) {
      $next.hidden = !hidden;
    }
  }

  $scope.removeAttribute('aria-busy');

  return $scope;
};

FlareTail.helpers.content.get_fragment = function (id, prefix = undefined) {
  let $fragment = document.getElementById(id).content.cloneNode(true);

  if (prefix) {
    for (let attr of ['id', 'aria-owns', 'aria-controls', 'aria-labelledby']) {
      for (let $element of $fragment.querySelectorAll(`[${attr}]`)) {
        $element.setAttribute(attr, $element.getAttribute(attr).replace(/TID/, prefix));
      }
    }
  }

  return $fragment;
};

FlareTail.helpers.content.get_template = function (...args) {
  return this.get_fragment(...args).firstElementChild;
};

/* ------------------------------------------------------------------------------------------------------------------
 * Event
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.event = {};

FlareTail.helpers.event.ignore = event => {
  event.preventDefault();
  event.stopPropagation();

  return false;
};

// This function allows to set multiple event listeners as once
FlareTail.helpers.event.bind = function (that, $target, types, use_capture = false, unbind = false) {
  if (!$target) {
    return false;
  }

  for (let type of types) {
    if (!that[`on${type}`]) {
      continue; // No such handler
    }

    unbind ? $target.removeEventListener(type, that, use_capture) : $target.addEventListener(type, that, use_capture);
  }

  return true;
};

FlareTail.helpers.event.unbind = function (that, $target, types, use_capture = false) {
  this.bind(that, $target, types, use_capture, true);
};

// Async event handling using postMessage
FlareTail.helpers.event.async = function (callback) {
  if (this.queue === undefined) {
    this.queue = [];

    window.addEventListener('message', event => {
      if (event.source === window && event.data === 'AsyncEvent' && this.queue.length) {
        this.queue.shift().call();
      }
    });
  }

  this.queue.push(callback);
  window.postMessage('AsyncEvent', location.origin);
};

// Custom event dispatcher. The async option is enabled by default
FlareTail.helpers.event.trigger = function ($target, type, options = {}, async = true) {
  let callback = () => $target.dispatchEvent(new CustomEvent(type, options));

  // Local files have no origin (Bug 878297)
  async && location.origin !== 'null' ? this.async(callback) : callback();
};

/* ------------------------------------------------------------------------------------------------------------------
 * Keyboard
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.kbd = {};

/**
 * Assign keyboard shortcuts on a specific element
 *
 * @argument {Element} $target
 * @argument {Object.<String, Function>} map - Keybind patterns (S, Accel+Shift+R, Accel+O, etc. Multiple pattern should
 *  be separated with `|`) and function. Possible key values can be found at MDN. The supported modifiers here include
 *  Alt, Shift and Accel; Control and Meta are not supported.
 * @see {@link https://developer.mozilla.org/docs/Web/API/KeyboardEvent/key}
 * @see {@link https://developer.mozilla.org/docs/Web/API/KeyboardEvent/getModifierState}
 */
FlareTail.helpers.kbd.assign = function ($target, map) {
  let bindings = new Set();

  for (let [_combos, command] of Object.entries(map)) for (let _combo of _combos.split('|')) {
    let combo = _combo.split('+'),
        key = combo.pop().toLowerCase().replace('Space', ' '), // Space is an exception
        modifiers = new Set(combo);

    bindings.add([key, modifiers, command]);
  }

  $target.addEventListener('keydown', event => {
    let found = false;

    outer: for (let [key, modifiers, command] of bindings) {
      // Check the key value
      if (event.key.toLowerCase() !== key) {
        continue;
      }

      // Check modifier keys
      for (let mod of ['Alt', 'Shift', 'Accel']) {
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

    return found ? FlareTail.helpers.event.ignore(event) : true;
  });
};

/**
 * Fire a keydown event on a specific element.
 *
 * @argument {Element} $target
 * @argument {Integer} key
 */
FlareTail.helpers.kbd.dispatch = function ($target, key) {
  $target.dispatchEvent(new KeyboardEvent('keydown', { key }));
};

/* ------------------------------------------------------------------------------------------------------------------
 * Preferences
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.prefs = {};

/* ------------------------------------------------------------------------------------------------------------------
 * User Agent
 *
 * This utility only considers Gecko-based products for now
 * https://developer.mozilla.org/en-US/docs/Gecko_user_agent_string_reference
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.env = {
  device: {
    type: 'unknown',
    tv: false,
    desktop: false,
    mobile: false,
    tablet: false,
    phone: false,
  },
  platform: {
    name: 'unknown',
    windows: false,
    macintosh: false,
    linux: false,
    android: false,
    firefox: false,
  },
  touch: {
    enabled: window.matchMedia('(-moz-touch-enabled: 1)').matches
  }
};

{
  let env = FlareTail.helpers.env,
      ua_str = navigator.userAgent,
      pf_match = ua_str.match(/Windows|Macintosh|Linux|Android|Firefox/);

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
  } else if (env.platform.firefox) {
    env.device.type = 'tv';
    env.device.tv = true;
  } else {
    env.device.type = 'desktop';
    env.device.desktop = true;
  }

  document.documentElement.setAttribute('data-device', env.device.type);
  document.documentElement.setAttribute('data-platform', env.platform.name);
}

/* ------------------------------------------------------------------------------------------------------------------
 * App
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.app = {};

FlareTail.helpers.app.can_install = function (manifest = location.origin + '/manifest.webapp') {
  let apps = navigator.mozApps;

  return new Promise((resolve, reject) => {
    if (apps) {
      let request = apps.checkInstalled(manifest);

      request.addEventListener('success', event =>
        request.result ? reject(new Error('The app has already been installed')) : resolve());
      request.addEventListener('error', event => reject(new Error('Unknown error')));
    } else {
      reject(new Error('The app runtime is not available'));
    }
  });
};

FlareTail.helpers.app.install = function (manifest = location.origin + '/manifest.webapp') {
  let request = navigator.mozApps.install(manifest);

  return new Promise((resolve, reject) => {
    request.addEventListener('success', event => {
      FlareTail.helpers.event.trigger(window, 'AppInstalled');
      resolve();
    });
    request.addEventListener('error', event => {
      FlareTail.helpers.event.trigger(window, 'AppInstallFailed');
      reject(new Error(request.error.name));
    });
  });
};

FlareTail.helpers.app.fullscreen_enabled = function () {
  return document.fullscreenEnabled;
};

FlareTail.helpers.app.toggle_fullscreen = function ($element = document.body) {
  document.fullscreenElement ? document.exitFullscreen() : $element.requestFullscreen();
};

/* ------------------------------------------------------------------------------------------------------------------
 * Theme
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.theme = {};

Object.defineProperties(FlareTail.helpers.theme, {
  list: {
    enumerable: true,
    get: () => document.styleSheetSets
  },
  default: {
    enumerable: true,
    get: () => document.preferredStyleSheetSet
  },
  selected: {
    enumerable: true,
    get: () => document.selectedStyleSheetSet,
    set: name => document.selectedStyleSheetSet = name
  }
});

FlareTail.helpers.theme.preload_images = function () {
  let pattern = 'url\\("(.+?)"\\)',
      images = new Set(); // Use a Set to avoid duplicates

  for (let sheet of document.styleSheets) {
    for (let rule of sheet.cssRules) {
      let match = rule.style && rule.style.backgroundImage && rule.style.backgroundImage.match(RegExp(pattern, 'g'));

      if (!match) {
        continue;
      }

      // Support for multiple background
      for (let m of match) {
        images.add(m.match(RegExp(pattern))[1]);
      }
    }
  }

  let _load = src => new Promise((resolve, reject) => {
    let image = new Image();

    image.addEventListener('load', event => resolve());
    image.src = src;
  });

  return Promise.all([...images].map(src => _load(src)));
};

/* ------------------------------------------------------------------------------------------------------------------
 * Date & Time
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.datetime = {};

FlareTail.helpers.datetime.options = new Proxy({
  relative: false,
  timezone: 'local',
  updater_enabled: false,
  updater_interval: 60 // seconds
}, {
  set: (obj, prop, value) => {
    let dt = FlareTail.helpers.datetime;

    obj[prop] = value;

    // Update timezone & format on the current view
    dt.update_elements();

    // Start or stop the timer if the relative option is changed
    if (prop === 'relative' || prop === 'updater_enabled') {
      if (!document.hidden && dt.options.relative && dt.options.updater_enabled && !dt.updater) {
        dt.start_updater();
      } else if (dt.updater) {
        dt.stop_updater();
      }
    }

    return true;
  }
});

FlareTail.helpers.datetime.format = function (str, options = {}) {
  options.relative = options.relative !== undefined ? options.relative : this.options.relative;
  options.simple = options.simple || false;
  options.timezone = options.timezone || this.options.timezone;

  let now = new Date(),
      date = new Date(str),
      delta = now - date,
      shifted_date;

  if (options.relative) {
    let patterns = [
      [1000 * 60 * 60 * 24 * 365, '%dyr', 'Last year', '%d years ago'],
      [1000 * 60 * 60 * 24 * 30, '%dmo', 'Last month', '%d months ago'],
      [1000 * 60 * 60 * 24, '%dd', 'Yesterday', '%d days ago'],
      [1000 * 60 * 60, '%dh', '1 hour ago', '%d hours ago'],
      [1000 * 60, '%dm', '1 minute ago', '%d minutes ago'],
      [1000, '%ds', 'Just now', '%d seconds ago'],
      [0, 'Now', 'Just now', 'Just now'] // Less than 1 second
    ];

    let format = (ms, simple, singular, plural) => {
      let value = Math.floor(delta / ms);

      return (options.simple ? simple : value === 1 ? singular : plural).replace('%d', value);
    };

    for (let pattern of patterns) if (delta > pattern[0]) {
      return format(...pattern);
    }
  }

  // Timezone conversion
  // TODO: Rewrite this once the timezone support is added to the ECMAScript Intl API (Bug 837961)
  // TODO: Get the timezone of the Bugzilla instance, instead of hardcoding PST
  if (options.timezone !== 'local') {
    shifted_date = this.get_shifted_date(date, options.timezone === 'PST' ? -8 : 0);
  }

  if (options.simple && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
    let dates = now.getDate() - date.getDate();

    if (dates === 0) {
      return (shifted_date || date).toLocaleFormat('%R');
    }

    if (dates === 1) {
      return 'Yesterday';
    }
  }

  return (shifted_date || date).toLocaleFormat(options.simple ? '%b %e' : '%Y-%m-%d %R');
};

FlareTail.helpers.datetime.get_shifted_date = function (date, offset) {
  let dst = Math.max((new Date(date.getFullYear(), 0, 1)).getTimezoneOffset(),
                     (new Date(date.getFullYear(), 6, 1)).getTimezoneOffset())
                      > date.getTimezoneOffset(),
      utc = date.getTime() + (date.getTimezoneOffset() + (dst ? 60 : 0)) * 60000;

  return new Date(utc + offset * 3600000);
};

FlareTail.helpers.datetime.fill_element = function ($time, value, options = null) {
  if (!options) {
    options = {
      relative: $time.dataset.relative ? JSON.parse($time.dataset.relative) : undefined,
      simple: $time.dataset.simple ? JSON.parse($time.dataset.simple) : undefined
    };
  }

  $time.dateTime = value;
  $time.textContent = this.format(value, FlareTail.helpers.object.clone(options));
  $time.title = (new Date(value)).toString();

  if (options.relative !== undefined) {
    $time.dataset.relative = options.relative;
  }

  if (options.simple !== undefined) {
    $time.dataset.simple = options.simple;
  }

  return $time;
};

FlareTail.helpers.datetime.update_elements = function () {
  for (let $time of document.querySelectorAll('time')) {
    let data = $time.dataset,
        time = this.format($time.dateTime, {
          relative: data.relative !== undefined ? data.relative === 'true' : this.options.relative,
          simple: data.simple !== undefined ? data.simple === 'true' : this.options.simple
        });

    if ($time.textContent !== time) {
      $time.textContent = time;
    }
  }
};

FlareTail.helpers.datetime.start_updater = function () {
  this.updater = window.setInterval(() => this.update_elements(), this.options.updater_interval * 1000);
};

FlareTail.helpers.datetime.stop_updater = function () {
  window.clearInterval(this.updater);

  delete this.updater;
};

document.addEventListener('visibilitychange', event => {
  let dt = FlareTail.helpers.datetime;

  if (!document.hidden && dt.options.relative && dt.options.updater_enabled && !dt.updater) {
    dt.update_elements();
    dt.start_updater();
  } else if (dt.updater) {
    dt.stop_updater();
  }
});

/* ------------------------------------------------------------------------------------------------------------------
 * Network
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.network = {};

FlareTail.helpers.network.json = (url, body = undefined) => {
  return window.fetch(new Request(url, {
    method: body ? 'POST' : 'GET',
    headers: new Headers({ Accept: 'application/json' }),
    body,
  })).then(response => response.json());
};

FlareTail.helpers.network.jsonp = url => {
  let $script = document.body.appendChild(document.createElement('script')),
      callback_id = 'jsonp_' + Date.now(),
      cleanup = () => { $script.remove(); delete window[callback_id]; };

  return new Promise((resolve, reject) => {
    window[callback_id] = data => resolve(data);
    $script.addEventListener('load', event => cleanup());
    $script.addEventListener('error', event => { cleanup(); reject(new Error()); });
    $script.src = url + '?callback=' + callback_id;
  });
};

/* ------------------------------------------------------------------------------------------------------------------
 * History
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.history = {};

/* ------------------------------------------------------------------------------------------------------------------
 * Localization
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.l10n = {};

/* ------------------------------------------------------------------------------------------------------------------
 * Internationalization
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.i18n = {};

/* ------------------------------------------------------------------------------------------------------------------
 * Style
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.style = {};

FlareTail.helpers.style.get = ($element, property) => window.getComputedStyle($element, null).getPropertyValue(property);

/* ------------------------------------------------------------------------------------------------------------------
 * Object
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.object = {};

FlareTail.helpers.object.clone = obj => Object.assign({}, obj);

/* ------------------------------------------------------------------------------------------------------------------
 * Array
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.array = {};

FlareTail.helpers.array.clone = array => [...array];

FlareTail.helpers.array.join = (set, tag = undefined) => {
  let open_tag = tag ? `<${tag}>` : '',
      close_tag = tag ? `</${tag}>` : '',
      array = [...set].map(item => open_tag + FlareTail.helpers.string.sanitize(item) + close_tag),
      last = array.pop();

  return array.length ? array.join(', ') + ' and ' + last : last; // l10n
};

FlareTail.helpers.array.sort = (array, cond) => {
  // Normalization: ignore brackets for comparison
  let nomalized_values = new Map(),
      nomalize = str => {
        let value = nomalized_values.get(str);

        if (!value) {
          value = str.replace(/[\"\'\(\)\[\]\{\}<>«»_]/g, '').toLowerCase();
          nomalized_values.set(str, value);
        }

        return value;
      };

  array.sort((a, b) => {
    if (cond.order === 'descending') {
      [a, b] = [b, a]; // reverse()
    }

    let a_val = a.data ? a.data[cond.key] : a[cond.key],
        b_val = b.data ? b.data[cond.key] : b[cond.key];

    if (!a_val || !b_val) {
      return true;
    }

    switch (cond.type) {
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
        return nomalize(a_val) > nomalize(b_val);
      }
    }
  });

  return array;
};

/* ------------------------------------------------------------------------------------------------------------------
 * String
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.string = {};

FlareTail.helpers.string.sanitize = str => {
  let $p = document.createElement('p');

  $p.textContent = str;

  return $p.innerHTML;
};

FlareTail.helpers.string.strip_tags = str => {
  let $p = document.createElement('p');

  $p.innerHTML = str;

  return $p.textContent;
};

/* ------------------------------------------------------------------------------------------------------------------
 * RegExp
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.regexp = {};

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
FlareTail.helpers.regexp.escape = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ------------------------------------------------------------------------------------------------------------------
 * Misc.
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.helpers.misc = {};

/**
 * Create a GUID.
 *
 * @argument {undefined}
 * @argument {String} guid - Such as 80B2A9ED-9103-4847-B69B-0BC37F7F7CF6
 */
FlareTail.helpers.misc.uuidgen = () => URL.createObjectURL(new Blob()).match(/[0-9a-f\-]+$/)[0].toUpperCase();
