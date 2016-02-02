/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the menu role.
 * @extends FlareTail.widgets.Select
 * @see {@link https://www.w3.org/TR/wai-aria/complete#menu}
 */
FlareTail.widgets.Menu = class Menu extends FlareTail.widgets.Select {
  /**
   * Get a Menu instance.
   * @constructor
   * @argument {HTMLElement} $container - <menu role="menu">
   * @argument {Array.<Object>} [data] - Optional data.
   * @argument {Boolean} [subclass=false] - Whether the method is called in a subclass.
   * @return {Object} widget
   */
  constructor ($container, data = [], subclass = false) {
    super(); // This does nothing but is required before using `this`

    // MenuBar activates the widget in its own constructor
    if (subclass) {
      return this;
    }

    this.view = { $container };

    this.options = {
      item_roles: ['menuitem', 'menuitemcheckbox', 'menuitemradio'],
      item_selector: '[role^="menuitem"]',
      focus_cycling: true
    };

    this.data = {};

    if (data.length) {
      this.data.structure = data;
      this.build();
    }

    super.activate();
    this.activate();

    // Context menu
    let $owner = document.querySelector(`[aria-owns="${CSS.escape($container.id)}"]`);

    if ($owner && !$owner.matches('[role="menuitem"]')) {
      this.view.$owner = $owner;
      FlareTail.helpers.event.bind(this, $owner, ['contextmenu', 'keydown']);
    }

    Object.defineProperties(this, {
      closed: {
        enumerable: true,
        get: () => $container.getAttribute('aria-expanded') === 'false',
        set: value => value ? this.open() : this.close()
      }
    });

    // TEMP: Update the members of the menu when the aria-hidden attribute is changed
    (new MutationObserver(mutations => {
      if (mutations[0].target.matches(this.options.item_selector)) {
        this.update_members();
      }
    })).observe($container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-disabled', 'aria-hidden']
    });
  }

  /**
   * Activate the widget.
   * @argument {Boolean} [rebuild=false] - Whether the widget is to be just restructured.
   * @return {undefined}
   */
  activate (rebuild = false) {
    // Redefine items
    let not_selector = ':not([aria-disabled="true"]):not([aria-hidden="true"])',
        selector = `#${this.view.$container.id} > li > ${this.options.item_selector}${not_selector}`,
        items = this.view.members = [...document.querySelectorAll(selector)],
        menus = this.data.menus = new WeakMap();

    for (let $item of items) {
      if ($item.hasAttribute('aria-owns')) {
        let $menu = document.getElementById($item.getAttribute('aria-owns')),
            $$menu = new FlareTail.widgets.Menu($menu);

        $$menu.data.parent = this;
        menus.set($item, $$menu);
      }
    }

    if (rebuild) {
      return;
    }

    this.view = new Proxy(this.view, {
      set: (obj, prop, newval) => {
        let oldval = obj[prop];

        if (prop === '$focused') {
          if (oldval && menus.has(oldval)) {
            menus.get(oldval).close();
          }

          if (newval && menus.has(newval)) {
            menus.get(newval).open();
          }
        }

        obj[prop] = newval;

        return true;
      }
    });
  }

  /**
   * Called whenever a mousedown event is triggered. Select a menu item when necessary.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  onmousedown (event) {
    // Open link in a new tab
    if (event.target.href && event.buttons <= 1) {
      event.stopPropagation();
      event.target.target = '_blank';

      return;
    }

    if (event.buttons > 1) {
      FlareTail.helpers.event.ignore(event);

      return;
    }

    let parent = this.data.parent;

    if (parent && event.target === parent.view.selected[0]) {
      // Just opening the menu
      return;
    }

    if (event.currentTarget === window) {
      this.close(true);
    } else if (!this.data.menus.has(event.target) && this.view.members.includes(event.target)) {
      this.select(event)
      this.close(true);
    }

    FlareTail.helpers.event.ignore(event);
  }

  /**
   * Called whenever the menu is hovered. Select and focus a menu item.
   * @argument {MouseEvent} event - The mouseover event.
   * @return {undefined}
   */
  onmouseover (event) {
    if (this.view.members.includes(event.target)) {
      this.view.selected = this.view.$focused = event.target;
    }

    FlareTail.helpers.event.ignore(event);
  }

  /**
   * Called whenever the menu or its owner node is right-clicked. Show the context menu when the event is triggered on
   * the owner.
   * @argument {MouseEvent} event - The contextmenu event.
   * @return {Boolean} default - Always false to disable the browser's build-in context menu.
   */
  oncontextmenu (event) {
    let $owner = this.view.$owner,
        $container = this.view.$container;

    if ($owner) {
      let style = $container.style;

      style.top = `${event.layerY}px`;
      style.left = `${event.layerX}px`;

      if (event.currentTarget === $owner) {
        this.open(event);
      }

      if ($container.getBoundingClientRect().right > window.innerWidth) {
        // The menu is shown beyond the window width. Reposition it
        style.left = `${$owner.offsetWidth - $container.offsetWidth - 4}px`;
      }
    }

    return FlareTail.helpers.event.ignore(event);
  }

  /**
   * Called whenever a keydown event is triggered. Select a menu item when necessary.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  onkeydown (event) {
    let parent = this.data.parent,
        menus = this.data.menus,
        has_submenu = menus.has(event.target),
        $owner = this.view.$owner,
        key = event.key;

    // Open link in a new tab
    if (event.target.href && event.key === 'Enter') {
      event.stopPropagation();
      event.target.target = '_blank';

      return;
    }

    // The owner of the context menu
    if ($owner && event.currentTarget === $owner) {
      let view = this.view,
          items = view.members;

      switch (key) {
        case 'ArrowUp':
        case 'End': {
          view.selected = view.$focused = items[items.length - 1];

          break;
        }

        case 'ArrowDown':
        case 'ArrowRight':
        case 'Home': {
          view.selected = view.$focused = items[0];

          break;
        }

        case 'Escape':
        case 'Tab': {
          this.close();

          break;
        }
      }

      return;
    }

    FlareTail.helpers.event.ignore(event);

    switch (key) {
      case 'ArrowRight': {
        if (has_submenu) {
          // Select the first item in the submenu
          let view = menus.get(event.target).view;

          view.selected = view.$focused = view.members[0];
        } else if (parent) {
          // Select the next (or first) item in the parent menu
          let view = parent.view,
              items = view.members,
              $target = items[items.indexOf(view.selected[0]) + 1] || items[0];

          view.selected = view.$focused = $target;
        }

        break;
      }

      case 'ArrowLeft': {
        if (parent) {
          let view = parent.view,
              items = view.members,
              $target = view.$container.matches('[role="menubar"]')
                      ? items[items.indexOf(view.selected[0]) - 1] || items[items.length - 1] : view.selected[0];

          view.selected = view.$focused = $target;
        }

        break;
      }

      case 'Escape': {
        this.close();

        break;
      }

      case 'Enter':
      case ' ': { // Space
        if (!has_submenu) {
          this.select(event);
          this.close(true);
        }

        break;
      }

      default: {
        // The default behavior
        super.onkeydown(event);
      }
    }
  }

  /**
   * Called whenever a blur event is triggered. Close the menu.
   * @argument {FocusEvent} event - The blur event.
   * @return {undefined}
   */
  onblur (event) {
    if (event.currentTarget === window) {
      this.close(true);
    }

    // The default behavior
    super.onblur(event);
  }

  /**
   * Build the menu dynamically with the provided data.
   * @argument {Array.<Object>} [data] - Optional data.
   * @return {undefined}
   */
  build (data) {
    let $container = this.view.$container,
        $fragment = new DocumentFragment(),
        $_separator = document.createElement('li'),
        $_outer = document.createElement('li'),
        rebuild = false;

    if (data) {
      // Empty & rebuild menu
      rebuild = true;
      $container.innerHTML = '';
    } else {
      data = this.data.structure;
    }

    $_separator.setAttribute('role', 'separator');
    $_outer.appendChild(document.createElement('span')).appendChild(document.createElement('label'));

    this.data.structure = data.map(item => {
      if (item.type === 'separator') {
        $fragment.appendChild($_separator.cloneNode(true));

        return null;
      }

      let $item = item.$element = $fragment.appendChild($_outer.cloneNode(true)).firstElementChild;

      $item.id = item.id;
      $item.setAttribute('role', item.type || 'menuitem');
      $item.setAttribute('aria-disabled', item.disabled === true);
      $item.setAttribute('aria-checked', item.checked === true);
      $item.firstElementChild.textContent = item.label;

      if (item.data) {
        for (let [prop, value] of Object.entries(item.data)) {
          $item.dataset[prop] = value;
        }
      }

      return item;
    }).filter(item => item !== null);

    $container.appendChild($fragment);

    if (rebuild) {
      super.activate(true);
      this.activate(true);
    }
  }

  /**
   * Open the menu.
   * @argument {undefined}
   * @return {undefined}
   */
  open () {
    let $container = this.view.$container;

    $container.setAttribute('aria-expanded', 'true');
    $container.removeAttribute('aria-activedescendant');
    FlareTail.helpers.event.trigger($container, 'MenuOpened');

    let parent = this.data.parent;

    // Show the submenu on the left if there is not enough space
    if ($container.getBoundingClientRect().right > window.innerWidth ||
        parent && parent.view.$container.matches('.dir-left')) {
      $container.classList.add('dir-left');
    }

    FlareTail.helpers.event.bind(this, window, ['mousedown', 'blur']);
  }

  /**
   * Fire an event whenever an item is selected.
   * @argument {(MouseEvent|KeyboardEvent)} event - The mousedown or keydown event.
   * @return {undefined}
   */
  select (event) {
    FlareTail.helpers.event.trigger(this.view.$container, 'MenuItemSelected', {
      bubbles: true,
      cancelable: false,
      detail: {
        target: event.target,
        command: event.target.dataset.command || event.target.id
      }
    });
  }

  /**
   * Close the menu.
   * @argument {Boolean} propagation - Whether the parent menu, if exists, should be closed.
   * @return {undefined}
   */
  close (propagation) {
    FlareTail.helpers.event.unbind(this, window, ['mousedown', 'blur']);

    let $container = this.view.$container,
        parent = this.data.parent;

    $container.setAttribute('aria-expanded', 'false');
    $container.removeAttribute('aria-activedescendant');
    FlareTail.helpers.event.trigger($container, 'MenuClosed');
    this.view.selected = [];

    if (parent) {
      if (parent.view.$focused) {
        parent.view.$focused.focus();
      }

      if (propagation) {
        parent.close(true);
      }
    } else {
      // Context menu
      let $owner = this.view.$owner;

      if ($owner) {
        $owner.focus();
      }
    }
  }
}
