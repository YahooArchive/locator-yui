/*
* Copyright (c) 2013, Yahoo! Inc. All rights reserved.
* Copyrights licensed under the New BSD License.
* See the accompanying LICENSE file for terms.
*/

/*jslint node:true, nomen:true*/

"use strict";

var YUITest = require('yuitest'),
    A = YUITest.Assert,
    OA = YUITest.ObjectAssert,
    suite,
    // _buildsInBundle = loader._buildsInBundle;
    // loader = require('../../lib/loader.js'),
    mockery = require('mockery'),
    mockShifter,
    mockBuilder,
    PluginClass = require('../../lib/plugin.js');

suite = new YUITest.TestSuite("plugin-test suite");

suite.add(new YUITest.TestCase({
    name: "plugin-test",

    setUp: function () {
        // nothing
        mockery.enable({
            useCleanCache: true,
            warnOnReplace: true,
            warnOnUnregistered: true
        });
        mockShifter = YUITest.Mock();
        // mockBuilder = YUITest.Mock();
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
        mockery.register('./shifter', mockShifter);
        mockery.register('./builder', mockBuilder);
    },

    // PluginClass
    // register
    // getLoaderData
    // bundleUpdated
    // _buildsInBundle
    //
    tearDown: function () {
        mockShifter = null;
        mockBuilder = null;
        mockery.deregisterAll();
        mockery.disable();

        // unregister mocks
        // delete loader._bundles;
        // delete loader.attachModules;
        // delete loader.registerGroup;
        // delete loader.shiftFiles;
        // delete loader._checkYUIModule;
        // delete loader._checkBuildFile;
        // delete loader.BuilderClass;
        // loader._buildsInBundle = _buildsInBundle;
    },

    "test constructor": function () {
        A.isNotNull(PluginClass, "loader require failed");
    },

    "test plugin constructor": function () {
        var plugin = new PluginClass();
        A.isObject(plugin, "failing to create a plugin object");
        A.isObject(plugin.describe, "missing describe member on plugin instance");
        A.isFunction(plugin.bundleUpdated, "missing bundleUpdated member on plugin instance");
        A.isArray(plugin.describe.args, "default shifter options should be honored");
    },

    // TODO replace with x.plugin-test.js
    // "test plugin constructor with custom settings": function () {
    //     var plugin = new PluginClass({
    //         summary: 1,
    //         types: 2,
    //         args: ['4'],
    //         more: 3
    //     });
    //     A.isObject(plugin, "failing to create a plugin object");
    //     A.isObject(plugin.describe, "missing describe member on plugin instance");
    //     A.areSame(1, plugin.describe.summary);
    //     A.areSame(2, plugin.describe.types);
    //     A.areSame(3, plugin.describe.more);
    //     A.areSame('4', plugin.describe.args[0]);
    // },

    "test register": function () {
        var plugin = new PluginClass();

        plugin.register('foo', __dirname, 1);
        plugin.register('bar', __filename, 2);
        plugin.register('foo', __dirname, 3);
        A.areSame(3, plugin._bundles.foo[__dirname]);
        A.areSame(2, plugin._bundles.bar[__filename]);
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
    }
    /*
    "test plugin flow with register and attach": function () {
        var plugin = new PluginClass({
                // registerGroup: true,
                // registerServerModules: true,
                // useServerModules: true
            }),
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
            method: 'writeFileInBundle',
            args: ['foo', 'loader-foo.js', YUITest.Mock.Value.String],
            callCount: 1,
            run: function (bundleName, destination_path, contents) {
                A.areSame('content of loader-foo.js', contents);
                return {
                    // mocking promise
                    then: function (fn) {
                        return fn(__filename);
                    }
                };
            }
        });
        YUITest.Mock.expect(api, {
            method: 'getBundleFiles',
            args: ['foo', YUITest.Mock.Value.Object],
            run: function (bundleName, filters) {
                return ['bar.js', 'baz.js', 'path/to/build.json'];
            }
        });
        YUITest.Mock.expect(api, {
            method: 'promise',
            args: [YUITest.Mock.Value.Function],
            run: function (fn) {
                return fn(function (loaderData) {
                    // A.isString(bundle.yuiBuildDirectory);
                    A.isString(bundle.buildDirectory);
                    // verify loaderData matches
                    return {
                        then: function (fn) {
                            fn(loaderData);
                        }
                    };
                }, function () {
                    A.fail('promise rejected');
                });
            }
        });
        // YUITest.Mock.expect(loader, {
        YUITest.Mock.expect(mockShifter, {
            method: '_checkYUIModule',
            callCount: 3,
            args: [YUITest.Mock.Value.String],
            run: function () {
                return '_checkYUIModule result';
            }
        });
        // YUITest.Mock.expect(loader, {
        YUITest.Mock.expect(mockShifter, {
            method: '_checkBuildFile',
            callCount: 1,
            args: [YUITest.Mock.Value.String],
            run: function () {
                return '_checkBuildFile result';
            }
        });
        YUITest.Mock.expect(plugin, {
            method: '_buildsInBundle',
            args: [YUITest.Mock.Value.Object, YUITest.Mock.Value.Any, YUITest.Mock.Value.Any],
            run: function (bundle, modifiedFiles) {
                return ['bar.js'];
            }
        });
        // YUITest.Mock.expect(loader, {
        YUITest.Mock.expect(plugin, {
            // method: 'registerGroup',
            method: 'register',
            args: ['foo', '/path/to/foo-a.b.c', __filename]
        });
        // YUITest.Mock.expect(loader, {
        //     method: 'registerModules',
        //     args: ['foo', YUITest.Mock.Value.Object],
        //     run: function (name, modules) {
        //         A.areEqual('json version of loader-foo.js', modules.mod1, 'mod1 was not registered');
        //     }
        // });
        // YUITest.Mock.expect(loader, {
        //     method: 'attachModules',
        //     args: ['foo', YUITest.Mock.Value.Any],
        //     run: function (name, modules) {
        //         A.areEqual(1, modules.length, 'mod1 was not attached');
        //         A.areEqual('mod1', modules[0], 'mod1 was not attached');
        //     }
        // });
        // YUITest.Mock.expect(loader, {
        YUITest.Mock.expect(mockShifter, {
            method: 'shiftFiles',
            args: [YUITest.Mock.Value.Any, YUITest.Mock.Value.Object, YUITest.Mock.Value.Function],
            run: function (files, options, callback) {
                callback();
            }
        });
        // loader.BuilderClass = function (name, group) {
        //     this.compile = function (meta) {
        //         A.isObject(meta);
        //     };
        //     this.data = {
        //         js: 'content of loader-foo.js',
        //         json: {
        //             mod1: 'json version of loader-foo.js'
        //         }
        //     };
        // };
        plugin.bundleUpdated({
            bundle: bundle,
            files: {
                'bar.js': { fullPath: 'bar.js' },
                'baz.js': { fullPath: 'baz.js' },
                'path/to/something.js': { fullPath: 'path/to/something.js' }
            }
        }, api);
        YUITest.Mock.verify(api);
        // YUITest.Mock.verify(loader);
    }
    */
}));

YUITest.TestRunner.add(suite);
