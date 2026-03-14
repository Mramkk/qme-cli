## qme-cli

`qme-cli` is a cross-platform developer command-line toolkit focused on speeding up everyday project setup and workflow tasks.

It provides shortcuts for:

- Git initialization and sync flows
- SSH key generation helpers
- Quick local productivity commands from a single `qme` entry point

Package: `@ramkumarbedia/xqme`

## Install

```bash
# Global install
npm i -g @ramkumarbedia/xqme
```

## Help

```bash
qme help
qme --help
qme --version
```

## Commands (With Example)

1. `qme git sync`
   Runs guided commit/pull/push flow. After successful push, it can generate and open a GitLab merge request URL (`source_branch -> target_branch`) when `project_id` is configured.

```bash
qme git sync
```

2. `qme git open`
   Opens current repository remote URL in browser at the current branch page.
   Alias: `qme git -o`

```bash
qme git open
```

3. `qme git users [switch|add|remove]`
   Manage multiple Git identities saved in qme config.

```bash
qme git users
```

4. `qme git ssh-key [--home <path>] [--comment <email>] [--tag <name>]`
   Generate a new RSA 4096 SSH key in your platform home directory (`~/.ssh`).



5. `qme git repo project id <project-id>`
   GitLab only: stores the GitLab project ID for the current repo in qme config (used by `qme git sync` to generate/open a merge request URL).

```bash
qme git repo project id 123
```

6. `qme config branch <branch-name>`
   Stores pull branch for current repo in qme config.

```bash
qme config branch develop
```
