import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function ymd(d){ return new Date(d).toISOString().slice(0,10); }

export default function PlanModal({ open, onClose, recipe, onPlan }) {
  const today = useMemo(()=> ymd(new Date()), []);
  const [date, setDate] = useState(today);
  const [meal, setMeal] = useState("dinner");

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-x-4 top-[12%] z-[101] mx-auto max-w-md rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-orange-100"
        initial={{ y: 24, opacity: 0 }} animate={{ y:0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
      >
        <div className="mb-3 flex items-center gap-3">
          {recipe?.image && <img src={recipe.image} className="h-12 w-12 rounded-2xl object-cover ring-1 ring-orange-200" />}
          <div>
            <div className="text-sm text-slate-500">Plan this recipe</div>
            <div className="font-semibold text-slate-800">{recipe?.title || "Untitled recipe"}</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Date</div>
            <input type="date" className="w-full rounded-xl border border-orange-200 px-3 py-2"
                   value={date} onChange={(e)=>setDate(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="text-xs text-slate-500 mb-1">Meal</div>
            <select className="w-full rounded-xl border border-orange-200 px-3 py-2"
                    value={meal} onChange={(e)=>setMeal(e.target.value)}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm">Cancel</button>
          <button
            onClick={() => { onPlan({ date, meal }); onClose(); }}
            className="rounded-xl bg-gradient-to-tr from-flame-500 via-coral-500 to-rose-500 px-4 py-2 text-sm font-medium text-white shadow-soft"
          >
            Add to Planner
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
