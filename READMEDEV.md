## qme-cli

`qme-cli` is a cross-platform developer command-line toolkit focused on speeding up everyday project setup and workflow tasks.

It provides shortcuts for:

- Git initialization and sync flows
- SSH key generation helpers
- Quick local productivity commands from a single `qme` entry point
- Local IP lookup

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
   Runs guided commit/pull/push flow. After successful push, it can generate and open a GitLab merge request URL (`source_branch -> target_branch`)

   Note: if the current local branch has no upstream during push, `qme git sync` automatically runs `git push --set-upstream origin <branch-name>` and sets the tracking branch.

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

6. `qme config`
   Opens the qme config file in VS Code. Creates it first if it does not exist.

```bash
qme config
```

7. `qme config branch <branch-name>`
   Stores pull branch for current repo in qme config.

```bash
qme config branch develop
```

8. `qme xini`
   Opens the current XAMPP server `php.ini` file in VS Code.

```bash
qme xini
```

9. `qme xproj`
   Lists project folders from the current XAMPP `htdocs` directory and lets you open a selected project.

```bash
qme xproj
```

10. `qme mysql`
   Lists user databases and opens a guided menu for database actions.
   System/helper databases are hidden from the list: `information_schema`, `mysql`, `performance_schema`, `phpmyadmin`, `sys`, and `test`.

```bash
qme mysql
```

Available menu actions:

- `Create new database`: choose `0` from the database list, then enter the new database name.
- `Import database`: imports a `.sql` file into the selected database.
- `Export database`: exports the selected database to a `.sql` file. If no path is entered, it saves to Downloads as `database-dd-mm-yy.sql`.
- `Truncate all tables`: empties all base tables in the selected database after confirmation.
- `Delete database`: permanently drops the selected database. Default confirmation is `no`; type `yes` to continue.
- `Open mysql shell`: opens the MySQL shell for the selected database.

Direct commands:

```bash
# Create database
qme mysql create my_database

# Import SQL file
qme mysql my_database import "D:\backup\my_database.sql"

# Export database
qme mysql my_database export "D:\backup\my_database.sql"

# Export to default Downloads path
qme mysql my_database export

# Truncate all tables
qme mysql my_database truncate

# Delete/drop database
qme mysql my_database delete
qme mysql my_database drop

# Open MySQL shell
qme mysql my_database shell
```

11. `qme ip`
   Prints the current local IPv4 address only.

```bash
qme ip
```

12. `qme sprint-review [to-email]`
13. `qme sprint-plan [to-email]`
   Opens a New Outlook web compose draft with today's date in the subject.
   The recipient is optional; leave it blank to choose recipients in New Outlook.

```bash
qme sprint-review
qme sprint-review team@example.com
qme sprint-plan
qme sprint-plan team@example.com
```

## Custom aliases

Create your own shortcuts without forking `qme` by saving aliases in the qme config file.

```bash
# Add / update (recommended)
qme alias add <name> -- <command...>

# PowerShell-safe (if -- gets swallowed)
qme alias add <name> "--" <command...>

# List
qme alias list

# Remove
qme alias remove <name>
```

Examples:

```bash
qme alias add gs -- git sync
qme gs

# Cross-platform open URL (use this instead of Windows `start`)
qme open http://localhost:8000
qme alias add web -- open http://localhost:8000
qme web


```

Aliases are stored in your config file (`~/.qme-cli.json`, or legacy `~/.mycli.json`) under `system.aliases`:

```json
{
  "system": {
    "aliases": {
      "gs": ["git", "sync"]
    }
  }
}
```

