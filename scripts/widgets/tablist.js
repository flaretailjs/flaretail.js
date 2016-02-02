/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the tablist role.
 * @extends FlareTail.widgets.Composite
 * @see {@link https://www.w3.org/TR/wai-aria/complete#tablist}
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
    // https://www.w3.org/WAI/PF/aria-practices/#accordion
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
