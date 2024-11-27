# Ui.Vision [RPA](https://ui.vision/rpa)

- AI Robotic Process Automation, includes Selenium IDE import/export

Questions? Suggestions? - Meet us in the Ui.Vision [RPA user forum](https://forum.ui.vision).

Every user benefits from the questions and answers provided in the forum, that is why we would ask you to post the question [in the RPA forum](https://forum.ui.vision) first if a public forum is appropriate for your question. The forum is monitored by active users, tech support and the developers, so we would like to concentrate the discussion "over there" in one place.


# How to install  Ui.Vision:

 Ui.Vision RPA for Chrome, Edge and Firefox is modern cross-platform RPA software for macOS, Linux and Windows. It includes a Selenium IDE and Web Macro Recorder. You find the latest version always in the Chrome and Firefox stores. You can use it _completely free for private and commercial purposes_: 

- [UI.Vision in the Google Chrome Webstore](https://chrome.google.com/webstore/detail/uivision-rpa/gcbalfbdmfieckjlnblleoemohcganoc)

- [UI.Vision in the Firefox Webstore](https://addons.mozilla.org/en-US/firefox/addon/rpa/)

- [UI.Vision in the Microsoft Edge Webstore](https://microsoftedge.microsoft.com/addons/detail/uivision-rpa/goapmjinbaeomoemgdcnnhoedopjnddd)


- [Ui.Vision Homepage](https://ui.vision/rpa)

- List of supported [Selenium IDE commands](https://ui.vision/rpa/docs/selenium-ide/)


# Building the Chrome, Edge and Firefox Extension

Building the extension is _not_ required if you "only" want to use it.

You can [install UI.Vision directly from the Chrome, Edge or Firefox stores](https://ui.vision/rpa), which is the easiest and the recommended way of using the Ui.Vision RPA software. Older versions can be found in the [RPA software](https://ui.vision/rpa/archive) archive. 

The information below is only required and intended for developers:

The project uses Node V20.11.1 and NPM V10.2.4

If you have any questions, please contact us at TEAM AT UI.VISION - Thanks!

# To build the extension bundle

```bash
npm i -f

npm run build   	
npm run build-ff 	
```

And the build files are in `dist` and `dist_ff` folders.

# To develop
```bash
npm i -f

npm run ext
```

The built files during development are also in `dist` and `dist_ff` folders

Once done, the ready-to-use extension code appears in the /dist directory (Chrome) or /dist_ff directory (Firefox).





