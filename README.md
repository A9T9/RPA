# Ui.Vision — Browser and Desktop Automation

**Automate websites and desktop applications with macros, JavaScript, or an AI assistant.** Ui.Vision combines browser automation, OCR and image recognition, with an MCP server that lets AI agents create, edit and run reusable macros in your browser.

[Install the extension](#get-started) · [Connect an AI assistant with MCP](#connect-an-ai-assistant-with-mcp) · [API reference](https://ui.vision/ai/ai-system-prompt) · [User forum](https://forum.ui.vision)

## What can you automate?

- **Browser tasks:** fill forms, extract web data, download reports and repeat workflows in your existing browser session.
- **Website testing:** record and replay interactions, use Selenium IDE commands, and run checks with different input data.
- **Visual tasks:** find on-screen text with OCR and locate controls by image when HTML selectors are unavailable.
- **Desktop workflows:** automate applications and remote desktop interfaces using visual recognition and mouse and keyboard input. Desktop automation requires the additional Ui.Vision desktop components (XModules).
- **AI-assisted automation:** ask the built-in AI assistant or an external MCP client to write and run macros, then inspect the resulting script, logs and screenshots.

Use the macro recorder and command table, write JavaScript with the `uiv.*` API, or let an AI assistant author the macro. The resulting automation can be saved and run again.

## Get started

Install the browser extension; you do not need to build this repository:

- [Chrome Web Store](https://chrome.google.com/webstore/detail/uivision-rpa/gcbalfbdmfieckjlnblleoemohcganoc)
- [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/uivision-rpa/goapmjinbaeomoemgdcnnhoedopjnddd)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/rpa/)

Open Ui.Vision and record a browser task, or start with a macro from the extension's demos. For desktop input and additional native capabilities, see the [XModules installation guide](https://ui.vision/rpa/x).

The browser extension is open source and free for personal and commercial use. See the [Ui.Vision website](https://ui.vision/) for desktop components and available editions.

## Connect an AI assistant with MCP

Ui.Vision provides a **Model Context Protocol (MCP) server** through the `uivision-mcp-bridge` package. It connects MCP clients such as Claude Code, Claude Desktop and Cursor to the Ui.Vision browser extension.

An agent can inspect a page, create or edit a macro, run it, and use logs and screenshots to check the result. The automation executes through Ui.Vision in your browser.

Start with the [MCP setup guide](https://ui.vision/mcp). The installer command is:

```bash
npx uivision-mcp-bridge --setup
```

The installer registers Ui.Vision with supported MCP clients found on your machine. Then enable the MCP bridge in **Ui.Vision → Settings → AI**, complete the connection steps in the guide, and restart your MCP client. Node.js and npm are required to run the installer.

For a first task, ask your connected assistant:

> Use Ui.Vision to open https://example.com, read the page heading, and save a reusable macro for this task.

See [mcp/README.md](mcp/README.md) for bridge source, configuration and troubleshooting.

## JavaScript automation and documentation for AI assistants

The `uiv.*` JavaScript API covers page elements, visual matching, OCR, browser and desktop input, screenshots, tabs, CSV files and downloads. Ui.Vision macros execute sequentially: write API calls without `async` or `await`.

When asking an AI assistant to write a macro, give it the API reference below so it uses Ui.Vision's supported methods and runtime conventions.

- [Ui.Vision JavaScript API and AI authoring guide](https://ui.vision/ai/ai-system-prompt): API syntax and automation recipes used by the built-in assistant.
- [Plain-text reference for AI assistants](https://ui.vision/llms-full.txt): documentation that can be supplied directly as context.
- [Classic command-to-JavaScript mapping](uiv-commands.md): `uiv.*` equivalents and the `uiv.run('command', 'target', 'value')` bridge for classic commands.
- [Selenium IDE command reference](https://ui.vision/rpa/docs/selenium-ide/): documentation for command-table macros.

## Help and support

Ask questions and share automation examples in the [Ui.Vision user forum](https://forum.ui.vision), where users, support staff and developers participate.

## Build from source

Building the extension is _not_ required if you "only" want to use it.

You can [install UI.Vision directly from the Chrome, Edge or Firefox stores](https://ui.vision/rpa), which is the easiest and the recommended way of using the Ui.Vision browser extension. Older versions can be found in the [RPA software](https://ui.vision/rpa/archive) archive.

The information below is only required and intended for developers:

The project uses Node V20.11.1 and NPM V10.2.4

If you have any questions, please contact us at TEAM AT UI.VISION - Thanks!

### Build the extension bundle

```bash
npm i -f
```

```bash
npm run build
```

```bash
npm run build-ff
```

`npm run build` creates the Chrome/Edge build in `dist`, `npm run build-ff` creates the Firefox build in `dist_ff`.

### Develop

```bash
npm i -f
```

```bash
npm start
```

Use `npm run start-ff` for the Firefox variant. Both run webpack in watch mode, so the bundles in `dist` (Chrome/Edge) and `dist_ff` (Firefox) are rebuilt on every change.

Once done, the ready-to-use extension code appears in the `/dist` directory (Chrome, Edge) or `/dist_ff` directory (Firefox). Load it via `chrome://extensions` → "Load unpacked" (Chrome/Edge) or `about:debugging` → "Load Temporary Add-on" (Firefox).

## Repository layout

- `src/` - the extension source (React UI, side panel, macro player, commands)
- `extension/` - static extension assets and `manifest.json` (Manifest V3)
- `mcp/` - the Ui.Vision MCP bridge, which lets Claude Code and other MCP clients create, edit and run macros. See [mcp/README.md](mcp/README.md)
- `dist/`, `dist_ff/` - build output for Chrome/Edge and Firefox

