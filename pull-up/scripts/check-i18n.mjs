// Fails if en.js and he.js do not have exactly the same keys, or if a variable
// used in one language is missing in the other.
import en from '../src/i18n/en.js'
import he from '../src/i18n/he.js'

const flatten = (node, prefix = '') =>
  Object.entries(node).flatMap(([k, v]) => (typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]))
const plural = /_(zero|one|two|few|many|other)$/
const base = (k) => k.replace(plural, '')
const E = new Map(flatten(en))
const H = new Map(flatten(he))
const problems = []
for (const k of E.keys()) if (!H.has(k) && ![...H.keys()].some((h) => base(h) === base(k))) problems.push(`missing in he: ${k}`)
for (const k of H.keys()) if (!E.has(k) && ![...E.keys()].some((e) => base(e) === base(k))) problems.push(`missing in en: ${k}`)
for (const [k, v] of H) if (plural.test(k) && !H.has(`${base(k)}_other`)) problems.push(`he plural without _other: ${k}`)
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => v !== 'count').sort().join(',')
for (const [k, v] of E) if (H.has(k) && vars(v) !== vars(H.get(k))) problems.push(`different variables: ${k}`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`i18n ok: ${E.size} English keys, ${H.size} Hebrew keys`)

// Every key the code asks for must exist. Dynamic keys (t(`types.${id}`)) are checked by prefix.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
const files = []
const walk = (dir) => readdirSync(dir).forEach((f) => {
  const p = join(dir, f)
  if (statSync(p).isDirectory()) walk(p)
  else if (/\.(jsx|js)$/.test(f) && !p.includes('i18n')) files.push(p)
})
walk(new URL('../src', import.meta.url).pathname)
const keys = [...E.keys()]
const has = (k) => E.has(k) || keys.some((e) => base(e) === k)
const missing = new Set()
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/\bt\(\s*'([\w.]+)'/g)) if (!has(m[1])) missing.add(`${m[1]}  (${f.split('/src/')[1]})`)
  for (const m of src.matchAll(/(?:key: |toast\()'((?:toast|plan|chat)\.[\w.]+)'/g)) if (!has(m[1])) missing.add(`${m[1]}  (${f.split('/src/')[1]})`)
  for (const m of src.matchAll(/\bt\(\s*`([\w.]+)\$\{/g)) if (!keys.some((e) => e.startsWith(m[1]))) missing.add(`${m[1]}*  (${f.split('/src/')[1]})`)
}
if (missing.size) {
  console.error('keys used in code but not defined:\n' + [...missing].join('\n'))
  process.exit(1)
}
console.log(`all keys used in ${files.length} source files are defined`)
