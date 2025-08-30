import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const MEALS = ["breakfast", "lunch", "dinner"];
const MEAL_META = {
  breakfast: { label: "Breakfast", icon: "🍳" },
  lunch:     { label: "Lunch",     icon: "🥗" },
  dinner:    { label: "Dinner",    icon: "🍽️" },
};

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d) { return d.toISOString().slice(0, 10); }
function fmt(d) { return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }

export default function Planner({ planner, setPlanner, recipes }) {
  const [viewStart, setViewStart] = useState(startOfWeek(new Date()));
  const [weeksToShow, setWeeksToShow] = useState(2);

  // animation direction: -1 = to the left (Prev), +1 = to the right (Next)
  const [animDir, setAnimDir] = useState(0);

  const dateInputRef = useRef(null);
  const openDatePicker = () => {
    if (dateInputRef.current?.showPicker) dateInputRef.current.showPicker();
    else dateInputRef.current?.click();
  };
  const onPickDate = (e) => {
    const picked = startOfWeek(new Date(e.target.value));
    if (isNaN(picked)) return;
    setAnimDir(picked > viewStart ? 1 : -1);
    setViewStart(picked);
  };

  const recipeById = useMemo(
    () => Object.fromEntries(recipes.map(r => [r.id, r])),
    [recipes]
  );

  function setSlot(dateStr, meal, recipeId) {
    setPlanner(p => ({ ...p, [dateStr]: { ...(p[dateStr] || {}), [meal]: recipeId || null } }));
  }

  function WeekGrid({ weekStart }) {
    const days = [...Array(7)].map((_, i) => addDays(weekStart, i));
    return (
      <div className="mt-3 rounded-3xl border border-orange-100 bg-white shadow-sm">
        <div className="flex items-center justify-between rounded-t-3xl border-b border-orange-100 bg-gradient-to-tr from-orange-50 to-rose-50 px-4 py-3">
          <div className="text-sm font-semibold text-slate-700">Week of {fmt(weekStart)}</div>
        </div>

        <div className="grid grid-cols-8 gap-px rounded-b-3xl bg-orange-100">
          <div className="bg-white/80" />
          {days.map((d) => (
            <div key={+d} className="bg-white p-3 text-center">
              <div className="text-sm font-semibold text-slate-700">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div className="text-xs text-slate-500">{d.toLocaleDateString()}</div>
            </div>
          ))}

          {MEALS.map((meal) => (
            <React.Fragment key={meal}>
              <div className="bg-white p-3 text-right">
                <div className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700">
                  <span className="text-base">{MEAL_META[meal].icon}</span>
                  <span>{MEAL_META[meal].label}</span>
                </div>
              </div>

              {days.map((d) => {
                const dateStr = ymd(d);
                const chosenId = planner?.[dateStr]?.[meal] || null;
                const chosen = chosenId ? recipeById[chosenId] : null;

                return (
                  <div
                    key={dateStr + meal}
                    className="group relative bg-white p-3 min-h-[92px] md:min-h-[120px]"
                  >
                    {chosen ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={chosen.image}
                          alt=""
                          className="h-12 w-12 flex-none rounded-xl object-cover ring-1 ring-orange-200"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-800">
                            {chosen.title}
                          </div>
                          <div className="text-xs text-slate-500">⏱ {chosen.time || 20} min</div>
                        </div>
                        <button
                          onClick={() => setSlot(dateStr, meal, null)}
                          className="ml-auto rounded-xl border border-orange-200 px-2 py-1 text-xs text-slate-600 hover:bg-orange-50"
                          title="Clear"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <details className="h-full">
                        <summary className="flex h-full cursor-pointer list-none items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 p-2 text-slate-500 hover:bg-orange-50">
                          <span className="text-2xl mr-2">＋</span>
                          <span className="text-sm">Add recipe</span>
                        </summary>
                        <div className="mt-2 max-h-40 space-y-1 overflow-auto pr-1">
                          {recipes.length === 0 && (
                            <div className="rounded-lg border px-2 py-1 text-center text-xs text-slate-500">
                              No recipes yet — use Import on Discover
                            </div>
                          )}
                          {recipes.map((r) => (
                            <button
                              key={r.id}
                              className="flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left hover:bg-orange-50"
                              onClick={() => setSlot(dateStr, meal, r.id)}
                            >
                              <img src={r.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
                              <span className="truncate text-xs">{r.title}</span>
                              <span className="ml-auto whitespace-nowrap text-[11px] text-slate-500">
                                ⏱ {r.time || 20}m
                              </span>
                            </button>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // slide variants (like PowerPoint)
  const variants = {
    enter: (dir) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0, position: "absolute", top: 0, left: 0, width: "100%" }),
    center: { x: 0, opacity: 1, position: "relative" },
    exit: (dir) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0, position: "absolute", top: 0, left: 0, width: "100%" })
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={openDatePicker}
            className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-orange-50"
            title="Pick starting week"
          >
            📅 Choose week
          </button>
          <input ref={dateInputRef} type="date" className="hidden" onChange={onPickDate} />

          <label className="ml-2 text-sm text-slate-600">
            Show
            <select
              value={weeksToShow}
              onChange={(e) => setWeeksToShow(Number(e.target.value))}
              className="ml-2 rounded-xl border border-orange-200 bg-white px-2 py-1 text-sm"
            >
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} week{n>1 ? "s" : ""}</option>)}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-orange-50"
            onClick={() => { setAnimDir(-1); setViewStart(addDays(viewStart, -7 * weeksToShow)); }}
          >
            ◀ Prev
          </button>
          <button
            className="rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-orange-50"
            onClick={() => { setAnimDir(0); setViewStart(startOfWeek(new Date())); }}
          >
            This Week
          </button>
          <button
            className="rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-orange-50"
            onClick={() => { setAnimDir(1); setViewStart(addDays(viewStart, 7 * weeksToShow)); }}
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* Animated block of weeks */}
      <div
        className="relative overflow-hidden"
        style={{ minHeight: 360 * weeksToShow }} // keeps container height during slide
      >
        <AnimatePresence initial={false} custom={animDir} mode="wait">
          <motion.div
            key={viewStart.toISOString() + "-" + weeksToShow}
            custom={animDir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 400, damping: 35, mass: 0.8, duration: 0.35 }}
          >
            {[...Array(weeksToShow)].map((_, i) => (
              <WeekGrid key={i} weekStart={addDays(viewStart, i * 7)} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
