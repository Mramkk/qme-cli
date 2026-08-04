const { spawnSync } = require("child_process");

function createWindowsProjectPicker({ platform = process.platform, spawn = spawnSync } = {}) {
  function openProjectPicker(projects) {
    if (platform !== "win32" || !Array.isArray(projects) || projects.length === 0) {
      return null;
    }

    const projectJson = Buffer.from(JSON.stringify(projects), "utf8").toString("base64");
    const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$projects = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${projectJson}')) | ConvertFrom-Json
$form = New-Object Windows.Forms.Form
$form.Text = 'qme - Open Project'
$form.StartPosition = 'CenterScreen'
$form.Size = New-Object Drawing.Size(860, 560)
$form.MinimumSize = New-Object Drawing.Size(680, 440)
$form.BackColor = [Drawing.Color]::FromArgb(245, 247, 250)
$form.Font = New-Object Drawing.Font('Segoe UI', 10)
$form.TopMost = $true
$form.ShowInTaskbar = $true

$header = New-Object Windows.Forms.Panel
$header.Dock = 'Top'
$header.Height = 92
$header.BackColor = [Drawing.Color]::FromArgb(30, 41, 59)
$form.Controls.Add($header)

$title = New-Object Windows.Forms.Label
$title.Text = 'Open a project'
$title.Font = New-Object Drawing.Font('Segoe UI Semibold', 19, [Drawing.FontStyle]::Bold)
$title.ForeColor = [Drawing.Color]::White
$title.Location = New-Object Drawing.Point(26, 14)
$title.AutoSize = $true
$header.Controls.Add($title)

$subtitle = New-Object Windows.Forms.Label
$subtitle.Text = 'Choose a saved workspace to launch in Visual Studio Code'
$subtitle.Font = New-Object Drawing.Font('Segoe UI', 10)
$subtitle.ForeColor = [Drawing.Color]::FromArgb(203, 213, 225)
$subtitle.Location = New-Object Drawing.Point(29, 53)
$subtitle.AutoSize = $true
$header.Controls.Add($subtitle)

$list = New-Object Windows.Forms.ListView
$list.Location = New-Object Drawing.Point(24, 116)
$list.Size = New-Object Drawing.Size(796, 350)
$list.Anchor = 'Top,Bottom,Left,Right'
$list.View = [Windows.Forms.View]::Details
$list.FullRowSelect = $true
$list.GridLines = $false
$list.MultiSelect = $false
$list.HideSelection = $false
$list.BorderStyle = [Windows.Forms.BorderStyle]::FixedSingle
$list.BackColor = [Drawing.Color]::White
$list.ForeColor = [Drawing.Color]::FromArgb(30, 41, 59)
$list.Font = New-Object Drawing.Font('Segoe UI', 10)
[void]$list.Columns.Add('Project', 250)
[void]$list.Columns.Add('Type', 120)
[void]$list.Columns.Add('Environment', 250)
[void]$list.Columns.Add('Last updated', 140)

$section = New-Object Windows.Forms.Label
$section.Text = 'SAVED PROJECTS'
$section.Font = New-Object Drawing.Font('Segoe UI Semibold', 9, [Drawing.FontStyle]::Bold)
$section.ForeColor = [Drawing.Color]::FromArgb(71, 85, 105)
$section.Location = New-Object Drawing.Point(26, 98)
$section.AutoSize = $true
$form.Controls.Add($section)

for ($i = 0; $i -lt $projects.Count; $i++) {
  $project = $projects[$i]
  $name = Split-Path ([string]$project.path.TrimEnd('\\', '/')) -Leaf
  $environment = @()
  if ($project.phpVersion) { $environment += 'PHP ' + [string]$project.phpVersion }
  if ($project.laravelVersion) { $environment += 'Laravel ' + [string]$project.laravelVersion }
  $item = New-Object Windows.Forms.ListViewItem((' {0}. {1}' -f ($i + 1), $name))
  [void]$item.SubItems.Add([string]$project.type)
  [void]$item.SubItems.Add(($environment -join '  |  '))
  [void]$item.SubItems.Add([string]$project.updatedAt)
  [void]$list.Items.Add($item)
}
$list.Items[0].Selected = $true
$form.Controls.Add($list)

$open = New-Object Windows.Forms.Button
$open.Text = 'Open in VS Code'
$open.DialogResult = [Windows.Forms.DialogResult]::OK
$open.Size = New-Object Drawing.Size(150, 38)
$open.Location = New-Object Drawing.Point(670, 486)
$open.Anchor = 'Bottom,Right'
$open.BackColor = [Drawing.Color]::FromArgb(37, 99, 235)
$open.ForeColor = [Drawing.Color]::White
$open.FlatStyle = [Windows.Forms.FlatStyle]::Flat
$open.FlatAppearance.BorderSize = 0
$open.Font = New-Object Drawing.Font('Segoe UI Semibold', 10)
$form.Controls.Add($open)

$cancel = New-Object Windows.Forms.Button
$cancel.Text = 'Cancel'
$cancel.DialogResult = [Windows.Forms.DialogResult]::Cancel
$cancel.Size = New-Object Drawing.Size(100, 38)
$cancel.Location = New-Object Drawing.Point(558, 486)
$cancel.Anchor = 'Bottom,Right'
$cancel.BackColor = [Drawing.Color]::White
$cancel.ForeColor = [Drawing.Color]::FromArgb(71, 85, 105)
$cancel.FlatStyle = [Windows.Forms.FlatStyle]::Flat
$cancel.FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(203, 213, 225)
$cancel.Font = New-Object Drawing.Font('Segoe UI', 10)
$form.Controls.Add($cancel)
$form.AcceptButton = $open
$form.CancelButton = $cancel

if ($form.ShowDialog() -eq [Windows.Forms.DialogResult]::OK -and $list.SelectedItems.Count -gt 0) {
  [Console]::WriteLine($list.SelectedItems[0].Index)
}
$form.Dispose()
`;

    const encodedScript = Buffer.from(script, "utf16le").toString("base64");
    const result = spawn(
      "powershell.exe",
      ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encodedScript],
      { encoding: "utf8", windowsHide: false },
    );

    if (result.error || result.status !== 0) return null;
    const selectedIndex = Number.parseInt(String(result.stdout || "").trim(), 10);
    return Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < projects.length
      ? selectedIndex
      : null;
  }

  return { openProjectPicker };
}

module.exports = { createWindowsProjectPicker };
