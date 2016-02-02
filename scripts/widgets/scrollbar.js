/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Implement the scrollbar role.
 * @extends FlareTail.widgets.Input
 * @see {@link https://www.w3.org/TR/wai-aria/complete#scrollbar}
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
