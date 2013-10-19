What is this example?
---------------------

This is the simplest example that demonstate how to use the `locator-yui` plugin.

How does it work?
-----------------

The plugin will process any modules in the application bundle and, using
`shifter`, will generate the approprate build and loader metadata.

The generated files can either be packaged to be published to a CDN, or served
from the app origin (only recommended for development mode).

How to test this app?
---------------------

Make sure you install the `locator-yui` component first by doing `npm  i` 
on the root folder of this repository, then :

```
npm i
node app.js
```

Then navigate to the app:

* `http://localhost:3000/`

The web app will show the `build` directory where all your app resources have
been `shift`ed.


