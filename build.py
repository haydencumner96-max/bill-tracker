#!/usr/bin/env python3
"""Builds index.html for the installable app from the claude.ai version of the tracker (src/app.html).
Both versions run the same tracker code; bills-app.js supplies login and sync in this one.
Run:  python3 build.py   (bumps the version so phones pick up the update)"""
import re, json, pathlib, datetime

root = pathlib.Path(__file__).parent
src = (root / "src" / "app.html").read_text()

def swap(old, new):
    global src
    assert src.count(old) == 1, "build.py: could not find " + old[:60]
    src = src.replace(old, new)

# the claude.ai page carries its own <title> and a claude.ai-only meta tag; those move into <head>
src = re.sub(r"<title>.*?</title>\s*", "", src, count=1, flags=re.S)
src = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\s*', "", src, count=1)

# app-only wording and buttons
swap("const K='billtracker.blank.v1'", "const K='billtracker.app.v1'")
swap("DEFN=['Person 1','Person 2']", "DEFN=['Hayden','Jordyn']")
swap("Changes sync to every device signed in to Claude with access to this tracker.",
     "Changes sync to every device signed in as '+esc(window.btUser?btUser():'')+'.")
swap('<button onclick="rs(this)">Reset</button>',
     '<button onclick="rs(this)">Reset</button>\'+(window.btSignOut?\'<button onclick="btChangePw()">Change password</button><button onclick="btSignOut()">Sign out</button>\':\'\')+\'')
swap("Then enter each fortnight\\'s pay and tick bills off as you pay them.</p>",
     "Then enter each fortnight\\'s pay and tick bills off as you pay them.</p><p class=\"mu\" style=\"margin:8px 0 0\"><b>Moving from the Claude version?</b> There, tap Data → Export. Here, tap Data → Import and pick that file.</p>")

version = datetime.datetime.now().strftime("%Y.%m.%d-%H%M")

head = f"""<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Bill Tracker</title>
<meta name="description" content="Fortnightly bills and pay, synced between phones.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="theme-color" content="#2b2f33">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Bills">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<script>window.APP_VERSION={json.dumps(version)};</script>
<script src="config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.97.0"></script>
<script src="bills-app.js"></script>
"""

i = src.index("</style>") + len("</style>")
tail = """
<script>
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
</script>
</body>
</html>
"""

(root / "index.html").write_text(head + src[:i] + "\n</head>\n<body>\n" + src[i:].lstrip("\n") + tail)

sw = (root / "sw.template.js").read_text().replace("__VERSION__", version)
(root / "sw.js").write_text(sw)
print("built", version)
