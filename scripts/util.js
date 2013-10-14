/**
 * BriteGrid Utility Library
 * Copyright © 2012 BriteGrid. All rights reserved.
 * Using: ECMAScript Harmony
 * Requires: Firefox 18
 */

'use strict';

let BriteGrid = BriteGrid || {};
BriteGrid.util = {};

/* --------------------------------------------------------------------------
 * Event
 * -------------------------------------------------------------------------- */

BriteGrid.util.event = {};

BriteGrid.util.event.set_keybind = function ($target, key, modifiers, command) {
  $target.addEventListener('keydown', function (event) {
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

BriteGrid.util.event.ignore = function (event) {
  event.preventDefault();
  event.stopPropagation();
  return false;
};

// This function allows to set multiple event listeners as once
BriteGrid.util.event.bind = function (that, $target, types, use_capture = false, unbind = false) {
  if (!$target) {
    return false;
  }

  for (let type of types) {
    if (!that['on' + type]) {
      continue; // No such handler
    }

    if (unbind) {
      $target.removeEventListener(type, that, use_capture);
    } else {
      $target.addEventListener(type, that, use_capture);
    }
  }

  return true;
};

BriteGrid.util.event.unbind = function (that, $target, types, use_capture = false) {
  this.bind(that, $target, types, use_capture, true);
};

/* --------------------------------------------------------------------------
 * Request
 * -------------------------------------------------------------------------- */

BriteGrid.util.request = {};

BriteGrid.util.request.build_query = function (query) {
  let fields = new Set();

  for (let [key, value] of Iterator(query)) {
    for (let val of (Array.isArray(value) ? value : [value])) {
      fields.add(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    }
  }

  return '?' + [...fields].join('&');
};

/* --------------------------------------------------------------------------
 * Preferences
 * -------------------------------------------------------------------------- */

BriteGrid.util.prefs = {};

/* --------------------------------------------------------------------------
 * Storage
 * -------------------------------------------------------------------------- */

BriteGrid.util.Storage = function () {
  let req = this.request = indexedDB.open('MyTestDatabase', 1),
      db = this.db = null;
  req.addEventListener('error', function (event) {});
  req.addEventListener('success', function (event) db = request.result);
  db.addEventListener('error', function (event) {});
};

/* --------------------------------------------------------------------------
 * Device
 * -------------------------------------------------------------------------- */

BriteGrid.util.device = {
  mobile: {
    mql: window.matchMedia('(max-width: 640px)')
  },
  touch: {
    enabled: window.matchMedia('(-moz-touch-enabled: 1)').matches
  }
};

{
  let ua = navigator.userAgent,
      device = BriteGrid.util.device;

  // A device form factor
  // https://developer.mozilla.org/en-US/docs/Gecko_user_agent_string_reference
  if (ua.contains('Tablet')) {
    device.type = 'tablet';
  } else if (ua.contains('Mobile')) {
    device.type = 'mobile';
  } else {
    device.type = 'desktop';
  }

  document.documentElement.setAttribute('data-device-type', device.type);
}

/* --------------------------------------------------------------------------
 * App
 * -------------------------------------------------------------------------- */

BriteGrid.util.app = {};

BriteGrid.util.app.can_install = function (manifest, callback) {
  let apps = navigator.mozApps;
  if (!apps) {
    callback(false);
    return;
  }

  let request = apps.checkInstalled(manifest);
  request.addEventListener('success', function (event) {
    // IndexedDB has been deactivated in WebAppRT on Firefox 24 and earlier versions (Bug 827346)
    let idb_enabled = navigator.userAgent.match(/(Mobile|Tablet)/) ||
                      navigator.userAgent.match(/Firefox\/(\d+)/) && parseInt(RegExp.$1) >= 25;
    callback(!request.result && idb_enabled);
  });
  request.addEventListener('error', function (event) callback(false));
};

BriteGrid.util.app.install = function (manifest, callback) {
  let request = navigator.mozApps.install(manifest);
  request.addEventListener('success', function (event) callback(event));
  request.addEventListener('error', function (event) callback(event));
};

BriteGrid.util.app.fullscreen_enabled = function () {
  return document.fullscreenEnabled || document.mozFullScreenEnabled;
};

BriteGrid.util.app.toggle_fullscreen = function () {
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

BriteGrid.util.app.auth_notification = function () {
  if (!('Notification' in window)) {
    return;
  }
  Notification.requestPermission(function (permission) {});
};

BriteGrid.util.app.show_notification = function (title, options = {}) {
  if (!('Notification' in window)) {
    return;
  }
  new Notification(title, {
    dir: options.dir || 'auto',
    lang: options.lang || 'en-US',
    body: options.body || '',
    tag: options.tag || '',
    icon: options.icon || ''
  });
};

/* --------------------------------------------------------------------------
 * Theme
 * -------------------------------------------------------------------------- */

BriteGrid.util.theme = {};

Object.defineProperties(BriteGrid.util.theme, {
  'list': {
    enumerable : true,
    get: function () document.styleSheetSets
  },
  'default': {
    enumerable : true,
    get: function () document.preferredStyleSheetSet
  },
  'selected': {
    enumerable : true,
    // A regression since Firefox 20: selectedStyleSheetSet returns empty (Bug 894874)
    get: function () document.selectedStyleSheetSet ||
                     document.lastStyleSheetSet || document.preferredStyleSheetSet,
    set: function (name) document.selectedStyleSheetSet = name
  }
});

BriteGrid.util.theme.preload_images = function (callback) {
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
    image.addEventListener('load', function (event) {
      loaded++;
      if (loaded === total) {
        callback();
      }
    });
    image.src = src;
  }
};

/* --------------------------------------------------------------------------
 * Network
 * -------------------------------------------------------------------------- */

BriteGrid.util.network = {};

/* --------------------------------------------------------------------------
 * History
 * -------------------------------------------------------------------------- */

BriteGrid.util.history = {};

/* --------------------------------------------------------------------------
 * Localization
 * -------------------------------------------------------------------------- */

BriteGrid.util.l10n = {};

/* --------------------------------------------------------------------------
 * Internationalization
 * -------------------------------------------------------------------------- */

BriteGrid.util.i18n = {};

BriteGrid.util.i18n.options = {
  date: {
    timezone: 'local',
    format: 'relative'
  }
};

BriteGrid.util.i18n.format_date = function (str) {
  let timezone = this.options.date.timezone,
      format = this.options.date.format,
      now = new Date(),
      date = new Date(str),
      shifted_date,
      dst = Math.max((new Date(date.getFullYear(), 0, 1)).getTimezoneOffset(),
        (new Date(date.getFullYear(), 6, 1)).getTimezoneOffset()) > date.getTimezoneOffset();

  // TODO: We can soon use the ECMAScript Intl API
  // https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString

  // Timezone conversion
  if (timezone !== 'local') {
    let utc = date.getTime() + (date.getTimezoneOffset() + (dst ? 60 : 0)) * 60000,
        offset = (timezone === 'PST') ? 3600000 * (dst ? -7 : -8) : 0;
    shifted_date = new Date(utc + offset);
  }

  // Relative dates
  if (format === 'relative') {
    if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
      if (date.getDate() === now.getDate()) {
        return (shifted_date || date).toLocaleFormat('Today %l:%M %p'); // l10n
      }
      if (date.getDate() === now.getDate() - 1) {
        return (shifted_date || date).toLocaleFormat('Yesterday %l:%M %p'); // l10n
      }
    }
  }

  return (shifted_date || date).toLocaleFormat('%Y-%m-%d %l:%M %p');
};

/* --------------------------------------------------------------------------
 * Style
 * -------------------------------------------------------------------------- */

BriteGrid.util.style = {};

BriteGrid.util.style.get = function ($element, property) {
  return window.getComputedStyle($element, null).getPropertyValue(property);
};

/* --------------------------------------------------------------------------
 * Object
 * -------------------------------------------------------------------------- */

BriteGrid.util.object = {};

BriteGrid.util.object.clone = function (obj) JSON.parse(JSON.stringify(obj));

/* --------------------------------------------------------------------------
 * Array
 * -------------------------------------------------------------------------- */

BriteGrid.util.array = {};

BriteGrid.util.array.clone = function (array) Array.slice(array);

/* --------------------------------------------------------------------------
 * String
 * -------------------------------------------------------------------------- */

BriteGrid.util.string = {};

BriteGrid.util.string.sanitize = function (str) {
  let chars = new Map(Iterator({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;'
  }));

  return str.replace(/./g, function (match) chars.get(match) || match);
};

/* --------------------------------------------------------------------------
 * Polyfills
 * -------------------------------------------------------------------------- */

// ChildNode.remove (requires Firefox 23)
if (!('remove' in Element.prototype)) {
  Element.prototype.remove = function () {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }
}
