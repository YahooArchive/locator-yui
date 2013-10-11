/*
 * Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node: true, nomen: true */

/**
The `express-yui.shifter` extension exposes a set of utilities to build yui modules
from *.js or build.json files.

@module yui
@submodule shifter
**/

'use strict';

var libfs = require('fs'),
    libmkdirp = require('mkdirp'),
    libpath = require('path'),
    vm = require('vm'),
    spawn = require('win-spawn'),
    shifterCLI = require.resolve('shifter/bin/shifter'),
    contextForRunInContext = vm.createContext({
        require: null,
        module: null,
        console: null,
        window: null,
        document: null
    }),
    utils = require('./utils'),
    debug = require('debug')('locator:yui:shifter');

/**
The `express-yui.shifter` extension exposes a locator plugin to build yui modules
from *.js or build.json files.

Here is an example:

    var plugin = app.yui.locatorShifter({});

You can also specify a custom yui build directory, by doing:

    var plugin = app.yui.locatorShifter({
        yuiBuildDirectory: '/path/to/folder'
    });

@class shifter
@static
@uses *path, *fs, *module, *vm, win-spawn, shifter, loader
@extensionfor yui
*/
module.exports = {

    /**
    Shift yui modules using shifter cli.

    @method shiftFiles
    @public
    @param {array} files filesystem paths for all files to be shifted
    @param {object} options configuration

        @param {string} options.buildDir custom path for the output of the shifter
        @param {boolean} options.cache whether or not we should apply cache to speed up
            the shifting process. If true, it will create the folder `.cache` and generate
            some hash to prevent shifting the same *.js files if there is not change in
            the source.
        @param {array}  options.args shifter cli build arguments, it defaults to `[]`

    @param {function} callback the callback method to signal the end of the operation
    **/
    shiftFiles: function (files, options, callback) {

        var self = this,
            queue = [].concat(files),
            args,
            child;

        if (utils.productionMode) {
            debug('skipping shifter in production environments.');
            if (callback) { callback(null); }
            return;
        }

        options = options || {};

        function next() {

            var file = queue.shift();

            if (file) {

                debug('shifting ' + file);

                if (options.cache && self._isCached(file, options.buildDir)) {
                    next();
                    return;
                }

                args = [
                    shifterCLI,
                    "--build-dir", options.buildDir,
                    (libpath.extname(file) === '.js' ? '--yui-module' : '--config'), file
                ].concat(options.args || []);

                child = spawn(process.argv[0], args, {
                    cwd: libpath.dirname(file),
                    stdio: 'inherit'
                });
                child.on('exit', function (code) {
                    if (code) {
                        if (options.cache) {
                            // invalidating the cache entry
                            self._clearCached(file, options.buildDir);
                        }
                        callback(new Error(file + ": shifter compiler error: " + code + '\n' +
                            ' while executing: \n' + args.join(' ')));
                        return;
                    }
                    next(); // next item in queue to be processed
                });

            } else {
                if (callback) { callback(null); }
            }

        }

        next(); // kick off the queue process

    },

    /**
    Analyze a build.json file to extract all the important metadata associted with it.

    @method _checkBuildFile
    @protected
    @param {string} file The filesystem path for the build.json file to be analyzed
    @return {object} The parsed and augmented content of the build.json file
    **/
    _checkBuildFile: function (file) {
        var mod,
            entry,
            metas = libpath.join(libpath.dirname(file), 'meta'),
            files,
            i,
            j,
            f;

        try {
            mod = JSON.parse(libfs.readFileSync(file, 'utf8'));
        } catch (e1) {
            console.error('Failed to parse build file: ' + file);
            console.error(e1);
            return;
        }

        if (!mod.builds) {
            console.error('Invalid meta file: ' + file);
            return;
        }

        mod.buildfile = file;

        if (libfs.existsSync(metas)) {
            files = libfs.readdirSync(metas);
            for (i = 0; i < files.length; i += 1) {
                f = files[i];
                if (libpath.extname(f) === '.json') {
                    try {
                        entry = JSON.parse(libfs.readFileSync(libpath.join(metas, f), 'utf8'));
                    } catch (e2) {
                        console.error('Failed to parse meta file: ' + f);
                        console.error(e2);
                        return;
                    }
                    for (j in entry) {
                        if (entry.hasOwnProperty(j)) {
                            mod.builds[j] = mod.builds[j] || {};
                            mod.builds[j].config = entry[j];
                            // setting the proper filename for test if needed
                            if (entry[j] && entry[j].condition && entry[j].condition.test &&
                                    libpath.extname(entry[j].condition.test) === '.js') {
                                entry[j].condition.test = libpath.join(metas, entry[j].condition.test);
                            }
                        }
                    }
                }
            }
        }
        return mod;
    },

    /**
    Analyze a javascript file, if it is a yui module, it extracts all the important metadata
    associted with it.

    @method _checkYUIModule
    @protected
    @param {string} file The filesystem path for the yui module to be analyzed
    @return {object} The parsed and augmented metadata from the yui module
    **/
    _checkYUIModule: function (file) {
        var mod;

        contextForRunInContext.YUI = {
            add: function (name, fn, version, config) {
                if (!mod) {
                    mod = {
                        name: name,
                        buildfile: file,
                        builds: {}
                    };
                }
                mod.builds[name] = {
                    name: name,
                    config: config || {}
                };
                // detecting affinity from the filename
                if (file.indexOf('.server.js') === file.length - 10) {
                    mod.builds[name].config.affinity = 'server';
                }
                if (file.indexOf('.client.js') === file.length - 10) {
                    mod.builds[name].config.affinity = 'client';
                }
            }
        };
        try {
            vm.runInContext(libfs.readFileSync(file, 'utf8'), contextForRunInContext, file);
        } catch (e) {
            return;
        }
        return mod;
    },

    /**
    Verifies if a source file was already processed by analyzing its content against an
    internal cache mechanism. JSON files (*.json) are an exception, and they will not be
    cached since they might includes other files that might change and affects the result
    of the build so we can't rely on the source file alone. If the file is not in cache,
    it will be included automatically.

    Why? This method is just an artifact to avoid spawning a process to execute shifter, which
    is very expensive. It is also the main artifact to avoid shifting files when in production,
    if the build process includes the build folder, specially because manhattan does not
    support spawn. Finally, it is just a noop artifact to avoid calling shifter, it does not
    need to cache the response of the shifter process, just opt out for the next call to shift
    the same file with the same content.

    @method _isCached
    @protected
    @param {string} file The filesystem path for the file to be cached
    @param {string} buildDir The filesystem path for the build folder
    @return {boolean} `true` if the file and its content matches the internal cache, otherwise `false`.
    **/
    _isCached: function (file, buildDir) {
        var fileHash,
            data;
        if (libpath.extname(file) !== '.json') {
            fileHash = libpath.join(buildDir, '.cache', utils.md5(file));
            data = libfs.readFileSync(file, 'utf8');
            if (libfs.existsSync(fileHash) && (libfs.readFileSync(fileHash, 'utf8') === data)) {
                return true;
            }
            libmkdirp.sync(libpath.join(buildDir, '.cache'));
            libfs.writeFileSync(fileHash, data, 'utf8');
        }
        return false;
    },

    /**
    Removes the cache entry for a particular file.

    Why? This method is just an artifact to invalidate the cache entry created by
    `_isCached` when a shifter error is detected because the cache entry is premature
    created before spawing to shifter.

    @method _clearCached
    @protected
    @param {string} file The filesystem path for the file to be cached
    @param {string} buildDir The filesystem path for the build folder
    **/
    _clearCached: function (file, buildDir) {
        var fileHash;
        fileHash = libpath.join(buildDir, '.cache', utils.md5(file));
        if (libfs.existsSync(fileHash)) {
            libfs.unlinkSync(fileHash, 'utf8');
        }
    }

};
