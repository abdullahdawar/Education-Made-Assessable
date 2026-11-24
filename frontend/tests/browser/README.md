# Platform browser tests

Run these commands from the repository root with Docker running. Use a
disposable browser profile because the journey creates learner records and
submits assessments.

```sh
python3 tests/fixtures/build_demo_bundle.py output/local/browser-demo
EMA_DEV_PROFILE=browser EMA_ASSETS="$PWD/output/local/browser-demo" \
  EMA_BUNDLE="$PWD/output/local/browser-demo/import.json" scripts/dev.sh start

npm install --prefix output/local/browser-tools --no-audit --no-fund playwright
export PLAYWRIGHT_BROWSERS_PATH="$PWD/output/local/browser-tools/browsers"
output/local/browser-tools/node_modules/.bin/playwright install chromium firefox webkit
node frontend/tests/browser/platform.mjs

EMA_DEV_PROFILE=browser scripts/dev.sh stop
```

The tests use fresh browser contexts for each viewport and check the
synthetic Grade 6 Computer Science learning journey. They cover keyboard
and touch input, RTL, worksheet downloads, autosave after refresh, learner
isolation, repeat attempts, release of the next unit after two distinct
submissions, and progress after a further refresh.

Set `EMA_BROWSER_URL` if the development profile runs at a different URL.
Set `EMA_BROWSER_ENGINES` or `EMA_BROWSER_WIDTHS` to a comma-separated
subset for a shorter run. An installed Google Chrome can be used by setting
`EMA_CHROME_PATH` to its executable. Set `EMA_SCREENSHOTS_DIR` to capture
the desktop and mobile evidence from the Chromium runs.
