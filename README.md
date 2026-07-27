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
Runs an interactive Git synchronization workflow for the current repository. It verifies the repository, shows the current Git user and branches, detects local changes, and offers actions such as commit, stash, pull, branch checkout, branch creation, merge, hard reset, branch deletion, or abort.

   After a commit or pull, it can push the current branch. After a successful push, it can optionally open a GitHub Pull Request or GitLab Merge Request URL. GitLab merge request links require a configured `project_id`. The configured pull branch is stored in qme config and defaults to `main`.

   **Warning:** Reset hard, branch deletion, and force push can discard or overwrite changes. Review the selected action before confirming.

