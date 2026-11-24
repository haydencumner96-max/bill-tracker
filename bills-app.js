/* Bill Tracker: standalone app layer.
   The tracker (index.html) was written for claude.ai, where it saves through claude.use("db").
   This file provides that same call on your own Supabase project (the one Fortnight Shop uses):
     one row in the "docs" table (col "bills", id "state"), locked to your login, synced live.
   Signing in uses the same email and password as Fortnight Shop. */
(function () {
  "use strict";
  const TABLE = "docs", COL = "bills";
  const cfg = window.APP_CONFIG || {};
  window.APP_STANDALONE = true;

  const isNetErr = (e) => !navigator.onLine || (e && (e.name === "TypeError" || /fetch|network|Failed to fetch|Load failed/i.test(String(e.message || e))));
  let sb = null, user = null, resolveReady;
  const ready = new Promise((r) => (resolveReady = r));

  function client() {
    if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase) return null;
    // same saved login as Fortnight Shop, so signing in to one signs in to both
    if (!sb) sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "fs-auth" } });
    return sb;
  }

  // ---------- sign in ----------
  const css = `#bt-gate{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:var(--bg,#f4f4f5);color:var(--tx,#14201d);font-family:var(--f-body,system-ui,sans-serif)}
#bt-gate .box{width:100%;max-width:360px}
#bt-gate .ic{width:64px;height:64px;border-radius:16px;margin-bottom:14px}
#bt-gate h1{font:700 24px/1.2 var(--f-head,inherit);margin:0 0 6px}
#bt-gate p{margin:0 0 18px;color:var(--mu,#5b6b66);line-height:1.45}
#bt-gate label{display:block;font-weight:600;font-size:14px;margin:12px 0 6px}
#bt-gate input{width:100%;box-sizing:border-box;font-size:16px;padding:12px 14px;border-radius:12px;border:1px solid var(--bd,#d5ddd9);background:var(--card,#fff);color:inherit}
#bt-gate button{width:100%;margin-top:18px;font:600 16px inherit;padding:13px;border-radius:12px;border:0;background:var(--ac,#2b2f33);color:#fff}
#bt-gate button:disabled{opacity:.6}
#bt-gate .err{color:var(--bad,#b3261e);font-weight:600;margin:12px 0 0}
#bt-gate .alt{margin-top:16px;font-size:14px}
#bt-gate .alt a{color:var(--ac,#2b2f33)}`;

  function onBody(fn) { if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn, { once: true }); }

  function showLogin() {
    onBody(() => {
      if (document.getElementById("bt-gate")) return;
      const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
      const g = document.createElement("div"); g.id = "bt-gate";
      g.innerHTML = `<form class="box" id="bt-f" autocomplete="on">
        <img class="ic" src="icons/icon-192.png" alt="">
        <h1>Sign in</h1>
        <p>Use the same email and password as Fortnight Shop. Your bills sync between your phones and PC.</p>
        <label for="bt-em">Email</label><input id="bt-em" type="email" autocomplete="username" required>
        <label for="bt-pw">Password</label><input id="bt-pw" type="password" autocomplete="current-password" required>
        <p class="err" id="bt-e" hidden></p>
        <button type="submit" id="bt-go">Sign in</button>
        <p class="alt"><a href="#" id="bt-local">Use without signing in</a> (saves on this device only)</p>
      </form>`;
      document.body.appendChild(g);
      g.querySelector("#bt-local").onclick = (ev) => { ev.preventDefault(); g.remove(); resolveReady(false); };
      g.querySelector("#bt-f").onsubmit = async (ev) => {
        ev.preventDefault();
        const btn = g.querySelector("#bt-go"), e = g.querySelector("#bt-e");
        btn.disabled = true; btn.textContent = "Signing in…"; e.hidden = true;
        try {
          const { data, error } = await client().auth.signInWithPassword({ email: g.querySelector("#bt-em").value.trim(), password: g.querySelector("#bt-pw").value });
          if (error) throw error;
          user = data.user; g.remove(); resolveReady(true);
        } catch (err) {
          e.hidden = false;
          e.textContent = isNetErr(err) ? "No connection. Try again when you have signal." : (/invalid/i.test(err.message || "") ? "That email and password don't match." : (err.message || "Could not sign in."));
          btn.disabled = false; btn.textContent = "Sign in";
        }
      };
    });
  }

  async function boot() {
    const s = client();
    if (!s) { // no settings, or the library didn't load (offline on the very first open)
      if (!window.supabase && !navigator.onLine) addEventListener("online", () => location.reload(), { once: true });
      resolveReady(false); return;
    }
    let session = null;
    try { session = (await s.auth.getSession()).data.session; } catch (e) {}
    if (session && session.user) { user = session.user; resolveReady(true); return; }
    if (!navigator.onLine) { addEventListener("online", () => location.reload(), { once: true }); resolveReady(false); return; }
    showLogin();
  }
  boot();

  // ---------- one-tap import link: #import=<compressed data> (stays on the phone, never sent to GitHub) ----------
  let pendingImp = null;
  (function takeImportLink() {
    const m = location.hash.match(/^#import=([A-Za-z0-9_-]+)$/);
    if (!m) return;
    pendingImp = m[1];
    history.replaceState(null, "", location.pathname + location.search);
  })();
  async function decodeImp(b64) {
    const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return JSON.parse(await new Response(stream).text());
  }
  // runs once the tracker has loaded its saved data, so the import isn't overwritten by an older copy
  async function runImport() {
    if (!pendingImp) return;
    const code = pendingImp; pendingImp = null;
    const say = (t) => { try { stat(t); } catch (e) {} };
    try {
      const d = await decodeImp(code);
      if (!d || !d.bills) throw new Error("no bills");
      // the same link opened again later (on any device) must not undo newer changes
      if (d.imp && S && S.imp === d.imp) { say("Already imported – nothing changed"); return; }
      S = d; initAn(); migrate(); persist(); draw();
      const msg = "Imported " + d.bills.length + " bills from the Claude version";
      say(msg);
      setTimeout(() => say(msg), 1500); // after the save to the other devices finishes
      setTimeout(() => say(okMsg()), 8000);
    } catch (e) {
      say("Import link didn't work – use Data → Import with the backup file");
    }
  }
  window.btRunImport = runImport;

  window.btSignOut = async function () {
    try { await client().auth.signOut(); } catch (e) {}
    location.reload();
  };
  window.btUser = () => (user && user.email) || "";

  // ---------- db: the same calls the tracker makes on claude.ai ----------
  function makeDb() {
    const s = client();
    const errOf = (e) => Object.assign(new Error((e && e.message) || "error"), { code: isNetErr(e) ? "offline" : "error" });
    async function run(q) { let r; try { r = await q; } catch (e) { throw errOf(e); } if (r.error) throw errOf(r.error); return r.data; }
    function doc(path) {
      const id = String(path).split("/").pop();
      const snapOf = (row) => ({ id, exists: !!row, data: () => (row ? row.data : undefined) });
      return {
        id,
        async get() { return snapOf(await run(s.from(TABLE).select("data").eq("col", COL).eq("id", id).maybeSingle())); },
        async set(d) { await run(s.from(TABLE).upsert({ user_id: user.id, col: COL, id, data: d, updated_at: new Date().toISOString() }, { onConflict: "user_id,col,id" })); },
        onSnapshot(fn, onErr) {
          let busy = null, ch = null, first = true;
          const refresh = () => {
            if (busy) return busy;
            busy = run(s.from(TABLE).select("data").eq("col", COL).eq("id", id).maybeSingle())
              .then((row) => { fn(snapOf(row)); if (first) { first = false; setTimeout(runImport, 0); } })
              .catch((e) => onErr && onErr(e))
              .finally(() => { busy = null; });
            return busy;
          };
          refresh();
          ch = s.channel("bills-" + user.id)
            .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: "col=eq." + COL }, (p) => {
              const row = p.eventType === "DELETE" ? null : p.new;
              if (row && (row.id !== id || (row.user_id && row.user_id !== user.id))) return;
              fn(snapOf(row));
            })
            .subscribe((status) => { if (status === "SUBSCRIBED") refresh(); });
          // phones pause the live connection in the background: check again when the app comes back
          addEventListener("online", refresh);
          document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
          return () => { try { s.removeChannel(ch); } catch (e) {} };
        },
      };
    }
    return { doc };
  }

  window.claude = {
    async use(name) {
      if (name !== "db") return null; // Export uses a normal file download in the app
      const ok = await ready;
      if (!ok) { setTimeout(runImport, 0); return null; } // using it on this device only
      return makeDb();
    },
  };
})();
