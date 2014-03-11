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
    libpath = require('path'),
    mockery = require('mockery'),
    tmp = require('tmp'),
    suite,
    shifter,
    BuilderClass,
    fixture = libpath.join(__dirname, '..', 'fixtures'),
    tmpFolder = function () {
        var tmpNames = [ 'TMPDIR', 'TMP', 'TEMP' ],
            i;
        for (i = 0; i < tmpNames.length; i += 1) {
            if (typeof process.env[tmpNames[i]] !== 'undefined') {
                return process.env[tmpNames[i]];
            }
        }
        return '/tmp'; // fallback to the default
    };


mockery.resetCache();

// forcing mode to be development
process.env.NODE_ENV = 'development';

suite = new YUITest.TestSuite("shifter-test suite");

suite.add(new YUITest.TestCase({
    name: "shifter-test",

    setUp: function () {
        // requiring component
        shifter = require('../../lib/shifter.js');
        BuilderClass = require('../../lib/builder.js');
    },

    tearDown: function () {
        mockery.resetCache();
    },

    "test constructor": function () {
        A.isNotNull(shifter, "shifter require failed");
    },

    "test _checkYUIModule": function () {
        var result;

        result = shifter._checkYUIModule(libpath.join(fixture, 'app-module.js'));
        A.isObject(result, 'parsing fixtures/app-module.js');
        A.isObject(result.builds['app-module'].config.requires, 'reading fixtures/app-module.js');

        result = shifter._checkYUIModule(libpath.join(fixture, 'metas-parsed-error.js'));
        A.isUndefined(result, 'parsin fixtures/metas-parsed-error.js');

        result = shifter._checkYUIModule(libpath.join(fixture, 'metas.js'));
        A.isObject(result, 'parsin fixtures/metas.js');
        A.isObject(result.builds.metas.config.requires, 'reading fixtures/metas.js');

        result = shifter._checkYUIModule(libpath.join(fixture, 'metas-run-error.js'));
        A.isObject(result, 'parsing fixtures/metas-run-error.js');
        A.isObject(result.builds.metas.config.requires, 'reading fixtures/metas-run-error.js');

        result = shifter._checkBuildFile(libpath.join(fixture, 'whatever-that-does-not-exist.js'));
        A.isUndefined(result, 'parsing fixtures/whatever-that-does-not-exist.js');
    },

    "test _checkBuildFile": function () {
        var result;

        result = shifter._checkBuildFile(libpath.join(fixture, 'mod-valid1/build.json'));
        A.isObject(result, 'parsing fixtures/mod-valid1/build.json');
        A.areSame("bar", result.builds.foo.config.requires[0], 'reading mod-valid1/build.json');
        A.areSame("json-parse", result.builds.bar.config.requires[0], 'reading meta/bar.json configs');

        result = shifter._checkBuildFile(libpath.join(fixture, 'mod-invalid1/build.json'));
        A.isUndefined(result, 'parsing fixtures/mod-invalid1/build.json');

        result = shifter._checkBuildFile(libpath.join(fixture, 'mod-invalid2/build.json'));
        A.isUndefined(result, 'parsing fixtures/mod-invalid2/build.json');

        result = shifter._checkBuildFile(libpath.join(fixture, 'whatever-that-does-not-exist.json'));
        A.isUndefined(result, 'parsing fixtures/whatever-that-does-not-exist.json');
    },

    "test shiftFiles without files": function () {
        shifter.shiftFiles([], { buildDir: tmpFolder() }, function (err) {
            A.isNull(err, 'not error is expected');
        });
    },

    "test shiftFiles with js files": function () {
        var files = [libpath.join(fixture, 'app-module.js'), libpath.join(fixture, 'metas.js')],
            test = this;

        shifter.shiftFiles(files, {
            buildDir: tmpFolder(),
            opts: {
                "global-config": false,
                "coverage": false,
                "lint": false
            }
        }, function (err) {
            test.resume(function(){
                A.isNull(err, 'no error is expected');
            });
        });
        test.wait();
    },

    "test shiftFiles with build.json": function () {
        var files = [libpath.join(fixture, 'mod-valid1/build.json')],
            test = this;
        shifter.shiftFiles(files, {
            buildDir: tmpFolder(),
            opts: {
                "global-config": false,
                "coverage": false,
                "lint": false
            }
        }, function (err) {
            test.resume(function(){
                A.isNull(err, 'no error is expected');
            });
        });
        test.wait();
    },

    // TODO: this is pending to PR https://github.com/yui/shifter/pull/115
    // "test shiftFiles with exit code": function () {
    //     var test = this;
    //     shifter.shiftFiles([libpath.join(fixture, 'missing.js')], {
    //         buildDir: tmpFolder(),
    //         opts: {
    //             "global-config": false,
    //             "coverage": false,
    //             "lint": false
    //         }
    //     }, function (err) {
    //         test.resume(function(){
    //             A.isObject(err, 'error is expected to bubble up');
    //         });
    //     });
    //     test.wait();
    // },

    "test _isCached": function () {
        var self = this;

        // creating a unique and temporary folder to validate the cache mechanism
        tmp.dir(function (err, path) {
            self.resume(function () {
                if (err || !path) {
                    A.fail('unable to create a temporary folder to test');
                }
                A.isFalse(shifter._isCached(libpath.join(fixture, 'app-module.js'), path), 'first call');
                A.isTrue(shifter._isCached(libpath.join(fixture, 'app-module.js'), path), 'second call after caching it');
                A.isFalse(shifter._isCached(libpath.join(fixture, 'mod-valid1/build.json'), path), 'first call for a json file');
                A.isFalse(shifter._isCached(libpath.join(fixture, 'mod-valid1/build.json'), path), 'second call for a json ile');
            });
        });
        this.wait();
    },

    "test _clearCached": function () {
        var self = this;

        tmp.dir(function (err, path) {
            self.resume(function () {
                if (err || !path) {
                    A.fail('unable to create a temporary folder to test');
                }
                A.isFalse(shifter._isCached(libpath.join(fixture, 'app-module.js'), path), 'first call');
                A.isTrue(shifter._isCached(libpath.join(fixture, 'app-module.js'), path), 'second call after caching it');
                shifter._clearCached(libpath.join(fixture, 'app-module.js'), path);
                A.isFalse(shifter._isCached(libpath.join(fixture, 'app-module.js'), path), 'first call');

            });
        });
        this.wait();
    },

    "test BuilderClass": function () {

        var obj = new (BuilderClass)({
                name: 'the-module-name',
                group: 'the-group-name'
            }),
            mods = shifter._checkBuildFile(libpath.join(fixture, 'mod-valid1/build.json'));

        obj.compile({
            'build.json': mods
        });
        A.isTrue(obj.data.js.indexOf('"bar": {') > 0, 'bar module should be in meta');
        A.isTrue(obj.data.js.indexOf('"foo": {') > 0, 'foo module should be in meta');
        A.isTrue(obj.data.js.indexOf('"group": "the-group-name"') > 0, 'the group name should be honored');
        A.isTrue(obj.data.js.indexOf('return Y.UA.android') > 0, 'condition for android should be honored');
    }

}));

YUITest.TestRunner.add(suite);
