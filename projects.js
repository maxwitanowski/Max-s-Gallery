// Max's Gallery — project index.
// Each entry renders as a full-width tab on the home page, drawn in that project's own UI style.
// `tab` is the inner HTML of the tab; class hooks live in tabs.css.

window.PROJECTS = [
  {
    slug: "minebro",
    title: "Minebro",
    year: "2026",
    href: "projects/minebro.html",
    cls: "tab--minebro",
    tab: `
      <div class="mb-sky" aria-hidden="true"></div>
      <div class="mb-ground" aria-hidden="true"></div>
      <div class="mb-left">
        <p class="mb-kicker"><span>01 / Minecraft mod · Fabric 26.2</span><span>2026 · real project</span></p>
        <h3 class="mb-logo">Minebro<span class="mb-splash">An AI teammate!</span></h3>
        <p>A second player for your Minecraft world, controlled by an AI. Give it an API key, type <b>/ai spawn</b>, and it joins like a normal player: chops trees, crafts, mines, fights, eats, sleeps, and chats with you. It only knows what it can actually see.</p>
        <div class="mb-tags"><span>Java</span><span>Fabric</span><span>Claude API</span><span>OpenRouter</span><span>Local models</span></div>
      </div>
      <div class="mb-right" aria-hidden="true">
        <div class="mb-chat">
          <div><b>&lt;Max&gt;</b> hey can you get us some wood</div>
          <div><i>&lt;Minebro&gt;</i> on it, there's an oak forest just north</div>
          <div><b>&lt;Max&gt;</b> what am I wearing?</div>
          <div><i>&lt;Minebro&gt;</i> iron helmet and diamond chestplate, holding an iron pickaxe</div>
          <div class="mb-typing"><i>&lt;Minebro&gt;</i> got 12 oak logs, heading back<span>▌</span></div>
        </div>
        <div class="mb-hud">
          <div class="mb-hearts"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="mb-hotbar"><i class="sel"><s class="log"></s></i><i><s class="pick"></s></i><i><s class="bread"></s></i><i><s class="cobble"></s></i><i></i><i></i><i></i><i></i><i></i></div>
        </div>
      </div>
      <span class="tab__open">Play with it →</span>`
  },
  {
    slug: "night-desk",
    title: "Night Desk",
    year: "2026",
    href: "projects/night-desk.html",
    cls: "tab--nightdesk",
    tab: `
      <div class="nd-mast">
        <span class="nd-brand"><i></i>Night Desk</span><span class="nd-tag">paper trading · live ASX · you vs the machine</span>
        <span class="nd-right"><span class="nd-pill open"><i></i>ASX open</span><span class="nd-pill"><i></i>US closed</span><span class="nd-score"><i style="background:#eeeeee"></i>$893.10 <em>vs</em> <i style="background:#ee6018"></i>$972.43</span></span>
      </div>
      <div class="nd-tabs"><span class="on">Market</span><span>Portfolio</span><span>Ledger</span><span>You vs AI</span><span>Settings</span></div>
      <div class="nd-body">
        <div class="nd-left">
          <p class="nd-kicker"><span>02 / Paper-trading terminal</span><span>2026 · real project</span></p>
          <h3>Night Desk</h3>
          <p>Live ASX and US prices, fake money, real rules. I trade against an AI investment committee that researches the news, argues, and runs its own book while I sleep. The page has an interactive preview and the source is on GitHub.</p>
          <div class="nd-chips"><span>React</span><span>Express</span><span>SVG charts</span><span>OpenRouter</span><span>Docker</span></div>
          <div class="nd-rows">
            <div class="nd-row"><b>CBA</b><s>Commonwealth Bank</s><svg viewBox="0 0 64 26"><path d="M2 6 L12 9 L20 8 L28 14 L36 13 L44 18 L52 17 L62 21" fill="none" stroke="#ee6018" stroke-width="1.75"/></svg><span class="nd-num"><em>$152.06</em><u class="dn">−1.71%</u></span></div>
            <div class="nd-row"><b>BHP</b><s>BHP Group</s><svg viewBox="0 0 64 26"><path d="M2 8 L12 6 L20 12 L28 11 L36 16 L44 15 L52 19 L62 18" fill="none" stroke="#ee6018" stroke-width="1.75"/></svg><span class="nd-num"><em>$59.45</em><u class="dn">−1.14%</u></span></div>
            <div class="nd-row"><b>CSL</b><s>CSL Limited</s><svg viewBox="0 0 64 26"><path d="M2 20 L12 18 L20 14 L28 15 L36 10 L44 11 L52 7 L62 5" fill="none" stroke="#a0ca92" stroke-width="1.75"/></svg><span class="nd-num"><em>$172.01</em><u class="up">+0.63%</u></span></div>
            <div class="nd-row"><b>NVDA</b><s>NVIDIA</s><svg viewBox="0 0 64 26"><path d="M2 16 L12 12 L20 13 L28 8 L36 6 L44 9 L52 5 L62 8" fill="none" stroke="#a0ca92" stroke-width="1.75"/></svg><span class="nd-num"><em>$182.14</em><u class="up">+2.12%</u></span></div>
          </div>
        </div>
        <div class="nd-right-col" aria-hidden="true">
          <div class="nd-chart">
            <div class="nd-chart-head"><span>% change over 24H</span><span class="nd-legend"><i style="background:#eeeeee"></i>BHP <i style="background:#ee6018"></i>CBA <i style="background:#a0ca92"></i>NVDA</span></div>
            <svg viewBox="0 0 520 220" preserveAspectRatio="none">
              <line x1="0" x2="520" y1="60" y2="60" stroke="#1d1a18"/><line x1="0" x2="520" y1="110" y2="110" stroke="#3d3a39"/><line x1="0" x2="520" y1="160" y2="160" stroke="#1d1a18"/>
              <text x="4" y="56" class="ax">+1.00%</text><text x="4" y="106" class="ax">0.00%</text><text x="4" y="156" class="ax">−1.00%</text>
              <path d="M0 112 L30 100 L60 92 L90 96 L120 84 L150 90 L180 100 L210 120 L240 140 L270 150 L300 146 L330 160 L360 172 L390 165 L420 178 L450 170 L480 164 L520 158" fill="none" stroke="#eeeeee" stroke-width="1.5"/>
              <path d="M0 110 L30 120 L60 126 L90 118 L120 112 L150 112 L180 114 L210 118 L240 130 L270 150 L300 166 L330 178 L360 186 L390 192 L420 188 L450 196 L480 190 L520 186" fill="none" stroke="#ee6018" stroke-width="1.5"/>
              <path d="M0 110 L30 104 L60 96 L90 84 L120 70 L150 62 L180 54 L210 48 L240 40 L270 46 L300 38 L330 44 L360 52 L390 60 L420 56 L450 70 L480 78 L520 84" fill="none" stroke="#a0ca92" stroke-width="1.5"/>
              <circle cx="520" cy="158" r="2.5" fill="#eeeeee"/><circle cx="520" cy="186" r="2.5" fill="#ee6018"/><circle cx="520" cy="84" r="2.5" fill="#a0ca92"/>
            </svg>
            <div class="nd-axis"><span>1:30 PM</span><span>4:10 PM</span><span>10:45 AM</span><span>1:08 PM</span></div>
          </div>
          <div class="nd-board">
            <div><span class="nd-lbl"><i style="background:#eeeeee"></i>You</span><b>$893.10</b><u class="dn">−10.69% since base</u></div>
            <div class="nd-vs"><span>VS</span><u class="dn">AI leads by $79.33</u></div>
            <div><span class="nd-lbl"><i style="background:#ee6018"></i>The Machine</span><b>$972.43</b><u class="dn">−2.76% since base</u></div>
          </div>
        </div>
      </div>
      <span class="tab__open">See how it works →</span>`
  },
  {
    slug: "notepad",
    title: "Notepad",
    year: "2026",
    href: "projects/notepad.html",
    cls: "tab--notepad",
    tab: `
      <div class="np-side" aria-hidden="true">
        <div class="np-head"><span class="np-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 5.5c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v14c0 .6-.5 1.1-1.1 1.1l-9.8-.2c-.6 0-1.1-.5-1.1-1.1z"/><path d="M9 3v4M12 3v4M15 3v4"/><path d="M9.5 11c2-.4 4.4-.2 6 .3M9.5 14.2c1.8-.6 3.6-.5 5.5 0M9.5 17.3c1.2-.4 2.3-.3 3.5-.1"/></svg><i>Notepad</i></span><span class="np-new">+ New</span></div>
        <div class="np-search">search the notebook</div>
        <div class="np-label">Folders</div><div class="np-tree on">≡ All notes <em>6</em></div><div class="np-tree">▭ Uni <em>2</em></div><div class="np-tree">▭ Journal <em>1</em></div>
        <div class="np-label">Tags</div><div class="np-tags"><span>#biology</span><span>#uni</span><span>#ideas</span><span>#books</span><span>#journal</span></div>
        <div class="np-label">Pages</div>
        <div class="np-row on"><b>Lecture 12 — cell respiration</b><span>2h ago · Glycolysis happens in the cytoplasm…</span></div>
        <div class="np-row"><b>Sunday</b><span>yesterday · Slept in. Fixed the audio capture…</span></div>
        <div class="np-row"><b>Ideas</b><span>yesterday · A notebook that listens to lectures…</span></div>
        <div class="np-row"><b>Reading list</b><span>4 days ago · The Pragmatic Programmer</span></div>
      </div>
      <div class="np-desk">
        <div class="np-top"><span class="np-crumb">Uni / <b>Lecture 12 — cell respiration</b></span><span class="np-btn">✎ Ink</span><span class="np-btn ox">◠ Listening</span></div>
        <div class="np-sheet">
          <p class="np-kicker"><span>03 / Notes app for Windows</span><span>2026 · real project</span></p>
          <h3>Notepad</h3>
          <p class="np-meta">〰 a warm notebook · 2h ago · 148 words</p>
          <p class="np-body">Apple Notes simplicity, <span class="np-link">[[Obsidian]]</span>-style links and <span class="np-tag">#tags</span> on a page that feels like paper. Write words with your cursor and they become text. Press Eavesdrop and it takes notes on whatever is playing.</p>
          <p class="np-ink">mitochondria = powerhouse</p>
          <div class="np-rules"></div>
        </div>
      </div>
      <div class="np-panel" aria-hidden="true">
        <div class="np-card"><span class="np-hand">free &amp; local</span><b>Eavesdropper</b><p>Listening · 0:41 · writing study notes into <em>Lecture 12</em> as it goes.</p><svg viewBox="0 0 260 40" preserveAspectRatio="none"><path d="M0 20 L10 12 L20 28 L30 8 L40 30 L50 14 L60 26 L70 6 L80 32 L90 16 L100 24 L110 10 L120 30 L130 18 L140 22 L150 4 L160 34 L170 14 L180 26 L190 12 L200 28 L210 16 L220 22 L230 8 L240 30 L250 18 L260 20" fill="none" stroke="#ffc934" stroke-width="1.3"/></svg></div>
        <div class="np-transcript"><b>Transcript</b><p><i>0:06</i> So, cellular respiration. Three stages, and the exam will ask you where each one happens.</p><p><i>0:13</i> Glycolysis is first, in the cytoplasm. One glucose in, two pyruvate out…</p><p><i>0:20</i> Then pyruvate is shuttled into the mitochondrial matrix<span class="np-cursor">▌</span></p></div>
      </div>
      <span class="tab__open">Open the notebook →</span>`
  },
  {
    slug: "astral-coder",
    title: "Astral Coder",
    year: "2026",
    href: "projects/astral-coder.html",
    cls: "tab--astral",
    tab: `
      <div class="ac-side" aria-hidden="true">
        <div class="ac-logo"><img src="projects/media/astral-mark.png" alt="" /><b>Astral</b><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg></div>
        <div class="ac-repo"><span class="ac-av">N</span>night-desk<em>main</em></div>
        <div class="ac-ws on"><i class="working"></i><span><b>fix-chart-tooltip</b><small>night-desk · <u class="ac-sp"><i>✢</i><i>✳</i><i>✶</i><i>✻</i></u> Combobulating… · now</small></span><span class="ac-stats"><b>+48</b><s>−12</s></span></div>
        <div class="ac-ws"><i class="dirty"></i><span><b>night-desk <em>local</em></b><small>3 changed · 2h ago</small></span></div>
        <div class="ac-ws"><i class="pr"></i><span><b>asx-price-feed</b><small>night-desk · PR #41 · yesterday</small></span><span class="ac-dot"></span></div>
        <div class="ac-repo"><span class="ac-av">N</span>Notepad<em>main</em></div>
        <div class="ac-ws"><i class="clean"></i><span><b>Notepad <em>local</em></b><small>clean · 3d ago</small></span></div>
        <div class="ac-ws"><i class="merged"></i><span><b>ink-recogniser</b><small>Notepad · merged · last week</small></span></div>
        <div class="ac-repo"><span class="ac-av">M</span>Minebro<em>master</em></div>
        <div class="ac-new">+ New workspace<kbd>Ctrl+N</kbd></div>
      </div>
      <div class="ac-main">
        <div class="ac-top"><b>fix-chart-tooltip</b><span class="ac-chip">⑂ max/fix-chart-tooltip <em>↑2</em></span><span class="ac-chip pr">#43</span><span class="ac-pills"><span>Open in ▾</span><span>▷ Run</span><span class="primary">✓ PR #43</span></span></div>
        <div class="ac-tabs"><span class="on"><u class="ac-sp"><i>✢</i><i>✳</i><i>✶</i><i>✻</i></u>Chart tooltip</span><span><u class="ac-sp cx"><i>⠋</i><i>⠙</i><i>⠹</i><i>⠸</i></u>Price feed retry</span><span><u class="sh">&gt;_</u>PowerShell</span><span class="add">+ New chat</span><span class="views">Notes · Setup · Run · Terminal</span></div>
        <div class="ac-chat">
          <p class="ac-kicker"><span>04 / Desktop console for coding agents</span><span>2026 · real project</span></p>
          <h3>Astral Coder</h3>
          <p class="ac-lead">One window for every coding agent. Claude Code, Codex, Gemini and local models each run in a real terminal, sorted into projects, workspaces and sessions, and Claude gets a proper chat.</p>
          <div class="ac-user">The compare chart tooltip sticks at the wrong x when the mouse leaves. Fix it.</div>
          <div class="ac-asst"><span class="ac-who"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0182 2.8535-.6071 1.5422-.2793 1.8396-.3157.8318.3885.0911.3946-.3278.8074-1.9672.4857-2.3071.4614-3.436.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.6212l3.0175.2247.7893.5221.4736.6376-.079.4857-1.2143.6193-1.6393-.3886-3.8248-.9107-1.3114-.3278h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.6211h-.1275v.17l.4432.6496 2.3436 3.5211.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9247L14.1 19.166l-1.1414-1.9429-.1396.079-.6740 7.2551-.3157.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9247.3157-1.5301.2853-1.9004.17-.6314-.0121-.0425-.1396.0182-1.4328 1.9672-2.1795 2.9445-1.7243 1.8457-.4129.1639-.7164-.3703.0668-.6618.4008-.5889 2.386-3.0357 1.4389-1.8822.929-1.0868-.0061-.1579h-.0546l-6.3385 4.1155-1.1293.1457-.4857-.4554.0607-.7468.2308-.2429 1.9064-1.3114z"/></svg></span><div>
            <div class="ac-think">Thinking</div>
            <div class="ac-tool"><em>Edit</em><code>web/src/components/CompareChart.jsx</code><i>›</i></div>
            <div class="ac-tool"><em>Bash</em><code>npm test -- CompareChart</code><i>›</i></div>
            <p>Two things were wrong: x came straight from the mouse instead of the nearest tick, and nothing cleared it on leave. Six tests pass.</p>
            <div class="ac-turn"><span class="ok">✓ 38.2s</span><span>$0.14</span><span class="ac-pill">2 files <b>+48</b> <s>−12</s></span></div>
          </div></div>
        </div>
        <div class="ac-composer"><span class="ac-ta">Message Claude Code</span><div class="ac-row"><span>▣ Default ▾</span><span>✓ Auto ▾</span><span>◔ Default ▾</span><em>Enter to send</em><b>↑</b></div></div>
      </div>
      <div class="ac-panel" aria-hidden="true">
        <div class="ac-ptabs"><span class="on">Diff <em>2</em></span><span>Checks <em>3</em></span><span>Files</span></div>
        <div class="ac-sec"><b>Changes</b><div class="ac-kv"><span>Branch</span><code>max/fix-chart-tooltip</code></div><div class="ac-kv"><span>Base</span><code>origin/main · 2 ahead</code></div>
          <div class="ac-file"><i class="M">M</i>CompareChart.jsx<small>web/src/components</small><span class="ac-stats"><b>+9</b><s>−12</s></span></div>
          <div class="ac-file"><i class="A">A</i>CompareChart.test.jsx<small>web/src/components</small><span class="ac-stats"><b>+39</b></span></div></div>
        <div class="ac-sec"><b>Pull request</b><p class="ac-prt">Tooltip snaps to ticks and hides on leave</p><div class="ac-prm"><em>Open</em>max/fix-chart-tooltip → main</div>
          <div class="ac-check"><i class="ok">✓</i>build<small>1m 12s</small></div><div class="ac-check"><i class="ok">✓</i>lint<small>58s</small></div><div class="ac-check"><i class="pend">◌</i>test (windows-latest)<small>running</small></div></div>
      </div>
      <span class="tab__open">Open the console →</span>`
  }
];
