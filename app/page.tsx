import Chat from '@/components/chat';
import { Mail, ArrowRight, BookOpen, FileText, CreditCard, Package, Bell, Globe } from 'lucide-react';

function GradientOrb({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-[110px] opacity-[0.17] pointer-events-none ${className}`} />;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#030308] text-slate-200 font-sans overflow-x-hidden relative">
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <GradientOrb className="w-[750px] h-[750px] -top-[250px] -left-[200px] bg-violet-900" />
        <GradientOrb className="w-[580px] h-[580px] bottom-0 -right-[150px] bg-blue-900" />
        <GradientOrb className="w-[480px] h-[480px] top-[42%] left-[32%] bg-cyan-900" />
        <GradientOrb className="w-[320px] h-[320px] top-[18%] right-[22%] bg-violet-800" />
      </div>

      <nav className="glass fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-7 py-3.5 border-b border-white/[0.055]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-sm">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold font-display tracking-tight">
            PostalMind <span className="text-violet-400">AI</span>
          </span>
        </div>
        <div className="hidden sm:flex gap-7">
          <a href="#demo" className="text-white/50 hover:text-white/80 text-[13px] font-medium transition-colors">Demo</a>
          <a href="#features" className="text-white/50 hover:text-white/80 text-[13px] font-medium transition-colors">Features</a>
          <a href="#about" className="text-white/50 hover:text-white/80 text-[13px] font-medium transition-colors">About</a>
        </div>
      </nav>

      <section className="relative z-[1] min-h-screen flex flex-col items-center justify-center text-center px-5 pt-[120px] pb-20">
        <div className="glass rounded-[20px] px-4 py-1.5 text-[11px] font-bold text-violet-400 tracking-wider mb-6 border border-violet-500/35 bg-violet-600/10">
          🇮🇳 Built for India Post GDS Officers · Hackathon 2026
        </div>
        <h1 className="text-[clamp(34px,6vw,70px)] font-extrabold leading-[1.14] tracking-tight mb-5 max-w-[760px] font-display">
          <span className="shim">Your intelligent postal companion.</span>
          <span className="animate-blink inline-block ml-0.5 text-violet-400">|</span>
        </h1>
        <p className="text-[clamp(14px,2vw,17px)] leading-relaxed text-white/45 max-w-[560px] mb-9">
          AI assistance for GDS Branch Postmasters — GDS CE Rules, RTI drafting, BO workflows, and financial services
          guidance. Powered by Google Gemini.
        </p>
        <div className="flex gap-3 flex-wrap justify-center mb-14">
          <a href="#demo" className="btn-glow glass px-6 py-3 rounded-[11px] text-sm font-semibold text-white border border-violet-400/40 bg-violet-600/20 flex items-center gap-2">
            Try the Demo <ArrowRight className="w-4 h-4" />
          </a>
          <a href="#features" className="px-6 py-3 rounded-[11px] text-sm font-semibold text-white/50 hover:text-white/80 transition-colors">
            See Features ↓
          </a>
        </div>
        <div className="flex gap-2.5 flex-wrap justify-center">
          {[
            { value: '1.5L+', label: 'GDS Officers' },
            { value: '200+', label: 'AI Models' },
            { value: '2020', label: 'Rules Covered' },
            { value: '24/7', label: 'Available' },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-[11px] px-5 py-3.5 text-center min-w-[105px]">
              <b className="block text-[21px] font-extrabold text-violet-400 font-display">{stat.value}</b>
              <span className="block text-[10px] text-white/40 mt-0.5 tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="relative z-[1] max-w-[860px] mx-auto px-5 py-[72px]">
        <Chat />
      </section>

      <section id="features" className="relative z-[1] max-w-[860px] mx-auto px-5 py-[72px]">
        <p className="text-[10px] font-bold tracking-[2px] text-violet-600 mb-2.5">CAPABILITIES</p>
        <h2 className="text-[clamp(22px,4vw,38px)] font-extrabold tracking-tight mb-2.5 font-display">
          Built for every postal challenge
        </h2>
        <p className="text-white/40 text-sm leading-relaxed mb-9">
          From daily operations to complex service matters — PostalMind AI has you covered.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            { icon: <BookOpen className="w-5 h-5" />, color: 'violet', title: 'GDS CE Rules 2020', desc: 'Instant, cited answers on conduct, leave, engagement and disciplinary rules.' },
            { icon: <FileText className="w-5 h-5" />, color: 'blue', title: 'RTI Drafting', desc: 'Generate ready-to-file RTI applications for salary delays and service matters.' },
            { icon: <CreditCard className="w-5 h-5" />, color: 'emerald', title: 'Financial Services', desc: 'IPPB, PLI, RPLI, NSC, SSA, MIS guidance for rural customers.' },
            { icon: <Package className="w-5 h-5" />, color: 'amber', title: 'BO Daily Workflow', desc: 'Checklists, PMA utilization targets, e-BO procedures, and management.' },
            { icon: <Bell className="w-5 h-5" />, color: 'red', title: 'Circulars & Orders', desc: 'DOPT orders and postal circulars — contextualised for GDS staff.' },
            { icon: <Globe className="w-5 h-5" />, color: 'cyan', title: 'Tamil & English', desc: 'Full bilingual support for Tier-2/3 postal workers across all states.' },
          ].map((feat) => (
            <div key={feat.title} className={`gh glass rounded-[15px] p-5.5 border ${feat.color === 'violet' ? 'border-violet-600/15' : feat.color === 'blue' ? 'border-blue-600/15' : feat.color === 'emerald' ? 'border-emerald-600/15' : feat.color === 'amber' ? 'border-amber-600/15' : feat.color === 'red' ? 'border-red-600/15' : 'border-cyan-600/15'}`}>
              <div className={`w-10.5 h-10.5 rounded-[11px] flex items-center justify-center text-lg mb-3.5 ${feat.color === 'violet' ? 'bg-violet-600/10 border border-violet-600/20 text-violet-600' : feat.color === 'blue' ? 'bg-blue-600/10 border border-blue-600/20 text-blue-600' : feat.color === 'emerald' ? 'bg-emerald-600/10 border border-emerald-600/20 text-emerald-600' : feat.color === 'amber' ? 'bg-amber-600/10 border border-amber-600/20 text-amber-600' : feat.color === 'red' ? 'bg-red-600/10 border border-red-600/20 text-red-600' : 'bg-cyan-600/10 border border-cyan-600/20 text-cyan-600'}`}>
                {feat.icon}
              </div>
              <h3 className="text-[15px] font-bold mb-1.5 font-display">{feat.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-[1] max-w-[860px] mx-auto px-5 py-[72px]">
        <div className="glass rounded-[18px] p-9 border border-white/[0.075]">
          <div className="flex gap-9 flex-wrap justify-between">
            <div className="flex-1">
              <p className="text-[10px] font-bold tracking-[2px] text-violet-600 mb-2.5">BUILT WITH</p>
              <h2 className="text-[clamp(22px,4vw,38px)] font-extrabold tracking-tight mb-2 font-display">Production AI infrastructure</h2>
              <p className="text-white/40 text-sm leading-relaxed mb-9">Every layer chosen for reliability and speed.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 min-w-[280px]">
              {[
                { name: 'Google Gemini', desc: 'AI Model (Free Tier)', color: 'bg-violet-600 shadow-violet-600' },
                { name: 'React + Next.js', desc: 'Fullstack Framework', color: 'bg-blue-600 shadow-blue-600' },
                { name: 'Vercel', desc: 'Hosting & Serverless', color: 'bg-cyan-500 shadow-cyan-500' },
                { name: 'Tailwind CSS', desc: 'Styling', color: 'bg-emerald-600 shadow-emerald-600' },
              ].map((tech) => (
                <div key={tech.name} className="glass rounded-[11px] p-3.5 flex items-center gap-2.5 border border-white/[0.075]">
                  <div className={`w-2.5 h-2.5 rounded-full ${tech.color} shadow-[0_0_8px]`} />
                  <div>
                    <p className="text-[13px] font-semibold">{tech.name}</p>
                    <p className="text-[11px] text-white/40 mt-0.5">{tech.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="relative z-[1] max-w-[860px] mx-auto px-5 py-[72px]">
        <div className="glass rounded-[18px] p-9 border border-white/[0.075]">
          <p className="text-[10px] font-bold tracking-[2px] text-violet-600 mb-2.5">THE BUILDER</p>
          <h2 className="text-[clamp(22px,4vw,38px)] font-extrabold tracking-tight mb-2.5 font-display">Built by an ABPM, for GDS officers</h2>
          <p className="text-[13px] leading-[1.78] text-white/55 mb-3.5">
            PostalMind AI was built during the <span className="text-violet-400 font-semibold">Novita × Kilo Code Hackathon 2026</span> by <strong className="text-slate-200">RISHIDAR D.</strong> — a GDS Assistant Branch Postmaster at Sevveri Branch Office (BO Facility ID: BO29411310005), Vriddhachalam Sub-Division, Tamil Nadu.
          </p>
          <p className="text-[13px] leading-[1.78] text-white/55 mb-3.5">
            The 1.5 lakh GDS officers serving rural India deserve better tools. PostalMind AI is built from lived experience — navigating GDS CE Rules, filing RTI applications, and managing daily BO operations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5">
            {['📍 Sevveri BO · PIN 606106 · Vriddhachalam Sub-Div · Tamil Nadu', '🔒 Security Researcher · parzival · Bugcrowd / Cantina / Immunefi', '🏗️ Workflow Analyst · Codespace Solutions Inc.', '🎓 BCA · Bharathidasan University CDOE'].map((tag) => (
              <div key={tag} className="glass rounded-lg px-3.5 py-2 text-[11px] text-white/50 border border-white/[0.075]">{tag}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-[1] max-w-[860px] mx-auto px-5 py-[72px] text-center">
        <div className="glass rounded-[22px] p-14 px-9 text-center relative overflow-hidden border border-violet-400/20">
          <div className="absolute -top-[60%] left-[20%] w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.18),transparent_70%)] pointer-events-none" />
          <p className="text-[10px] font-bold tracking-[2px] text-violet-600 mb-2.5">HACKATHON SUBMISSION</p>
          <h2 className="text-[30px] font-extrabold tracking-tight mb-2.5 font-display">Novita × Kilo Code Hackathon · July 2026</h2>
          <p className="text-white/40 text-sm leading-relaxed mb-9">A real tool solving a real problem for 1.5 lakh GDS officers — built in one sprint.</p>
          <div className="flex gap-3 justify-center flex-wrap mt-7">
            <a href="#demo" className="btn-glow glass px-6 py-3 rounded-[11px] text-sm font-semibold text-white border border-violet-400/40 bg-violet-600/20 flex items-center gap-2">Try Live Demo <ArrowRight className="w-4 h-4" /></a>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-[11px] text-sm font-semibold text-white/50 hover:text-white/80 transition-colors">Get Gemini API Key ↗</a>
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-[11px] text-sm font-semibold text-white/50 hover:text-white/80 transition-colors">Deploy on Vercel ↗</a>
          </div>
        </div>
      </section>

      <footer className="glass relative z-[1] border-t border-white/[0.055] px-7 py-7 mt-2.5">
        <div className="flex justify-between items-start gap-4 flex-wrap mb-4.5">
          <div>
            <div className="text-[17px] font-extrabold font-display mb-0.5">✉ PostalMind AI</div>
            <p className="text-[11px] text-white/30">AI companion for India Post GDS Officers</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {['Google Gemini', 'Vercel', 'React', 'Tamil Nadu'].map((tag) => (
              <span key={tag} className="glass px-2 py-0.5 rounded-[18px] text-[10px] text-white/40 border border-white/[0.075]">{tag}</span>
            ))}
          </div>
        </div>
        <div className="h-px bg-white/[0.055] mb-3.5" />
        <p className="text-[10px] text-white/25 text-center">© 2026 RISHIDAR D. · Novita × Kilo Code Hackathon · Built at Sevveri BO, Tamil Nadu 🇮🇳</p>
      </footer>
    </div>
  );
}
