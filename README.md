## qme-cli

`qme-cli` is a cross-platform developer command-line toolkit focused on speeding up everyday project setup and workflow tasks.



Package: `@ramkumarbedia/xqme`

## Install

```bash
# Global install
npm i -g @ramkumarbedia/xqme
```

```bash
qme git sync
```

Runs an interactive Git workflow. With a clean working tree, the menu includes Pull, Push, Change pull branch, checkout, merge, reset, branch deletion, and Abort. Selecting Push opens a second menu for normal Push or Force Push; both push the current local branch without pulling first.

### Git users (multiple accounts)

- `qme git users add` (aliases: `qme add git user`, `qme git user add`): prompts for name/email and saves it to the qme config user list.
- `qme git users` (aliases: `qme git user switch`, `qme git users switch`): choose a saved user (or enter manually) and update global `git config --global user.name/user.email`. The menu also supports adding or removing saved users.
- `qme git users remove` (alias: `qme git user remove`): remove a saved user from the qme config user list.

Config file: `~/.qme-cli.json` (or legacy `~/.mycli.json`).

4. `qme git reset`
   Opens reset menu (`soft`, `mixed`, `hard`) for recent changes.

```bash
qme git sync
```
Runs an interactive Git synchronization workflow for the current repository. It verifies the repository, shows the current Git user and branches, detects local changes, and offers actions such as commit, stash, pull, branch checkout, branch creation, merge, hard reset, branch deletion, or abort.

   After a commit or pull, it can push the current branch. After a successful push, it can optionally open a GitHub Pull Request or GitLab Merge Request URL. GitLab merge request links require a configured `project_id`. The configured pull branch is stored in qme config and defaults to `main`.

   **Warning:** Reset hard, branch deletion, and force push can discard or overwrite changes. Review the selected action before confirming.

```bash
qme git open
```
`qme git open`
   Opens current repository remote URL in browser at the current branch page.
   Alias: `qme git -o`

```bash
qme git open
```

7. `qme git remove`
   Removes `.git` folder after confirmation.

```bash
qme git remove
```

8. `qme git ssh-key [--home <path>] [--host <hostname>] [--tag <name>]`
   Shows saved Git users with add/remove options, then uses the selected user’s email to generate an Ed25519 SSH key. It creates a matching profile in `~/.ssh/config` only when the host does not already exist.

```bash
qme git ssh-key --host github.com --tag work
```

9. `qme config`
   Opens the qme config file in VS Code. Creates it first if it does not exist.

```bash
qme config
```

`qme run` detects Laravel, Flutter, and Node.js projects. For Node.js projects, it reads `package.json` and shows every available script, then runs the selected script using npm, pnpm, or Yarn based on the lockfile. Successful workspaces are stored in the config file under `system.projects` as an array of entries with `path`, `type`, and `updatedAt`. For Laravel projects, it also stores `phpVersion` and `laravelVersion`. If the same path is run again, its entry is refreshed.

Sprint mail recipients are read from `system.sprintMail.to` and `system.sprintMail.cc` in an existing `qme-cli.json` file. Edit these arrays to change the recipients for `qme sprint-review` and `qme sprint-plan`.

10. `qme config branch <branch-name>`
   Stores pull branch for current repo in qme config.

```bash
qme config branch develop
```

11. `qme git repo project id <project-id>`
    Stores Git repository project ID for the current repo in qme config.

```bash
qme git repo project id 123
```

12. `qme config export [output-path]`
    Exports a qme config backup. Without an output path, the backup is written to the user’s `Downloads` folder.

```bash
qme config export "D:\backup\mycli-config.json"
```

13. `qme config xampp-path [path|--show|-s|--clear]`
    Sets, shows, or clears configured XAMPP location.

```bash
qme config xampp-path "D:\xampp"
```

14. `qme config xampp-v [version|--show|-s|--clear]`
    Sets, shows, or clears the active XAMPP version label in qme config.

```bash
qme config xampp-v 8.1
qme config xampp-v --show
qme config xampp-v -s
qme config xampp-v --clear
```

Note: `xampp-v` is a qme config label used by commands like `qme xampp switch`; it is not an auto-detected XAMPP binary version.

15. `qme config auto-update [enable|disable|--show]`
    Controls qme's automatic update checker. When enabled, qme checks the npm registry at most once every 24 hours during startup and installs a newer CLI version when available. Automatic updates are enabled by default. This setting does not affect the manual `qme update` command.

```bash
qme config auto-update --show
qme config auto-update disable
qme config auto-update enable
```

`qme mysql permission`
    Removes read-only attributes and grants the current Windows user modify access to the configured XAMPP MySQL data folder.

```cmd
qme mysql permission
```

Run this command from **Command Prompt opened as Administrator**.

16. `qme update`
    Checks the npm registry for updates to `@ramkumarbedia/xqme` and automatically installs a newer version when found.

```bash
qme update
```

17. `qme npm <args...>`
    Pass-through for npm commands.

```bash
qme npm run dev
```

15. `qme n <args...>`
    Shortcut alias for npm pass-through.

```bash
qme n install
```

16. `qme npx <args...>`
    Pass-through for npx commands.

```bash
qme npx prisma generate
```

17. `qme pa <args...>`
    Runs Laravel Artisan with passed arguments.

```bash
qme pa migrate
```

17. `qme win <action|cmd...>`
    Runs a Windows action or raw command through `cmd`.

```bash
qme win settings
```

18. `qme w <action|cmd...>`
    Alias for `qme win`.

```bash
qme w notepad
```

19. `qme wintask`
    Opens Task Manager.

```bash
qme wintask
```

20. `qme taskm`
    Task Manager shortcut.

```bash
qme taskm
```

21. `qme wl`
    Locks current Windows session.

```bash
qme wl
```

22. `qme path`
    Opens current folder in File Explorer.

```bash
qme path
```

23. `qme .`
    Opens current folder in Finder (macOS) or File Explorer (Windows).

```bash
qme .
```

24. `qme recent`
    Opens the last active VS Code folder/workspace from VS Code recent state.

```bash
qme recent
```

25. `qme xini`
    Opens the current XAMPP server `php.ini` file in VS Code. Uses `qme config xampp-path` first, then common XAMPP environment variables and install paths.

```bash
qme xini
```

26. `qme postman`
    Opens Postman (non-blocking).

```bash
qme postman
```

27. `qme chrome`
    Opens Google Chrome.

```bash
qme chrome
```

28. `qme gchat`
    Opens Google Chat desktop app.

```bash
qme gchat
```

29. `qme hub [start|stop]`
    Starts or stops Hubstaff app.

```bash
qme hub stop
```

30. `qme mail`
    Opens BlueMail email app.

```bash
qme mail
```

31. `qme notepad [file]`
    Opens Notepad, optionally with a target file.

```bash
qme notepad notes.txt
```

32. `qme note [text]`
    Without text, opens today note file on Desktop. With text, appends text to today's note file.

```bash
qme note "daily update done"
```

33. `qme notes [text]`
    Alias for `qme note`.

```bash
qme notes "follow up tomorrow"
```

34. `qme quit`
    Runs `qme xstop` first, then force closes apps and shuts down Windows.

```bash
qme quit
```

35. `qme xampp start`
    Starts XAMPP (Windows/macOS). On start, qme checks phpMyAdmin readiness and opens it in your default browser.

```bash
qme xampp start
```

36. `qme xampp stop`
    Stops XAMPP (Windows/macOS).

```bash
qme xampp stop
```

37. `qme xampp switch <version>`
    Switches active XAMPP folder version on Windows by swapping `D:\xampp` (or configured `xampp-path`) with `xampp-<version>`, updates `xampp-v`, and starts XAMPP.

```bash
qme xampp switch 8.2
```

38. `qme xstart`
    Shortcut for `qme xampp start` (including auto-opening phpMyAdmin when ready).

```bash
qme xstart
```

39. `qme xstop`
    Shortcut for `qme xampp stop`.

```bash
qme xstop
```

40. `qme xswitch [version]`
    Shortcut for `qme xampp switch [version]`.

```bash
qme xswitch 8.2
qme xswitch
```

41. `qme timer <min> <label> [--popup|-p]`
    Simple Pomodoro-style timer. Shows a live countdown and fires a desktop notification on completion (Windows/macOS/Linux).
    Use `--popup` (or `-p`) to also show a popup dialog when the timer ends.
    Note (Linux): notifications use `notify-send`; popup uses `zenity` (or `kdialog`/`xmessage`) if installed.

```bash
qme timer 25 "Deep work"
qme timer 0.01 "notify demo" --popup
```
