## qme-cli

`qme-cli` is a cross-platform developer command-line toolkit focused on speeding up everyday project setup and workflow tasks.

It provides shortcuts for:

- Git initialization and sync flows
- SSH key generation helpers
- Workspace inspection and run helpers
- Windows/macOS utility commands
- XAMPP, MySQL, Flutter, and Android ADB workflows
- Local productivity commands from a single `qme` entry point

Package: `@ramkumarbedia/xqme`

## Install

```bash
npm i -g @ramkumarbedia/xqme
```

## Help

```bash
qme help
qme --help
qme --version
```

## Core Commands

### Git

```bash
qme git sync
qme git open
qme git users
qme git users add
qme git users remove
qme git ssh-key --home "C:\Users\ADMIN" --comment "demo@example.com" --tag "oodle"
qme git repo project id 123
```

- `qme git sync` runs the guided commit/pull/push flow.
- `qme git open` opens the current repository remote in the browser.
- `qme git users [switch|add|remove]` manages saved Git identities.
- `qme git ssh-key` creates an RSA 4096 SSH key in the platform home directory.
- `qme git repo project id <project-id>` stores the repo project ID for GitLab merge request automation.

### Config

```bash
qme config
qme config branch develop
qme config export "D:\backup\qme-config.json"
qme config xampp-path "D:\xampp"
qme config xampp-v 8.1
qme config xampp-v --show
qme config xampp-v --clear
```

### Workspace

```bash
qme pilot
qme run
qme open https://example.com
qme alias list
qme alias add gs -- git sync
qme alias add gitlabTask --value https://gitlab.com/web-management1/streamlytv-web/-/boards
qme alias remove gs
```

- `qme pilot` inspects the current workspace and prints a quick readiness summary.
- `qme run` starts the detected project type when possible.
- `qme open <url>` opens a URL or local target.
- `qme alias` lets you create custom shortcuts in qme config.
- `qme run` stores successful workspaces in `system.projects` as an array of entries with `path`, `type`, and `updatedAt`. For Laravel projects, it also stores `phpVersion` and `laravelVersion`.

### Flutter

```bash
qme flutter
qme flutter run
qme flutter build apk
qme flutter devices
qme flutter clean
```

- `qme flutter` is the Flutter helper entry point.
- `qme flutter build` supports targets like `apk`, `appbundle`, `web`, `windows`, `macos`, `linux`, and `ios`.

### Android ADB

```bash
qme adb
qme adb devices
qme adb connect
qme adb -s <device> shell
```

- `qme adb` is the Android device helper entry point.
- `qme adb connect` helps connect a USB-attached device to ADB over Wi-Fi.

### XAMPP

```bash
qme xampp start
qme xampp stop
qme xampp switch 8.2
qme xstart
qme xstop
qme xswitch 8.2
qme xini
qme xproj
```

- `qme xampp start|stop|switch` manages XAMPP.
- `qme xstart|xstop|xswitch` are shortcuts for the same flows.
- `qme xini` opens the active XAMPP `php.ini`.
- `qme xproj` lists projects from the active XAMPP `htdocs` directory.

### MySQL

```bash
qme mysql
qme mysql create my_database
qme mysql my_database import "D:\backup\my_database.sql"
qme mysql my_database export
qme mysql my_database truncate
qme mysql my_database delete
qme mysql my_database shell
```

- `qme mysql` opens the guided database action menu.
- `qme mysql create`, `import`, `export`, `truncate`, `delete`, and `shell` are available as direct commands.

### Windows and Productivity

```bash
qme wintask
qme taskm
qme wl
qme path
qme .
qme postman
qme chrome
qme gchat
qme hub start
qme hub stop
qme mail
qme notepad notes.txt
qme note "daily update done"
qme notes "follow up tomorrow"
qme quit
qme timer 25 "Deep work"
qme timer 0.01 "notify demo" --popup
```

- `qme wintask` and `qme taskm` open Task Manager.
- `qme wl` locks the current Windows session.
- `qme path` opens the current folder in File Explorer, while `qme .` opens the current folder in Finder or File Explorer.
- `qme postman`, `qme chrome`, `qme gchat`, `qme hub`, `qme mail`, and `qme notepad` launch common apps.
- `qme note` and `qme notes` write to today's desktop note file.
- `qme quit` closes helper apps and shuts down Windows.
- `qme timer` starts a Pomodoro-style countdown with notification support.

### Mail Drafts

```bash
qme sprint-review
qme sprint-review team@example.com
qme sprint-plan
qme sprint-plan team@example.com
```

- These commands create Outlook compose drafts with today's month in the subject.
- The recipient is optional.

### PEM Permissions

```bash
qme pem -f "C:\path\to\file.pem"
```

- `qme pem` fixes file permissions for a PEM key file.

## Custom Aliases

Create your own shortcuts without forking `qme` by saving aliases in the qme config file.

```bash
qme alias add gs -- git sync
qme gs

qme open http://localhost:8000
qme alias add web -- open http://localhost:8000
qme web

qme alias add gitlabTask --value https://gitlab.com/web-management1/streamlytv-web/-/boards
qme gitlabTask
```

`qme alias add` supports two common forms:

- `qme alias add <name> -- <command...>` for regular command aliases.
- `qme alias add <name> --value <url>` for URL shortcuts that open in the browser.

Aliases are stored in your config file (`~/.qme-cli.json`, or legacy `~/.mycli.json`) under `system.aliases`:

```json
{
  "system": {
    "aliases": {
      "gs": ["git", "sync"],
      "gitlabTask": ["open", "https://gitlab.com/web-management1/streamlytv-web/-/boards"]
    }
  }
}
```
