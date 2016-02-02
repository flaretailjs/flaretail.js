/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the grid role.
 * @extends FlareTail.widgets.Composite
 * @see {@link https://www.w3.org/TR/wai-aria/complete#grid}
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
