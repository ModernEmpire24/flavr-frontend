import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function RecipeEditorModal({ open, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [image, setImage] = useState('')
  const [time, setTime] = useState(20)
  const [ingredients, setIngredients] = useState('') // one per line
  const [steps, setSteps] = useState('') // one per line

  if (!open) return null

  function save() {
    const recipe = {
      id: 'user_' + Date.now(),
      title: title || 'My recipe',
      image:
        image ||
        'https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1600&auto=format&fit=crop',
      time: Number(time) || 20,
      source: { platform: 'User', url: '' },
      ingredients: ingredients
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ item: s, amount: '' })),
      steps: steps
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => ({ text: s })),
    }
    onSave(recipe)
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-4 top-[8%] z-[101] mx-auto max-w-2xl rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-orange-100"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
      >
        <div className="mb-3">
          <div className="text-sm text-slate-500">Create your own recipe</div>
          <div className="text-lg font-semibold">Recipe builder</div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Title</div>
            <input
              className="w-full rounded-xl border border-orange-200 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Image URL</div>
            <input
              className="w-full rounded-xl border border-orange-200 px-3 py-2"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Time (minutes)</div>
            <input
              type="number"
              className="w-full rounded-xl border border-orange-200 px-3 py-2"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Ingredients (one per line)</div>
            <textarea
              className="h-40 w-full rounded-xl border border-orange-200 px-3 py-2"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Steps (one per line)</div>
            <textarea
              className="h-40 w-full rounded-xl border border-orange-200 px-3 py-2"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm">
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-xl bg-gradient-to-tr from-flame-500 via-coral-500 to-rose-500 px-4 py-2 text-sm font-medium text-white shadow-soft"
          >
            Save recipe
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
