## qme-cli

`qme-cli` is a cross-platform developer command-line toolkit focused on speeding up everyday project setup and workflow tasks.



Package: `@ramkumarbedia/xqme`

## Install

```bash
# Global install
npm i -g @ramkumarbedia/xqme
```

```bash
qme git ssh-key 
```
`qme git ssh-key `
   Generates an Ed25519 SSH key using a saved Git user’s email as the key comment. The command first lets you select a saved user, add a new user, or remove a user. It then asks for the SSH host name and creates a matching profile in `~/.ssh/config`.

   If the host already exists in `~/.ssh/config`, the existing profile is left unchanged. A new profile is created only when the host is not present.



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




