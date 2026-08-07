const net = require("net");

function waitForTcpPort(host, port, timeoutMs = 30000, pollMs = 1000) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    const tryConnect = () => {
      const socket = net.connect({ host, port });
      const retry = () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
        } else {
          setTimeout(tryConnect, pollMs);
        }
      };

      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.once("error", retry);
      socket.setTimeout(2000, retry);
    };

    tryConnect();
  });
}

module.exports = { waitForTcpPort };
