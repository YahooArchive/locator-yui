/*
* Copyright (c) 2013, Yahoo! Inc. All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/

/*jslint node:true, nomen:true*/

"use strict";

var YUITest = require('yuitest'),
    Promise = require('yui/promise').Promise,
    A = YUITest.Assert,
    OA = YUITest.ObjectAssert,
    suite,
    mockery = require('mockery'),
    mockShifter,
    mockBuilder,
    PluginClass;

function createBundles() {
    return {
        photonews: {
            "/tmp/photonews/build/photonews-0.0.1/app.js": {
                "buildfile": "/tmp/photonews/build/photonews-0.0.1/app.js",
                "builds": {
                    "photonews-about-page": {
                        "config": {
                            "requires": [
                                "template-base",
                                "handlebars-base"
                            ]
                        },
                        "name": "photonews-about-page"
                    }
                },
                "name": "photonews-about-page"
            },
            "/tmp/photonews/build/photonews-0.0.1/models/news.js": {
                "buildfile": "/tmp/photonews/build/photonews-0.0.1/models/news.js",
                "builds": {
                    "news-model": {
                        "config": {
                            "requires": [
                                "model"
                            ],
                            "affinity": "client"
                        },
                        "name": "news-model"
                    }
                },
                "name": "news-model"
            },
            "/tmp/photonews/build/photonews-0.0.1/models/sports.js": {
                "buildfile": "/tmp/photonews/build/photonews-0.0.1/models/sports.js",
                "builds": {
                    "news-model": {
                        "config": {
                            "requires": [
                                "model"
                            ],
                            "affinity": "client"
                        },
                        "name": "news-model"
                    }
                },
                "name": "news-model"
            }
        }
    };
}

suite = new YUITest.TestSuite("plugin-test suite");

suite.add(new YUITest.TestCase({
    name: "plugin-test",

    setUp: function () {
        mockShifter = YUITest.Mock();
        mockBuilder = function (name, group) {
            this.compile = function (meta) {
                A.isObject(meta);
            };
            this.data = {
                js: 'content of loader-foo.js',
                json: {
                    mod1: 'json version of loader-foo.js'
                }
            };
        };
        mockery.enable({
            useCleanCache: true,
            warnOnReplace: false,
            warnOnUnregistered: false
        });
        mockery.registerMock('./shifter', mockShifter);
        // mockery.registerMock('./builder', mockBuilder);

        PluginClass = require('../../lib/plugin.js');
    },

    // PluginClass
    // register
    // getLoaderData
    // bundleUpdated
    // _buildsInBundle
    //
    tearDown: function () {
        mockery.deregisterAll();
        mockery.disable();
        mockShifter = null;
        mockBuilder = null;
    },

    "test require plugin": function () {
        A.isNotNull(PluginClass, "loader require failed");
    },

    "test constructor": function () {
        var plugin = new PluginClass();
        A.isObject(plugin, "failing to create a plugin object");
        A.isObject(plugin.describe, "missing describe member on plugin instance");
        A.isFunction(plugin.bundleUpdated, "missing bundleUpdated member on plugin instance");
        A.isObject(plugin.describe.shifterOptions, "default shifter options should be computed");
    },

    "test constructor with options": function () {
        var plugin,
            shifterOptions;

        plugin = new PluginClass({
            filter: /^foo/,
            silent: true,
            quiet: true
        });

        A.isNotUndefined(plugin.describe);
        A.areEqual('*', plugin.describe.types[0]);
        A.isTrue(typeof plugin.describe.options.filter === 'function', 'missing filter function');

        A.isFunction(plugin.describe.options.filter, 'config.filter is not a function');
        A.areEqual(true,
                   plugin.describe.options.filter({}, 'foo/bar/baz.js'),
                   'filter should match /^foo/');

        shifterOptions = plugin.describe.shifterOptions;
        A.isFalse(shifterOptions.coverage, 'missing coverage option');
        A.isFalse(shifterOptions.lint, 'missing lint option');
        OA.areEqual({}, plugin._bundles, 'this._bundles was not init');
    },

    "test register": function () {
        var plugin = new PluginClass();

        plugin._register('foo', __dirname, 1);
        plugin._register('bar', __filename, 2);
        plugin._register('foo', __dirname, 3);
        A.areSame(3, plugin._bundles.foo[__dirname]);
        A.areSame(2, plugin._bundles.bar[__filename]);
    },

    "test getLoaderData with non-matching bundleName": function () {
        var plugin = new PluginClass(),
            data = plugin._getLoaderData('foo');

        A.isUndefined(data, 'wrong loaderData');
    },

    "test getLoaderData": function () {
        var plugin,
            bundle,
            filter,
            loaderData,
            json;

        plugin = new PluginClass({});

        plugin._bundles = createBundles();
        filter = function (bundleName, config) {
            if (config.affinity === 'client') {
                return true;
            }
            return false;
        };

        loaderData = plugin._getLoaderData('photonews', filter);

        A.isNotUndefined(loaderData, 'wrong loaderData');
        A.isNotUndefined(loaderData.json, 'wrong loaderData.json');

        json = loaderData.json;
        // { 'news-model': { affinity: 'client', group: 'photonews', requires:
        // [Object] } }
        // A.areEqual('client', json.affinity, 'wrong affinity');

        A.areEqual('photonews', json['news-model'].group, 'wrong group');
        A.isNotUndefined(json['news-model'].requires, 'missing "requires"');
        A.areEqual(1, json['news-model'].requires.length, 'wrong # of modules in "requires"');
        A.areEqual('model', json['news-model'].requires[0], 'wrong required module');
    },

    "test plugin without any modules registered": function () {
        var plugin = new PluginClass(),
            api = YUITest.Mock();

        YUITest.Mock.expect(api, {
            method: 'getBundleFiles',
            args: ['foo', YUITest.Mock.Value.Object],
            run: function (bundleName, filters) {
                return [];
            }
        });
        A.isUndefined(plugin.bundleUpdated({
            bundle: {
                name: 'foo',
                buildDirectory: __dirname
            }
        }, api));
        YUITest.Mock.verify(api);
    },

    "test plugin with filter": function () {
        var filterObj,
            plugin,
            api;

        filterObj = YUITest.Mock();
        YUITest.Mock.expect(filterObj, {
            method: 'filter',
            callCount: 3,
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.String],
            run: function (bundle, relativePath) {
                A.areEqual('foo', bundle.name, 'bundle object should be provided');
                return relativePath === 'bar.js'; // denying all except bar.js
            }
        });
        plugin = new PluginClass({
            filter: filterObj.filter
        });
        api = YUITest.Mock();

        YUITest.Mock.expect(api, {
            method: 'getBundleFiles',
            args: [YUITest.Mock.Value.String, YUITest.Mock.Value.Object],
            run: function (bundleName, filters) {
                A.areEqual('foo', bundleName, 'wrong bundle name');
                return [];
            }
        });
        YUITest.Mock.expect(plugin, {
            method: '_buildsInBundle',
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.Any, YUITest.Mock.Value.Any],
            run: function (bundle, modifiedFiles) {
                A.areEqual('foo', bundle.name, 'wrong bundle name');
                A.areSame(1, modifiedFiles.length, 'only bar.js shuould pass the filter');
                A.areSame(__dirname + '/bar.js', modifiedFiles[0], 'fullpath for bar.js should be produced');
                return [];
            }
        });
        A.isUndefined(plugin.bundleUpdated({
            bundle: {
                name: 'foo',
                buildDirectory: __dirname
            },
            files: {
                'bar.js': { fullPath: __dirname + '/bar.js', relativePath: 'bar.js' },
                'baz.js': { fullPath: __dirname + '/baz.js', relativePath: 'baz.js' },
                'path/to/something.js': { fullPath: __dirname + '/path/to/something.js', relativePath: 'path/to/something.js' }
            }
        }, api), 'all files should be filtered out');
        YUITest.Mock.verify(filterObj);
        YUITest.Mock.verify(api);
        YUITest.Mock.verify(plugin);
    },

    "test createServerLoaderData": function () {
        var plugin = new PluginClass({}),
            data;

        YUITest.Mock.expect(plugin, {
            method: '_getLoaderData',
            args: ['foo', YUITest.Mock.Value.Function],
            run: function (bundleName, fn) {
                A.areEqual(2, fn.length, 'wrong # of args');
                A.areEqual(true, fn('foo', { affinity: 'foo' }), 'wrong affinity');
                return { foo: 'bar' };
            }
        });

        data = plugin._createServerLoaderData({ name: 'foo' });

        OA.areEqual({ foo: 'bar' }, data, 'wrong data returned');
        YUITest.Mock.verify(plugin);
    },

    "test generateClientData": function () {
        var plugin,
            data;

        plugin = new PluginClass({});
        YUITest.Mock.expect(plugin, {
            method: '_getLoaderData',
            args: [ 'foo', YUITest.Mock.Value.Function ],
            run: function (bundleName, fn) {
                A.areEqual('foo', bundleName, 'wrong bundle name');
                var isClient = fn('foo', { affinity: 'client' });
                A.areEqual(true, isClient, 'wrong affnity');

                return {
                    foo: 'bar',
                    json: { bar: 'baz' }
                };
            }
        });
        data = plugin._createClientLoaderData({name: 'foo' }, 'loader-foo');

        A.isNotUndefined(data);
        A.areEqual('baz', data.json.bar);
        A.isNotUndefined(data.json['loader-foo']);
        A.areEqual('foo', data.json['loader-foo'].group, 'wrong group name');
        A.areEqual('client', data.json['loader-foo'].affinity, 'wrong affnity');
        YUITest.Mock.verify(plugin);
    },

    "test shiftEverything": function () {
        var plugin,
            shifter,
            mock;

        mock = YUITest.Mock();
        YUITest.Mock.expect(mock, {
            method: 'callback',
            args: [],
            run: function () {
                var args = [].slice.call(arguments);
                A.areEqual(0, args.length, 'no arguments expected');
                A.isUndefined(args[0]);
            }
        });

        shifter = YUITest.Mock();
        YUITest.Mock.expect(shifter, {
            method: 'shiftFiles',
            args: [YUITest.Mock.Value.Any,
                    YUITest.Mock.Value.Object,
                    YUITest.Mock.Value.Function],
            run: function (builds, options, cb) {
                A.areEqual('bar.js', builds[0], 'wrong file in builds');
                A.areEqual('/tmp', options.buildDir, 'wrong buildDir');
                A.areEqual(true, options.cache, 'cache should be defined');
                A.isFalse(options.opts['global-config'], 'missing --no-global-config');
                A.isFalse(options.opts['coverage'], 'missing --no-coverage');
                A.isFalse(options.opts['lint'], 'missing --no-lint');
                A.isString(options.opts['cssproc'], 'missing --cssproc');
                A.areEqual("assets/tmp", options.opts.cssproc, "wrong url path");
                cb(); // no error
            }
        });

        plugin = new PluginClass({
            cssproc: 'assets'
        });
        plugin._shiftEverything({
            name: 'foo',
            buildDirectory: '/tmp'
        }, ['bar.js'], shifter, mock.callback);

        YUITest.Mock.verify(mock);
        YUITest.Mock.verify(plugin);
    },

    "test shiftEverything with cssproc arg value ends with '/'": function () {
        var plugin = new PluginClass({
                cssproc: 'assets/'
            }),
            shifter = YUITest.Mock();

        YUITest.Mock.expect(shifter, {
            method: 'shiftFiles',
            args: [YUITest.Mock.Value.Any, YUITest.Mock.Value.Object, YUITest.Mock.Value.Function],
            run: function (builds, options, cb) {
                A.areEqual("assets/tmp", options.opts.cssproc, "wrong url path");
                cb();
            }
        });
        plugin._shiftEverything({
            name: 'foo',
            buildDirectory: '/tmp'
        }, ['bar.js'], shifter, function () {});

        YUITest.Mock.verify(plugin);
    },

    "test shiftEverything with cssproc arg value '/'": function () {
        var plugin = new PluginClass({
                cssproc: '/'
            }),
            shifter = YUITest.Mock();

        YUITest.Mock.expect(shifter, {
            method: 'shiftFiles',
            args: [YUITest.Mock.Value.Any, YUITest.Mock.Value.Object, YUITest.Mock.Value.Function],
            run: function (builds, options, cb) {
                A.areEqual("/tmp", options.opts.cssproc, "wrong url path");
                cb();
            }
        });
        plugin._shiftEverything({
            name: 'foo',
            buildDirectory: '/tmp'
        }, ['bar.js'], shifter, function () {});

        YUITest.Mock.verify(plugin);
    },

    "test shiftEverything with empty cssproc arg value": function () {
        var plugin = new PluginClass({}),
            shifter = YUITest.Mock();

        YUITest.Mock.expect(shifter, {
            method: 'shiftFiles',
            args: [YUITest.Mock.Value.Any, YUITest.Mock.Value.Object, YUITest.Mock.Value.Function],
            run: function (builds, options, cb) {
                A.isUndefined(options.opts.cssproc, "still see --cssproc argument");
                cb();
            }
        });
        plugin._shiftEverything({
            name: 'foo',
            buildDirectory: '/tmp'
        }, ['bar.js'], shifter, function () {});

        YUITest.Mock.verify(plugin);
    },

    "test shiftEverything when shiftFiles throws error": function () {
        var plugin,
            shifter,
            hasError = false,
            mock;

        mock = YUITest.Mock();
        YUITest.Mock.expect(mock, {
            method: 'callback',
            args: [YUITest.Mock.Value.Object],
            run: function (err) {
                hasError = true;
                A.isNotUndefined(err, 'expecting error object');
            }
        });

        shifter = YUITest.Mock();
        YUITest.Mock.expect(shifter, {
            method: 'shiftFiles',
            args: [YUITest.Mock.Value.Any,
                    YUITest.Mock.Value.Object,
                    YUITest.Mock.Value.Function],
            run: function (builds, options, cb) {
                cb(new Error('fake error'));
            }
        });

        plugin = new PluginClass({
            cssproc: 'assets'
        });
        plugin._shiftEverything({
            name: 'foo',
            buildDirectory: '/tmp'
        }, ['bar.js'], shifter, mock.callback);

        YUITest.Mock.verify(mock);
        YUITest.Mock.verify(plugin);
        A.areEqual(true, hasError, 'expected error handler to be called');
    },

    "test attachClientLoaderData": function () {
        var plugin,
            api,
            path,
            promise;

        plugin = new PluginClass({});
        api = YUITest.Mock();
        path = '/tmp';

        YUITest.Mock.expect(api, {
            method: 'writeFileInBundle',
            args: [YUITest.Mock.Value.String,
                    YUITest.Mock.Value.String,
                    YUITest.Mock.Value.Object],
            run: function (bundleName, dstpath, data) {
                A.areEqual('foo', bundleName, 'wrong bundleName');
                A.areEqual('/tmp', dstpath, 'wrong dstpath');
                OA.areEqual({bar: 'baz'}, data, 'wrong data');
                return { promise: true };
            }
        });

        promise = plugin._attachClientLoaderData({name: 'foo'}, api, path, {
            json: 'bar',
            js: { bar: 'baz' }
        });

        YUITest.Mock.verify(api);
        A.areEqual(true, promise.promise, 'wrong promise returned');
    },

    "test attachServerLoaderData": function () {
        var plugin,
            bundle = {name: 'foo'};
        plugin = new PluginClass({});
        plugin._attachServerLoaderData(bundle, { foo: 'bar', json: { bar: 'baz' }});

        A.isNotUndefined(bundle.yui);
        A.isNotUndefined(bundle.yui.server);
        OA.areEqual({bar: 'baz'}, bundle.yui.server, 'wrong loaderData.json value');
    },

    "test attachClientMetaData": function () {
        var plugin,
            bundle,
            builds = [];

        bundle = { name: 'foo', yui: {} };
        plugin = new PluginClass({});
        plugin._attachClientMetaData(bundle, builds, 'loader-foo', '/a/b/loader-foo.js');
        A.areEqual('/a/b/loader-foo.js', bundle.yui.metaModuleFullpath, 'wrong metaModuleFullPath');
        A.areEqual('loader-foo', bundle.yui.metaModuleName, 'wrong metaModuleName');
        A.areEqual(1, builds.length, 'wrong # of files in builds');
        A.areEqual('/a/b/loader-foo.js', builds[0], 'wrong builds[0]');
    },

    "test plugin flow with register and attach": function () {
        var plugin = new PluginClass({}),
            api = YUITest.Mock(),
            bundle = {
                name: 'foo',
                buildDirectory: '/path/to/foo-a.b.c'
            };

        plugin._bundles = {
            'foo': {
                'bar.js': {
                    'buildfile': 'bar.js',
                    builds: {
                        'foo-bar': {
                            config: { requires: [ ] },
                            name: 'foo-bar'
                        }
                    }
                }
            }
        };

        YUITest.Mock.expect(api, {
            method: 'getBundleFiles',
            args: ['foo', YUITest.Mock.Value.Object],
            run: function (bundleName, filters) {
                return ['path/to/build.json'];
            }
        });
        YUITest.Mock.expect(plugin, {
            method: '_buildsInBundle',
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.Object, YUITest.Mock.Value.Object],
            run: function (bundle, files, jsonFiles) {
                return ['bar.js'];
            }
        });
        YUITest.Mock.expect(plugin, {
            method: '_createServerLoaderData',
            args: [YUITest.Mock.Value.Object],
            run: function (bundle) {
                return { loaderData: 'serverLoaderData' };
            }
        });
        YUITest.Mock.expect(plugin, {
            method: '_createClientLoaderData',
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.String],
            run: function (bundle, moduleName) {
                return { loaderData: 'clientLoaderData' };
            }
        });
        YUITest.Mock.expect(plugin, {
            method: '_shiftEverything',
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.Any, YUITest.Mock.Value.Any, YUITest.Mock.Value.Object, YUITest.Mock.Value.Function],
            run: function (bundle, cssproc, builds, shifter, cb) {
                cb(); // no error
            }
        });
        YUITest.Mock.expect(plugin, {
            method: '_attachServerLoaderData',
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.Object],
            run: function (bundle, loaderData) {
                // assert loaderData
                return;
            }
        });
        YUITest.Mock.expect(plugin, {
            method: '_attachClientLoaderData',
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.Object, YUITest.Mock.Value.String],
            run: function (bundle, api, destPath, loaderData) {
                // assert loaderData
                return '/a/b/loader-foo.js';
            }
        });
        YUITest.Mock.expect(plugin, {
            method: '_attachClientMetaData',
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.Object, YUITest.Mock.Value.String, YUITest.Mock.Value.String],
            run: function (bundle, builds, moduleName, newfile) {
                // assert moduleName
                // assert newfile
            }
        });

        plugin.bundleUpdated({
            bundle: bundle,
            files: {
                'bar.js': { fullPath: 'bar.js' },
                'baz.js': { fullPath: 'baz.js' },
                'path/to/something.js': { fullPath: 'path/to/something.js' }
            }
        }, {
            getBundleFiles: api.getBundleFiles,
            promise: function (fn) {
                return new Promise(fn);
            }
        });
        YUITest.Mock.verify(api);
        // FIXME !!!
        // YUITest.Mock.verify(plugin);
    },

    "test _buildsInBundle": function () {
        var plugin,
            bundle,
            jsFiles,
            jsonFiles,
            results;

        bundle = {
            name: 'foo'
        };
        jsFiles = [
            '/tmp/a.js',
            '/tmp/loader-foo.js'
        ];
        jsonFiles = [
            '/tmp/config.json',
            '/tmp/build.json'
        ];
        mockery.resetCache();
        plugin = new PluginClass();

        YUITest.Mock.expect(plugin, {
            method: '_register',
            args: [YUITest.Mock.Value.String,
                    YUITest.Mock.Value.String,
                    YUITest.Mock.Value.Object],
            callCount: 2,
            run: function (bundleName, file, mod) {
                A.areEqual('foo', bundleName, 'wrong bundleName');
            }
        });

        YUITest.Mock.expect(mockShifter, {
            method: '_checkYUIModule',
            args: [YUITest.Mock.Value.String],
            run: function (file) {
                A.isTrue(['/tmp/a.js'].indexOf(file) > -1,
                         'unexpected file being processed: ' + file);

                return {
                };
            }
        });
        YUITest.Mock.expect(mockShifter, {
            method: '_checkBuildFile',
            args: [YUITest.Mock.Value.String],
            callCount: 1,
            run: function (file) {
                A.areEqual('/tmp/build.json', file, 'wrong loader file');
                return {
                };
            }
        });

        results = plugin._buildsInBundle(
            bundle,
            jsFiles,
            jsonFiles
        );

        A.isNotUndefined(results, 'expecting results');
        YUITest.Mock.verify(plugin);
        YUITest.Mock.verify(mockShifter);
    }

}));

YUITest.TestRunner.add(suite);
