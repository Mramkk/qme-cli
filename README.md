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

Use this command to:

- Switch between saved Git accounts
- Add a new Git user with a name and email
- Remove a saved Git user
- Enter a Git name and email manually when no saved user is selected
- Update the global `git user.name` and `git user.email` values
- Generate an SSH key

## QME config

```bash
qme config
```

Use this command to:

- Open the QME configuration file in VS Code
- Export a backup of the QME configuration

