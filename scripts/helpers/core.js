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
FlareTail.helpers.misc.uuidgen = () => URL.createObjectURL(new Blob()).match(/[0-9a-f\-]+$/)[0].toUpperCase();
