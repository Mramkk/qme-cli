const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function canAnimate(output = process.stdout) {
  return Boolean(output?.isTTY) && process.env.QME_NO_SPINNER !== "1";
}

function createSpinner(message = "Processing") {
  const output = process.stdout;
  let frameIndex = 0;
  let interval = null;
  let active = false;

  function render() {
    output.write(`\r\x1b[2K${FRAMES[frameIndex]} ${message}`);
    frameIndex = (frameIndex + 1) % FRAMES.length;
  }

  return {
    start() {
      if (active || !canAnimate(output)) return;
      active = true;
      render();
      interval = setInterval(render, 100);
      interval.unref?.();
    },
    stop(finalMessage = "") {
      if (!active) return;
      clearInterval(interval);
      interval = null;
      active = false;
      output.write(`\r\x1b[2K${finalMessage}`);
    },
  };
}

async function withSpinner(message, operation) {
  const spinner = createSpinner(message);
  spinner.start();
  try {
    return await operation();
  } finally {
    spinner.stop();
  }
}

function withSpinnerSync(message, operation) {
  const spinner = createSpinner(message);
  spinner.start();
  try {
    return operation();
  } finally {
    spinner.stop();
  }
}

module.exports = { canAnimate, createSpinner, withSpinner, withSpinnerSync };
