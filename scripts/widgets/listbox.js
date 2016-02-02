/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the listbox role.
 * @extends FlareTail.widgets.Select
 * @see {@link https://www.w3.org/TR/wai-aria/complete#listbox}
 */
FlareTail.widgets.ListBox = class ListBox extends FlareTail.widgets.Select {
  /**
   * Get a ListBox instance.
   * @constructor
   * @argument {HTMLElement} $container - <menu role="listbox">
   * @argument {Array.<Object>} [data] - Optional data.
   * @argument {Object} [options] - This attribute on the listbox element is also supported:
   *  - aria-multiselectable
   * @return {Object} widget
   */
  constructor ($container, data = undefined, options = {}) {
    super(); // This does nothing but is required before using `this`

    this.view = { $container };

    this.options = {
      item_roles: ['option'],
      item_selector: '[role="option"]',
      search_enabled: options.search_enabled !== undefined ? options.search_enabled : true
    };

    this.handler = {
      get: (obj, prop) => {
        if (prop === 'selected' || prop === 'disabled' || prop === 'hidden') {
          return obj.$element.getAttribute(`aria-${prop}`) === 'true';
        }

        return obj[prop];
      },
      set: (obj, prop, value) => {
        if (prop === 'selected' || prop === 'disabled' || prop === 'hidden') {
          obj.$element.setAttribute(`aria-${prop}`, value);
        }

        obj[prop] = value;

        return true;
      }
    };

    this.data = {};

    if (data) {
      this.data.structure = data;
      this.build();
    }

    this.activate();

    if (!data) {
      this.get_data();
    }
  }

  /**
   * Build the listbox dynamically with the provided data.
   * @argument {undefined}
   * @return {undefined}
   */
  build () {
    let map = this.data.map = new Map(),
        $fragment = new DocumentFragment(),
        $_item = document.createElement('li');

    $_item.tabIndex = -1;
    $_item.setAttribute('role', 'option');
    $_item.appendChild(document.createElement('label'));

    for (let item of this.data.structure) {
      let $item = item.$element = $fragment.appendChild($_item.cloneNode(true));

      $item.id = item.id;
      $item.setAttribute('aria-selected', item.selected ? 'true' : 'false');
      $item.firstElementChild.textContent = item.label;

      if (item.data) {
        for (let [prop, value] of Object.entries(item.data)) {
          $item.dataset[prop] = value;
        }
      }

      // Save the item/obj reference
      map.set(item.label, new Proxy(item, this.handler));
    }

    this.view.$container.appendChild($fragment);
  }

  /**
   * Retrieve the listbox data from a static list markup.
   * @argument {undefined}
   * @return {undefined}
   */
  get_data () {
    let map = this.data.map = new Map();

    this.data.structure = this.view.members.map($item => {
      let item = { $element: $item, id: $item.id, label: $item.textContent };

      if (Object.keys($item.dataset).length) {
        item.data = {};

        for (let [prop, value] of Object.entries($item.dataset)) {
          item.data[prop] = value;
        }
      }

      // Save the item/obj reference
      map.set(item.label, new Proxy(item, this.handler));

      return item;
    });
  }

  /**
   * Filter the listbox options by values.
   * @argument {Array.<String>} list - Values to be displayed.
   * @return {undefined}
   */
  filter (list) {
    let $container = this.view.$container;

    $container.setAttribute('aria-busy', 'true'); // Prevent reflows

    // Filter the options
    for (let [name, item] of this.data.map) {
      item.selected = false;
      item.disabled = list.length && !list.includes(name);
    }

    // Update the member list
    this.view.members = [...$container.querySelectorAll(
      '[role="option"]:not([aria-disabled="true"]):not([aria-hidden="true"])')];

    if (this.view.selected.length) {
      this.view.selected = [];
    }

    $container.removeAttribute('aria-busy');
  }
}
