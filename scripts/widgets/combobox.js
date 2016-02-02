/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the combobox role.
 * TODO: Support aria-autocomplete="inline" and "both"
 * TODO: Add more HTMLSelectElement-compatible attributes
 * TODO: Add test cases
 * @extends FlareTail.widgets.Select
 * @see {@link https://www.w3.org/TR/wai-aria/complete#combobox}
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
