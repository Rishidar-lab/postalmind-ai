import { useState, useEffect, useRef } from "react";

const KEYFRAMES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}html{scroll-behavior:smooth;}
body{background:#030308;overflow-x:hidden;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-track{background:#05050f;}::-webkit-scrollbar-thumb{background:#5b21b6;border-radius:2px;}
@keyframes d1{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(80px,-60px) scale(1.07)}75%{transform:translate(-40px,50px) scale(0.96)}}
@keyframes d2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-70px,80px) scale(1.1)}}
@keyframes d3{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(60px,60px) scale(0.92)}70%{transform:translate(-50px,-40px) scale(1.04)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{background-position:-300% center}100%{background-position:300% center}}
.au1{animation:d1 22s ease-in-out infinite}
.au2{animation:d2 30s ease-in-out infinite}
.au3{animation:d3 38s ease-in-out infinite}
.au4{animation:d1 18s ease-in-out infinite reverse}
.fu{animation:fadeUp 0.65s ease both}
.fu1{animation-delay:0.08s}.fu2{animation-delay:0.18s}.fu3{animation-delay:0.28s}.fu4{animation-delay:0.38s}
.glass{background:rgba(255,255,255,0.032);border:1px solid rgba(255,255,255,0.075);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);}
.gh{transition:background 0.22s,border-color 0.22s,transform 0.18s;}
.gh:hover{background:rgba(255,255,255,0.055);border-color:rgba(167,139,250,0.3);transform:translateY(-2px);}
.btn-glow{transition:all 0.22s;position:relative;overflow:hidden;}
.btn-glow:hover{transform:translateY(-1px);box-shadow:0 0 24px rgba(124,58,237,0.55);}
.btn-cyan:hover{box-shadow:0 0 22px rgba(6,182,212,0.55)!important;}
.nl:hover{color:#a78bfa!important;}
.chip:hover{background:rgba(167,139,250,0.12)!important;border-color:rgba(167,139,250,0.4)!important;}
.shim{background:linear-gradient(90deg,#c4b5fd,#818cf8,#67e8f9,#a78bfa,#c4b5fd);background-size:250% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 4s linear infinite;}
`;

const SYSTEM = `You are PostalMind AI — a brilliant, empathetic assistant for India Post GDS (Gramin Dak Sevak) Branch Postmasters and postal workers in India.

You have expert-level knowledge of:
• GDS Conduct and Engagement Rules 2020 (cite rule numbers when relevant)
• ABPM and BPM duties, accountability, daily workflow
• RTI (Right to Information) — how to draft, file, and follow up
• PMA (Postal Manual) rules and utilization targets for Branch Offices
• Financial services: IPPB, PLI, RPLI, NSC, SSA, MIS, TD, RD
• Branch Post Office (BO) daily operations, SB transactions, money orders, stamps
• DOPT orders, postal circulars, leave entitlements for GDS employees
• Service matters: engagement, TRCA, allowances, termination
• India Post mobile app and e-BO workflows
• Vriddhachalam Sub-Division, Tamil Nadu context

Be concise, accurate, practical. When citing rules, give section numbers. For serious service matters, suggest consulting the official circular or Divisional Superintendent. Reply in Tamil if the user writes Tamil; otherwise English. Be warm — GDS officers are the backbone of rural India.`;

const CHIPS = [
  "What is my annual leave as GDS ABPM?",
  "How do I file RTI for delayed TRCA?",
  "PMA monthly target for Branch Office?",
  "Explain Rule 6 GDS CE Rules 2020",
  "How to open IPPB account at BO?",
  "என் சம்பளம் தாமதம் — என்ன செய்வது?",
];

const FEATS = [
  { e:"📜", t:"GDS CE Rules 2020",  c:"#7C3AED", d:"Instant, cited answers on conduct, leave, engagement and disciplinary rules — no more hunting through circulars." },
  { e:"🗂️", t:"RTI Drafting",        c:"#2563EB", d:"Generate ready-to-file RTI applications for salary delays, service matters, and postal administration." },
  { e:"💳", t:"Financial Services",  c:"#059669", d:"IPPB, PLI, RPLI, NSC, SSA, MIS guidance — help rural customers with India Post's complete financial suite." },
  { e:"📦", t:"BO Daily Workflow",   c:"#D97706", d:"Checklists, PMA utilization targets, e-BO procedures, and Branch Office management made simple." },
  { e:"🔔", t:"Circulars & Orders",  c:"#DC2626", d:"DOPT orders, postal circulars and service condition updates — contextualised for GDS staff, fast." },
  { e:"🌐", t:"Tamil & English",     c:"#0891B2", d:"Full bilingual support. Built for Tier-2/3 postal workers across Tamil Nadu and all Indian states." },
];

const TECH = [
  { n:"Novita AI",     r:"Model APIs & GPU Cloud",  c:"#7C3AED" },
  { n:"Kilo Code",     r:"AI Coding Agent",          c:"#06B6D4" },
  { n:"React + Vite",  r:"Frontend Framework",        c:"#2563EB" },
  { n:"Anthropic API", r:"claude-sonnet-4-6",         c:"#059669" },
];

export default function App() {
  const [msgs, setMsgs]     = useState([]);
  const [input, setInput]   = useState("");
  const [busy, setBusy]     = useState(false);
  const [typed, setTyped]   = useState("");
  const endRef  = useRef(null);
  const HEADLINE = "Your intelligent postal companion.";

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = KEYFRAMES;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { setTyped(HEADLINE.slice(0, ++i)); if (i >= HEADLINE.length) clearInterval(t); }, 40);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function ask(q) {
    const text = (q || input).trim();
    if (!text || busy) return;
    const history = [...msgs, { role: "user", content: text }];
    setMsgs(history);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: SYSTEM, messages: history }),
      });
      const d = await r.json();
      setMsgs([...history, { role: "assistant", content: d.content?.[0]?.text ?? "Could not get a response." }]);
    } catch { setMsgs([...history, { role: "assistant", content: "Connection error — please try again." }]); }
    setBusy(false);
  }

  return (
    <div style={R.root}>
      <div style={R.aura} aria-hidden>
        <div className="au1" style={{...R.orb, background:"#4c1d95", width:750, height:750, top:-250, left:-200}} />
        <div className="au2" style={{...R.orb, background:"#1e3a8a", width:580, height:580, bottom:0, right:-150}} />
        <div className="au3" style={{...R.orb, background:"#155e75", width:480, height:480, top:"42%", left:"32%"}} />
        <div className="au4" style={{...R.orb, background:"#5b21b6", width:320, height:320, top:"18%", right:"22%"}} />
      </div>

      <nav className="glass" style={R.nav}>
        <div style={R.nL}>
          <div style={R.nBadge}>✉</div>
          <span style={R.nBrand}>PostalMind <span style={{color:"#a78bfa"}}>AI</span></span>
        </div>
        <div style={R.nLinks}>
          {[["Demo","#demo"],["Features","#features"],["About","#about"]].map(([l,h])=>(
            <a key={l} href={h} className="nl" style={R.nLink}>{l}</a>
          ))}
        </div>
        <div className="glass" style={R.nTag}>Novita AI × Kilo Code</div>
      </nav>

      <section style={R.hero}>
        <div className="fu glass" style={R.heroChip}>🇮🇳 Built for India Post GDS Officers · Hackathon 2026</div>
        <h1 className="fu fu1" style={R.h1}>
          <span className="shim">{typed}</span>
          <span style={{animation:"blink 0.9s infinite", display:"inline-block", marginLeft:2, color:"#a78bfa"}}>|</span>
        </h1>
        <p className="fu fu2" style={R.heroSub}>
          AI assistance for GDS Branch Postmasters — GDS CE Rules, RTI drafting,
          BO workflows, and financial services guidance. Powered by Novita AI.
        </p>
        <div className="fu fu3" style={R.ctas}>
          <a href="#demo" className="btn-glow glass" style={R.ctaP}>Try the Demo →</a>
          <a href="#features" style={R.ctaS}>See Features ↓</a>
        </div>
        <div className="fu fu4" style={R.stats}>
          {[["1.5L+","GDS Officers"],["200+","Novita Models"],["2020","Rules Covered"],["24/7","Available"]].map(([n,l])=>(
            <div key={l} className="glass" style={R.stat}>
              <b style={R.stN}>{n}</b>
              <span style={R.stL}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" style={R.sec}>
        <p style={R.lbl}>LIVE DEMO</p>
        <h2 style={R.h2}>Ask PostalMind anything</h2>
        <p style={R.sub}>Powered by Novita AI — GDS rules, RTI help, BO procedures, financial services</p>
        <div className="glass" style={R.chat}>
          {msgs.length === 0 && (
            <div style={R.cpWrap}>
              <p style={R.cpLbl}>💡 Try a question:</p>
              <div style={R.cpRow}>
                {CHIPS.map(c=>(
                  <button key={c} className="chip glass" style={R.cp} onClick={()=>ask(c)}>{c}</button>
                ))}
              </div>
            </div>
          )}
          <div style={R.mList}>
            {msgs.map((m,i)=>(
              <div key={i} style={m.role==="user" ? R.uRow : R.aRow}>
                {m.role==="assistant" && <div style={R.aAv}>✉</div>}
                <div className={m.role==="assistant"?"glass":""} style={m.role==="user"?R.uBub:R.aBub}>
                  {m.role==="assistant" && <p style={R.aFrom}>PostalMind AI</p>}
                  <p style={R.mTxt}>{m.content}</p>
                </div>
              </div>
            ))}
            {busy && (
              <div style={R.aRow}>
                <div style={R.aAv}>✉</div>
                <div className="glass" style={R.aBub}>
                  <p style={R.aFrom}>PostalMind AI</p>
                  <p style={{...R.mTxt,color:"#7c3aed",animation:"blink 1s infinite"}}>Thinking…</p>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="glass" style={R.inpRow}>
            <input
              style={R.inp}
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&ask()}
              placeholder="Ask about GDS leave rules, RTI, PMA targets, IPPB…"
            />
            <button className="btn-glow btn-cyan" style={{...R.sendBtn, opacity:busy?0.5:1}} onClick={()=>ask()} disabled={busy}>
              {busy ? <span style={{animation:"spin 0.9s linear infinite",display:"inline-block"}}>↻</span> : "Send ↑"}
            </button>
          </div>
        </div>
      </section>

      <section id="features" style={R.sec}>
        <p style={R.lbl}>CAPABILITIES</p>
        <h2 style={R.h2}>Built for every postal challenge</h2>
        <p style={R.sub}>From daily operations to complex service matters — PostalMind AI has you covered.</p>
        <div style={R.fGrid}>
          {FEATS.map(f=>(
            <div key={f.t} className="glass gh" style={{...R.fCard, borderColor:f.c+"28"}}>
              <div style={{...R.fIco, background:f.c+"18", border:`1px solid ${f.c}35`, color:f.c}}>{f.e}</div>
              <h3 style={R.fT}>{f.t}</h3>
              <p style={R.fD}>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={R.sec}>
        <div className="glass" style={R.tCard}>
          <div style={R.tInner}>
            <div style={{flex:1}}>
              <p style={R.lbl}>BUILT WITH</p>
              <h2 style={{...R.h2, marginBottom:8}}>Production AI infrastructure</h2>
              <p style={R.sub}>Every layer chosen for reliability and speed.</p>
            </div>
            <div style={R.tGrid}>
              {TECH.map(t=>(
                <div key={t.n} className="glass" style={{...R.tItem, borderColor:t.c+"30"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:t.c,boxShadow:`0 0 8px ${t.c}`,flexShrink:0}}/>
                  <div><p style={R.tN}>{t.n}</p><p style={R.tR}>{t.r}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="about" style={R.sec}>
        <div className="glass" style={R.aCard}>
          <p style={R.lbl}>THE BUILDER</p>
          <h2 style={R.h2}>Built by an ABPM, for GDS officers</h2>
          <p style={R.aTxt}>
            PostalMind AI was built during the{" "}
            <span style={{color:"#a78bfa",fontWeight:600}}>Novita × Kilo Code Hackathon 2026</span>{" "}
            by <strong style={{color:"#e2e8f0"}}>RISHIDAR D.</strong> — a GDS Assistant Branch Postmaster at Sevveri Branch Office
            (BO Facility ID: BO29411310005), Vriddhachalam Sub-Division, Tamil Nadu — who also works
            as a Workflow Analyst and independent Security Researcher.
          </p>
          <p style={R.aTxt}>
            The 1.5 lakh GDS officers serving rural India deserve better tools. PostalMind AI is built
            from lived experience — the actual frustrations of navigating GDS CE Rules, filing RTI
            applications, and managing daily BO operations without proper digital support.
          </p>
          <div style={R.mGrid}>
            {[
              "📍 Sevveri BO · PIN 606106 · Vriddhachalam Sub-Div · Tamil Nadu",
              "🔒 Security Researcher · parzival · Bugcrowd / Cantina / Immunefi",
              "🏗️ Workflow Analyst · Codespace Solutions Inc.",
              "🎓 BCA · Bharathidasan University CDOE",
            ].map(m=>(
              <div key={m} className="glass" style={R.mItem}>{m}</div>
            ))}
          </div>
        </div>
      </section>

      <section style={{...R.sec, textAlign:"center"}}>
        <div className="glass" style={R.ctaBox}>
          <div style={R.ctaGlow}/>
          <p style={R.lbl}>HACKATHON SUBMISSION</p>
          <h2 style={{...R.h2, fontSize:30}}>Novita × Kilo Code Hackathon · July 2026</h2>
          <p style={R.sub}>A real tool solving a real problem for 1.5 lakh GDS officers — built in one sprint.</p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginTop:28}}>
            <a href="#demo" className="btn-glow glass" style={R.ctaP}>Try Live Demo →</a>
            <a href="https://novita.ai" target="_blank" rel="noreferrer" style={R.ctaS}>Novita AI ↗</a>
            <a href="https://kilocode.ai" target="_blank" rel="noreferrer" style={R.ctaS}>Kilo Code ↗</a>
          </div>
        </div>
      </section>

      <footer className="glass" style={R.foot}>
        <div style={R.ftTop}>
          <div>
            <div style={R.ftLogo}>✉ PostalMind AI</div>
            <p style={R.ftSub}>AI companion for India Post GDS Officers</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {["Novita AI","Kilo Code","React","Tamil Nadu"].map(t=>(
              <span key={t} className="glass" style={R.ftTag}>{t}</span>
            ))}
          </div>
        </div>
        <div style={R.ftDiv}/>
        <p style={R.ftCopy}>© 2026 RISHIDAR D. · Novita × Kilo Code Hackathon · Built at Sevveri BO, Tamil Nadu 🇮🇳</p>
      </footer>
    </div>
  );
}

const R = {
  root:{ minHeight:"100vh", background:"#030308", color:"#e2e8f0", fontFamily:"'Inter',system-ui,sans-serif", overflowX:"hidden", position:"relative" },
  aura:{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" },
  orb:{ position:"absolute", borderRadius:"50%", filter:"blur(110px)", opacity:0.17 },
  nav:{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 28px", borderBottom:"1px solid rgba(255,255,255,0.055)" },
  nL:{ display:"flex", alignItems:"center", gap:9 },
  nBadge:{ width:31, height:31, borderRadius:8, background:"linear-gradient(135deg,#7c3aed,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 },
  nBrand:{ fontSize:16, fontWeight:700, fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-0.3px" },
  nLinks:{ display:"flex", gap:26 },
  nLink:{ color:"rgba(255,255,255,0.5)", textDecoration:"none", fontSize:13, fontWeight:500, transition:"color 0.18s" },
  nTag:{ fontSize:10, fontWeight:700, color:"#a78bfa", padding:"4px 11px", borderRadius:20, letterSpacing:"0.5px" },
  hero:{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"120px 20px 80px" },
  heroChip:{ borderRadius:20, padding:"6px 15px", fontSize:11, fontWeight:700, color:"#c4b5fd", letterSpacing:"0.4px", marginBottom:26, border:"1px solid rgba(124,58,237,0.35)", background:"rgba(124,58,237,0.12)" },
  h1:{ fontSize:"clamp(34px,6vw,70px)", fontWeight:800, lineHeight:1.14, letterSpacing:"-2px", marginBottom:22, maxWidth:760, fontFamily:"'Space Grotesk',sans-serif" },
  heroSub:{ fontSize:"clamp(14px,2vw,17px)", lineHeight:1.72, color:"rgba(255,255,255,0.45)", maxWidth:560, marginBottom:38 },
  ctas:{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", marginBottom:60 },
  ctaP:{ padding:"12px 26px", borderRadius:11, fontSize:14, fontWeight:600, color:"#fff", textDecoration:"none", border:"1px solid rgba(167,139,250,0.38)", background:"rgba(124,58,237,0.18)" },
  ctaS:{ padding:"12px 26px", borderRadius:11, fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.5)", textDecoration:"none", transition:"color 0.2s" },
  stats:{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" },
  stat:{ padding:"13px 20px", borderRadius:11, textAlign:"center", minWidth:105 },
  stN:{ display:"block", fontSize:21, fontWeight:800, color:"#a78bfa", fontFamily:"'Space Grotesk',sans-serif" },
  stL:{ display:"block", fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2, letterSpacing:"0.3px" },
  sec:{ position:"relative", zIndex:1, maxWidth:860, margin:"0 auto", padding:"72px 20px" },
  lbl:{ fontSize:10, fontWeight:700, letterSpacing:"2px", color:"#7c3aed", marginBottom:10 },
  h2:{ fontSize:"clamp(22px,4vw,38px)", fontWeight:800, letterSpacing:"-1px", marginBottom:10, fontFamily:"'Space Grotesk',sans-serif" },
  sub:{ color:"rgba(255,255,255,0.4)", fontSize:14, lineHeight:1.65, marginBottom:36 },
  chat:{ borderRadius:18, overflow:"hidden", border:"1px solid rgba(255,255,255,0.075)" },
  cpWrap:{ padding:"22px 22px 0" },
  cpLbl:{ fontSize:11, color:"rgba(255,255,255,0.32)", marginBottom:10 },
  cpRow:{ display:"flex", flexWrap:"wrap", gap:7 },
  cp:{ padding:"6px 13px", borderRadius:18, fontSize:12, color:"rgba(255,255,255,0.55)", cursor:"pointer", border:"1px solid rgba(255,255,255,0.09)", background:"transparent", transition:"all 0.2s", textAlign:"left", lineHeight:1.4, fontFamily:"'Inter',sans-serif" },
  mList:{ padding:"20px", minHeight:100, maxHeight:340, overflowY:"auto", display:"flex", flexDirection:"column", gap:14 },
  uRow:{ display:"flex", justifyContent:"flex-end" },
  aRow:{ display:"flex", alignItems:"flex-start", gap:9 },
  aAv:{ width:27, height:27, borderRadius:7, background:"linear-gradient(135deg,#7c3aed,#2563eb)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, flexShrink:0, marginTop:2 },
  uBub:{ background:"linear-gradient(135deg,rgba(124,58,237,0.28),rgba(37,99,235,0.28))", border:"1px solid rgba(167,139,250,0.22)", borderRadius:"13px 3px 13px 13px", padding:"9px 13px", maxWidth:"72%" },
  aBub:{ borderRadius:"3px 13px 13px 13px", padding:"9px 13px", maxWidth:"80%", border:"1px solid rgba(255,255,255,0.075)" },
  aFrom:{ fontSize:9, fontWeight:700, color:"#7c3aed", letterSpacing:"0.5px", marginBottom:4 },
  mTxt:{ fontSize:13, lineHeight:1.68, color:"rgba(255,255,255,0.82)", whiteSpace:"pre-wrap" },
  inpRow:{ display:"flex", gap:9, padding:"12px 14px", borderTop:"1px solid rgba(255,255,255,0.06)" },
  inp:{ flex:1, background:"transparent", border:"none", color:"#e2e8f0", fontSize:13, padding:"7px 4px", fontFamily:"'Inter',sans-serif" },
  sendBtn:{ padding:"8px 18px", borderRadius:9, border:"1px solid rgba(6,182,212,0.38)", background:"rgba(6,182,212,0.13)", color:"#67e8f9", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.2s", fontFamily:"'Inter',sans-serif" },
  fGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))", gap:14 },
  fCard:{ borderRadius:15, padding:"22px", border:"1px solid rgba(255,255,255,0.075)" },
  fIco:{ width:42, height:42, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, marginBottom:14 },
  fT:{ fontSize:15, fontWeight:700, marginBottom:7, fontFamily:"'Space Grotesk',sans-serif" },
  fD:{ fontSize:12, color:"rgba(255,255,255,0.42)", lineHeight:1.65 },
  tCard:{ borderRadius:18, padding:"36px", border:"1px solid rgba(255,255,255,0.075)" },
  tInner:{ display:"flex", gap:36, flexWrap:"wrap", justifyContent:"space-between" },
  tGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(185px,1fr))", gap:10, flex:1, minWidth:280 },
  tItem:{ padding:"13px 15px", borderRadius:11, display:"flex", alignItems:"center", gap:11, border:"1px solid" },
  tN:{ fontSize:13, fontWeight:600 },
  tR:{ fontSize:11, color:"rgba(255,255,255,0.38)", marginTop:2 },
  aCard:{ borderRadius:18, padding:"36px", border:"1px solid rgba(255,255,255,0.075)" },
  aTxt:{ fontSize:13, lineHeight:1.78, color:"rgba(255,255,255,0.55)", marginBottom:14 },
  mGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:9, marginTop:22 },
  mItem:{ padding:"9px 14px", borderRadius:9, fontSize:11, color:"rgba(255,255,255,0.5)", border:"1px solid rgba(255,255,255,0.075)" },
  ctaBox:{ borderRadius:22, padding:"55px 36px", textAlign:"center", position:"relative", overflow:"hidden", border:"1px solid rgba(167,139,250,0.18)" },
  ctaGlow:{ position:"absolute", top:"-60%", left:"20%", width:450, height:450, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.18),transparent 70%)", pointerEvents:"none" },
  foot:{ position:"relative", zIndex:1, borderTop:"1px solid rgba(255,255,255,0.055)", padding:"28px", marginTop:10 },
  ftTop:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16, flexWrap:"wrap", marginBottom:18 },
  ftLogo:{ fontSize:17, fontWeight:800, fontFamily:"'Space Grotesk',sans-serif", marginBottom:3 },
  ftSub:{ fontSize:11, color:"rgba(255,255,255,0.32)" },
  ftTag:{ padding:"3px 9px", borderRadius:18, fontSize:10, color:"rgba(255,255,255,0.42)", border:"1px solid rgba(255,255,255,0.075)" },
  ftDiv:{ height:1, background:"rgba(255,255,255,0.055)", marginBottom:14 },
  ftCopy:{ fontSize:10, color:"rgba(255,255,255,0.28)", textAlign:"center" },
};
