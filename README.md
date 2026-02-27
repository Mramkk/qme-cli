## qme-cli

`qme-cli` is a cross-platform developer command-line toolkit focused on speeding up everyday project setup and workflow tasks.

It provides shortcuts for:
- Git initialization and sync flows
- SSH key generation helpers
- Windows/macOS utility commands (like Postman, Chrome, XAMPP, and more)
- Quick local productivity commands from a single `qme` entry point

Package: `@ramkumarbedia/xqme`

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
Runs guided commit/pull/push flow.
```bash
qme git sync
```

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
Opens current repository remote URL in browser.
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

10. `qme config export [output-path]`
Exports qme config file backup.
```bash
qme config export "D:\backup\mycli-config.json"
```

11. `qme config xampp-path [path|--show|-s|--clear]`
Sets, shows, or clears configured XAMPP location.
```bash
qme config xampp-path "D:\xampp"
```

12. `qme config xampp-current [version|--show|-s|--clear]`
Sets, shows, or clears active XAMPP version label in config.
```bash
qme config xampp-current 8.1
```

13. `qme npm <args...>`
Pass-through for npm commands.
```bash
qme npm run dev
```

14. `qme n <args...>`
Shortcut alias for npm pass-through.
```bash
qme n install
```

15. `qme npx <args...>`
Pass-through for npx commands.
```bash
qme npx prisma generate
```

16. `qme pa <args...>`
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

23. `qme postman`
Opens Postman (non-blocking).
```bash
qme postman
```

24. `qme chrome`
Opens Google Chrome.
```bash
qme chrome
```

25. `qme gchat`
Opens Google Chat desktop app.
```bash
qme gchat
```

26. `qme hub [start|stop]`
Starts or stops Hubstaff app.
```bash
qme hub stop
```

27. `qme mail`
Opens BlueMail email app.
```bash
qme mail
```

28. `qme notepad [file]`
Opens Notepad, optionally with a target file.
```bash
qme notepad notes.txt
```

29. `qme note [text]`
Without text, opens today note file on Desktop. With text, appends text to today's note file.
```bash
qme note "daily update done"
```

30. `qme notes [text]`
Alias for `qme note`.
```bash
qme notes "follow up tomorrow"
```

31. `qme quit`
Force closes apps and shuts down Windows.
```bash
qme quit
```

32. `qme xampp start`
Starts XAMPP (Windows/macOS). On start, qme checks phpMyAdmin readiness.
```bash
qme xampp start
```

33. `qme xampp stop`
Stops XAMPP (Windows/macOS).
```bash
qme xampp stop
```

34. `qme xstart`
Shortcut for `qme xampp start`.
```bash
qme xstart
```

35. `qme xstop`
Shortcut for `qme xampp stop`.
```bash
qme xstop
```
