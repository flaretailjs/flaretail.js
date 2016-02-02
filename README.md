# FlareTail.js

A JavaScript library for Firefox OS application development, consisting of WAI-ARIA-driven accessible widgets, a lightweight app framework featuring a multithreaded, extended MVC pattern, and convenient utility functions.

This is the core of [BzDeck](https://github.com/bzdeck/bzdeck) and not intended for general use at this time.

* **widgets.js**: A collection of [WAI-ARIA](http://www.w3.org/TR/wai-aria/)-driven accessible widgets. This will use [Custom Elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Custom_Elements) once the feature is implemented by Firefox.
* **app.core.js**: App core implementation used on both the main thread and shared worker, containing Events.
* **app.main.js**: App frontend implementation used on the main thread, containing View, Helper, Controller, Router and WorkerProxy.
* **app.worker.js**: App business logic implementation used on the shared worker, containing Handler, DataSource, Model and Collection.
* **helpers.js**: Convenient utility functions handling a variety of stuff for an application, including a [Microdata](http://www.w3.org/TR/microdata/)-based HTML5 template engine, keybinding support and date formatter.
