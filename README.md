## qme-cli

`qme-cli` is a cross-platform developer command-line toolkit focused on speeding up everyday project setup and workflow tasks.

It provides shortcuts for:
- Git initialization and sync flows
- SSH key generation helpers
- Windows/macOS utility commands (like Postman, Chrome, XAMPP, and more)
- Re-open the last active VS Code project quickly with `qme recent`
- Quick local productivity commands from a single `qme` entry point

Package: `@ramkumarbedia/xqme`

## Install

```bash
# Global install
npm i -g @ramkumarbedia/xqme
```

## Commands (One by One with Example)

1. `qme init [--branch <branch-name>]`
Initializes qme defaults in the current repository (gitignore, hooks, branch config).
```bash
qme init --branch main
```

2. `qme git init [--branch <branch-name>]`
First-time git bootstrap for non-git folders, with optional initial branch.
```bash
qme git init --branch main
```

3. `qme git sync`
Runs guided commit/pull/push flow. After successful push, it can generate and open a GitLab merge request URL (`source_branch -> target_branch`) when `project_id` is configured. (Skipped when both branches are the same.)
```bash
qme git sync
```
### Git users (multiple accounts)

- `qme git users add` (aliases: `qme add git user`, `qme git user add`): prompts for name/email and saves it to the qme config user list.
- `qme git users` (aliases: `qme git user switch`, `qme git users switch`): choose a saved user (or enter manually) and update global `git config --global user.name/user.email`. It can also clear saved credentials for a host so the next push/pull prompts login again.
- `qme git users remove` (alias: `qme git user remove`): remove a saved user from the qme config user list.

Config file: `~/.qme-cli.json` (or legacy `~/.mycli.json`).

4. `qme git reset`
Opens reset menu (`soft`, `mixed`, `hard`) for recent changes.
```bash
qme git reset
```

5. `qme git log`
Shows paginated commits and lets you reset to a selected commit.
```bash
qme git log
```

6. `qme git open`
Opens current repository remote URL in browser at the current branch page.
```bash
qme git open
```

7. `qme git remove`
Removes `.git` folder after confirmation.
```bash
qme git remove
```

8. `qme git ssh-key [--home <path>] [--comment <demo-email>] [--tag <name>]`
Generate a new RSA 4096 SSH key in your auto-detected platform home directory (`~/.ssh`).
```bash
qme git ssh-key --home "C:\Users\ADMIN" -c "demo@example.com" -f "oodle"
```

9. `qme config branch <branch-name>`
Stores pull branch for current repo in qme config.
```bash
qme config branch develop
```

10. `qme git repo project id <project-id>`
Stores Git repository project ID for the current repo in qme config.
```bash
qme git repo project id 123
```

11. `qme config export [output-path]`
Exports qme config file backup.
```bash
qme config export "D:\backup\mycli-config.json"
```

12. `qme config xampp-path [path|--show|-s|--clear]`
Sets, shows, or clears configured XAMPP location.
```bash
qme config xampp-path "D:\xampp"
```

13. `qme config xampp-v [version|--show|-s|--clear]`
Sets, shows, or clears the active XAMPP version label in qme config.
```bash
qme config xampp-v 8.1
qme config xampp-v --show
qme config xampp-v -s
qme config xampp-v --clear
```
Note: this value is a qme config label (used by qme commands like `qme xampp switch`), not an auto-detected XAMPP binary version.

14. `qme npm <args...>`
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

25. `qme postman`
Opens Postman (non-blocking).
```bash
qme postman
```

26. `qme chrome`
Opens Google Chrome.
```bash
qme chrome
```

27. `qme gchat`
Opens Google Chat desktop app.
```bash
qme gchat
```

28. `qme hub [start|stop]`
Starts or stops Hubstaff app.
```bash
qme hub stop
```

27. `qme mail`
Opens BlueMail email app.
```bash
qme mail
```

30. `qme notepad [file]`
Opens Notepad, optionally with a target file.
```bash
qme notepad notes.txt
```

31. `qme note [text]`
Without text, opens today note file on Desktop. With text, appends text to today's note file.
```bash
qme note "daily update done"
```

32. `qme notes [text]`
Alias for `qme note`.
```bash
qme notes "follow up tomorrow"
```

33. `qme quit`
Force closes apps and shuts down Windows.
```bash
qme quit
```

34. `qme xampp start`
Starts XAMPP (Windows/macOS). On start, qme checks phpMyAdmin readiness and opens it in your default browser.
```bash
qme xampp start
```

35. `qme xampp stop`
Stops XAMPP (Windows/macOS).
```bash
qme xampp stop
```

36. `qme xampp switch <version>`
Switches active XAMPP folder version on Windows by swapping `D:\xampp` (or configured `xampp-path`) with `xampp-<version>`, updates `xampp-v`, and starts XAMPP.
```bash
qme xampp switch 8.2
```

37. `qme xstart`
Shortcut for `qme xampp start` (including auto-opening phpMyAdmin when ready).
```bash
qme xstart
```

38. `qme xstop`
Shortcut for `qme xampp stop`.
```bash
qme xstop
```

39. `qme xswitch [version]`
Shortcut for `qme xampp switch [version]`.
```bash
qme xswitch 8.2
qme xswitch
```


