/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the textbox role.
 * @extends FlareTail.widgets.Input
 * @see {@link https://www.w3.org/TR/wai-aria/complete#textbox}
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
