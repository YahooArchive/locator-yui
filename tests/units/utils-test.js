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
    libutils = require('../../lib/utils'),
    suite;

suite = new YUITest.TestSuite("locator-yui/utils-test suite");

suite.add(new YUITest.TestCase({
    name: "utils-test",

    setUp: function () {
    },

    tearDown: function () {
    },

    "test extend": function () {

        OA.areEqual({ a: 'f', c: 'd'},
                    libutils.extend({a: 'b'}, {c: 'd', a: 'f'}),
                    'wrong merged object');
    },

    "test isFunction": function () {
        A.areEqual(true, libutils.isFunction(function () {}), 'should be a function');
        A.areEqual(false, libutils.isFunction('fake function'), 'should NOT be a regex');
    },

    "test isRegExp": function () {
        A.areEqual(true, libutils.isRegExp(/^foo/), 'should be a reges');
        A.areEqual(false, libutils.isFunction('fake regex'), 'should NOT be a regex');
    },

    "test filterFilesInBundle with no filter": function () {
        var bundle,
            list,
            filter,
            results;

        bundle = {
            foo: 'bar'
        };
        list = {
            'news.js': {
                fullPath: '/a/b/c/news.js',
                relativePath: 'c/news.js'
            },
            'photos.js': {
                fullPath: '/a/b/c/photos.js',
                relativePath: 'c/photos.js'
            }
        };
        results = libutils.filterFilesInBundle(bundle, list);

        A.areEqual(2, results.length, 'array should contain 1 file only');
        A.isTrue(results[0].indexOf('news') > -1, 'file should be /a/b/c/news.js');
        A.isTrue(results[1].indexOf('photos') > -1, 'file should be /a/b/c/photos.js');
    },
    "test filterFilesInBundle": function () {
        var bundle,
            list,
            filter,
            results;

        bundle = {
            foo: 'bar'
        };
        list = {
            'news.js': {
                fullPath: '/a/b/c/news.js',
                relativePath: 'c/news.js'
            },
            'photos.js': {
                fullPath: '/a/b/c/photos.js',
                relativePath: 'c/photos.js'
            }
        };
        filter = function (aBundle, relPath) {
            OA.areEqual(bundle, aBundle, 'wrong bundle');
            if (relPath.indexOf('photos') > -1) {
                return false;
            }
            return true;
        };

        results = libutils.filterFilesInBundle(bundle, list, filter);

        A.areEqual(1, results.length, 'array should contain 1 file only');
        A.isTrue(results[0].indexOf('news') > -1, 'file should be /a/b/c/news.js');
    },

    "test md5": function () {
        var hash = libutils.md5('locatoryuirocks');

        A.areEqual('2fc08c9e435097297a538730844bc9ce',
                   hash,
                   'wrong md5hash');
    }

}));

YUITest.TestRunner.add(suite);
