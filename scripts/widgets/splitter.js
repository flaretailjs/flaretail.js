/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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
