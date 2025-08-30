import React, { useMemo, useState } from "react";

const MEALS = ["breakfast", "lunch", "dinner"];
const mealLabels = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

function startOfWeek(d = new Date()) {
  const x = new Date(d); const day = (x.getDay()+6)%7; // Mon=0
  x.setDate(x.getDate() - day); x.setHours(0,0,0,0);
  return x;
}
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function ymd(d){ return d.toISOString().slice(0,10); }

export default function Planner({ planner, setPlanner, recipes }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset*7), [weekOffset]);
  const days = [...Array(7)].map((_,i)=> addDays(weekStart,i));
  const idx = Object.fromEntries(recipes.map(r=>[r.id,r]));

  function setSlot(dateStr, meal, recipeId){
    setPlanner(p => ({ ...p, [dateStr]: { ...(p[dateStr]||{}), [meal]: recipeId || null } }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Meal Planner</div>
        <div className="flex gap-2">
          <button className="rounded-xl border px-3 py-1" onClick={()=>setWeekOffset(o=>o-1)}>◀ Prev</button>
          <button className="rounded-xl border px-3 py-1" onClick={()=>setWeekOffset(0)}>This Week</button>
          <button className="rounded-xl border px-3 py-1" onClick={()=>setWeekOffset(o=>o+1)}>Next ▶</button>
        </div>
      </div>

      <div className="grid grid-cols-8 gap-2">
        <div></div>
        {days.map(d => (
          <div key={d} className="text-center text-sm font-medium text-slate-700">
            {d.toLocaleDateString(undefined,{weekday:"short"})}<br/>
            <span className="text-xs text-slate-500">{d.toLocaleDateString()}</span>
          </div>
        ))}

        {MEALS.map(meal => (
          <React.Fragment key={meal}>
            <div className="text-right pr-2 text-sm font-medium text-slate-600">{mealLabels[meal]}</div>
            {days.map(d=>{
              const dateStr = ymd(d);
              const chosenId = planner?.[dateStr]?.[meal] || null;
              const chosen = chosenId ? idx[chosenId] : null;
              return (
                <div key={dateStr+meal} className="rounded-2xl border border-orange-100 bg-white p-2 text-xs">
                  {chosen ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate">{chosen.title}</div>
                      <button className="rounded-lg border px-2 py-0.5 text-[11px]" onClick={()=>setSlot(dateStr, meal, null)}>Clear</button>
                    </div>
                  ) : (
                    <details>
                      <summary className="cursor-pointer list-none text-slate-500">+ Add</summary>
                      <div className="mt-1 max-h-40 space-y-1 overflow-auto pr-1">
                        {recipes.map(r=>(
                          <button key={r.id} className="block w-full rounded-lg border px-2 py-1 text-left hover:bg-orange-50"
                                  onClick={()=>setSlot(dateStr, meal, r.id)}>
                            {r.title}
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
