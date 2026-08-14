# Changelog

## Unreleased

## 4.0.8

- Improved saved Git user management with provider-aware matching and display.
- Simplified the config menu and made Open/Export exit after completing.

## 4.0.7

- Added clear-terminal actions to the Git user, Git sync, and config menus.
- Invalid config menu input now exits instead of reopening the menu.

## 4.0.6

- Fixed global updates on Windows by invoking the `npm.cmd` executable.

## 4.0.5

- Added a consistent git user menu when no saved users exist.
- Updated the SSH key tag prompt wording.
- Fixed the git users menu divider so it appears only when returning from a submenu.

## 4.0.3

- Added a consistent git user menu when no saved users exist.

## 4.0.2

- Organized command routing into dedicated command modules.
- Added shared process, project, PHP, network, validation, and XAMPP services.
- Added centralized error handling, verbose/quiet output modes, plugins, and shell completion.
- Added ESLint, Prettier, automated checks, and service/router tests.

## 3.0.0

- Existing cross-platform CLI release.
