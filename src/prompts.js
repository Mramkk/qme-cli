const readline = require("readline");
const chalk = require("chalk");

function createRL() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

/* ---------------- COMMIT MESSAGE ---------------- */
function askCommitMessage() {
    return new Promise((resolve, reject) => {
        const rl = createRL();
        rl.question(chalk.magenta("💬 Enter commit message: "), msg => {
            rl.close();
            if (!msg.trim()) {
                reject(new Error("Commit message cannot be empty"));
            } else {
                resolve(msg.trim());
            }
        });
    });
}

/* ---------------- FIRST MENU ---------------- */
function askGitBranchMenu() {
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        console.log(chalk.blue("🔀 Branch management:"));
        console.log(chalk.green("  0) Change pull branch"));
        console.log(chalk.green("  1) Checkout new branch"));
        console.log(chalk.green("  2) Checkout branch"));
        console.log(chalk.green("  3) Merge branch"));
        console.log(chalk.green("  4) Delete branch"));

        rl.question(
            chalk.yellow("👉 Choose an option (0/1/2/3/4) [Enter = abort]: "),
            answer => {
                rl.close();
                const value = answer.trim();
                const actions = {
                    0: "change-pull-branch",
                    1: "checkout-new-branch",
                    2: "checkout",
                    3: "merge-branch",
                    4: "delete-branch",
                };
                resolve(actions[value] || "abort");
            },
        );
    });
}

function askGitHistoryMenu() {
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        console.log(chalk.blue("🧾 History and reset:"));
        console.log(chalk.green("  0) Log"));
        console.log(chalk.green("  1) Reset hard"));

        rl.question(
            chalk.yellow("👉 Choose an option (0/1) [Enter = abort]: "),
            answer => {
                rl.close();
                const value = answer.trim();
                if (value === "0") resolve("log");
                else if (value === "1") resolve("reset-hard-hash");
                else resolve("abort");
            },
        );
    });
}

function askFirstMenuAction(allowCommit = true, allowPull = false, allowSetProjectId = false) {
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        console.log(chalk.blue("🔹 Select an action:"));
        if (allowCommit) {
            console.log(chalk.green("  0) Commit"));
            console.log(chalk.green("  1) Stash"));
            console.log(chalk.green("  2) Abort"));

            rl.question(
                chalk.yellow("👉 Choose an option (0/1/2) [default: 0]: "),
                answer => {
                    rl.close();
                    const value = answer.trim();

                    if (!value || value === "0") resolve("commit");
                    else if (value === "1") resolve("stash");
                    else resolve("abort");
                }
            );
            return;
        }

        if (allowPull) {
            console.log(chalk.green("  0) Pull"));
            console.log(chalk.green("  1) Push"));
            console.log(chalk.green("  2) Open repo"));
            console.log(chalk.green("  3) Branch management"));
            console.log(chalk.green("  4) History and reset"));
            let clearOption = 5;
            if (allowSetProjectId) {
                console.log(chalk.green("  5) Set project id"));
                clearOption = 6;
            }
            console.log(chalk.green(`  ${clearOption}) Clear terminal`));
            const optionHint = allowSetProjectId
                ? "0/1/2/3/4/5/6"
                : "0/1/2/3/4/5";
            rl.question(
                chalk.yellow(`👉 Choose an option (${optionHint}) [default: 0]: `),
                answer => {
                    rl.close();
                    const value = answer.trim();

                    if (!value || value === "0") resolve("pull");
                    else if (value === "1") resolve("push");
                    else if (value === "2") resolve("open-repo");
                    else if (value === "3") askGitBranchMenu().then(resolve);
                    else if (value === "4") askGitHistoryMenu().then(resolve);
                    else if (allowSetProjectId && value === "5") resolve("set-project-id");
                    else if (value === String(clearOption)) resolve("clear-terminal");
                    else resolve("abort");
                }
            );
            return;
        }

        console.log(chalk.green("  1) Stash"));
        console.log(chalk.green("  2) Abort"));
        rl.question(
            chalk.yellow("👉 Choose an option (1/2) [default: 2]: "),
            answer => {
                rl.close();
                const value = answer.trim();

                if (value === "1") resolve("stash");
                else resolve("abort");
            }
        );
    });
}

function askPushAction() {
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        console.log(chalk.blue("🔹 Select push action:"));
        console.log(chalk.green("  1) Push"));
        console.log(chalk.green("  2) Force Push"));
        rl.question(
            chalk.yellow("👉 Choose an option (1/2) [default: 1]: "),
            answer => {
                rl.close();
                resolve(answer.trim() === "2" ? "force-push" : "push");
            },
        );
    });
}

/* ---------------- STASH MESSAGE ---------------- */
function askStashMessage(defaultMessage) {
    return new Promise(resolve => {
        const rl = createRL();
        rl.question(
            chalk.magenta(`🗂️ Enter stash message [default: ${defaultMessage}]: `),
            msg => {
                rl.close();
                const value = msg.trim();
                resolve(value || defaultMessage);
            }
        );
    });
}

/* ---------------- AFTER COMMIT: PULL / SKIP ---------------- */
function askPostCommitAction(currentBranch, pullBranchRef) {
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        rl.question(
            chalk.yellow(
                "⬇️".padEnd(4, " ") +
                `Do you want to pull from branch (${pullBranchRef})? (y/N): `
            ),
            answer => {
                rl.close();
                const value = answer.trim().toLowerCase();

                if (value === "y" || value === "yes") {
                    resolve("pull");
                } else {
                    resolve("skip");
                }
            }
        );
    });
}

/* ---------------- AFTER PULL: PUSH / SKIP ---------------- */
function askAfterPullAction(currentBranch) {
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        rl.question(
            chalk.yellow(
                "⬆️".padEnd(4, " ") +
                `Do you want to push current branch (${currentBranch})? (y/N): `
            ),
            answer => {
                const value = answer.trim().toLowerCase();

                if (value === "y" || value === "yes") {
                    console.log();
                    console.log(chalk.green("  1) Push"));
                    console.log(chalk.green("  2) Force push"));
                    rl.question(
                        chalk.yellow("👉 Choose an option (1/2) [default: 1]: "),
                        choice => {
                            rl.close();
                            const selected = choice.trim();

                            if (!selected || selected === "1") {
                                resolve("push");
                                return;
                            }

                            if (selected === "2") {
                                resolve("force-push");
                                return;
                            }

                            resolve("push");
                        }
                    );
                    return;
                }

                rl.close();
                resolve("skip");
            }
        );
    });
}

function askAfterPushMergeRequestAction(currentBranch, targetBranch) {
    const source = String(currentBranch || "").trim();
    const target = String(targetBranch || "").trim();

    if (!source || !target || source === target) {
        return Promise.resolve("skip");
    }
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        rl.question(
            chalk.yellow(
                "🔀".padEnd(4, " ")
                + `Generate merge request URL (${currentBranch} -> ${targetBranch}) and open in browser? (y/N): `
            ),
            answer => {
                rl.close();
                const value = answer.trim().toLowerCase();
                if (value === "y" || value === "yes") {
                    resolve("open");
                } else {
                    resolve("skip");
                }
            }
        );
    });
}

/* ---------------- STASH MENU ---------------- */
function askStashMenuAction(stashCount) {
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        console.log(chalk.blue(`🗂️ Stash entries found: ${stashCount}`));
        console.log(chalk.green("  0) Continue"));
        console.log(chalk.green("  1) Show stash list"));
        console.log(chalk.green("  2) Apply latest stash"));
        console.log(chalk.green("  3) Pop latest stash"));
        console.log(chalk.green("  4) Drop latest stash"));

        rl.question(
            chalk.yellow("👉 Choose an option (0/1/2/3/4) [default: 0]: "),
            answer => {
                rl.close();
                const value = answer.trim();

                if (!value || value === "0") resolve("continue");
                else if (value === "1") resolve("list");
                else if (value === "2") resolve("apply");
                else if (value === "3") resolve("pop");
                else if (value === "4") resolve("drop");
                else resolve("continue");
            }
        );
    });
}

/* ---------------- RESET MENU ---------------- */
function askResetMenuAction() {
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        console.log(chalk.blue("🔄 Reset menu:"));
        console.log(chalk.green("  0) Show git log"));
        console.log(chalk.green("  1) Reset --soft HEAD~1"));
        console.log(chalk.green("  2) Reset --mixed HEAD~1"));
        console.log(chalk.green("  3) Reset --hard HEAD~1"));
        console.log(chalk.green("  4) Abort"));

        rl.question(
            chalk.yellow("👉 Choose an option (0/1/2/3/4) [default: 4]: "),
            answer => {
                rl.close();
                const value = answer.trim();

                if (value === "0") resolve("log");
                else if (value === "1") resolve("soft");
                else if (value === "2") resolve("mixed");
                else if (value === "3") resolve("hard");
                else resolve("abort");
            }
        );
    });
}

function askGitLogCommitSelection(rangeStart, rangeEnd, options = {}) {
    const { hasNext = false, hasPrev = false } = options;

    return new Promise(resolve => {
        const rl = createRL();
        const extraChoices = [
            hasNext ? "n=next" : null,
            hasPrev ? "p=prev" : null
        ].filter(Boolean).join(", ");

        const hintSuffix = extraChoices ? `, ${extraChoices}` : "";
        rl.question(
            chalk.yellow(
                `👉 Select commit number (${rangeStart}-${rangeEnd}${hintSuffix}) [press Enter to abort]: `
            ),
            answer => {
                rl.close();
                const value = answer.trim();

                if (!value) {
                    resolve({ type: "abort" });
                    return;
                }

                const lowerValue = value.toLowerCase();
                if (hasNext && (lowerValue === "n" || lowerValue === "next")) {
                    resolve({ type: "next" });
                    return;
                }
                if (hasPrev && (lowerValue === "p" || lowerValue === "prev")) {
                    resolve({ type: "prev" });
                    return;
                }

                const selected = Number.parseInt(value, 10);
                if (
                    Number.isNaN(selected) ||
                    selected < rangeStart ||
                    selected > rangeEnd
                ) {
                    resolve({ type: "abort" });
                    return;
                }

                resolve({ type: "select", index: selected });
            }
        );
    });
}

function askResetModeForCommit() {
    return new Promise(resolve => {
        const rl = createRL();
        console.log(chalk.green("  1) --soft"));
        console.log(chalk.green("  2) --mixed"));
        console.log(chalk.green("  3) --hard"));

        rl.question(
            chalk.yellow("👉 Select reset mode (1/2/3) [default: 2]: "),
            answer => {
                rl.close();
                const value = answer.trim();

                if (value === "1") resolve("--soft");
                else if (value === "3") resolve("--hard");
                else resolve("--mixed");
            }
        );
    });
}

/* ---------------- SSH KEY INPUTS ---------------- */
function askQuestion(questionText) {
    return new Promise(resolve => {
        const rl = createRL();
        rl.question(questionText, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function askSshEmail(defaultEmail = "") {
    const suffix = defaultEmail ? ` [default: ${defaultEmail}]` : "";
    const value = await askQuestion(
        chalk.magenta(`📧 Enter email/comment${suffix}: `)
    );

    if (value) {
        return value;
    }

    if (defaultEmail) {
        return defaultEmail;
    }

    console.log(chalk.red("❌ Email/comment cannot be empty"));
    return askSshEmail(defaultEmail);
}

async function askSshTag() {
    const value = await askQuestion(
        chalk.magenta("🏷️ Enter key tag <tag>: ")
    );

    if (value) {
        return value;
    }

    console.log(chalk.red("❌ Tag cannot be empty"));
    return askSshTag();
}

// stash 2

module.exports = {
    askCommitMessage,
    askStashMessage,
    askFirstMenuAction,
    askPushAction,
    askPostCommitAction,
    askAfterPullAction,
    askAfterPushMergeRequestAction,
    askStashMenuAction,
    askResetMenuAction,
    askGitLogCommitSelection,
    askResetModeForCommit,
    askQuestion,
    askSshEmail,
    askSshTag
};

