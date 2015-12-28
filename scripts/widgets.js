/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Provide application widgets based on the WAI-ARIA roles.
 * @see {@link http://www.w3.org/TR/wai-aria/}
 */
FlareTail.widgets = {};

/**
 * Implement the top level abstract role.
 * @see {@link http://www.w3.org/TR/wai-aria/complete#roletype}
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
 * @see {@link http://www.w3.org/TR/wai-aria/complete#structure}
 */
FlareTail.widgets.Structure = class Structure extends FlareTail.widgets.RoleType {}

/**
 * Implement the section abstract role.
 * @extends FlareTail.widgets.Structure
 * @see {@link http://www.w3.org/TR/wai-aria/complete#section}
 */
FlareTail.widgets.Section = class Section extends FlareTail.widgets.Structure {}

/**
 * Implement the widget abstract role.
 * @extends FlareTail.widgets.RoleType
 * @see {@link http://www.w3.org/TR/wai-aria/complete#widget}
 */
FlareTail.widgets.Widget = class Widget extends FlareTail.widgets.RoleType {}

/**
 * Implement the command abstract role.
 * @extends FlareTail.widgets.Widget
 * @see {@link http://www.w3.org/TR/wai-aria/complete#command}
 */
FlareTail.widgets.Command = class Command extends FlareTail.widgets.Widget {}

/**
 * Implement the button role.
 * @extends FlareTail.widgets.Command
 * @see {@link http://www.w3.org/TR/wai-aria/complete#button}
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
    // http://www.w3.org/TR/wai-aria-practices/#menubutton
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

/**
 * Implement the composite abstract role.
 * @extends FlareTail.widgets.Widget
 * @see {@link http://www.w3.org/TR/wai-aria/complete#composite}
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
 * Implement the grid role.
 * @extends FlareTail.widgets.Composite
 * @see {@link http://www.w3.org/TR/wai-aria/complete#grid}
 */
FlareTail.widgets.Grid = class Grid extends FlareTail.widgets.Composite {
  /**
   * Get a Grid instance.
   * @constructor
   * @argument {HTMLElement} $container - <table role="grid">
   * @argument {Object} [data] - Optional data including columns, rows and order.
   * @argument {Object} [options] - These attributes on the grid element are also supported:
   *  - aria-multiselectable: The default is true.
   *  - aria-readonly: The default is false.
   *  Attributes on the columnheader elements:
   *  - draggable: If false, the row cannot be reordered.
   *  - data-key: True/false, whether the key column or not.
   *  - data-type: String (default), Integer or Boolean.
   *  Attribute on the row elements:
   *  - aria-selected: If the attribute is set on the rows, the grid will be like a thread pane in a mail app.
   *  Attribute on the gridcell elements:
   *  - aria-selected: If the attribute is set on the cells, the grid will be like a spreadsheet app.
   * @return {Object} widget
   */
  constructor ($container, data, options) {
    super(); // This does nothing but is required before using `this`

    // What can be selected on the grid
    let dataset = $container.dataset,
        role = data ? 'row' : $container.querySelector('.grid-body [role="row"]')
                                        .hasAttribute('aria-selected') ? 'row' : 'gridcell';

    // If the role is gridcell, the navigation management should be different
    if (role === 'gridcell') {
      throw new Error('Unimplemented role: gridcell');
    }

    this.view = { $container };

    if (data) {
      this.data = data;
      this.options = options;
      this.options.item_roles = [role];
      this.options.item_selector = `.grid-body [role="${role}"]`;
      // Build table from the given data
      this.data.columns = data.columns;
      this.data.rows = data.rows;
      this.build_header();
      this.build_body();
    } else {
      this.view.$header = $container.querySelector('.grid-header');
      this.view.$body = $container.querySelector('.grid-body');
      this.data = { columns: [], rows: [] };
      this.options = {
        item_roles: [role],
        item_selector: `.grid-body [role="${role}"]`,
        sortable: dataset.sortable === 'false' ? false : true,
        reorderable: dataset.reorderable === 'false' ? false : true
      };
      // Retrieve data from the static table
      this.get_data();
    }

    this.options = new Proxy(this.options, {
      set: (obj, prop, value) => {
        if (prop === 'adjust_scrollbar') {
          this.view.$$scrollbar.options.adjusted = value;
        }

        obj[prop] = value;

        return true;
      }
    });

    // Columnpicker
    this.init_columnpicker();

    super.activate();
    this.activate();
  }

  /**
   * Activate the widget.
   * @argument {undefined}
   * @return {undefined}
   */
  activate () {
    this.view = new Proxy(this.view, {
      set: (obj, prop, value) => {
        switch (prop) {
          case 'selected': {
            // Validation: this.selectd.value is always Array
            if (!Array.isArray(value)) {
              value = [value];
            }

            // Current selection
            for (let $item of obj[prop]) {
              $item.draggable = false;
              $item.removeAttribute('aria-grabbed');
              $item.setAttribute('aria-selected', 'false');
            }

            // New selection
            for (let $item of value) {
              $item.draggable = true;
              $item.setAttribute('aria-grabbed', 'false');
              $item.setAttribute('aria-selected', 'true');
            }

            break;
          }
        }

        obj[prop] = value;

        return true;
      }
    });

    this.options.sort_conditions = new Proxy(this.options.sort_conditions, { set: this.sort.bind(this) });

    this.activate_columns();
    this.activate_rows();
  }

  /**
   * Activate the grid columns.
   * @argument {undefined}
   * @return {undefined}
   */
  activate_columns () {
    let columns = this.data.columns = new Proxy(this.data.columns, {
      // Default behavior, or find column by id
      get: (obj, prop) => prop in obj ? obj[prop] : obj.find(col => col.id === prop),
    });

    // Handler to show/hide column
    let handler = {
      get: (obj, prop) => {
        let value;

        switch (prop) {
          case 'index': {
            value = obj.$element.cellIndex;

            break;
          }

          case 'width': {
            value = Number.parseInt(FlareTail.helpers.style.get(obj.$element, 'width'));

            break;
          }

          case 'left': {
            value = obj.$element.offsetLeft;

            break;
          }

          default: {
            value = obj[prop];
          }
        }

        return value;
      },
      set: (obj, prop, value) => {
        switch (prop) {
          case 'hidden': {
            // Fire an event
            FlareTail.helpers.event.trigger(this.view.$container, 'ColumnModified', { detail: { columns }});

            // Reflect the change of row's visibility to UI
            value === true ? this.hide_column(obj) : this.show_column(obj);

            break;
          }
        }

        obj[prop] = value;

        return true;
      }
    };

    for (let [i, col] of columns.entries()) {
      columns[i] = new Proxy(col, handler);
    }
  }

  /**
   * Activate the grid rows.
   * @argument {undefined}
   * @return {undefined}
   */
  activate_rows () {
    let handler = {
      set: (obj, prop, value) => {
        // Reflect Data change into View
        let row = this.data.rows.find(row => row.data.id === obj.id),
            $elm = row.$element.querySelector(`[data-id="${CSS.escape(prop)}"] > *`);

        this.data.columns[prop].type === 'boolean' ? $elm.setAttribute('aria-checked', value)
                                                   : $elm.textContent = value;
        obj[prop] = value;

        return true;
      }
    };

    let rows = this.data.rows,
        $grid_body = this.view.$body,
        $tbody = $grid_body.querySelector('tbody');

    for (let row of rows) {
      row.data = new Proxy(row.data, handler);
    }

    // Sort handler
    this.data.rows = new Proxy(rows, {
      set: (obj, prop, value) => {
        if (!Number.isNaN(prop) && value.$element) {
          $tbody.appendChild(value.$element);
        }

        obj[prop] = value;

        return true;
      }
    });

    // Custom scrollbar
    let $$scrollbar = this.view.$$scrollbar = new FlareTail.widgets.ScrollBar($grid_body, true, false),
        option = this.options.adjust_scrollbar;

    $$scrollbar.options.adjusted = option === undefined ? FlareTail.helpers.env.device.desktop : option;
  }

  /**
   * Called whenever a mousedown event is triggered. Handle the event depending on the target.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  onmousedown (event) {
    let $target = event.target;

    if ($target.matches('[role="columnheader"]')) {
      if (event.buttons <= 1 && this.options.reorderable) {
        FlareTail.helpers.event.bind(this, window, ['mousemove', 'mouseup']);
      }

      if (event.buttons === 2) {
        this.build_columnpicker();
      }

      return;
    }

    // Editable checkbox in cells
    if ($target.matches('[role="checkbox"]')) {
      let index = $target.parentElement.parentElement.sectionRowIndex,
          id = $target.parentElement.dataset.id,
          value = !$target.matches('[aria-checked="true"]');

      this.data.rows[index].data[id] = value;

      return FlareTail.helpers.event.ignore(event);
    }

    // The default behavior
    super.onmousedown(event);
  }

  /**
   * Called whenever a mousemove event is triggered. Reorder the grid columns when necessary.
   * @argument {MouseEvent} event - The mousemove event.
   * @return {undefined}
   */
  onmousemove (event) {
    !this.data.drag ? this.start_column_reordering(event) : this.continue_column_reordering(event);
  }

  /**
   * Called whenever a mouseup event is triggered. Handle the event depending on the target.
   * @argument {MouseEvent} event - The mouseup event.
   * @return {undefined}
   */
  onmouseup (event) {
    FlareTail.helpers.event.ignore(event);
    FlareTail.helpers.event.unbind(this, window, ['mousemove', 'mouseup']);

    if (event.button !== 0) {  // event.buttons is 0 since this is a mouseup event handler
      return;
    }

    if (this.data.drag) {
      this.stop_column_reordering(event);

      return;
    }

    let $target = event.target,
        options = this.options;

    if ($target.matches('[role="columnheader"]') && options.sortable) {
      options.sort_conditions.key = $target.dataset.id;
    }
  }

  /**
   * Called whenever a keydown event is triggered. Trigger a keyboard shortcut when necessary.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  onkeydown (event) {
    let key = event.key;

    // Focus shift with tab key
    if (key === 'Tab') {
      return true;
    }

    let items = this.view.members,
        focused_idx = items.indexOf(this.view.$focused),
        modifiers = event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;

    switch (key) {
      case 'ArrowLeft':
      case 'ArrowRight': {
        // Do nothing
        break;
      }

      case 'PageUp':
      case 'PageDown':
      case ' ' : { // Space
        // Handled by the ScrollBar widget
        return true;
      }

      default: {
        // The default behavior
        super.onkeydown(event);
      }
    }

    return FlareTail.helpers.event.ignore(event);
  }

  /**
   * Build the grid header dynamically with the provided data.
   * @argument {undefined}
   * @return {undefined}
   */
  build_header () {
    let $grid = this.view.$container,
        $grid_header = this.view.$header = document.createElement('header'),
        $table = $grid_header.appendChild(document.createElement('table')),
        $colgroup = $table.appendChild(document.createElement('colgroup')),
        $row = $table.createTBody().insertRow(-1),
        $_col = document.createElement('col'),
        $_cell = document.createElement('th'),
        cond = this.options.sort_conditions;

    $_cell.scope = 'col';
    $_cell.setAttribute('role', 'columnheader');
    $_cell.appendChild(document.createElement('label'));

    for (let column of this.data.columns) {
      let $col = $colgroup.appendChild($_col.cloneNode(true)),
          $cell = column.$element = $row.appendChild($_cell.cloneNode(true));

      $col.dataset.id = column.id || '';
      $col.dataset.hidden = column.hidden === true;

      $cell.firstElementChild.textContent = column.label;
      $cell.title = column.title || `Click to sort by ${column.label}`; // l10n

      if (cond && column.id === cond.key) {
        $cell.setAttribute('aria-sort', cond.order);
      }

      $cell.dataset.id = column.id;
      $cell.dataset.type = column.type || 'string';

      if (column.key === true) {
        $cell.dataset.key = 'true';
      }
    }

    $grid_header.id = `${$grid.id}-header`;
    $grid_header.className = 'grid-header';
    $row.setAttribute('role', 'row');
    $grid.appendChild($grid_header);
  }

  /**
   * Build the grid body dynamically with the provided data.
   * @argument {Object} [row_data] - If passed, the grid body will be refreshed.
   * @return {undefined}
   */
  build_body (row_data) {
    if (row_data) {
      this.data.rows = row_data;
      this.view.$body.remove();
    }

    let $grid = this.view.$container,
        $grid_body = this.view.$body = document.createElement('div'),
        $table = $grid_body.appendChild(document.createElement('table')),
        $colgroup = $table.appendChild($grid.querySelector('.grid-header colgroup').cloneNode(true)),
        $tbody = $table.createTBody(),
        $_row = document.createElement('tr'),
        cond = this.options.sort_conditions,
        row_prefix = `${$grid.id}-row-`;

    // Sort the data first
    this.sort(cond, 'key', cond.key, null, true);

    // Create a template row
    $_row.draggable = false;
    $_row.setAttribute('role', 'row');
    $_row.setAttribute('aria-selected', 'false');

    for (let column of this.data.columns) {
      let $cell;

      if (column.key) {
        $cell = $_row.appendChild(document.createElement('th'));
        $cell.scope = 'row';
        $cell.setAttribute('role', 'rowheader');
      } else {
        $cell = $_row.insertCell(-1);
        $cell.setAttribute('role', 'gridcell');
      }

      if (column.type === 'boolean') {
        let $checkbox = $cell.appendChild(document.createElement('span'));

        $checkbox.setAttribute('role', 'checkbox');
        $cell.setAttribute('aria-readonly', 'false');
      } else {
        $cell.appendChild(document.createElement(column.type === 'time' ? 'time' : 'label'));
      }

      $cell.dataset.id = column.id;
      $cell.dataset.type = column.type;
    }

    for (let row of this.data.rows) {
      let $row = row.$element = $tbody.appendChild($_row.cloneNode(true));

      $row.id = `${row_prefix}${row.data.id}`;
      $row.dataset.id = row.data.id;

      // Custom data
      if (row.dataset && Object.keys(row.dataset).length) {
        for (let [prop, value] of Object.entries(row.dataset)) {
          $row.dataset[prop] = value;
        }
      }

      for (let [i, column] of this.data.columns.entries()) {
        let $child = $row.cells[i].firstElementChild,
            value = row.data[column.id];

        if (column.type === 'boolean') {
          $child.setAttribute('aria-checked', value === true);
        } else if (column.type === 'time') {
          FlareTail.helpers.datetime.fill_element($child, value, this.options.date);
        } else {
          $child.textContent = value;
        }
      }
    }

    $grid_body.id = `${$grid.id}-body`;
    $grid_body.className = 'grid-body';
    $grid_body.tabIndex = -1;
    $grid.appendChild($grid_body);

    if (row_data) {
      this.view.members = [...$grid.querySelectorAll(this.options.item_selector)];
      this.activate_rows();
      FlareTail.helpers.event.trigger($grid, 'Rebuilt');
    }
  }

  /**
   * Retrieve the grid data from a static table markup.
   * @argument {undefined}
   * @return {undefined}
   */
  get_data () {
    let $header = this.view.$header,
        $sorter = $header.querySelector('[role="columnheader"][aria-sort]');

    // Sort conditions
    if (this.options.sortable && $sorter) {
      this.options.sort_conditions = {
        key: $sorter.dataset.id || null,
        order: $sorter.getAttribute('aria-sort') || 'none'
      };
    }

    // Fill the column database
    this.data.columns = [...$header.querySelector('[role="row"]').cells].map($cell => ({
      id: $cell.dataset.id,
      type: $cell.dataset.type || 'string',
      label: $cell.textContent,
      hidden: false,
      key: $cell.dataset.key ? true : false,
      $element: $cell
    }));

    // Fill the row database
    this.data.rows = [...this.view.$body.querySelectorAll('[role="row"]')].map($row => {
      let row = { id: $row.id, $element: $row, data: {} };

      for (let [index, $cell] of [...$row.cells].entries()) {
        let column = this.data.columns[index],
            value,
            normalized_value;

        switch (column.type) {
          case 'integer': {
            value = Number.parseInt($cell.textContent);

            break;
          }

          case 'boolean': { // checkbox
            value = $cell.querySelector('[role="checkbox"]').matches('[aria-checked="true"]');

            break;
          }

          default: { // string
            value = $cell.textContent;
          }
        }

        row.data[column.id] = value;
      };

      return row;
    });
  }

  /**
   * Sort the table by the provided condition.
   * @argument {Object} cond - Sorting condition.
   * @argument {String} [cond.order] - Sorting order, ascending (default) or descending.
   * @argument {String} cond.key - Sorting key.
   * @argument {String} prop - Changed condition property name, order or key.
   * @argument {String} value - Changed condition property value.
   * @argument {Object} [receiver] - Same as cond, when called by Proxy.
   * @argument {Boolean} [data_only=false] - Whether the only grid data should be sorted.
   * @return {Boolean} completed - This should be true to make the Proxy succeed.
   */
  sort (cond, prop, value, receiver, data_only = false) {
    let $grid = this.view.$container,
        $tbody = this.view.$body.querySelector('tbody'),
        $header = this.view.$header,
        $sorter;

    if (data_only) {
      cond.order = cond.order || 'ascending';
      FlareTail.helpers.array.sort(this.data.rows, cond);

      return true;
    }

    if (prop === 'order') {
      cond.order = value;
    } else if (prop === 'key' && cond.key === value) {
      // The same column is selected; change the order
      cond.order = cond.order === 'ascending' ? 'descending' : 'ascending';
    } else {
      cond.key = value;
      cond.order = 'ascending';
      $header.querySelector('[aria-sort]').removeAttribute('aria-sort');
    }

    $sorter = $header.querySelector(`[role="columnheader"][data-id="${CSS.escape(cond.key)}"]`);
    cond.type = $sorter.dataset.type;

    $tbody.setAttribute('aria-busy', 'true'); // display: none

    FlareTail.helpers.array.sort(this.data.rows, cond);

    $tbody.removeAttribute('aria-busy');
    $sorter.setAttribute('aria-sort', cond.order);

    // Reorder the member list
    this.view.members = [...$grid.querySelectorAll(this.options.item_selector)];

    // Fire an event
    FlareTail.helpers.event.trigger($grid, 'Sorted', { detail: {
      conditions: FlareTail.helpers.object.clone(cond) // Clone cond as it's a proxyfied object
    }});

    let selected = this.view.selected;

    if (selected && selected.length) {
      this.ensure_row_visibility(selected[selected.length - 1]);
    }

    return true;
  }

  /**
   * Initialize the column picker on the grid header.
   * @argument {undefined}
   * @return {undefined}
   */
  init_columnpicker () {
    let $picker = this.view.$columnpicker = document.createElement('ul'),
        $header = this.view.$header;

    $picker.id = `${this.view.$container.id}-columnpicker`;
    $picker.setAttribute('role', 'menu');
    $picker.setAttribute('aria-expanded', 'false');
    $header.appendChild($picker);
    $header.setAttribute('aria-owns', $picker.id); // Set this attr before initializing the widget

    let $$picker = this.data.$$columnpicker = new FlareTail.widgets.Menu($picker);

    $$picker.bind('MenuItemSelected', event => this.toggle_column(event.detail.target.dataset.id));
  }

  /**
   * Build the content of the column picker.
   * @argument {undefined}
   * @return {undefined}
   */
  build_columnpicker () {
    this.data.$$columnpicker.build(this.data.columns.map(col => ({
      id: `${this.view.$container.id}-columnpicker-${col.id}`,
      label: col.label,
      type: 'menuitemcheckbox',
      disabled: col.key === true,
      checked: !col.hidden,
      data: { id: col.id }
    })));
  }

  /**
   * Show or hide a grid column by ID.
   * @argument {String} id - Column ID.
   * @return {undefined}
   */
  toggle_column (id) {
    // Find column by id, thanks to Proxy
    let col = this.data.columns[id];

    col.hidden = !col.hidden;
  }

  /**
   * Show a grid column.
   * @argument {Object} col - Column data.
   * @argument {String} col.id - Column ID.
   * @return {undefined}
   */
  show_column (col) {
    let $grid = this.view.$container,
        attr = `[data-id="${col.id}"]`;

    $grid.querySelector(`[role="columnheader"]${attr}`).removeAttribute('aria-hidden');

    for (let $cell of $grid.querySelectorAll(`[role="gridcell"]${attr}`)) {
      $cell.removeAttribute('aria-hidden');
    }

    for (let $col of $grid.querySelectorAll(`col${attr}`)) {
      $col.dataset.hidden = 'false';
    }
  }

  /**
   * Hide a grid column.
   * @argument {Object} col - Column data.
   * @argument {String} col.id - Column ID.
   * @return {undefined}
   */
  hide_column (col) {
    let $grid = this.view.$container,
        attr = `[data-id="${col.id}"]`;

    for (let $col of $grid.querySelectorAll(`col${attr}`)) {
      $col.dataset.hidden = 'true';
    }

    $grid.querySelector(`[role="columnheader"]${attr}`).setAttribute('aria-hidden', 'true');

    for (let $cell of $grid.querySelectorAll(`[role="gridcell"]${attr}`)) {
      $cell.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * Make a grid row visible by scrolling the grid body when needed.
   * @argument {HTMLElement} $row - Row element to show.
   * @return {undefined}
   */
  ensure_row_visibility ($row) {
    let $outer = this.view.$container.querySelector('.grid-body');

    if (!$outer) {
      return;
    }

    let ost = $outer.scrollTop,
        ooh = $outer.offsetHeight,
        rot = $row.offsetTop,
        roh = $row.offsetHeight;

    if (ost > rot) {
      $row.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    if (ost + ooh < rot + roh) {
      $row.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }

  /**
   * Start reordering a grid column.
   * @argument {MouseEvent} event - The mousemove event.
   * @return {undefined}
   */
  start_column_reordering (event) {
    let $grid = this.view.$container,
        $container = document.createElement('div'),
        $_image = document.createElement('canvas'),
        $follower,
        headers = [],
        rect = $grid.getBoundingClientRect(),
        style = $container.style;

    event.target.dataset.grabbed = 'true';
    $container.id = 'column-drag-image-container';
    style.top = `${rect.top}px`;
    style.left = `${rect.left}px`;
    style.width = `${$grid.offsetWidth}px`;
    style.height = `${$grid.offsetHeight}px`;

    for (let $chead of this.view.$header.querySelectorAll('[role="columnheader"]')) {
      let $image = $container.appendChild($_image.cloneNode(true)),
          left = $chead.offsetLeft,
          width = $chead.offsetWidth,
          index = $chead.cellIndex,
          style = $image.style;

      $image.id = `column-drag-image-${index}`;
      style.left = `${left}px`;
      style.width = `${width}px`;
      style.height = `${$grid.offsetHeight}px`;
      style.background = `-moz-element(#${$grid.id}) -${left}px 0`;

      if ($chead.dataset.grabbed === 'true') {
        // The follower shows the dragging position
        $follower = $image;
        $image.className = 'follower';
        this.data.drag = {
          $container,
          $header: $chead,
          $follower,
          start_index: index,
          current_index: index,
          start_left: event.clientX - left,
          row_width: width,
          grid_width: $grid.offsetWidth,
        };
      }

      headers.push(new Proxy({ index, left, width }, {
        set: (obj, prop, value) => {
          if (prop === 'left') {
            let $image = document.querySelector(`#column-drag-image-${obj.index}`);

            if ($image.className !== 'follower') {
              $image.style.left = `${value}px`;
            }
          }

          obj[prop] = value;

          return true;
        }
      }));
    }

    this.data.drag.headers = headers;
    document.body.appendChild($container);
    $grid.querySelector('[role="scrollbar"]').setAttribute('aria-hidden', 'true')
  }

  /**
   * Continue reordering a grid column.
   * @argument {MouseEvent} event - The mousemove event.
   * @return {undefined}
   */
  continue_column_reordering (event) {
    let drag = this.data.drag,
        pos = event.clientX - drag.start_left,
        index = drag.current_index,
        headers = drag.headers,
        current = headers[index],
        prev = headers[index - 1],
        next = headers[index + 1];

    // Moving left
    if (prev && pos < prev.left + prev.width / 2) {
      [prev.index, current.index] = [current.index, prev.index];
      [prev.width, current.width] = [current.width, prev.width];
      current.left = prev.left + prev.width;
      drag.current_index--;

      return;
    }

    // Moving right
    if (next && pos + drag.row_width > next.left + next.width / 2) {
      [current.index, next.index] = [next.index, current.index];
      [current.width, next.width] = [next.width, current.width];
      current.left = prev ? prev.left + prev.width : 0;
      next.left = current.left + current.width;
      drag.current_index++;

      return;
    }

    // Move further
    if (pos >= 0 && pos + drag.row_width <= drag.grid_width) {
      drag.$follower.style.left = `${pos}px`;
    }
  }

  /**
   * Stop reordering a grid column.
   * @argument {MouseEvent} event - The mouseup event.
   * @return {undefined}
   */
  stop_column_reordering (event) {
    let drag = this.data.drag,
        start_idx = drag.start_index,
        current_idx = drag.current_index,
        $grid = this.view.$container,
        columns = this.data.columns;

    // Actually change the position of rows
    if (start_idx !== current_idx) {
      // Data
      columns.splice(current_idx, 0, columns.splice(start_idx, 1)[0]);

      // View
      for (let $colgroup of $grid.querySelectorAll('colgroup')) {
        let items = $colgroup.children;

        $colgroup.insertBefore(items[start_idx], items[start_idx > current_idx ? current_idx : current_idx + 1]);
      }

      for (let $row of $grid.querySelectorAll('[role="row"]')) {
        let items = $row.children;

        $row.insertBefore(items[start_idx], items[start_idx > current_idx ? current_idx : current_idx + 1]);
      }
    }

    // Fire an event
    FlareTail.helpers.event.trigger($grid, 'ColumnModified', { detail: { columns }});

    // Cleanup
    drag.$header.removeAttribute('data-grabbed');
    drag.$container.remove();
    $grid.querySelector('[role="scrollbar"]').removeAttribute('aria-hidden');

    delete this.data.drag;
  }

  /**
   * Filter the grid rows by IDs.
   * @argument {Array.<(String|Number)>} ids - Row IDs to show.
   * @return {undefined}
   */
  filter (ids) {
    let $grid_body = this.view.$body,
        selected = [...this.view.selected];

    $grid_body.setAttribute('aria-busy', 'true');

    // Filter the rows
    for (let $row of $grid_body.querySelectorAll('[role="row"]')) {
      let id = $row.dataset.id;

      // Support both literal IDs and numeric IDs
      $row.setAttribute('aria-hidden', !ids.includes(Number.isNaN(id) ? id : Number(id)));
    }

    // Update the member list
    this.view.members = [...$grid_body.querySelectorAll('[role="row"][aria-hidden="false"]')];

    if (selected.length) {
      for (let [index, $row] of selected.entries()) if ($row.getAttribute('aria-hidden') === 'true') {
        selected.splice(index, 1);
      }

      this.view.selected = selected;
    }

    $grid_body.scrollTop = 0;
    $grid_body.removeAttribute('aria-busy');

    FlareTail.helpers.event.trigger(this.view.$container, 'Filtered');
  }
}

/**
 * Implement the select abstract role.
 * @extends FlareTail.widgets.Composite
 * @see {@link http://www.w3.org/TR/wai-aria/complete#select}
 */
FlareTail.widgets.Select = class Select extends FlareTail.widgets.Composite {}

/**
 * Implement the combobox role.
 * TODO: Support aria-autocomplete="inline" and "both"
 * TODO: Add more HTMLSelectElement-compatible attributes
 * TODO: Add test cases
 * @extends FlareTail.widgets.Select
 * @see {@link http://www.w3.org/TR/wai-aria/complete#combobox}
 */
FlareTail.widgets.ComboBox = class ComboBox extends FlareTail.widgets.Select {
  /**
   * Get a ComboBox instance.
   * @constructor
   * @argument {HTMLElement} $container - <div role="combobox">
   * @return {Object} widget
   */
  constructor ($container) {
    super(); // This does nothing but is required before using `this`

    this.$container = $container;
    this.$container.setAttribute('aria-expanded', 'false');

    this.$button = this.$container.querySelector('[role="button"]');
    this.$input = this.$container.querySelector('[role="textbox"], [role="searchbox"]');
    this.$listbox = this.$container.querySelector('[role="listbox"]');

    this.autocomplete = this.$container.getAttribute('aria-autocomplete') || 'none';
    this.autoexpand = this.$container.matches('[data-autoexpand="true"]');
    this.nobutton = this.$container.matches('[data-nobutton="true"]');

    Object.defineProperties(this, {
      options: {
        enumerable: true,
        get: () => [...this.$listbox.querySelectorAll('[role="option"]')],
      },
      disabled: {
        enumerable: true,
        get: () => this.$container.matches('[aria-disabled="true"]'),
      },
      readonly: {
        enumerable: true,
        get: () => this.$input.matches('[aria-readonly="true"]'),
      },
      selected: {
        enumerable: true,
        get: () => this.$$input.value,
        set: value => {
          this.$selected = this.$listbox.querySelector(`[role="option"][data-value="${value}"]`);
          this.$$input.value = value;
        },
      },
      $selected: {
        enumerable: true,
        get: () => this.$listbox.querySelector('[role="option"][aria-selected="true"]'),
        set: $selected => {
          this.$$listbox.view.selected = this.$$listbox.view.$focused = $selected;
          this.$$input.value = $selected.dataset.value || $selected.textContent;
        },
      },
      selectedIndex: {
        enumerable: true,
        get: () => this.$$listbox.view.members.indexOf(this.$$listbox.view.selected[0]),
        set: index => {
          let $selected = this.$$listbox.view.selected = this.$$listbox.view.$focused
                        = this.$$listbox.view.members[index];

          this.$$input.value = $selected.dataset.value || $selected.textContent;
        },
      },
    });

    if (!this.$button && !this.nobutton) {
      this.$button = this.$container.appendChild(document.createElement('span'));
      this.$button.setAttribute('role', 'button');
    }

    if (this.$button) {
      this.$button.tabIndex = 0;
      this.$button.addEventListener('mousedown', event => this.button_onmousedown(event));
    }

    if (!this.$input) {
      this.$input = this.$container.insertBefore(document.createElement('span'), this.$container.firstElementChild);
      this.$input.setAttribute('role', 'textbox');
      this.$input.setAttribute('aria-readonly', this.$container.matches('[aria-readonly="true"]'));
    }

    this.$input.tabIndex = 0;
    this.$input.contentEditable = !this.readonly;
    this.$input.addEventListener('keydown', event => this.input_onkeydown(event));
    this.$input.addEventListener('input', event => this.input_oninput(event));
    this.$input.addEventListener('blur', event => this.input_onblur(event));
    this.$$input = new FlareTail.widgets.TextBox(this.$input);

    if (!this.$listbox) {
      this.$listbox = this.$container.appendChild(document.createElement('ul'));
      this.$listbox.setAttribute('role', 'listbox');
    }

    this.$listbox.addEventListener('mouseover', event => this.listbox_onmouseover(event));
    this.$listbox.addEventListener('mousedown', event => this.listbox_onmousedown(event));
    this.$listbox.addEventListener('click', event => this.listbox_onclick(event));
    this.$listbox.addEventListener('Selected', event => this.listbox_onselect(event));
    this.$$listbox = new FlareTail.widgets.ListBox(this.$listbox, undefined, { search_enabled: false });

    this.$listbox_outer = this.$container.appendChild(document.createElement('div'));
    this.$listbox_outer.className = 'listbox-outer';
    this.$listbox_outer.appendChild(this.$listbox);
    this.$listbox_outer.addEventListener('wheel', event => event.stopPropagation());
    this.$$scrollbar = new FlareTail.widgets.ScrollBar(this.$listbox_outer);

    let $selected = this.$listbox.querySelector('[role="option"][aria-selected="true"]');

    if ($selected) {
      this.$$input.value = $selected.dataset.value || $selected.textContent;
    }
  }

  /**
   * Set an event listener on the widget.
   * @argument {*} args - The event type and handler.
   * @return {undefined}
   */
  on (...args) {
    this.$container.addEventListener(...args);
  }

  /**
   * Show the dropdown list.
   * @argument {undefined}
   * @return {undefined}
   */
  show_dropdown () {
    if (!this.$$listbox.view.members.length) {
      return;
    }

    let input = this.$input.getBoundingClientRect(),
        listbox = this.$listbox_outer.getBoundingClientRect(),
        adjusted = window.innerHeight - input.bottom < listbox.height && input.top > listbox.height,
        $selected = this.$$listbox.view.selected[0];

    if (!$selected) {
      $selected = this.$$listbox.view.selected = this.$$listbox.view.members[0];
    }

    this.$container.setAttribute('aria-expanded', 'true');
    this.$container.setAttribute('aria-activedescendant', $selected.id);
    this.$$listbox.view.$focused = $selected;
    this.$input.focus(); // Keep focus on <input>
    this.$listbox_outer.dataset.position = adjusted ? 'above' : 'below';
    this.$$scrollbar.set_height();
  }

  /**
   * Hide the dropdown list.
   * @argument {undefined}
   * @return {undefined}
   */
  hide_dropdown () {
    this.$container.setAttribute('aria-expanded', 'false');
    this.$container.removeAttribute('aria-activedescendant');
  }

  /**
   * Show or hide the dropdown list.
   * @argument {undefined}
   * @return {undefined}
   */
  toggle_dropdown () {
    if (this.$container.getAttribute('aria-expanded') === 'false') {
      this.show_dropdown();
    } else {
      this.hide_dropdown();
    }
  }

  /**
   * Add an option to the dropdown list.
   * @argument {HTMLElement} $element - Option node.
   * @argument {Boolean} [addition=true] - Whether the option should be appended to the list. If false, any existing
   *  options will be removed first.
   * @return {undefined}
   */
  fill_dropdown ($element, addition = true) {
    if (!addition) {
      this.$listbox.innerHTML = '';
    }

    this.$listbox.appendChild($element);
    this.$$listbox.update_members();
    this.$$listbox.get_data();

    let $selected = this.$$listbox.view.selected[0];

    if (this.autocomplete === 'list' && $selected) {
      this.$$input.value = $selected.dataset.value || $selected.textContent;
    }
  }

  /**
   * Build the dropdown list with the provided data.
   * @argument {Object} data - Data to be filled in.
   * @argument {String} data.value - Item value.
   * @argument {Boolean} [data.selected] - Whether the item to be selected.
   * @return {undefined}
   */
  build_dropdown (data) {
    this.clear_dropdown();

    for (let { value, selected } of data) {
      this.add_item(value, selected);
    }
  }

  /**
   * Add an item to the dropdown list.
   * @argument {String} value - Item value.
   * @argument {Boolean} [selected=false] - Whether the item to be selected.
   * @return {HTMLElement} $option - Added node.
   */
  add_item (value, selected = false) {
    let $option = document.createElement('li');

    $option.dataset.value = $option.textContent = value;
    $option.setAttribute('role', 'option');
    $option.setAttribute('aria-selected', selected);

    this.fill_dropdown($option);

    return $option;
  }

  /**
   * Empty the dropdown list.
   * @argument {undefined}
   * @return {undefined}
   */
  clear_dropdown () {
    this.$listbox.innerHTML = '';
    this.$$listbox.update_members();
    this.$$listbox.get_data();
  }

  /**
   * Clear the input field.
   * @argument {undefined}
   * @return {undefined}
   */
  clear_input () {
    this.$$input.clear();
  }

  /**
   * Called whenever the button is pressed. Show or hide the dropdown list.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  button_onmousedown (event) {
    this.toggle_dropdown();
    event.preventDefault();
  }

  /**
   * Called whenever the user is hitting a key on the text field. Treat some non-character keys as keyboard shortcuts,
   * including Tab, Escape, Enter, Up Arrow and Down Arrow.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {Boolean} default - True if the event doesn't trigger any action.
   */
  input_onkeydown (event) {
    if (event.key === 'Tab') {
      return true;
    }

    if (this.disabled) {
      event.preventDefault();

      return false;
    }

    if (this.$$listbox.view.members.length) {
      if (event.key === 'Escape') {
        this.hide_dropdown();
      } else if (event.key === ' ') { // Space
        this.toggle_dropdown();
      } else if (event.key === 'Enter') {
        this.listbox_onmousedown(event);
      } else {
        FlareTail.helpers.kbd.dispatch(this.$listbox, event.key);

        if (event.key.match(/^Arrow(Up|Down)$/)) {

          if (this.autoexpand) {
            this.show_dropdown();
          }

          let $target = this.$$listbox.view.selected[0],
              value = $target.dataset.value || $target.textContent;

          if (this.autocomplete === 'list') {
            this.$$input.value = value;
            FlareTail.helpers.event.trigger(this.$container, 'Change', { detail: { $target, value }});
          }

          this.$input.focus(); // Keep focus on <input>
        }
      }
    }

    if (this.readonly) {
      event.preventDefault();
    }

    event.stopPropagation();

    return true;
  }

  /**
   * Called whenever the user is typing on the text field. Empty the dropdown list and notify the event so the consumer
   * can do something, like incremental search.
   * @argument {InputEvent} event - The input event.
   * @return {undefined}
   */
  input_oninput (event) {
    let value = this.$$input.value.trim();

    this.clear_dropdown();

    if (!value.match(/\S/)) {
      this.hide_dropdown();

      return;
    }

    FlareTail.helpers.event.trigger(this.$container, 'Input', { detail: { value, $target: this.$input }});

    event.stopPropagation();
  }

  /**
   * Called whenever the text field loose a focus. Hide the dropdown list.
   * @argument {FocusEvent} event - The blur event.
   * @return {undefined}
   */
  input_onblur (event) {
    // Use a timer in case of the listbox getting focus for a second
    window.setTimeout(() => {
      if (!this.$input.matches(':focus')) {
        this.hide_dropdown();
      }
    }, 50);
  }

  /**
   * Called whenever the dropdown list is hovered. Select and focus an item on the list. This method is based on
   * Menu.prototype.onmouseover.
   * @argument {MouseEvent} event - The mouseover event.
   * @return {undefined}
   */
  listbox_onmouseover (event) {
    if (this.$$listbox.view.members.includes(event.target)) {
      this.$$listbox.view.selected = this.$$listbox.view.$focused = event.target;
      this.show_dropdown();
    }

    FlareTail.helpers.event.ignore(event);
  }

  /**
   * Called whenever the dropdown list is clicked. Change the text field value and trigger an event.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  listbox_onmousedown (event) {
    let $target = this.$$listbox.view.selected[0],
        value = $target.dataset.value || $target.textContent;

    this.hide_dropdown();
    this.$$input.value = value;
    this.$input.focus();

    FlareTail.helpers.event.trigger(this.$container, 'Change', { detail: { $target, value }});
    FlareTail.helpers.event.ignore(event);
  }

  /**
   * Called whenever an dropdown list item is selected. Set the aria-activedescendant attribute for a11y.
   * @argument {CustomEvent} event - The custom Select event.
   * @return {undefined}
   */
  listbox_onselect (event) {
    this.$container.setAttribute('aria-activedescendant', event.detail.ids[0]);
  }

  /**
   * Set an event listener on the widget.
   * @argument {*} args - The event type and handler.
   * @return {undefined}
   */
  bind (...args) {
    this.$container.addEventListener(...args);
  }
}

/**
 * Implement the listbox role.
 * @extends FlareTail.widgets.Select
 * @see {@link http://www.w3.org/TR/wai-aria/complete#listbox}
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

/**
 * Implement the menu role.
 * @extends FlareTail.widgets.Select
 * @see {@link http://www.w3.org/TR/wai-aria/complete#menu}
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

/**
 * Implement the menubar role.
 * @extends FlareTail.widgets.Menu
 * @see {@link http://www.w3.org/TR/wai-aria/complete#menubar}
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

/**
 * Implement the radiogroup role.
 * @extends FlareTail.widgets.Select
 * @see {@link http://www.w3.org/TR/wai-aria/complete#radiogroup}
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

/**
 * Implement the tree role.
 * @extends FlareTail.widgets.Select
 * @see {@link http://www.w3.org/TR/wai-aria/complete#tree}
 */
FlareTail.widgets.Tree = class Tree extends FlareTail.widgets.Select {
  /**
   * Get a Tree instance.
   * @constructor
   * @argument {HTMLElement} $container - <menu role="tree">
   * @argument {Array.<Object>} data - Optional data.
   * @return {Object} widget
   */
  constructor ($container, data) {
    super(); // This does nothing but is required before using `this`

    this.view = { $container };

    this.options = {
      search_enabled: true,
      item_roles: ['treeitem'],
      item_selector: '[role="treeitem"]',
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
   * Called whenever a mousedown event is triggered. Expand the tree if the expander is clicked.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  onmousedown (event) {
    if (event.target.matches('.expander')) {
      this.expand(event.target.parentElement.querySelector('[role="treeitem"]'));
    } else {
      // The default behavior
      super.onmousedown(event);
    }
  }

  /**
   * Called whenever a keydown event is triggered. Select a menu item or expand/collapse the tree when necessary.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  onkeydown (event) {
    let $item = event.target,
        items = this.view.members;

    switch (event.key) {
      case 'ArrowLeft': {
        if ($item.matches('[aria-expanded="true"]')) {
          this.expand($item); // Collapse the subgroup
        } else {
          // Select the parent item
          let level = Number($item.getAttribute('aria-level')),
              $selected = items[0];

          for (let i = items.indexOf($item) - 1; i >= 0; i--) {
            if (Number(items[i].getAttribute('aria-level')) === level - 1) {
              $selected = items[i];

              break;
            }
          }

          this.view.selected = this.view.$focused = $selected;
        }

        break;
      }

      case 'ArrowRight': {
        if ($item.matches('[aria-expanded="false"]')) {
          this.expand($item); // Expand the subgroup
        } else if ($item.hasAttribute('aria-expanded')) {
          // Select the item just below
          let $selected = items[items.indexOf($item) + 1];

          this.view.selected = this.view.$focused = $selected;
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
   * Called whenever a dblclick event is triggered. Expand the tree if the expander is clicked.
   * @argument {MouseEvent} event - The dblclick event.
   * @return {undefined}
   */
  ondblclick (event) {
    if (event.target.hasAttribute('aria-expanded')) {
      this.expand(event.target);
    }
  }

  /**
   * Build the menu dynamically with the provided data.
   * @argument {undefined}
   * @return {undefined}
   */
  build () {
    let $tree = this.view.$container,
        $fragment = new DocumentFragment(),
        $outer = document.createElement('li'),
        $treeitem = document.createElement('span'),
        $expander = document.createElement('span'),
        $group = document.createElement('ul'),
        structure = this.data.structure,
        map = this.data.map = new WeakMap(),
        level = 1;

    $outer.setAttribute('role', 'none');
    $treeitem.setAttribute('role', 'treeitem');
    $treeitem.appendChild(document.createElement('label'));
    $expander.className = 'expander';
    $expander.setAttribute('role', 'none');
    $group.setAttribute('role', 'group');

    let get_item = obj => {
      let $item = $treeitem.cloneNode(true),
          $_outer = $outer.cloneNode(false),
          item_id = `${$tree.id}-${obj.id}`;

      $item.firstChild.textContent = obj.label;
      $item.id = item_id;
      $item.setAttribute('aria-level', level);
      $item.setAttribute('aria-selected', obj.selected ? 'true' : 'false');

      // Save the item/obj reference
      map.set($item, obj);
      obj.$element = $item;

      $_outer.appendChild($item);

      if (obj.data) {
        for (let [prop, value] of Object.entries(obj.data)) {
          $item.dataset[prop] = value;
        }
      }

      if (obj.sub) {
        $_outer.appendChild($expander.cloneNode(false));
        $item.setAttribute('aria-expanded', obj.selected !== false);
        $item.setAttribute('aria-owns', `${item_id}-group`);

        let $_group = $_outer.appendChild($group.cloneNode(false));

        $_group.id = `${item_id}-group`;
        level++;

        for (let sub of obj.sub) {
          $_group.appendChild(get_item(sub));
        }

        level--;
      }

      return $_outer;
    };

    // Build the tree recursively
    for (let obj of structure) {
      $fragment.appendChild(get_item(obj));
    }

    $tree.appendChild($fragment);
  }

  /**
   * Retrieve the tree data from a static list markup.
   * @argument {undefined}
   * @return {undefined}
   */
  get_data () {
    let map = this.data.map = new WeakMap(),
        structure = this.data.structure = [];

    // TODO: generate structure data

    for (let $item of this.view.members) {
      let level = Number($item.getAttribute('aria-level')),
          item = {
            $element: $item,
            id: $item.id,
            label: $item.textContent,
            level,
            sub: []
          };

      if (Object.keys($item.dataset).length) {
        item.data = {};

        for (let [prop, value] of Object.entries($item.dataset)) {
          item.data[prop] = value;
        }
      }

      // Save the item/obj reference
      map.set($item, item);
    };
  }

  /**
   * Expand a tree item.
   * @argument {HTMLElement} $item - Node to be expanded.
   * @return {undefined}
   */
  expand ($item) {
    let expanded = $item.matches('[aria-expanded="true"]'),
        items = [...this.view.$container.querySelectorAll('[role="treeitem"]')],
        selector = `#${$item.getAttribute('aria-owns')} [aria-selected="true"]`,
        children = [...document.querySelectorAll(selector)];

    $item.setAttribute('aria-expanded', !expanded);

    // Update data with visible items
    this.view.members = items.filter($item => $item.offsetParent !== null);

    if (!children.length) {
      return;
    }

    this.view.$focused = $item;

    if (!this.options.multiselectable) {
      this.view.selected = $item;

      return;
    }

    // Remove the item's children from selection
    let selected = this.view.selected.filter($item => !children.includes($item));

    // Add the item to selection
    selected.push($item);
    this.view.selected = selected;
  }
}

/**
 * Implement the treegrid role.
 * @extends FlareTail.widgets.Grid
 * @see {@link http://www.w3.org/TR/wai-aria/complete#treegrid}
 */
FlareTail.widgets.TreeGrid = class TreeGrid extends FlareTail.widgets.Grid {}

/**
 * Implement the tablist role.
 * @extends FlareTail.widgets.Composite
 * @see {@link http://www.w3.org/TR/wai-aria/complete#tablist}
 */
FlareTail.widgets.TabList = class TabList extends FlareTail.widgets.Composite {
  /**
   * Get a TabList instance.
   * @constructor
   * @argument {HTMLElement} $container - <ul role="tablist">. Those attributes are supported as options:
   *  - data-removable: If true, tabs can be opened and/or closed (default: false)
   *  - data-reorderable: If true, tabs can be reordered by drag (default: false)
   *  Those attributes on the tab elements are also supported:
   *  - aria-selected: If true, the tab will be selected first
   *  - draggable and aria-grabbed: Tabs can be dragged (to reorder)
   * @return {Object} widget
   */
  constructor ($container) {
    super(); // This does nothing but is required before using `this`

    // TODO: aria-multiselectable support for accordion UI
    // http://www.w3.org/WAI/PF/aria-practices/#accordion
    if ($container.matches('[aria-multiselectable="true"]')) {
      throw new Error('Multi-selectable tab list is not supported yet.');
    }

    this.view = { $container };

    this.options = {
      item_roles: ['tab'],
      item_selector: '[role="tab"]',
      focus_cycling: true,
      removable: $container.dataset.removable === 'true',
      reorderable: $container.dataset.reorderable === 'true'
    };

    this.activate();

    this.view = new Proxy(this.view, {
      set: (obj, prop, value) => {
        if (prop === 'selected') {
          value = Array.isArray(value) ? value : [value];
          this.switch_tabpanel(obj[prop][0], value[0]);
        }

        obj[prop] = value;

        return true;
      }
    });

    if (this.options.removable) {
      for (let $tab of this.view.members) {
        this.set_close_button($tab);
      }
    }

    // TEMP: Update the members of the tablist when the aria-hidden attribute is changed
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
   * Called whenever a tab is clicked. If the target is the close button, close the tab.
   * @argument {MouseEvent} event - The click event.
   * @return {undefined}
   */
  onclick (event) {
    if (event.currentTarget === this.view.$container && event.target.matches('.close')) {
      this.close_tab(document.getElementById(event.target.getAttribute('aria-controls')));
    }
  }

  /**
   * Change the active tab.
   * @argument {HTMLElement} $current_tab - The current active tab node.
   * @argument {HTMLElement} $new_tab - The new active tab node.
   * @return {undefined}
   */
  switch_tabpanel ($current_tab, $new_tab) {
    let $panel;

    // Current tabpanel
    $panel = document.getElementById($current_tab.getAttribute('aria-controls'))
    $panel.tabIndex = -1;
    $panel.setAttribute('aria-hidden', 'true');

    // New tabpanel
    $panel = document.getElementById($new_tab.getAttribute('aria-controls'))
    $panel.tabIndex = 0;
    $panel.setAttribute('aria-hidden', 'false');
  }

  /**
   * Add the close button to a tab.
   * @argument {HTMLElement} $tab - Tab that the button will be added.
   * @return {undefined}
   */
  set_close_button ($tab) {
    let $button = document.createElement('span');

    $button.className = 'close';
    $button.title = 'Close Tab'; // l10n
    $button.setAttribute('role', 'button');
    $button.setAttribute('aria-controls', $tab.id);
    $tab.appendChild($button);
  }

  /**
   * Add a new tab to the tablist.
   * @argument {String} name - Identifier of the tab.
   * @argument {String} title - Label displayed on the tab.
   * @argument {String} label - Tooltip of the tab.
   * @argument {HTMLElement} $panel - Relevant tabpanel node.
   * @argument {String} [position='last'] - Where the new tab will be added, 'next' of the current tab or 'last'.
   * @argument {Object} [dataset] - Map of the tab's data attributes.
   * @return {HTMLElement} $tab - The new tab node.
   */
  add_tab (name, title, label, $panel, position = 'last', dataset = {}) {
    let items = this.view.members,
        $tab = items[0].cloneNode(true),
        $selected = this.view.selected[0],
        index = items.indexOf($selected),
        $next_tab = items[index + 1];

    $tab.id = `tab-${name}`;
    $tab.title = label || title;
    $tab.tabIndex = -1;
    $tab.setAttribute('aria-selected', 'false');
    $tab.setAttribute('aria-controls', `tabpanel-${name}`);
    $tab.querySelector('label').textContent = title;
    $tab.querySelector('[role="button"]').setAttribute('aria-controls', $tab.id);

    if (dataset) {
      for (let [prop, value] of Object.entries(dataset)) {
        $tab.dataset[prop] = value;
      }
    }

    // Add tab
    if (position === 'next' && $next_tab) {
      this.view.$container.insertBefore($tab, $next_tab); // Update view
      items.splice(index + 1, 0, $tab); // Update data
    } else {
      this.view.$container.appendChild($tab); // Update view
      items.push($tab); // Update data
    }

    $panel = $panel || document.createElement('section');
    $panel.id = `tabpanel-${name}`;
    $panel.tabIndex = -1;
    $panel.setAttribute('role', 'tabpanel');
    $panel.setAttribute('aria-hidden', 'true');
    $panel.setAttribute('aria-labelledby', $tab.id);

    // Add tabpanel
    document.getElementById($selected.getAttribute('aria-controls')).parentElement.appendChild($panel);

    return $tab;
  }

  /**
   * Close a tab.
   * @argument {HTMLElement} $tab - Tab to be removed.
   * @return {undefined}
   */
  close_tab ($tab) {
    let items = this.view.members,
        index = items.indexOf($tab);

    // Switch tab
    if (this.view.selected[0] === $tab) {
      let $new_tab = items[index - 1] || items[index + 1];

      this.view.selected = this.view.$focused = $new_tab;
    }

    // Remove tabpanel
    document.getElementById($tab.getAttribute('aria-controls')).remove();

    // Remove tab
    items.splice(index, 1); // Update data
    $tab.remove(); // Update view
  }
}

/**
 * Implement the input abstract role.
 * @extends FlareTail.widgets.Widget
 * @see {@link http://www.w3.org/TR/wai-aria/complete#input}
 */
FlareTail.widgets.Input = class Input extends FlareTail.widgets.Widget {}

/**
 * Implement the textbox role.
 * @extends FlareTail.widgets.Input
 * @see {@link http://www.w3.org/TR/wai-aria/complete#textbox}
 */
FlareTail.widgets.TextBox = class TextBox extends FlareTail.widgets.Input {
  /**
   * Get a TextBox instance.
   * @constructor
   * @argument {HTMLElement} $textbox - <span role="textbox">
   * @argument {Boolean} [richtext=false] - Whether the richtext editing to be enabled.
   * @return {Object} widget
   */
  constructor ($textbox, richtext = false) {
    super(); // This does nothing but is required before using `this`

    this.$textbox = $textbox;
    this.richtext = richtext || this.$textbox.matches('[data-richtext="true"]');
    this.nobreak = !richtext || this.$textbox.matches('[data-nobreak="true"]');

    Object.defineProperties(this, {
      value: {
        enumerable: true,
        get: () => this.$textbox.textContent,
        set: str => this.$textbox.textContent = str
      },
      readonly: {
        enumerable: true,
        get: () => this.$textbox.matches('[aria-readonly="true"]'),
      },
    });

    FlareTail.helpers.event.bind(this, this.$textbox, ['cut', 'copy', 'paste', 'keydown', 'input']);
  }

  /**
   * Called whenever a cut event is triggered. If this is a plaintext editor, mimic the native editor's behaviour.
   * @argument {ClipboardEvent} event - The cut event.
   * @return {undefined}
   */
  oncut (event) {
    let selection = window.getSelection();

    if (!this.richtext) {
      event.clipboardData.setData('text/plain', selection.toString());
      event.preventDefault();
      selection.deleteFromDocument();
    }

    this.onedit();
  }

  /**
   * Called whenever a copy event is triggered. If this is a plaintext editor, mimic the native editor's behaviour.
   * @argument {ClipboardEvent} event - The copy event.
   * @return {undefined}
   */
  oncopy (event) {
    let selection = window.getSelection();

    if (!this.richtext) {
      event.clipboardData.setData('text/plain', selection.toString());
      event.preventDefault();
    }
  }

  /**
   * Called whenever a paste event is triggered. If this is a plaintext editor, mimic the native editor's behaviour.
   * @argument {ClipboardEvent} event - The paste event.
   * @return {undefined}
   */
  onpaste (event) {
    let selection = window.getSelection(),
        range = selection.getRangeAt(0);

    if (!this.richtext) {
      event.preventDefault();
      range.deleteContents();
      range.insertNode(document.createTextNode(event.clipboardData.getData('text/plain')));
      range.collapse(false);
    }

    this.onedit();
  }

  /**
   * Called whenever a keydown event is triggered. Handle the readonly and nobreak options.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {Boolean} default - False if the editor is readonly. True otherwise.
   */
  onkeydown (event) {
    event.stopPropagation();

    if (this.readonly) {
      event.preventDefault();

      return false;
    }

    if (this.nobreak && event.key === 'Enter') {
      event.preventDefault();
    }

    return true;
  }

  /**
   * Called whenever an input event is triggered.
   * @argument {InputEvent} event - The input event.
   * @return {undefined}
   */
  oninput (event) {
    this.onedit();
  }

  /**
   * Called whenever the text value is changed. Fire a custom event.
   * @argument {undefined}
   * @return {undefined}
   */
  onedit () {
    FlareTail.helpers.event.trigger(this.$textbox, 'Edited', { detail: { value: this.value }});
  }

  /**
   * Clear the textbox.
   * @argument {undefined}
   * @return {undefined}
   */
  clear () {
    this.$textbox.textContent = '';
    this.onedit();
  }

  /**
   * Set an event listener on the widget.
   * @argument {*} args - The event type and handler.
   * @return {undefined}
   */
  bind (...args) {
    this.$textbox.addEventListener(...args);
  }
}

/**
 * Implement the checkbox role.
 * @extends FlareTail.widgets.Input
 * @see {@link http://www.w3.org/TR/wai-aria/complete#checkbox}
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

/**
 * Implement the scrollbar role.
 * @extends FlareTail.widgets.Input
 * @see {@link http://www.w3.org/TR/wai-aria/complete#scrollbar}
 */
FlareTail.widgets.ScrollBar = class ScrollBar extends FlareTail.widgets.Input {
  /**
   * Get a ScrollBar instance.
   * @constructor
   * @argument {HTMLElement} $owner - Element to be scrolled.
   * @argument {Boolean} [adjusted=false] - Adjust the scrolling increment for Grid, Tree, ListBox.
   * @argument {Boolean} [arrow_keys_enabled=false] - Enable scrolling with the up/down arrow keys. Should be false on
   *  Grid, Tree and ListBox.
   * @return {Object} widget
   */
  constructor ($owner, adjusted = false, arrow_keys_enabled = true) {
    super(); // This does nothing but is required before using `this`

    let $controller = document.createElement('div'),
        $content = document.createElement('div'),
        FTue = FlareTail.helpers.event;

    this.view = { $owner, $content, $controller };
    this.data = {};
    this.options = { adjusted, arrow_keys_enabled };

    $owner.style.setProperty('display', 'none', 'important'); // Prevent reflows

    for (let $child of [...$owner.children]) {
      $content.appendChild($child);
    }

    $content.className = 'scrollable-area-content';

    // On mobile, we can just use native scrollbars, so do not add a custom scrollbar and observers
    if (FlareTail.helpers.env.device.mobile) {
      $owner.appendChild($content);
      $owner.style.removeProperty('display');

      return false;
    }

    $content.appendChild(this.get_observer());

    $controller.tabIndex = -1;
    $controller.style.top = '2px';
    $controller.setAttribute('role', 'scrollbar');
    $controller.setAttribute('aria-controls', $owner.id);
    $controller.setAttribute('aria-disabled', 'true');
    $controller.setAttribute('aria-valuemin', '0');
    $controller.setAttribute('aria-valuenow', '0');

    $owner.appendChild($content);
    $owner.appendChild($controller);
    $owner.appendChild(this.get_observer());
    $owner.style.removeProperty('display');

    FTue.bind(this, $owner, ['wheel', 'scroll', 'keydown', 'overflow', 'underflow']);
    FTue.bind(this, $controller, ['mousedown', 'contextmenu', 'keydown']);

    this.set_height();
  }

  /**
   * Called whenever a mousedown event is triggered. Handle the scroll.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  onmousedown (event) {
    this.scroll_with_mouse(event);
  }

  /**
   * Called whenever a mousemove event is triggered. Handle the scroll.
   * @argument {MouseEvent} event - The mousemove event.
   * @return {undefined}
   */
  onmousemove (event) {
    this.scroll_with_mouse(event);
  }

  /**
   * Called whenever a mouseup event is triggered. Handle the scroll.
   * @argument {MouseEvent} event - The mouseup event.
   * @return {undefined}
   */
  onmouseup (event) {
    this.scroll_with_mouse(event);
  }

  /**
   * Called whenever a wheel event is triggered. Handle the scroll.
   * @argument {WheelEvent} event - The wheel event.
   * @return {undefined}
   */
  onwheel (event) {
    event.preventDefault();

    let $owner = this.view.$owner,
        top = $owner.scrollTop + event.deltaY * (event.deltaMode === event.DOM_DELTA_LINE ? 12 : 1);

    if (top < 0) {
      top = 0;
    }

    if (top > $owner.scrollTopMax) {
      top = $owner.scrollTopMax;
    }

    if ($owner.scrollTop !== top) {
      $owner.scrollTop = top;
    }
  }

  /**
   * Called whenever a scroll event is triggered. Handle the scroll.
   * @argument {UIEvent} event - The scroll event.
   * @return {undefined}
   */
  onscroll (event) {
    let $owner = this.view.$owner,
        $controller = this.view.$controller;

    // Scroll by row
    if (this.options.adjusted) {
      let rect = $owner.getBoundingClientRect(),
          $elm = document.elementFromPoint(rect.left, rect.top),
          top = 0;

      while ($elm) {
        if ($elm.matches('[role="row"], [role="option"], [role="treeitem"]')) {
          break;
        }

        $elm = $elm.parentElement;
      }

      if (!$elm) {
        return; // traversal failed
      }

      top = $owner.scrollTop < $elm.offsetTop + $elm.offsetHeight / 2 || !$elm.nextElementSibling
          ? $elm.offsetTop : $elm.nextElementSibling.offsetTop;

      $owner.scrollTop = top;
    }

    let st = $owner.scrollTop,
        ch = $owner.clientHeight,
        sh = $owner.scrollHeight,
        ctrl_height = Number.parseInt($controller.style.height),
        ctrl_adj = 0;

    // Consider scrollbar's min-height
    if (ctrl_height < 16) {
      ctrl_adj = 20 - ctrl_height;
    }

    $controller.setAttribute('aria-valuenow', st);
    $controller.style.top = `${st + 2 + Math.floor((ch - ctrl_adj) * (st / sh))}px`;
  }

  /**
   * Called whenever a keydown event is triggered. Handle the scroll.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  onkeydown (event) {
    this.scroll_with_keyboard(event);
  }

  /**
   * Called whenever an overflow event is triggered. Enable the scrollbar.
   * @argument {UIEvent} event - The overflow event.
   * @return {undefined}
   */
  onoverflow (event) {
    if (event.target === event.currentTarget) {
      this.set_height();
      this.view.$controller.setAttribute('aria-disabled', 'false');
      this.view.$controller.tabIndex = 0;
    }
  }

  /**
   * Called whenever an underflow event is triggered. Disable the scrollbar.
   * @argument {UIEvent} event - The underflow event.
   * @return {undefined}
   */
  onunderflow (event) {
    if (event.target === event.currentTarget) {
      this.view.$controller.setAttribute('aria-disabled', 'true');
      this.view.$controller.tabIndex = -1;
    }
  }

  /**
   * Scroll the target element with a mouse operation.
   * @argument {MouseEvent} event - The mousedown, mousemove or mouseup event.
   * @return {undefined}
   */
  scroll_with_mouse (event) {
    let $owner = this.view.$owner,
        FTue = FlareTail.helpers.event;

    if (event.type === 'mousedown') {
      this.data.rect = {
        st: $owner.scrollTop,
        sh: $owner.scrollHeight,
        ch: $owner.clientHeight,
        cy: event.clientY
      };

      FTue.bind(this, window, ['mousemove', 'mouseup']);
    }

    if (event.type === 'mousemove') {
      let rect = this.data.rect,
          delta = rect.st + event.clientY - rect.cy,
          top = Math.floor(delta * rect.sh / rect.ch);

      if (top < 0) {
        top = 0;
      }

      if (top > $owner.scrollTopMax) {
        top = $owner.scrollTopMax;
      }

      if ($owner.scrollTop !== top) {
        $owner.scrollTop = top;
      }
    }

    if (event.type === 'mouseup') {
      delete this.data.rect;

      FTue.unbind(this, window, ['mousemove', 'mouseup']);
    }
  }

  /**
   * Scroll the target element with a keyboard operation.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  scroll_with_keyboard (event) {
    let $owner = this.view.$owner,
        $controller = this.view.$controller,
        adjusted = this.options.adjusted,
        arrow = this.options.arrow_keys_enabled,
        key = event.key,
        ch = $owner.clientHeight;

    switch (key) {
      case 'Tab': {
        return true; // Focus management
      }

      case 'Home':
      case 'End': {
        if (!adjusted) {
          $owner.scrollTop = key === 'Home' ? 0 : $owner.scrollTopMax;
        }

        break;
      }

      case ' ': // Space
      case 'PageUp':
      case 'PageDown': {
        $owner.scrollTop += key === 'PageUp' || key === ' ' && event.shiftKey ? -ch : ch;

        break;
      }

      case 'ArrowUp':
      case 'ArrowDown': {
        if (!adjusted && (event.target === $controller || event.currentTarget === $owner && arrow)) {
          $owner.scrollTop += key === 'ArrowUp' ? -40 : 40;
        }

        break;
      }
    }

    if (event.target === $controller) {
      return FlareTail.helpers.event.ignore(event);
    }

    return true;
  }

  /**
   * Set the height of the scrollbar.
   * @argument {undefined}
   * @return {undefined}
   */
  set_height () {
    let $owner = this.view.$owner,
        $controller = this.view.$controller,
        sh = $owner.scrollHeight,
        ch = $owner.clientHeight,
        ctrl_height = Math.floor(ch * ch / sh) - 4;

    $controller.style.height = `${ctrl_height < 0 ? 0 : ctrl_height}px`;
    $controller.setAttribute('aria-valuemax', $owner.scrollTopMax);

    // Reposition the scrollbar
    this.onscroll();
  }

  /**
   * Provide an iframe that observes any scroll area changes.
   * @argument {undefined}
   * @return {HTMLElement} $iframe - Empty iframe with an observer.
   */
  get_observer () {
    let $iframe = document.createElement('iframe');

    $iframe.addEventListener('load', event => {
      let $doc = $iframe.contentDocument;

      $doc.body.style.margin = 0;
      $doc.addEventListener('MozScrolledAreaChanged', event => {
        if (event.height === 0) {
          this.view.$controller.setAttribute('aria-disabled', 'true');
          this.view.$controller.tabIndex = -1;
        }

        this.set_height();
      });
    });
    $iframe.className = 'scrollable-area-observer';
    $iframe.tabIndex = -1;
    $iframe.src = 'about:blank';

    return $iframe;
  }

  /**
   * Set an event listener on the widget.
   * @argument {*} args - The event type and handler.
   * @return {undefined}
   */
  bind (...args) {
    this.view.$controller.addEventListener(...args);
  }
}

/**
 * Implement the window abstract role.
 * @extends FlareTail.widgets.RoleType
 * @see {@link http://www.w3.org/TR/wai-aria/complete#window}
 */
FlareTail.widgets.Window = class Window extends FlareTail.widgets.RoleType {}

/**
 * Implement the dialog role.
 * @extends FlareTail.widgets.Window
 * @see {@link http://www.w3.org/TR/wai-aria/complete#dialog}
 */
FlareTail.widgets.Dialog = class Dialog extends FlareTail.widgets.Window {
  /**
   * Get a Dialog instance.
   * @constructor
   * @argument {Object} options
   *  - id (optional)
   *  - type: alert, confirm or prompt
   *  - title
   *  - message
   *  - button_accept_label (optional)
   *  - button_cancel_label (optional)
   *  - onaccept (callback function, optional)
   *  - oncancel (callback function, optional)
   *  - value (for prompt, optional)
   * @return {Object} widget
   */
  constructor (options) {
    super(); // This does nothing but is required before using `this`

    this.options = {
      id: options.id || Date.now(),
      type: options.type,
      title: options.title,
      message: options.message,
      button_accept_label: options.button_accept_label || 'OK',
      button_cancel_label: options.button_cancel_label || 'Cancel',
      onaccept: options.onaccept,
      oncancel: options.oncancel,
      value: options.value || ''
    };

    this.view = {};

    this.build();
    this.activate();
  }

  /**
   * Create a dialog.
   * @argument {undefined}
   * @return {undefined}
   */
  build () {
    let options = this.options,
        $wrapper = this.view.$wrapper = document.createElement('div'),
        $dialog = this.view.$dialog = document.createElement('aside'),
        $header = $dialog.appendChild(document.createElement('header')),
        $title,
        $message = $dialog.appendChild(document.createElement('p')),
        $input,
        $footer = $dialog.appendChild(document.createElement('footer')),
        $button = document.createElement('span'),
        $button_accept,
        $button_cancel;

    $dialog.id = `dialog-${options.id}`;
    $dialog.tabIndex = 0;
    $dialog.setAttribute('role', options.type === 'alert' ? 'alertdialog' : 'dialog');
    $dialog.setAttribute('aria-describedby', `dialog-${options.id}-message`);
    $dialog.setAttribute('aria-modal', 'true');

    if (options.title) {
      $title = $header.appendChild(document.createElement('h2'));
      $title.id = `dialog-${options.id}-title`;
      $title.textContent = options.title;
      $dialog.setAttribute('aria-labelledby', `dialog-${options.id}-title`);
    }

    $message.innerHTML = options.message;
    $message.id = `dialog-${options.id}-message`;

    if (options.type === 'prompt') {
      $input = this.view.$input = $dialog.insertBefore(document.createElement('input'), $footer);
      $input.value = options.value || '';
      $input.setAttribute('role', 'textbox');
    }

    $button.tabIndex = 0;
    $button.setAttribute('role', 'button');

    $button_accept = this.view.$button_accept = $footer.appendChild($button.cloneNode(true)),
    $button_accept.textContent = options.button_accept_label;
    $button_accept.dataset.action = 'accept';
    (new FlareTail.widgets.Button($button_accept)).bind('Pressed', event => this.hide('accept'));

    if (options.type !== 'alert') {
      $button_cancel = this.view.$button_cancel = $footer.appendChild($button.cloneNode(true)),
      $button_cancel.textContent = options.button_cancel_label;
      $button_cancel.dataset.action = 'cancel';
      (new FlareTail.widgets.Button($button_cancel)).bind('Pressed', event => this.hide('cancel'));
    }

    $wrapper.className = 'dialog-wrapper';
    $wrapper.appendChild($dialog)
  }

  /**
   * Activate the widget.
   * @argument {undefined}
   * @return {undefined}
   */
  activate () {
    // Add event listeners
    FlareTail.helpers.event.bind(this, this.view.$dialog, ['keypress']);
  }

  /**
   * Called whenever a keypress event is triggered. Handle the keyboard shortcuts.
   * @argument {KeyboardEvent} event - The keypress event.
   * @return {undefined}
   */
  onkeypress (event) {
    if (event.key === 'Enter') {
      this.hide('accept');
    }

    if (event.key === 'Escape') {
      this.hide('cancel');
    }

    event.stopPropagation();
  }

  /**
   * Show the dialog.
   * @argument {undefined}
   * @return {undefined}
   */
  show () {
    this.focus_map = new Map();
    this.focus_origial = document.activeElement;

    // Prevent elements outside the dialog being focused
    for (let $element of document.querySelectorAll(':link, [tabindex]')) {
      this.focus_map.set($element, $element.getAttribute('tabindex'));
      $element.tabIndex = -1;
    }

    document.body.appendChild(this.view.$wrapper);
    this.view.$dialog.focus();
  }

  /**
   * Hide the dialog.
   * @argument {String} action - User-selected action: accept or cancel.
   * @return {undefined}
   */
  hide (action) {
    for (let [$element, tabindex] of this.focus_map) {
      tabindex ? $element.tabIndex = tabindex : $element.removeAttribute('tabindex');
    }

    this.focus_map.clear();
    this.focus_origial.focus();
    this.view.$wrapper.remove();

    if (action === 'accept' && typeof this.options.onaccept === 'function') {
      this.options.onaccept(this.options.type === 'prompt' ? this.view.$input.value : null);
    }

    if (action === 'cancel' && typeof this.options.oncancel === 'function') {
      this.options.oncancel();
    }
  }
}

/**
 * Implement the alertdialog role.
 * @extends FlareTail.widgets.Dialog
 * @see {@link http://www.w3.org/TR/wai-aria/complete#alertdialog}
 */
FlareTail.widgets.AlertDialog = class AlertDialog extends FlareTail.widgets.Dialog {}

/**
 * Implement the separator role.
 * @extends FlareTail.widgets.Structure
 * @see {@link http://www.w3.org/TR/wai-aria/complete#separator}
 */
FlareTail.widgets.Separator = class Separator extends FlareTail.widgets.Structure {}

/**
 * Implement the splitter custom widget.
 * @extends FlareTail.widgets.Separator
 */
FlareTail.widgets.Splitter = class Splitter extends FlareTail.widgets.Separator {
  /**
   * Get a Splitter instance.
   * @constructor
   * @argument {HTMLElement} $splitter - <div class="splitter" role="separator">
   * @return {Object} widget
   */
  constructor ($splitter) {
    super(); // This does nothing but is required before using `this`

    this.view = {
      $splitter,
      $outer: $splitter.parentElement,
      controls: {}
    };

    let style = ($element, prop) => Number.parseInt(FlareTail.helpers.style.get($element, prop)),
        $outer = this.view.$outer,
        orientation = $splitter.getAttribute('aria-orientation') || 'horizontal',
        outer_bounds = $outer.getBoundingClientRect(),
        outer_size = orientation === 'horizontal' ? outer_bounds.height : outer_bounds.width,
        flex = $splitter.dataset.flex !== 'false',
        position = style($splitter, orientation === 'horizontal' ? 'top' : 'left');

    this.data = new Proxy({
      outer: new Proxy({
        id: $outer.id,
        top: outer_bounds.top,
        left: outer_bounds.left,
      }, {
        get: (obj, prop) => {
          if (prop === 'size') {
            // The dimension of the element can be changed when the window is resized.
            // Return the current width or height
            let rect = $outer.getBoundingClientRect();

            return this.data.orientation === 'horizontal' ? rect.height : rect.width;
          }

          return obj[prop];
        }
      }),
      orientation,
      flex,
      position: flex ? `${(position / outer_size * 100).toFixed(2)}%` : `${position}px`,
      controls: {},
      grabbed: false
    }, {
      set: (obj, prop, value) => {
        if (prop === 'orientation') {
          this.data.position = 'default';
          $splitter.setAttribute('aria-orientation', value);
        }

        if (prop === 'position') {
          let outer = this.data.outer,
              before = this.data.controls.before,
              after = this.data.controls.after,
              $before = this.view.controls.$before,
              $after = this.view.controls.$after;

          if (Number.isNaN(value) && value.match(/^(\d+)px$/)) {
            value = Number.parseInt(value);
          }

          if (value === 'default') {
            value = null; // Reset the position
          } else if (String(value).match(/^\d+\%$/)) {
            // Keep the value
          } else if (value <= 0) {
            if (Number.parseInt(obj.position) === 0) {
              return;
            }

            value = !before.min || before.collapsible ? 0 : before.min;
          } else if (value >= outer.size || value === '100%') {
            if (obj.position === '100%') {
              return;
            }

            value = !after.min || after.collapsible ? '100%' : outer.size - after.min;
          } else if (before.min && value < before.min) {
            // Reached min-height of the before element
            if (!before.expanded) {
              return;
            }

            if (before.collapsible) {
              before.expanded = false;
              value = 0;
            } else {
              value = before.min;
            }
          } else if (!before.expanded) {
            before.expanded = true;
            value = before.min;
          } else if (before.max && value > before.max) {
            value = before.max;
          } else if (after.min && outer.size - value < after.min) {
            // Reached min-height of the after element
            if (!after.expanded) {
              return;
            }

            if (after.collapsible) {
              after.expanded = false;
              value = '100%';
            } else {
              value = outer.size - after.min;
            }
          } else if (!after.expanded) {
            after.expanded = true;
            value = outer.size - after.min;
          } else if (after.max && outer.size - value > after.max) {
            value = outer.size - after.max;
          }

          if (value) {
            if (String(value).match(/^\d+$/)) {
              value = this.data.flex ? `${(value / outer.size * 100).toFixed(2)}%` : `${value}px`;
            }

            $before.style.setProperty(this.data.orientation === 'horizontal' ? 'height' : 'width', value);
            FlareTail.helpers.event.trigger($splitter, 'Resized', { detail: { position: value }});
          }
        }

        obj[prop] = value;

        return true;
      }
    });

    // Add event listeners
    FlareTail.helpers.event.bind(this, $splitter, ['mousedown', 'contextmenu', 'keydown']);

    for (let [i, id] of $splitter.getAttribute('aria-controls').split(/\s+/).entries()) {
      let $target = document.getElementById(id),
          position = i === 0 ? 'before' : 'after';

      this.data.controls[position] = new Proxy({
        id,
        collapsible: $target.hasAttribute('aria-expanded'),
        expanded: $target.getAttribute('aria-expanded') !== 'false'
      },
      {
        get: (obj, prop) => {
          if (prop === 'min' || prop === 'max') {
            let horizontal = this.data.orientation === 'horizontal';

            return style($target, `${prop}-${horizontal ? 'height' : 'width'}`);
          }

          return obj[prop];
        },
        set: (obj, prop, value) => {
          if (prop === 'expanded') {
            document.getElementById(obj.id).setAttribute('aria-expanded', value);
          }

          obj[prop] = value;

          return true;
        }
      });

      this.view.controls[`$${position}`] = $target;
    };
  }

  /**
   * Called whenever a mousedown event is triggered. Grab the splitter.
   * @argument {MouseEvent} event - The mousedown event.
   * @return {undefined}
   */
  onmousedown (event) {
    if (event.buttons > 1) {
      event.preventDefault();

      return;
    }

    this.view.$splitter.setAttribute('aria-grabbed', 'true');
    this.data.grabbed = true;

    this.view.$outer.dataset.splitter = this.data.orientation;

    // Add event listeners
    FlareTail.helpers.event.bind(this, window, ['mousemove', 'mouseup']);
  }

  /**
   * Called whenever a mousemove event is triggered. Move the splitter.
   * @argument {MouseEvent} event - The mousemove event.
   * @return {undefined}
   */
  onmousemove (event) {
    if (!this.data.grabbed) {
      return;
    }

    this.data.position = this.data.orientation === 'horizontal'
                       ? event.clientY - this.data.outer.top : event.clientX - this.data.outer.left;
  }

  /**
   * Called whenever a mouseup event is triggered. Release the splitter.
   * @argument {MouseEvent} event - The mouseup event.
   * @return {undefined}
   */
  onmouseup (event) {
    if (!this.data.grabbed) {
      return;
    }

    this.data.grabbed = false;
    this.view.$splitter.setAttribute('aria-grabbed', 'false');

    // Cleanup
    FlareTail.helpers.event.unbind(this, document.body, ['mousemove', 'mouseup']);

    delete this.view.$outer.dataset.splitter;
  }

  /**
   * Called whenever a keydown event is triggered. Move the splitter if possible.
   * @argument {KeyboardEvent} event - The keydown event.
   * @return {undefined}
   */
  onkeydown (event) {
    let value = null,
        position = this.data.position,
        outer = this.data.outer,
        before = this.data.controls.before,
        after = this.data.controls.after;

    switch (event.key) {
      case 'Home': {
        value = !before.min || before.collapsible ? 0 : before.min;

        break;
      }

      case 'End': {
        value = !after.min || after.collapsible ? '100%' : outer.size - after.min;

        break;
      }

      case 'PageUp':
      case 'ArrowUp':
      case 'ArrowLeft': {
        let delta = event.key === 'PageUp' || event.shiftKey ? 50 : 10;

        if (position === '100%') {
          value = outer.size - (this.data.controls.after.min || delta);
        } else if (Number.parseInt(position) !== 0) {
          value = (this.data.flex ? outer.size * Number.parseFloat(position) / 100 : Number.parseInt(position)) - delta;
        }

        break;
      }

      case 'PageDown':
      case 'ArrowDown':
      case 'ArrowRight': {
        let delta = event.key === 'PageDown' || event.shiftKey ? 50 : 10;

        if (Number.parseInt(position) === 0) {
          value = this.data.controls.before.min || delta;
        } else if (position !== '100%') {
          value = (this.data.flex ? outer.size * Number.parseFloat(position) / 100 : Number.parseInt(position)) + delta;
        }

        break;
      }
    }

    if (value !== null) {
      this.data.position = value;
    }
  }

  /**
   * Set an event listener on the widget.
   * @argument {*} args - The event type and handler.
   * @return {undefined}
   */
  bind (...args) {
    this.view.$splitter.addEventListener(...args);
  }
}

/**
 * Implement the region role.
 * @extends FlareTail.widgets.Section
 * @see {@link http://www.w3.org/TR/wai-aria/complete#region}
 */
FlareTail.widgets.Region = class Region extends FlareTail.widgets.Section {}

/**
 * Implement the status role.
 * @extends FlareTail.widgets.Region
 * @see {@link http://www.w3.org/TR/wai-aria/complete#status}
 */
FlareTail.widgets.Status = class Status extends FlareTail.widgets.Region {}

/**
 * Implement the landmark abstract role.
 * @extends FlareTail.widgets.Region
 * @see {@link http://www.w3.org/TR/wai-aria/complete#landmark}
 */
FlareTail.widgets.Landmark = class Landmark extends FlareTail.widgets.Region {}

/**
 * Implement the application role.
 * @extends FlareTail.widgets.Landmark
 * @see {@link http://www.w3.org/TR/wai-aria/complete#application}
 */
FlareTail.widgets.Application = class Application extends FlareTail.widgets.Landmark {}

/**
 * Implement the tooltip role.
 * @extends FlareTail.widgets.Section
 * @see {@link http://www.w3.org/TR/wai-aria/complete#tooltip}
 */
FlareTail.widgets.Tooltip = class Tooltip extends FlareTail.widgets.Section {}

/**
 * Implement the group role.
 * @extends FlareTail.widgets.Section
 * @see {@link http://www.w3.org/TR/wai-aria/complete#group}
 */
FlareTail.widgets.Group = class Group extends FlareTail.widgets.Section {}

/**
 * Implement the toolbar role.
 * @extends FlareTail.widgets.Group
 * @see {@link http://www.w3.org/TR/wai-aria/complete#toolbar}
 */
FlareTail.widgets.ToolBar = class ToolBar extends FlareTail.widgets.Group {}
