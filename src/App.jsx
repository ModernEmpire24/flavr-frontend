import React, { useEffect, useState } from "react";
import Planner from "./components/Planner.jsx";
import Connections from "./components/Connections.jsx";
import { supabase } from "./lib/supabase";

function PlatformBadge({ platform }) {
  const p = (platform || "").toLowerCase();
  const icon = p.includes("youtube") ? "▶️"
             : p.includes("instagram") ? "📸"
             : p.includes("tiktok") ? "🎵"
             : p.includes("pinterest") ? "📌"
             : "🌐";
  return (
    <span className="inline-flex items-center gap-1 rounded-xl bg-flame-50 px-2 py-1 text-[11px] font-medium text-flame-700 ring-1 ring-flame-200">
      <span>{icon}</span><span>{platform}</span>
    </span>
  );
}

function useLocal(key, initial) {
  const [val, setVal] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }, [key, val]);
  return [val, setVal];
}

const grad = "bg-gradient-to-tr from-flame-500 via-coral-500 to-rose-500";
const ring = "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2";
const RAW = import.meta.env?.VITE_COLLECTOR_URL || "http://localhost:8080";
const COLLECTOR = RAW.replace(/\/+$/, "");

const TABS = [
  { key: "discover", label: "Discover" },
  { key: "favorites", label: "Favorites" },
  { key: "planner", label: "Planner" },
  { key: "grocery", label: "Grocery" },
  { key: "connections", label: "Connections" },
  { key: "settings", label: "Settings" },
];

function Button({ children, onClick, variant = "solid", className = "", disabled }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition active:scale-[.98] " + ring;
  const variants = {
    solid: `${grad} text-white shadow-sm hover:shadow-md`,
    soft: `bg-orange-100 text-orange-700 hover:bg-orange-200`,
    outline: `border border-orange-300 text-orange-700 hover:bg-orange-50`,
  };
  return <button onClick={onClick} className={[base, variants[variant], className].join(" ")} disabled={disabled}>{children}</button>;
}
function Card({ children, className = "" }) { return <div className={["rounded-3xl border border-orange-100 bg-white shadow-sm", className].join(" ")}>{children}</div>; }
function SectionTitle({ title, subtitle }) { return (<div className="mb-3 flex items-end justify-between"><h3 className="text-lg font-semibold text-slate-800">{title}</h3>{subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}</div>); }

function ImportPanel({ onImported }) {
  const [url, setUrl] = useState(""); const [status, setStatus] = useState(""); const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!url) return;
    try {
      setLoading(true); setStatus("Importing…");
      const res = await fetch(`${COLLECTOR}/import`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ url }) });
      if (!res.ok) throw new Error("Import failed: " + res.status);
      const incoming = await res.json();
      const r = {
        id: `imp_${Date.now()}`,
        title: incoming.title || "Imported Recipe",
        image: incoming.image || "https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1600&auto=format&fit=crop",
        time: incoming.timeMinutes ?? 30, difficulty: "Easy", rating: 0, calories: null, cuisine: "Imported",
        dietTags: [], source: { platform: incoming.sourcePlatform || "Source", handle: incoming.author || "", url: incoming.sourceLink || url },
        ingredients: (incoming.ingredients || []).map(s => ({ item: s, amount: "" })),
        steps: (incoming.steps || []).map(s => ({ text: s, timerSec: 0 })), tags: ["imported"], saves: 0,
      };
      onImported && onImported(r); setStatus("Imported: " + r.title); setUrl("");
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

export default function App() {
  const [tab, setTab] = useState("discover");
  const [recipes, setRecipes] = useState([]);
  const [favorites, setFavorites] = useLocal('flavr.favorites', []);
  const [grocery, setGrocery] = useLocal('flavr.grocery', []);
  const [connections, setConnections] = useLocal('flavr.connections', {});
  const [profile, setProfile] = useLocal('flavr.profile', { name:'', email:'', avatar:'', dietary:[], links:[] });
  const [planner, setPlanner] = useLocal('flavr.planner', {});

  // trending from backend
  useEffect(() => {
    (async ()=> {
      try {
        const res = await fetch(`${COLLECTOR}/trending`);
        if (res.ok) {
          const data = await res.json();
          setRecipes(data);
        }
      } catch {}
    })();
  }, []);

  // auth keeps user logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (u) setProfile(p => ({ ...p, email: u.email || p.email, name: u.user_metadata?.name || p.name }));
    });
  }, []);

  const addToList = (r) => {
    setGrocery(cur => {
      const next = [...cur];
      (r.ingredients||[]).forEach(ing => { if (!next.some(x=>x.item===ing.item)) next.push({ item: ing.item, amount: ing.amount, done:false }); });
      return next;
    });
  };
  const toggleFav = (id) => setFavorites(cur => (cur.includes(id) ? cur.filter(x=>x!==id) : [...cur, id]));

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
              <Card className="p-4"><SectionTitle title="Trending recipes" subtitle="Across the web" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recipes.map((r) => (
 <Card key={r.id} className="overflow-hidden hover:shadow-soft transition-shadow">
  <img src={r.image} className="h-40 w-full object-cover" />
  <div className="p-3 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="font-semibold leading-tight line-clamp-2">{r.title}</div>
      {r.source?.platform && <PlatformBadge platform={r.source.platform} />}
    </div>
    <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
      <span>⏱ {r.time || 20} min</span>
      <div className="flex gap-2">
        <Button variant="soft" onClick={()=>addToList(r)}>Add</Button>
        <a href={r.source?.url} target="_blank" rel="noreferrer"
           className="rounded-2xl border border-orange-200 px-3 py-1 hover:bg-orange-50">Open</a>
      </div>
    </div>
  </div>
</Card>

                ))}
              </div></Card>
              <ImportPanel onImported={(r)=>setRecipes((cur)=>[r, ...cur])} />
            </div>
            <div className="space-y-6 lg:col-span-3">
              <Card className="p-4">
                <SectionTitle title="Your Profile" />
                <div className="space-y-2 text-sm">
                  <div><b>Name:</b> {profile.name || "—"}</div>
                  <div><b>Email:</b> {profile.email || "—"}</div>
                </div>
              </Card>
              <Card className="p-4">
                <SectionTitle title="Grocery list" />
                <div className="space-y-2 text-sm">
                  {grocery.length===0 ? <div className="text-slate-500">Empty — add ingredients from a recipe.</div> :
                    grocery.map((it,i)=> <div key={i} className="flex items-center justify-between"><span>{it.item}</span></div>)
                  }
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === "planner" && <Planner planner={planner} setPlanner={setPlanner} recipes={recipes} />}
        {tab === "connections" && <Connections connections={connections} setConnections={setConnections} />}

        {tab === "settings" && (
          <div className="mt-6">
            <SectionTitle title="Settings" subtitle="Account & profile" />
            <Card className="p-4">
              <AuthPanel profile={profile} setProfile={setProfile} />
            </Card>

            <Card className="mt-4 p-4">
              <SectionTitle title="Connect Instagram & Pinterest (coming soon)" />
              <div className="text-sm text-slate-600 space-y-2">
                <div>• Instagram requires a Facebook App (Instagram Graph API). You’ll add a Client ID/Secret to the backend and we’ll enable “Sign in with Facebook”.</div>
                <div>• Pinterest requires a Pinterest Developer App. We’ll add the OAuth keys and enable “Sign in with Pinterest”.</div>
              </div>
            </Card>
          </div>
        )}
      </div>

      <button onClick={()=>setTab('settings')} className="fixed bottom-16 right-4 z-50 rounded-full bg-white p-3 text-xl shadow-md ring-1 ring-orange-200 md:hidden">⚙️</button>

      <footer className="mt-10 border-t border-orange-100 py-6 text-center text-xs text-slate-500">Flavr · share recipes · plan meals</footer>
    </div>
  );
}

function AuthPanel({ profile, setProfile }) {
  const [email, setEmail] = useState(profile.email || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(profile.name || "");
  const [msg, setMsg] = useState("");

  useEffect(()=>{ setEmail(profile.email||""); setName(profile.name||""); }, [profile]);

  async function signUp(){
    setMsg("Creating account…");
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) return setMsg("Error: " + error.message);
    setMsg("Check your email to confirm.");
  }
  async function signIn(){
    setMsg("Signing in…");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg("Error: " + error.message);
    setProfile(p=>({ ...p, email, name }));
    setMsg("Signed in.");
  }
  async function signOut(){
    await supabase.auth.signOut();
    setMsg("Signed out.");
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <div className="text-xs text-slate-500">Display name</div>
        <input value={name} onChange={(e)=>setName(e.target.value)} className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm "+ring} placeholder="Your name"/>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-slate-500">Email</div>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm "+ring} placeholder="you@example.com"/>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-slate-500">Password</div>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className={"w-full rounded-2xl border border-orange-200 px-3 py-2 text-sm "+ring} placeholder="••••••••"/>
      </div>
      <div className="flex items-end gap-2">
        <button className="rounded-xl border px-3 py-2" onClick={signUp}>Create account</button>
        <button className="rounded-xl border px-3 py-2" onClick={signIn}>Sign in</button>
        <button className="rounded-xl border px-3 py-2" onClick={signOut}>Sign out</button>
      </div>
      {msg && <div className="text-xs text-slate-500">{msg}</div>}
    </div>
  );
}
