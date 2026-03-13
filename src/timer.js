const chalk = require("chalk");
const os = require("os");
const { spawnSync } = require("child_process");

function formatRemaining(totalSeconds) {
    const secs = Math.max(0, Math.ceil(totalSeconds));
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

function tryNotifyMac({ title, message }) {
    const t = String(title || "").replace(/"/g, '\\"');
    const m = String(message || "").replace(/"/g, '\\"');
    const script = `display notification "${m}" with title "${t}"`;
    const result = spawnSync("osascript", ["-e", script], { stdio: "ignore" });
    return !result.error && result.status === 0;
}

function tryNotifyLinux({ title, message }) {
    const t = String(title || "");
    const m = String(message || "");

    // Most desktop environments support libnotify via `notify-send`.
    const result = spawnSync("notify-send", ["-u", "critical", t, m], { stdio: "ignore" });
    return !result.error && result.status === 0;
}

function tryNotifyWindowsBalloon({ title, message }) {
    const t = String(title || "").replace(/'/g, "''");
    const m = String(message || "").replace(/'/g, "''");

    // Uses .NET NotifyIcon balloon tip (works without extra modules/deps).
    const psScript = [
        "$ErrorActionPreference = 'Stop'",
        "Add-Type -AssemblyName System.Windows.Forms | Out-Null",
        "Add-Type -AssemblyName System.Drawing | Out-Null",
        "$n = New-Object System.Windows.Forms.NotifyIcon",
        "$n.Icon = [System.Drawing.SystemIcons]::Information",
        "$n.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info",
        `$n.BalloonTipTitle = '${t}'`,
        `$n.BalloonTipText = '${m}'`,
        "$n.Visible = $true",
        "$n.ShowBalloonTip(5000)",
        "Start-Sleep -Milliseconds 6500",
        "$n.Dispose()"
    ].join("; ");

    const result = spawnSync(
        "powershell",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript],
        { stdio: "ignore", windowsHide: true }
    );

    return !result.error && result.status === 0;
}

function tryNotifyNodeNotifier({ title, message }) {
    try {
        // Optional dependency if user has it installed.
        // eslint-disable-next-line import/no-extraneous-dependencies, global-require
        const notifier = require("node-notifier");
        notifier.notify({ title, message, wait: false });
        return true;
    } catch {
        return false;
    }
}

function tryPopupMac({ title, message }) {
    const t = String(title || "").replace(/"/g, '\\"');
    const m = String(message || "").replace(/"/g, '\\"');
    const script = `display dialog "${m}" with title "${t}" buttons {"OK"} default button 1`;
    const result = spawnSync("osascript", ["-e", script], { stdio: "ignore" });
    return !result.error && result.status === 0;
}

function tryPopupLinux({ title, message }) {
    const t = String(title || "");
    const m = String(message || "");

    // Try common GUI dialog tools.
    const zenity = spawnSync("zenity", ["--info", `--title=${t}`, `--text=${m}`], { stdio: "ignore" });
    if (!zenity.error && zenity.status === 0) return true;

    const kdialog = spawnSync("kdialog", ["--title", t, "--msgbox", m], { stdio: "ignore" });
    if (!kdialog.error && kdialog.status === 0) return true;

    const xmessage = spawnSync("xmessage", ["-center", `${t}\n\n${m}`], { stdio: "ignore" });
    return !xmessage.error && xmessage.status === 0;
}

function tryPopupWindows({ title, message }) {
    const t = String(title || "").replace(/'/g, "''");
    const m = String(message || "").replace(/'/g, "''");

    const psScript = [
        "$ErrorActionPreference = 'Stop'",
        "Add-Type -AssemblyName PresentationFramework | Out-Null",
        `[System.Windows.MessageBox]::Show('${m}','${t}') | Out-Null;`
    ].join("; ");

    const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript], {
        stdio: "ignore",
        windowsHide: true
    });

    return !result.error && result.status === 0;
}

function notifyDone({ label, minutes }) {
    const title = "qme timer";
    const message = `${label} (${minutes} min) done`;

    if (process.platform === "darwin") {
        if (tryNotifyMac({ title, message })) return true;
        return tryNotifyNodeNotifier({ title, message });
    }

    if (process.platform === "win32") {
        if (tryNotifyWindowsBalloon({ title, message })) return true;
        return tryNotifyNodeNotifier({ title, message });
    }

    if (process.platform === "linux") {
        if (tryNotifyLinux({ title, message })) return true;
        return tryNotifyNodeNotifier({ title, message });
    }

    try {
        process.stdout.write("\x07");
    } catch {
        // ignore
    }
    return false;
}

function popupDone({ label, minutes }) {
    const title = "qme timer";
    const message = `${label} (${minutes} min) done`;

    if (process.platform === "darwin") return tryPopupMac({ title, message });
    if (process.platform === "win32") return tryPopupWindows({ title, message });
    if (process.platform === "linux") return tryPopupLinux({ title, message });

    return false;
}

async function runTimer({ minutes, label, popup = false }) {
    const mins = Number(minutes);
    const safeLabel = String(label || "").trim() || "Timer";

    if (!Number.isFinite(mins) || mins <= 0) {
        throw new Error("Minutes must be a positive number");
    }

    const totalSeconds = Math.max(1, Math.round(mins * 60));
    const endMs = Date.now() + totalSeconds * 1000;

    console.log(chalk.blueBright("⏱  Timer started"));
    console.log(chalk.gray(`Label: ${safeLabel}`));
    console.log(chalk.gray(`Duration: ${mins} min`));
    console.log(chalk.gray(`Host: ${os.hostname()}`));
    console.log();
    console.log(chalk.yellow("Press Ctrl+C to cancel."));

    let cancelled = false;
    process.once("SIGINT", () => {
        cancelled = true;
    });

    const tick = () => {
        const remaining = (endMs - Date.now()) / 1000;
        const text = `${chalk.cyan("Remaining")} ${formatRemaining(remaining)}  ${chalk.gray("|")} ${chalk.white(safeLabel)}`;
        process.stdout.write(`\r${text}   `);
    };

    tick();
    const interval = setInterval(tick, 250);

    await new Promise((resolve) => {
        const doneCheck = setInterval(() => {
            if (cancelled) {
                clearInterval(doneCheck);
                resolve();
                return;
            }
            if (Date.now() >= endMs) {
                clearInterval(doneCheck);
                resolve();
            }
        }, 100);
    });

    clearInterval(interval);
    process.stdout.write("\r" + " ".repeat(120) + "\r");

    if (cancelled) {
        console.log(chalk.yellow("⏹  Timer cancelled"));
        return { ok: false, cancelled: true };
    }

    console.log(chalk.green("✅ Timer done"));
    notifyDone({ label: safeLabel, minutes: mins });

    if (popup) {
        popupDone({ label: safeLabel, minutes: mins });
    }

    return { ok: true };
}

module.exports = { runTimer };
