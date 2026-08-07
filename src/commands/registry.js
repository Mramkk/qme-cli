async function dispatchCommand(args, handlers) {
  const handler = handlers[args[0]];
  if (typeof handler !== "function") return false;
  await handler(args);
  return true;
}

module.exports = { dispatchCommand };
