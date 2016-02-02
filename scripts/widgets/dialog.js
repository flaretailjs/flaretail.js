/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the dialog role.
 * @extends FlareTail.widgets.Window
 * @see {@link https://www.w3.org/TR/wai-aria/complete#dialog}
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
