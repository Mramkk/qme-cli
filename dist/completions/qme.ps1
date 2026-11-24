Register-ArgumentCompleter -Native -CommandName qme -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)

  $commands = @(
    "help", "run", "pilot", "open", "ip", "pem", "npm", "npx", "n",
    "timer", "git", "mysql", "flutter", "adb", "config", "update", "init",
    "proj", "xampp", "xstart", "xstop", "xswitch", "xini", "xproj", "win",
    "wintask", "taskm", "wl", "path", "postman", "chrome", "gchat", "hub",
    "mail", "note", "notes", "quit"
  )

  $commands |
    Where-Object { $_ -like "$wordToComplete*" } |
    ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, "ParameterValue", $_) }
}
