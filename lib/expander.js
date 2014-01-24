var YUI = require('yui').YUI,
    utils = require('./utils'),
    Y = YUI({ useSync: true });

Y.use('loader', 'oop');

module.exports = {
    /**
     * Precomputes YUI loader metadata, so that we don't have to at runtime.
     * @private
     * @method expand
     * @param {object} modules_config the metadata of all available modules
     * @return {nothing}
     */
    expand: function(name, mod) {
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
        resolved = loader.resolve(true);

        for (i = 0; i < resolved.jsMods.length; i += 1) {
            js[resolved.jsMods[i].name] = resolved.jsMods[i];
            if (resolved.jsMods[i].name === name) {
                mod._parsed      = true;
                mod.type         = js[name].type;
                mod.expanded     = js[name].expanded;
                mod.expanded_map = js[name].expanded_map;
                mod.defaults = {}; // noop
                mod.requires = []; // noop
            }
        }
        return mod;
    }
};
