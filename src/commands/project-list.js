const path = require("path");
const chalk = require("chalk");

async function runProjectListCommand({
  getSavedProjects,
  formatShortDateOnly,
  askQuestion,
  prepareXamppForLaravelProject,
  tryOpenInVsCode,
  openProjectPicker,
  isWindows = false,
}) {
  const projects = getSavedProjects();
  if (!projects.length) {
    console.log(chalk.yellow("ℹ️ No saved projects found in config"));
    console.log();
    return;
  }

  const pickedIndex = typeof openProjectPicker === "function" ? openProjectPicker(projects) : null;
  if (isWindows) {
    if (Number.isInteger(pickedIndex)) {
      const selectedProject = projects[pickedIndex];
      if (String(selectedProject.type || "").toLowerCase() === "laravel") {
        const xamppReady = await prepareXamppForLaravelProject(selectedProject);
        if (!xamppReady) return;
      }
      tryOpenInVsCode(selectedProject.path, `${selectedProject.type || "project"} project`, {
        newWindow: true,
      });
    }
    return;
  }

  if (Number.isInteger(pickedIndex)) {
    const selectedProject = projects[pickedIndex];
    if (String(selectedProject.type || "").toLowerCase() === "laravel") {
      const xamppReady = await prepareXamppForLaravelProject(selectedProject);
      if (!xamppReady) {
        console.log();
        return;
      }
    }
    tryOpenInVsCode(selectedProject.path, `${selectedProject.type || "project"} project`, {
      newWindow: true,
    });
    console.log();
    return;
  }

  console.log(chalk.blueBright("Projects:"));
  projects.forEach((project, index) => {
    const isLaravel = String(project.type || "").toLowerCase() === "laravel";
    const updatedAt = formatShortDateOnly(project.updatedAt);
    const projectName = path.basename(project.path.replace(/[\\/]+$/, ""));

    if (isLaravel) {
      const phpValue = project.phpVersion ? `php: ${project.phpVersion}` : "";
      const laravelValue = project.laravelVersion ? `laravel: ${project.laravelVersion}` : "";
      const updatedValue = updatedAt || "";
      console.log(
        chalk.green(
          `  ${index + 1}) ${projectName} ( ${[phpValue, laravelValue, updatedValue].filter(Boolean).join(" | ")} )`,
        ),
      );
    } else if (project.type) {
      const updatedValue = updatedAt ? ` ${updatedAt}` : "";
      console.log(
        chalk.green(`  ${index + 1}) ${projectName} ( ${project.type} |${updatedValue} )`),
      );
    }
  });

  console.log();
  const answer = await askQuestion(
    chalk.yellow(`👉 Select project to open (1/${projects.length}) [Enter to abort]: `),
  );
  const selected = Number.parseInt(answer, 10);
  if (!Number.isInteger(selected) || selected < 1 || selected > projects.length) {
    console.log(chalk.gray("⏹️".padEnd(4, " ") + "Project open aborted"));
    console.log();
    return;
  }

  const selectedProject = projects[selected - 1];
  if (String(selectedProject.type || "").toLowerCase() === "laravel") {
    const xamppReady = await prepareXamppForLaravelProject(selectedProject);
    if (!xamppReady) {
      console.log();
      return;
    }
  }

  tryOpenInVsCode(selectedProject.path, `${selectedProject.type || "project"} project`, {
    newWindow: true,
  });
  console.log();
}

module.exports = { runProjectListCommand };
