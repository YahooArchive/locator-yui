/*jslint node:true, nomen: true*/

'use strict';

var express = require('express'),
    LocatorYUI = require('../..'), // locator-yui
    Locator = require('locator'),
    app = express();


// for demo only
app.use(express.directory(__dirname + '/build'));
app.use(express['static'](__dirname + '/build'));

// init locator and configure the plugin
new Locator({
    buildDirectory: 'build'
})
    .plug(new LocatorYUI())
    .parseBundle(__dirname, {}).then(function (have) {

        // listening for traffic only after locator finishes the walking process
        app.listen(3000, function () {
            console.log("Server listening on port 3000");
        });

    }, function (e) {
        console.log(e);
        console.log(e.stack);
    });
