import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const PROVIDERS = [
  { key:"google",   label:"Google (YouTube)" },
  { key:"facebook", label:"Facebook (also Instagram Graph)" },
  { key:"twitter",  label:"Twitter/X" },
  // Pinterest/Instagram native OAuth need app credentials; see notes in Settings
];

export default function Connections({ connections, setConnections }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess)=> setUser(sess?.user || null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  async function connect(provider){
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      // After redirect back, user will be set. Mark badge:
      setConnections((c)=> ({ ...c, [provider]: { connected:true, at: Date.now() }}));
    } catch(e){ alert(e.message); }
  }

  async function disconnect(){
    await supabase.auth.signOut();
    setConnections({});
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-600">
        {user ? <div>Signed in as <b>{user.email || user.user_metadata?.name}</b></div>
              : <div>Not signed in yet — use the buttons below.</div>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {PROVIDERS.map(p=>{
          const isOn = !!connections?.[p.key]?.connected;
          return (
            <div key={p.key} className="flex items-center justify-between rounded-2xl border border-orange-100 p-3">
              <div>
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${isOn? "bg-green-500":"bg-slate-300"}`}></span>
                  {p.label}
                </div>
                <div className="text-xs text-slate-500">{isOn ? "Connected" : "Tap to connect via OAuth"}</div>
              </div>
              {!isOn
                ? <button className="rounded-xl border px-3 py-1" onClick={()=>connect(p.key)}>Connect</button>
                : <span className="rounded-xl bg-green-100 px-3 py-1 text-xs text-green-700">Badge ✓</span>}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-slate-500">
        Instagram & Pinterest use Facebook/Pinterest developer apps. We can wire these once you create app credentials—see Settings for a step-by-step.
      </div>

      <div className="pt-2">
        <button className="rounded-xl border px-3 py-1" onClick={disconnect}>Sign out</button>
      </div>
    </div>
  );
}
