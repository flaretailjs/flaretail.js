/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the button role.
 * @extends FlareTail.widgets.Command
 * @see {@link https://www.w3.org/TR/wai-aria/complete#button}
 */
FlareTail.widgets.Button = class Button extends FlareTail.widgets.Command {
  /**
   * Get a Button instance.
   * @constructor
   * @argument {HTMLElement} $button - <span role="button">
   * @return {Object} widget
   */
  constructor ($button) {
    super(); // This does nothing but is required before using `this`

    this.view = { $button };

    this.data = new Proxy({
      disabled: $button.matches('[aria-disabled="true"]'),
      pressed: $button.matches('[aria-pressed="true"]')
    },
    {
      set: (obj, prop, value) => {
        if (prop === 'disabled' || prop === 'pressed') {
          $button.setAttribute(`aria-${prop}`, value);
        }

        obj[prop] = value;

        return true;
      }
    });

    this.options = {
      toggle: $button.hasAttribute('aria-pressed')
    };

    FlareTail.helpers.event.bind(this, $button, ['click', 'keydown']);

    if ($button.matches('[aria-haspopup="true"]')) {
      this.activate_popup();
    }
  }

  /**
   * Called whenever a click event is triggered. If this is a toggle button, change the state.
   * @argument {MouseEvent} event - The click event.
   * @return {undefined}
   */
  onclick (event) {
    let pressed = false;

    FlareTail.helpers.event.ignore(event);

    if (this.data.disabled) {
      return;
    }

    if (this.options.toggle) {
      pressed = this.data.pressed = !this.data.pressed;
    }

    FlareTail.helpers.event.trigger(this.view.$button, 'Pressed', { detail: { pressed }});
  }

  /**
   * Called whenever a keydown event is triggered. If the key is Space or Enter, treat the event as a click. If the
   * button owns a menu, select a menu item or close the menu.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  onkeydown (event) {
    let key = event.key;

    if (key === ' ' || key === 'Enter') { // Space or Enter
      this.onclick(event);
    }

    // Support menu button
    if (this.view.$$menu) {
      let menuitems = this.view.$$menu.view.members;

      if (key === 'ArrowDown') {
        this.view.$$menu.view.selected = this.view.$$menu.view.$focused = menuitems[0];
      }

      if (key === 'ArrowUp') {
        this.view.$$menu.view.selected = this.view.$$menu.view.$focused = menuitems[menuitems.length -1];
      }

      if (key === 'Escape') {
        this.view.$$menu.close();
        this.view.$button.focus();
        this.data.pressed = false;
      }
    }
  }

  /**
   * Set an event listener on the widget.
   * @argument {*} args - The event type and handler.
   * @return {undefined}
   */
  bind (...args) {
    this.view.$button.addEventListener(...args);
  }

  /**
   * Activate a popup, usually a menu, owned by the button.
   * @argument {undefined}
   * @return {undefined}
   */
  activate_popup () {
    this.view.$popup = document.getElementById(this.view.$button.getAttribute('aria-owns'));

    // Implement menu button
    // https://www.w3.org/TR/wai-aria-practices/#menubutton
    if (this.view.$popup.matches('[role="menu"]')) {
      this.view.$menu = this.view.$popup;
      this.view.$$menu = new FlareTail.widgets.Menu(this.view.$menu);

      // Use a timer to avoid conflict with the following Pressed event
      this.view.$$menu.bind('MenuClosed', event => window.setTimeout(() => {
        this.view.$button.focus();
        this.data.pressed = false;
      }, 50));

      this.bind('Pressed', event => {
        if (event.detail.pressed) {
          this.view.$$menu.open();
        } else {
          this.view.$$menu.close();
        }
      });
    } else {
      this.bind('Pressed', event => {
        this.view.$popup.setAttribute('aria-expanded', event.detail.pressed);

        if (event.detail.pressed) {
          this.view.$popup.focus();
        } else {
          this.view.$button.focus();
        }
      });
    }
  }
}
