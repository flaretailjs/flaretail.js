/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Provide application widgets based on the WAI-ARIA roles.
 * @see {@link https://www.w3.org/TR/wai-aria/}
 */
FlareTail.widgets = {};

/**
 * Implement the top level abstract role.
 * @see {@link https://www.w3.org/TR/wai-aria/complete#roletype}
 */
FlareTail.widgets.RoleType = class RoleType {
  /**
   * Activate the widget.
   * @argument {Boolean} [rebuild=false] - Whether the widget is to be just restructured.
   * @return {undefined}
   */
  activate (rebuild = false) {
    let FTue = FlareTail.helpers.event,
        $container = this.view.$container;

    if (!$container) {
      throw new Error('The container element is not defined');
    }

    this.options = this.options || {};
    this.options.item_roles = this.options.item_roles || [];
    this.options.selected_attr = this.options.selected_attr || 'aria-selected';
    this.options.multiselectable = $container.matches('[aria-multiselectable="true"]');

    this.update_members();

    // Focus Management
    for (let [i, $item] of this.view.members.entries()) {
      $item.tabIndex = i === 0 ? 0 : -1;
    }

    $container.removeAttribute('tabindex');

    this.data = this.data || {};

    if (rebuild) {
      return;
    }

    if (this.update_view) {
      this.view = new Proxy(this.view, { set: this.update_view.bind(this) });
    }

    // Add event listeners
    FTue.bind(this, $container, [
      // MouseEvent
      'mousedown', 'contextmenu', 'mouseup', 'click', 'dblclick',
      'mouseover',
      // WheelEvent
      'wheel',
      // KeyboardEvent
      'keydown', 'keypress', 'keyup',
      // DragEvent
      'dragstart', 'drag', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend'
    ], false);

    FTue.bind(this, $container, [
      // FocusEvent
      'focus', 'blur',
    ], true); // Set use_capture true to catch events on descendants

    return;
  }

  /**
   * Update the managed, selected and focused elements within the widget.
   * @argument {undefined}
   * @return {undefined}
   */
  update_members () {
    let selector = this.options.item_selector,
        not_selector = ':not([aria-disabled="true"]):not([aria-hidden="true"])',
        get_items = selector => [...this.view.$container.querySelectorAll(selector)];

    this.view.members = get_items(`${selector}${not_selector}`),
    this.view.selected = get_items(`${selector}[${this.options.selected_attr}="true"]`);
    this.view.$focused = null;
  }

  /**
   * Assign keyboard shortcuts to the widget.
   * @argument {Object} map - See the helper method for details.
   * @return {undefined}
   */
  assign_key_bindings (map) {
    FlareTail.helpers.kbd.assign(this.view.$container, map);
  }

  /**
   * Handle all events triggered on the widget. Note that this is the standard catch-all event handler, therefore it
   * does not follow our method naming convention.
   * @argument {Event} event - Any event.
   * @return {undefined}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/EventListener}
   */
  handleEvent (event) {
    this[`on${event.type}`].call(this, event);
  }

  /**
   * Called whenever a contextmenu event is triggered. Disable the browser's build-in context menu.
   * @argument {MouseEvent} event - The contextmenu event.
   * @return {undefined}
   */
  oncontextmenu (event) {
    return FlareTail.helpers.event.ignore(event);
  }

  /**
   * Set an event listener on the widget.
   * @argument {*} args - The event type and handler.
   * @return {undefined}
   */
  bind (...args) {
    this.view.$container.addEventListener(...args);
  }
}

/**
 * Implement the structure abstract role.
 * @extends FlareTail.widgets.RoleType
 * @see {@link https://www.w3.org/TR/wai-aria/complete#structure}
 */
FlareTail.widgets.Structure = class Structure extends FlareTail.widgets.RoleType {}

/**
 * Implement the section abstract role.
 * @extends FlareTail.widgets.Structure
 * @see {@link https://www.w3.org/TR/wai-aria/complete#section}
 */
FlareTail.widgets.Section = class Section extends FlareTail.widgets.Structure {}

/**
 * Implement the widget abstract role.
 * @extends FlareTail.widgets.RoleType
 * @see {@link https://www.w3.org/TR/wai-aria/complete#widget}
 */
FlareTail.widgets.Widget = class Widget extends FlareTail.widgets.RoleType {}

/**
 * Implement the command abstract role.
 * @extends FlareTail.widgets.Widget
 * @see {@link https://www.w3.org/TR/wai-aria/complete#command}
 */
FlareTail.widgets.Command = class Command extends FlareTail.widgets.Widget {}

/**
 * Implement the composite abstract role.
 * @extends FlareTail.widgets.Widget
 * @see {@link https://www.w3.org/TR/wai-aria/complete#composite}
 */
FlareTail.widgets.Composite = class Composite extends FlareTail.widgets.Widget {
  /**
   * Called whenever a focus event is triggered. Set the aria-activedescendant attribute when necessary.
   * @argument {FocusEvent} event - The focus event.
   * @return {undefined}
   */
  onfocus (event) {
    if (this.view.members.includes(event.target) && event.target.id) {
      this.view.$container.setAttribute('aria-activedescendant', event.target.id);
    } else {
      this.view.$container.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Called whenever a blur event is triggered. Remove the aria-activedescendant attribute when necessary.
   * @argument {FocusEvent} event - The blur event.
   * @return {undefined}
   */
  onblur (event) {
    this.view.$container.removeAttribute('aria-activedescendant');
    FlareTail.helpers.event.ignore(event);
  }

  /**
   * Called whenever a mousedown event is triggered. Select one or more members when necessary.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  onmousedown (event) {
    if (!this.view.members.includes(event.target) || event.buttons > 1) {
      return;
    }

    this.select_with_mouse(event);
  }

  /**
   * Called whenever a keydown event is triggered. Select one or more members when necessary.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  onkeydown (event) {
    this.select_with_keyboard(event);
  }

  /**
   * Seelect one or more members with a mouse operation.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  select_with_mouse (event) {
    let $target = event.target,
        $container = this.view.$container,
        items = this.view.members,
        selected = [...this.view.selected],
        multi = this.options.multiselectable;

    if (event.shiftKey && multi) {
      let start = items.indexOf(selected[0]),
          end = items.indexOf($target);

      selected = start < end ? items.slice(start, end + 1) : items.slice(end, start + 1).reverse();
    } else if (event.ctrlKey || event.metaKey) {
      if (multi && !selected.includes($target)) {
        // Add the item to selection
        selected.push($target);
      } else if (selected.includes($target)) {
        // Remove the item from selection
        selected.splice(selected.indexOf($target), 1);
      }
    } else {
      selected = [$target];
    }

    this.view.selected = selected;
    this.view.$focused = selected[selected.length - 1];
  }

  /**
   * Seelect one or more members with a keyboard operation.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  select_with_keyboard (event) {
    let key = event.key;

    // Focus shift with tab key
    if (key === 'Tab') {
      return true;
    }

    // Do nothing if Alt key is pressed
    if (event.altKey) {
      return FlareTail.helpers.event.ignore(event);
    }

    let items = this.view.members,
        selected = [...this.view.selected], // Clone the array
        selected_idx = items.indexOf(selected[0]),
        $focused = this.view.$focused,
        focused_idx = items.indexOf($focused),
        options = this.options,
        ctrl = event.ctrlKey || event.metaKey,
        cycle = options.focus_cycling,
        multi = options.multiselectable,
        expanding = multi && event.shiftKey;

    switch (key) {
      case ' ': { // Space
        if (ctrl) {
          break; // Move focus only
        }

        if (!multi) {
          this.view.selected = $focused;

          break;
        }

        if (!selected.includes($focused)) {
          // Add item
          selected.push($focused);
          this.view.selected = selected;
        } else {
          // Remove item
          selected.splice(selected.indexOf($focused), 1);
          this.view.selected = selected;
        }

        break;
      }

      // TODO: The behavior with Page Up/Down should be different

      case 'Home':
      case 'PageUp': {
        this.view.$focused = items[0];

        if (ctrl) {
          break; // Move focus only
        }

        if (!expanding) {
          this.view.selected = items[0];

          break;
        }

        this.view.selected = items.slice(0, selected_idx + 1).reverse();

        break;
      }

      case 'End':
      case 'PageDown': {
        this.view.$focused = items[items.length - 1];

        if (ctrl) {
          break; // Move focus only
        }

        if (!expanding) {
          this.view.selected = items[items.length - 1];

          break;
        }

        this.view.selected = items.slice(selected_idx);

        break;
      }

      case 'ArrowUp':
      case 'ArrowLeft': {
        if (focused_idx > 0) {
          this.view.$focused = items[focused_idx - 1];
        } else if (cycle) {
          this.view.$focused = items[items.length - 1];
        }

        if (ctrl) {
          break; // Move focus only
        }

        if (!expanding) {
          this.view.selected = this.view.$focused;

          break;
        }

        if (!selected.includes($focused)) {
          // Create new range
          this.view.selected = items.slice(focused_idx - 1, focused_idx + 1).reverse();
        } else if (!selected.includes(items[focused_idx - 1])) {
          // Expand range
          selected.push(this.view.$focused);
          this.view.selected = selected;
        } else {
          // Reduce range
          selected.pop();
          this.view.selected = selected;
        }

        break;
      }

      case 'ArrowDown':
      case 'ArrowRight': {
        if (focused_idx < items.length - 1) {
          this.view.$focused = items[focused_idx + 1];
        } else if (cycle) {
          this.view.$focused = items[0];
        }

        if (ctrl) {
          break; // Move focus only
        }

        if (!expanding) {
          this.view.selected = this.view.$focused;

          break;
        }

        if (!selected.includes($focused)) {
          // Create new range
          this.view.selected = items.slice(focused_idx, focused_idx + 2);
        } else if (!selected.includes(items[focused_idx + 1])) {
          // Expand range
          selected.push(this.view.$focused);
          this.view.selected = selected;
        } else {
          // Reduce range
          selected.pop();
          this.view.selected = selected;
        }

        break;
      }

      default: {
        // Select All
        if (multi && ctrl && key.toUpperCase() === 'A') {
          this.view.selected = items;
          this.view.$focused = items[0];

          break;
        }

        if (ctrl || !options.search_enabled || !key.match(/^\S$/)) {
          break;
        }

        // Find As You Type: Incremental Search for simple list like ListBox or Tree
        let input = key,
            char = this.data.search_key || '';

        char = char === input ? input : char + input;

        let pattern = new RegExp(`^${char}`, 'i');

        let get_label = $item => {
          let $element;

          if ($item.hasAttribute('aria-labelledby')) {
            $element = document.getElementById($item.getAttribute('aria-labelledby'));

            if ($element) {
              return $element.textContent;
            }
          }

          $element = $item.querySelector('label');

          if ($element) {
            return $element.textContent;
          }

          return $item.textContent;
        };

        for (let i = focused_idx + 1; ; i++) {
          if (items.length > 1 && i === items.length) {
            i = 0; // Continue from top
          }

          if (i === focused_idx) {
            break; // No match
          }

          let $item = items[i];

          if (!get_label($item).match(pattern)) {
            continue;
          }

          this.view.$focused = $item;

          if (!expanding) {
            this.view.selected = $item;

            break;
          }

          let start = focused_idx,
              end = i;

          this.view.selected = start < end ? items.slice(start, end + 1) : items.slice(end, start + 1).reverse();
        }

        // Remember the searched character(s) for later
        this.data.search_key = char;

        // Forget the character(s) after 1.5s
        window.setTimeout(() => delete this.data.search_key, 1500);
      }
    }

    return FlareTail.helpers.event.ignore(event);
  }

  /**
   * Update the member elements on the page. This is a Proxy handler.
   * @argument {Object} obj - One of view objects.
   * @argument {String} prop - One of view properties: members, selected or $focused
   * @argument {(Array|HTMLElement)} newval - New value.
   * @return {undefined}
   */
  update_view (obj, prop, newval) {
    let attr = this.options.selected_attr,
        oldval = obj[prop];

    if (prop === 'selected') {
      if (oldval) {
        for (let $element of oldval) {
          $element.setAttribute(attr, 'false');
        }
      }

      if (newval) {
        if (!Array.isArray(newval)) {
          newval = [newval];
        }

        for (let $element of newval) {
          $element.setAttribute(attr, 'true');
        }
      }

      FlareTail.helpers.event.trigger(this.view.$container, 'Selected', { detail: {
        oldval,
        items: newval || [],
        ids: newval ? newval.map($item => $item.dataset.id || $item.id) : [],
        labels: newval ? newval.map($item => $item.textContent) : [],
      }});
    }

    if (prop === '$focused') {
      let $element;

      if (newval) {
        $element = newval;
        $element.tabIndex = 0;
        $element.focus();
      }

      if (oldval) {
        $element = oldval;
        $element.tabIndex = -1;
      }
    }

    obj[prop] = newval; // The default behavior

    return true;
  }
}

/**
 * Implement the select abstract role.
 * @extends FlareTail.widgets.Composite
 * @see {@link https://www.w3.org/TR/wai-aria/complete#select}
 */
FlareTail.widgets.Select = class Select extends FlareTail.widgets.Composite {}

/**
 * Implement the input abstract role.
 * @extends FlareTail.widgets.Widget
 * @see {@link https://www.w3.org/TR/wai-aria/complete#input}
 */
FlareTail.widgets.Input = class Input extends FlareTail.widgets.Widget {}

/**
 * Implement the range abstract role.
 * @extends FlareTail.widgets.Widget
 * @see {@link https://www.w3.org/TR/wai-aria/complete#range}
 */
FlareTail.widgets.Range = class Range extends FlareTail.widgets.Widget {}

/**
 * Implement the window abstract role.
 * @extends FlareTail.widgets.RoleType
 * @see {@link https://www.w3.org/TR/wai-aria/complete#window}
 */
FlareTail.widgets.Window = class Window extends FlareTail.widgets.RoleType {}

/**
 * Implement the landmark abstract role.
 * @extends FlareTail.widgets.Region
 * @see {@link https://www.w3.org/TR/wai-aria/complete#landmark}
 */
FlareTail.widgets.Landmark = class Landmark extends FlareTail.widgets.Region {}
