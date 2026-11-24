import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.EMA_BROWSER_URL || 'http://127.0.0.1:5173'
const root = fileURLToPath(new URL('../../..', import.meta.url))
const tools = process.env.EMA_PLAYWRIGHT_ROOT || resolve(root, 'output/local/browser-tools')
const require = createRequire(resolve(tools, 'package.json'))
const playwright = require('playwright')
const requested = (process.env.EMA_BROWSER_ENGINES || 'chromium,firefox,webkit').split(',')
const widths = (process.env.EMA_BROWSER_WIDTHS || '320,375,768,1440').split(',').map(Number)
const screenshotDir = process.env.EMA_SCREENSHOTS_DIR
if (screenshotDir) await mkdir(screenshotDir, { recursive: true })

async function learningJourney(browser, engine, width) {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 850 : 950 },
    hasTouch: width < 600,
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(12_000)
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const take = async (name, region) => {
    if (screenshotDir && engine === 'chromium' && (width === 1440 || (width === 375 && name === 'homepage'))) {
      const path = resolve(screenshotDir, width === 375 ? 'mobile.png' : name + '.png')
      if (region) await region.screenshot({ path })
      else await page.screenshot({ path, fullPage: true })
    }
  }
  const heading = (name, level = 1) => page.getByRole('heading', { name, exact: true, level })
  const clickLink = (name, target = page) => target.getByRole('link', { name, exact: true }).click()
  const assertNoOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${engine} ${width}px has horizontal overflow`)

  try {
    await page.goto(baseURL)
    await heading('Find your next big idea.').waitFor()
    const grades = page.locator('#grades')
    await grades.getByRole('link').last().waitFor()
    assert.equal(await grades.getByRole('link').count(), 6)
    await assertNoOverflow()
    await take('homepage')
    // macOS WebKit uses Option-Tab to include links in sequential focus.
    await page.keyboard.press(engine === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab')
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Skip to content')
    await page.keyboard.press('Enter')
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'main-content')
    await clickLink('Choose your grade')
    await take('grade-selection', grades)
    const gradeSix = grades.getByRole('link', { name: /^Grade 6/ })
    if (width < 600) await gradeSix.tap()
    else await gradeSix.click()
    await heading('Choose a subject').waitFor()
    const computing = page.getByRole('link', { name: /Computer Science|Computing/i })
    await computing.waitFor()
    assert.equal(await page.locator('.subject-grid li').count(), 7)
    await take('subject-selection')
    await computing.click()
    await heading('Demonstration unit 1', 2).waitFor()
    const journeyURL = page.url()
    const first = page.getByRole('listitem').filter({ has: heading('Demonstration unit 1', 2) })
    const second = page.getByRole('listitem').filter({ has: heading('Demonstration unit 2', 2) })
    await second.getByText('Locked', { exact: true }).waitFor()
    assert.equal(await second.getByRole('link', { name: 'Open unit' }).count(), 0)
    await take('learning-journey')
    const course = await context.request.get(new URL(journeyURL).origin + '/api/v2' + new URL(journeyURL).pathname)
    assert.equal(course.ok(), true)
    const lockedId = (await course.json()).units.find(unit => unit.label.en === 'Demonstration unit 2').id
    const lockedResource = new URL(`/api/v2/units/${lockedId}/resources/homework-en-1`, baseURL).href
    const restricted = await context.request.get(lockedResource)
    assert.equal(restricted.status(), 403)
    await page.goto(new URL('/units/' + lockedId, baseURL).href)
    await page.getByRole('alert').getByText('This unit is locked.', { exact: false }).waitFor()
    await take('locked-unit')
    await page.goto(journeyURL)
    await clickLink('Open unit', first)
    await heading('Demonstration unit 1').waitFor()
    await take('lesson-viewer')
    await assertNoOverflow()
    const notes = page.locator('#homework')
    await notes.getByRole('link', { name: /Worksheet 1/ }).waitFor()
    assert.equal(await notes.getByRole('link', { name: /Worksheet [1-7]/ }).count(), 7)
    const worksheet = await notes.getByRole('link', { name: /Worksheet 1/ }).getAttribute('href')
    const download = await context.request.get(new URL(worksheet, baseURL).href)
    assert.equal(download.ok(), true)
    assert.match(download.headers()['content-type'], /application\/pdf/)
    await notes.scrollIntoViewIfNeeded()
    await take('homework', notes)
    await page.getByRole('button', { name: 'پښتو', exact: true }).click()
    assert.equal(await page.locator('html').getAttribute('dir'), 'rtl')
    await assertNoOverflow()
    await page.getByRole('button', { name: 'EN', exact: true }).click()
    assert.equal(await page.locator('html').getAttribute('dir'), 'ltr')

    async function runTest(slot, retake = false) {
      const card = page.locator('.assessment-card').filter({ has: page.getByText('Test ' + slot, { exact: true }) })
      await card.getByRole('button', { name: retake ? 'Retake test' : 'Start test' }).click()
      await page.getByRole('heading', { name: /Choose the observation/i, level: 2 }).waitFor()
      const requestPath = new URL(page.url()).pathname.replace(/^\/units\/\d+/, '')
      const attemptResponse = await context.request.get(new URL('/api/v2' + requestPath, baseURL).href)
      assert.equal(attemptResponse.ok(), true)
      const attempt = await attemptResponse.json()
      const otherLearner = await browser.newContext()
      try {
        const crossLearner = await otherLearner.request.get(new URL('/api/v2' + requestPath, baseURL).href)
        assert.equal(crossLearner.status(), 404)
      } finally {
        await otherLearner.close()
      }
      for (const question of attempt.questions) {
        for (const field of ['answer', 'correctAnswer', 'acceptedAnswers', 'rubric', 'correctOption']) assert.equal(question[field], undefined)
      }
      await page.getByRole('radio', { name: 'A', exact: true }).check()
      await page.getByText('Responses saved.', { exact: true }).waitFor()
      if (slot === 1 && !retake) {
        await page.reload()
        await page.getByRole('radio', { name: 'A', exact: true }).waitFor()
        assert.equal(await page.getByRole('radio', { name: 'A', exact: true }).isChecked(), true)
        await take('assessment')
      }
      await page.getByRole('button', { name: 'Review submission' }).click()
      await page.getByRole('button', { name: 'Submit test', exact: true }).click()
      await heading('Assessment results').waitFor()
      if (slot === 1 && !retake) await take('assessment-results')
      await clickLink('Return to unit')
    }
    await runTest(1)
    await page.goto(journeyURL)
    await second.getByText('Locked', { exact: true }).waitFor()
    await clickLink('Open unit', first)
    await runTest(1, true)
    await page.goto(journeyURL)
    await second.getByText('Locked', { exact: true }).waitFor()
    await clickLink('Open unit', first)
    await runTest(2)
    await page.goto(journeyURL)
    await second.getByRole('link', { name: 'Open unit' }).waitFor()
    await take('unit-unlocked')
    await clickLink('Open unit', second)
    await heading('Demonstration unit 2').waitFor()
    assert.equal((await context.request.get(lockedResource)).status(), 200)
    await page.reload()
    await heading('Demonstration unit 2').waitFor()
    await assertNoOverflow()
    assert.deepEqual(pageErrors, [])
  } finally {
    await context.close()
  }
}

const failures = []
for (const engine of requested) {
  let browser
  try {
    const executablePath = engine === 'chromium' ? process.env.EMA_CHROME_PATH : undefined
    browser = await playwright[engine].launch({ executablePath })
    for (const width of widths) {
      try {
        await learningJourney(browser, engine, width)
        console.log(`PASS ${engine} ${width}px`)
      } catch (error) {
        failures.push(`${engine} ${width}px: ${error.message}`)
        console.error(failures.at(-1))
      }
    }
  } catch (error) {
    failures.push(`${engine}: ${error.message}`)
    console.error(failures.at(-1))
  } finally {
    await browser?.close()
  }
}
if (failures.length) process.exitCode = 1
