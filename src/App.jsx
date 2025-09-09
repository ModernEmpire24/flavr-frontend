import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";

/* =========================================================================
   Flavr – full app in one file
   - Bottom mobile nav + floating Settings cog
   - Profile & Settings (dietary tags, custom links)
   - Social Connections (simulated OAuth)
   - Discover, Favorites, Planner, Grocery, Connections
   - Import panel calling your collector (VITE_COLLECTOR_URL)
   - Inline video playback (YouTube/Vimeo/Facebook/Twitch/DailyMotion/MP4,
     plus Instagram/TikTok/Twitter via official embeds)
   Tailwind is expected in index.html via:
     <script src="https://cdn.tailwindcss.com"></script>
   ======================================================================= */

/* --------------------------- Helpers & Persistence --------------------------- */
function useLocal(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

/* Returns a video link if this recipe has one (covers most platforms & file types) */
function getPlayableUrl(recipe) {
  if (!recipe) return null;

  const tryUrls = [
    recipe.videoUrl,
    recipe?.source?.url,
    recipe?.sourceLink,
  ].filter(Boolean);

  const isVideoish = (url) => {
    const u = url.toLowerCase();
    return (
      u.includes("youtube.com") || u.includes("youtu.be") ||
      u.includes("vimeo.com") ||
      u.includes("facebook.com") || u.includes("fb.watch") ||
      u.includes("twitch.tv") || u.includes("dailymotion.com") ||
      u.includes("instagram.com") || u.includes("tiktok.com") ||
      u.includes("twitter.com") || u.includes("x.com") ||
      u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".m3u8")
    );
  };

  return tryUrls.find(isVideoish) || null;
}

const ring =
  "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2";
const grad = "bg-gradient-to-tr from-orange-400 via-orange-500 to-rose-500";

/* -------------------------------- Seed Data -------------------------------- */
const SEED = [
  {
    id: "r1",
    title: "Crispy Chili Garlic Noodles",
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1600&auto=format&fit=crop",
    time: 20,
    difficulty: "Easy",
    rating: 4.8,
    calories: 520,
    cuisine: "Asian",
    dietTags: ["Vegetarian"],
    source: {
      platform: "YouTube",
      handle: "@wokwithme",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    ingredients: [
      { item: "Egg noodles", amount: "8 oz" },
      { item: "Garlic", amount: "6 cloves" },
      { item: "Chili crisp", amount: "2 tbsp" },
      { item: "Soy sauce", amount: "1.5 tbsp" },
      { item: "Green onions", amount: "2" },
    ],
    steps: [
      { text: "Boil noodles until al dente.", timerSec: 480 },
      { text: "Sizzle garlic in oil, stir in chili crisp.", timerSec: 120 },
      { text: "Toss noodles with soy sauce and aromatics.", timerSec: 60 },
    ],
    tags: ["30-min", "weeknight"],
    saves: 2310,
  },
  {
    id: "r2",
    title: "Smoky Sheet-Pan Salmon & Veggies",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop",
    time: 25,
    difficulty: "Easy",
    rating: 4.7,
    calories: 610,
    cuisine: "American",
    dietTags: ["Pescatarian", "Gluten-Free"],
    source: {
      platform: "Instagram",
      handle: "@top.pins",
      url: "https://www.instagram.com/p/CuXXXXXXX/", // example public post
    },
    ingredients: [
      { item: "Salmon fillets", amount: "2" },
      { item: "Broccoli florets", amount: "3 cups" },
      { item: "Sweet potato", amount: "1 large" },
      { item: "Smoked paprika", amount: "1 tsp" },
      { item: "Olive oil", amount: "2 tbsp" },
      { item: "Salt & pepper", amount: "to taste" },
    ],
    steps: [
      { text: "Preheat oven to 425°F / 220°C.", timerSec: 0 },
      { text: "Roast veggies 12 min.", timerSec: 720 },
      { text: "Add salmon, roast 10–12 min.", timerSec: 720 },
    ],
    tags: ["sheet-pan", "meal-prep"],
    saves: 4220,
  },
  {
    id: "r3",
    title: "One-Pot Creamy Tomato Basil Pasta",
    image:
      "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1600&auto=format&fit=crop",
    time: 18,
    difficulty: "Easy",
    rating: 4.5,
    calories: 670,
    cuisine: "Italian",
    dietTags: ["Vegetarian"],
    source: {
      platform: "TikTok",
      handle: "@quickmeals",
      url: "https://www.tiktok.com/@scottxxxxx/video/7xxxxxxxxxx",
    },
    ingredients: [
      { item: "Penne", amount: "10 oz" },
      { item: "Tomato passata", amount: "1.5 cups" },
      { item: "Cream", amount: "1/2 cup" },
      { item: "Basil", amount: "1/2 cup" },
      { item: "Parmesan", amount: "1/3 cup" },
      { item: "Garlic", amount: "3 cloves" },
    ],
    steps: [
      { text: "Simmer sauce base 3–4 min.", timerSec: 240 },
      { text: "Add pasta + water; cook until tender.", timerSec: 720 },
      { text: "Stir in cream, basil, cheese.", timerSec: 60 },
    ],
    tags: ["one-pot", "comfort"],
    saves: 3125,
  },
];

/* ---------------------------------- Tabs ---------------------------------- */
const TABS = [
  { key: "discover", label: "Discover", icon: "🏠" },
  { key: "favorites", label: "Favorites", icon: "♥" },
  { key: "planner", label: "Planner", icon: "📅" },
  { key: "grocery", label: "Grocery", icon: "🧾" },
  { key: "connections", label: "Connections", icon: "🔗" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

/* --------------------------------- Primitives -------------------------------- */
function Button({ children, onClick, variant = "solid", className = "", disabled }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition active:scale-[.98] " +
    ring;
  const variants = {
    solid: `${grad} text-white shadow-sm hover:shadow-md`,
    soft: `bg-orange-100 text-orange-700 hover:bg-orange-200`,
    outline: `border border-orange-300 text-orange-700 hover:bg-orange-50`,
    ghost: `text-orange-700 hover:bg-orange-50`,
  };
  return (
    <button onClick={onClick} className={[base, variants[variant], className].join(" ")} disabled={disabled}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={["rounded-3xl border border-orange-100 bg-white shadow-sm", className].join(" ")}>{children}</div>;
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
    </div>
  );
}

/* ------------------------------- Search/Filters ------------------------------ */
function SearchFilters({ query, setQuery, timeMax, setTimeMax }) {
  const inputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes, ingredients… (Press / to focus)"
            className={"w-full rounded-2xl border border-orange-200 bg-white py-2.5 px-3 text-sm " + ring}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Time (max)</div>
            <input
              type="range"
              min={10}
              max={90}
              value={timeMax}
              onChange={(e) => setTimeMax(parseInt(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="text-xs text-slate-500">
              Up to <span className="font-medium text-slate-700">{timeMax} min</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Quick Filters</div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">#sheet-pan</span>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">#30-minutes</span>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">#one-pot</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Tip</div>
            <div className="text-xs text-slate-600">
              Import recipes from blogs & social, then plan meals and build a grocery list.
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------- Media Player --------------------------------
   - ReactPlayer handles: YouTube, Vimeo, Facebook, Twitch, DailyMotion, MP4/WebM/HLS
   - For Instagram/TikTok/Twitter we load official embed scripts
   ----------------------------------------------------------------------------- */
function Scripted({ src, onload }) {
  useEffect(() => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    if (onload) s.onload = onload;
    document.body.appendChild(s);
    return () => {
      try {
        document.body.removeChild(s);
      } catch {}
    };
  }, [src, onload]);
  return null;
}
function InstagramEmbed({ url }) {
  return (
    <div>
      <Scripted src="https://www.instagram.com/embed.js" onload={() => window.instgrm?.Embeds?.process()} />
      <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14" />
    </div>
  );
}
function TikTokEmbed({ url }) {
  return (
    <div>
      <Scripted src="https://www.tiktok.com/embed.js" />
      <blockquote className="tiktok-embed" cite={url} style={{ maxWidth: 605, minWidth: 325 }} />
      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
        Open on TikTok ↗
      </a>
    </div>
  );
}
function TwitterEmbed({ url }) {
  return (
    <div>
      <Scripted src="https://platform.twitter.com/widgets.js" />
      <blockquote className="twitter-tweet">
        <a href={url}></a>
      </blockquote>
    </div>
  );
}

function MediaPlayer({ url }) {
  if (!url) return null;
  const u = url.toLowerCase();

  if (u.includes("instagram.com")) return <InstagramEmbed url={url} />;
  if (u.includes("tiktok.com")) return <TikTokEmbed url={url} />;
  if (u.includes("twitter.com") || u.includes("x.com")) return <TwitterEmbed url={url} />;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "16 / 9" }}>
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        controls
        playsinline
        config={{ file: { attributes: { playsInline: true } } }}
      />
    </div>
  );
}

/* --------------------------- Import Panel (collector) --------------------------- */
function ImportPanel({ onImported }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const COLLECTOR =
    (typeof window !== "undefined" && window.COLLECTOR_URL) ||
    import.meta.env?.VITE_COLLECTOR_URL ||
    "http://localhost:8080";

  const handle = async () => {
    if (!url) return;
    try {
      setLoading(true);
      setStatus("Importing…");

      const res = await fetch(`${COLLECTOR}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Import failed: " + res.status);
      const incoming = await res.json();

      const toInt = (s) => {
        if (s == null) return null;
        const m = String(s).match(/\d+/);
        return m ? parseInt(m[0], 10) : null;
      };

      const newRecipe = {
        id: `imp_${Date.now()}`,
        title: incoming.title || "Imported Recipe",
        image:
          incoming.image ||
          "https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1600&auto=format&fit=crop",
        time: incoming.timeMinutes ?? 30,
        difficulty: "Easy",
        rating: 0,
        calories: toInt(incoming?.nutrition?.calories),
        cuisine: "Imported",
        dietTags: [],
        source: {
          platform: incoming?.sourcePlatform || "Source",
          handle: incoming?.author || "",
          url: incoming?.sourceLink || url,
        },
        ingredients: (incoming.ingredients || []).map((s) => ({ item: s, amount: "" })),
        steps: (incoming.steps || []).map((s) => ({ text: s, timerSec: 0 })),
        tags: ["imported"],
        saves: 0,
      };

      onImported && onImported(newRecipe);
      setStatus("Imported: " + newRecipe.title);
      setUrl("");
    } catch (e) {
      setStatus("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <SectionTitle title="Import recipe from a link" subtitle="Calls your collector" />
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a recipe URL"
          className={"flex-1 rounded-2xl border border-orange-200 px-3 py-2 text-sm " + ring}
        />
        <Button onClick={handle} disabled={loading}>
          {loading ? "Importing…" : "Import"}
        </Button>
      </div>
      {status && <div className="mt-2 text-xs text-slate-500">{status}</div>}
    </Card>
  );
}

/* --------------------------- Recipe Card & Modal --------------------------- */
function RecipeCard({ r, onOpen, onFav, isFav, onAddList }) {
  return (
    <Card className="overflow-hidden transition hover:shadow-md">
      <div className="relative" onClick={() => onOpen(r)}>
        {getPlayableUrl(r) && (
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2 py-1 text-[11px] text-white">
            ▶ video
          </span>
        )}
        <img src={r.image} alt={r.title} className="h-44 w-full cursor-pointer object-cover" />
        <button
          className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-700 hover:bg-white"
          onClick={(e) => {
            e.stopPropagation();
            onFav(r.id);
          }}
        >
          {isFav ? "♥ Saved" : "♡ Save"}
        </button>
      </div>
      <div className="p-4">
        <h4
          className="line-clamp-2 cursor-pointer font-semibold text-slate-800 underline decoration-orange-300 underline-offset-2"
          onClick={() => onOpen(r)}
          title="Open"
        >
          {r.title}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>⏱ {r.time} min</span>
          <span>👨‍🍳 {r.difficulty}</span>
          <span>🏷 {r.cuisine}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
  <a
    href={r.source?.url}
    target="_blank"
    rel="noreferrer"
    className="text-xs text-slate-500 underline decoration-orange-300 underline-offset-2 hover:text-orange-600"
    onClick={(e) => e.stopPropagation()}
  >
    View Source ↗
  </a>
  <div className="flex gap-2">
    <Button
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        onFav(r.id);              // Save entire recipe to Favorites (by id)
      }}
    >
      Save to Favorites
    </Button>
    <Button
      variant="soft"
      onClick={(e) => {
        e.stopPropagation();
        onAddList(r);             // Add all ingredients to Grocery
      }}
    >
      Add Ingredients
    </Button>
  </div>
</div>
      </div>
    </Card>
  );
}

function RecipeModal({ open, onClose, recipe }) {
  if (!open || !recipe) return null;

  const playable = getPlayableUrl(recipe);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER: video if available, otherwise image */}
        {playable ? (
  <div className="relative p-4">
    <button className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow" onClick={onClose}>✕</button>
    <MediaPlayer url={playable} />
  </div>
) : (
  <div className="relative">
    <img src={recipe.image} alt={recipe.title} className="h-56 w-full rounded-t-3xl object-cover" />
    <button className="absolute right-4 top-4 rounded-full bg-white p-2 shadow" onClick={onClose}>✕</button>
  </div>
)}

{/* NEW: quick actions in modal */}
<div className="flex items-center justify-end gap-2 px-6 pt-2">
  <Button variant="outline" onClick={() => toggleFav(recipe.id)}>
    { /* you can’t access toggleFav here directly unless you pass it in;
         simplest: show text and let user save from card too. If you want it here: 
         pass toggleFav down via props OR lift to context. For now, keep Add Ingredients here. */ }
    Save to Favorites
  </Button>
  <Button variant="soft" onClick={() => addToList(recipe)}>
    Add Ingredients
  </Button>
</div>

        {/* BODY */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-800">{recipe.title}</h2>
          <div className="mt-1 flex flex-wrap gap-3 text-sm text-slate-500">
            <span>⏱ {recipe.time} min</span>
            <span>👨‍🍳 {recipe.difficulty}</span>
            <span>🏷 {recipe.cuisine}</span>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Card className="p-4">
              <SectionTitle title="Ingredients" />
              <ul className="space-y-2 text-sm">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="text-slate-700">{ing.item}</span>
                    <span className="text-slate-400">{ing.amount}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-4">
              <SectionTitle title="Steps" />
              <ol className="space-y-2 text-sm">
                {recipe.steps.map((s, i) => (
                  <li key={i} className="rounded-xl border border-orange-100 p-2">
                    Step {i + 1}: {s.text}
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <div className="mt-6 text-right">
            <a
              href={recipe.source?.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-slate-600 underline decoration-orange-300 underline-offset-2 hover:text-orange-600"
            >
              View Source ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Grocery -------------------------------- */
function GroceryList({ list, setList }) {
  const toggle = (i) => setList((cur) => cur.map((it, idx) => (idx === i ? { ...it, done: !it.done } : it)));
  const remove = (i) => setList((cur) => cur.filter((_, idx) => idx !== i));
  const clear = () => setList([]);
  return (
    <Card className="h-full p-4">
      <SectionTitle title="Grocery List" subtitle={`${list.length} item${list.length !== 1 ? "s" : ""}`} />
      <div className="max-h-64 space-y-2 overflow-auto pr-2">
        {list.length === 0 && <div className="text-sm text-slate-500">Empty. Add ingredients from a recipe.</div>}
        {list.map((it, i) => (
  <div key={i} className="rounded-xl border border-orange-100 px-3 py-2 text-sm">
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={it.done}
          onChange={() => toggle(i)}
          className="accent-orange-600"
        />
        <span className={[it.done && "line-through text-slate-400"].filter(Boolean).join(" ")}>
          {it.item}
        </span>
        {it.amount && <span className="text-slate-400">· {it.amount}</span>}
      </label>
      <button onClick={() => remove(i)} className="text-slate-400 hover:text-rose-500">✕</button>
    </div>

    {/* NEW: attribution line */}
    <div className="ml-7 mt-1 text-[11px] text-slate-400">
      ↳ {it.recipeTitle || "manual / older item"}
    </div>
  </div>
))}
      </div>
      {list.length > 0 && (
        <Button variant="outline" className="mt-3 w-full" onClick={clear}>
          Clear List
        </Button>
      )}
    </Card>
  );
}

/* -------------------------------- Planner -------------------------------- */
function Planner({ planner, setPlanner, onOpen, recipes }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const meals = ["Breakfast", "Lunch", "Dinner"];

  const assign = (d, m, rec) => {
    setPlanner((cur) => {
      const next = { ...cur };
      next[d] = next[d] || {};
      next[d][m] = rec.id;
      return next;
    });
  };

  return (
    <Card className="p-4">
      <SectionTitle title="Weekly Meal Planner" />
      <div className="overflow-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-slate-500">Day</th>
              {meals.map((m) => (
                <th key={m} className="p-2 text-left text-slate-500">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d} className="border-t">
                <td className="p-2 font-medium text-slate-700">{d}</td>
                {meals.map((m) => {
                  const recId = planner[d]?.[m];
                  const rec = recipes.find((r) => r.id === recId);
                  return (
                    <td key={m} className="p-2">
                      {rec ? (
                        <button
                          className="group flex w-full items-center gap-2 rounded-xl border border-orange-100 p-2 hover:bg-orange-50"
                          onClick={() => onOpen(rec)}
                        >
                          <img src={rec.image} className="h-10 w-10 rounded-lg object-cover" />
                          <div className="flex-1 text-left">
                            <div className="line-clamp-1 text-slate-700">{rec.title}</div>
                            <div className="text-xs text-slate-400">
                              {rec.time} min · {rec.difficulty}
                            </div>
                          </div>
                          <span className="text-slate-400 opacity-0 group-hover:opacity-100">✕</span>
                        </button>
                      ) : (
                        <PlannerPicker recipes={recipes} onPick={(r) => assign(d, m, r)} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
function PlannerPicker({ onPick, recipes }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-orange-200 p-2 text-left text-slate-500 hover:bg-orange-50"
      >
        + Add Recipe
      </button>
      {open && (
        <div className="absolute z-10 mt-2 max-h-64 w-72 overflow-auto rounded-2xl border border-orange-100 bg-white p-2 shadow-lg">
          {recipes.map((r) => (
            <button
              key={r.id}
              className="flex w-full items-center gap-2 rounded-xl p-2 hover:bg-orange-50"
              onClick={() => {
                onPick(r);
                setOpen(false);
              }}
            >
              <img src={r.image} className="h-10 w-10 rounded-lg object-cover" />
              <div className="flex-1 text-left">
                <div className="line-clamp-1 text-slate-700">{r.title}</div>
                <div className="text-xs text-slate-400">
                  {r.time} min · {r.difficulty}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------- Social Connections --------------------------- */
const PROVIDERS = [
  { key: "pinterest", name: "Pinterest", hint: "Pins & recipe cards" },
  { key: "instagram", name: "Instagram", hint: "Reels & carousels" },
  { key: "facebook", name: "Facebook", hint: "Page posts" },
  { key: "twitter", name: "X (Twitter)", hint: "Threads" },
  { key: "tiktok", name: "TikTok", hint: "Short videos" },
  { key: "youtube", name: "YouTube", hint: "Long-form" },
];

function SocialConnector({ provider, state, onChange }) {
  const connected = !!state?.connected;
  const handleConnect = () => {
    const handle = prompt(`Enter your ${provider.name} handle (preview simulates OAuth):`, "@username");
    onChange({ connected: true, handle: handle || "@connected", scopes: ["public"] });
  };
  const handleDisconnect = () => onChange({ connected: false });
  return (
    <div className="flex items-center justify-between rounded-2xl border border-orange-100 p-3">
      <div>
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-slate-300"}`} />
          {provider.name}
        </div>
        <div className="text-xs text-slate-500">
          {connected ? `Connected as ${state?.handle || "@connected"}` : provider.hint}
        </div>
      </div>
      {connected ? (
        <Button variant="outline" onClick={handleDisconnect}>
          Disconnect
        </Button>
      ) : (
        <Button variant="soft" onClick={handleConnect}>
          Connect
        </Button>
      )}
    </div>
  );
}

function ConnectionsPage({ connections, setConnections, onImported }) {
  const setProv = (key, patch) =>
    setConnections((cur) => ({ ...cur, [key]: { ...(cur[key] || {}), ...patch } }));

  const simulateSync = () => {
    const active =
      Object.entries(connections)
        .filter(([_, v]) => v?.connected)
        .map(([k]) => k)
        .join(", ") || "connections";
    const demo = {
      id: `sync_${Date.now()}`,
      title: `(Preview) Synced recipe from ${active}`,
      image:
        "https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1600&auto=format&fit=crop",
      time: 30,
      difficulty: "Easy",
      rating: 0,
      calories: null,
      cuisine: "Imported",
      dietTags: [],
      source: { platform: "Social", handle: "@flavr", url: "#" },
      ingredients: [{ item: "Example ingredient", amount: "" }],
      steps: [{ text: "Example step", timerSec: 0 }],
      tags: ["imported"],
      saves: 0,
    };
    onImported && onImported(demo);
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <Card className="p-4">
          <SectionTitle title="Connect your social accounts" subtitle="Pinterest, Instagram, Facebook, X, TikTok, YouTube" />
          <div className="grid gap-3 md:grid-cols-2">
            {PROVIDERS.map((p) => (
              <SocialConnector
                key={p.key}
                provider={p}
                state={connections[p.key]}
                onChange={(patch) => setProv(p.key, patch)}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={simulateSync}>Simulate Sync & Add Sample Recipe</Button>
            <Button variant="outline" onClick={() => setConnections({})}>
              Clear Connections
            </Button>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Preview only: Connect simulates OAuth and stores status in your browser. In production it opens each
            provider’s consent screen.
          </div>
        </Card>
      </div>
      <div className="space-y-6 lg:col-span-4">
        <ImportPanel onImported={onImported} />
      </div>
    </div>
  );
}

/* --------------------------- Settings & Profile --------------------------- */
function SettingsPage({ profile, setProfile, connections, setConnections, onImported }) {
  const [draft, setDraft] = useState(profile || { name: "", email: "", avatar: "", dietary: [], links: [] });
  const [newLink, setNewLink] = useState({ label: "", url: "" });
  useEffect(() => setDraft(profile || { name: "", email: "", avatar: "", dietary: [], links: [] }), [profile]);

  const saveProfile = () => setProfile(draft);
  const addLink = () => {
    if (!newLink.label || !newLink.url) return;
    setDraft((d) => ({ ...d, links: [...(d.links || []), newLink] }));
    setNewLink({ label: "", url: "" });
  };
  const removeLink = (idx) => setDraft((d) => ({ ...d, links: (d.links || []).filter((_, i) => i !== idx) }));

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-8">
        <Card className="p-4">
          <SectionTitle title="Your Profile" subtitle="Create or edit your Flavr profile" />
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Display name</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm " + ring}
                placeholder="e.g., Kiava"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Email</label>
              <input
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm " + ring}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Avatar URL</label>
              <input
                value={draft.avatar}
                onChange={(e) => setDraft({ ...draft, avatar: e.target.value })}
                className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm " + ring}
                placeholder="https://…"
              />
              <div className="text-xs text-slate-400">Tip: Use a square image.</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">Dietary tags (comma-separated)</label>
              <input
                value={(draft.dietary || []).join(", ")}
                onChange={(e) =>
                  setDraft({ ...draft, dietary: e.target.value.split(/\s*,\s*/).filter(Boolean) })
                }
                className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm " + ring}
                placeholder="Vegetarian, Gluten-Free"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={saveProfile}>Save Profile</Button>
            <Button variant="outline" onClick={() => setProfile({ name: "", email: "", avatar: "", dietary: [], links: [] })}>
              Reset
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle title="Custom Links" subtitle="Add any links you want quick access to" />
          <div className="flex gap-2">
            <input
              value={newLink.label}
              onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
              placeholder="Label (e.g., My Blog)"
              className={"flex-1 rounded-2xl border border-orange-200 px-3 py-2 text-sm " + ring}
            />
            <input
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              placeholder="https://example.com"
              className={"flex-[2] rounded-2xl border border-orange-200 px-3 py-2 text-sm " + ring}
            />
            <Button onClick={addLink}>Add</Button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {(draft.links || []).map((lnk, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-2xl border border-orange-100 p-2 text-sm">
                <a
                  href={lnk.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-700 underline decoration-orange-300 underline-offset-2"
                >
                  {lnk.label}
                </a>
                <button onClick={() => removeLink(idx)} className="text-slate-400 hover:text-rose-500">
                  ✕
                </button>
              </div>
            ))}
            {(draft.links || []).length === 0 && <div className="text-sm text-slate-500">No links yet.</div>}
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle title="Social Connections" subtitle="Connect or disconnect your accounts" />
          <div className="grid gap-3 md:grid-cols-2">
            {PROVIDERS.map((p) => (
              <SocialConnector
                key={p.key}
                provider={p}
                state={connections[p.key]}
                onChange={(patch) =>
                  setConnections((cur) => ({ ...cur, [p.key]: { ...(cur[p.key] || {}), ...patch } }))
                }
              />
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-6 lg:col-span-4">
        <ImportPanel onImported={onImported} />
        <Card className="p-4">
          <SectionTitle title="About Settings" />
          <p className="text-sm text-slate-600">
            Manage your profile, saved links, and social connections here. On phones, open Settings with the floating cog in
            the bottom-right.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* --------------------------- Bottom Nav (Mobile) --------------------------- */
function BottomNav({ tab, setTab }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-orange-100 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 py-2">
        {TABS.filter((t) =>
          ["discover", "favorites", "planner", "grocery", "connections"].includes(t.key)
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "flex flex-col items-center rounded-2xl px-2 py-1 text-xs",
              tab === t.key ? "bg-orange-100 text-orange-700" : "text-slate-600",
            ].join(" ")}
          >
            {t.icon}
            <span className="mt-0.5">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/* -------------------------------- Root App -------------------------------- */
export default function App() {
  const [tab, setTab] = useState("discover");
  const [query, setQuery] = useState("");
  const [timeMax, setTimeMax] = useState(45);

  const [recipes, setRecipes] = useLocal("flavr.recipes", SEED);
  const [favorites, setFavorites] = useLocal("flavr.favorites", []);
  const [grocery, setGrocery] = useLocal("flavr.grocery", []);
  const [planner, setPlanner] = useLocal("flavr.planner", {});
  const [connections, setConnections] = useLocal("flavr.connections", {});
  const [profile, setProfile] = useLocal("flavr.profile", {
    name: "",
    email: "",
    avatar: "",
    dietary: [],
    links: [],
  });

  const [modal, setModal] = useState({ open: false, recipe: null });

  // NEW — feed state and loader
  const [loadingFeed, setLoadingFeed] = useState(false);

  const COLLECTOR =
    (typeof window !== "undefined" && window.COLLECTOR_URL) ||
    import.meta.env?.VITE_COLLECTOR_URL ||
    "http://localhost:8080";

  async function loadDiscoverFeed() {
    try {
      setLoadingFeed(true);
      const url = new URL(`${COLLECTOR}/discover`);
      if (query.trim()) url.searchParams.set("q", query.trim());
      url.searchParams.set("limit", "36");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("discover failed");
      const items = await res.json();

      // merge + dedupe by title + source url
      const key = (r) => (r.title || "") + "::" + (r.source?.url || "");
      const merged = [...items, ...recipes].filter(
        (v, i, arr) => arr.findIndex((x) => key(x) === key(v)) === i
      );
      setRecipes(merged);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFeed(false);
    }
  }

  // KEEP ONLY THIS ONE filtered
  const filtered = useMemo(() => {
    let list = [...recipes];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.ingredients.some((i) => i.item.toLowerCase().includes(q)) ||
          (r.tags?.some((t) => t.toLowerCase().includes(q)) ?? false)
      );
    }
    list = list.filter((r) => r.time <= timeMax);
    return list;
  }, [recipes, query, timeMax]);

  const addToList = (r) => {
  setGrocery((cur) => {
    const next = [...cur];
    r.ingredients.forEach((ing) => {
      // Keep separate entries per RECIPE so attribution is clear.
      const exists = next.some((x) => x.item === ing.item && x.recipeId === r.id);
      if (!exists) {
        next.push({
          item: ing.item,
          amount: ing.amount,
          done: false,
          recipeId: r.id,
          recipeTitle: r.title,
        });
      }
    });
    return next;
  });
};

const openRecipe = (r) => setModal({ open: true, recipe: r });
const closeRecipe = () => setModal({ open: false, recipe: null });

const toggleFav = (id) =>
  setFavorites((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  // Load feed when switching to Discover
  useEffect(() => {
    if (tab === "discover") {
      loadDiscoverFeed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Re-load feed after search changes (debounced)
  useEffect(() => {
    if (tab === "discover") {
      const t = setTimeout(() => loadDiscoverFeed(), 400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3" onClick={() => setTab("discover")}>
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-orange-400 to-rose-500 p-2 text-white shadow">
              🍽️
            </div>
            <div>
              <div className="text-lg font-extrabold tracking-tight text-slate-800">Flavr</div>
              <div className="-mt-1 text-[11px] uppercase tracking-wide text-orange-600">cook smarter</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {TABS.filter((t) =>
              ["discover", "favorites", "planner", "grocery", "connections"].includes(t.key)
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  "rounded-2xl px-3 py-2 text-sm transition",
                  tab === t.key ? "bg-orange-100 text-orange-700" : "text-slate-600 hover:bg-orange-50",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Profile avatar (click → settings) */}
          <button
            onClick={() => setTab("settings")}
            className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-orange-50"
          >
            <img src={profile.avatar || "https://i.pravatar.cc/40"} className="h-7 w-7 rounded-xl object-cover" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Hero */}
        <div
          className="rounded-3xl bg-gradient-to-tr p-6 text-white shadow-md md:p-8"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(251,146,60,.9), rgba(244,63,94,.9)), url('https://images.unsplash.com/photo-1512058564366-18510be2db19?q=80&w=1600&auto=format&fit=crop')",
            backgroundSize: "cover",
            backgroundBlendMode: "multiply",
          }}
        >
          <div className="max-w-3xl">
            <h1 className="text-3xl font-black leading-tight md:text-4xl">
              Top recipes from the internet & social — curated for you
            </h1>
            <p className="mt-2 text-white/90">
              Discover trending dishes from Pinterest, Instagram, Facebook, and X. Plan your week, build a grocery list, and
              import recipes with one click.
            </p>
            <div className="mt-4 inline-flex flex-wrap gap-2">
              {["#sheet-pan", "#30-minutes", "#one-pot", "#meal-prep"].map((t) => (
                <span key={t} className="rounded-full bg-white/20 px-3 py-1 text-xs">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        {tab === "discover" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-9">
              <SearchFilters query={query} setQuery={setQuery} timeMax={timeMax} setTimeMax={setTimeMax} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((r) => (
                  <RecipeCard
                    key={r.id}
                    r={r}
                    onOpen={openRecipe}
                    onFav={toggleFav}
                    isFav={favorites.includes(r.id)}
                    onAddList={addToList}
                  />
                ))}
                {filtered.length === 0 && (
                  <Card className="p-8 text-center text-slate-500">No results. Try clearing filters or increasing time.</Card>
                )}
              </div>
            </div>
            <div className="space-y-6 lg:col-span-3">
              <GroceryList list={grocery} setList={setGrocery} />
              <ImportPanel onImported={(r) => setRecipes((cur) => [r, ...cur])} />
            </div>
          </div>
        )}

        {tab === "favorites" && (
          <div className="mt-6">
            <SectionTitle
              title="Your Favorites"
              subtitle={`${recipes.filter((r) => favorites.includes(r.id)).length} saved`}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recipes
                .filter((r) => favorites.includes(r.id))
                .map((r) => (
                  <RecipeCard key={r.id} r={r} onOpen={openRecipe} onFav={toggleFav} isFav onAddList={addToList} />
                ))}
              {recipes.filter((r) => favorites.includes(r.id)).length === 0 && (
                <Card className="p-8 text-center text-slate-500">No favorites yet. Tap Save on a card to add.</Card>
              )}
            </div>
          </div>
        )}

        {tab === "planner" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-9">
              <Planner planner={planner} setPlanner={setPlanner} onOpen={openRecipe} recipes={recipes} />
            </div>
            <div className="space-y-6 lg:col-span-3">
              <GroceryList list={grocery} setList={setGrocery} />
            </div>
          </div>
        )}

        {tab === "grocery" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-12">
              <GroceryList list={grocery} setList={setGrocery} />
            </div>
          </div>
        )}

        {tab === "connections" && (
          <ConnectionsPage
            connections={connections}
            setConnections={setConnections}
            onImported={(r) => setRecipes((cur) => [r, ...cur])}
          />
        )}

        {tab === "settings" && (
          <SettingsPage
            profile={profile}
            setProfile={setProfile}
            connections={connections}
            setConnections={setConnections}
            onImported={(r) => setRecipes((cur) => [r, ...cur])}
          />
        )}
      </div>

      {/* Floating settings cog (phones) */}
      <button
        onClick={() => setTab("settings")}
        className="fixed bottom-16 right-4 z-50 rounded-full bg-white p-3 text-xl shadow-md ring-1 ring-orange-200 md:hidden"
      >
        ⚙️
      </button>

      {/* Bottom nav (phones) */}
      <BottomNav tab={tab} setTab={setTab} />

      <footer className="mt-10 border-t border-orange-100 py-6 text-center text-xs text-slate-500">
        Flavr · orange-rose palette · Mobile bottom nav + floating settings cog
      </footer>

      <RecipeModal open={modal.open} onClose={closeRecipe} recipe={modal.recipe} />
    </div>
  );
}
