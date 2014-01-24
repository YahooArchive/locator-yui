/*
 * Copyright (c) 2014, Yahoo! Inc.  All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

/*jslint node: true, nomen: true */

"use strict";

var YUI = require('yui').YUI,
    utils = require('./utils'),
    Y = YUI({ useSync: true }),
    FORCE_CALC = true;

Y.use('loader', 'oop');

/**
 * Precomputes loader metadata for a module, so that we don't have to at runtime.
 * @public
 * @method expander
 * @param {string} name the name of the module to be expanded
 * @param {object} mod the metadata of the module to be expanded
 * @return {object} the expanded module config
 */
function expander(name, mod) {
    var loader,
        resolved,
        modules_config = {},
        js = {},
        i;

    modules_config[name] = Y.clone(mod);

    Y.applyConfig({ modules: modules_config });

    // using the loader at the server side to compute the loader metadata
    // to avoid loading the whole thing on demand.
    loader = new Y.Loader(utils.extend(Y.config, {
        require: [name]
    }));
    resolved = loader.resolve(FORCE_CALC);

    for (i = 0; i < resolved.jsMods.length; i += 1) {
        js[resolved.jsMods[i].name] = resolved.jsMods[i];
        if (resolved.jsMods[i].name === name) {
            mod._parsed      = true;
            mod.type         = js[name].type;
            mod.expanded     = js[name].expanded;
            mod.expanded_map = js[name].expanded_map;
            mod.defaults = {}; // noop
        }
    }
    return mod;
}

module.exports = expander;
