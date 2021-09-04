# UI.Vision [RPA](https://ui.vision/rpa) (formerly Kantu)

- Modern Robotic Process Automation plus Selenium IDE++

Questions? Suggestions? - Meet us in the UI.Vision [RPA user forum](https://forum.ui.vision).

Every user benefits from the questions and answers provided in the forum, that is why we would ask you to post the question [in the RPA forum](https://forum.ui.vision) first if a public forum is appropriate for your question. The forum is monitored by active users, tech support and the developers, so we would like to concentrate the discussion "over there" in one place


# How to install  UI.Vision RPA:

 UI.Vision RPA for Chrome and Firefox is modern cross-platform RPA software for macOS, Linux and Windows. It includes a Selenium IDE and Web Macro Recorder. You find the latest version always in the Chrome and Firefox stores. You can use it _completely free for private and commercial purposes_: 

- [UI.Vision RPA in the Google Chrome Webstore](https://chrome.google.com/webstore/detail/uivision-rpa/gcbalfbdmfieckjlnblleoemohcganoc)

- [UI.Vision RPA in the Firefox Webstore](https://addons.mozilla.org/en-US/firefox/addon/rpa/)

- [UI.Vision RPA in the Microsoft Edge Webstore](https://microsoftedge.microsoft.com/addons/detail/uivision-rpa/goapmjinbaeomoemgdcnnhoedopjnddd)


- [UI.Vision RPA plus Selenium IDE Homepage](https://ui.vision/rpa)

- List of supported [Selenium IDE commands](https://ui.vision/rpa/docs/selenium-ide/)


# Building the Chrome, Edge and Firefox Extension

We use Node V12.16.1 and NPM V6.13.4.

Building the extension is _not_ required if you "only" want to use it.

You can [install UI.Vision RPA directly from the Chrome, Edge or Firefox stores](https://ui.vision/rpa), which is the easiest and the recommended way of using the UI.Vision RPA software. Older versions can be found in the [RPA software](https://ui.vision/rpa/archive) archive. 

Besides, as a general piece of information: All browser extensions are written in Javascript and thus they are all open-source (in the technical sense) by nature. You can set break points and debug any extension right in your browser.

This is for example our UI.Vision RPA software, installed from the Chrome store and debugged and inspected directly in the web browser. No Github repo or anything is required for that to work. Anyone can do it in any browser:




But of course developers can also build it directly from the source code with this command line:

```
npm i
npm run build (or build-ff for Firefox)
```

Once done, the ready-to-use extension code appears in the /dist directory (Chrome) or /dist_ff directory (Firefox).

# Need the very latest source code version?

Please note that we use an internal source code repository for our daily development work. The very latest source code snapshot can always be requested directly from the development team. Please contact us at team AT ui.vision. We are looking forward talking to you. And of course, if you want to join the development you are welcome.
