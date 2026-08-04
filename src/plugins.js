const path = require("path");

function loadPluginCommands(rawPaths = process.env.QME_PLUGINS || "") {
  const commands = {};
  const pluginPaths = rawPaths.split(path.delimiter).map((value) => value.trim()).filter(Boolean);

  for (const pluginPath of pluginPaths) {
    const resolvedPath = path.resolve(pluginPath);
    const plugin = require(resolvedPath);
    const pluginCommands = plugin.commands || plugin;

    for (const [name, handler] of Object.entries(pluginCommands)) {
      if (!/^[a-z][a-z0-9:_-]*$/i.test(name) || typeof handler !== "function") continue;
      if (!commands[name]) commands[name] = handler;
    }
  }

  return commands;
}

module.exports = { loadPluginCommands };
