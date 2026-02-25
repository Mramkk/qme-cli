## Installation for use
```bash
npm i -g @ramkumarbedia/xqme
```

## Installation and Setup

```bash
npm install -g pkg
```
Installs the `pkg` package globally on your system.

```bash
pkg .
```
Packages the current directory into an executable.

```bash
npm link
```
Creates a symbolic link to your package, making it available globally for testing.

```bash
npm unlink -g
```
Unlink global package from your system.

## Commands

```bash
qme init [--branch <branch-name>]
```
Bootstrap repository defaults:
- adds common `.gitignore` entries
- creates `.githooks/pre-commit`
- sets `git config core.hooksPath .githooks`
- stores pull branch in `~/.mycli.json`

```bash
qme git sync
```
Run commit/pull/push helper flow.

```bash
qme git reset
```
Open reset menu with options:
- show git log
- reset `--soft HEAD~1`
- reset `--mixed HEAD~1`
- reset `--hard HEAD~1`

```bash
qme git log
```
Show recent commits, browse pages with `n`/`p`, select one commit, then reset to that commit (`--soft`, `--mixed`, or `--hard`).

```bash
qme git open
```
Open the current repository `origin` URL in your default browser (supports GitHub, GitLab, Bitbucket, and other standard git remotes).

```bash
qme git ssh-key [--home <path>] [-c <email>] [-f <tag>]
```
Generate a new `rsa 4096` SSH key in your auto-detected platform home directory (`~/.ssh`).

```bash
qme git ssh-key --home "C:\Users\ADMIN" -c "ramkumar.web@neovify.com" -f "oodle"
```
Generates key file: `C:\Users\ADMIN\.ssh\id_rsa_oodle`

```bash
qme git ssh-key --home "/home/dev" -c "dev@example.com" -f "project"
```
Use custom home directory, `-c` as email/comment, and `-f` as tag for `id_rsa_<tag>`.

If `-c` or `-f` is not passed, CLI will prompt:
- Enter email/comment
- Enter tag for `id_rsa_<tag>`

```bash
qme config branch <branch-name>
```
Set remote pull branch for current repository in `~/.mycli.json`.

```bash
qme config export [output-path]
```
Export `~/.mycli.json` to `./mycli-config-backup.json`.

```bash
qme config export "D:\backup\mycli-config.json"
```
Export config backup to a custom path.

```bash
qme config xampp-path "D:\xampp"
```
Save XAMPP install path in `~/.mycli.json`.

```bash
qme config xampp-path "/Applications/XAMPP"
```
On macOS, set your XAMPP base path (optional if default install path is used).

```bash
qme config xampp-path --show
```
Show configured XAMPP path.

```bash
qme config xampp-path --clear
```
Remove configured XAMPP path from config.

```bash
qme config xampp-current 8.1
```
Save your currently active XAMPP version in config.

```bash
qme config xampp-current --show
qme config xampp-current --clear
```
Show or clear configured current XAMPP version.

### XAMPP Commands

```bash
qme xampp start
qme xstart
```
Start XAMPP and wait until phpMyAdmin is reachable:
`http://localhost/phpmyadmin/index.php`
Supported on Windows and macOS.

```bash
qme xampp stop
qme xstop
```
Stop XAMPP.
Supported on Windows and macOS.

```bash
qme config xampp-path "D:\xampp"
qme config xampp-path --show
qme config xampp-path --clear
```
Set, show, or clear XAMPP path in config.

```bash
qme wintask
```
Open Task Manager.

```bash
qme taskm
```
Open Task Manager (shortcut).

```bash
qme wl
```
Lock the current Windows session.

```bash
qme win settings
```
Open Windows Settings.

```bash
qme w notepad
```
Alias for `qme win notepad`.

```bash
qme path
```
Open current folder in File Explorer.

```bash
qme postman
```
Open Postman.

```bash
qme chrome
```
Open Google Chrome.

```bash
qme gchat
```
Open Google Chat desktop app.

```bash
qme gchat
```
Open Google Chat.

```bash
qme npm <args...>
```
Run npm command passthrough via qme.

Example:
```bash
qme npm run dev
qme n run dev
```

```bash
qme n <args...>
```
Alias for npm passthrough via qme.

```bash
qme npx <args...>
```
Run npx command passthrough via qme.

Example:
```bash
qme npx prisma generate
```

```bash
qme hub [start|stop]
```
Start or stop Hubstaff app. `start` opens Hubstaff, `stop` closes running Hubstaff process.

```bash
qme mail
```
Open Thunderbird app.

```bash
qme win postman
```
Alternate command to open Postman via the Windows command group.

```bash
qme notepad
```
Open Notepad.

```bash
qme notepad notes.txt
```
Open a specific file in Notepad.

```bash
qme note
```
Open today’s desktop note file at:
`C:\Users\ADMIN\Desktop\notes-DD-MM-YYYY.txt`

Behavior:
- If today’s note exists, it opens the same file.
- If not, it creates the file first, then opens it.

```bash
qme note 1. testing
```
Append text to today’s desktop note file, then open it in Notepad.

```bash
qme quit
```
Force-close running apps and shut down Windows.

```bash
qme win notepad
```
Alternate command to open Notepad via the Windows command group.

```bash
qme xampp start
```
Start XAMPP. Resolution order:
- `config.system.xamppPath` in `~/.mycli.json`
- `%XAMPP_HOME%\xampp_start.exe` (or `%XAMPP_PATH%` / `%XAMPP_DIR%`)
- `C:\xampp\xampp_start.exe`
- `xampp_start.exe` from `PATH`
- macOS script fallback: `/Applications/XAMPP/xamppfiles/xampp start`

```bash
qme xampp stop
```
Stop XAMPP. Resolution order:
- `config.system.xamppPath` in `~/.mycli.json`
- `%XAMPP_HOME%\xampp_stop.exe` (or `%XAMPP_PATH%` / `%XAMPP_DIR%`)
- `C:\xampp\xampp_stop.exe`
- `xampp_stop.exe` from `PATH`
- macOS script fallback: `/Applications/XAMPP/xamppfiles/xampp stop`

```bash
qme xstart
```
Shortcut for `qme xampp start`.

```bash
qme xstop
```
Shortcut for `qme xampp stop`.






