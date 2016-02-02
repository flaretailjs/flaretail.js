/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the menubar role.
 * @extends FlareTail.widgets.Menu
 * @see {@link https://www.w3.org/TR/wai-aria/complete#menubar}
 */
FlareTail.widgets.MenuBar = class MenuBar extends FlareTail.widgets.Menu {
  /**
   * Get a MenuBar instance.
   * @constructor
   * @argument {HTMLElement} $container - <menu role="menubar">
   * @argument {Array.<Object>} [data] - Optional data.
   * @return {Object} widget
   */
  constructor ($container, data) {
    super($container, [], true); // This does nothing but is required before using `this`

    this.view = { $container };

    this.options = {
      item_roles: ['menuitem'],
      item_selector: '[role="menuitem"]',
      focus_cycling: true
    };

    FlareTail.widgets.Composite.prototype.activate.call(this);
    super.activate();
  }

  /**
   * Called whenever a mousedown event is triggered. Open or close a menu when necessary.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  onmousedown (event) {
    if (event.buttons > 1) {
      FlareTail.helpers.event.ignore(event);

      return;
    }

    if (this.view.members.includes(event.target)) {
      event.target !== this.view.selected[0] ? this.open(event) : this.close();
    } else if (this.view.selected.length) {
      this.close();
    } else {
      FlareTail.helpers.event.ignore(event);
    }
  }

  /**
   * Called whenever the menubar is hovered. Select and focus a menu item.
   * @argument {MouseEvent} event - The mouseover event.
   * @return {undefined}
   */
  onmouseover (event) {
    if (this.view.selected.length && this.view.members.includes(event.target)) {
      this.view.selected = this.view.$focused = event.target;
    }

    return FlareTail.helpers.event.ignore(event);
  }

  /**
   * Called whenever a keydown event is triggered. Select a menu item when necessary.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  onkeydown (event) {
    let menu = this.data.menus.get(event.target).view,
        menuitems = menu.members;

    switch (event.key) {
      case 'Tab': {
        return true; // Focus management
      }

      case 'Home':
      case 'ArrowDown': {
        menu.selected = menu.$focused = menuitems[0];

        break;
      }

      case 'End':
      case 'ArrowUp': {
        menu.selected = menu.$focused = menuitems[menuitems.length - 1];

        break;
      }

      case ' ': { // Space
        if (event.target.matches('[aria-selected="true"]')) {
          menu.$container.setAttribute('aria-expanded', 'false');
          this.view.selected = [];
        } else {
          menu.$container.setAttribute('aria-expanded', 'true');
          this.view.selected = event.target;
        }

        break;
      }

      case 'Escape': {
        if (event.target.matches('[aria-selected="true"]')) {
          menu.$container.setAttribute('aria-expanded', 'false');
          this.view.selected = [];
        }

        break;
      }

      default: {
        // The default behavior
        FlareTail.widgets.Composite.prototype.onkeydown.call(this, event);
      }
    }

    return FlareTail.helpers.event.ignore(event);
  }

  /**
   * Open a menu.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  open (event) {
    this.select_with_mouse(event);
  }

  /**
   * Close a menu.
   * @argument {undefined}
   * @return {undefined}
   */
  close () {
    FlareTail.helpers.event.unbind(this, window, ['mousedown', 'blur']);

    this.view.selected = [];
  }
}
