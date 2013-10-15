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
    suite;

suite = new YUITest.TestSuite("locator-yui/utils-test suite");

suite.add(new YUITest.TestCase({
    name: "utils-test",

    setUp: function () {
    },

    tearDown: function () {
    },

    "test constructor": function () {
        A.isTrue(true, 'testing constructor');
    },

    "test config": function () {
        A.isTrue(true, 'testing config');
    }

}));

YUITest.TestRunner.add(suite);
