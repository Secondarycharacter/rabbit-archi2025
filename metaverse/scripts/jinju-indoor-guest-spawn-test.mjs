/**
 * Headless browser test for Jinju indoor guest spawn freeze detection.
 *
 * Run:
 *   node metaverse/scripts/jinju-indoor-guest-spawn-test.mjs           # default: cold ramp, 16 guests (~40-90s)
 *   node metaverse/scripts/jinju-indoor-guest-spawn-test.mjs --quick   # marks 1-6 + spawn-once retrigger (~35s)
 *   node metaverse/scripts/jinju-indoor-guest-spawn-test.mjs --full    # cold + preload scenarios (~2x)
 */
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METAVERSE_ROOT = path.join(__dirname, "..");
const PORT = 8091;
const mode = process.argv.includes("--full")
  ? "full"
  : process.argv.includes("--quick")
    ? "quick"
    : "default";
const TEST_URL = `http://127.0.0.1:${PORT}/jinju-indoor-guest-spawn-test.html?mode=${mode}`;
const TIMEOUT_MS = mode === "full" ? 8 * 60 * 1000 : mode === "quick" ? 3 * 60 * 1000 : 5 * 60 * 1000;

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["http-server", METAVERSE_ROOT, "-p", String(PORT), "-c-1", "--silent"],
      { stdio: "ignore", shell: process.platform === "win32" }
    );

    child.on("error", reject);

    const probe = () => {
      http.get(TEST_URL, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          resolve(child);
          return;
        }

        setTimeout(probe, 300);
      }).on("error", () => {
        setTimeout(probe, 300);
      });
    };

    setTimeout(probe, 500);
  });
}

async function runBrowserTest() {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    protocolTimeout: TIMEOUT_MS,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=angle"]
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);

    page.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("failed to load") || text.includes("[jinju-indoor-spawn-test]")) {
        console.log(`[browser] ${text}`);
      }
    });

    page.on("pageerror", (error) => {
      console.error("[browser-error]", error.message);
    });

    console.log(`mode=${mode}  ${TEST_URL}`);
    const startedAt = Date.now();
    await page.goto(TEST_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    await page.waitForFunction(
      () => Boolean(window.__JINJU_SPAWN_TEST_RESULT__?.scenarios?.length),
      { timeout: TIMEOUT_MS }
    );

    const result = await page.evaluate(() => window.__JINJU_SPAWN_TEST_RESULT__);
    result.runnerDurationMs = Date.now() - startedAt;
    return result;
  } finally {
    await browser.close();
  }
}

function printReport(result) {
  console.log("\n=== Jinju Indoor Guest Spawn Test ===");
  console.log(`mode: ${result.mode}  config: ${result.configVersion}`);
  console.log(`duration: ${Math.round((result.runnerDurationMs || result.durationMs) / 1000)}s`);
  console.log(`overall: ${result.passed ? "PASS" : "FAIL"}`);
  console.log(`reproduced freeze (>=500ms frame): ${result.reproducedFreeze ? "YES" : "NO"}`);

  for (const scenario of result.scenarios || []) {
    console.log(`\n--- ${scenario.scenario} (${scenario.guestsLoaded}/${scenario.expectedGuests} loaded) ---`);
    console.log(`  freezes: ${scenario.freezeCount}, janks: ${scenario.jankCount}, max frame: ${scenario.maxFrameMs}ms`);
    console.log(`  load-phase freezes: ${scenario.janksDuringLoad?.length ?? 0}`);
    console.log(`  reveal-phase freezes: ${scenario.janksDuringReveal?.length ?? 0}`);

    if (scenario.freezes?.length) {
      scenario.freezes.forEach((event) => {
        console.log(`  freeze ${event.deltaMs}ms @ ${event.phase} guest#${event.guestIndex}`);
      });
    }

    if (scenario.spawnOnceOk !== undefined) {
      console.log(`  spawn-once retrigger: ${scenario.spawnOnceOk ? "OK" : "FAIL"} (skipped=${scenario.revealAnimSkipped}, restarted=${scenario.revealAnimStarted})`);
    }

    const guestFiveSix = scenario.loadTimings?.filter((entry) => entry.guestIndex >= 5 && entry.guestIndex <= 6) || [];
    if (guestFiveSix.length) {
      guestFiveSix.forEach((entry) => {
        console.log(`  ${entry.devLabel} load: ${entry.durationMs}ms`);
      });
    }
  }

  console.log("");
}

let serverProcess = null;

try {
  serverProcess = await startStaticServer();
  const result = await runBrowserTest();
  printReport(result);
  process.exit(result.passed ? 0 : 1);
} catch (error) {
  console.error("Test runner failed:", error.message || error);
  process.exit(2);
} finally {
  serverProcess?.kill();
}
