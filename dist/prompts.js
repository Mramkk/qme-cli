"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askSshTag = exports.askSshEmail = exports.askResetModeForCommit = exports.askGitLogCommitSelection = void 0;
exports.askQuestion = askQuestion;
exports.askCommitMessage = askCommitMessage;
exports.askFirstMenuAction = askFirstMenuAction;
exports.askStashMessage = askStashMessage;
exports.askPostCommitAction = askPostCommitAction;
exports.askAfterPullAction = askAfterPullAction;
exports.askAfterPushMergeRequestAction = askAfterPushMergeRequestAction;
exports.askStashMenuAction = askStashMenuAction;
exports.askResetMenuAction = askResetMenuAction;
const readline = __importStar(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
function createRL() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
}
function askQuestion(question) {
    return new Promise((resolve) => {
        const rl = createRL();
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
function askCommitMessage() {
    return new Promise((resolve, reject) => {
        const rl = createRL();
        rl.question(chalk_1.default.magenta("💬 Enter commit message: "), (msg) => {
            rl.close();
            if (!msg.trim())
                reject(new Error("Commit message cannot be empty"));
            else
                resolve(msg.trim());
        });
    });
}
function askFirstMenuAction(allowCommit = true, allowPull = false) {
    return new Promise((resolve) => {
        const rl = createRL();
        console.log();
        console.log(chalk_1.default.blue("🔹 Select an action:"));
        if (allowCommit) {
            console.log(chalk_1.default.green("  0) Commit"));
            console.log(chalk_1.default.green("  1) Stash"));
            console.log(chalk_1.default.green("  2) Branches"));
            console.log(chalk_1.default.green("  3) Abort"));
            rl.question(chalk_1.default.yellow("👉 Choose an option (0/1/2/3) [default: 0]: "), (answer) => {
                rl.close();
                const value = answer.trim();
                if (!value || value === "0")
                    resolve("commit");
                else if (value === "1")
                    resolve("stash");
                else if (value === "2")
                    resolve("branches");
                else
                    resolve("abort");
            });
            return;
        }
        if (allowPull) {
            console.log(chalk_1.default.green("  0) Pull"));
            console.log(chalk_1.default.green("  1) Change pull branch"));
            console.log(chalk_1.default.green("  2) Checkout new branch"));
            console.log(chalk_1.default.green("  3) Checkout branch"));
            console.log(chalk_1.default.green("  4) Reset hard"));
            console.log(chalk_1.default.green("  5) Merge branch"));
            console.log(chalk_1.default.green("  6) Delete branch"));
            console.log(chalk_1.default.green("  7) Abort"));
            rl.question(chalk_1.default.yellow("👉 Choose an option (0/1/2/3/4/5/6/7) [default: 0]: "), (answer) => {
                rl.close();
                const value = answer.trim();
                if (!value || value === "0")
                    resolve("pull");
                else if (value === "1")
                    resolve("change-pull-branch");
                else if (value === "2")
                    resolve("checkout-new-branch");
                else if (value === "3")
                    resolve("checkout");
                else if (value === "4")
                    resolve("reset-hard-hash");
                else if (value === "5")
                    resolve("merge-branch");
                else if (value === "6")
                    resolve("delete-branch");
                else
                    resolve("abort");
            });
            return;
        }
        console.log(chalk_1.default.green("  1) Stash"));
        console.log(chalk_1.default.green("  2) Abort"));
        rl.question(chalk_1.default.yellow("👉 Choose an option (1/2) [default: 2]: "), (answer) => {
            rl.close();
            const value = answer.trim();
            if (value === "1")
                resolve("stash");
            else
                resolve("abort");
        });
    });
}
function askStashMessage(defaultMessage) {
    return new Promise((resolve) => {
        const rl = createRL();
        rl.question(chalk_1.default.magenta(`🗂️ Enter stash message [default: ${defaultMessage}]: `), (msg) => {
            rl.close();
            const value = msg.trim();
            resolve(value || defaultMessage);
        });
    });
}
function askPostCommitAction(currentBranch, pullBranchRef) {
    return new Promise((resolve) => {
        const rl = createRL();
        console.log();
        rl.question(chalk_1.default.yellow("⬇️".padEnd(4, " ") + `Do you want to pull from branch (${pullBranchRef})? (y/N): `), (answer) => {
            rl.close();
            const value = answer.trim().toLowerCase();
            resolve(value === "y" || value === "yes" ? "pull" : "skip");
        });
    });
}
function askAfterPullAction(currentBranch) {
    return new Promise((resolve) => {
        const rl = createRL();
        console.log();
        rl.question(chalk_1.default.yellow("⬆️".padEnd(4, " ") + `Do you want to push current branch (${currentBranch})? (y/N): `), (answer) => {
            const value = answer.trim().toLowerCase();
            if (value === "y" || value === "yes") {
                console.log();
                console.log(chalk_1.default.green("  1) Push"));
                console.log(chalk_1.default.green("  2) Force push"));
                rl.question(chalk_1.default.yellow("👉 Choose an option (1/2) [default: 1]: "), (choice) => {
                    rl.close();
                    const selected = choice.trim();
                    if (!selected || selected === "1")
                        resolve("push");
                    else if (selected === "2")
                        resolve("force-push");
                    else
                        resolve("push");
                });
                return;
            }
            rl.close();
            resolve("skip");
        });
    });
}
function askAfterPushMergeRequestAction(currentBranch, targetBranch) {
    const source = String(currentBranch || "").trim();
    const target = String(targetBranch || "").trim();
    if (!source || !target || source === target)
        return Promise.resolve("skip");
    return new Promise((resolve) => {
        const rl = createRL();
        console.log();
        rl.question(chalk_1.default.yellow("🔀".padEnd(4, " ") + `Generate merge request URL (${currentBranch} -> ${targetBranch}) and open in browser? (y/N): `), (answer) => {
            rl.close();
            const value = answer.trim().toLowerCase();
            resolve(value === "y" || value === "yes" ? "open" : "skip");
        });
    });
}
function askStashMenuAction(stashCount) {
    return new Promise((resolve) => {
        const rl = createRL();
        console.log();
        console.log(chalk_1.default.blue(`🗂️ Stash entries found: ${stashCount}`));
        console.log(chalk_1.default.green("  0) Continue"));
        console.log(chalk_1.default.green("  1) Show stash list"));
        console.log(chalk_1.default.green("  2) Apply latest stash"));
        console.log(chalk_1.default.green("  3) Pop latest stash"));
        console.log(chalk_1.default.green("  4) Drop latest stash"));
        rl.question(chalk_1.default.yellow("👉 Choose an option (0/1/2/3/4) [default: 0]: "), (answer) => {
            rl.close();
            const value = answer.trim();
            if (!value || value === "0")
                resolve("continue");
            else if (value === "1")
                resolve("list");
            else if (value === "2")
                resolve("apply");
            else if (value === "3")
                resolve("pop");
            else if (value === "4")
                resolve("drop");
            else
                resolve("continue");
        });
    });
}
function askResetMenuAction() {
    return new Promise((resolve) => {
        const rl = createRL();
        console.log();
        console.log(chalk_1.default.blue("🔄 Reset menu:"));
        console.log(chalk_1.default.green("  0) Show git log"));
        console.log(chalk_1.default.green("  1) Reset --soft HEAD~1"));
        console.log(chalk_1.default.green("  2) Reset --mixed HEAD~1"));
        console.log(chalk_1.default.green("  3) Reset --hard HEAD~1"));
        console.log(chalk_1.default.green("  4) Abort"));
        rl.question(chalk_1.default.yellow("👉 Choose an option (0/1/2/3/4) [default: 4]: "), (answer) => {
            rl.close();
            const value = answer.trim();
            if (!value || value === "0")
                resolve("log");
            else if (value === "1")
                resolve("soft");
            else if (value === "2")
                resolve("mixed");
            else if (value === "3")
                resolve("hard");
            else
                resolve("abort");
        });
    });
}
// Keep the rest of the prompt helpers available in TS later; the existing CLI uses them.
const askGitLogCommitSelection = async () => "";
exports.askGitLogCommitSelection = askGitLogCommitSelection;
const askResetModeForCommit = async () => "";
exports.askResetModeForCommit = askResetModeForCommit;
const askSshEmail = async () => "";
exports.askSshEmail = askSshEmail;
const askSshTag = async () => "";
exports.askSshTag = askSshTag;
