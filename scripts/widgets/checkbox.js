/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the checkbox role.
 * @extends FlareTail.widgets.Input
 * @see {@link https://www.w3.org/TR/wai-aria/complete#checkbox}
 */
FlareTail.widgets.CheckBox = class CheckBox extends FlareTail.widgets.Input {
  /**
   * Get a CheckBox instance.
   * @constructor
   * @argument {HTMLElement} $checkbox - <span role="checkbox">
   * @return {Object} widget
   */
  constructor ($checkbox) {
    super(); // This does nothing but is required before using `this`

    this.view = { $checkbox };

    $checkbox.tabIndex = 0;

    Object.defineProperties(this, {
      checked: {
        enumerable: true,
        get: () => $checkbox.getAttribute('aria-checked') === 'true',
        set: checked => {
          $checkbox.setAttribute('aria-checked', checked);
          FlareTail.helpers.event.trigger($checkbox, 'Toggled', { detail: { checked }});

          // Set Microdata when necessary
          if ($checkbox.matches('meta[content]')) {
            $checkbox.setAttribute('content', checked);
          }
        }
      }
    });

    FlareTail.helpers.event.bind(this, $checkbox, ['keydown', 'click', 'contextmenu']);
  }

  /**
   * Called whenever a key is pressed while the checkbox gets focused. Treat the Space key as a click.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  onkeydown (event) {
    if (event.key === ' ') { // Space
      this.view.$checkbox.click();
    }
  }

  /**
   * Called whenever the checkbox is clicked. Change the checked state.
   * @argument {MouseEvent} event - The click event.
   * @return {Boolean} default - Always false.
   */
  onclick (event) {
    this.checked = !this.checked;
    this.view.$checkbox.focus();

    return false;
  }

  /**
   * Set an event listener on the widget.
   * @argument {*} args - The event type and handler.
   * @return {undefined}
   */
  bind (...args) {
    this.view.$checkbox.addEventListener(...args);
  }
}
