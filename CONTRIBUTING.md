Contributing Code to `locator-yui`
------------------------------------

This components follows the same contribution model used by [Mojito][], you can
review the [Contributing-Code-to-Mojito file][] for more details.

Please be sure to sign our [CLA][] before you submit pull requests or otherwise contribute to `locator-yui`. This protects `locator-yui` developers, who rely on [locator-yui's BSD license][].

[locator-yui's BSD license]: https://github.com/yahoo/locator-yui/blob/master/LICENSE.txt
[CLA]: http://developer.yahoo.com/cocktails/mojito/cla/
[Mojito]: https://github.com/yahoo/mojito
[Contributing-Code-to-Mojito file]: https://github.com/yahoo/mojito/wiki/Contributing-Code-to-Mojito

Dev mode installation
---------------------

- The main source files are located under `lib/`.
- Unit tests are located under `tests/lib/*`.
- Examples are located under `example/`.

To install the dependencies:

    npm install

To run the unit tests (with coverage by default):

    npm test

To lint the app lib folder:

    npm run lint
