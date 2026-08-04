function runDesktopCommand(
  args,
  {
    runGoogleChat,
    runHubstaff,
    runMail,
    runSprintReviewMail,
    runSprintPlanMail,
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
