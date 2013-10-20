/**
 * WAI-ARIA-based accessible app widget library
 * Copyright © 2012 BriteGrid. All rights reserved.
 * Using: ECMAScript Harmony
 * Requires: Firefox 18
 */

'use strict';

let BriteGrid = BriteGrid || {};
BriteGrid.widget = {};

/* --------------------------------------------------------------------------
 * RoleType (top level abstract role)
 * -------------------------------------------------------------------------- */

BriteGrid.widget.RoleType = function () {};

BriteGrid.widget.RoleType.prototype.activate = function (rebuild) {
  let $container = this.view.$container;
  if (!$container) {
    throw new Error('The container element is not defined');
  }

  this.options = this.options || {};
  this.options.item_roles = this.options.item_roles || [];
  this.options.selected_attr = this.options.selected_attr || 'aria-selected';
  this.options.multiselectable = $container.mozMatchesSelector('[aria-multiselectable="true"]');

  let get_items = function (selector) {
    // Convert NodeList to Array for convenience in operation
    return Array.slice($container.querySelectorAll(selector));
  };

  let selector = this.options.item_selector,
      not_selector = ':not([aria-disabled="true"]):not([aria-hidden="true"])',
      members  = this.view.members
               = get_items(selector + not_selector),
      selected = this.view.selected
               = get_items(selector + '[' + this.options.selected_attr + '="true"]');

  // Focus Management
  for (let $item of members) {
    $item.tabIndex = -1;
  }
  if (members.length) {
    members[0].tabIndex = 0;
  }
  $container.removeAttribute('tabindex');

  this.data = this.data || {};

  if (rebuild) {
    return;
  }

  if (this.update_view) {
    this.view = new Proxy(this.view, {
      set: this.update_view.bind(this)
    });
  }

  // Add event listeners
  let BGue = BriteGrid.util.event;
  BGue.bind(this, $container, [
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
  BGue.bind(this, $container, [
    // FocusEvent
    'focus', 'blur',
  ], true); // Set use_capture true to catch events on descendants

  let observer = new MutationObserver(function (mutations) {
    for (let mutation of mutations) {
      let $item = mutation.target;

      if (mutation.type === 'attributes') {
        this.view.members = get_items(selector + not_selector);
        let index = this.view.selected.indexOf($item);
        if ($item.getAttribute(mutation.attributeName) === 'true' && index > -1) {
          // Remove the hidden/disabled item from selection
          this.view.selected = Array.slice(this.view.selected).splice(index, 1);
        }
        this.view.$focused = null;
      }

      if (mutation.type === 'childList') {
        // TODO: Update the member list when an element is added or removed
      }
    }
  }.bind(this));
  observer.observe($container, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-hidden', 'aria-disabled']
  });

  return;
};

// Catch-all event handler
BriteGrid.widget.RoleType.prototype.handleEvent = function (event) {
  let handler = this['on' + event.type + '_extend'] || this['on' + event.type];
  handler.call(this, event);
};

BriteGrid.widget.RoleType.prototype.oncontextmenu = function (event) {
  // Disable browser's context menu
  return BriteGrid.util.event.ignore(event);
};

/* --------------------------------------------------------------------------
 * Structure (abstract role) extends RoleType
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Structure = function () {};
BriteGrid.widget.Structure.prototype = Object.create(BriteGrid.widget.RoleType.prototype);

/* --------------------------------------------------------------------------
 * Section (abstract role) extends Structure
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Section = function () {};
BriteGrid.widget.Section.prototype = Object.create(BriteGrid.widget.Structure.prototype);

/* --------------------------------------------------------------------------
 * Widget (abstract role) extends RoleType
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Widget = function () {};
BriteGrid.widget.Widget.prototype = Object.create(BriteGrid.widget.RoleType.prototype);

/* --------------------------------------------------------------------------
 * Command (abstract role) extends Widget
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Command = function () {};
BriteGrid.widget.Command.prototype = Object.create(BriteGrid.widget.Widget.prototype);

/* --------------------------------------------------------------------------
 * Button extends Command
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Button = function ($button) {
  this.view = {
    $button: $button
  };

  this.data = new Proxy({
    disabled: $button.mozMatchesSelector('[aria-disabled="true"]'),
    pressed: $button.mozMatchesSelector('[aria-pressed="true"]')
  },
  {
    set: function (obj, prop, value) {
      if (prop === 'disabled' || prop === 'pressed') {
        $button.setAttribute('aria-' + prop, value);
      }
      obj[prop] = value;
    }
  });

  this.options = {
    toggle: $button.hasAttribute('aria-pressed')
  };

  BriteGrid.util.event.bind(this, $button, ['click', 'keydown']);
};

BriteGrid.widget.Button.prototype = Object.create(BriteGrid.widget.Command.prototype);

BriteGrid.widget.Button.prototype.onclick = function (event) {
  BriteGrid.util.event.ignore(event);

  if (this.data.disabled) {
    return;
  }

  if (this.options.toggle) {
    this.data.pressed = !this.data.pressed;
  }

  this.view.$button.dispatchEvent(new CustomEvent('Pressed'));
};

BriteGrid.widget.Button.prototype.onkeydown = function (event) {
  if (event.keyCode === event.DOM_VK_SPACE) {
    this.onclick(event);
  }
};

/* --------------------------------------------------------------------------
 * Composite (abstract role) extends Widget
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Composite = function () {};
BriteGrid.widget.Composite.prototype = Object.create(BriteGrid.widget.Widget.prototype);

BriteGrid.widget.Composite.prototype.onfocus = function (event) {
  if (this.view.members.indexOf(event.target) > -1 && event.target.id) {
    this.view.$container.setAttribute('aria-activedescendant', event.target.id);
  } else {
    this.view.$container.removeAttribute('aria-activedescendant');
  }
};

BriteGrid.widget.Composite.prototype.onblur = function (event) {
  this.view.$container.removeAttribute('aria-activedescendant');

  BriteGrid.util.event.ignore(event);
};

BriteGrid.widget.Composite.prototype.onmousedown = function (event) {
  if (this.view.members.indexOf(event.target) === -1 || event.button !== 0) {
    return;
  }

  this.select_with_mouse(event);
};

BriteGrid.widget.Composite.prototype.onkeydown = function (event) {
  this.select_with_keyboard(event);
};

BriteGrid.widget.Composite.prototype.select_with_mouse = function (event) {
  let $target = event.target,
      $container = this.view.$container,
      items = this.view.members,
      selected = Array.slice(this.view.selected),
      multi = this.options.multiselectable;

  if (event.shiftKey && multi) {
    let start = items.indexOf(selected[0]),
        end = items.indexOf($target);
    if (start < end) {
      selected = items.slice(start, end + 1);
    } else {
      selected = items.slice(end, start + 1);
      selected.reverse();
    }
  } else if (event.ctrlKey || event.metaKey) {
    if (multi && selected.indexOf($target) === -1) {
      // Add the item to selection
      selected.push($target);
    } else if (selected.indexOf($target) > -1) {
      // Remove the item from selection
      selected.splice(selected.indexOf($target), 1);
    }
  } else {
    selected = [$target];
  }

  this.view.selected = selected;
  this.view.$focused = selected[selected.length - 1];
};

BriteGrid.widget.Composite.prototype.select_with_keyboard = function (event) {
  let kcode = event.keyCode;

  // Focus shift with tab key
  if (kcode === event.DOM_VK_TAB) {
    return true;
  }

  // Do nothing if Alt key is pressed
  if (event.altKey) {
    return BriteGrid.util.event.ignore(event);
  }

  let items = this.view.members,
      selected = Array.slice(this.view.selected), // Clone the array
      selected_idx = items.indexOf(selected[0]),
      $focused = this.view.$focused,
      focused_idx = items.indexOf($focused),
      options = this.options,
      ctrl = event.ctrlKey || event.metaKey,
      cycle = options.focus_cycling,
      multi = options.multiselectable,
      expanding = multi && event.shiftKey;

  switch (kcode) {
    case event.DOM_VK_SPACE: {
      if (ctrl) {
        break; // Move focus only
      }
      if (!multi) {
        this.view.selected = $focused;
        break;
      }
      if (selected.indexOf($focused) === -1) {
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

    case event.DOM_VK_HOME:
    case event.DOM_VK_PAGE_UP: {
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

    case event.DOM_VK_END:
    case event.DOM_VK_PAGE_DOWN: {
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

    case event.DOM_VK_UP:
    case event.DOM_VK_LEFT: {
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
      if (selected.indexOf($focused) === -1) {
        // Create new range
        this.view.selected = items.slice(focused_idx - 1, focused_idx + 1).reverse();
      } else if (selected.indexOf(items[focused_idx - 1]) === -1) {
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

    case event.DOM_VK_DOWN:
    case event.DOM_VK_RIGHT: {
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
      if (selected.indexOf($focused) === -1) {
        // Create new range
        this.view.selected = items.slice(focused_idx, focused_idx + 2);
      } else if (selected.indexOf(items[focused_idx + 1]) === -1) {
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
      if (ctrl && kcode === event.DOM_VK_A) {
        this.view.selected = items;
        this.view.$focused = items[0];
        break;
      }

      if (ctrl || !options.search_enabled) {
        break;
      }

      // Find As You Type: Incremental Search for simple list like ListBox or Tree
      let input = String.fromCharCode(kcode),
          char = this.data.search_key || '';
      char = char === input ? input : char + input;
      let pattern = new RegExp('^' + char, 'i');
      let get_label = function ($item) {
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
        if (i === items.length) {
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
        if (start < end) {
          selected = items.slice(start, end + 1);
        } else {
          selected = items.slice(end, start + 1);
          selected.reverse();
        }
        this.view.selected = selected;
      }

      // Remember the searched character(s) for later
      this.data.search_key = char;

      // Forget the character(s) after 1.5s
      window.setTimeout(function () {
        delete this.data.search_key;
      }.bind(this), 1500);
    }
  }

  return BriteGrid.util.event.ignore(event);
};

BriteGrid.widget.Composite.prototype.update_view = function (obj, prop, newval) {
  let attr = this.options.selected_attr,
      oldval = obj[prop];

  // console.dir({ prop: prop, oldval: oldval, newval: newval });

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

    this.view.$container.dispatchEvent(new CustomEvent('Selected', {
      detail: {
        items: newval,
        ids: newval ? newval.map(function ($item) $item.dataset.id) : []
      }
    }));
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
};

/* --------------------------------------------------------------------------
 * Grid extends Composite
 *
 * @param   {Element} $container <table role="grid">
 * @param   {Object} optional data including columns, rows and order
 * @options attributes on the grid element:
 *           * aria-multiselectable: the default is true
 *           * aria-readonly: the default is false
 *          attributes on the columnheader elements:
 *           * draggable: if false, the row cannot be reordered
 *           * data-key: true/false, whether the key column or not
 *           * data-type: string (default), integer or boolean
 *          an attribute on the row elements:
 *           * aria-selected: if the attribute is set on the rows, the grid
 *                            will be like a thread pane in an email client
 *          an attribute on the gridcell elements:
 *           * aria-selected: if the attribute is set on the cells, the grid
 *                            will be like a spreadsheet application
 * @returns {Object} the widget
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Grid = function ($container, data, options) {
  // What can be selected on the grid
  let dataset = $container.dataset,
      role = data ? 'row'
                  : $container.querySelector('.grid-body [role="row"]')
                              .hasAttribute('aria-selected') ? 'row' : 'gridcell';

  // If the role is gridcell, the navigation management should be different
  if (role === 'gridcell') {
    throw new Error('Unimplemented role: gridcell');
  }

  this.view = {
    $container: $container,
  };

  if (data) {
    this.data = data;
    this.options = options;
    this.options.item_roles = [role];
    this.options.item_selector = '.grid-body [role="' + role + '"]';
    // Build table from the given data
    this.data.columns = data.columns;
    this.data.rows = data.rows;
    this.build_header();
    this.build_body();
  } else {
    this.view.$header = $container.querySelector('.grid-header');
    this.view.$body = $container.querySelector('.grid-body');
    this.data = {
      columns: [],
      rows: []
    };
    this.options = {
      item_roles: [role],
      item_selector: '.grid-body [role="' + role + '"]',
      sortable: dataset.sortable === 'false' ? false : true,
      reorderable: dataset.reorderable === 'false' ? false : true
    };
    // Retrieve data from the static table
    this.get_data();
  }

  // Columnpicker
  this.init_columnpicker();

  this.activate();
  this.activate_extend();
};

BriteGrid.widget.Grid.prototype = Object.create(BriteGrid.widget.Composite.prototype);

BriteGrid.widget.Grid.prototype.activate_extend = function () {
  this.view = new Proxy(this.view, {
    set: function (obj, prop, value) {
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
    }
  });

  this.options.sort_conditions = new Proxy(this.options.sort_conditions, {
    set: this.sort.bind(this)
  });


  this.activate_columns();
  this.activate_rows();
};

BriteGrid.widget.Grid.prototype.activate_columns = function () {
  let columns = this.data.columns = new Proxy(this.data.columns, {
    get: function (obj, prop) {
      // The default behavior
      if (prop in obj) {
        return obj[prop];
      }

      // Extension: Find column by id
      let col;
      for (let o of obj) if (o.id === prop) {
        col = o;
        break;
      }
      return col;
    }
  });

  // Handler to show/hide column
  let handler = {
    get: function (obj, prop) {
      let value;

      switch (prop) {
        case 'index': {
          value = obj.$element.cellIndex;
          break;
        }
        case 'width': {
          value = parseInt(BriteGrid.util.style.get(obj.$element, 'width'));
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
    set: function (obj, prop, value) {
      switch (prop) {
        case 'hidden': {
          // Reflect the change of row's visibility to UI
          if (value === true) {
            this.hide_column(obj);
          } else {
            this.show_column(obj);
          }
          // Fire an event
          this.view.$container.dispatchEvent(new CustomEvent('ColumnModified', {
            detail: { columns: columns }
          }));
          break;
        }
      }

      obj[prop] = value;
    }.bind(this)
  };

  for (let [i, col] of Iterator(columns)) {
    columns[i] = new Proxy(col, handler);
  }
};

BriteGrid.widget.Grid.prototype.activate_rows = function () {
  let handler = {
    set: function (obj, prop, value) {
      // Reflect Data change into View
      let row = this.data.rows.filter(function (row) row.data.id === obj.id)[0],
          $elm = row.$element.querySelector('[data-id="' + prop + '"] > *');
      if (this.data.columns[prop].type === 'boolean') {
        $elm.setAttribute('aria-checked', value);
      } else {
        $elm.textContent = value;
      }
      obj[prop] = value;
    }.bind(this)
  };

  let rows = this.data.rows,
      $grid_body = this.view.$body,
      $tbody = $grid_body.querySelector('tbody');

  for (let row of rows) {
    row.data = new Proxy(row.data, handler);
  }

  // Sort handler
  this.data.rows = new Proxy(rows, {
    // A proxyifixed array needs the get trap even if it's not necessary, or the set trap is not
    // called. This is a regression since Firefox 21 (Bug 876114)
    get: function(obj, prop) {
      return obj[prop];
    },
    set: function (obj, prop, value) {
      if (!isNaN(prop) && value.$element) {
        $tbody.appendChild(value.$element);
      }
      obj[prop] = value;
    }
  });

  // Custom scrollbar
  let mobile_mql = BriteGrid.util.device.mobile.mql,
      scrollbar = this.view.scrollbar
                = new BriteGrid.widget.ScrollBar($grid_body, !mobile_mql.matches);

  mobile_mql.addListener(function (mql) scrollbar.options.adjusted = !mql.matches);
};

BriteGrid.widget.Grid.prototype.onmousedown_extend = function (event) {
  let $target = event.target;

  if ($target.mozMatchesSelector('[role="columnheader"]')) {
    if (event.button === 0 && this.options.reorderable) {
      BriteGrid.util.event.bind(this, window, ['mousemove', 'mouseup']);
    }
    if (event.button === 2) {
      this.build_columnpicker();
    }
    return;
  }

  // Editable checkbox in cells
  if ($target.mozMatchesSelector('[role="checkbox"]')) {
    let index = $target.parentElement.parentElement.sectionRowIndex,
        id = $target.parentElement.dataset.id,
        value = !$target.mozMatchesSelector('[aria-checked="true"]');
    this.data.rows[index].data[id] = value;
    return BriteGrid.util.event.ignore(event);
  }

  // The default behavior
  this.onmousedown(event);
};

BriteGrid.widget.Grid.prototype.onmousemove = function (event) {
  if (!this.data.drag) {
    this.start_column_reordering(event);
  } else {
    this.continue_column_reordering(event);
  }
};

BriteGrid.widget.Grid.prototype.onmouseup = function (event) {
  BriteGrid.util.event.ignore(event);
  BriteGrid.util.event.unbind(this, window, ['mousemove', 'mouseup']);

  if (event.button !== 0) {
    return;
  }

  if (this.data.drag) {
    this.stop_column_reordering(event);
    return;
  }

  let $target = event.target,
      options = this.options;

  if ($target.mozMatchesSelector('[role="columnheader"]') && options.sortable) {
    options.sort_conditions.key = $target.dataset.id;
  }
};

BriteGrid.widget.Grid.prototype.onkeydown_extend = function (event) {
  let kcode = event.keyCode;

  // Focus shift with tab key
  if (kcode === event.DOM_VK_TAB) {
    return true;
  }

  let items = this.view.members,
      focused_idx = items.indexOf(this.view.$focused),
      modifiers = event.shiftKey || event.ctrlKey || event.metaKey || event.altKey;

  switch (kcode) {
    case event.DOM_VK_LEFT:
    case event.DOM_VK_RIGHT: {
      // Do nothing
      break;
    }
    case event.DOM_VK_PAGE_UP:
    case event.DOM_VK_PAGE_DOWN:
    case event.DOM_VK_SPACE: {
      // Handled by the ScrollBar widget
      return true;
    }
    case event.DOM_VK_B: {
      if (!modifiers && focused_idx > 0) {
        this.view.selected = this.view.$focused = items[focused_idx - 1];
      }
      break;
    }
    case event.DOM_VK_F: {
      if (!modifiers && focused_idx < items.length - 1) {
        this.view.selected = this.view.$focused = items[focused_idx + 1];
      }
      break;
    }
    default: {
      // The default behavior
      this.onkeydown(event);
    }
  }

  return BriteGrid.util.event.ignore(event);
};

BriteGrid.widget.Grid.prototype.build_header = function () {
  let $grid = this.view.$container,
      cond = this.options.sort_conditions;

  let $grid_header = this.view.$header = document.createElement('header'),
      $table = $grid_header.appendChild(document.createElement('table')),
      $colgroup = $table.appendChild(document.createElement('colgroup')),
      $row = $table.createTBody().insertRow(-1),
      $_col = document.createElement('col'),
      $_cell = document.createElement('th');

  $_cell.scope = 'col';
  $_cell.setAttribute('role', 'columnheader'); 
  $_cell.appendChild(document.createElement('label'));

  for (let column of this.data.columns) {
    let $col = $colgroup.appendChild($_col.cloneNode());
    $col.dataset.id = column.id || '';
    $col.dataset.hidden = column.hidden === true;

    let $cell = column.$element = $row.appendChild($_cell.cloneNode());
    $cell.firstElementChild.textContent = column.label;
    $cell.title = column.title || 'Click to sort by ' + column.label; // l10n
    if (cond && column.id === cond.key) {
      $cell.setAttribute('aria-sort', cond.order);
    }
    $cell.dataset.id = column.id;
    $cell.dataset.type = column.type || 'string';
    if (column.key === true) {
      $cell.dataset.key = 'true';
    }
  }

  $grid_header.id = $grid.id + '-header';
  $grid_header.className = 'grid-header';
  $row.setAttribute('role', 'row');
  $grid.appendChild($grid_header);
};

BriteGrid.widget.Grid.prototype.build_body = function (row_data) {
  let $grid = this.view.$container;

  if (row_data) {
    // Refresh the tbody with the passed data
    this.data.rows = row_data;
    this.view.$body.remove();
  }

  let $grid_body = this.view.$body = document.createElement('div'),
      $table = $grid_body.appendChild(document.createElement('table')),
      $colgroup = $table.appendChild($grid.querySelector('.grid-header colgroup').cloneNode()),
      $tbody = $table.createTBody(),
      cond = this.options.sort_conditions,
      row_prefix = $grid.id + '-row-';

  // Sort the data first
  this.sort(cond, 'key', cond.key, null, true);

  // Create a template row
  let $_row = document.createElement('tr');
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
      $cell.appendChild(document.createElement((column.type === 'time') ? 'time' : 'label'));
    }
    $cell.dataset.id = column.id;
    $cell.dataset.type = column.type;
  }

  for (let row of this.data.rows) {
    let $row = row.$element = $tbody.appendChild($_row.cloneNode());
    $row.id = row_prefix + row.data.id;
    $row.dataset.id = row.data.id;
    // Custom data
    if (row.dataset && Object.keys(row.dataset).length) {
      for (let [prop, value] of Iterator(row.dataset)) {
        $row.dataset[prop] = value;
      }
    }

    for (let [i, column] of Iterator(this.data.columns)) {
      let $child = $row.cells[i].firstElementChild,
          value = row.data[column.id];
      if (column.type === 'boolean') {
        $child.setAttribute('aria-checked', value === true);
      } else if (column.type === 'time') {
        // TODO: add a pref to use PST
        $child.textContent = BriteGrid.util.i18n.format_date(value);
        $child.dateTime = value;
      } else {
        $child.textContent = value;
      }
    }
  }    

  $grid_body.id = $grid.id + '-body';
  $grid_body.className = 'grid-body';
  $grid_body.tabIndex = -1;
  $grid.appendChild($grid_body);

  if (row_data) {
    this.view.members = Array.slice($grid.querySelectorAll(this.options.item_selector));
    this.activate_rows();
    $grid.dispatchEvent(new CustomEvent('Rebuilt'));
  }
};

BriteGrid.widget.Grid.prototype.get_data = function () {
  let $header = this.view.$header,
      $tbody = this.view.$body.querySelector('tbody'),
      $sorter = $header.querySelector('[role="columnheader"][aria-sort]'),
      cells = [],
      rows = [];

  // Sort conditions
  if (this.options.sortable && $sorter) {
    this.options.sort_conditions = {
      key: $sorter.dataset.id || null,
      order: $sorter.getAttribute('aria-sort') || 'none'
    };
  }

  // Fill the column database
  for (let $cell of $header.querySelector('[role="row"]').cells) {
    cells.push({
      id: $cell.dataset.id,
      type: $cell.dataset.type || 'string',
      label: $cell.textContent,
      hidden: false,
      key: $cell.dataset.key ? true : false,
      $element: $cell
    });
  }
  this.data.columns = cells;

  // Fill the row database
  for (let $row of this.view.$body.querySelectorAll('[role="row"]')) {
    let row = {
      id: $row.id,
      $element: $row,
      data: {}
    };

    for (let [index, $cell] of Iterator($row.cells)) {
      let column = this.data.columns[index],
          value,
          normalized_value;
      switch (column.type) {
        case 'integer': {
          value = parseInt($cell.textContent);
          break;
        }
        case 'boolean': { // checkbox
          value = $cell.querySelector('[role="checkbox"]').mozMatchesSelector('[aria-checked="true"]');
          break;
        }
        default: { // string
          value = $cell.textContent;
        }
      }
      row.data[column.id] = value;
    };

    rows.push(row);
  }

  this.data.rows = rows;
};

BriteGrid.widget.Grid.prototype.sort = function (cond, prop, value, receiver, data_only = false) {
  let $grid = this.view.$container,
      $tbody = this.view.$body.querySelector('tbody'),
      $header = this.view.$header;

  if (data_only) {
    cond.order = cond.order || 'ascending';
  } else if (prop === 'order') {
    cond.order = value;
  } else if (prop === 'key' && cond.key === value) {
    // The same column is selected; change the order
    cond.order = cond.order === 'ascending' ? 'descending' : 'ascending';
  } else {
    cond.key = value;
    cond.order = 'ascending';
    $header.querySelector('[aria-sort]').removeAttribute('aria-sort');
  }

  let $sorter = $header.querySelector('[role="columnheader"][data-id="' + cond.key + '"]'),
      type = $sorter.dataset.type;

  $tbody.setAttribute('aria-busy', 'true'); // display: none

  // Normalization: ignore brackets for comparison
  let nomalized_values = new Map(),
      nomalize = function (str) {
        let value = nomalized_values.get(str);
        if (!value) {
          value = str.replace(/[\"\'\(\)\[\]\{\}<>«»_]/g, '').toLowerCase();
          nomalized_values.set(str, value);
        }
        return value;
      };

  this.data.rows.sort(function (a, b) {
    if (cond.order === 'descending') {
      [a, b] = [b, a]; // reverse()
    }
    let a_val = a.data[cond.key],
        b_val = b.data[cond.key];
    switch (type) {
      case 'integer': {
        return a_val > b_val;
      }
      case 'boolean': {
        return a_val < b_val;
      }
      default: {
        return nomalize(a_val) > nomalize(b_val);
      }
    }
  });

  $tbody.removeAttribute('aria-busy');
  $sorter.setAttribute('aria-sort', cond.order);

  // Reorder the member list
  this.view.members = Array.slice($grid.querySelectorAll(this.options.item_selector));

  let selected = this.view.selected;
  if (!data_only && selected && selected.length) {
    this.ensure_row_visibility(selected[selected.length - 1]);
  }

  // Fire an event
  $grid.dispatchEvent(new CustomEvent('Sorted', {
    // Clone cond as it's a proxyfied object
    detail: { conditions: BriteGrid.util.object.clone(cond) }
  }));
};

BriteGrid.widget.Grid.prototype.init_columnpicker = function () {
  let $picker = document.createElement('ul');
  $picker.id = this.view.$container.id + '-columnpicker';
  $picker.setAttribute('role', 'menu');
  $picker.setAttribute('aria-expanded', 'false');
  $picker.addEventListener('MenuItemSelected', function (event) {
    this.toggle_column(event.explicitOriginalTarget.dataset.id);
  }.bind(this), false);

  let $header = this.view.$header;
  $header.appendChild($picker);
  $header.setAttribute('aria-owns', $picker.id);

  this.view.$columnpicker = $picker;
  this.data.columnpicker = new BriteGrid.widget.Menu($picker);
};

BriteGrid.widget.Grid.prototype.build_columnpicker = function () {
  let data = [],
      id_prefix = this.view.$container.id + '-columnpicker-';

  for (let col of this.data.columns) {
    data.push({
      id: id_prefix + col.id,
      label: col.label,
      type: 'menuitemcheckbox',
      disabled: col.key === true,
      checked: !col.hidden,
      data: {
        id: col.id
      }
    });
  }

  this.data.columnpicker.build(data);
};

BriteGrid.widget.Grid.prototype.toggle_column = function (id) {
  // Find column by id, thanks to Proxy
  let col = this.data.columns[id];
  col.hidden = !col.hidden;
};

BriteGrid.widget.Grid.prototype.show_column = function (col) {
  let $grid = this.view.$container,
      attr = '[data-id="' + col.id + '"]';

  $grid.querySelector('[role="columnheader"]' + attr).removeAttribute('aria-hidden');

  for (let $cell of $grid.querySelectorAll('[role="gridcell"]' + attr)) {
    $cell.removeAttribute('aria-hidden');
  }

  for (let $col of $grid.querySelectorAll('col' + attr)) {
    delete $col.dataset.hidden;
  }
};

BriteGrid.widget.Grid.prototype.hide_column = function (col) {
  let $grid = this.view.$container,
      attr = '[data-id="' + col.id + '"]';

  for (let $col of $grid.querySelectorAll('col' + attr)) {
    $col.dataset.hidden = 'true';
  }

  $grid.querySelector('[role="columnheader"]' + attr).setAttribute('aria-hidden', 'true');

  for (let $cell of $grid.querySelectorAll('[role="gridcell"]' + attr)) {
    $cell.setAttribute('aria-hidden', 'true');
  }
};

BriteGrid.widget.Grid.prototype.ensure_row_visibility = function ($row) {
  let $outer = this.view.$container.querySelector('.grid-body');

  if (!$outer) {
    return;
  }

  let ost = $outer.scrollTop,
      ooh = $outer.offsetHeight,
      rot = $row.offsetTop,
      roh = $row.offsetHeight;

  if (ost > rot) {
    $row.scrollIntoView(true);
  }

  if (ost + ooh < rot + roh) {
    $row.scrollIntoView(false);
  }
};

BriteGrid.widget.Grid.prototype.start_column_reordering = function (event) {
  let $grid = this.view.$container,
      $container = document.createElement('div'),
      $_image = document.createElement('canvas'),
      $follower,
      headers = [],
      rect = $grid.getBoundingClientRect(),
      style = $container.style;

  event.target.dataset.grabbed = 'true';

  $container.id = 'column-drag-image-container';
  style.top = rect.top + 'px';
  style.left = rect.left + 'px';
  style.width = $grid.offsetWidth + 'px';
  style.height = $grid.offsetHeight + 'px';

  let handler = {
    set: function (obj, prop, value) {
      if (prop === 'left') {
        let $image = document.getElementById('column-drag-image-' + obj.index);
        if ($image.className !== 'follower') {
          $image.style.left = value + 'px';
        }
      }
      obj[prop] = value;
    }
  };

  for (let $chead of this.view.$header.querySelectorAll('[role="columnheader"]')) {
    let $image = $container.appendChild($_image.cloneNode()),
        left = $chead.offsetLeft,
        width = $chead.offsetWidth,
        index = $chead.cellIndex,
        style = $image.style;

    $image.id = 'column-drag-image-' + index;
    style.left = left + 'px';
    style.width = width + 'px';
    style.height = $grid.offsetHeight + 'px';
    style.background = '-moz-element(#' + $grid.id + ') -' + left + 'px 0';

    if ($chead.dataset.grabbed === 'true') {
      // The follower shows the dragging position
      $follower = $image;
      $image.className = 'follower';
      this.data.drag = {
        $container: $container,
        $header: $chead,
        $follower: $follower,
        start_index: index,
        current_index: index,
        start_left: event.clientX - left,
        row_width: width,
        grid_width: $grid.offsetWidth,
      };
    }

    headers.push(new Proxy({
      index: index,
      left: left,
      width: width
    }, handler));
  }    

  this.data.drag.headers = headers;
  document.body.appendChild($container);
  $grid.querySelector('[role="scrollbar"]').setAttribute('aria-hidden', 'true')
};

BriteGrid.widget.Grid.prototype.continue_column_reordering = function (event) {
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
    drag.$follower.style.left = pos + 'px';
  }
};

BriteGrid.widget.Grid.prototype.stop_column_reordering = function (event) {
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
      $colgroup.insertBefore(items[start_idx],
                             items[start_idx > current_idx ? current_idx : current_idx + 1]);
    }
    for (let $row of $grid.querySelectorAll('[role="row"]')) {
      let items = $row.children;
      $row.insertBefore(items[start_idx],
                        items[start_idx > current_idx ? current_idx : current_idx + 1]);
    }
  }

  // Cleanup
  drag.$header.removeAttribute('data-grabbed');
  drag.$container.remove();
  $grid.querySelector('[role="scrollbar"]').removeAttribute('aria-hidden');
  delete this.data.drag;

  // Fire an event
  $grid.dispatchEvent(new CustomEvent('ColumnModified', {
    detail: { columns: columns }
  }));
};

/* --------------------------------------------------------------------------
 * Select (abstract role) extends Composite
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Select = function () {};
BriteGrid.widget.Select.prototype = Object.create(BriteGrid.widget.Composite.prototype);

/* --------------------------------------------------------------------------
 * ComboBox extends Select
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Combobox = function () {};
BriteGrid.widget.Combobox.prototype = Object.create(BriteGrid.widget.Select.prototype);

/* --------------------------------------------------------------------------
 * ListBox extends Select
 *
 * @param   element <menu role="listbox">
 * @param   optional array data
 * @options attributes on the listbox element:
 *           * aria-multiselectable
 * @returns object widget 
 * -------------------------------------------------------------------------- */

BriteGrid.widget.ListBox = function ($container, data) {
  this.view = {
    $container: $container
  };

  this.options = {
    item_roles: ['option'],
    item_selector: '[role="option"]',
    search_enabled: true
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

BriteGrid.widget.ListBox.prototype = Object.create(BriteGrid.widget.Select.prototype);

BriteGrid.widget.ListBox.prototype.build = function () {
  let map = this.data.map = new WeakMap(),
      $fragment = document.createDocumentFragment(),
      $_item = document.createElement('li');

  $_item.tabIndex = -1;
  $_item.setAttribute('role', 'option');
  $_item.appendChild(document.createElement('label'));

  for (let item of this.data.structure) {
    let $item = item.$element = $fragment.appendChild($_item.cloneNode());
    $item.id = item.id;
    $item.setAttribute('aria-selected', item.selected ? 'true' : 'false');
    $item.firstElementChild.textContent = item.label;

    if (item.data) {
      for (let [prop, value] of Iterator(item.data)) {
        $item.dataset[prop] = value;
      }
    }

    // Save the item/obj reference
    map.set($item, item);
  }

  this.view.$container.appendChild($fragment);
};

BriteGrid.widget.ListBox.prototype.get_data = function () {
  let map = this.data.map = new WeakMap(),
      structure = this.data.structure = [];

  for (let $item of this.view.members) {
    let item = {
      $element: $item,
      id: $item.id,
      label: $item.textContent
    };

    if (Object.keys($item.dataset).length) {
      item.data = {};
      for (let [prop, value] of Iterator($item.dataset)) {
        item.data[prop] = value;
      }
    }

    // Save the item/obj reference
    map.set($item, item);
    structure.push(item);
  }
};

/* --------------------------------------------------------------------------
 * Menu extends Select
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Menu = function ($container, data = []) {
  this.view = {
    $container: $container
  };

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

  this.activate();
  this.activate_extend();

  // Context menu
  let $owner = document.querySelector('[aria-owns="' + $container.id + '"]');
  if ($owner && !$owner.mozMatchesSelector('[role="menuitem"]')) {
    this.view.$owner = $owner;
    BriteGrid.util.event.bind(this, $owner, ['contextmenu', 'keydown']);
  }
};

BriteGrid.widget.Menu.prototype = Object.create(BriteGrid.widget.Select.prototype);

BriteGrid.widget.Menu.prototype.activate_extend = function (rebuild = false) {
  // Redefine items
  let not_selector = ':not([aria-disabled="true"]):not([aria-hidden="true"])',
      selector = '#' + this.view.$container.id + ' > li > '
                     + this.options.item_selector + not_selector,
      items = this.view.members = Array.slice(document.querySelectorAll(selector)),
      menus = this.data.menus = new WeakMap();

  for (let $item of items) {
    if ($item.hasAttribute('aria-owns')) {
      let $menu = document.getElementById($item.getAttribute('aria-owns')),
          menu = new BriteGrid.widget.Menu($menu);
      menu.data.parent = this;
      menus.set($item, menu);
    }
  }

  if (rebuild) {
    return;
  }

  this.view = new Proxy(this.view, {
    set: function (obj, prop, newval) {
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
    }
  });
}

BriteGrid.widget.Menu.prototype.onmousedown = function (event) {
  // Open link in a new tab
  if (event.target.href && event.button === 0) {
    event.stopPropagation();
    event.target.target = '_blank';
    return;
  }

  if (event.button !== 0) {
    BriteGrid.util.event.ignore(event);
    return;
  }

  let parent = this.data.parent;
  if (parent && event.target === parent.view.selected[0]) {
    // Just opening the menu
    return;
  }

  if (event.currentTarget === window) {
    this.close(true);
  } else if (!this.data.menus.has(event.target) && this.view.members.indexOf(event.target) > -1) {
    this.select(event)
    this.close(true);
  }

  BriteGrid.util.event.ignore(event);
};

BriteGrid.widget.Menu.prototype.onmouseover = function (event) {
  if (this.view.members.indexOf(event.target) > -1) {
    this.view.selected = this.view.$focused = event.target;
  }

  BriteGrid.util.event.ignore(event);
}

BriteGrid.widget.Menu.prototype.oncontextmenu = function (event) {
  let $owner = this.view.$owner,
      $container = this.view.$container;

  if ($owner) {
    let style = $container.style;
    style.top = event.layerY + 'px';
    style.left = event.layerX + 'px';

    if (event.currentTarget === $owner) {
      this.open(event);
    }

    if ($container.getBoundingClientRect().right > window.innerWidth) {
      // The menu is shown beyond the window width. Reposition it
      style.left = ($owner.offsetWidth - $container.offsetWidth - 4) + 'px';
    }
  }

  return BriteGrid.util.event.ignore(event);
};

BriteGrid.widget.Menu.prototype.onkeydown_extend = function (event) {
  let parent = this.data.parent,
      menus = this.data.menus,
      has_submenu = menus.has(event.target),
      $owner = this.view.$owner,
      kcode = event.keyCode;

  // Open link in a new tab
  if (event.target.href && event.keyCode === event.DOM_VK_RETURN) {
    event.stopPropagation();
    event.target.target = '_blank';
    return;
  }

  // The owner of the context menu
  if ($owner && event.currentTarget === $owner) {
    let view = this.view,
        items = view.members;
    switch (kcode) {
      case event.DOM_VK_UP:
      case event.DOM_VK_END: {
        view.selected = view.$focused = items[items.length - 1];
        break;
      }
      case event.DOM_VK_DOWN:
      case event.DOM_VK_RIGHT:
      case event.DOM_VK_HOME: {
        view.selected = view.$focused = items[0];
        break;
      }
      case event.DOM_VK_ESCAPE:
      case event.DOM_VK_TAB: {
        this.close();
        break;
      }
    }
    return;
  }

  BriteGrid.util.event.ignore(event);

  switch (kcode) {
    case event.DOM_VK_RIGHT: {
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
    case event.DOM_VK_LEFT: {
      if (parent) {
        let view = parent.view,
            items = view.members,
            $target = view.$container.mozMatchesSelector('[role="menubar"]')
                    ? items[items.indexOf(view.selected[0]) - 1] || items[items.length - 1]
                    : view.selected[0];
        view.selected = view.$focused = $target;
      }
      break;
    }
    case event.DOM_VK_ESCAPE: {
      this.close();
      break;
    }
    case event.DOM_VK_RETURN:
    case event.DOM_VK_SPACE: {
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

BriteGrid.widget.Menu.prototype.onblur_extend = function (event) {
  if (event.currentTarget === window) {
    this.close(true);
  }

  // The default behavior
  this.onblur(event);
};

BriteGrid.widget.Menu.prototype.build = function (data) {
  let $container = this.view.$container,
      $fragment = document.createDocumentFragment(),
      $_separator = document.createElement('li'),
      $_outer = document.createElement('li'),
      structure = [],
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

  for (let item of data) {
    if (item.type === 'separator') {
      $fragment.appendChild($_separator.cloneNode());
      continue;
    }

    let $item = item.$element = $fragment.appendChild($_outer.cloneNode()).firstElementChild;
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

    // Save the item/obj reference
    structure.push(item)
  }

  this.data.structure = structure;
  $container.appendChild($fragment);

  if (rebuild) {
    this.activate(true);
    this.activate_extend(true);
  }
};

BriteGrid.widget.Menu.prototype.open = function () {
  let $container = this.view.$container;
  $container.setAttribute('aria-expanded', 'true');
  $container.removeAttribute('aria-activedescendant');
  $container.dispatchEvent(new CustomEvent('MenuOpened'));

  // Show the submenu on the left if there is not enough space
  let rect = $container.getBoundingClientRect(),
      parent = this.data.parent;
  if (rect.right > window.innerWidth ||
      parent && parent.view.$container.classList.contains('dir-left')) {
    $container.classList.add('dir-left');
  }

  BriteGrid.util.event.bind(this, window, ['mousedown', 'blur']);
};

BriteGrid.widget.Menu.prototype.select = function (event) {
  this.view.$container.dispatchEvent(new CustomEvent('MenuItemSelected', {
    bubbles: true,
    cancelable: false,
    detail: {
      command: event.target.dataset.command || event.target.id
    }
  }));
}

BriteGrid.widget.Menu.prototype.close = function (propagation) {
  BriteGrid.util.event.unbind(this, window, ['mousedown', 'blur']);

  let $container = this.view.$container,
      parent = this.data.parent;

  $container.setAttribute('aria-expanded', 'false');
  $container.removeAttribute('aria-activedescendant');
  $container.dispatchEvent(new CustomEvent('MenuClosed'));
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
};

/* --------------------------------------------------------------------------
 * MenuBar extends Menu
 * -------------------------------------------------------------------------- */

BriteGrid.widget.MenuBar = function ($container, data) {
  this.view = {
    $container: $container
  };

  this.options = {
    item_roles: ['menuitem'],
    item_selector: '[role="menuitem"]',
    focus_cycling: true
  };

  this.activate();
  this.activate_extend();

  let menus = menus = this.data.menus;
};

BriteGrid.widget.MenuBar.prototype = Object.create(BriteGrid.widget.Menu.prototype);

BriteGrid.widget.MenuBar.prototype.onmousedown = function (event) {
  if (event.button !== 0) {
    BriteGrid.util.event.ignore(event);
    return;
  }

  if (this.view.members.indexOf(event.target) > -1) {
    if (event.target !== this.view.selected[0]) {
      this.open(event);
    } else {
      this.close();
    }
  } else if (this.view.selected.length) {
    this.close();
  } else {
    BriteGrid.util.event.ignore(event);
  }
};

BriteGrid.widget.MenuBar.prototype.onmouseover = function (event) {
  if (this.view.selected.length &&
      this.view.members.indexOf(event.target) > -1) {
    this.view.selected = this.view.$focused = event.target;
  }

  return BriteGrid.util.event.ignore(event);
};

BriteGrid.widget.MenuBar.prototype.onkeydown_extend = function (event) {
  let menu = this.data.menus.get(event.target).view,
      menuitems = menu.members;

  switch (event.keyCode) {
    case event.DOM_VK_TAB: {
      return true; // Focus management
    }
    case event.DOM_VK_HOME:
    case event.DOM_VK_DOWN: {
      menu.selected = menu.$focused = menuitems[0];
      break;
    }
    case event.DOM_VK_END:
    case event.DOM_VK_UP: {
      menu.selected = menu.$focused = menuitems[menuitems.length - 1];
      break;
    }
    case event.DOM_VK_SPACE: {
      if (event.target.mozMatchesSelector('[aria-selected="true"]')) {
        menu.$container.setAttribute('aria-expanded', 'false');
        this.view.selected = [];
      } else {
        menu.$container.setAttribute('aria-expanded', 'true');
        this.view.selected = event.target;
      }
      break;
    }
    case event.DOM_VK_ESCAPE: {
      if (event.target.mozMatchesSelector('[aria-selected="true"]')) {
        menu.$container.setAttribute('aria-expanded', 'false');
        this.view.selected = [];
      }
      break;
    }
    default: {
      // The default behavior
      this.onkeydown(event);
    }
  }

  return BriteGrid.util.event.ignore(event);
};

BriteGrid.widget.MenuBar.prototype.open = function (event) {
  this.select_with_mouse(event);
};

BriteGrid.widget.MenuBar.prototype.close = function () {
  BriteGrid.util.event.unbind(this, window, ['mousedown', 'blur']);

  this.view.selected = [];
};

/* --------------------------------------------------------------------------
 * RadioGroup extends Select
 * -------------------------------------------------------------------------- */

BriteGrid.widget.RadioGroup = function ($container, data) {
  this.view = {
    $container: $container
  };

  this.options = {
    item_roles: ['radio'],
    item_selector: '[role="radio"]',
    selected_attr: 'aria-checked',
    focus_cycling: true
  };

  this.activate();
};

BriteGrid.widget.RadioGroup.prototype = Object.create(BriteGrid.widget.Select.prototype);

/* --------------------------------------------------------------------------
 * Tree extends Select
 *
 * @param   $container <menu role="tree">
 * @param   optional array data
 * @returns object widget 
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Tree = function ($container, data) {
  this.view = {
    $container: $container
  };

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
};

BriteGrid.widget.Tree.prototype = Object.create(BriteGrid.widget.Select.prototype);

BriteGrid.widget.Tree.prototype.onmousedown_extend = function (event) {
  if (event.target.mozMatchesSelector('.expander')) {
    this.expand(event.target.parentElement.querySelector('[role="treeitem"]'));
  } else {
    // The default behavior
    this.onmousedown(event);
  }
};

BriteGrid.widget.Tree.prototype.onkeydown_extend = function (event) {
  let $item = event.target,
      items = this.view.members;

  switch (event.keyCode) {
    case event.DOM_VK_LEFT: {
      if ($item.mozMatchesSelector('[aria-expanded="true"]')) {
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
    case event.DOM_VK_RIGHT: {
      if ($item.mozMatchesSelector('[aria-expanded="false"]')) {
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
      this.onkeydown(event);
    }
  }
};

BriteGrid.widget.Tree.prototype.ondblclick = function (event) {
  if (event.target.hasAttribute('aria-expanded')) {
    this.expand(event.target);
  }
};

BriteGrid.widget.Tree.prototype.build = function () {
  let $tree = this.view.$container,
      $fragment = document.createDocumentFragment(),
      structure = this.data.structure,
      map = this.data.map = new WeakMap(),
      level = 1;

  let $outer = document.createElement('li');
  $outer.setAttribute('role', 'presentation');

  let $treeitem = document.createElement('span');
  $treeitem.setAttribute('role', 'treeitem');
  $treeitem.appendChild(document.createElement('label'));

  let $expander = document.createElement('span');
  $expander.className = 'expander';
  $expander.setAttribute('role', 'presentation');

  let $group = document.createElement('ul');
  $group.setAttribute('role', 'group');

  let get_item = function (obj) {
    let $item = $treeitem.cloneNode(),
        item_id = $tree.id + '-' + obj.id;
    $item.firstChild.textContent = obj.label;
    $item.id = item_id;
    $item.setAttribute('aria-level', level);
    $item.setAttribute('aria-selected', obj.selected ? 'true' : 'false');

    // Save the item/obj reference
    map.set($item, obj);
    obj.$element = $item;

    let $_outer = $outer.cloneNode(false);
    $_outer.appendChild($item);

    if (obj.data) {
      for (let [prop, value] of Iterator(obj.data)) {
        $item.dataset[prop] = value;
      }
    }

    if (obj.sub) {
      $_outer.appendChild($expander.cloneNode(false));
      $item.setAttribute('aria-expanded', obj.selected !== false);
      $item.setAttribute('aria-owns', item_id + '-group');
      let $_group = $_outer.appendChild($group.cloneNode(false));
      $_group.id = item_id + '-group';
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

BriteGrid.widget.Tree.prototype.get_data = function () {
  let map = this.data.map = new WeakMap(),
      structure = this.data.structure = [];

  // TODO: generate structure data

  for (let $item of this.view.members) {
    let level = Number($item.getAttribute('aria-level')),
        item = {
          $element: $item,
          id: $item.id,
          label: $item.textContent,
          level: level,
          sub: []
        };

    if (Object.keys($item.dataset).length) {
      item.data = {};
      for (let [prop, value] of Iterator($item.dataset)) {
        item.data[prop] = value;
      }
    }

    // Save the item/obj reference
    map.set($item, item);
  };
};

BriteGrid.widget.Tree.prototype.expand = function ($item) {
  let expanded = $item.mozMatchesSelector('[aria-expanded="true"]'),
      items = this.view.$container.querySelectorAll('[role="treeitem"]'),
      selector = '#' + $item.getAttribute('aria-owns') + ' [aria-selected="true"]',
      children = Array.slice(document.querySelectorAll(selector));

  $item.setAttribute('aria-expanded', !expanded);

  // Update data with visible items
  this.view.members = Array.filter(items, function ($item) $item.offsetParent !== null);

  if (!children.length) {
    return;
  }

  this.view.$focused = $item;

  if (!this.options.multiselectable) {
    this.view.selected = $item;
    return;
  }

  // Remove the item's children from selection
  let selected = this.view.selected.filter(function ($item) children.indexOf($item) === -1);

  // Add the item to selection
  selected.push($item);
  this.view.selected = selected;
};

/* --------------------------------------------------------------------------
 * TreeGrid extends Tree and Grid
 * -------------------------------------------------------------------------- */

BriteGrid.widget.TreeGrid = function () {};
BriteGrid.widget.TreeGrid.prototype = Object.create(BriteGrid.widget.Grid.prototype);

/* --------------------------------------------------------------------------
 * TabList extends Composite
 *
 * @param   $container <ul role="tablist">
 * @options attributes on the tablist element:
 *           * data-removable: if true, tabs can be opened and/or closed
 *                             (default: false)
 *           * data-reorderable: if true, tabs can be reordered by drag
 *                               (default: false)
 *          attributes on the tab elements:
 *           * aria-selected: if true, the tab will be selected first
 *           * draggable and aria-grabbed: tabs can be dragged (to reorder)
 * @returns object widget
 * -------------------------------------------------------------------------- */

BriteGrid.widget.TabList = function ($container) {
  // TODO: aria-multiselectable support for accordion UI
  // http://www.w3.org/WAI/PF/aria-practices/#accordion
  if ($container.mozMatchesSelector('[aria-multiselectable="true"]')) {
    throw new Error('Multi-selectable tab list is not supported yet.');
  }

  this.view = {
    $container: $container
  };

  this.options = {
    item_roles: ['tab'],
    item_selector: '[role="tab"]',
    focus_cycling: true,
    removable: $container.dataset.removable === 'true',
    reorderable: $container.dataset.reorderable === 'true'
  };

  this.activate();

  this.view = new Proxy(this.view, {
    set: function (obj, prop, value) {
      if (prop === 'selected') {
        value = (Array.isArray(value)) ? value : [value];
        this.switch_tabpanel(obj[prop][0], value[0]);
      }

      obj[prop] = value;
    }.bind(this)
  });

  if (this.options.removable) {
    for (let tab of this.view.members) {
      this.set_close_button(tab);
    }
  }
};

BriteGrid.widget.TabList.prototype = Object.create(BriteGrid.widget.Composite.prototype);

BriteGrid.widget.TabList.prototype.onclick = function (event) {
  if (event.currentTarget === this.view.$container &&
      event.target.mozMatchesSelector('.close')) {
    this.close_tab(document.getElementById(event.target.getAttribute('aria-controls')));
  }
};

BriteGrid.widget.TabList.prototype.switch_tabpanel = function ($current_tab, $new_tab) {
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

BriteGrid.widget.TabList.prototype.set_close_button = function ($tab) {
  let $button = document.createElement('span');
  $button.className = 'close';
  $button.title = 'Close Tab'; // l10n
  $button.setAttribute('role', 'button');
  $button.setAttribute('aria-controls', $tab.id);
  $tab.appendChild($button);
};

BriteGrid.widget.TabList.prototype.add_tab = function (name, title, label, $panel, position = 'last', dataset = {}) {
  let items = this.view.members,
      $selected = this.view.selected[0],
      index = items.indexOf($selected),
      $next_tab = items[index + 1];

  let $tab = items[0].cloneNode();
  $tab.id = 'tab-' + name;
  $tab.title = label || title;
  $tab.tabIndex = -1;
  $tab.setAttribute('aria-selected', 'false');
  $tab.setAttribute('aria-controls', 'tabpanel-' + name);
  $tab.querySelector('label').textContent = title;
  $tab.querySelector('[role="button"]').setAttribute('aria-controls', $tab.id);

  if (dataset) {
    for (let [prop, value] of Iterator(dataset)) {
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
  $panel.id = 'tabpanel-' + name;
  $panel.tabIndex = -1;
  $panel.setAttribute('role', 'tabpanel');
  $panel.setAttribute('aria-hidden', 'true');
  $panel.setAttribute('aria-labelledby', $tab.id);

  // Add tabpanel
  document.getElementById($selected.getAttribute('aria-controls'))
          .parentElement.appendChild($panel);

  return $tab;
};

BriteGrid.widget.TabList.prototype.close_tab = function ($tab) {
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
};

/* --------------------------------------------------------------------------
 * Input (abstract role) extends Widget
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Input = function () {};
BriteGrid.widget.Input.prototype = Object.create(BriteGrid.widget.Widget.prototype);

/* --------------------------------------------------------------------------
 * Checkbox extends Input
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Checkbox = function ($checkbox) {
  this.view = {
    $checkbox: $checkbox
  };

  this.data = new Proxy({
    checked: $checkbox.mozMatchesSelector('[aria-checked="true"]')
  },
  {
    set: function (obj, prop, value) {
      if (prop === 'checked') {
        $checkbox.setAttribute('aria-checked', value);
        $checkbox.dispatchEvent(new CustomEvent('Changed'));
      }
      obj[prop] = value; // The default behavior
    }
  });

  let BGueb = BriteGrid.util.event.bind;
  BGueb(this, $checkbox, ['keydown', 'click', 'contextmenu']);
};

BriteGrid.widget.Checkbox.prototype = Object.create(BriteGrid.widget.Input.prototype);

BriteGrid.widget.Checkbox.prototype.onkeydown = function (event) {
  if (event.keyCode === event.DOM_VK_SPACE) {
    this.data.checked = !this.data.checked;
  }
}

BriteGrid.widget.Checkbox.prototype.onclick = function (event) {
  this.data.checked = !this.data.checked;
  this.view.$checkbox.focus();
  return false;
};

/* --------------------------------------------------------------------------
 * ScrollBar extends Input
 *
 * @param   $owner    An element to be scrolled
 * @param   adjusted  Adjust the scrolling increment for Grid, Tree, ListBox
 * -------------------------------------------------------------------------- */

BriteGrid.widget.ScrollBar = function ($owner, adjusted = false) {
  let $controller = document.createElement('div');
  $controller.tabIndex = 0;
  $controller.style.top = '2px';
  $controller.setAttribute('role', 'scrollbar');
  $controller.setAttribute('aria-controls', $owner.id);
  $controller.setAttribute('aria-disabled', 'true');
  $controller.setAttribute('aria-valuemin', '0');
  $controller.setAttribute('aria-valuenow', '0');
  $owner.appendChild($controller);

  this.view = {
    $owner: $owner,
    $controller: $controller
  }

  this.data = {};

  this.options = {
    adjusted: adjusted
  };

  let BGue = BriteGrid.util.event;
  BGue.bind(this, window, ['resize']);
  BGue.bind(this, $owner, ['wheel', 'scroll', 'keydown', 'overflow', 'underflow']);
  BGue.bind(this, $controller, ['mousedown', 'contextmenu', 'keydown']);

  // Recalculate the height of scrollbar when elements are added or removed
  let observer = new MutationObserver(function () {
    this.set_height();
  }.bind(this));
  observer.observe($owner, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-hidden', 'aria-disabled']
  });
};

BriteGrid.widget.ScrollBar.prototype = Object.create(BriteGrid.widget.Input.prototype);

BriteGrid.widget.ScrollBar.prototype.onmousedown = function (event) {
  this.scroll_with_mouse(event);
};

BriteGrid.widget.ScrollBar.prototype.onmousemove = function (event) {
  this.scroll_with_mouse(event);
};

BriteGrid.widget.ScrollBar.prototype.onmouseup = function (event) {
  this.scroll_with_mouse(event);
};

BriteGrid.widget.ScrollBar.prototype.onwheel = function (event) {
  event.preventDefault();

  let $owner = this.view.$owner,
      top = $owner.scrollTop + event.deltaY;

  if (top < 0) {
    top = 0;
  }
  if (top > $owner.scrollTopMax) {
    top = $owner.scrollTopMax;
  }
  if ($owner.scrollTop !== top) {
    $owner.scrollTop = top;
  }
};

BriteGrid.widget.ScrollBar.prototype.onscroll = function (event) {
  let $owner = this.view.$owner,
      $controller = this.view.$controller;

  // Scroll by row
  if (!BriteGrid.util.device.touch.enabled && this.options.adjusted) {
    let rect = $owner.getBoundingClientRect(),
        $elm = document.elementFromPoint(rect.left, rect.top),
        top = 0;

    while ($elm) {
      if ($elm.mozMatchesSelector('[role="row"], [role="option"], [role="treeitem"]')) {
        break;
      }
      $elm = $elm.parentElement;
    }

    if (!$elm) {
      return; // traversal failed
    }

    if ($owner.scrollTop < $elm.offsetTop + $elm.offsetHeight / 2 || !$elm.nextElementSibling) {
      top = $elm.offsetTop;
    } else {
      top = $elm.nextElementSibling.offsetTop;
    }

    $owner.scrollTop = top;
  }

  let st = $owner.scrollTop,
      ch = $owner.clientHeight,
      sh = $owner.scrollHeight,
      ctrl_height = parseInt($controller.style.height),
      ctrl_adj = 0;

  // Consider scrollbar's min-height
  if (ctrl_height < 16) {
    ctrl_adj = 20 - ctrl_height;
  }

  $controller.setAttribute('aria-valuenow', st);
  $controller.style.top = st + 2 + Math.floor((ch - ctrl_adj) * (st / sh)) + 'px';
};

BriteGrid.widget.ScrollBar.prototype.onkeydown = function (event) {
  this.scroll_with_keyboard(event);
};

BriteGrid.widget.ScrollBar.prototype.onoverflow = function (event) {
  if (event.target === event.currentTarget) {
    this.set_height();
    this.view.$controller.setAttribute('aria-disabled', 'false');
  }
};

BriteGrid.widget.ScrollBar.prototype.onunderflow = function (event) {
  if (event.target === event.currentTarget) {
    this.view.$controller.setAttribute('aria-disabled', 'true');
  }
};

BriteGrid.widget.ScrollBar.prototype.onresize = function (event) {
  this.set_height();
}

BriteGrid.widget.ScrollBar.prototype.scroll_with_mouse = function (event) {
  let $owner = this.view.$owner,
      BGue = BriteGrid.util.event;

  if (event.type === 'mousedown') {
    this.data.rect = {
      st: $owner.scrollTop,
      sh: $owner.scrollHeight,
      ch: $owner.clientHeight,
      cy: event.clientY
    };
    BGue.bind(this, window, ['mousemove', 'mouseup']);
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
    BGue.unbind(this, window, ['mousemove', 'mouseup']);
  }
};

BriteGrid.widget.ScrollBar.prototype.scroll_with_keyboard = function (event) {
  let $owner = this.view.$owner,
      ch = $owner.clientHeight;

  switch (event.keyCode) {
    case event.DOM_VK_TAB: {
      return true; // Focus management
    }
    case event.DOM_VK_HOME: {
      if (this.options.adjusted) {
        return false;
      }
      $owner.scrollTop = 0;
      break;
    }
    case event.DOM_VK_END: {
      if (this.options.adjusted) {
        return false;
      }
      $owner.scrollTop = $owner.scrollTopMax;
      break;
    }
    case event.DOM_VK_PAGE_UP: {
      $owner.scrollTop -= ch;
      break;
    }
    case event.DOM_VK_PAGE_DOWN: {
      $owner.scrollTop += ch;
      break;
    }
    case event.DOM_VK_UP: {
      if (this.options.adjusted) {
        return false;
      }
      $owner.scrollTop -= 40;
      break;
    }
    case event.DOM_VK_DOWN: {
      if (this.options.adjusted) {
        return false;
      }
      $owner.scrollTop += 40;
      break;
    }
    case event.DOM_VK_SPACE: {
      if (this.options.adjusted) {
        return false;
      }
      if (event.shiftKey) {
        $owner.scrollTop -= ch;
      } else {
        $owner.scrollTop += ch;
      }
      break;
    }
  }

  BriteGrid.util.event.ignore(event);
  return true;
};

BriteGrid.widget.ScrollBar.prototype.set_height = function () {
  let $owner = this.view.$owner,
      $controller = this.view.$controller,
      sh = $owner.scrollHeight,
      ch = $owner.clientHeight,
      ctrl_height = Math.floor(ch * ch / sh) - 4;

  $controller.style.height = ((ctrl_height < 0) ? 0 : ctrl_height) + 'px'; 
  $controller.setAttribute('aria-valuemax', $owner.scrollTopMax);
};

/* --------------------------------------------------------------------------
 * Window (abstract role) extends RoleType
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Window = function () {};
BriteGrid.widget.Window.prototype = Object.create(BriteGrid.widget.RoleType.prototype);

/* --------------------------------------------------------------------------
 * Dialog extends Window
 *
 * @param   object options 
 *            id (optional)
 *            type: alert, confirm or prompt
 *            title
 *            message
 *            btn_ok_label (optional)
 *            btn_cancel_label (optional)
 *            value (for prompt, optional) 
 * @returns object widget
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Dialog = function (options) {
  this.options = {
    id: options.id || (new Date()).getTime(),
    type: options.type,
    title: options.title,
    message: options.message,
    btn_ok_label: options.btn_ok_label || 'OK',
    btn_cancel_label: options.btn_cancel_label || 'Cancel',
    value: options.value || ''
  }

  this.view = {}

  this.build();
  this.activate();
};

BriteGrid.widget.Dialog.prototype = Object.create(BriteGrid.widget.Window.prototype);

BriteGrid.widget.Dialog.prototype.build = function () {
  let options = this.options;

  let $dialog = this.view.$dialog = document.createElement('aside');
  $dialog.id = 'dialog-' + options.id;
  $dialog.tabIndex = 0;
  $dialog.setAttribute('role', options.type === 'alert' ? 'alertdialog' : 'dialog');
  $dialog.setAttribute('aria-labelledby', 'dialog-' + options.id + '-title');
  $dialog.setAttribute('aria-describedby', 'dialog-' + options.id + '-message');

  let $title = this.view.$title = $dialog.appendChild(document.createElement('h2'));
  $title.id = 'dialog-' + options.id + '-title';
  $title.textContent = options.title;

  let $message = this.view.$message = $dialog.appendChild(document.createElement('p'));
  $message.textContent = options.message;
  $message.id = 'dialog-' + options.id + '-message';

  if (options.type === 'prompt') {
    let $input = this.view.$input = $dialog.appendChild(document.createElement('input'));
    $input.value = options.value || '';
    $input.setAttribute('role', 'textbox');
  }

  let $btn_ok = this.view.$btn_ok = $dialog.appendChild(document.createElement('button'));
  $btn_ok.textContent = options.btn_ok_label;
  $btn_ok.setAttribute('role', 'button');
  $btn_ok.dataset.id = 'ok';

  if (options.type !== 'alert') {
    let $btn_cancel = this.view.$btn_cancel = $dialog.appendChild($btn_ok.cloneNode(false));
    $btn_cancel.textContent = options.btn_cancel_label;
    $btn_cancel.dataset.id = 'cancel';
  }

  let wrapper = this.view.$wrapper = document.body.appendChild(document.createElement('div'));
  wrapper.className = 'dialog-wrapper';
  wrapper.appendChild($dialog)
};

BriteGrid.widget.Dialog.prototype.activate = function () {
  // Add event listeners
  BriteGrid.util.event.bind(this, this.view.$dialog, ['click', 'keypress']);
};

BriteGrid.widget.Dialog.prototype.onclick = function (event) {
  if (event.target.mozMatchesSelector('[role="button"]')) {
  }
};

BriteGrid.widget.Dialog.prototype.onkeypress = function (event) {
  switch (event.keyCode) {
    case event.DOM_VK_RETURN: {
      break;
    }
    case event.DOM_VK_ESCAPE: {
      break;
    }
  }
};

BriteGrid.widget.Dialog.prototype.show = function () {};

BriteGrid.widget.Dialog.prototype.hide = function () {
  this.view.$dialog.dispatchEvent(new CustomEvent('Hidden'));
};

/* --------------------------------------------------------------------------
 * AlertDialog (abstract role) extends Dialog
 * -------------------------------------------------------------------------- */

BriteGrid.widget.AlertDialog = function () {};
BriteGrid.widget.AlertDialog.prototype = Object.create(BriteGrid.widget.Dialog.prototype);

/* --------------------------------------------------------------------------
 * Separator extends Structure
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Separator = function () {};
BriteGrid.widget.Separator.prototype = Object.create(BriteGrid.widget.Structure.prototype);

/* --------------------------------------------------------------------------
 * Splitter (custom widget) extends Separator
 *
 * @param   element <div class="splitter" role="separator">
 * @returns object widget
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Splitter = function ($splitter) {
  this.view = {
    $splitter: $splitter,
    $outer: $splitter.parentElement,
    controls: {}
  };

  let style = function ($element, prop) parseInt(BriteGrid.util.style.get($element, prop)),
      $outer = this.view.$outer,
      orientation = $splitter.getAttribute('aria-orientation') || 'horizontal',
      outer_rect = $outer.getBoundingClientRect(),
      outer_size = orientation === 'horizontal' ? outer_rect.height : outer_rect.width,
      flex = $splitter.dataset.flex !== 'false',
      position = style($splitter, orientation === 'horizontal' ? 'top' : 'left');

  this.data = new Proxy({
    outer: new Proxy({
      id: $outer.id,
      top: outer_rect.top,
      left: outer_rect.left,
    }, {
      get: function (obj, prop) {
        if (prop === 'size') {
          // The dimension of the element can be changed when the window is resized.
          // Return the current width or height
          let rect = $outer.getBoundingClientRect();
          return this.data.orientation === 'horizontal' ? rect.height : rect.width;
        }
        return obj[prop];
      }.bind(this)
    }),
    orientation: orientation,
    flex: flex,
    position: flex ? (position / outer_size * 100).toFixed(2) + '%' : position + 'px',
    controls: {},
    grabbed: false
  }, {
    set: function (obj, prop, value) {
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

        if (isNaN(value) && value.match(/^(\d+)px$/)) {
          value = parseInt(RegExp.$1);
        }

        if (value === 'default') {
          value = null; // Reset the position
        } else if (value <= 0) {
          if (parseInt(obj.position) === 0) {
            return;
          }
          value = (!before.min || before.collapsible) ? 0 : before.min;
        } else if (value >= outer.size || value === '100%') {
          if (obj.position === '100%') {
            return;
          }
          value = (!after.min || after.collapsible) ? '100%' : outer.size - after.min;
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

        if (!isNaN(value) && value !== null) {
          value = this.data.flex ? (value / outer.size * 100).toFixed(2) + '%' : value + 'px';
        }

        if (this.data.orientation === 'horizontal') {
          $before.style.height = $splitter.style.top = $after.style.top = value;
        } else {
          $before.style.width = $splitter.style.left = $after.style.left = value;
        }

        $splitter.dispatchEvent(new CustomEvent('Resized', {
          detail: { position: value }
        }));

        // Force to resize scrollbars
        window.dispatchEvent(new UIEvent('resize'));
      }

      obj[prop] = value;
    }.bind(this)
  });

  // Add event listeners
  BriteGrid.util.event.bind(this, $splitter, ['mousedown', 'contextmenu', 'keydown']);

  for (let [i, id] of Iterator($splitter.getAttribute('aria-controls').split(/\s+/))) {
    let $target = document.getElementById(id),
        position = i === 0 ? 'before' : 'after';
    this.data.controls[position] = new Proxy({
      id: id,
      collapsible: $target.hasAttribute('aria-expanded'),
      expanded: $target.getAttribute('aria-expanded') !== 'false'
    },
    {
      get: function (obj, prop) {
        if (prop === 'min' || prop === 'max') {
          let horizontal = this.data.orientation === 'horizontal';
          return style($target, prop + '-' + (horizontal ? 'height' : 'width'));
        }
        return obj[prop];
      }.bind(this),
      set: function (obj, prop, value) {
        if (prop === 'expanded') {
          document.getElementById(obj.id).setAttribute('aria-expanded', value);
        }
        obj[prop] = value;
      }
    });
    this.view.controls['$' + position] = $target;
  };
};

BriteGrid.widget.Splitter.prototype = Object.create(BriteGrid.widget.Separator.prototype);

BriteGrid.widget.Splitter.prototype.onmousedown = function (event) {
  if (event.button !== 0) {
    event.preventDefault();
    return;
  }

  this.view.$splitter.setAttribute('aria-grabbed', 'true');
  this.data.grabbed = true;

  this.view.$outer.dataset.splitter = this.data.orientation;

  // Add event listeners
  BriteGrid.util.event.bind(this, window, ['mousemove', 'mouseup']);
};

BriteGrid.widget.Splitter.prototype.onmousemove = function (event) {
  if (!this.data.grabbed) {
    return;
  }

  if (this.data.orientation === 'horizontal') {
    this.data.position = event.clientY - this.data.outer.top;
  } else {
    this.data.position = event.clientX - this.data.outer.left;
  }
};

BriteGrid.widget.Splitter.prototype.onmouseup = function (event) {
  if (!this.data.grabbed) {
    return;
  }

  this.data.grabbed = false;
  this.view.$splitter.setAttribute('aria-grabbed', 'false');

  // Cleanup
  BriteGrid.util.event.unbind(this, document.body, ['mousemove', 'mouseup']);
  delete this.view.$outer.dataset.splitter;
};

BriteGrid.widget.Splitter.prototype.onkeydown = function (event) {
  let value = null,
      position = this.data.position,
      outer = this.data.outer,
      before = this.data.controls.before,
      after = this.data.controls.after;

  switch (event.keyCode) {
    case event.DOM_VK_HOME: {
      value = (!before.min || before.collapsible) ? 0 : before.min;
      break;
    }
    case event.DOM_VK_END: {
      value = (!after.min || after.collapsible) ? '100%' : outer.size - after.min;
      break;
    }
    case event.DOM_VK_PAGE_UP:
    case event.DOM_VK_UP:
    case event.DOM_VK_LEFT: {
      let delta = (event.keyCode === event.DOM_VK_PAGE_UP || event.shiftKey) ? 50 : 10;
      if (position === '100%') {
        value = outer.size - (this.data.controls.after.min || delta);
      } else if (parseInt(position) !== 0) {
        value = (this.data.flex ? outer.size * parseFloat(position) / 100 : parseInt(position)) - delta;
      }
      break;
    }
    case event.DOM_VK_PAGE_DOWN:
    case event.DOM_VK_DOWN:
    case event.DOM_VK_RIGHT: {
      let delta = (event.keyCode === event.DOM_VK_PAGE_DOWN || event.shiftKey) ? 50 : 10;
      if (parseInt(position) === 0) {
        value = this.data.controls.before.min || delta;
      } else if (position !== '100%') {
        value = (this.data.flex ? outer.size * parseFloat(position) / 100 : parseInt(position)) + delta;
      }
      break;
    }
  }

  if (value !== null) {
    this.data.position = value;
  }
};

/* --------------------------------------------------------------------------
 * Region extends Section
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Region = function () {};
BriteGrid.widget.Region.prototype = Object.create(BriteGrid.widget.Section.prototype);

/* --------------------------------------------------------------------------
 * Status extends Region
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Status = function () {};
BriteGrid.widget.Status.prototype = Object.create(BriteGrid.widget.Region.prototype);

/* --------------------------------------------------------------------------
 * Landmark (abstract role) extends Region
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Landmark = function () {};
BriteGrid.widget.Landmark.prototype = Object.create(BriteGrid.widget.Region.prototype);

/* --------------------------------------------------------------------------
 * Application extends Landmark
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Application = function () {};
BriteGrid.widget.Application.prototype = Object.create(BriteGrid.widget.Landmark.prototype);

/* --------------------------------------------------------------------------
 * Tooltip extends Section
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Tooltip = function () {};
BriteGrid.widget.Tooltip.prototype = Object.create(BriteGrid.widget.Section.prototype);

/* --------------------------------------------------------------------------
 * Group extends Section
 * -------------------------------------------------------------------------- */

BriteGrid.widget.Group = function () {};
BriteGrid.widget.Group.prototype = Object.create(BriteGrid.widget.Section.prototype);

/* --------------------------------------------------------------------------
 * Toolbar extends Group
 * -------------------------------------------------------------------------- */

BriteGrid.widget.ToolBar = function () {};
BriteGrid.widget.ToolBar.prototype = Object.create(BriteGrid.widget.Group.prototype);
