/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Declare the FlareTail.js namespace.
 * @namespace
 */
const FlareTail = {};

FlareTail.helpers = {};

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
FlareTail.helpers.misc.uuidgen = () => URL.createObjectURL(new Blob()).split('/')[1].toUpperCase();
