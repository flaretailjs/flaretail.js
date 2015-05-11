/**
 * FlareTail Application Widgets
 * Copyright © 2015 Kohei Yoshino. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * This is an implementation of the WAI-ARIA spec. See http://www.w3.org/TR/wai-aria/complete#roles_categorization for
 * the meaning and inheritance of each role. See also https://developer.mozilla.org/Mozilla/Tech/XUL/XUL_Reference for
 * an implementation reference.
 *
 *  - RoleType
 *    - Structure (abstract role)
 *      - Separator
 *        - Splitter (custom widget)
 *      - Section (abstract role)
 *        - Tooltip
 *        - Region
 *    - Widget (abstract role)
 *      - Command (abstract role)
 *        - MenuItem
 *        - Button
 *      - Row
 *      - GridCell
 *        - ColumnHeader
 *        - RowHeader
 *      - Composite (abstract role)
 *        - Grid
 *        - Select (abstract role)
 *          - ComboBox
 *          - ListBox
 *          - Menu
 *            - MenuBar
 *          - RadioGroup
 *          - Tree
 *        - TabList
 *      - Tab
 *      - Input (abstract role)
 *        - Option
 *          - TreeItem
 *        - TextBox
 *        - CheckBox
 *          - Radio
 *          - MenuItemCheckBox
 *            - MenuItemRadio
 *        - ScrollBar
 *    - Window (abstract role)
 *      - Dialog
 *        - AlertDialog
 */

'use strict';

let FlareTail = FlareTail || {};

FlareTail.widget = {};

/* ------------------------------------------------------------------------------------------------------------------
 * RoleType (top level abstract role)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.RoleType = function RoleType () {};

FlareTail.widget.RoleType.prototype = Object.create({}, {
  'disabled': {
    'enumerable': true,
    'get': () => this.$node.matches('[aria-disabled="true"]'),
    'set': disabled => this.$node.setAttribute('aria-disabled', disabled),
  },
});

// Catch-all event handler
FlareTail.widget.RoleType.prototype.handleEvent = function (event) {
  (this[`on${event.type}_extend`] || this[`on${event.type}`]).call(this, event);
};

FlareTail.widget.RoleType.prototype.oncontextmenu = function (event) {
  // Disable browser's context menu
  return FlareTail.util.event.ignore(event);
};

FlareTail.widget.RoleType.prototype.on = function (type, detail = {}, $target = this.$node) {
  $target.addEventListener(...args);
};

FlareTail.widget.RoleType.prototype.trigger = function (type, detail = {}, $target = this.$node) {
  FlareTail.util.event.trigger($target, type, { detail });
};

/* ------------------------------------------------------------------------------------------------------------------
 * Structure (abstract role) extends RoleType
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Structure = function Structure () {};
FlareTail.widget.Structure.prototype = Object.create(FlareTail.widget.RoleType.prototype);
FlareTail.widget.Structure.prototype.constructor = FlareTail.widget.Structure;

/* ------------------------------------------------------------------------------------------------------------------
 * Section (abstract role) extends Structure
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Section = function Section () {};
FlareTail.widget.Section.prototype = Object.create(FlareTail.widget.Structure.prototype);
FlareTail.widget.Section.prototype.constructor = FlareTail.widget.Section;

/* ------------------------------------------------------------------------------------------------------------------
 * Widget (abstract role) extends RoleType
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Widget = function Widget () {};
FlareTail.widget.Widget.prototype = Object.create(FlareTail.widget.RoleType.prototype);
FlareTail.widget.Widget.prototype.constructor = FlareTail.widget.Widget;

/* ------------------------------------------------------------------------------------------------------------------
 * Command (abstract role) extends Widget
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Command = function Command () {};
FlareTail.widget.Command.prototype = Object.create(FlareTail.widget.Widget.prototype);
FlareTail.widget.Command.prototype.constructor = FlareTail.widget.Command;

/* ------------------------------------------------------------------------------------------------------------------
 * Row extends Widget
 *
 * [argument] $node (Element) <tr role="row">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Row = function Row ($node = undefined) {
  if (!$node) {
    $node = document.createElement('tr');
    $node.tabIndex = -1;
    $node.draggable = false;
    $node.setAttribute('role', 'row');
    $node.setAttribute('aria-selected', 'false');
  }

  this.$node = $node;
  this.child_class = FlareTail.widget.GridCell;
};

FlareTail.widget.Row.prototype = Object.create(FlareTail.widget.Widget.prototype);
FlareTail.widget.Row.prototype.constructor = FlareTail.widget.Row;

FlareTail.widget.Row.prototype.add_cell = function (header = false) {
  let cell = header ? new FlareTail.widget.RowHeader() : new FlareTail.widget.GridCell();

  this.members.push(cell);
  this.$node.appendChild(cell.$node);

  return cell;
};

/* ------------------------------------------------------------------------------------------------------------------
 * GridCell extends Widget
 *
 * [argument] $node (Element) <td role="gridcell">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.GridCell = function GridCell ($node = undefined) {
  if (!$node) {
    $node = document.createElement('td');
    $node.setAttribute('role', 'gridcell');
  }

  this.$node = $node;
};

FlareTail.widget.GridCell.prototype = Object.create(FlareTail.widget.Widget.prototype);
FlareTail.widget.GridCell.prototype.constructor = FlareTail.widget.GridCell;

/* ------------------------------------------------------------------------------------------------------------------
 * ColumnHeader extends GridCell
 *
 * [argument] $node (Element) <th scope="col" role="columnheader">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.ColumnHeader = function ColumnHeader ($node = undefined) {
  if (!$node) {
    $node = document.createElement('th');
    $node.scope = 'col';
    $node.setAttribute('role', 'columnheader');
  }

  this.$node = $node;
};

FlareTail.widget.ColumnHeader.prototype = Object.create(FlareTail.widget.ColumnHeader.prototype);
FlareTail.widget.ColumnHeader.prototype.constructor = FlareTail.widget.ColumnHeader;

/* ------------------------------------------------------------------------------------------------------------------
 * RowHeader extends GridCell
 *
 * [argument] $node (Element) <th scope="row" role="rowheader">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.RowHeader = function RowHeader ($node = undefined) {
  if (!$node) {
    $node = document.createElement('th');
    $node.scope = 'row';
    $node.setAttribute('role', 'rowheader');
  }

  this.$node = $node;
};

FlareTail.widget.RowHeader.prototype = Object.create(FlareTail.widget.RowHeader.prototype);
FlareTail.widget.RowHeader.prototype.constructor = FlareTail.widget.RowHeader;

/* ------------------------------------------------------------------------------------------------------------------
 * MenuItem extends Command
 *
 * [argument] $node (Element) <li role="menuitem">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.MenuItem = function MenuItem ($node) {
  this.$node = $node;
};

FlareTail.widget.MenuItem.prototype = Object.create(FlareTail.widget.Command.prototype);
FlareTail.widget.MenuItem.prototype.constructor = FlareTail.widget.MenuItem;

/* ------------------------------------------------------------------------------------------------------------------
 * Button extends Command
 *
 * [argument] $node (Element) <span role="button">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Button = function Button ($node = undefined) {
  if (!$node) {
    $node = document.createElement('span');
    $node.tabIndex = 0;
    $node.setAttribute('role', 'button');
  }

  this.$node = $node;
  this.togglable = this.$node.hasAttribute('aria-pressed');
  this.activate();
};

FlareTail.widget.Button.prototype = Object.create(FlareTail.widget.Command.prototype, {
  'pressed': {
    'enumerable': true,
    'get': () => this.$node.matches('[aria-pressed="true"]'),
    'set': pressed => this.$node.setAttribute('aria-pressed', pressed),
  },
});

FlareTail.widget.Button.prototype.constructor = FlareTail.widget.Button;

FlareTail.widget.Button.prototype.onclick = function (event) {
  FlareTail.util.event.ignore(event);

  if (this.disabled) {
    return;
  }

  if (this.togglable) {
    this.pressed = !this.pressed;
  }

  this.trigger('Pressed', { 'pressed': this.pressed });
};

FlareTail.widget.Button.prototype.onkeydown = function (event) {
  let key = event.key;

  if (key === ' ' || key === 'Enter') { // Space or Enter
    this.onclick(event);
  }

  // Support menu button
  if (this.menu) {
    if (key === 'ArrowDown') {
      this.menu.selected = this.menu.focused = this.menu.members.first;
    }

    if (key === 'ArrowUp') {
      this.menu.selected = this.menu.focused = this.menu.members.last;
    }

    if (key === 'Escape') {
      this.menu.close();
      this.$node.focus();
      this.pressed = false;
    }
  }
};

FlareTail.widget.Button.prototype.activate = function () {
  FlareTail.util.event.bind(this, this.$node, ['click', 'keydown']);

  if (!this.$node.matches('[aria-haspopup="true"]')) {
    return;
  }

  this.$popup = document.getElementById(this.$node.getAttribute('aria-owns'));

  // Implement menu button
  // http://www.w3.org/TR/wai-aria-practices/#menubutton
  if (this.$popup.matches('[role="menu"]')) {
    this.$menu = this.$popup;
    this.menu = new FlareTail.widget.Menu(this.$menu);
    this.menu.bind('MenuItemSelected', event => this.$node.focus());

    this.on('Pressed', event => {
      if (event.detail.pressed) {
        this.menu.open();
      } else {
        this.menu.close();
        this.$node.focus();
      }
    });
  } else {
    this.on('Pressed', event => {
      this.$popup.setAttribute('aria-expanded', event.detail.pressed);

      if (event.detail.pressed) {
        this.$popup.focus();
      } else {
        this.$node.focus();
      }
    });
  }
};

/* ------------------------------------------------------------------------------------------------------------------
 * Composite (abstract role) extends Widget
 * Subclass roles: Grid, Select, TabList
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Composite = function Composite () {};
FlareTail.widget.Composite.prototype = Object.create(FlareTail.widget.Widget.prototype);
FlareTail.widget.Composite.prototype.constructor = FlareTail.widget.Composite;

FlareTail.widget.Composite.prototype.onfocus = function (event) {
  if (this.members.has(event.target) && event.target.id) {
    this.$node.setAttribute('aria-activedescendant', event.target.id);
  } else {
    this.$node.removeAttribute('aria-activedescendant');
  }
};

FlareTail.widget.Composite.prototype.onblur = function (event) {
  this.$node.removeAttribute('aria-activedescendant');
  FlareTail.util.event.ignore(event);
};

FlareTail.widget.Composite.prototype.onmousedown = function (event) {
  if (!this.members.has(event.target) || event.buttons > 1) {
    return;
  }

  this.select_with_mouse(event);
};

FlareTail.widget.Composite.prototype.onkeydown = function (event) {
  this.select_with_keyboard(event);
};

FlareTail.widget.Composite.prototype.activate = function (rebuild) {
  let FTue = FlareTail.util.event,
      not_selector = ':not([aria-disabled="true"]):not([aria-hidden="true"])',
      get_elements = selector = this.$node.querySelectorAll(selector);

  if (!this.$node) {
    throw new Error('The container element is not defined');
  }

  this.selected_attr = this.selected_attr || 'aria-selected';
  this.multiselectable = this.$node.matches('[aria-multiselectable="true"]');

  Object.defineProperties(this, {
    // Public properties
    'members': {
      'enumerable': true,
      'get': () => this._members, // Array-like Object
      'set': newval => this._members_setter(newval),
    },
    'selected': {
      'enumerable': true,
      'get': () => this._selected, // Array-like Object
      'set': newval => this._selected_setter(newval), // Array or Element
    },
    'focused': {
      'enumerable': true,
      'get': () => this._focused, // Object (not Element)
      'set': newval => this._focused_setter(newval),
    },
    // Local caches
    '_members': {
      'value': this.get_items(get_elements(`${this.item_selector}${not_selector}`)),
    },
    '_selected': {
      'value': this._get_items(get_elements(`${this.item_selector}${not_selector}[${this.selected_attr}="true"]`)),
    },
    '_focused': {
      'value': undefined,
    },
  });

  // Focus Management
  for (let [i, item] of this.members.entries()) {
    item.$node.tabIndex = i === 0 ? 0 : -1;
  }

  this.$node.removeAttribute('tabindex');

  if (rebuild) {
    return;
  }

  // Update the members when the aria-disabled or aria-hidden attribute is changed
  (new MutationObserver(mutations => {
    if (mutations[0].target.matches(this.item_selector)) {
      this.members.update();
    }
  })).observe(this.$node, {
    'subtree': true,
    'childList': true,
    'attributes': true,
    'attributeFilter': ['aria-disabled', 'aria-hidden']
  });

  // Add event listeners
  FTue.bind(this, this.$node, [
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

  FTue.bind(this, this.$node, [
    // FocusEvent
    'focus', 'blur',
  ], true); // Set use_capture true to catch events on descendants
};

FlareTail.widget.Composite.prototype._members_setter = function (nodelist) {
  this._members = this.get_items(nodelist);
};

FlareTail.widget.Composite.prototype._selected_setter = function (newval) {
  let oldval = this._selected,
      attr = this.selected_attr;

  for (let item of oldval) {
    item.$node.setAttribute(attr, 'false');
  }

  if (newval) {
    newval = Array.isArray(newval) ? newval : [newval];

    for (let item of newval) {
      item.$node.setAttribute(attr, 'true');
    }
  } else {
    newval = [];
  }

  this._selected = newval;

  this.trigger('Selected', {
    'previous': oldval,
    'items': newval,
    'ids': [for (item of newval) item.$node.dataset.id || item.$node.id],
    'labels': [for (item of newval) item.$node.textContent]
  });
};

FlareTail.widget.Composite.prototype._focused_setter = function (newval) {
  let oldval = this._focused;

  if (oldval) {
    oldval.$node.tabIndex = -1;
  }

  if (newval) {
    newval.$node.tabIndex = 0;
    newval.$node.focus();
    this._focused = newval;
  }

  this.trigger('FocusUpdated', {
    '$old': oldval ? oldval.$node : undefined,
    '$new': newval ? newval.$node : undefined,
  });
};

FlareTail.widget.Composite.prototype._get_instance = function ($node) {
  let role = $node.getAttribute('role');

  if (!role) {
    throw new Error(`The role is not defined on the element.`);
  }

  let namespace = {
    'tab': 'Tab', // Parent: TabList
    'option': 'Option', // Parent: ListBox
    'treeitem': 'TreeItem', // Parent: Tree
    'radio': 'RadioGroup', // Parent: RadioGroup
    'row': 'Row', // Parent: Grid
    'columnheader': 'ColumnHeader', // Parent: Row
    'rowheader': 'RowHeader', // Parent: Row
    'gridcell': 'GridCell', // Parent: Row
    'menuitem': 'MenuItem', // Parent: Menu, MenuBar
    'menuitemcheckbox': 'MenuItemCheckBox', // Parent: Menu, MenuBar
    'menuitemradio': 'MenuItemRadio', // Parent: Menu, MenuBar
  }[role];

  if (!namespace) {
    throw new Error(`The ${role} role is not supported.`);
  }

  return new FlareTail.widget[namespace]($node);
};

FlareTail.widget.Composite.prototype._get_items = function (nodelist) {
  let items = Object.create(Array.prototype);

  // Extend Array.prototype
  Object.defineProperties(items, {
    // Properties
    'first': { 'get': () => items[0] },
    'last': { 'get': () => items[items.length - 1] },
    // Methods
    'has': { 'value': $node => !!items.find($node) },
    'find': { 'value': $node => Array.prototype.find.call(items, instance => instance.$node === $node) },
    'indexOf': { 'value': $node => Array.prototype.findIndex.call(items, instance => instance.$node === $node) },
    'filter': { 'value': selector => Array.prototype.filter.call(items, instance => instance.$node.matches(selector)) },
    'insert': { 'value': (index, item) => {
      this.$node.insertBefore(item.$option, index > -1 ? items[index].$node : null);
      items.splice(index, 0, item);
    }},
    'remove': { 'value': (index) => {
      items[index].$node.remove();
      items.splice(index, 1);
      // TODO: update selection
    }},
    'update': { 'value': nodelist => {
      items.length = 0; // Clear the Array
      items.push(...[for ($node of nodelist) this._get_instance($node)]);
      // TODO: update selection
    }},
  });

  items.update(nodelist);

  return items;
};

FlareTail.widget.Composite.prototype.assign_key_bindings = function (map) {
  FlareTail.util.kbd.assign(this.$node, map);
};

FlareTail.widget.Composite.prototype.select_with_mouse = function (event) {
  let $target = event.target,
      selected = [...this.selected],
      multi = this.multiselectable;

  if (event.shiftKey && multi) {
    let start = this.members.indexOf(selected.first),
        end = this.members.indexOf($target);

    selected = start < end ? this.members.slice(start, end + 1) : this.members.slice(end, start + 1).reverse();
  } else if (event.ctrlKey || event.metaKey) {
    if (multi && !selected.has($target)) {
      // Add the item to selection
      selected.push($target);
    } else if (selected.has($target)) {
      // Remove the item from selection
      selected.splice(selected.indexOf($target), 1);
    }
  } else {
    selected = [$target];
  }

  this.selected = selected;
  this.focused = selected.last;
};

FlareTail.widget.Composite.prototype.select_with_keyboard = function (event) {
  let key = event.key;

  // Focus shift with tab key
  if (key === 'Tab') {
    return true;
  }

  // Do nothing if Alt key is pressed
  if (event.altKey) {
    return FlareTail.util.event.ignore(event);
  }

  let selected = [...this.selected], // Clone the array
      selected_idx = this.members.indexOf(selected.first),
      focused_idx = this.members.indexOf(this.focused),
      ctrl = event.ctrlKey || event.metaKey,
      cycle = this.focus_cycling,
      multi = this.multiselectable,
      expanding = multi && event.shiftKey;

  switch (key) {
    case ' ': { // Space
      if (ctrl) {
        break; // Move focus only
      }

      if (!multi) {
        this.selected = this.focused;

        break;
      }

      if (!selected.has(this.focused)) {
        // Add item
        selected.push(this.focused);
        this.selected = selected;
      } else {
        // Remove item
        selected.splice(selected.indexOf(this.focused), 1);
        this.selected = selected;
      }

      break;
    }

    // TODO: The behavior with Page Up/Down should be different

    case 'Home':
    case 'PageUp': {
      this.focused = this.members.first;

      if (ctrl) {
        break; // Move focus only
      }

      if (!expanding) {
        this.selected = this.members.first;

        break;
      }

      this.selected = this.members.slice(0, selected_idx + 1).reverse();

      break;
    }

    case 'End':
    case 'PageDown': {
      this.focused = this.members.last;

      if (ctrl) {
        break; // Move focus only
      }

      if (!expanding) {
        this.selected = this.members.last;

        break;
      }

      this.selected = this.members.slice(selected_idx);

      break;
    }

    case 'ArrowUp':
    case 'ArrowLeft': {
      if (focused_idx > 0) {
        this.focused = this.members[focused_idx - 1];
      } else if (cycle) {
        this.focused = this.members.last;
      }

      if (ctrl) {
        break; // Move focus only
      }

      if (!expanding) {
        this.selected = this.focused;

        break;
      }

      if (!selected.has(this.focused)) {
        // Create new range
        this.selected = this.members.slice(focused_idx - 1, focused_idx + 1).reverse();
      } else if (!selected.has(this.members[focused_idx - 1])) {
        // Expand range
        selected.push(this.focused);
        this.selected = selected;
      } else {
        // Reduce range
        selected.pop();
        this.selected = selected;
      }

      break;
    }

    case 'ArrowDown':
    case 'ArrowRight': {
      if (focused_idx < this.members.length - 1) {
        this.focused = this.members[focused_idx + 1];
      } else if (cycle) {
        this.focused = this.members.first;
      }

      if (ctrl) {
        break; // Move focus only
      }

      if (!expanding) {
        this.selected = this.focused;

        break;
      }

      if (!selected.has(this.focused)) {
        // Create new range
        this.selected = this.members.slice(focused_idx, focused_idx + 2);
      } else if (!selected.has(this.members[focused_idx + 1])) {
        // Expand range
        selected.push(this.focused);
        this.selected = selected;
      } else {
        // Reduce range
        selected.pop();
        this.selected = selected;
      }

      break;
    }

    default: {
      // Select All
      if (multi && ctrl && key.toUpperCase() === 'A') {
        this.selected = this.members;
        this.focused = this.members.first;

        break;
      }

      if (ctrl || !this.search_enabled || !key.match(/^\S$/)) {
        break;
      }

      // Find As You Type: Incremental Search for simple list like ListBox or Tree
      let input = key,
          char = this.search_key || '';

      char = char === input ? input : char + input;

      let pattern = new RegExp(`^${char}`, 'i');

      let get_label = $node => {
        let $node;

        if ($node.hasAttribute('aria-labelledby')) {
          $node = document.getElementById($node.getAttribute('aria-labelledby'));

          if ($node) {
            return $node.textContent;
          }
        }

        $node = $node.querySelector('label');

        if ($node) {
          return $node.textContent;
        }

        return $node.textContent;
      };

      for (let i = focused_idx + 1; ; i++) {
        if (this.members.length > 1 && i === this.members.length) {
          i = 0; // Continue from top
        }

        if (i === focused_idx) {
          break; // No match
        }

        let item = this.members[i];

        if (!get_label(item.$node).match(pattern)) {
          continue;
        }

        this.focused = item;

        if (!expanding) {
          this.selected = item;

          break;
        }

        let start = focused_idx,
            end = i;

        this.selected = start < end ? this.members.slice(start, end + 1)
                                    : this.members.slice(end, start + 1).reverse();
      }

      // Remember the searched character(s) for later
      this.search_key = char;

      // Forget the character(s) after 1.5s
      window.setTimeout(() => delete this.search_key, 1500);
    }
  }

  return FlareTail.util.event.ignore(event);
};

/* ------------------------------------------------------------------------------------------------------------------
 * Grid extends Composite
 *
 * [argument] $node (Element) <table role="grid">
 * [argument] data (Object, optional) data including columns, rows and order
 * [argument] options (Object, optional)
 *                  - date
 *                  - sortable
 *                  - reorderable
 *                  - sort_conditions
 * [attributes] on the grid element:
 *                  - aria-multiselectable: the default is true
 *                  - aria-readonly: the default is false
 *              on the columnheader elements:
 *                  - draggable: if false, the row cannot be reordered
 *                  - data-key: true/false, whether the key column or not
 *                  - data-type: string (default), integer or boolean
 *              on the row elements:
 *                  - aria-selected: if set, the grid will be like a thread pane in an email client
 *              on the gridcell elements:
 *                  - aria-selected: if set, the grid will be like a spreadsheet application
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Grid = function Grid ($node, data = undefined, options = {}) {
  this.$node = $node;

  // What can be selected on the grid
  let dataset = this.$node.dataset,
      role = data ? 'row' : this.$node.querySelector('.grid-body [role="row"]')
                                      .hasAttribute('aria-selected') ? 'row' : 'gridcell';

  // If the role is gridcell, the navigation management should be different
  if (role === 'gridcell') {
    throw new Error('Unimplemented role: gridcell');
  }

  this.child_class = FlareTail.widget.Row;
  this.date_options = options.date;
  this.sortable = !!dataset.sortable || !!options.sortable;
  this.reorderable = !!dataset.reorderable || !!options.reorderable;
  this.sort_conditions = new Proxy(options.sort_conditions, { 'set': this.sort.bind(this) });

  if (data) {
    this.data = data;
    this.item_selector = `.grid-body [role="${role}"]`;
    // Build table from the given data
    this.data.columns = data.columns;
    this.data.rows = data.rows;
    this.build_header();
    this.build_body();
  } else {
    this.$header = this.$node.querySelector('.grid-header');
    this.$body = this.$node.querySelector('.grid-body');
    this.data = { 'columns': [], 'rows': [] };
    this.item_selector = `.grid-body [role="${role}"]`;
    // Retrieve data from the static table
    this.get_data();
  }

  Object.defineProperties(this, {
    'adjust_scrollbar': {
      'enumerable': true,
      'set' adjusted => this.scrollbar.adjusted = adjusted,
    },
  });

  // Columnpicker
  this.init_columnpicker();

  this.activate();
  this.activate_extend();
};

FlareTail.widget.Grid.prototype = Object.create(FlareTail.widget.Composite.prototype);
FlareTail.widget.Grid.prototype.constructor = FlareTail.widget.Grid;

FlareTail.widget.Grid.prototype.activate_extend = function () {
  this.on('Selected', event => {
    // Current selection
    for (let item of event.detail.previous) {
      item.$element.draggable = false;
      item.$element.removeAttribute('aria-grabbed');
      item.$element.setAttribute('aria-selected', 'false');
    }

    // New selection
    for (let item of event.detail.items) {
      item.$element.draggable = true;
      item.$element.setAttribute('aria-grabbed', 'false');
      item.$element.setAttribute('aria-selected', 'true');
    }
  });

  this.activate_columns();
  this.activate_rows();
};

FlareTail.widget.Grid.prototype.activate_columns = function () {
  let columns = this.data.columns = new Proxy(this.data.columns, {
    // Default behavior, or find column by id
    'get': (obj, prop) => prop in obj ? obj[prop] : [for (col of obj) if (col.id === prop) col][0]
  });

  // Handler to show/hide column
  let handler = {
    'get': (obj, prop) => {
      let value;

      switch (prop) {
        case 'index': {
          value = obj.$node.cellIndex;

          break;
        }

        case 'width': {
          value = Number.parseInt(FlareTail.util.style.get(obj.$node, 'width'));

          break;
        }

        case 'left': {
          value = obj.$node.offsetLeft;

          break;
        }

        default: {
          value = obj[prop];
        }
      }

      return value;
    },
    'set': (obj, prop, value) => {
      switch (prop) {
        case 'hidden': {
          // Fire an event
          this.trigger('ColumnModified', { columns });

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
};

FlareTail.widget.Grid.prototype.activate_rows = function () {
  let handler = {
    'set': (obj, prop, value) => {
      // Reflect Data change into View
      let row = [for (row of this.data.rows) if (row.data.id === obj.id) row][0],
          $elm = row.$node.querySelector(`[data-id="${CSS.escape(prop)}"] > *`);

      this.data.columns[prop].type === 'boolean' ? $elm.setAttribute('aria-checked', value) : $elm.textContent = value;
      obj[prop] = value;

      return true;
    }
  };

  let rows = this.data.rows,
      $grid_body = this.$body,
      $tbody = $grid_body.querySelector('tbody');

  for (let row of rows) {
    row.data = new Proxy(row.data, handler);
  }

  // Sort handler
  this.data.rows = new Proxy(rows, {
    // A proxyifixed array needs the get trap even if it's not necessary, or the set trap is not
    // called. This is a regression since Firefox 21 (Bug 876114)
    'get': (obj, prop) => obj[prop],
    'set': (obj, prop, value) => {
      if (!Number.isNaN(prop) && value.$node) {
        $tbody.appendChild(value.$node);
      }

      obj[prop] = value;

      return true;
    }
  });

  // Custom scrollbar
  let scrollbar = this.scrollbar = new FlareTail.widget.ScrollBar($grid_body, true, false),
      option = this.adjust_scrollbar;

  scrollbar.adjusted = option === undefined ? FlareTail.util.ua.device.desktop : option;
};

FlareTail.widget.Grid.prototype.onmousedown_extend = function (event) {
  let $target = event.target;

  if ($target.matches('[role="columnheader"]')) {
    if (event.buttons <= 1 && this.reorderable) {
      FlareTail.util.event.bind(this, window, ['mousemove', 'mouseup']);
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

    return FlareTail.util.event.ignore(event);
  }

  // The default behavior
  this.onmousedown(event);
};

FlareTail.widget.Grid.prototype.onmousemove = function (event) {
  !this.drag ? this.start_column_reordering(event) : this.continue_column_reordering(event);
};

FlareTail.widget.Grid.prototype.onmouseup = function (event) {
  FlareTail.util.event.ignore(event);
  FlareTail.util.event.unbind(this, window, ['mousemove', 'mouseup']);

  if (event.button !== 0) {  // event.buttons is 0 since this is a mouseup event handler
    return;
  }

  if (this.drag) {
    this.stop_column_reordering(event);

    return;
  }

  let $target = event.target;

  if ($target.matches('[role="columnheader"]') && this.sortable) {
    this.sort_conditions.key = $target.dataset.id;
  }
};

FlareTail.widget.Grid.prototype.onkeydown_extend = function (event) {
  let key = event.key;

  // Focus shift with tab key
  if (key === 'Tab') {
    return true;
  }

  let focused_idx = this.members.indexOf(this.focused),
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
      this.onkeydown(event);
    }
  }

  return FlareTail.util.event.ignore(event);
};

FlareTail.widget.Grid.prototype.build_header = function () {
  let $grid_header = this.$header = document.createElement('header'),
      $table = $grid_header.appendChild(document.createElement('table')),
      $colgroup = $table.appendChild(document.createElement('colgroup')),
      $row = $table.createTBody().appendChild((new FlareTail.widget.Row()).$node),
      cond = this.sort_conditions;

  for (let column of this.data.columns) {
    let $col = $colgroup.appendChild(document.createElement('col')),
        $cell = column.$node = $row.appendChild((new FlareTail.widget.ColumnHeader()).$node);

    $col.dataset.id = column.id || '';
    $col.dataset.hidden = column.hidden === true;

    $cell.appendChild(document.createElement('label')).textContent = column.label;
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

  $grid_header.id = `${this.$node.id}-header`;
  $grid_header.className = 'grid-header';
  this.$node.appendChild($grid_header);
};

FlareTail.widget.Grid.prototype.build_body = function (row_data) {
  if (row_data) {
    // Refresh the tbody with the passed data
    this.data.rows = row_data;
    this.$body.remove();
  }

  let $grid_body = this.$body = document.createElement('div'),
      $table = $grid_body.appendChild(document.createElement('table')),
      $colgroup = $table.appendChild(this.$node.querySelector('.grid-header colgroup').cloneNode(true)),
      $tbody = $table.createTBody(),
      row = new FlareTail.widget.Row(),
      $_row = row.$node,
      cond = this.sort_conditions,
      row_prefix = `${this.$node.id}-row-`;

  // Sort the data first
  this.sort(cond, 'key', cond.key, null, true);

  for (let column of this.data.columns) {
    let $cell = row.add_cell(column.key).$node;

    if (column.type === 'boolean') {
      $cell.appendChild((new FlareTail.widget.CheckBox()).$node);
      $cell.setAttribute('aria-readonly', 'false');
    } else {
      $cell.appendChild(document.createElement(column.type === 'time' ? 'time' : 'label'));
    }

    $cell.dataset.id = column.id;
    $cell.dataset.type = column.type;
  }

  for (let row of this.data.rows) {
    let $row = row.$node = $tbody.appendChild($_row.cloneNode(true));

    $row.id = `${row_prefix}${row.data.id}`;
    $row.dataset.id = row.data.id;

    // Custom data
    if (row.dataset && Object.keys(row.dataset).length) {
      for (let [prop, value] of Iterator(row.dataset)) {
        $row.dataset[prop] = value;
      }
    }

    for (let [i, column] of this.data.columns.entries()) {
      let $child = $row.cells[i].firstElementChild,
          value = row.data[column.id];

      if (column.type === 'boolean') {
        $child.setAttribute('aria-checked', value === true);
      } else if (column.type === 'time') {
        FlareTail.util.datetime.fill_element($child, value, this.date_options);
      } else {
        $child.textContent = value;
      }
    }
  }

  $grid_body.id = `${this.$node.id}-body`;
  $grid_body.className = 'grid-body';
  $grid_body.tabIndex = -1;
  this.$node.appendChild($grid_body);

  if (row_data) {
    this.members.update();
    this.activate_rows();
    this.trigger('Rebuilt');
  }
};

FlareTail.widget.Grid.prototype.get_data = function () {
  let $sorter = this.$header.querySelector('[role="columnheader"][aria-sort]');

  // Sort conditions
  if (this.sortable && $sorter) {
    this.sort_conditions = {
      'key': $sorter.dataset.id || null,
      'order': $sorter.getAttribute('aria-sort') || 'none'
    };
  }

  // Fill the column database
  this.data.columns = [...this.$header.querySelector('[role="row"]').cells].map($cell => ({
    'id': $cell.dataset.id,
    'type': $cell.dataset.type || 'string',
    'label': $cell.textContent,
    'hidden': false,
    'key': $cell.dataset.key ? true : false,
    '$node': $cell
  }));

  // Fill the row database
  this.data.rows = [...this.$body.querySelectorAll('[role="row"]')].map($row => {
    let row = { 'id': $row.id, '$node': $row, 'data': {} };

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
};

FlareTail.widget.Grid.prototype.sort = function (cond, prop, value, receiver, data_only = false) {
  let $tbody = this.$body.querySelector('tbody'),
      $sorter;

  if (data_only) {
    cond.order = cond.order || 'ascending';
    FlareTail.util.array.sort(this.data.rows, cond);

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
    this.$header.querySelector('[aria-sort]').removeAttribute('aria-sort');
  }

  $sorter = this.$header.querySelector(`[role="columnheader"][data-id="${CSS.escape(cond.key)}"]`);
  cond.type = $sorter.dataset.type;

  $tbody.setAttribute('aria-busy', 'true'); // display: none

  FlareTail.util.array.sort(this.data.rows, cond);

  $tbody.removeAttribute('aria-busy');
  $sorter.setAttribute('aria-sort', cond.order);

  // Reorder the member list
  this.members.update();

  // Fire an event. Clone cond as it's a proxyfied object
  this.trigger('Sorted', { 'conditions': FlareTail.util.object.clone(cond) });

  let selected = this.selected;

  if (selected && selected.length) {
    this.ensure_row_visibility(selected.last);
  }

  return true;
};

FlareTail.widget.Grid.prototype.init_columnpicker = function () {
  let picker = this.columnpicker = new FlareTail.widget.Menu($picker),
      $picker = this.$header.appendChild(picker.$node);

  $picker.id = `${this.$node.id}-columnpicker`;
  $picker.setAttribute('aria-expanded', 'false');
  picker.bind('MenuItemSelected', event => this.toggle_column(event.detail.target.dataset.id));
  this.$header.setAttribute('aria-owns', $picker.id);
};

FlareTail.widget.Grid.prototype.build_columnpicker = function () {
  this.columnpicker.build(this.data.columns.map(col => ({
    'id': `${this.$node.id}-columnpicker-${col.id}`,
    'label': col.label,
    'type': 'menuitemcheckbox',
    'disabled': col.key === true,
    'checked': !col.hidden,
    'data': { 'id': col.id }
  })));
};

FlareTail.widget.Grid.prototype.toggle_column = function (id) {
  // Find column by id, thanks to Proxy
  let col = this.data.columns[id];

  col.hidden = !col.hidden;
};

FlareTail.widget.Grid.prototype.show_column = function (col) {
  let attr = `[data-id="${col.id}"]`;

  this.$node.querySelector(`[role="columnheader"]${attr}`).removeAttribute('aria-hidden');

  for (let $cell of this.$node.querySelectorAll(`[role="gridcell"]${attr}`)) {
    $cell.removeAttribute('aria-hidden');
  }

  for (let $col of this.$node.querySelectorAll(`col${attr}`)) {
    $col.dataset.hidden = 'false';
  }
};

FlareTail.widget.Grid.prototype.hide_column = function (col) {
  let attr = `[data-id="${col.id}"]`;

  for (let $col of this.$node.querySelectorAll(`col${attr}`)) {
    $col.dataset.hidden = 'true';
  }

  this.$node.querySelector(`[role="columnheader"]${attr}`).setAttribute('aria-hidden', 'true');

  for (let $cell of this.$node.querySelectorAll(`[role="gridcell"]${attr}`)) {
    $cell.setAttribute('aria-hidden', 'true');
  }
};

FlareTail.widget.Grid.prototype.ensure_row_visibility = function ($row) {
  let $outer = this.$node.querySelector('.grid-body');

  if (!$outer) {
    return;
  }

  let ost = $outer.scrollTop,
      ooh = $outer.offsetHeight,
      rot = $row.offsetTop,
      roh = $row.offsetHeight;

  if (ost > rot) {
    $row.scrollIntoView({ 'block': 'start', 'behavior': 'smooth' });
  }

  if (ost + ooh < rot + roh) {
    $row.scrollIntoView({ 'block': 'end', 'behavior': 'smooth' });
  }
};

FlareTail.widget.Grid.prototype.start_column_reordering = function (event) {
  let $container = document.createElement('div'),
      $_image = document.createElement('canvas'),
      $follower,
      headers = [],
      rect = this.$node.getBoundingClientRect(),
      style = $container.style;

  event.target.dataset.grabbed = 'true';
  $container.id = 'column-drag-image-container';
  style.top = `${rect.top}px`;
  style.left = `${rect.left}px`;
  style.width = `${this.$node.offsetWidth}px`;
  style.height = `${this.$node.offsetHeight}px`;

  for (let $chead of this.$header.querySelectorAll('[role="columnheader"]')) {
    let $image = $container.appendChild($_image.cloneNode(true)),
        left = $chead.offsetLeft,
        width = $chead.offsetWidth,
        index = $chead.cellIndex,
        style = $image.style;

    $image.id = `column-drag-image-${index}`;
    style.left = `${left}px`;
    style.width = `${width}px`;
    style.height = `${this.$node.offsetHeight}px`;
    style.background = `-moz-element(#${this.$node.id}) -${left}px 0`;

    if ($chead.dataset.grabbed === 'true') {
      // The follower shows the dragging position
      $follower = $image;
      $image.className = 'follower';
      this.drag = {
        $container,
        '$header': $chead,
        $follower,
        'start_index': index,
        'current_index': index,
        'start_left': event.clientX - left,
        'row_width': width,
        'grid_width': this.$node.offsetWidth,
      };
    }

    headers.push(new Proxy({ index, left, width }, {
      'set': (obj, prop, value) => {
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

  this.drag.headers = headers;
  document.body.appendChild($container);
  this.$node.querySelector('[role="scrollbar"]').setAttribute('aria-hidden', 'true')
};

FlareTail.widget.Grid.prototype.continue_column_reordering = function (event) {
  let pos = event.clientX - this.drag.start_left,
      index = this.drag.current_index,
      headers = this.drag.headers,
      current = headers[index],
      prev = headers[index - 1],
      next = headers[index + 1];

  // Moving left
  if (prev && pos < prev.left + prev.width / 2) {
    [prev.index, current.index] = [current.index, prev.index];
    [prev.width, current.width] = [current.width, prev.width];
    current.left = prev.left + prev.width;
    this.drag.current_index--;

    return;
  }

  // Moving right
  if (next && pos + this.drag.row_width > next.left + next.width / 2) {
    [current.index, next.index] = [next.index, current.index];
    [current.width, next.width] = [next.width, current.width];
    current.left = prev ? prev.left + prev.width : 0;
    next.left = current.left + current.width;
    this.drag.current_index++;

    return;
  }

  // Move further
  if (pos >= 0 && pos + this.drag.row_width <= this.drag.grid_width) {
    this.drag.$follower.style.left = `${pos}px`;
  }
};

FlareTail.widget.Grid.prototype.stop_column_reordering = function (event) {
  let start_idx = this.drag.start_index,
      current_idx = this.drag.current_index,
      columns = this.data.columns;

  // Actually change the position of rows
  if (start_idx !== current_idx) {
    // Data
    columns.splice(current_idx, 0, columns.splice(start_idx, 1)[0]);

    // View
    for (let $colgroup of this.$node.querySelectorAll('colgroup')) {
      let items = $colgroup.children;

      $colgroup.insertBefore(items[start_idx], items[start_idx > current_idx ? current_idx : current_idx + 1]);
    }

    for (let $row of this.$node.querySelectorAll('[role="row"]')) {
      let items = $row.children;

      $row.insertBefore(items[start_idx], items[start_idx > current_idx ? current_idx : current_idx + 1]);
    }
  }

  // Fire an event
  this.trigger('ColumnModified', { columns });

  // Cleanup
  drag.$header.removeAttribute('data-grabbed');
  drag.$container.remove();
  this.$node.querySelector('[role="scrollbar"]').removeAttribute('aria-hidden');

  delete this.drag;
};

FlareTail.widget.Grid.prototype.filter = function (ids) {
  let $grid_body = this.$body,
      selected = [...this.selected];

  $grid_body.setAttribute('aria-busy', 'true');

  // Filter the rows
  for (let $row of $grid_body.querySelectorAll('[role="row"]')) {
    let id = $row.dataset.id;

    // Support both literal IDs and numeric IDs
    $row.setAttribute('aria-hidden', !ids.includes(Number.isNaN(id) ? id : Number(id)));
  }

  // Update the member list
  this.members.update();

  if (selected.length) {
    for (let [index, $row] of selected.entries()) if ($row.getAttribute('aria-hidden') === 'true') {
      selected.splice(index, 1);
    }

    this.selected = selected;
  }

  $grid_body.scrollTop = 0;
  $grid_body.removeAttribute('aria-busy');

  this.trigger('Filtered');
};

/* ------------------------------------------------------------------------------------------------------------------
 * Select (abstract role) extends Composite
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Select = function Select () {};
FlareTail.widget.Select.prototype = Object.create(FlareTail.widget.Composite.prototype);
FlareTail.widget.Select.prototype.constructor = FlareTail.widget.Select;

FlareTail.widget.Select.prototype.append_item = function (label, value) {
  return this.insert_item_at(-1, label, value);
};

FlareTail.widget.Select.prototype.insert_item_at = function (index, label, value) {
  let item = new this.child_class(),
      $item = item.$node;

  $item.appendChild(document.createElement('label')).textContent = label;
  $item.id = `${this.$node.id}--${value}`;
  $item.dataset.value = value;

  this.members.insert(index, instance);

  return item;
};

FlareTail.widget.Select.prototype.remove_item_at = function (index) {
  let item = this.members[index];

  this.members.remove(index);

  return item;
};

/* ------------------------------------------------------------------------------------------------------------------
 * ComboBox extends Select
 * ------------------------------------------------------------------------------------------------------------------ */

// TODO: Support aria-autocomplete="inline" and "both"
// TODO: Add more HTMLSelectElement-compatible attributes
// TODO: Add test cases

FlareTail.widget.ComboBox = function ComboBox ($node) {
  this.$node = $node;
  this.$node.setAttribute('aria-expanded', 'false');

  this.$button = this.$node.querySelector('[role="button"]');
  this.$input = this.$node.querySelector('[role="textbox"], [role="searchbox"]');
  this.$listbox = this.$node.querySelector('[role="listbox"]');

  this.autocomplete = this.$node.getAttribute('aria-autocomplete') || 'none';
  this.autoexpand = this.$node.matches('[data-autoexpand="true"]');
  this.nobutton = this.$node.matches('[data-nobutton="true"]');

  if (!this.$button && !this.nobutton) {
    this.$button = this.$node.appendChild((new FlareTail.widget.Button()).$node);
  }

  if (this.$button) {
    this.$button.tabIndex = 0;
    this.$button.addEventListener('mousedown', event => this.button_onmousedown(event));
  }

  if (!this.$input) {
    this.$input = this.$node.insertBefore((new FlareTail.widget.TextBox()).$node, this.$node.firstElementChild);
    this.$input.setAttribute('aria-readonly', this.$node.matches('[aria-readonly="true"]'));
  }

  this.readonly = this.$input.matches('[aria-readonly="true"]');

  this.$input.tabIndex = 0;
  this.$input.contentEditable = !this.readonly;
  this.$input.addEventListener('keydown', event => this.input_onkeydown(event));
  this.$input.addEventListener('input', event => this.input_oninput(event));
  this.$input.addEventListener('blur', event => this.input_onblur(event));
  this.input = new FlareTail.widget.TextBox(this.$input);

  if (!this.$listbox) {
    this.$listbox = this.$node.appendChild((new FlareTail.widget.ListBox()).$node);
  }

  this.$listbox.addEventListener('mouseover', event => this.listbox_onmouseover(event));
  this.$listbox.addEventListener('mousedown', event => this.listbox_onmousedown(event));
  this.$listbox.addEventListener('click', event => this.listbox_onclick(event));
  this.$listbox.addEventListener('Selected', event => this.listbox_onselect(event));
  this.listbox = new FlareTail.widget.ListBox(this.$listbox, undefined, { 'search_enabled': false });

  let $selected = this.$listbox.querySelector('[role="option"][aria-selected="true"]');

  if ($selected) {
    this.input.value = $selected.dataset.value || $selected.textContent;
  }

  Object.defineProperties(this, {
    'options': {
      'enumerable': true,
      'get': () => [...this.$listbox.querySelectorAll('[role="option"]')],
    },
    'selected': {
      'enumerable': true,
      'get': () => this.$listbox.querySelector('[role="option"][aria-selected="true"]'),
    },
    'selectedIndex': {
      'enumerable': true,
      'get': () => this.listbox.members.indexOf(this.listbox.selected.first),
      'set': index => {
        let selected = this.listbox.selected = this.listbox.focused = this.listbox.members[index];

        this.input.value = selected.$node.dataset.value || selected.$node.textContent;
      },
    },
  });
};

FlareTail.widget.ComboBox.prototype = Object.create(FlareTail.widget.Select.prototype);
FlareTail.widget.ComboBox.prototype.constructor = FlareTail.widget.ComboBox;

FlareTail.widget.ComboBox.prototype.show_dropdown = function () {
  if (!this.listbox.members.length) {
    return;
  }

  let input = this.$input.getBoundingClientRect(),
      listbox = this.$listbox.getBoundingClientRect(),
      adjusted = window.innerHeight - input.bottom < listbox.height && input.top > listbox.height,
      selected = this.listbox.selected.first;

  if (!selected) {
    selected = this.listbox.selected = this.listbox.members.first;
  }

  this.$node.setAttribute('aria-expanded', 'true');
  this.$node.setAttribute('aria-activedescendant', selected.$node.id);
  this.listbox.focused = selected;
  this.$input.focus(); // Keep focus on <input>
  this.$listbox.dataset.position = adjusted ? 'above' : 'below';
};

FlareTail.widget.ComboBox.prototype.hide_dropdown = function () {
  this.$node.setAttribute('aria-expanded', 'false');
  this.$node.removeAttribute('aria-activedescendant');
};

FlareTail.widget.ComboBox.prototype.toggle_dropdown = function () {
  if (this.$node.getAttribute('aria-expanded') === 'false') {
    this.show_dropdown();
  } else {
    this.hide_dropdown();
  }
};

FlareTail.widget.ComboBox.prototype.fill_dropdown = function ($node, addition = true) {
  if (!addition) {
    this.clear_dropdown();
  }

  this.$listbox.appendChild($node);
  this.listbox.members.update();
  this.listbox.get_data();

  let selected = this.listbox.selected.first;

  if (this.autocomplete === 'list' && selected) {
    this.input.value = selected.$node.dataset.value || selected.$node.textContent;
  }
};

FlareTail.widget.ComboBox.prototype.add = function (value, selected = false) {
  let option = new FlareTail.widget.Option();

  option.$node.dataset.value = option.$node.textContent = value;
  option.$node.setAttribute('aria-selected', selected);
  this.fill_dropdown(option.$node);
};

FlareTail.widget.ComboBox.prototype.clear_dropdown = function () {
  this.$listbox.innerHTML = '';
};

FlareTail.widget.ComboBox.prototype.clear_input = function () {
  this.input.clear();
};

FlareTail.widget.ComboBox.prototype.button_onmousedown = function (event) {
  this.toggle_dropdown();
  event.preventDefault();
};

FlareTail.widget.ComboBox.prototype.input_onkeydown = function (event) {
  if (event.key === 'Tab') {
    return true;
  }

  if (this.listbox.members.length) {
    if (event.key === 'Escape') {
      this.hide_dropdown();
    } else if (event.key === ' ') { // Space
      this.toggle_dropdown();
    } else if (event.key === 'Enter') {
      this.listbox_onmousedown(event);
    } else {
      FlareTail.util.kbd.dispatch(this.$listbox, event.key);

      if (event.key.match(/^Arrow(Up|Down)$/)) {

        if (this.autoexpand) {
          this.show_dropdown();
        }

        let $target = this.listbox.selected.first,
            value = $target.dataset.value || $target.textContent;

        if (this.autocomplete === 'list') {
          this.input.value = value;
          this.trigger('Change', { $target, value });
        }

        this.$input.focus(); // Keep focus on <input>
      }
    }
  }

  if (this.readonly) {
    event.preventDefault();
  }

  event.stopPropagation();
};

FlareTail.widget.ComboBox.prototype.input_oninput = function (event) {
  let value = this.input.value.trim();

  this.clear_dropdown();

  if (!value.match(/\S/)) {
    this.hide_dropdown();

    return;
  }

  this.trigger('Input', { value, '$target': this.$input });

  event.stopPropagation();
};

FlareTail.widget.ComboBox.prototype.input_onblur = function (event) {
  // Use a timer in case of the listbox getting focus for a second
  window.setTimeout(() => {
    if (!this.$input.matches(':focus')) {
      this.hide_dropdown();
    }
  }, 50);
};

// Based on Menu.prototype.onmouseover
FlareTail.widget.ComboBox.prototype.listbox_onmouseover = function (event) {
  if (this.listbox.members.has(event.target)) {
    this.listbox.selected = this.listbox.focused = this._get_instance(event.target);
    this.show_dropdown();
  }

  FlareTail.util.event.ignore(event);
};

FlareTail.widget.ComboBox.prototype.listbox_onmousedown = function (event) {
  let $target = this.listbox.selected.first,
      value = $target.dataset.value || $target.textContent;

  this.hide_dropdown();
  this.input.value = value;
  this.$input.focus();

  this.trigger('Change', { $target, value });
  FlareTail.util.event.ignore(event);
};

FlareTail.widget.ComboBox.prototype.listbox_onselect = function (event) {
  this.$node.setAttribute('aria-activedescendant', event.detail.ids[0]);
};

/* ------------------------------------------------------------------------------------------------------------------
 * ListBox extends Select
 *
 * [argument] $node (Element) <menu role="listbox">
 * [argument] data (Array, optional)
 * [argument] options (Object, optional)
 *                  - search_enabled
 * [attributes] on the listbox element:
 *                  - aria-multiselectable
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.ListBox = function ListBox ($node = undefined, data = undefined, options = {}) {
  if (!$node) {
    $node = document.createElement('ul');
    $node.tabIndex = 0;
    $node.setAttribute('role', 'listbox');
  }

  this.$node = $node;
  this.child_class = FlareTail.widget.Option;
  this.item_selector = '[role="option"]';
  this.search_enabled = options.search_enabled !== undefined ? options.search_enabled : true;

  this.handler = {
    'get': (obj, prop) => {
      if (prop === 'selected' || prop === 'disabled' || prop === 'hidden') {
        return obj.$node.getAttribute(`aria-${prop}`) === 'true';
      }

      return obj[prop];
    },
    'set': (obj, prop, value) => {
      if (prop === 'selected' || prop === 'disabled' || prop === 'hidden') {
        obj.$node.setAttribute(`aria-${prop}`, value);
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
};

FlareTail.widget.ListBox.prototype = Object.create(FlareTail.widget.Select.prototype);
FlareTail.widget.ListBox.prototype.constructor = FlareTail.widget.ListBox;

FlareTail.widget.ListBox.prototype.build = function () {
  let map = this.data.map = new Map(),
      $fragment = new DocumentFragment();

  for (let item of this.data.structure) {
    item.instance = new FlareTail.widget.Option();
    item.$node = $fragment.appendChild(item.instance.$node);
    item.$node.id = item.id;
    item.$node.setAttribute('aria-selected', item.selected ? 'true' : 'false');
    item.$node.appendChild(document.createElement('label')).textContent = item.label;

    for (let [prop, value] of Iterator(item.data || {})) {
      item.$node.dataset[prop] = value;
    }

    // Save the item/obj reference
    map.set(item.label, new Proxy(item, this.handler));
  }

  this.$node.appendChild($fragment);
};

FlareTail.widget.ListBox.prototype.get_data = function () {
  let map = this.data.map = new Map();

  this.data.structure = this.members.map($node => {
    let item = { $node, 'id': $node.id, 'label': $node.textContent };

    if (Object.keys($node.dataset).length) {
      item.data = {};

      for (let [prop, value] of Iterator($node.dataset)) {
        item.data[prop] = value;
      }
    }

    // Save the item/obj reference
    map.set(item.label, new Proxy(item, this.handler));

    return item;
  });
};

FlareTail.widget.ListBox.prototype.filter = function (list) {
  this.$node.setAttribute('aria-busy', 'true'); // Prevent reflows

  // Filter the options
  for (let [name, item] of this.data.map) {
    item.selected = false;
    item.disabled = list.length && !list.includes(name);
  }

  // Update the member list
  this.members.update();

  if (this.selected.length) {
    this.selected = [];
  }

  this.$node.removeAttribute('aria-busy');
};

/* ------------------------------------------------------------------------------------------------------------------
 * Menu extends Select
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Menu = function Menu ($node = undefined, data = []) {
  if (!$node) {
    $node = document.createElement('ul');
    $node.setAttribute('role', 'menu');
  }

  this.$node = $node;
  this.child_class = FlareTail.widget.MenuItem;
  this.item_selector = '[role^="menuitem"]';
  this.focus_cycling = true;

  this.data = {};

  if (data.length) {
    this.data.structure = data;
    this.build();
  }

  this.activate();
  this.activate_extend();

  // Context menu
  let $owner = document.querySelector(`[aria-owns="${CSS.escape(this.$node.id)}"]`);

  if ($owner && !$owner.matches('[role="menuitem"]')) {
    this.$owner = $owner;
    FlareTail.util.event.bind(this, this.$owner, ['contextmenu', 'keydown']);
  }

  Object.defineProperties(this, {
    'closed': {
      'enumerable': true,
      'get': () => this.$node.getAttribute('aria-expanded') === 'false',
      'set': value => value ? this.open() : this.close()
    }
  });
};

FlareTail.widget.Menu.prototype = Object.create(FlareTail.widget.Select.prototype);
FlareTail.widget.Menu.prototype.constructor = FlareTail.widget.Menu;

FlareTail.widget.Menu.prototype.activate_extend = function (rebuild = false) {
  // Redefine items
  let not_selector = ':not([aria-disabled="true"]):not([aria-hidden="true"])',
      selector = `#${this.$node.id} > li > ${this.item_selector}${not_selector}`,
      items = this.members.update(document.querySelectorAll(selector)),
      menus = this.menus = new WeakMap();

  for (let item of items) {
    if (item.$node.hasAttribute('aria-owns')) {
      let $menu = document.getElementById(item.$node.getAttribute('aria-owns')),
          menu = new FlareTail.widget.Menu($menu);

      menu.parent = this;
      menus.set(item.$node, menu);
    }
  }

  if (rebuild) {
    return;
  }

  this.on('FocusUpdated', event => {
    let { $old, $new } = event.detail;

    if ($old && menus.has($old)) {
      menus.get($old).close();
    }

    if ($new && menus.has($new)) {
      menus.get($new).open();
    }
  });
};

FlareTail.widget.Menu.prototype.onmousedown = function (event) {
  // Open link in a new tab
  if (event.target.href && event.buttons <= 1) {
    event.stopPropagation();
    event.target.target = '_blank';

    return;
  }

  if (event.buttons > 1) {
    FlareTail.util.event.ignore(event);

    return;
  }

  if (this.parent && event.target === this.parent.selected.first) {
    // Just opening the menu
    return;
  }

  if (event.currentTarget === window) {
    this.close(true);
  } else if (!this.menus.has(event.target) && this.members.has(event.target)) {
    this.select(event)
    this.close(true);
  }

  FlareTail.util.event.ignore(event);
};

FlareTail.widget.Menu.prototype.onmouseover = function (event) {
  if (this.members.has(event.target)) {
    this.selected = this.focused = this._get_instance(event.target);
  }

  FlareTail.util.event.ignore(event);
};

FlareTail.widget.Menu.prototype.oncontextmenu = function (event) {
  if (this.$owner) {
    let style = this.$node.style;

    style.top = `${event.layerY}px`;
    style.left = `${event.layerX}px`;

    if (event.currentTarget === this.$owner) {
      this.open(event);
    }

    if (this.$node.getBoundingClientRect().right > window.innerWidth) {
      // The menu is shown beyond the window width. Reposition it
      style.left = `${this.$owner.offsetWidth - this.$node.offsetWidth - 4}px`;
    }
  }

  return FlareTail.util.event.ignore(event);
};

FlareTail.widget.Menu.prototype.onkeydown_extend = function (event) {
  let has_submenu = this.menus.has(event.target),
      key = event.key;

  // Open link in a new tab
  if (event.target.href && event.key === 'Enter') {
    event.stopPropagation();
    event.target.target = '_blank';

    return;
  }

  // The owner of the context menu
  if (this.$owner && event.currentTarget === this.$owner) {
    switch (key) {
      case 'ArrowUp':
      case 'End': {
        selected = this.focused = this.members.last;

        break;
      }

      case 'ArrowDown':
      case 'ArrowRight':
      case 'Home': {
        selected = this.focused = this.members.first;

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

  FlareTail.util.event.ignore(event);

  switch (key) {
    case 'ArrowRight': {
      if (has_submenu) {
        // Select the first item in the submenu
        let menu = this.menus.get(event.target);

        menu.selected = this.focused = menu.members.first;
      } else if (this.parent) {
        // Select the next (or first) item in the parent menu
        let menu = this.parent,
            items = menu.members,
            $target = items[items.indexOf(menu.selected.first) + 1] || items.first;

        menu.selected = this.focused = $target;
      }

      break;
    }

    case 'ArrowLeft': {
      if (this.parent) {
        let menu = this.parent,
            items = menu.members,
            $target = menu.$node.matches('[role="menubar"]')
                    ? items[items.indexOf(menu.selected.first) - 1] || items.last : menu.selected.first;

        menu.selected = this.focused = $target;
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
      this.onkeydown(event);
    }
  }
};

FlareTail.widget.Menu.prototype.onblur_extend = function (event) {
  if (event.currentTarget === window) {
    this.close(true);
  }

  // The default behavior
  this.onblur(event);
};

FlareTail.widget.Menu.prototype.build = function (data) {
  let $fragment = new DocumentFragment(),
      $_outer = document.createElement('li'),
      rebuild = false;

  if (data) {
    // Empty & rebuild menu
    rebuild = true;
    this.$node.innerHTML = '';
  } else {
    data = this.data.structure;
  }

  $_outer.appendChild(document.createElement('span')).appendChild(document.createElement('label'));

  this.data.structure = data.map(item => {
    if (item.type === 'separator') {
      $fragment.appendChild((new FlareTail.widget.Separator()).$node);

      return null;
    }

    let $item = item.$node = $fragment.appendChild($_outer.cloneNode(true)).firstElementChild;

    $item.id = item.id;
    $item.setAttribute('role', item.type || 'menuitem');
    $item.setAttribute('aria-disabled', item.disabled === true);
    $item.setAttribute('aria-checked', item.checked === true);
    $item.firstElementChild.textContent = item.label;

    if (item.data) {
      for (let [prop, value] of Iterator(item.data)) {
        $item.dataset[prop] = value;
      }
    }

    return item;
  }).filter(item => item !== null);

  this.$node.appendChild($fragment);

  if (rebuild) {
    this.activate(true);
    this.activate_extend(true);
  }
};

FlareTail.widget.Menu.prototype.open = function () {
  this.$node.setAttribute('aria-expanded', 'true');
  this.$node.removeAttribute('aria-activedescendant');
  this.trigger('MenuOpened');

  // Show the submenu on the left if there is not enough space
  if (this.$node.getBoundingClientRect().right > window.innerWidth ||
      this.parent && this.parent.$node.matches('.dir-left')) {
    this.$node.classList.add('dir-left');
  }

  FlareTail.util.event.bind(this, window, ['mousedown', 'blur']);
};

FlareTail.widget.Menu.prototype.select = function (event) {
  FlareTail.util.event.trigger(this.$node, 'MenuItemSelected', {
    'bubbles': true,
    'cancelable': false,
    'detail': {
      'target': event.target,
      'command': event.target.dataset.command || event.target.id
    }
  });
};

FlareTail.widget.Menu.prototype.close = function (propagation) {
  FlareTail.util.event.unbind(this, window, ['mousedown', 'blur']);

  this.$node.setAttribute('aria-expanded', 'false');
  this.$node.removeAttribute('aria-activedescendant');
  this.trigger('MenuClosed');
  this.selected = [];

  if (this.parent) {
    if (this.parent.focused) {
      this.parent.focused.focus();
    }

    if (propagation) {
      this.parent.close(true);
    }
  } else {
    // Context menu
    if (this.$owner) {
      this.$owner.focus();
    }
  }
};

/* ------------------------------------------------------------------------------------------------------------------
 * MenuBar extends Menu
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.MenuBar = function MenuBar ($node, data) {
  this.$node = $node;
  this.child_class = FlareTail.widget.MenuItem;
  this.item_selector = '[role^="menuitem"]';
  this.focus_cycling = true;

  this.activate();
  this.activate_extend();
};

FlareTail.widget.MenuBar.prototype = Object.create(FlareTail.widget.Menu.prototype);
FlareTail.widget.MenuBar.prototype.constructor = FlareTail.widget.MenuBar;

FlareTail.widget.MenuBar.prototype.onmousedown = function (event) {
  if (event.buttons > 1) {
    FlareTail.util.event.ignore(event);

    return;
  }

  if (this.members.has(event.target)) {
    event.target !== this.selected.first ? this.open(event) : this.close();
  } else if (this.selected.length) {
    this.close();
  } else {
    FlareTail.util.event.ignore(event);
  }
};

FlareTail.widget.MenuBar.prototype.onmouseover = function (event) {
  if (this.selected.length && this.members.has(event.target)) {
    this.selected = this.focused = this._get_instance(event.target);
  }

  return FlareTail.util.event.ignore(event);
};

FlareTail.widget.MenuBar.prototype.onkeydown_extend = function (event) {
  let menu = this.menus.get(event.target).view;

  switch (event.key) {
    case 'Tab': {
      return true; // Focus management
    }

    case 'Home':
    case 'ArrowDown': {
      menu.selected = menu.focused = menu.members.first;

      break;
    }

    case 'End':
    case 'ArrowUp': {
      menu.selected = menu.focused = menu.members.last;

      break;
    }

    case ' ': { // Space
      if (event.target.matches('[aria-selected="true"]')) {
        menu.$node.setAttribute('aria-expanded', 'false');
        this.selected = [];
      } else {
        menu.$node.setAttribute('aria-expanded', 'true');
        this.selected = event.target;
      }

      break;
    }

    case 'Escape': {
      if (event.target.matches('[aria-selected="true"]')) {
        menu.$node.setAttribute('aria-expanded', 'false');
        this.selected = [];
      }

      break;
    }

    default: {
      // The default behavior
      this.onkeydown(event);
    }
  }

  return FlareTail.util.event.ignore(event);
};

FlareTail.widget.MenuBar.prototype.open = function (event) {
  this.select_with_mouse(event);
};

FlareTail.widget.MenuBar.prototype.close = function () {
  FlareTail.util.event.unbind(this, window, ['mousedown', 'blur']);

  this.selected = [];
};

/* ------------------------------------------------------------------------------------------------------------------
 * RadioGroup extends Select
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.RadioGroup = function RadioGroup ($node, data) {
  this.$node = $node;
  this.child_class = FlareTail.widget.Radio;
  this.item_selector = '[role="radio"]';
  this.selected_attr: 'aria-checked';
  this.focus_cycling = true;

  this.activate();
};

FlareTail.widget.RadioGroup.prototype = Object.create(FlareTail.widget.Select.prototype);
FlareTail.widget.RadioGroup.prototype.constructor = FlareTail.widget.RadioGroup;

/* ------------------------------------------------------------------------------------------------------------------
 * Tree extends Select
 *
 * [argument] $node (Element) <menu role="tree">
 * [argument] data (Array, optional)
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Tree = function Tree ($node, data) {
  this.$node = $node;
  this.child_class = FlareTail.widget.TreeItem;
  this.item_selector = '[role="treeitem"]';
  this.search_enabled = true;

  this.data = {};

  if (data) {
    this.data.structure = data;
    this.build();
  }

  this.activate();

  if (!data) {
    this.get_data();
  }
};

FlareTail.widget.Tree.prototype = Object.create(FlareTail.widget.Select.prototype);
FlareTail.widget.Tree.prototype.constructor = FlareTail.widget.Tree;

FlareTail.widget.Tree.prototype.onmousedown_extend = function (event) {
  if (event.target.matches('.expander')) {
    this.expand(event.target.parentElement.querySelector('[role="treeitem"]'));
  } else {
    // The default behavior
    this.onmousedown(event);
  }
};

FlareTail.widget.Tree.prototype.onkeydown_extend = function (event) {
  let $item = event.target;

  switch (event.key) {
    case 'ArrowLeft': {
      if ($item.matches('[aria-expanded="true"]')) {
        this.expand($item); // Collapse the subgroup
      } else {
        // Select the parent item
        let level = Number($item.getAttribute('aria-level')),
            selected = this.members.first;

        for (let i = this.members.indexOf($item) - 1; i >= 0; i--) {
          if (Number(this.members[i].getAttribute('aria-level')) === level - 1) {
            selected = this.members[i];

            break;
          }
        }

        this.selected = this.focused = selected;
      }

      break;
    }

    case 'ArrowRight': {
      if ($item.matches('[aria-expanded="false"]')) {
        this.expand($item); // Expand the subgroup
      } else if ($item.hasAttribute('aria-expanded')) {
        // Select the item just below
        this.selected = this.focused = this.members[this.members.indexOf($item) + 1];
      }

      break;
    }

    default: {
      // The default behavior
      this.onkeydown(event);
    }
  }
};

FlareTail.widget.Tree.prototype.ondblclick = function (event) {
  if (event.target.hasAttribute('aria-expanded')) {
    this.expand(event.target);
  }
};

FlareTail.widget.Tree.prototype.build = function () {
  let $tree = this.$node,
      $fragment = new DocumentFragment(),
      $outer = document.createElement('li'),
      $treeitem = (new FlareTail.widget.TreeItem()).node,
      $expander = document.createElement('span'),
      $group = document.createElement('ul'),
      structure = this.data.structure,
      map = this.data.map = new WeakMap(),
      level = 1;

  $outer.setAttribute('role', 'none');
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
    obj.$node = $item;

    $_outer.appendChild($item);

    if (obj.data) {
      for (let [prop, value] of Iterator(obj.data)) {
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
};

FlareTail.widget.Tree.prototype.get_data = function () {
  let map = this.data.map = new WeakMap(),
      structure = this.data.structure = [];

  // TODO: generate structure data

  for (let item of this.members) {
    let level = Number(item.$node.getAttribute('aria-level')),
        item = {
          '$node': item.$node,
          'id': item.$node.id,
          'label': item.$node.textContent,
          level,
          'sub': []
        };

    if (Object.keys(item.$node.dataset).length) {
      item.data = {};

      for (let [prop, value] of Iterator(item.$node.dataset)) {
        item.data[prop] = value;
      }
    }

    // Save the item/obj reference
    map.set(item.$node, item);
  };
};

FlareTail.widget.Tree.prototype.expand = function ($item) {
  let expanded = $item.matches('[aria-expanded="true"]'),
      items = [...this.$node.querySelectorAll('[role="treeitem"]')],
      selector = `#${$item.getAttribute('aria-owns')} [aria-selected="true"]`,
      children = [...document.querySelectorAll(selector)];

  $item.setAttribute('aria-expanded', !expanded);

  // Update data with visible items
  this.members.update([for ($item of items) if ($item.offsetParent !== null) $item]);

  if (!children.length) {
    return;
  }

  this.focused = $item;

  if (!this.multiselectable) {
    this.selected = $item;

    return;
  }

  // Remove the item's children from selection
  let selected = [for (item of this.selected) if (!children.includes(item.$node)) item];

  // Add the item to selection
  selected.push($item);
  this.selected = selected;
};

/* ------------------------------------------------------------------------------------------------------------------
 * TabList extends Composite
 *
 * [argument] $node (Element) <ul role="tablist">
 * [attributes] on the tablist element:
 *                  - data-removable: if true, tabs can be opened and/or closed (default: false)
 *                  - data-reorderable: if true, tabs can be reordered by drag (default: false)
 *              on the tab elements:
 *                  - aria-selected: if true, the tab will be selected first
 *                  - draggable and aria-grabbed: tabs can be dragged (to reorder)
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.TabList = function TabList ($node) {
  // TODO: aria-multiselectable support for accordion UI
  // http://www.w3.org/WAI/PF/aria-practices/#accordion
  if ($node.matches('[aria-multiselectable="true"]')) {
    throw new Error('Multi-selectable tab list is not supported yet.');
  }

  this.$node = $node;
  this.child_class = FlareTail.widget.Option;
  this.focus_cycling = true;
  this.item_selector = '[role="tab"]';
  this.reorderable = this.$node.dataset.reorderable === 'true';
  this.removable = this.$node.dataset.removable === 'true';

  this.activate();
  this.on('Selected', event => this.switch_tabpanel(event.detail.previous[0], event.detail.items[0]));

  if (this.removable) {
    for (let $tab of this.members) {
      this.set_close_button($tab);
    }
  }
};

FlareTail.widget.TabList.prototype = Object.create(FlareTail.widget.Composite.prototype);
FlareTail.widget.TabList.prototype.constructor = FlareTail.widget.TabList;

FlareTail.widget.TabList.prototype.onclick = function (event) {
  if (event.currentTarget === this.$node && event.target.matches('.close')) {
    this.close_tab(document.getElementById(event.target.getAttribute('aria-controls')));
  }
};

FlareTail.widget.TabList.prototype.switch_tabpanel = function ($current_tab, $new_tab) {
  let $panel;

  // Current tabpanel
  $panel = document.getElementById($current_tab.getAttribute('aria-controls'))
  $panel.tabIndex = -1;
  $panel.setAttribute('aria-hidden', 'true');

  // New tabpanel
  $panel = document.getElementById($new_tab.getAttribute('aria-controls'))
  $panel.tabIndex = 0;
  $panel.setAttribute('aria-hidden', 'false');
};

FlareTail.widget.TabList.prototype.set_close_button = function ($tab) {
  let $button = (new FlareTail.widget.Button()).node;

  $button.className = 'close';
  $button.title = 'Close Tab'; // l10n
  $button.setAttribute('aria-controls', $tab.id);
  $tab.appendChild($button);
};

FlareTail.widget.TabList.prototype.add_tab = function (name, title, label, $panel, position = 'last', dataset = {}) {
  let tab = new FlareTail.widget.Tab(),
      $tab = tab.$node,
      selected = this.selected.first,
      index = this.members.indexOf(selected),
      $next_tab = this.members[index + 1];

  $tab.id = `tab-${name}`;
  $tab.title = label || title;
  $tab.setAttribute('aria-controls', `tabpanel-${name}`);
  $tab.querySelector('label').textContent = title;
  $tab.querySelector('[role="button"]').setAttribute('aria-controls', $tab.id);

  if (dataset) {
    for (let [prop, value] of Iterator(dataset)) {
      $tab.dataset[prop] = value;
    }
  }

  // Add tab
  if (position === 'next' && $next_tab) {
    this.$node.insertBefore($tab, $next_tab); // Update view
    this.members.splice(index + 1, 0, tab); // Update data
  } else {
    this.$node.appendChild($tab); // Update view
    this.members.push(tab); // Update data
  }

  $panel = $panel || (new FlareTail.widget.TabPanel()).$node;
  $panel.id = `tabpanel-${name}`;
  $panel.tabIndex = -1;
  $panel.setAttribute('aria-hidden', 'true');
  $panel.setAttribute('aria-labelledby', $tab.id);

  // Add tabpanel
  document.getElementById(selected.$node.getAttribute('aria-controls')).parentElement.appendChild($panel);

  return tab;
};

FlareTail.widget.TabList.prototype.close_tab = function ($tab) {
  let index = this.members.indexOf($tab);

  // Switch tab
  if (this.selected.first === $tab) {
    let $new_tab = this.members[index - 1] || this.members[index + 1];

    this.selected = this.focused = $new_tab;
  }

  // Remove tabpanel
  document.getElementById($tab.getAttribute('aria-controls')).remove();

  // Remove tab
  this.members.splice(index, 1); // Update data
  $tab.remove(); // Update view
};

/* ------------------------------------------------------------------------------------------------------------------
 * Tab extends Widget
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Tab = function Tab ($node = undefined) {
  if (!$node) {
    $node = document.createElement('li');
    $node.setAttribute('role', 'tab');
    $node.setAttribute('aria-selected', 'false');
  }

  this.$node = $node;
  this.activate();
};

FlareTail.widget.Tab.prototype = Object.create(FlareTail.widget.Widget.prototype, {
  'selected': {
    'enumerable': true,
    'get': () => this.$node.matches('[aria-selected="true"]'),
    'set': selected => {
      this.$node.setAttribute('aria-selected', selected);
      this.trigger('Toggled', { selected });
    },
  },
});

FlareTail.widget.Tab.prototype.constructor = FlareTail.widget.Tab;

FlareTail.widget.Tab.prototype.activate = function () {
  this.$node.tabIndex = -1;
  FlareTail.util.event.bind(this, this.$node, ['keydown', 'click', 'contextmenu']);
};

/* ------------------------------------------------------------------------------------------------------------------
 * Input (abstract role) extends Widget
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Input = function Input () {};
FlareTail.widget.Input.prototype = Object.create(FlareTail.widget.Widget.prototype);
FlareTail.widget.Input.prototype.constructor = FlareTail.widget.Input;

/* ------------------------------------------------------------------------------------------------------------------
 * Option extends Input
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Option = function Option ($node = undefined) {
  if (!$node) {
    $node = document.createElement('li');
    $node.tabIndex = -1;
    $node.setAttribute('role', 'option');
    $node.setAttribute('aria-selected', 'false');
  }

  this.$node = $node;
};

FlareTail.widget.Option.prototype = Object.create(FlareTail.widget.Input.prototype);
FlareTail.widget.Option.prototype.constructor = FlareTail.widget.Option;

/* ------------------------------------------------------------------------------------------------------------------
 * TreeItem extends Option
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.TreeItem = function TreeItem ($node = undefined) {
  if (!$node) {
    $node = document.createElement('span');
    $node.setAttribute('role', 'treeitem');
  }

  this.$node = $node;
};

FlareTail.widget.TreeItem.prototype = Object.create(FlareTail.widget.Option.prototype);
FlareTail.widget.TreeItem.prototype.constructor = FlareTail.widget.TreeItem;

/* ------------------------------------------------------------------------------------------------------------------
 * TextBox extends Input
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.TextBox = function TextBox ($node = undefined, richtext = false) {
  if (!$node) {
    $node = document.createElement('span');
    $node.tabIndex = 0;
    $node.setAttribute('role', 'textbox');
  }

  this.$node = $node;
  this.richtext = richtext;

  Object.defineProperties(this, {
    'value': {
      'enumerable': true,
      'get': () => this.$node.textContent,
      'set': str => this.$node.textContent = str
    },
  });

  FlareTail.util.event.bind(this, this.$node, ['copy', 'paste']);
};

FlareTail.widget.TextBox.prototype = Object.create(FlareTail.widget.Input.prototype);
FlareTail.widget.TextBox.prototype.constructor = FlareTail.widget.TextBox;

FlareTail.widget.TextBox.prototype.oncopy = function (event) {
  if (!this.richtext) {
    event.clipboardData.setData('text/plain', window.getSelection().toString());
    event.preventDefault();
  }
};

FlareTail.widget.TextBox.prototype.onpaste = function (event) {
  if (!this.richtext) {
    this.$node.textContent = event.clipboardData.getData('text/plain');
    event.preventDefault();
  }
};

FlareTail.widget.TextBox.prototype.clear = function () {
  this.$node.textContent = '';
};

/* ------------------------------------------------------------------------------------------------------------------
 * CheckBox extends Input
 *
 * [argument] $node (Element) <span role="checkbox">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.CheckBox = function CheckBox ($node = undefined) {
  if (!$node) {
    $node = document.createElement('span');
    $node.setAttribute('role', 'checkbox');
  }

  this.$node = $node;
  this.activate();
};

FlareTail.widget.CheckBox.prototype = Object.create(FlareTail.widget.Input.prototype, {
  'checked': {
    'enumerable': true,
    'get': () => this.$node.matches('[aria-checked="true"]'),
    'set': checked => {
      this.$node.setAttribute('aria-checked', checked);
      this.trigger('Toggled', { checked });
    },
  },
});

FlareTail.widget.CheckBox.prototype.constructor = FlareTail.widget.CheckBox;

FlareTail.widget.CheckBox.prototype.activate = function () {
  this.$node.tabIndex = 0;
  FlareTail.util.event.bind(this, this.$node, ['keydown', 'click', 'contextmenu']);
};

FlareTail.widget.CheckBox.prototype.onkeydown = function (event) {
  if (event.key === ' ') { // Space
    this.$node.click();
  }
};

FlareTail.widget.CheckBox.prototype.onclick = function (event) {
  this.checked = !this.checked;
  this.$node.focus();

  return false;
};

/* ------------------------------------------------------------------------------------------------------------------
 * Radio extends CheckBox
 *
 * [argument] $node (Element) <span role="radio">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Radio = function Radio ($node) {
  this.$node = $node;
};

FlareTail.widget.Radio.prototype = Object.create(FlareTail.widget.CheckBox.prototype);
FlareTail.widget.Radio.prototype.constructor = FlareTail.widget.Radio;

/* ------------------------------------------------------------------------------------------------------------------
 * MenuItemCheckBox extends CheckBox
 *
 * [argument] $node (Element) <li role="menuitemcheckbox">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.MenuItemCheckBox = function MenuItemCheckBox ($node) {
  this.$node = $node;
};

FlareTail.widget.MenuItemCheckBox.prototype = Object.create(FlareTail.widget.CheckBox.prototype);
FlareTail.widget.MenuItemCheckBox.prototype.constructor = FlareTail.widget.MenuItemCheckBox;

/* ------------------------------------------------------------------------------------------------------------------
 * MenuItemRadio extends MenuItemCheckBox
 *
 * [argument] $node (Element) <li role="menuitemradio">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.MenuItemRadio = function MenuItemRadio ($node) {
  this.$node = $node;
};

FlareTail.widget.MenuItemRadio.prototype = Object.create(FlareTail.widget.MenuItemCheckBox.prototype);
FlareTail.widget.MenuItemRadio.prototype.constructor = FlareTail.widget.MenuItemRadio;

/* ------------------------------------------------------------------------------------------------------------------
 * ScrollBar extends Input
 *
 * [argument] $owner (Element) An element to be scrolled
 * [argument] adjusted (Boolean, optional) Adjust the scrolling increment for Grid, Tree, ListBox
 * [argument] arrow_keys_enabled (Boolean, optional) Scroll with up/down arrow keys. Should be false on Grid, Tree and
 *                  ListBox, because those widgets support their own keyboard navigation
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.ScrollBar = function ScrollBar ($owner, adjusted = false, arrow_keys_enabled = true) {
  this.$owner = $owner;
  this.$node = this.$controller = document.createElement('div');
  this.$content = document.createElement('div')

  this.adjusted = adjusted;
  this.arrow_keys_enabled = arrow_keys_enabled;

  this.$owner.style.setProperty('display', 'none', 'important'); // Prevent reflows

  [for ($child of [...this.$owner.children]) this.$content.appendChild($child)];
  this.$content.className = 'scrollable-area-content';

  // On mobile, we can just use native scrollbars, so do not add a custom scrollbar and observers
  if (FlareTail.util.ua.device.mobile) {
    this.$owner.appendChild(this.$content);
    this.$owner.style.removeProperty('display');

    return false;
  }

  this.$content.appendChild(this.get_observer());

  this.$controller.tabIndex = -1;
  this.$controller.style.top = '2px';
  this.$controller.setAttribute('role', 'scrollbar');
  this.$controller.setAttribute('aria-controls', this.$owner.id);
  this.$controller.setAttribute('aria-disabled', 'true');
  this.$controller.setAttribute('aria-valuemin', '0');
  this.$controller.setAttribute('aria-valuenow', '0');

  this.$owner.appendChild(this.$content);
  this.$owner.appendChild(this.$controller);
  this.$owner.appendChild(this.get_observer());
  this.$owner.style.removeProperty('display');

  FlareTail.util.event.bind(this, this.$owner, ['wheel', 'scroll', 'keydown', 'overflow', 'underflow']);
  FlareTail.util.event.bind(this, this.$controller, ['mousedown', 'contextmenu', 'keydown']);

  this.set_height();
};

FlareTail.widget.ScrollBar.prototype = Object.create(FlareTail.widget.Input.prototype);
FlareTail.widget.ScrollBar.prototype.constructor = FlareTail.widget.ScrollBar;

FlareTail.widget.ScrollBar.prototype.onmousedown = function (event) {
  this.scroll_with_mouse(event);
};

FlareTail.widget.ScrollBar.prototype.onmousemove = function (event) {
  this.scroll_with_mouse(event);
};

FlareTail.widget.ScrollBar.prototype.onmouseup = function (event) {
  this.scroll_with_mouse(event);
};

FlareTail.widget.ScrollBar.prototype.onwheel = function (event) {
  event.preventDefault();

  let top = this.$owner.scrollTop + event.deltaY * (event.deltaMode === event.DOM_DELTA_LINE ? 12 : 1);

  if (top < 0) {
    top = 0;
  }

  if (top > this.$owner.scrollTopMax) {
    top = this.$owner.scrollTopMax;
  }

  if (this.$owner.scrollTop !== top) {
    this.$owner.scrollTop = top;
  }
};

FlareTail.widget.ScrollBar.prototype.onscroll = function (event) {
  // Scroll by row
  if (this.adjusted) {
    let rect = this.$owner.getBoundingClientRect(),
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

    top = this.$owner.scrollTop < $elm.offsetTop + $elm.offsetHeight / 2 || !$elm.nextElementSibling
        ? $elm.offsetTop : $elm.nextElementSibling.offsetTop;

    this.$owner.scrollTop = top;
  }

  let st = this.$owner.scrollTop,
      ch = this.$owner.clientHeight,
      sh = this.$owner.scrollHeight,
      ctrl_height = Number.parseInt(this.$controller.style.height),
      ctrl_adj = 0;

  // Consider scrollbar's min-height
  if (ctrl_height < 16) {
    ctrl_adj = 20 - ctrl_height;
  }

  this.$controller.setAttribute('aria-valuenow', st);
  this.$controller.style.top = `${st + 2 + Math.floor((ch - ctrl_adj) * (st / sh))}px`;
};

FlareTail.widget.ScrollBar.prototype.onkeydown = function (event) {
  this.scroll_with_keyboard(event);
};

FlareTail.widget.ScrollBar.prototype.onoverflow = function (event) {
  if (event.target === event.currentTarget) {
    this.set_height();
    this.$controller.setAttribute('aria-disabled', 'false');
    this.$controller.tabIndex = 0;
  }
};

FlareTail.widget.ScrollBar.prototype.onunderflow = function (event) {
  if (event.target === event.currentTarget) {
    this.$controller.setAttribute('aria-disabled', 'true');
    this.$controller.tabIndex = -1;
  }
};

FlareTail.widget.ScrollBar.prototype.scroll_with_mouse = function (event) {
  let FTue = FlareTail.util.event;

  if (event.type === 'mousedown') {
    this.rect = {
      'st': this.$owner.scrollTop,
      'sh': this.$owner.scrollHeight,
      'ch': this.$owner.clientHeight,
      'cy': event.clientY
    };

    FTue.bind(this, window, ['mousemove', 'mouseup']);
  }

  if (event.type === 'mousemove') {
    let delta = this.rect.st + event.clientY - this.rect.cy,
        top = Math.floor(delta * this.rect.sh / this.rect.ch);

    if (top < 0) {
      top = 0;
    }

    if (top > this.$owner.scrollTopMax) {
      top = this.$owner.scrollTopMax;
    }

    if (this.$owner.scrollTop !== top) {
      this.$owner.scrollTop = top;
    }
  }

  if (event.type === 'mouseup') {
    delete this.rect;

    FTue.unbind(this, window, ['mousemove', 'mouseup']);
  }
};

FlareTail.widget.ScrollBar.prototype.scroll_with_keyboard = function (event) {
  let arrow = this.arrow_keys_enabled,
      key = event.key,
      ch = this.$owner.clientHeight;

  switch (key) {
    case 'Tab': {
      return true; // Focus management
    }

    case 'Home':
    case 'End': {
      if (!this.adjusted) {
        this.$owner.scrollTop = key === 'Home' ? 0 : this.$owner.scrollTopMax;
      }

      break;
    }

    case ' ': // Space
    case 'PageUp':
    case 'PageDown': {
      this.$owner.scrollTop += key === 'PageUp' || key === ' ' && event.shiftKey ? -ch : ch;

      break;
    }

    case 'ArrowUp':
    case 'ArrowDown': {
      if (!this.adjusted && (event.target === this.$controller || event.currentTarget === this.$owner && arrow)) {
        this.$owner.scrollTop += key === 'ArrowUp' ? -40 : 40;
      }

      break;
    }
  }

  if (event.target === this.$controller) {
    return FlareTail.util.event.ignore(event);
  }

  return true;
};

FlareTail.widget.ScrollBar.prototype.set_height = function () {
  let sh = this.$owner.scrollHeight,
      ch = this.$owner.clientHeight,
      ctrl_height = Math.floor(ch * ch / sh) - 4;

  this.$controller.style.height = `${ctrl_height < 0 ? 0 : ctrl_height}px`;
  this.$controller.setAttribute('aria-valuemax', this.$owner.scrollTopMax);

  // Reposition the scrollbar
  this.onscroll();
};

FlareTail.widget.ScrollBar.prototype.get_observer = function () {
  let $iframe = document.createElement('iframe');

  $iframe.addEventListener('load', event => {
    let $doc = $iframe.contentDocument;

    $doc.body.style.margin = 0;
    $doc.addEventListener('MozScrolledAreaChanged', event => {
      if (event.height === 0) {
        this.$controller.setAttribute('aria-disabled', 'true');
        this.$controller.tabIndex = -1;
      }

      this.set_height();
    });
  });
  $iframe.className = 'scrollable-area-observer';
  $iframe.tabIndex = -1;
  $iframe.src = 'about:blank';

  return $iframe;
};

/* ------------------------------------------------------------------------------------------------------------------
 * Window (abstract role) extends RoleType
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Window = function Window () {};
FlareTail.widget.Window.prototype = Object.create(FlareTail.widget.RoleType.prototype);
FlareTail.widget.Window.prototype.constructor = FlareTail.widget.Window;

/* ------------------------------------------------------------------------------------------------------------------
 * Dialog extends Window
 *
 * [argument] options (Object) The following options are supported:
 *                  - id (optional)
 *                  - type: alert, confirm or prompt
 *                  - title
 *                  - message
 *                  - button_accept_label (optional)
 *                  - button_cancel_label (optional)
 *                  - onaccept (callback function, optional)
 *                  - oncancel (callback function, optional)
 *                  - value (for prompt, optional)
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Dialog = function Dialog (options) {
  this.id = options.id || Date.now();
  this.type = options.type;
  this.title = options.title;
  this.message = options.message;
  this.button_accept_label = options.button_accept_label || 'OK';
  this.button_cancel_label = options.button_cancel_label || 'Cancel';
  this.onaccept = options.onaccept;
  this.oncancel = options.oncancel;
  this.value = options.value || '';

  this.build();
  this.activate();
};

FlareTail.widget.Dialog.prototype = Object.create(FlareTail.widget.Window.prototype);
FlareTail.widget.Dialog.prototype.constructor = FlareTail.widget.Dialog;

FlareTail.widget.Dialog.prototype.build = function () {
  let $wrapper = this.$wrapper = document.createElement('div'),
      $dialog = this.$dialog = document.createElement('aside'),
      $header = $dialog.appendChild(document.createElement('header')),
      $title,
      $message = $dialog.appendChild(document.createElement('p')),
      $input,
      $footer = $dialog.appendChild(document.createElement('footer')),
      $button_accept,
      $button_cancel;

  $dialog.id = `dialog-${this.id}`;
  $dialog.tabIndex = 0;
  $dialog.setAttribute('role', this.type === 'alert' ? 'alertdialog' : 'dialog');
  $dialog.setAttribute('aria-describedby', `dialog-${this.id}-message`);
  $dialog.setAttribute('aria-modal', 'true');

  if (this.title) {
    $title = $header.appendChild(document.createElement('h2'));
    $title.id = `dialog-${this.id}-title`;
    $title.textContent = this.title;
    $dialog.setAttribute('aria-labelledby', `dialog-${this.id}-title`);
  }

  $message.innerHTML = this.message;
  $message.id = `dialog-${this.id}-message`;

  if (this.type === 'prompt') {
    $input = this.$input = $dialog.insertBefore(document.createElement('input'), $footer);
    $input.value = this.value || '';
    $input.setAttribute('role', 'textbox');
  }

  $button_accept = this.$button_accept = $footer.appendChild((new FlareTail.widget.Button()).node),
  $button_accept.textContent = this.button_accept_label;
  $button_accept.dataset.action = 'accept';
  (new FlareTail.widget.Button($button_accept)).bind('Pressed', event => this.hide('accept'));

  if (this.type !== 'alert') {
    $button_cancel = this.$button_cancel = $footer.appendChild((new FlareTail.widget.Button()).node),
    $button_cancel.textContent = this.button_cancel_label;
    $button_cancel.dataset.action = 'cancel';
    (new FlareTail.widget.Button($button_cancel)).bind('Pressed', event => this.hide('cancel'));
  }

  $wrapper.className = 'dialog-wrapper';
  $wrapper.appendChild($dialog)
};

FlareTail.widget.Dialog.prototype.activate = function () {
  // Add event listeners
  FlareTail.util.event.bind(this, this.$dialog, ['keypress']);
};

FlareTail.widget.Dialog.prototype.onkeypress = function (event) {
  if (event.key === 'Enter') {
    this.hide('accept');
  }

  if (event.key === 'Escape') {
    this.hide('cancel');
  }

  event.stopPropagation();
};

FlareTail.widget.Dialog.prototype.show = function () {
  this.focus_map = new Map();
  this.focus_origial = document.activeElement;

  // Prevent elements outside the dialog being focused
  for (let $node of document.querySelectorAll(':link, [tabindex]')) {
    this.focus_map.set($node, $node.getAttribute('tabindex'));
    $node.tabIndex = -1;
  }

  document.body.appendChild(this.$wrapper);
  this.$dialog.focus();
};

FlareTail.widget.Dialog.prototype.hide = function (action) {
  for (let [$node, tabindex] of this.focus_map) {
    tabindex ? $node.tabIndex = tabindex : $node.removeAttribute('tabindex');
  }

  this.focus_map.clear();
  this.focus_origial.focus();
  this.$wrapper.remove();

  if (action === 'accept' && typeof this.onaccept === 'function') {
    this.onaccept(this.type === 'prompt' ? this.$input.value : null);
  }

  if (action === 'cancel' && typeof this.oncancel === 'function') {
    this.oncancel();
  }
};

/* ------------------------------------------------------------------------------------------------------------------
 * AlertDialog extends Dialog
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.AlertDialog = function AlertDialog (options) {
  options.type = 'alert';

  return new FlareTail.widget.Dialog(options);
};

FlareTail.widget.AlertDialog.prototype = Object.create(FlareTail.widget.Dialog.prototype);
FlareTail.widget.AlertDialog.prototype.constructor = FlareTail.widget.AlertDialog;

/* ------------------------------------------------------------------------------------------------------------------
 * Separator extends Structure
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Separator = function Separator ($node = undefined) {
  if (!$node) {
    $node = document.createElement('div');
    $node.setAttribute('role', 'separator');
  }

  this.$node = $node;
};

FlareTail.widget.Separator.prototype = Object.create(FlareTail.widget.Structure.prototype);
FlareTail.widget.Separator.prototype.constructor = FlareTail.widget.Separator;

/* ------------------------------------------------------------------------------------------------------------------
 * Splitter (custom widget) extends Separator
 *
 * [argument] $splitter (Element) <div class="splitter" role="separator">
 * [return] widget (Object)
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Splitter = function Splitter ($splitter) {
  this.$node = this.$splitter = $splitter;
  this.$outer = $splitter.parentElement;

  let style = ($node, prop) => Number.parseInt(FlareTail.util.style.get($node, prop)),
      orientation = this.$splitter.getAttribute('aria-orientation') || 'horizontal',
      outer_bounds = this.$outer.getBoundingClientRect(),
      outer_size = orientation === 'horizontal' ? outer_bounds.height : outer_bounds.width,
      position = style(this.$splitter, orientation === 'horizontal' ? 'top' : 'left');

  this.grabbed = false;
  this.flex = this.$splitter.dataset.flex !== 'false';

  this.outer = {
    'id': this.$outer.id,
    'top': outer_bounds.top,
    'left': outer_bounds.left,
    get size () {
      // The dimension of the element can be changed when the window is resized.
      // Return the current width or height
      let rect = this.$outer.getBoundingClientRect();

      return this.data.orientation === 'horizontal' ? rect.height : rect.width;
    },
  };

  this.data = new Proxy({
    orientation,
    'position': this.flex ? `${(position / outer_size * 100).toFixed(2)}%` : `${position}px`,
  }, {
    'set': (obj, prop, value) => {
      if (prop === 'orientation') {
        this.data.position = 'default';
        this.$splitter.setAttribute('aria-orientation', value);
      }

      if (prop === 'position') {
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

          value = !this.before.min || this.before.collapsible ? 0 : this.before.min;
        } else if (value >= this.outer.size || value === '100%') {
          if (obj.position === '100%') {
            return;
          }

          value = !this.after.min || this.after.collapsible ? '100%' : this.outer.size - this.after.min;
        } else if (this.before.min && value < this.before.min) {
          // Reached min-height of the before element
          if (!this.before.expanded) {
            return;
          }

          if (this.before.collapsible) {
            this.before.expanded = false;
            value = 0;
          } else {
            value = this.before.min;
          }
        } else if (!this.before.expanded) {
          this.before.expanded = true;
          value = this.before.min;
        } else if (this.before.max && value > this.before.max) {
          value = this.before.max;
        } else if (this.after.min && this.outer.size - value < this.after.min) {
          // Reached min-height of the after element
          if (!this.after.expanded) {
            return;
          }

          if (this.after.collapsible) {
            this.after.expanded = false;
            value = '100%';
          } else {
            value = this.outer.size - this.after.min;
          }
        } else if (!this.after.expanded) {
          this.after.expanded = true;
          value = this.outer.size - this.after.min;
        } else if (this.after.max && this.outer.size - value > this.after.max) {
          value = this.outer.size - this.after.max;
        }

        if (value) {
          if (String(value).match(/^\d+$/)) {
            value = this.flex ? `${(value / this.outer.size * 100).toFixed(2)}%` : `${value}px`;
          }

          this.before.$node.style.setProperty(this.data.orientation === 'horizontal' ? 'height' : 'width', value);
          this.trigger('Resized', { 'position': value });
        }
      }

      obj[prop] = value;

      return true;
    }
  });

  // Add event listeners
  FlareTail.util.event.bind(this, this.$node, ['mousedown', 'contextmenu', 'keydown']);

  for (let [i, id] of this.$splitter.getAttribute('aria-controls').split(/\s+/).entries()) {
    let $target = document.getElementById(id),
        position = i === 0 ? 'before' : 'after';

    this[position] = {
      id,
      '$item': $target,
      'collapsible': $target.hasAttribute('aria-expanded'),
      get expanded () {
        return $target.getAttribute('aria-expanded') !== 'false';
      },
      set expanded () {
        $target.setAttribute('aria-expanded', value);
      },
      get min () {
        return style($target, `min-${this.data.orientation === 'horizontal' ? 'height' : 'width'}`);
      },
      get max () {
        return style($target, `max-${this.data.orientation === 'horizontal' ? 'height' : 'width'}`);
      },
    };
  };
};

FlareTail.widget.Splitter.prototype = Object.create(FlareTail.widget.Separator.prototype);
FlareTail.widget.Splitter.prototype.constructor = FlareTail.widget.Splitter;

FlareTail.widget.Splitter.prototype.onmousedown = function (event) {
  if (event.buttons > 1) {
    event.preventDefault();

    return;
  }

  this.$splitter.setAttribute('aria-grabbed', 'true');
  this.grabbed = true;

  this.$outer.dataset.splitter = this.data.orientation;

  // Add event listeners
  FlareTail.util.event.bind(this, window, ['mousemove', 'mouseup']);
};

FlareTail.widget.Splitter.prototype.onmousemove = function (event) {
  if (!this.grabbed) {
    return;
  }

  this.data.position = this.data.orientation === 'horizontal'
                     ? event.clientY - this.outer.top : event.clientX - this.outer.left;
};

FlareTail.widget.Splitter.prototype.onmouseup = function (event) {
  if (!this.grabbed) {
    return;
  }

  this.grabbed = false;
  this.$splitter.setAttribute('aria-grabbed', 'false');

  // Cleanup
  FlareTail.util.event.unbind(this, document.body, ['mousemove', 'mouseup']);

  delete this.$outer.dataset.splitter;
};

FlareTail.widget.Splitter.prototype.onkeydown = function (event) {
  let value = null,
      position = this.data.position;

  switch (event.key) {
    case 'Home': {
      value = !this.before.min || this.before.collapsible ? 0 : this.before.min;

      break;
    }

    case 'End': {
      value = !this.after.min || this.after.collapsible ? '100%' : this.outer.size - this.after.min;

      break;
    }

    case 'PageUp':
    case 'ArrowUp':
    case 'ArrowLeft': {
      let delta = event.key === 'PageUp' || event.shiftKey ? 50 : 10;

      if (position === '100%') {
        value = this.outer.size - (this.after.min || delta);
      } else if (Number.parseInt(position) !== 0) {
        value = (this.flex ? this.outer.size * Number.parseFloat(position) / 100 : Number.parseInt(position)) - delta;
      }

      break;
    }

    case 'PageDown':
    case 'ArrowDown':
    case 'ArrowRight': {
      let delta = event.key === 'PageDown' || event.shiftKey ? 50 : 10;

      if (Number.parseInt(position) === 0) {
        value = this.before.min || delta;
      } else if (position !== '100%') {
        value = (this.flex ? this.outer.size * Number.parseFloat(position) / 100 : Number.parseInt(position)) + delta;
      }

      break;
    }
  }

  if (value !== null) {
    this.data.position = value;
  }
};

/* ------------------------------------------------------------------------------------------------------------------
 * Region extends Section
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Region = function Region () {};
FlareTail.widget.Region.prototype = Object.create(FlareTail.widget.Section.prototype);
FlareTail.widget.Region.prototype.constructor = FlareTail.widget.Region;

/* ------------------------------------------------------------------------------------------------------------------
 * TabPanel extends Region
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.TabPanel = function TabPanel ($node = undefined) {
  if (!$node) {
    $node = document.createElement('div');
    $node.tabIndex = -1;
    $node.setAttribute('role', 'tabpanel');
  }

  this.$node = $node;
};

FlareTail.widget.TabPanel.prototype = Object.create(FlareTail.widget.TabPanel.prototype);
FlareTail.widget.TabPanel.prototype.constructor = FlareTail.widget.Region;

/* ------------------------------------------------------------------------------------------------------------------
 * Tooltip extends Section
 * ------------------------------------------------------------------------------------------------------------------ */

FlareTail.widget.Tooltip = function Tooltip () {};
FlareTail.widget.Tooltip.prototype = Object.create(FlareTail.widget.Section.prototype);
FlareTail.widget.Tooltip.prototype.constructor = FlareTail.widget.Tooltip;
