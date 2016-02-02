/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the tree role.
 * @extends FlareTail.widgets.Select
 * @see {@link https://www.w3.org/TR/wai-aria/complete#tree}
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
