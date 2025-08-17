# Elixir Alias Helper (aliasex)

Automatically add Elixir module aliases when referencing modules in your code.

## Features

- **Quick Alias Addition**: Select a module name and automatically insert the correct `alias` statement
- **Smart Module Discovery**: Scans your project's `lib/` and `deps/` directories to build a module registry
- **Duplicate Detection**: Prevents adding duplicate aliases
- **Keyboard Shortcuts**: Use `Cmd+Shift+A` (Mac) or `Ctrl+Shift+A` (Windows/Linux)

## How to Use

1. In an Elixir file, write code that references a module: `InboxEmailAlerts.get_alert_by_message_id(message_id)`
2. Select the module name `InboxEmailAlerts`
3. Either:
   - Press `Cmd+Shift+A` (Mac) or `Ctrl+Shift+A` (Windows/Linux)
   - Right-click and select "Add Elixir Alias"
   - Open Command Palette (`Cmd+Shift+P`) and run "Elixir: Add Alias"
4. The extension will automatically insert `alias Parrot.Inbox.InboxEmailAlerts` after your defmodule line

## Requirements

- VS Code 1.74.0 or higher
- Elixir files with `.ex` or `.exs` extension
- An Elixir project with `lib/` directory structure

## Available Commands

- **Elixir: Add Alias**: Add an alias for the selected module name
- **Elixir: Refresh Module Cache**: Manually refresh the module cache (useful after adding new modules)

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

TODO: show a picker when there are multiple entries
TODO: when there is no selection, we could expand the selection from the cursor position
TODO: improve nested module handling
TODO: dynamic cache rebuilding (when compilation is triggered?)

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
