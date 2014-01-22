locator-yui
===========

YUI modules compiler for locator.

[![Build Status](https://travis-ci.org/yahoo/locator-yui.png?branch=master)](https://travis-ci.org/yahoo/locator-yui)

This component can be integrated with [Locator][] component from Yahoo! to shift [YUI][]' modules and generate YUI Loader metadata. The compiled modules could be used on the server and client thru `express-yui`.

[Locator]: https://github.com/yahoo/locator
[YUI]: https://github.com/yui/yui3
[shifter]: https://github.com/yui/shifter
[YAF]: http://yuilibrary.com/yui/docs/app/


Installation
------------

Install using npm:

```shell
$ npm install locator-yui
```

By installing the module in your express application folder, you should be able to use it thru [Locator][].


Usage
-----

### Integration with `locator`

You can create an instance of the plugin and plug it into the locator instance, and locator will be able to analyze every file in your express app, and it will analyze any `*.js` or `*.json`, trying to shift them using [shifter][] to generate the production version of those modules. It also generate metadata for YUI Loader, this metadata comes in two flavors, `bundleObj.yui.server` and `bundleObj.yui.client`, and these two structures will hold the `modules` structure that you can pass into YUI Loader to load those in corresponding runtime.

It also generate a meta module into the filesystem, this metada is denotated by `loader-<bundle-name>` as the module name, and it can be loaded from the client side as part of the YUI core collection to provision the `modules` information into the loader to load any of the compiled modules.

The example below describes how to use the plugin with locator:

```
var Locator = require('locator'),
    LocatorYUI = require('locator-yui'),
    loc = new Locator();

// using locator-yui plugin
loc.plug(new LocatorYUI());

// walking the filesystem for an express app
loc.parseBundle(__dirname, {});
```

### Integration with `express` and `express-yui`

You can try a working example here:

https://github.com/yahoo/locator-yui/tree/master/example/express-yui

This example explores how to use `locator-yui` on the server side with `express` and `express-yui`, while using `yui` on the client side as a medium to load the compiled modules on demand.

#### Configuration

A configuration object can be passed into the constructure to tweak the way the plugin works.

Properties that may be used include:

* `cache` - Whether or not the shifting process should be cached to speed up the build process. By default, it is true.
* `args` - array with custom shifter cli arguments. This will overrule custom `options` that are translated into shifter arguments.
* `lint` - to enable linting in shifter.
* `coverage` - to generate `-coverage.js` version of modules in shifter.
* `silent` - to run shifter in silent mode.
* `quiet` - to run shifter in quiet mode.
* `cssproc` - loader `base` value to preprocess css to readjust urls for assets to resolve with `base` for the corresponding bundle build directory to make them work with combo.
* `filter` - regex or function to execute for each `evt.files`. If no `filter` is supplied, all modified files will be shifted.

Here is an example:

```
// using locator-yui plugin
loc.plug(new LocatorYUI({
    lint: true,
    cssproc: "http://company-cdn.com/path/to/locator/build/folder"
}));
```

### Compiling to [YUI][] modules for client side

Optionally, if you plan to use the templates on the client side, you can specify `format: "yui"`, and any [yui][] template will be accessible thru [YUI][] as a regular yui module. Here is an example of how to use them from the client side:

```
<script src="http://yui.yahooapis.com/3.12.0/build/yui/yui-debug.js"></script>
<script src="/static/path/to/locator/build/folder/<package-name>-<version>/loader-<package-name>.js"></script>
<script>
YUI.Env.core.push('loader-<package-name>'); // making the meta module part of the yui core
YUI({
    "groups": {
        "<package-name>": {
            base: "/static/path/to/locator/build/folder/"
        }
    }
}).use('any-module-in-my-app', 'compiled-by-locator-yui', function (Y) {

    // and that it all!

});
</script>
```

In the example above, the `<package-name>` is the package name specified in the `package.json` for the npm package that contains the template, which is usually the express application, the same for `<version>`. Then, the configuring the `<package-name>` as a custom group of modules, specifying from where those modules should be loaded, and using the meta module that was added to `YUI.Env.core` to take care of the dependencies, requirements, lang, assets, etc.


License
-------

This software is free to use under the Yahoo! Inc. BSD license.
See the [LICENSE file][] for license text and copyright information.

[LICENSE file]: https://github.com/yahoo/locator-yui/blob/master/LICENSE.md


Contribute
----------

See the [CONTRIBUTING file][] for info.

[CONTRIBUTING file]: https://github.com/yahoo/locator-yui/blob/master/CONTRIBUTING.md
