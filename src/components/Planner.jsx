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

// little helper to build a unique id for a cell
const cellId = (dateStr, meal) => `${dateStr}:${meal}`;

export default function Planner({ planner, setPlanner, recipes }) {
  const [viewStart, setViewStart] = useState(startOfWeek(new Date()));
  const [weeksToShow, setWeeksToShow] = useState(2);

  // animation direction: -1 ← Prev, +1 → Next
  const [animDir, setAnimDir] = useState(0);

  // for native HTML5 drag
  const [dragging, setDragging] = useState(null); // { recipeId, from: {dateStr, meal} }

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

  function moveSlot(from, to, recipeId) {
    if (!from || !to) return;
    setPlanner(p => {
      const next = { ...p };
      // clear old cell
      next[from.dateStr] = { ...(next[from.dateStr] || {}), [from.meal]: null };
      // set new cell
      next[to.dateStr] = { ...(next[to.dateStr] || {}), [to.meal]: recipeId };
      return next;
    });
  }

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? "16%" : "-16%", opacity: 0, scale: 0.98, position: "absolute", top: 0, left: 0, width: "100%" }),
    center: { x: 0, opacity: 1, scale: 1, position: "relative" },
    exit:  (dir) => ({ x: dir > 0 ? "-16%" : "16%", opacity: 0, scale: 0.98, position: "absolute", top: 0, left: 0, width: "100%" })
  };

  function WeekGrid({ weekStart }) {
    const days = [...Array(7)].map((_, i) => addDays(weekStart, i));

    // Cell renderer with animated content + native drag-and-drop
    const Cell = ({ date, meal }) => {
      const dateStr = ymd(date);
      const chosenId = planner?.[dateStr]?.[meal] || null;
      const chosen = chosenId ? recipeById[chosenId] : null;

      // drag handlers
      const onDragStart = (e) => {
        if (!chosenId) return e.preventDefault();
        setDragging({ recipeId: chosenId, from: { dateStr, meal } });
        e.dataTransfer.setData("text/plain", JSON.stringify({ recipeId: chosenId, from: { dateStr, meal } }));
        e.dataTransfer.effectAllowed = "move";
      };
      const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
      const onDrop = (e) => {
        e.preventDefault();
        const txt = e.dataTransfer.getData("text/plain");
        if (!txt) return;
        try {
          const data = JSON.parse(txt);
          // if dropping into same cell, do nothing
          if (data.from.dateStr === dateStr && data.from.meal === meal) return;
          moveSlot(data.from, { dateStr, meal }, data.recipeId);
        } finally {
          setDragging(null);
        }
      };
      const onDragEnd = () => setDragging(null);

      return (
        <div
          onDragOver={onDragOver}
          onDrop={onDrop}
          className={[
            "relative bg-white p-3 min-h-[110px] md:min-h-[130px]",
            "transition-colors",
            dragging ? "outline outline-2 outline-dashed outline-flame-300" : ""
          ].join(" ")}
        >
          <AnimatePresence mode="popLayout">
            {chosen ? (
              <motion.div
                key={chosenId}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.8 }}
                className="flex items-center gap-3"
                draggable
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                title="Drag to another cell"
              >
                <img
                  src={chosen.image}
                  alt=""
                  className="h-14 w-14 flex-none rounded-2xl object-cover ring-2 ring-flame-100 shadow-soft"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800">{chosen.title}</div>
                  <div className="text-xs text-slate-500">⏱ {chosen.time || 20} min</div>
                </div>
                <button
                  onClick={() => setSlot(dateStr, meal, null)}
                  className="ml-auto rounded-xl border border-orange-200 px-2 py-1 text-xs text-slate-600 hover:bg-orange-50"
                >
                  Clear
                </button>
              </motion.div>
            ) : (
              <motion.details
                key="empty"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="h-full"
              >
                <summary className="flex h-full cursor-pointer list-none items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-2 text-slate-600 hover:bg-orange-50">
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
                      <span className="ml-auto whitespace-nowrap text-[11px] text-slate-500">⏱ {r.time || 20}m</span>
                    </button>
                  ))}
                </div>
              </motion.details>
            )}
          </AnimatePresence>

          {/* meal chip */}
          <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-xl bg-white/90 px-2 py-1 text-[11px] text-orange-700 ring-1 ring-orange-200">
            <span>{MEAL_META[meal].icon}</span>
            <span>{MEAL_META[meal].label}</span>
          </div>
        </div>
      );
    };

    return (
      <div className="mt-3 rounded-3xl border border-orange-100 bg-white shadow-sm shadow-soft">
        {/* Week header */}
        <div className="flex items-center justify-between rounded-t-3xl border-b border-orange-100 bg-gradient-to-tr from-flame-50 to-coral-50 px-4 py-3">
          <div className="text-sm font-semibold text-slate-700">Week of {fmt(weekStart)}</div>
        </div>

        {/* Day grid */}
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
                <div className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
                  <span className="text-base">{MEAL_META[meal].icon}</span>
                  <span>{MEAL_META[meal].label}</span>
                </div>
              </div>

              {days.map((d) => (
                <Cell key={ymd(d) + meal} date={d} meal={meal} />
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  // slide/fade container for multi-week view
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={openDatePicker}
            className="inline-flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 shadow-soft"
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
            className="rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 shadow-soft"
            onClick={() => { setAnimDir(-1); setViewStart(addDays(viewStart, -7 * weeksToShow)); }}
          >
            ◀ Prev
          </button>
          <button
            className="rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 shadow-soft"
            onClick={() => { setAnimDir(0); setViewStart(startOfWeek(new Date())); }}
          >
            This Week
          </button>
          <button
            className="rounded-2xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-orange-50 shadow-soft"
            onClick={() => { setAnimDir(1); setViewStart(addDays(viewStart, 7 * weeksToShow)); }}
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* Animated block of weeks */}
      <div className="relative overflow-hidden" style={{ minHeight: 380 * weeksToShow }}>
        <AnimatePresence initial={false} custom={animDir} mode="wait">
          <motion.div
            key={viewStart.toISOString() + "-" + weeksToShow}
            custom={animDir}
            variants={{
              enter: (dir) => ({ x: dir > 0 ? "20%" : "-20%", opacity: 0, scale: 0.98, position: "absolute", top: 0, left: 0, width: "100%" }),
              center: { x: 0, opacity: 1, scale: 1, position: "relative" },
              exit:  (dir) => ({ x: dir > 0 ? "-20%" : "20%", opacity: 0, scale: 0.98, position: "absolute", top: 0, left: 0, width: "100%" })
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.9, duration: 0.35 }}
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
