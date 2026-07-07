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
function askFirstMenuAction(allowCommit = true, allowPull = false) {
    return new Promise(resolve => {
        const rl = createRL();

        console.log();
        console.log(chalk.blue("🔹 Select an action:"));
        if (allowCommit) {
            console.log(chalk.green("  0) Commit"));
            console.log(chalk.green("  1) Stash"));
            console.log(chalk.green("  2) Branches"));
            console.log(chalk.green("  3) Abort"));

            rl.question(
                chalk.yellow("👉 Choose an option (0/1/2/3) [default: 0]: "),
                answer => {
                    rl.close();
                    const value = answer.trim();

                    if (!value || value === "0") resolve("commit");
                    else if (value === "1") resolve("stash");
                    else if (value === "2") resolve("branches");
                    else resolve("abort");
                }
            );
            return;
        }

        if (allowPull) {
            console.log(chalk.green("  0) Pull"));
            console.log(chalk.green("  1) Checkout branch"));
            console.log(chalk.green("  2) Branches"));
            console.log(chalk.green("  3) Reset hard"));
            console.log(chalk.green("  4) Abort"));
            rl.question(
                chalk.yellow("👉 Choose an option (0/1/2/3/4) [default: 0]: "),
                answer => {
                    rl.close();
                    const value = answer.trim();

                    if (!value || value === "0") resolve("pull");
                    else if (value === "1") resolve("checkout");
                    else if (value === "2") resolve("branches");
                    else if (value === "3") resolve("reset-hard-hash");
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
            chalk.yellow("⬆️".padEnd(4, " ") + `Do you want to push current branch (${currentBranch})? (y/N): `),
            answer => {
                rl.close();
                const value = answer.trim().toLowerCase();

                if (value === "y" || value === "yes") resolve("push");
                else resolve("skip");
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
        chalk.magenta("🏷️ Enter key tag for id_rsa_<tag>: ")
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

