const puppeteer = require('puppeteer');
const os = require('os');

/**
 * Hardened headless-Chromium launcher for all PDF generation and OCR work.
 *
 * Fixes the production crash seen on Azure App Service / Docker:
 *   "Failed to launch the browser process:
 *    chrome_crashpad_handler: --database is required ...
 *    recvmsg: Connection reset by peer (104)"
 *
 * Root cause: the image runs as a non-root user (`erm`) that has no writable
 * HOME. Chrome derives its crashpad "database" directory from HOME; with an
 * unwritable/empty HOME it launches crashpad_handler with an empty --database,
 * the handler aborts, and the whole browser launch fails. (`--disable-gpu` /
 * `--disable-dev-shm-usage` alone do NOT fix this, and `--disable-crash-reporter`
 * does not stop Debian's Chromium from spawning the crashpad handler.)
 *
 * Fix: point HOME (and the crash-dumps dir) at a writable temp directory. In
 * the Linux container that is /tmp (world-writable, sticky); on Windows dev it
 * is the OS temp dir. This only affects the spawned Chrome process — the Node
 * process env is untouched.
 *
 * `PUPPETEER_EXECUTABLE_PATH` is honoured (the Docker image sets it to
 * /usr/bin/chromium); locally it is undefined so Puppeteer uses bundled Chrome.
 */
const CHROME_HOME = process.platform === 'win32' ? os.tmpdir() : '/tmp';

function launchBrowser(extra = {}) {
  const { args: extraArgs = [], env: extraEnv, ...rest } = extra;
  return puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      `--crash-dumps-dir=${CHROME_HOME}`,
      ...extraArgs,
    ],
    // Give Chrome/crashpad a writable HOME so it can create its database dir.
    env: { ...process.env, HOME: CHROME_HOME, ...(extraEnv || {}) },
    ...rest,
  });
}

module.exports = { launchBrowser };
