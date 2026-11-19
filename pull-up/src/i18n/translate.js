import en from './en.js'
import he from './he.js'

// Pure lookup, shared by the app and the end-to-end scripts.

export const DICTS = { en, he }

const lookup = (dict, key) => key.split('.').reduce((node, part) => (node == null ? node : node[part]), dict)

// First-strong isolate … pop isolate. Wrapping a value in these keeps an English name
// (or a number range such as 25–29) intact inside a Hebrew sentence, and the reverse.
const FSI = '⁨'
const PDI = '⁩'
export const isolate = (value) => `${FSI}${value}${PDI}`

export function translate(lang, key, vars) {
  const dict = DICTS[lang] || en
  let text
  if (vars && typeof vars.count === 'number') {
    const rule = new Intl.PluralRules(lang).select(vars.count)
    text = lookup(dict, `${key}_${rule}`) ?? lookup(dict, `${key}_other`)
  }
  text ??= lookup(dict, key) ?? lookup(en, key)
  if (typeof text !== 'string') return null
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name) => {
    if (!(name in vars)) return match
    const value = vars[name]
    return typeof value === 'number' ? String(value) : isolate(value)
  })
}
