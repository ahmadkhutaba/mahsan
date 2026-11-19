import { useId } from 'react'
import { ME, peopleById } from '../data/people.js'
import { useStore } from '../state/store.jsx'

const SKIN = { 1: '#f6d7c0', 2: '#ecc19c', 3: '#d9a273', 4: '#b07a4f', 5: '#7d5233' }
const SHADE = { 1: '#e9bfa3', 2: '#dba77f', 3: '#c2885a', 4: '#96633c', 5: '#674026' }

const CAP = 'M19.6 29 C18.6 17.5 25.5 13 32 13 C38.5 13 45.4 17.5 44.4 29 C42.5 23.5 38 21 32 21 C26 21 21.5 23.5 19.6 29 Z'

function HairBack({ style, color }) {
  if (style === 'long') return <path d="M17.5 30 C16.5 16 25 11.5 32 11.5 C39 11.5 47.5 16 46.5 30 L47.5 50 C47.5 54 42 54 41 51 L23 51 C22 54 16.5 54 16.5 50 Z" fill={color} />
  if (style === 'bob') return <path d="M18 29 C17 16 25 12 32 12 C39 12 47 16 46 29 L46 39 C46 43 42 44 40 42 L24 42 C22 44 18 43 18 39 Z" fill={color} />
  if (style === 'hijab') return <path d="M32 10.5 C22 10.5 15.5 18 16 30 C16.3 38 14 47 11 53 L53 53 C50 47 47.7 38 48 30 C48.5 18 42 10.5 32 10.5 Z" fill={color} />
  if (style === 'bun') return <circle cx="32" cy="10.5" r="5.5" fill={color} />
  return null
}

function HairFront({ style, color }) {
  if (style === 'hijab') return null
  if (style === 'buzz') return <path d="M20.2 27 C19.8 18.5 26 15 32 15 C38 15 44.2 18.5 43.8 27 C41.5 21.5 37.5 19.8 32 19.8 C26.5 19.8 22.5 21.5 20.2 27 Z" fill={color} opacity=".85" />
  if (style === 'curly')
    return (
      <g fill={color}>
        <circle cx="21.5" cy="23" r="4.6" />
        <circle cx="25" cy="17.5" r="5" />
        <circle cx="32" cy="15" r="5.4" />
        <circle cx="39" cy="17.5" r="5" />
        <circle cx="42.5" cy="23" r="4.6" />
        <circle cx="28.5" cy="20" r="3.6" />
        <circle cx="35.5" cy="20" r="3.6" />
      </g>
    )
  if (style === 'long' || style === 'bob')
    return <path d="M19.4 30 C18.4 17.5 25.5 13 32 13 C38.5 13 45.6 17.5 44.6 30 C43.5 24.5 40.5 21.5 36.5 20.5 C32.5 23 25 23.5 21.5 22.5 C20.3 24.5 19.6 27 19.4 30 Z" fill={color} />
  return <path d={CAP} fill={color} />
}

/** Small illustrated portrait. Pass a person id, or an avatar spec directly. */
export default function Avatar({ id, spec, size = 48, ring = false, className = '' }) {
  const clip = useId()
  const { state } = useStore()
  const a = spec || (id === ME ? state.me.avatar : peopleById[id]?.avatar)
  if (!a) return null
  const skin = SKIN[a.skin]
  const shade = SHADE[a.skin]
  const hijab = a.hair === 'hijab'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`shrink-0 rounded-full ${ring ? 'ring-2 ring-cream-50' : ''} ${className}`}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill={a.bg} />
        {!hijab && <HairBack style={a.hair} color={a.hairColor} />}
        <path d="M8 68 C8 54 18 48.5 32 48.5 C46 48.5 56 54 56 68 Z" fill={a.shirt} />
        <path d="M27 40 h10 v8 c0 3.6 -10 3.6 -10 0 Z" fill={shade} />
        {hijab && <HairBack style="hijab" color={a.hairColor} />}
        <ellipse cx="32" cy="30" rx={hijab ? 10.4 : 12} ry={hijab ? 12 : 13.5} fill={skin} />
        {a.beard && (
          <path d="M20.3 31 C20.5 43 26.5 46.5 32 46.5 C37.5 46.5 43.5 43 43.7 31 C42 36.5 38 38.5 32 38.5 C26 38.5 22 36.5 20.3 31 Z" fill={a.hairColor} opacity=".92" />
        )}
        <HairFront style={a.hair} color={a.hairColor} />
        <circle cx="27.3" cy="31" r="1.35" fill="#2a1d17" />
        <circle cx="36.7" cy="31" r="1.35" fill="#2a1d17" />
        <circle cx="24.6" cy="35" r="2.1" fill="#e2735a" opacity=".22" />
        <circle cx="39.4" cy="35" r="2.1" fill="#e2735a" opacity=".22" />
        <path d="M28 36.4 Q32 39.8 36 36.4" fill="none" stroke={a.beard ? '#fbe9df' : '#8a3f2c'} strokeWidth="1.5" strokeLinecap="round" />
        {a.glasses && (
          <g fill="none" stroke="#2a1d17" strokeWidth="1.2">
            <circle cx="27.3" cy="31" r="3.7" />
            <circle cx="36.7" cy="31" r="3.7" />
            <path d="M31 31 h2" />
          </g>
        )}
      </g>
    </svg>
  )
}

/** Overlapping row of avatars. */
export function AvatarStack({ ids, size = 32, max = 5 }) {
  const shown = ids.slice(0, max)
  const extra = ids.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((id, i) => (
        <span key={id} style={{ marginLeft: i === 0 ? 0 : -size * 0.28 }}>
          <Avatar id={id} size={size} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="flex items-center justify-center rounded-full bg-cream-200 text-xs font-semibold text-ink ring-2 ring-cream-50"
          style={{ width: size, height: size, marginLeft: -size * 0.28 }}
        >
          +{extra}
        </span>
      )}
    </div>
  )
}
