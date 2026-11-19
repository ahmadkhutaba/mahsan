// Walks the whole prototype in one language at phone size and fails on any console
// error. Labels are looked up in the dictionaries, so the same script runs in English
// and Hebrew:  node e2e/walkthrough.mjs en|he [screenshot-dir]
import { createRequire } from 'node:module'
import { translate } from './t.mjs'

// Playwright is provided by the environment (or `npm i -D playwright` locally).
const { chromium } = createRequire(import.meta.url)('playwright')

const lang = process.argv[2] || 'en'
const shots = process.argv[3]
const t = (key, vars) => translate(lang, key, vars)
const URL = process.env.APP_URL || 'http://localhost:5173/'
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: lang === 'he' ? 'he-IL' : 'en-GB' })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('console', (m) => m.type() === 'warning' && m.text().includes('[i18n]') && errors.push(m.text()))
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message))

let n = 0
const shot = async (name) => {
  await page.waitForTimeout(300)
  if (shots) await page.screenshot({ path: `${shots}/${lang}-${String(++n).padStart(2, '0')}-${name}.png` })
}
const button = (name, exact = false) => page.getByRole('button', { name: exact ? name : new RegExp(escape(name)), exact }).first()
const click = (name, exact) => button(name, exact).click()
const scrollEnd = () => page.locator('.anim-screen .overflow-y-auto').last().evaluate((e) => e.scrollTo(0, 99999))
const check = (label, ok) => { if (!ok) throw new Error(`check failed: ${label}`); console.log(`  ok  ${label}`) }
// No horizontal overflow anywhere inside the phone: the classic RTL breakage.
const noOverflow = async (label) => {
  const wide = await page.evaluate(() => {
    const phone = document.querySelector('.phone')
    const limit = phone.getBoundingClientRect()
    return [...phone.querySelectorAll('*')].filter((el) => {
      if (el.closest('.no-scrollbar') || el.parentElement?.closest('.truncate')) return false // scrollers and deliberately clipped text
      const r = el.getBoundingClientRect()
      return r.width > 0 && (r.right > limit.right + 1 || r.left < limit.left - 1)
    }).length
  })
  check(`no horizontal overflow: ${label}`, wide === 0)
}

try {
await page.goto(URL)
await page.evaluate((l) => localStorage.setItem('pullup.lang', l), lang)
await page.reload()
check(`document direction is ${lang === 'he' ? 'rtl' : 'ltr'}`, (await page.locator('.phone').getAttribute('dir')) === (lang === 'he' ? 'rtl' : 'ltr'))

// ── onboarding ──
await shot('onboarding-1')
check('continue is disabled without a name', await button(t('onboarding.enterName')).isDisabled())
await page.getByLabel(t('onboarding.name')).fill(lang === 'he' ? 'דנה' : 'Dana')
// switching language keeps what was typed
const other = lang === 'he' ? 'English' : 'עברית'
await page.locator('.phone').getByRole('button', { name: other, exact: true }).click()
await page.locator('.phone').getByRole('button', { name: lang === 'he' ? 'עברית' : 'English', exact: true }).click()
check('typed name survives a language switch', (await page.getByLabel(t('onboarding.name')).inputValue()) === (lang === 'he' ? 'דנה' : 'Dana'))
await page.getByRole('radio', { name: t('onboarding.avatarN', { n: 2 }) }).click()
await click(t('common.continue'), true)
await click(t('types.boardgames'))
await shot('onboarding-2'); await noOverflow('onboarding 2')
await click(t('common.continue'), true)
await shot('onboarding-3'); await noOverflow('onboarding 3')
check('finish is disabled until the 18+ box is ticked', await button(t('onboarding.confirmAdult')).isDisabled())
await page.getByRole('checkbox').check()
await click(t('onboarding.finish'))

// ── home, filters, empty state ──
await shot('home'); await noOverflow('home')
check('home lists 5 spots', (await page.locator('main li').count()) === 5)
await click(t('home.filters'))
await shot('filters'); await noOverflow('filters')
await page.getByRole('dialog').getByRole('button', { name: t('types.sports'), exact: true }).click()
await click(t('filters.time_late'), true)
check('filter button reports no matches', (await page.getByRole('dialog').locator('button').last().innerText()).includes(t('filters.none')))
await page.getByRole('dialog').locator('button').last().click()
await shot('home-empty'); await noOverflow('home empty')
await click(t('home.clear'))

// ── details, request, waiting, accepted ──
await page.locator('main li button').nth(3).click() // Pub trivia night (20:30)
await shot('details'); await noOverflow('details')
await scrollEnd(); await shot('details-safety'); await noOverflow('details bottom')
await click(t('spot.report'))
check('report cannot be sent without a reason', await button(t('safety.sendReport')).isDisabled())
await shot('report'); await noOverflow('report sheet')
await page.getByRole('dialog').getByRole('button', { name: t('common.close') }).last().click()
await page.waitForTimeout(250)
await click(t('spot.askToJoin', { open: t('spot.open', { count: 1 }) }))
await click(t('request.starter1'), true)
await shot('request'); await noOverflow('request sheet')
await click(t('request.send'))
await page.getByText(t('plan.waitingFor', { name: 'Maya' })).waitFor()
await shot('waiting'); await noOverflow('waiting')
await page.getByText(t('plan.inTitle')).waitFor({ timeout: 9000 })
await shot('accepted'); await noOverflow('accepted')
await scrollEnd(); await shot('accepted-bottom')

// ── chat, safety ──
await click(t('plan.openChat'))
await page.getByLabel(t('chat.label')).fill(lang === 'he' ? 'בדרך, 10 דקות!' : 'On my way, 10 minutes!')
await click(t('chat.send'), true)
await shot('chat'); await noOverflow('chat')
await click(t('chat.safety'))
await shot('safety-menu')
await click(t('safety.leaveRow'))
await shot('leave'); await noOverflow('leave sheet')
await click(t('safety.stay'))
await click(t('common.back'), true)

// ── rating ──
await scrollEnd()
await click(t('plan.demoSkip'))
check('rating cannot be sent without stars', await button(t('rating.pick')).isDisabled())
await page.getByRole('radio', { name: t('rating.star', { count: 4 }) }).click()
await click(t('rating.yes'), true)
await shot('rating'); await noOverflow('rating')
await click(t('rating.send'))
await shot('rating-done')
await click(t('rating.another'))

// ── declined ──
await click(t('cities.Tel Aviv'), true)
await page.locator('main li button').last().click() // Cocktails and vinyl (22:00) always declines
await click(t('spot.askToJoin', { open: t('spot.open', { count: 1 }) }))
await click(t('request.send'))
await page.getByText(t('plan.declinedTitle')).waitFor({ timeout: 9000 })
await shot('declined'); await noOverflow('declined')
await click(t('plan.seeAll'))
await click(t('tabs.plans'), true)
await shot('plans'); await noOverflow('my plans')

// ── host ──
await click(t('tabs.profile'), true)
await shot('profile'); await noOverflow('profile')
await click(t('roles.host'))
await click(t('tabs.spots'), true)
await shot('host-spots'); await noOverflow('host spots')
await click(t('host.post'))
await click(t('types.sports'), true)
await page.getByLabel(t('create.nameIt')).fill(lang === 'he' ? 'כדורעף חופים' : 'Sunset volleyball')
await page.locator('.anim-screen').getByRole('button', { name: t('cities.Haifa'), exact: true }).click()
await page.locator('.anim-screen').getByRole('button', { name: /Dado/ }).click()
await click('19:00', true)
await scrollEnd()
await shot('create'); await noOverflow('create')
await click(t('create.post'), true)
await click(t('tabs.requests'))
await shot('requests'); await noOverflow('requests')
await page.getByRole('button', { name: /Lia/ }).click()
await shot('joiner'); await noOverflow('joiner profile')
await click(t('joiner.accept'), true)
await shot('host-after')
} catch (e) {
  if (shots) await page.screenshot({ path: `${shots}/${lang}-FAILED.png` })
  console.error(String(e).split('\n').slice(0, 4).join('\n'))
  errors.push('walkthrough stopped early')
}

await browser.close()
if (errors.length) {
  console.error('console errors:\n' + errors.join('\n'))
  process.exit(1)
}
console.log(`walkthrough (${lang}) passed with no console errors`)
