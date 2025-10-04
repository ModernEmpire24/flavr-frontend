import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import { AnimatePresence, motion } from 'framer-motion'

/* --- Supabase (Auth + UI) — self-contained for preview --- */
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

// In this preview, we initialize Supabase inline. In your repo you can keep
// src/lib/supabaseClient.js; this file will still work there too.
const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof window !== 'undefined' && window.SUPABASE_URL) ||
  null
const SUPABASE_ANON =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) ||
  null
let supabase = null
let supabaseReady = false
try {
  if (SUPABASE_URL && SUPABASE_ANON) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
    supabaseReady = true
  }
} catch (e) {
  console.warn('Supabase init skipped in preview:', e)
}

/* =========================================================
   Small UI primitives
   ========================================================= */
function cn(...xs) {
  return xs.filter(Boolean).join(' ')
}

function Button({ children, onClick, variant = 'solid', className = '', disabled, title, type }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold transition will-change-transform active:scale-[.98] hover:-translate-y-0.5 disabled:opacity-50'
  const grad = 'bg-gradient-to-tr from-amber-400 via-orange-400 to-rose-500' // brand fill
  const variants = {
    solid: `${grad} text-white shadow-sm hover:shadow-md`,
    soft: `bg-stone-100 text-slate-800 hover:bg-stone-200`,
    outline: `border border-stone-300 text-slate-800 hover:bg-stone-50 shadow-sm`,
    ghost: `text-slate-800 hover:bg-stone-50`,
  }
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, variants[variant], className)}
    >
      {children}
    </button>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={cn('rounded-3xl border border-stone-200 bg-white shadow-sm', className)}>
      {children}
    </div>
  )
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
    </div>
  )
}

/* =========================================================
   Local storage helper
   ========================================================= */
function useLocal(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const r = localStorage.getItem(key)
      return r ? JSON.parse(r) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v))
    } catch {}
  }, [key, v])
  return [v, setV]
}

/* =========================================================
   Date helpers for Planner
   ========================================================= */
function pad(n) {
  return n < 10 ? `0${n}` : `${n}`
}
function iso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function startOfWeek(d) {
  const x = new Date(d)
  const dow = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dow)
  x.setHours(0, 0, 0, 0)
  return x
}
function startOfMonth(d) {
  const x = new Date(d)
  const first = new Date(x.getFullYear(), x.getMonth(), 1)
  first.setHours(0, 0, 0, 0)
  return first
}
function getWeekDays(anchor) {
  const s = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}
function getMonthGrid(anchor) {
  const s = startOfMonth(anchor)
  const first = startOfWeek(s)
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}
const MEALS = ['Breakfast', 'Lunch', 'Dinner']

/* =========================================================
   Demo seed (used until collector loads)
   ========================================================= */
const SEED = [
  {
    id: 'r1',
    title: 'Crispy Chili Garlic Noodles',
    image:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1600&auto=format&fit=crop',
    time: 20,
    difficulty: 'Easy',
    rating: 4.7,
    calories: 520,
    cuisine: 'Asian',
    dietTags: ['vegan'],
    source: { platform: 'web', handle: 'SeriousEats', url: 'https://www.seriouseats.com' },
    ingredients: [
      { item: 'Noodles', amount: '8 oz' },
      { item: 'Garlic', amount: '6 cloves' },
    ],
    steps: [
      { text: 'Boil noodles', timerSec: 600 },
      { text: 'Sizzle garlic', timerSec: 120 },
    ],
  },
  {
    id: 'r2',
    title: 'Sheet-Pan Salmon & Veg',
    image:
      'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop',
    time: 25,
    difficulty: 'Easy',
    rating: 4.5,
    calories: 430,
    cuisine: 'American',
    dietTags: ['pescatarian'],
    source: { platform: 'web', handle: 'BonAppetit', url: 'https://www.bonappetit.com' },
    ingredients: [
      { item: 'Salmon', amount: '2 fillets' },
      { item: 'Broccoli', amount: '3 cups' },
    ],
    steps: [
      { text: 'Roast veg', timerSec: 600 },
      { text: 'Add salmon', timerSec: 900 },
    ],
  },
]

/* =========================================================
   Share modal (creates link in Supabase `shares` if available)
   ========================================================= */
function canUUID() {
  return typeof crypto !== 'undefined' && crypto?.randomUUID
}
function makeId() {
  return canUUID()
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function ShareModal({ open, onClose, recipe, session }) {
  const [makingLink, setMakingLink] = useState(false)
  const [link, setLink] = useState('')

  async function createShareLink() {
    try {
      setMakingLink(true)
      const token = makeId().slice(0, 12)
      if (supabaseReady && session?.user?.id) {
        const payload = {
          owner_id: session.user.id,
          token,
          visibility: 'link',
          recipe,
          recipients: [],
        }
        const { data, error } = await supabase.from('shares').insert(payload).select().single()
        if (error) throw error
        const url = `${window.location.origin}/s/${data.token}`
        setLink(url)
        try {
          await navigator.clipboard.writeText(url)
        } catch {}
      } else {
        const url = `${window.location.origin}/s/${token}` // preview-only link
        setLink(url)
        try {
          await navigator.clipboard.writeText(url)
        } catch {}
      }
    } catch (e) {
      console.error(e)
      alert('Could not create link.')
    } finally {
      setMakingLink(false)
    }
  }

  const shareNative = async () => {
    if (!link) await createShareLink()
    try {
      if (navigator.share) {
        await navigator.share({
          title: recipe.title,
          text: 'Check out this recipe on Flavr',
          url: link,
        })
      } else {
        await navigator.clipboard?.writeText(link)
        alert('Link copied!')
      }
    } catch {}
  }
  const shareEmail = async () => {
    if (!link) await createShareLink()
    const subject = encodeURIComponent(`Flavr recipe: ${recipe.title}`)
    const body = encodeURIComponent(
      `${recipe.title}\n${link}\n\nIngredients:\n${(recipe.ingredients || []).map((i) => `• ${i.item} ${i.amount || ''}`).join('\n')}`
    )
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }
  if (!open || !recipe) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <SectionTitle title="Share recipe" subtitle={recipe.title} />
        <div className="space-y-3 text-sm">
          <div className="flex gap-2">
            <Button onClick={createShareLink} disabled={makingLink}>
              {makingLink ? 'Creating…' : 'Create link'}
            </Button>
            <Button variant="soft" onClick={shareNative}>
              Share…
            </Button>
            <Button variant="outline" onClick={shareEmail}>
              Email
            </Button>
          </div>
          {link && (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-2 text-xs">
              {link}
            </div>
          )}
          <div className="text-xs text-slate-500">
            In-app share to connections uses <code>recipients</code> and{' '}
            <code>visibility='connections'</code>.
          </div>
        </div>
        <div className="mt-4 text-right">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   Settings modal (sign in / profile / connections)
   ========================================================= */
function SettingsModal({ open, onClose, session, profile, setProfile }) {
  if (!open) return null
  const signOut = async () => {
    try {
      await supabase?.auth?.signOut?.()
    } catch {}
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 p-4">
          <h3 className="text-lg font-bold text-slate-800">Settings</h3>
          <button
            className="rounded-full bg-stone-100 px-3 py-1 text-sm text-slate-700 hover:bg-stone-200"
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <Card className="p-4">
            <SectionTitle title="Account" />
            {supabaseReady ? (
              session ? (
                <div className="space-y-3 text-sm">
                  <div className="text-slate-700">Logged in.</div>
                  <div className="grid gap-2">
                    <input
                      value={profile.name || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Display name"
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                    />
                    <input
                      value={profile.avatar || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, avatar: e.target.value }))}
                      placeholder="Avatar URL"
                      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                    />
                    <textarea
                      value={profile.bio || ''}
                      onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                      placeholder="Short bio"
                      className="min-h-[86px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
                    />
                  </div>
                  <Button variant="outline" onClick={signOut}>
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-600">
                    Sign in to sync favorites, planner, and grocery across devices.
                  </div>
                  <Auth
                    supabaseClient={supabase}
                    appearance={{ theme: ThemeSupa }}
                    providers={['google', 'github', 'apple']}
                    onlyThirdPartyProviders={false}
                  />
                </div>
              )
            ) : (
              <div className="text-sm text-slate-600">
                Preview mode: connect your Supabase keys in .env to enable auth UI.
              </div>
            )}
          </Card>

          <Card className="p-4">
            <SectionTitle title="Connections" subtitle="Link social sources" />
            <div className="space-y-2 text-sm text-slate-700">
              {[
                { k: 'pinterest', label: 'Pinterest' },
                { k: 'instagram', label: 'Instagram' },
                { k: 'tiktok', label: 'TikTok' },
                { k: 'youtube', label: 'YouTube' },
                { k: 'x', label: 'X / Twitter' },
                { k: 'facebook', label: 'Facebook' },
              ].map(({ k, label }) => (
                <label
                  key={k}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50 p-2"
                >
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={!!profile?.connections?.[k]}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        connections: { ...(p.connections || {}), [k]: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 accent-amber-500"
                  />
                </label>
              ))}
              <div className="text-xs text-slate-500">
                These toggles control which sources your Discover feed prefers.
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   Recipe modal (video + details)
   ========================================================= */
function canPlayInReactPlayer(url = '') {
  return /youtube\.com|youtu\.be|vimeo\.com|facebook\.com|fb\.watch|twitch\.tv|soundcloud\.com|dailymotion\.com|wistia\.com|mixcloud\.com/i.test(
    url
  )
}

function RecipeModal({ open, onClose, recipe, onFav, isFav, onAddList }) {
  const ref = useRef(null)
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [open])
  if (!open || !recipe) return null
  const mediaUrl = recipe.mediaUrl || recipe.source?.url || ''
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div
        ref={ref}
        className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {canPlayInReactPlayer(mediaUrl) ? (
            <div className="aspect-video">
              <ReactPlayer url={mediaUrl} width="100%" height="100%" controls playing={false} />
            </div>
          ) : (
            <img src={recipe.image} className="h-64 w-full object-cover" alt="" />
          )}
          <button
            className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 hover:bg-stone-50"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-800">{recipe.title}</h3>
              <div className="mt-1 text-xs text-slate-600">
                ⏱ {recipe.time} min · {recipe.difficulty} · ⭐ {recipe.rating ?? '4.6'}
              </div>
              {recipe.source?.url && (
                <a
                  className="text-xs text-slate-600 underline decoration-amber-200 underline-offset-2 hover:text-amber-600"
                  href={recipe.source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View Source ↗
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <Button className="shadow" onClick={() => onFav(recipe.id)}>
                {isFav ? '★ Saved' : '☆ Save'}
              </Button>
              <Button className="shadow" onClick={() => onAddList(recipe)}>
                ＋ Ingredients
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <SectionTitle title="Ingredients" />
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {(recipe.ingredients || []).map((ing, i) => (
                  <li key={i}>
                    {ing.item}{' '}
                    {ing.amount ? <span className="text-slate-500">— {ing.amount}</span> : null}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <SectionTitle title="Steps" />
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
                {(recipe.steps || []).map((s, i) => (
                  <li key={i}>
                    {s.text}{' '}
                    {s.timerSec ? (
                      <span className="text-slate-500">({Math.round(s.timerSec / 60)} min)</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   PlannerPicker (used in week/month views)
   ========================================================= */
function PlannerPicker({ onPick, recipes }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-stone-200 bg-stone-50 p-2 text-left text-slate-600 hover:bg-stone-100"
      >
        + Add Recipe
      </button>
      {open && (
        <div className="absolute z-10 mt-2 max-h-64 w-80 overflow-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-lg">
          {recipes.map((r) => (
            <button
              key={r.id}
              className="flex w-full items-center gap-2 rounded-xl p-2 hover:bg-stone-50"
              onClick={() => {
                onPick(r)
                setOpen(false)
              }}
            >
              <img src={r.image} className="h-10 w-10 rounded-lg object-cover" />
              <div className="flex-1 text-left">
                <div className="line-clamp-1 text-slate-700">{r.title}</div>
                <div className="text-xs text-slate-500">
                  {r.time} min · {r.difficulty}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   Week + Month Planner with clearer week label & transitions
   ========================================================= */
function Planner({ planner, setPlanner, onOpen, recipes }) {
  const [view, setView] = useState('week')
  const [cursor, setCursor] = useState(new Date())
  const [navDir, setNavDir] = useState(0)

  const assign = (dateIso, meal, rec) => {
    setPlanner((cur) => {
      const next = { ...cur }
      next[dateIso] = next[dateIso] || {}
      next[dateIso][meal] = rec.id
      return next
    })
  }
  const removeAt = (dateIso, meal) => {
    setPlanner((cur) => {
      const next = { ...cur }
      if (next[dateIso]) {
        const row = { ...next[dateIso] }
        delete row[meal]
        next[dateIso] = row
      }
      return next
    })
  }

  const keyFor = () =>
    view === 'week'
      ? `week-${iso(startOfWeek(cursor))}`
      : `month-${cursor.getFullYear()}-${cursor.getMonth()}`
  const motionProps = {
    initial: { opacity: 0, x: navDir * 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -navDir * 30 },
    transition: { duration: 0.28, ease: 'easeOut' },
    key: keyFor(),
  }

  const weekLabel = `${getWeekDays(cursor)[0].toLocaleDateString()} – ${getWeekDays(cursor)[6].toLocaleDateString()}`
  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const weekView = () => {
    const days = getWeekDays(cursor)
    const todayIso = iso(new Date())
    return (
      <motion.div {...motionProps}>
        <div className="overflow-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr>
                <th className="p-2 text-left text-slate-600">Day</th>
                {MEALS.map((m) => (
                  <th key={m} className="p-2 text-left text-slate-600">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const dIso = iso(d)
                const isToday = dIso === todayIso
                return (
                  <tr
                    key={dIso}
                    className={cn('border-t border-stone-200', isToday && 'bg-amber-50/30')}
                  >
                    <td className="p-2 font-medium text-slate-700">
                      {d.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    {MEALS.map((m) => {
                      const recId = planner[dIso]?.[m]
                      const rec = recipes.find((r) => r.id === recId)
                      return (
                        <td key={m} className="p-2">
                          {rec ? (
                            <button
                              className="group flex w-full items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 hover:bg-stone-100"
                              onClick={() => onOpen(rec)}
                              title="Open"
                            >
                              <img src={rec.image} className="h-10 w-10 rounded-lg object-cover" />
                              <div className="flex-1 text-left">
                                <div className="line-clamp-1 text-slate-700">{rec.title}</div>
                                <div className="text-xs text-slate-500">
                                  {rec.time} min · {rec.difficulty}
                                </div>
                              </div>
                              <span
                                className="text-slate-400 opacity-0 transition group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeAt(dIso, m)
                                }}
                                title="Remove"
                              >
                                ✕
                              </span>
                            </button>
                          ) : (
                            <PlannerPicker recipes={recipes} onPick={(r) => assign(dIso, m, r)} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    )
  }

  const monthView = () => {
    const grid = getMonthGrid(cursor)
    const monthIdx = cursor.getMonth()
    return (
      <motion.div {...motionProps}>
        <div className="grid grid-cols-7 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="px-1 text-xs font-medium text-slate-500">
              {d}
            </div>
          ))}
          {grid.map((d) => {
            const dIso = iso(d)
            const isDim = d.getMonth() !== monthIdx
            return (
              <div
                key={dIso}
                className={cn(
                  'rounded-xl border p-2',
                  isDim ? 'border-stone-100 bg-stone-50' : 'border-stone-200 bg-white'
                )}
              >
                <div className={cn('mb-1 text-xs', isDim ? 'text-slate-400' : 'text-slate-600')}>
                  {d.getDate()}
                </div>
                <div className="space-y-1">
                  {MEALS.map((m) => {
                    const recId = planner[dIso]?.[m]
                    const rec = recipes.find((r) => r.id === recId)
                    return rec ? (
                      <button
                        key={m}
                        className="group flex w-full items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-1.5 hover:bg-stone-100"
                        onClick={() => onOpen(rec)}
                        title="Open"
                      >
                        <img src={rec.image} className="h-7 w-7 rounded-md object-cover" />
                        <div className="flex-1 text-left">
                          <div className="line-clamp-1 text-[11px] text-slate-700">
                            {m}: {rec.title}
                          </div>
                        </div>
                        <span
                          className="text-slate-400 opacity-0 transition group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeAt(dIso, m)
                          }}
                          title="Remove"
                        >
                          ✕
                        </span>
                      </button>
                    ) : (
                      <PlannerPicker key={m} recipes={recipes} onPick={(r) => assign(dIso, m, r)} />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    )
  }

  const go = (dir) => {
    setNavDir(dir)
    setCursor((c) => {
      const x = new Date(c)
      if (view === 'week') x.setDate(x.getDate() + dir * 7)
      else x.setMonth(x.getMonth() + dir)
      return x
    })
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-extrabold text-slate-800">
            {view === 'week' ? 'Weekly Meal Planner' : 'Monthly Meal Planner'}
          </h3>
          <span className="rounded-full bg-gradient-to-r from-amber-400 to-rose-500 px-3 py-1 text-xs font-semibold text-white shadow">
            {view === 'week' ? weekLabel : monthLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-stone-200 p-1">
            <button
              className={cn('rounded-xl px-3 py-1 text-sm', view === 'week' && 'bg-stone-100')}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button
              className={cn('rounded-xl px-3 py-1 text-sm', view === 'month' && 'bg-stone-100')}
              onClick={() => setView('month')}
            >
              Month
            </button>
          </div>
          <div className="rounded-2xl border border-stone-200">
            <button className="px-3 py-1" onClick={() => go(-1)}>
              ←
            </button>
            <button className="px-3 py-1" onClick={() => setCursor(new Date())}>
              Today
            </button>
            <button className="px-3 py-1" onClick={() => go(1)}>
              →
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        {view === 'week' ? weekView() : monthView()}
      </AnimatePresence>
    </Card>
  )
}

/* =========================================================
   Grocery list with recipe attribution
   ========================================================= */
function Grocery({ items, setItems, openRecipeById, recipes }) {
  // items: [{id,item,amount,recipeId,checked:false}]
  const grouped = useMemo(() => {
    const map = new Map()
    for (const it of items) {
      const k = it.recipeId || '_misc'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(it)
    }
    return Array.from(map.entries())
  }, [items])

  const toggle = (id) =>
    setItems((cur) => cur.map((x) => (x.id === id ? { ...x, checked: !x.checked } : x)))
  const remove = (id) => setItems((cur) => cur.filter((x) => x.id !== id))
  const clearChecked = () => setItems((cur) => cur.filter((x) => !x.checked))

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <SectionTitle title="Grocery List" subtitle="Grouped by recipe" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearChecked}>
            Clear checked
          </Button>
        </div>
      </div>
      <div className="space-y-5">
        {grouped.map(([rid, arr]) => {
          const rec = recipes.find((r) => r.id === rid)
          return (
            <div key={rid}>
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                <div className="h-9 w-9 overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                  {rec ? (
                    <img src={rec.image} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-xs">Misc</div>
                  )}
                </div>
                <button
                  className="text-left font-medium text-slate-800 underline decoration-amber-200 underline-offset-2"
                  onClick={() => rec && openRecipeById(rec.id)}
                >
                  {rec ? rec.title : 'Unassigned items'}
                </button>
              </div>
              <ul className="space-y-1">
                {arr.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-2"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-amber-500"
                        checked={!!it.checked}
                        onChange={() => toggle(it.id)}
                      />
                      <span
                        className={cn(
                          'text-slate-700',
                          it.checked && 'line-through text-slate-400'
                        )}
                      >
                        {it.item}
                        {it.amount ? <span className="text-slate-500"> — {it.amount}</span> : null}
                      </span>
                    </label>
                    <button
                      className="text-slate-400 hover:text-slate-600"
                      onClick={() => remove(it.id)}
                      title="Remove"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* =========================================================
   Discover list + Recipe card (with time slider)
   ========================================================= */
const MIN_TIME = 5,
  MAX_TIME = 120 // minutes
function sliderFillStyle(val, min = MIN_TIME, max = MAX_TIME) {
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100))
  return {
    background: `linear-gradient(to right, rgba(251,146,60,0.95) 0%, rgba(244,63,94,0.95) ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
  }
}

function RecipeCard({ r, onOpen, onFav, isFav, onAddList, onShare }) {
  return (
    <Card className="overflow-hidden">
      <img src={r.image} alt="" className="h-44 w-full object-cover" />
      <div className="p-3">
        <h4 className="line-clamp-2 font-semibold text-slate-800">{r.title}</h4>
        <div className="mt-1 text-xs text-slate-600">
          ⏱ {r.time} min · {r.difficulty} · ⭐ {r.rating ?? '4.6'}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <a
            className="text-xs text-slate-600 underline decoration-amber-200 underline-offset-2 hover:text-amber-700"
            href={r.source?.url || '#'}
            target="_blank"
            rel="noreferrer"
          >
            View Source ↗
          </a>
          <div className="flex gap-1.5">
            <Button
              className="shadow"
              onClick={(e) => {
                e.stopPropagation()
                onShare(r)
              }}
            >
              ↗ Share
            </Button>
            <Button
              className="shadow"
              onClick={(e) => {
                e.stopPropagation()
                onFav(r.id)
              }}
            >
              {isFav ? '★ Saved' : '☆ Save'}
            </Button>
            <Button
              className="shadow"
              onClick={(e) => {
                e.stopPropagation()
                onAddList(r)
              }}
            >
              ＋ Ingredients
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* =========================================================
   Main App
   ========================================================= */
export default function App() {
  /* ------------------------------- auth/session ------------------------------ */
  const [session, setSession] = useState(null)
  useEffect(() => {
    if (!supabaseReady) return // preview safe
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub?.subscription?.unsubscribe?.()
  }, [])

  /* ------------------------------- UI routing -------------------------------- */
  const TABS = ['discover', 'favorites', 'grocery', 'planner', 'connections']
  const [tab, setTab] = useLocal('flavr.tab', 'discover')
  const [settingsOpen, setSettingsOpen] = useState(false)

  /* ---------------------------------- data ---------------------------------- */
  const [recipes, setRecipes] = useLocal('flavr.recipes', SEED)
  const [favorites, setFavorites] = useLocal('flavr.favorites', []) // [recipeId]
  const [grocery, setGrocery] = useLocal('flavr.grocery', []) // [{id,item,amount,recipeId,checked}]
  const [planner, setPlanner] = useLocal('flavr.planner', {}) // { 'YYYY-MM-DD': {Breakfast:id,...} }
  const [profile, setProfile] = useLocal('flavr.profile', { name: '', avatar: '', bio: '' })

  /* -------------------------- Supabase user_state sync ----------------------- */
  async function ensureUserStateRow(uid) {
    if (!uid || !supabaseReady) return
    const { data: row } = await supabase
      .from('user_state')
      .select('user_id')
      .eq('user_id', uid)
      .single()
    if (!row) {
      await supabase
        .from('user_state')
        .insert({ user_id: uid, favorites: [], grocery: [], planner: {}, profile: {}, recipes: [] })
    }
  }
  async function loadUserState() {
    if (!session?.user?.id || !supabaseReady) return
    const uid = session.user.id
    const { data, error } = await supabase
      .from('user_state')
      .select('favorites,grocery,planner,profile,recipes')
      .eq('user_id', uid)
      .single()
    if (error || !data) return
    if (Array.isArray(data.recipes) && data.recipes.length)
      setRecipes((prev) => mergeRecipes(prev, data.recipes))
    if (Array.isArray(data.favorites)) setFavorites(data.favorites)
    if (data.grocery) setGrocery(data.grocery)
    if (data.planner) setPlanner(data.planner)
    if (data.profile) setProfile(data.profile)
  }
  useEffect(() => {
    if (session?.user?.id && supabaseReady) {
      ensureUserStateRow(session.user.id).then(loadUserState)
    }
  }, [session?.user?.id])
  useEffect(() => {
    // push changes
    const uid = session?.user?.id
    if (!uid || !supabaseReady) return
    const payload = { favorites, grocery, planner, profile, recipes }
    supabase
      .from('user_state')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('user_id', uid)
  }, [favorites, grocery, planner, profile, recipes, session?.user?.id])

  /* -------------------------------- discover -------------------------------- */
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('') // local draft to avoid focus glitches
  useEffect(() => {
    setDraft(query)
  }, [])
  const [timeMax, setTimeMax] = useLocal('flavr.timeMax', 45)
  const COLLECTOR =
    (typeof window !== 'undefined' && window.COLLECTOR_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_COLLECTOR_URL) ||
    'http://localhost:8080'

  function keyOf(r) {
    return (r.title || '') + '::' + (r.source?.url || '')
  }
  function mergeRecipes(a, b) {
    const map = new Map()
    ;[...a, ...b].forEach((x) => {
      map.set(keyOf(x), x)
    })
    return Array.from(map.values())
  }

  async function loadDiscoverFeed(customQ) {
    try {
      const q = typeof customQ === 'string' ? customQ : query
      const url = new URL(`${COLLECTOR}/discover`)
      if (q.trim()) url.searchParams.set('q', q.trim())
      url.searchParams.set('limit', '36')
      url.searchParams.set('maxTime', String(timeMax)) // hint for server; client also filters
      const res = await fetch(url.toString())
      const items = await res.json()
      setRecipes((prev) => mergeRecipes(prev, items))
    } catch (e) {
      console.warn('discover fetch failed', e)
    }
  }

  /* ------------------------------ favorites/grocery -------------------------- */
  const toggleFav = (id) =>
    setFavorites((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const addToList = (rec) => {
    const items = (rec.ingredients || []).map((it) => ({
      id: makeId(),
      item: it.item,
      amount: it.amount || '',
      recipeId: rec.id,
      checked: false,
    }))
    setGrocery((cur) => [...cur, ...items])
  }

  /* ------------------------------- open recipe ------------------------------- */
  const [modal, setModal] = useState({ open: false, recipe: null })
  const openRecipe = (r) => setModal({ open: true, recipe: r })
  const openRecipeById = (id) => {
    const r = recipes.find((x) => x.id === id)
    if (r) openRecipe(r)
  }

  /* --------------------------------- sharing -------------------------------- */
  const [share, setShare] = useState({ open: false, recipe: null })

  /* ----------------------------- deep link handler --------------------------- */
  useEffect(() => {
    const m = window.location.pathname.match(/^\/s\/(\w+)/)
    if (!m) return
    const token = m[1]
    if (!supabaseReady) return // preview: skip DB fetch
    supabase
      .from('shares')
      .select('*')
      .eq('token', token)
      .single()
      .then(({ data }) => {
        if (data?.recipe) {
          setModal({ open: true, recipe: data.recipe })
        }
      })
  }, [])

  /* --------------------------------- search UI ------------------------------- */
  function SearchFilters() {
    const ring = 'focus:outline-none focus:ring-2 focus:ring-stone-200'
    const sliderStyle = sliderFillStyle(timeMax)
    const inputRef = useRef(null)

    const onSubmit = (e) => {
      e.preventDefault()
      setQuery(draft)
      loadDiscoverFeed(draft)
      inputRef.current?.focus()
    }

    return (
      <form
        onSubmit={onSubmit}
        className="mb-4 grid gap-3 md:grid-cols-3"
        onClickCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="#hashtag, keyword…"
          autoComplete="off"
          onKeyDown={(e) => e.stopPropagation()}
          className={cn(
            'w-full rounded-2xl border border-stone-200 bg-stone-50 py-2.5 px-3 text-sm',
            ring
          )}
        />

        {/* Time slider */}
        <div className="rounded-2xl border border-stone-200 bg-white p-3">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
            <span>Max time</span>
            <span className="font-medium text-slate-800">≤ {timeMax} min</span>
          </div>
          <input
            type="range"
            min={MIN_TIME}
            max={MAX_TIME}
            step={5}
            value={timeMax}
            onChange={(e) => setTimeMax(parseInt(e.target.value, 10))}
            className="h-2 w-full appearance-none rounded-full outline-none"
            style={sliderStyle}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit">Search</Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setDraft('')
              setQuery('')
              setTimeMax(45)
              setRecipes(SEED)
            }}
          >
            Reset
          </Button>
        </div>
      </form>
    )
  }

  /* ---------------------------------- header -------------------------------- */
  function Header() {
    return (
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-400 to-rose-500 p-2 text-white shadow">
              🍽️
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-800">Flavr</div>
              <div className="-mt-1 text-[11px] uppercase tracking-wide text-amber-700">
                discover · cook · share
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {supabaseReady ? (
              session ? (
                <div className="text-xs text-slate-600">Signed in</div>
              ) : (
                <div className="text-xs text-slate-600">Guest</div>
              )
            ) : (
              <div className="text-xs text-slate-600">Preview mode</div>
            )}
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              Settings
            </Button>
          </div>
        </div>
      </header>
    )
  }

  /* ---------------------------------- views ---------------------------------- */
  function DiscoverView() {
    const filtered = useMemo(
      () => recipes.filter((r) => (typeof r.time === 'number' ? r.time <= timeMax : true)),
      [recipes, timeMax]
    )
    return (
      <div>
        <SearchFilters />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div key={keyOf(r)} onClick={() => openRecipe(r)} className="cursor-pointer">
              <RecipeCard
                r={r}
                onOpen={openRecipe}
                onFav={toggleFav}
                isFav={favorites.includes(r.id)}
                onAddList={addToList}
                onShare={(rec) => setShare({ open: true, recipe: rec })}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  function FavoritesView() {
    const favs = recipes.filter((r) => favorites.includes(r.id))
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {favs.map((r) => (
          <div key={r.id} onClick={() => openRecipe(r)} className="cursor-pointer">
            <RecipeCard
              r={r}
              onOpen={openRecipe}
              onFav={toggleFav}
              isFav={true}
              onAddList={addToList}
              onShare={(rec) => setShare({ open: true, recipe: rec })}
            />
          </div>
        ))}
        {!favs.length && (
          <Card className="p-6 text-center text-sm text-slate-500">No favorites yet.</Card>
        )}
      </div>
    )
  }

  function GroceryView() {
    return (
      <Grocery
        items={grocery}
        setItems={setGrocery}
        recipes={recipes}
        openRecipeById={openRecipeById}
      />
    )
  }

  function PlannerView() {
    return (
      <Planner planner={planner} setPlanner={setPlanner} onOpen={openRecipe} recipes={recipes} />
    )
  }

  function ConnectionsView() {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <SectionTitle title="Your Contacts" subtitle="(coming soon)" />
          <div className="text-sm text-slate-600">
            Add in-app contacts to share recipes directly.
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle title="Import from phone/email" subtitle="(coming soon)" />
          <div className="text-sm text-slate-600">
            We’ll pull names/emails (with your permission) to build your Flavr network.
          </div>
        </Card>
      </div>
    )
  }

  /* ---------------------------------- layout --------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-50 pb-20 md:pb-0">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="mb-4 hidden items-center gap-2 md:flex">
          {TABS.map((t) => (
            <button
              key={t}
              className={cn(
                'rounded-2xl px-4 py-2 text-sm',
                tab === t ? 'bg-stone-100' : 'hover:bg-stone-50'
              )}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'discover' && <DiscoverView />}
        {tab === 'favorites' && <FavoritesView />}
        {tab === 'grocery' && <GroceryView />}
        {tab === 'planner' && <PlannerView />}
        {tab === 'connections' && <ConnectionsView />}
      </main>

      {/* Bottom nav for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-3 py-2 text-xs">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-xl px-2 py-1',
                tab === t ? 'bg-stone-100' : 'hover:bg-stone-50'
              )}
            >
              {' '}
              {t[0].toUpperCase() + t.slice(1, 3)}{' '}
            </button>
          ))}
        </div>
      </nav>

      {/* Floating settings on mobile */}
      <button
        className="fixed bottom-16 right-4 z-50 rounded-full bg-white p-3 text-xl shadow-md ring-1 ring-stone-200 md:hidden"
        onClick={() => setSettingsOpen(true)}
        title="Settings"
      >
        ⚙️
      </button>

      {/* Modals */}
      <RecipeModal
        open={modal.open}
        onClose={() => setModal({ open: false, recipe: null })}
        recipe={modal.recipe}
        onFav={toggleFav}
        isFav={modal.recipe ? favorites.includes(modal.recipe.id) : false}
        onAddList={addToList}
      />
      <ShareModal
        open={share.open}
        onClose={() => setShare({ open: false, recipe: null })}
        recipe={share.recipe}
        session={session}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        session={session}
        profile={profile}
        setProfile={setProfile}
      />
    </div>
  )
}
