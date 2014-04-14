/**
 * FlareTail Utility Functions
 * Copyright © 2014 Kohei Yoshino. All rights reserved.
 */

'use strict';

let FlareTail = FlareTail || {};
FlareTail.util = {};

/* ----------------------------------------------------------------------------------------------
 * Template
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.template = {};

FlareTail.util.template.fill = function (selector, data) {
  let $content = document.querySelector(selector).content.cloneNode(true); // DocumentFragment

  for (let [prop, value] of Iterator(data)) {
    // Find the Schema.org property
    let $item = $content.querySelector('[itemprop="' + prop + '"]');

    if ($item) {
      $item.itemValue = value;
      continue;
    }

    // Then find the data attribute
    $item = $content.querySelector('[data-' + prop + ']');

    if ($item) {
      $item.setAttribute('data-' + prop, value);
    }
  }

  return $content;
};

/* ----------------------------------------------------------------------------------------------
 * Event
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.event = {};

FlareTail.util.event.set_keybind = function ($target, key, modifiers, command) {
  $target.addEventListener('keydown', event => {
    // Check the key code
    if (event.keyCode !== event['DOM_VK_' + key]) {
      return;
    }

    // Check modifier keys
    modifiers = modifiers ? modifiers.split(',') : [];

    for (let mod of ['shift', 'ctrl', 'meta', 'alt']) {
      if ((modifiers.indexOf(mod) > -1 && !event[mod + 'Key']) ||
          (modifiers.indexOf(mod) === -1 && event[mod + 'Key'])) {
        return;
      }
    }

    // Execute command
    command(event);
  });
};

FlareTail.util.event.ignore = event => {
  event.preventDefault();
  event.stopPropagation();

  return false;
};

// This function allows to set multiple event listeners as once
FlareTail.util.event.bind = function (that, $target, types, use_capture = false, unbind = false) {
  if (!$target) {
    return false;
  }

  for (let type of types) {
    if (!that['on' + type]) {
      continue; // No such handler
    }

    unbind ? $target.removeEventListener(type, that, use_capture)
           : $target.addEventListener(type, that, use_capture);
  }

  return true;
};

FlareTail.util.event.unbind = function (that, $target, types, use_capture = false) {
  this.bind(that, $target, types, use_capture, true);
};

// Async event handling using postMessage
FlareTail.util.event.async = function (callback) {
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
FlareTail.util.event.dispatch = function ($target, type, options = {}, async = true) {
  let callback = () => {
    $target.dispatchEvent(new CustomEvent(type, options));
  };

  async ? this.async(callback) : callback();
};

/* ----------------------------------------------------------------------------------------------
 * Request
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.request = {};

FlareTail.util.request.build_query = function (query) {
  let fields = new Set();

  for (let [key, value] of Iterator(query)) {
    for (let val of (Array.isArray(value) ? value : [value])) {
      fields.add(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    }
  }

  return '?' + [...fields].join('&');
};

FlareTail.util.request.parse_query_str = function (str, casting = true) {
  let query = new Map();

  for ([k, v] of [q.split('=') for (q of str.split('&'))]) {
    let arr = false,
        key = decodeURIComponent(k).replace(/\[\]$/, () => {
          arr = true; // The value should be an array when the key is a string like 'component[]'
          return '';
        }),
        value = decodeURIComponent(v).replace(/\+/g, ' '),
        _value = query.get(key); // Existing value

    if (casting) {
      if (value === 'true') {
        value = true; // Convert to Boolean
      }

      if (value === 'false') {
        value = false; // Convert to Boolean
      }

      if (!Number.isNaN(value)) {
        value = Number.parseFloat(value); // Convert to Number
      }
    }

    if (_value) {
      _value = Array.isArray(_value) ? _value : [_value];
      _value.push(value);
    } else {
      _value = arr ? [value] : value;
    }

    query.set(key, _value);
  }

  return query;
};

/* ----------------------------------------------------------------------------------------------
 * Preferences
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.prefs = {};

/* ----------------------------------------------------------------------------------------------
 * Storage
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.Storage = function () {
  let req = this.request = indexedDB.open('MyTestDatabase', 1),
      db = this.db = null;

  req.addEventListener('error', event => {});
  req.addEventListener('success', event => db = request.result);
  db.addEventListener('error', event => {});
};

/* ----------------------------------------------------------------------------------------------
 * Device
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.device = {
  touch: {
    enabled: window.matchMedia('(-moz-touch-enabled: 1)').matches
  }
};

let (ua = navigator.userAgent, device = FlareTail.util.device) {
  // A device form factor
  // https://developer.mozilla.org/en-US/docs/Gecko_user_agent_string_reference
  if (ua.contains('Tablet')) {
    device.type = 'mobile-tablet';
  } else if (ua.contains('Mobile')) {
    device.type = 'mobile-phone';
  } else {
    device.type = 'desktop';
  }

  document.documentElement.setAttribute('data-device-type', device.type);
}

/* ----------------------------------------------------------------------------------------------
 * App
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.app = {};

FlareTail.util.app.can_install = function (manifest, callback) {
  let apps = navigator.mozApps;

  if (!apps) {
    callback(false);
    return;
  }

  let request = apps.checkInstalled(manifest);
  request.addEventListener('success', event => {
    callback(!request.result);
  });
  request.addEventListener('error', event => callback(false));
};

FlareTail.util.app.install = function (manifest, callback) {
  let request = navigator.mozApps.install(manifest);
  request.addEventListener('success', event => callback(event));
  request.addEventListener('error', event => callback(event));
};

FlareTail.util.app.fullscreen_enabled = function () {
  return document.fullscreenEnabled || document.mozFullScreenEnabled;
};

FlareTail.util.app.toggle_fullscreen = function () {
  if (document.fullscreenElement === null || document.mozFullScreenElement === null) {
    if (document.body.requestFullscreen) {
      document.body.requestFullscreen();
    } else if (document.body.mozRequestFullScreen) {
      document.body.mozRequestFullScreen();
    }
  } else {
    if (document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    }
  }
};

FlareTail.util.app.auth_notification = function () {
  Notification.requestPermission(permission => {});
};

FlareTail.util.app.show_notification = function (title, options = {}) {
  new Notification(title, {
    dir: options.dir || 'auto',
    lang: options.lang || 'en-US',
    body: options.body || '',
    tag: options.tag || '',
    icon: options.icon || ''
  });
};

/* ----------------------------------------------------------------------------------------------
 * Theme
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.theme = {};

Object.defineProperties(FlareTail.util.theme, {
  'list': {
    enumerable : true,
    get: () => document.styleSheetSets
  },
  'default': {
    enumerable : true,
    get: () => document.preferredStyleSheetSet
  },
  'selected': {
    enumerable : true,
    get: () => document.selectedStyleSheetSet,
    set: name => document.selectedStyleSheetSet = name
  }
});

FlareTail.util.theme.preload_images = function (callback) {
  let pattern = 'url\\("(.+?)"\\)',
      images = new Set();

  for (let [i, sheet] of Iterator(document.styleSheets)) {
    for (let [i, rule] of Iterator(sheet.cssRules)) {
      let match = rule.style && rule.style.backgroundImage &&
                  rule.style.backgroundImage.match(RegExp(pattern, 'g'));

      if (!match) {
        continue;
      }

      // Support for multiple background
      for (let m of match) {
        let src = m.match(RegExp(pattern))[1];

        if (!images.has(src)) {
          images.add(src);
        }
      }
    }
  }

  let total = images.size,
      loaded = 0;

  for (let src of images) {
    let image = new Image();
    image.addEventListener('load', event => {
      loaded++;
      if (loaded === total) {
        callback();
      }
    });
    image.src = src;
  }
};

/* ----------------------------------------------------------------------------------------------
 * Date & Time
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.datetime = {};

FlareTail.util.datetime.options = new Proxy({
  relative: false,
  timezone: 'local',
  updater_enabled: false,
  updater_interval: 60 // seconds
}, {
  get: (obj, prop) => obj[prop], // Always require the get trap (Bug 895223)
  set: (obj, prop, value) => {
    let dt = FlareTail.util.datetime;

    obj[prop] = value;

    // Update timezone & format on the current view
    dt.update_elements();

    // Start or stop the timer if the relative option is changed
    if (prop === 'relative' || prop === 'updater_enabled') {
      if (dt.options.relative && dt.options.updater_enabled) {
        if (!dt.updater) {
          dt.updater = window.setInterval(() => dt.update_elements(),
                                          dt.options.updater_interval * 1000);
        }
      } else if (dt.updater) {
        window.clearInterval(dt.updater);
        delete dt.updater;
      }
    }
  }
});

FlareTail.util.datetime.format = function (str, options = {}) {
  options.relative = options.relative !== undefined ? options.relative : this.options.relative;
  options.simple = options.simple || false;
  options.timezone = options.timezone || this.options.timezone;

  let now = new Date(),
      date = new Date(str),
      shifted_date;

  if (options.relative) {
    let patterns = [
          [now.getFullYear() - date.getFullYear(), '%dyr', 'Last year', '%d years ago'],
          [now.getMonth() - date.getMonth(), '%dmo', 'Last month', '%d months ago'],
          [now.getDate() - date.getDate(), '%dd', 'Yesterday', '%d days ago'],
          [now.getHours() - date.getHours(), '%dh', '1 hour ago', '%d hours ago'],
          [now.getMinutes() - date.getMinutes(), '%dm', '1 minute ago', '%d minutes ago'],
          [now.getSeconds() - date.getSeconds(), '%ds', 'Just now', '%d seconds ago'],
          [1, '%ds', 'Just now', 'Just now'] // Less than 1 second
        ],
        format = (value, simple, singular, plural) =>
          (options.simple ? simple : value === 1 ? singular : plural).replace('%d', value);

    for (let pattern of patterns) {
      if (pattern[0] > 0) {
        return format(...pattern);
      }
    }
  }

  // Timezone conversion
  // TODO: Rewrite this once the timezone support is added to the ECMAScript Intl API (Bug 837961)
  // TODO: Get the timezone of the Bugzilla instance, instead of hardcoding PST
  if (options.timezone !== 'local') {
    let dst = Math.max((new Date(date.getFullYear(), 0, 1)).getTimezoneOffset(),
                       (new Date(date.getFullYear(), 6, 1)).getTimezoneOffset())
                        > date.getTimezoneOffset(),
        utc = date.getTime() + (date.getTimezoneOffset() + (dst ? 60 : 0)) * 60000,
        offset = options.timezone === 'PST' ? 3600000 * -8 : 0;

    shifted_date = new Date(utc + offset);
  }

  if (options.simple &&
      date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
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

FlareTail.util.datetime.fill_element = function ($time, value, options = {}) {
  $time.dateTime = value;
  $time.textContent = this.format(value, FlareTail.util.object.clone(options));
  $time.title = (new Date(value)).toString();

  if (options.relative !== undefined) {
    $time.dataset.relative = options.relative;
  }

  if (options.simple !== undefined) {
    $time.dataset.simple = options.simple;
  }

  return $time;
};

FlareTail.util.datetime.update_elements = function () {
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

/* ----------------------------------------------------------------------------------------------
 * Network
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.network = {};

/* ----------------------------------------------------------------------------------------------
 * History
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.history = {};

/* ----------------------------------------------------------------------------------------------
 * Localization
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.l10n = {};

/* ----------------------------------------------------------------------------------------------
 * Internationalization
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.i18n = {};

/* ----------------------------------------------------------------------------------------------
 * Style
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.style = {};

FlareTail.util.style.get = ($element, property) => {
  return window.getComputedStyle($element, null).getPropertyValue(property);
};

/* ----------------------------------------------------------------------------------------------
 * Object
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.object = {};

FlareTail.util.object.clone = obj => JSON.parse(JSON.stringify(obj));

/* ----------------------------------------------------------------------------------------------
 * Array
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.array = {};

FlareTail.util.array.clone = array => [...array];

/* ----------------------------------------------------------------------------------------------
 * String
 * ---------------------------------------------------------------------------------------------- */

FlareTail.util.string = {};

FlareTail.util.string.sanitize = str => {
  let chars = new Map(Iterator({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;'
  }));

  return str.replace(/./g, match => chars.get(match) || match);
};

FlareTail.util.string.strip_tags = str => {
  let $p = document.createElement('p');
  $p.innerHTML = str;

  return $p.textContent;
};
