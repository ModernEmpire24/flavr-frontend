
import React, { useEffect, useMemo, useRef, useState } from "react";

function useLocal(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

const grad = "bg-gradient-to-tr from-orange-400 via-orange-500 to-rose-500";
const ring = "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2";

const SEED = [
  {
    id: "r1",
    title: "Crispy Chili Garlic Noodles",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1600&auto=format&fit=crop",
    time: 20, difficulty: "Easy", rating: 4.8, calories: 520, cuisine: "Asian",
    dietTags: ["Vegetarian"],
    source: { platform: "Instagram", handle: "@wokwithme", url: "https://instagram.com" },
    ingredients: [{item:"Egg noodles",amount:"8 oz"},{item:"Garlic",amount:"6 cloves"}],
    steps: [{text:"Boil noodles",timerSec:480},{text:"Sizzle garlic",timerSec:120},{text:"Toss with sauce",timerSec:60}],
    tags: ["30-min","weeknight"], saves: 2310
  }
];

const PROVIDERS = [
  {key:'pinterest', name:'Pinterest', hint:'Pins & recipe cards'},
  {key:'instagram', name:'Instagram', hint:'Reels & carousels'},
  {key:'facebook', name:'Facebook', hint:'Page posts'},
  {key:'twitter', name:'X (Twitter)', hint:'Threads'},
  {key:'tiktok', name:'TikTok', hint:'Short videos'},
  {key:'youtube', name:'YouTube', hint:'Long‑form'},
];

function Button({ children, onClick, variant = "solid", className = "", disabled }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition active:scale-[.98] " + ring;
  const variants = {
    solid: `${grad} text-white shadow-sm hover:shadow-md`,
    soft: `bg-orange-100 text-orange-700 hover:bg-orange-200`,
    outline: `border border-orange-300 text-orange-700 hover:bg-orange-50`,
    ghost: `text-orange-700 hover:bg-orange-50`,
  };
  return <button onClick={onClick} className={[base, variants[variant], className].join(" ")} disabled={disabled}>{children}</button>;
}
function Card({ children, className = "" }) { return <div className={["rounded-3xl border border-orange-100 bg-white shadow-sm", className].join(" ")}>{children}</div>; }
function SectionTitle({ title, subtitle }) { return (<div className="mb-3 flex items-end justify-between"><h3 className="text-lg font-semibold text-slate-800">{title}</h3>{subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}</div>); }

function ImportPanel({ onImported }) {
  const [url, setUrl] = useState(""); const [status, setStatus] = useState(""); const [loading, setLoading] = useState(false);
  const COLLECTOR = import.meta.env?.VITE_COLLECTOR_URL || "http://localhost:8080";
  const handle = async () => {
    if (!url) return;
    try {
      setLoading(true); setStatus("Importing…");
      const res = await fetch(`${COLLECTOR}/import`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ url }) });
      if (!res.ok) throw new Error("Import failed: " + res.status);
      const incoming = await res.json();
      const newRecipe = {
        id: `imp_${Date.now()}`, title: incoming.title || "Imported Recipe",
        image: incoming.image || "https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1600&auto=format&fit=crop",
        time: incoming.timeMinutes ?? 30, difficulty: "Easy", rating: 0, calories: null, cuisine: "Imported",
        dietTags: [], source: { platform: incoming.sourcePlatform || "Source", handle: incoming.author || "", url: incoming.sourceLink || url },
        ingredients: (incoming.ingredients || []).map(s => ({ item: s, amount: "" })),
        steps: (incoming.steps || []).map(s => ({ text: s, timerSec: 0 })), tags: ["imported"], saves: 0,
      };
      onImported && onImported(newRecipe); setStatus("Imported: " + newRecipe.title); setUrl("");
    } catch (e) { setStatus("Error: " + e.message); } finally { setLoading(false); }
  };
  return (
    <Card className="p-4">
      <SectionTitle title="Import recipe from a link" subtitle="Calls your collector" />
      <div className="flex gap-2">
        <input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="Paste a recipe URL" className={"flex-1 rounded-2xl border border-orange-200 px-3 py-2 text-sm " + ring} />
        <Button onClick={handle} disabled={loading}>{loading? "Importing…":"Import"}</Button>
      </div>
      {status && <div className="mt-2 text-xs text-slate-500">{status}</div>}
    </Card>
  );
}

function GroceryList({ list, setList }) {
  const toggle = (i) => setList(cur => cur.map((it, idx) => (idx===i ? { ...it, done: !it.done } : it)));
  const remove = (i) => setList(cur => cur.filter((_, idx) => idx !== i));
  const clear = () => setList([]);
  return (
    <Card className="h-full p-4">
      <SectionTitle title="Grocery List" subtitle={`${list.length} item${list.length!==1?"s":""}`} />
      <div className="max-h-64 space-y-2 overflow-auto pr-2">
        {list.length === 0 && <div className="text-sm text-slate-500">Empty. Add ingredients from a recipe.</div>}
        {list.map((it, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-orange-100 px-3 py-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={it.done} onChange={() => toggle(i)} className="accent-orange-600" />
              <span className={[it.done && "line-through text-slate-400"].filter(Boolean).join(" ")}>{it.item}</span>
              {it.amount && <span className="text-slate-400">· {it.amount}</span>}
            </label>
            <button onClick={()=>remove(i)} className="text-slate-400 hover:text-rose-500">✕</button>
          </div>
        ))}
      </div>
      {list.length>0 && <Button variant="outline" className="mt-3 w-full" onClick={clear}>Clear List</Button>}
    </Card>
  );
}

function SocialConnector({provider, state, onChange}){
  const connected = !!state?.connected;
  const handleConnect = ()=>{
    const handle = prompt(`Enter your ${provider.name} handle (preview simulates OAuth):`, '@username');
    onChange({connected:true, handle: handle || '@connected', scopes:['public']});
  };
  const handleDisconnect = ()=> onChange({connected:false});
  return (
    <div className="flex items-center justify-between rounded-2xl border border-orange-100 p-3">
      <div>
        <div className="font-medium text-slate-700 flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${connected? 'bg-green-500':'bg-slate-300'}`}></span>
          {provider.name}
        </div>
        <div className="text-xs text-slate-500">{connected? `Connected as ${state?.handle||'@connected'}`: provider.hint}</div>
      </div>
      {connected ? (
        <Button variant="outline" onClick={handleDisconnect}>Disconnect</Button>
      ) : (
        <Button variant="soft" onClick={handleConnect}>Connect</Button>
      )}
    </div>
  );
}

const TABS = [
  { key: "discover", label: "Discover" },
  { key: "favorites", label: "Favorites" },
  { key: "planner", label: "Planner" },
  { key: "grocery", label: "Grocery" },
  { key: "connections", label: "Connections" },
  { key: "settings", label: "Settings" },
];

function BottomNav({ tab, setTab }){
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-orange-100 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-2 py-2">
        {TABS.filter(t=> ["discover","favorites","planner","grocery","connections"].includes(t.key)).map((t)=> (
          <button key={t.key} onClick={()=>setTab(t.key)} className={["flex flex-col items-center rounded-2xl px-2 py-1 text-xs", tab===t.key? "bg-orange-100 text-orange-700":"text-slate-600"].join(" ")}>
            <span className="mt-0.5">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function App() {
  const [tab, setTab] = useState("discover");
  const [recipes, setRecipes] = useState(SEED);
  const [favorites, setFavorites] = useLocal('flavr.favorites', []);
  const [grocery, setGrocery] = useLocal('flavr.grocery', []);
  const [connections, setConnections] = useLocal('flavr.connections', {});
  const [profile, setProfile] = useLocal('flavr.profile', { name:'', email:'', avatar:'', dietary:[], links:[] });

  const addToList = (r) => {
    setGrocery((cur) => {
      const next = [...cur];
      (r.ingredients||[]).forEach((ing) => { if (!next.some((x) => x.item === ing.item)) next.push({ item: ing.item, amount: ing.amount, done: false }); });
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white pb-20 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3" onClick={()=>setTab('discover')}>
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-orange-400 to-rose-500 p-2 text-white shadow">🍽️</div>
            <div><div className="text-lg font-extrabold tracking-tight text-slate-800">Flavr</div><div className="-mt-1 text-[11px] uppercase tracking-wide text-orange-600">cook smarter</div></div>
          </div>
          <nav className="hidden items-center gap-1 md:flex">
            {TABS.filter(t=> ["discover","favorites","planner","grocery","connections"].includes(t.key)).map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={["rounded-2xl px-3 py-2 text-sm transition", tab === t.key ? "bg-orange-100 text-orange-700" : "text-slate-600 hover:bg-orange-50"].join(" ")}>{t.label}</button>
            ))}
          </nav>
          <button onClick={()=>setTab('settings')} className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-orange-50">
            <img src={profile.avatar || 'https://i.pravatar.cc/40'} className="h-7 w-7 rounded-xl object-cover"/>
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {tab === "discover" && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-9">
              <Card className="p-4"><SectionTitle title="Featured" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recipes.map((r) => (
                  <Card key={r.id} className="overflow-hidden"><img src={r.image} className="h-40 w-full object-cover"/><div className="p-3"><div className="font-semibold">{r.title}</div><div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>⏱ {r.time} min</span><Button variant="soft" onClick={()=>addToList(r)}>Add</Button></div></div></Card>
                ))}
              </div></Card>
              <ImportPanel onImported={(r)=>setRecipes((cur)=>[r, ...cur])} />
            </div>
            <div className="space-y-6 lg:col-span-3"><GroceryList list={grocery} setList={setGrocery} /></div>
          </div>
        )}

        {tab === "favorites" && (
          <div className="mt-6">
            <SectionTitle title="Your Favorites" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.filter(r=>favorites.includes(r.id)).map((r) => (
                <Card key={r.id} className="overflow-hidden"><img src={r.image} className="h-40 w-full object-cover"/><div className="p-3"><div className="font-semibold">{r.title}</div></div></Card>
              ))}
            </div>
          </div>
        )}

        {tab === "grocery" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-12"><GroceryList list={grocery} setList={setGrocery} /></div>
          </div>
        )}

        {tab === "connections" && (
          <div className="mt-6">
            <SectionTitle title="Connect your social accounts" subtitle="Preview simulates OAuth" />
            <div className="grid gap-3 md:grid-cols-2">
              {PROVIDERS.map(p => <SocialConnector key={p.key} provider={p} state={connections[p.key]} onChange={(patch)=>setConnections(cur=> ({...cur, [p.key]: {...(cur[p.key]||{}), ...patch}}))} />)}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="mt-6">
            <SectionTitle title="Settings" subtitle="Profile & preferences" />
            <Card className="p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2"><div className="text-xs text-slate-500">Display name</div><input value={profile.name} onChange={(e)=>setProfile({...profile, name:e.target.value})} className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm "+ring} placeholder="Your name"/></div>
                <div className="space-y-2"><div className="text-xs text-slate-500">Email</div><input value={profile.email} onChange={(e)=>setProfile({...profile, email:e.target.value})} className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm "+ring} placeholder="you@example.com"/></div>
                <div className="space-y-2"><div className="text-xs text-slate-500">Avatar URL</div><input value={profile.avatar} onChange={(e)=>setProfile({...profile, avatar:e.target.value})} className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm "+ring} placeholder="https://..."/></div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <button onClick={()=>setTab('settings')} className="fixed bottom-16 right-4 z-50 rounded-full bg-white p-3 text-xl shadow-md ring-1 ring-orange-200 md:hidden">⚙️</button>
      <BottomNav tab={tab} setTab={setTab} />

      <footer className="mt-10 border-t border-orange-100 py-6 text-center text-xs text-slate-500">Flavr · share recipes · plan meals</footer>
    </div>
  );
}
