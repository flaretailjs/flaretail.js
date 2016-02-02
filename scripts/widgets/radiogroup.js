/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the radiogroup role.
 * @extends FlareTail.widgets.Select
 * @see {@link https://www.w3.org/TR/wai-aria/complete#radiogroup}
 */
FlareTail.widgets.RadioGroup = class RadioGroup extends FlareTail.widgets.Select {
  /**
   * Get a RadioGroup instance.
   * @constructor
   * @argument {HTMLElement} $container - <menu role="radiogroup">
   * @argument {Array.<Object>} data - Optional data.
   * @return {Object} widget
   */
  constructor ($container, data) {
    super(); // This does nothing but is required before using `this`

    this.view = { $container };

    this.options = {
      item_roles: ['radio'],
      item_selector: '[role="radio"]',
      selected_attr: 'aria-checked',
      focus_cycling: true
    };

    this.activate();
  }
}
