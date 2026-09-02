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

`qme git users` is an interactive Git account manager. It lets you save
multiple Git identities and switch between them without re-entering account
details each time.

From the menu you can:

- View saved Git users and see which SSH identity is currently active
- Add or remove a saved user with a name, email, and optional provider
- Generate an SSH key and update the SSH configuration for a user
- Test the user’s SSH connection, using GitHub or GitLab as the default host
- Activate a user’s SSH identity in `~/.ssh/config`
- Set the selected user as the global Git user
- View the current global Git user or clear the terminal

Users are matched by name, email, and provider, allowing separate GitHub and
GitLab identities to use the same email address. Generated SSH identity files
are saved in QME config for future connection tests.

## QME config

```bash
qme config
```

Use this command to:

- Open the QME configuration file in VS Code
- Export a backup of the QME configuration
