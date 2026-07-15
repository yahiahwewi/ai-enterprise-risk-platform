const puppeteer = require('puppeteer');

/**
 * Hardened headless-Chromium launcher for all PDF generation and OCR work.
 *
 * Fixes the production crash seen on Azure App Service (B1) and Docker:
 *   "Failed to launch the browser process:
 *    chrome_crashpad_handler: --database is required ...
 *    recvmsg: Connection reset by peer (104)"
 *
 * Root cause: a container's /dev/shm defaults to only 64 MB. Chrome uses shared
 * memory heavily and exhausts it during startup, so the render process dies and
 * its crashpad handler misfires. `--disable-dev-shm-usage` makes Chrome write
 * shared memory under /tmp instead; the remaining flags harden Chrome for a
 * constrained, single-core, non-root container and disable the crash reporter
 * that produced the visible error.
 *
 * `PUPPETEER_EXECUTABLE_PATH` is honoured (the Docker image sets it to
 * /usr/bin/chromium). Locally it is undefined, so Puppeteer falls back to its
 * bundled Chromium — dev behaviour is unchanged.
 *
 * @param {import('puppeteer').PuppeteerLaunchOptions} [extra] optional overrides;
 *        any `args` provided are appended to the hardened defaults.
 */
function launchBrowser(extra = {}) {
  const { args: extraArgs = [], ...rest } = extra;
  return puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // the fix: don't rely on the 64 MB /dev/shm
      '--disable-gpu',
      '--no-zygote',
      '--disable-crash-reporter', // stop spawning the failing crashpad handler
      '--disable-breakpad',
      ...extraArgs,
    ],
    ...rest,
  });
}

module.exports = { launchBrowser };
