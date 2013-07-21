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

BriteGrid.util.event.ignore = function (event) {
  event.preventDefault();
  event.stopPropagation();
  return false;
};

// This function allows to set multiple event listeners as once
BriteGrid.util.event.bind = function (that, target, types, use_capture = false, unbind = false) {
  if (!target) {
    return false;
  }

  for (let type of types) {
    if (!that['on' + type]) {
      continue; // No such handler
    }

    if (unbind) {
      target.removeEventListener(type, that, use_capture);
    } else {
      target.addEventListener(type, that, use_capture);
    }
  }

  return true;
};

BriteGrid.util.event.unbind = function (that, target, types, use_capture = false)
{
  this.bind(that, target, types, use_capture, true);
};

/* --------------------------------------------------------------------------
 * Request
 * -------------------------------------------------------------------------- */

BriteGrid.util.request = {};

BriteGrid.util.request.build_query = function (query) {
  let fields = [];

  for (let [key, value] of Iterator(query)) {
    value = Array.isArray(value) ? value : [value];
    for (let val of value) {
      fields.push([encodeURIComponent(key), encodeURIComponent(val)].join('='));
    }
  }

  return fields.join('&');
};

/* --------------------------------------------------------------------------
 * Preferences
 * -------------------------------------------------------------------------- */

BriteGrid.util.prefs = {};

/* --------------------------------------------------------------------------
 * Storage
 * -------------------------------------------------------------------------- */

BriteGrid.util.Storage = function () {
  let req = this.request = indexedDB.open("MyTestDatabase", 1),
      db = this.db = null;
  req.addEventListener('error', function (event) {
  });
  req.addEventListener('success', function (event) {
    db = request.result;
  });
  db.addEventListener('error', function (event) {
  });
};

/* --------------------------------------------------------------------------
 * App
 * -------------------------------------------------------------------------- */

BriteGrid.util.app = {};

BriteGrid.util.app.can_install = function (callback) {
  let apps = navigator.mozApps;
  if (!apps) {
    callback(false);
    return;
  }

  let request = apps.getInstalled();
  request.addEventListener('success', function () {
    callback(request.result.length === 0);
  });
  request.addEventListener('error', function () {
    callback(false);
  });
};

BriteGrid.util.app.install = function (manifest, callback) {
  let request = navigator.mozApps.install(manifest);
  request.addEventListener('success', function (event) {
    callback(event);
  });
  request.addEventListener('error', function (event) {
    callback(event);
  });
};

/* --------------------------------------------------------------------------
 * Theme
 * -------------------------------------------------------------------------- */

BriteGrid.util.theme = {};

Object.defineProperties(BriteGrid.util.theme, {
  'list': {
    enumerable : true,
    get: function () { return document.styleSheetSets; }
  },
  'default': {
    enumerable : true,
    get: function () { return document.preferredStyleSheetSet; }
  },
  'selected': {
    enumerable : true,
    get: function () { return document.selectedStyleSheetSet; },
    set: function (name) { document.selectedStyleSheetSet = name; }
  }
});

BriteGrid.util.theme.preload_images = function (callback) {
  let pattern = 'url\\("(.+?)"\\)',
      images = new Set();

  for (let [i, sheet] of Iterator(document.styleSheets)) {
    for (let [i, rule] of Iterator(sheet.cssRules)) {
      let match = rule.style && rule.style.backgroundImage.match(RegExp(pattern, 'g'));
      if (!match) {
        continue;
      }
      // Support for multiple background
      for (let m of match) {
        let src = m.match(RegExp(pattern))[1];
        if (images.has(src)) {
          continue;
        }
        images.add(src);
      }
    }
  }

  // Note that Set.size was a method in Firefox 18 and earlier
  let total = typeof images.size === 'function' ? images.size() : images.size,
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
 * Style
 * -------------------------------------------------------------------------- */

BriteGrid.util.style = {};

BriteGrid.util.style.get = function (element, property) {
  return window.getComputedStyle(element, null).getPropertyValue(property);
};

/* --------------------------------------------------------------------------
 * Object
 * -------------------------------------------------------------------------- */

BriteGrid.util.object = {};

BriteGrid.util.object.clone = function (obj) {
  return JSON.parse(JSON.stringify(obj));
};

BriteGrid.util.object.equals = function (o1, o2) {
  return o1.toSource() === o2.toSource();
};

/* --------------------------------------------------------------------------
 * Array
 * -------------------------------------------------------------------------- */

BriteGrid.util.array = {};

BriteGrid.util.array.clone = function (array) {
  return Array.slice(array);
};

/* --------------------------------------------------------------------------
 * String
 * -------------------------------------------------------------------------- */

BriteGrid.util.string = {};

BriteGrid.util.string.sanitize = function (str) {
  let chars = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;'
  };

  return str.replace(/./g, function (match) {
    return match in chars ? chars[match] : match;
  });
};
