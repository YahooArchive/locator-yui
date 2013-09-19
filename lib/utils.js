/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node:true, nomen: true */

'use strict';

/**
Utilities used across `locator-yui` components.

@module locator-yui
@submodule utils
**/

var NODE_ENV = process.env.NODE_ENV || 'development',
    crypto = require('crypto');

/**
Extends object with properties from other objects.

    var a = { foo: 'bar' }
      , b = { bar: 'baz' }
      , c = { baz: 'xyz' };

    utils.extends(a, b, c);
    // a => { foo: 'bar', bar: 'baz', baz: 'xyz' }

@method extend
@param {Object} obj the receiver object to be extended
@param {Object*} supplier objects
@return {Object} The extended object
**/
exports.extend = function (obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function (source) {
        var key;

        if (!source) { return; }

        for (key in source) {
            if (source.hasOwnProperty(key)) {
                obj[key] = source[key];
            }
        }
    });

    return obj;
};

/**
Test if `fn` is a function. This is useful to distinguish functions from objects.

@method isFunction
@param {Object|Function} fn the function to be tested
@return {Boolean} `true` if `fn` is a function, `false` otherwise
**/
exports.isFunction = function (fn) {
    return !!(fn && (Object.prototype.toString.call(fn) === '[object Function]') && fn.toString);
};

/**
Test if `re` is a regular expression.

@method isRegExp
@param {Object|Function} re the regular express to be tested
@return {Boolean} `true` if `re` is a regular express, `false` otherwise
**/
exports.isRegExp = function (re) {
    return !!(re && (Object.prototype.toString.call(re) === '[object RegExp]'));
};

/**
Get the fullPath of all modified files that might be shifted.

@method filterFilesInBundle
@param {Object} bundle the bundle to be analyzed
@param {object} the original `evt.files` from locator plugin
@param {function} filter Custom function to analyze each file
@return {array} the list of files to be shifted or empty array
**/
exports.filterFilesInBundle = function (bundle, list, filter) {
    var files = [];
    // getting the fullPath of all modified files that should be shifted in a form of an array
    Object.keys(list || {}).forEach(function (element) {
        // filtering out files based on filder if neded
        if (!filter || filter(bundle, list[element].relativePath)) {
            // producing an array of fullPath values
            files.push(list[element].fullPath);
        }
    });
    return files;
};

exports.md5 = function (str) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(str);
    return md5sum.digest('hex');
};

/**
Whether the app is running in debug mode or not. True if nodejs is running
in development mode.

@property debugMode
@type {Boolean}
**/
exports.debugMode = (NODE_ENV === 'development');

/**
Whether the app is running in production mode or not. True if nodejs is running
in production mode.

@property productionMode
@type {Boolean}
**/
exports.productionMode = (NODE_ENV === "production");
