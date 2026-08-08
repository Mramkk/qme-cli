async function runDesktopCommand(
  args,
  {
    runGoogleChat,
    runHubstaff,
    runMail,
    runSprintReviewMail,
    runSprintPlanMail,
    askQuestion,
    runNotepad,
    getDesktopNotesPath,
    appendNoteText,
  },
) {
  const command = args[0];
  if (command === "gchat") {
    runGoogleChat();
    return true;
  }
  if (command === "hub") {
    runHubstaff(args[1] || "start");
    return true;
  }
  if (command === "mail") {
    runMail();
    return true;
  }
  if (command === "sprint" && !args[1]) {
    while (true) {
      console.log();
      console.log("Sprint menu");
      console.log("  1) Sprint plan");
      console.log("  2) Sprint review");
      console.log("  q) Exit");

      const choice = (await askQuestion("👉 Choose an option: ")).trim().toLowerCase();
      if (!choice || choice === "q" || choice === "quit" || choice === "exit") return true;

      if (choice === "1") {
        runSprintPlanMail([]);
        return true;
      }
      if (choice === "2") {
        runSprintReviewMail([]);
        return true;
      }
    }
  }
  if (command === "sprint-review") {
    runSprintReviewMail(args.slice(1));
    return true;
  }
  if (command === "sprint-plan") {
    runSprintPlanMail(args.slice(1));
    return true;
  }
  if (command === "notepad") {
    runNotepad(args[1]);
    return true;
  }
  if (command === "note" || command === "notes") {
    const noteText = args.slice(1).join(" ").trim();
    const notePath = getDesktopNotesPath();
    if (noteText) appendNoteText(notePath, noteText, { showSuccess: false });
    else runNotepad(notePath);
    return true;
  }
  return false;
}

module.exports = { runDesktopCommand };
