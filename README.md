## qme-cli

`qme-cli` is a cross-platform developer command-line toolkit focused on speeding up everyday project setup and workflow tasks.

Package: `@ramkumarbedia/xqme`

## Install

```bash
# Global install
npm i -g @ramkumarbedia/xqme
```

## Git sync

```bash
qme git sync
```

Starts an interactive Git workflow for the current repository. It can help you:

- Pull from the configured remote branch
- Push the current branch normally or with force-with-lease
- Change the pull branch
- Checkout, create, merge, or delete branches
- Reset local changes or return to an earlier commit
- Commit or stash local changes before continuing

The Push option pushes the current local branch without pulling first. Choose Abort to leave the workflow without making a change.

## Git users

```bash
qme git users
```

The interactive menu provides:

1. **Users** — select a saved Git account. A user is marked `(active)` when
   its saved SSH key matches an `IdentityFile` in `~/.ssh/config`.
2. **Add a new user** — save a Git name, email, and provider.
3. **Git global user** — display the current global `git user.name` and
   `git user.email`, then press Enter to return to the menu.
4. **Clear terminal** — clear the terminal and keep the menu open.

After selecting a saved user, the submenu provides:

- **Generate SSH** — create an SSH key and update the SSH configuration.
- **Test Connection** — test SSH access for the selected account. Unknown
  hosts request `Y/n` confirmation before connecting.
- **Active this user** — read the selected user’s saved `identityFile` from
  QME config and update the `IdentityFile` entries in `~/.ssh/config`.
- **Make global user** — set the selected account as the global Git user.
- **Remove User** — remove the selected account from saved users.

Saved users are identified by their name, email, and provider, so the same
email can be saved separately for GitHub and GitLab. The provider is optional;
when it is set, **Test Connection** uses `github.com` or `gitlab.com` as the
default SSH host. SSH keys generated for a user are saved in QME config and
used by subsequent connection tests.

## QME config

```bash
qme config
```

Use this command to:

- Open the QME configuration file in VS Code
- Export a backup of the QME configuration
