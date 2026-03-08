import React, { useState, useEffect, useMemo, useRef } from 'react';

// Load Work Sans font
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@1,800&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);
import {
  Mountain, Search, ChevronRight, Sparkles, Loader2,
  Gamepad2, RefreshCcw, Globe, AlertTriangle, Command,
  Activity, UtensilsCrossed, Coffee
} from 'lucide-react';



const callClaude = async (userPrompt, systemPrompt) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  if (!response.ok) throw new Error(`Status ${response.status}`);
  const data = await response.json();
  return data.content?.map((b) => b.text || "").join("") || "";
};

export default function App() {
  const [search, setSearch] = useState("");
  const [resorts, setResorts] = useState({});
  const [selectedResort, setSelectedResort] = useState(null);
  const defaultResort = "Summit at Snoqualmie";
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("report");
  const [terminalLogs, setTerminalLogs] = useState(["BOOTING SYSTEM...", "UPLINK ESTABLISHED."]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef(null);

  const [hypeReport, setHypeReport] = useState("");
  const [isGeneratingHype, setIsGeneratingHype] = useState(false);
  const [gearAdvice, setGearAdvice] = useState("");
  const [isGeneratingGear, setIsGeneratingGear] = useState(false);
  const [localSpots, setLocalSpots] = useState(null);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);

  const resort = resorts[selectedResort];
  const addLog = (msg) => setTerminalLogs((prev) => [...prev.slice(-3), `> ${msg.toUpperCase()}`]);
  const shadow = (color) => ({ boxShadow: `6px 6px 0px ${color}` });

  const fetchGlobalResort = async (resortName) => {
    if (!resortName || resortName.length < 3) return;
    addLog(`SCANNING FOR ${resortName.toUpperCase()}...`);
    setIsGlobalLoading(true);
    setIsSearching(false);
    setError("");
    try {
      // Get lat/lon via geocoding
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(resortName)}&count=1`);
      const geoData = await geoRes.json();
      let lat = null, lon = null, region = "";
      if (geoData.results && geoData.results[0]) {
        lat = geoData.results[0].latitude;
        lon = geoData.results[0].longitude;
        region = [geoData.results[0].admin1, geoData.results[0].country_code].filter(Boolean).join(", ");
      }
      // Get real weather forecast from Open-Meteo
      let weatherForecast = null;
      if (lat) {
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,snowfall_sum&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=5`);
        const wxData = await wxRes.json();
        if (wxData.daily) {
          weatherForecast = wxData.daily.time.map((date, i) => {
            const d = new Date(date + "T12:00:00");
            const snowIn = Math.round(wxData.daily.snowfall_sum[i] * 10) / 10;
            return {
              day: d.toLocaleDateString("en-US", { weekday: "long" }),
              date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              high: Math.round(wxData.daily.temperature_2m_max[i]),
              low: Math.round(wxData.daily.temperature_2m_min[i]),
              snow: snowIn > 0 ? `${snowIn}"` : "0"
            };
          });
        }
      }
      // Get resort details from Claude
      const sys = `You are a ski resort data expert. Return ONLY valid JSON, no markdown, no backticks:
{
  "region": "State/Country",
  "current": { "tempF": number, "wind": "string", "newSnowIn": number, "baseIn": number, "condition": "string", "lifts": "X/Y", "trails": "X/Y" },
  "forecast": [
    {"day":"Sunday","high":number,"low":number,"snow":"Nin"},
    {"day":"Monday","high":number,"low":number,"snow":"Nin"},
    {"day":"Tuesday","high":number,"low":number,"snow":"Nin"},
    {"day":"Wednesday","high":number,"low":number,"snow":"Nin"},
    {"day":"Thursday","high":number,"low":number,"snow":"Nin"}
  ]
}`;
      const raw = await callClaude(`Snow report for: ${resortName}`, sys);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      if (weatherForecast) parsed.forecast = weatherForecast;
      if (region) parsed.region = region;
      setResorts((prev) => ({ ...prev, [resortName]: parsed }));
      setSelectedResort(resortName);
      setSearch("");
      addLog(`TRANSMISSION COMPLETE: ${resortName.toUpperCase()} IS LIVE.`);
    } catch {
      setError("SIGNAL LOST: UNABLE TO DECODE MOUNTAIN DATA.");
      addLog("FETCH ERROR: CONNECTION FAILURE.");
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const generateHype = async () => {
    if (!resort || isGeneratingHype) return;
    setIsGeneratingHype(true);
    try {
      const result = await callClaude(
        `Hype report for ${selectedResort}: ${resort.current.tempF}F, ${resort.current.newSnowIn}" fresh snow, ${resort.current.condition}.`,
        "You are an 80s ski announcer. Use radical 80s ski slang. 2-3 sentences max. If conditions mention rain or wet, sound genuinely bummed out and sad about it. If conditions mention ice or icy, urgently warn the skier — edges matter, wipe-outs are real. Otherwise be totally gnarly and stoked."
      );
      setHypeReport(result);
    } catch {
      setHypeReport("Stoke levels are high, vibes are righteous!");
    } finally {
      setIsGeneratingHype(false);
    }
  };

  const generateGear = async () => {
    if (isGeneratingGear) return;
    setIsGeneratingGear(true);
    try {
      const result = await callClaude(
        `${resort.current.tempF}F, ${resort.current.condition} at ${selectedResort}. Suggest radical 80s neon ski gear.`,
        "You are an 80s ski fashion guru. Recommend neon gear, era brands, styling tips. Fun, radical, totally 80s. 3-4 sentences."
      );
      setGearAdvice(result);
    } catch {
      setGearAdvice("Just rock the neon pink one-piece, man!");
    } finally {
      setIsGeneratingGear(false);
    }
  };

  const fetchLocalSpots = async () => {
    if (isLoadingSpots) return;
    setIsLoadingSpots(true);
    setLocalSpots(null);
    try {
      const sys = `You are a local food and coffee expert. Return ONLY valid JSON, no markdown, no backticks:
{
  "restaurants": [
    { "name": "string", "vibe": "string", "mustOrder": "string", "priceRange": "$/$$/$$$/$$$$" },
    { "name": "string", "vibe": "string", "mustOrder": "string", "priceRange": "$/$$/$$$/$$$$" },
    { "name": "string", "vibe": "string", "mustOrder": "string", "priceRange": "$/$$/$$$/$$$$" },
    { "name": "string", "vibe": "string", "mustOrder": "string", "priceRange": "$/$$/$$$/$$$$" },
    { "name": "string", "vibe": "string", "mustOrder": "string", "priceRange": "$/$$/$$$/$$$$" }
  ],
  "coffee": [
    { "name": "string", "vibe": "string", "mustOrder": "string" },
    { "name": "string", "vibe": "string", "mustOrder": "string" },
    { "name": "string", "vibe": "string", "mustOrder": "string" }
  ]
}`;
      const raw = await callClaude(
        `List popular local restaurants and coffee shops near ${selectedResort} ski resort in ${resort.region}. Focus on spots skiers actually go — apres-ski bars, burger joints, cozy cafes, etc.`,
        sys
      );
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setLocalSpots(parsed);
      addLog(`LOCAL INTEL LOADED: ${selectedResort.toUpperCase()}`);
    } catch {
      setLocalSpots({ error: true });
    } finally {
      setIsLoadingSpots(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsSearching(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    fetchGlobalResort(defaultResort);
  }, []);

  useEffect(() => {
    if (resorts[selectedResort]) {
      generateHype();
      setGearAdvice("");
      setLocalSpots(null);
    }
  }, [selectedResort]);

  const filteredResorts = useMemo(
    () => Object.keys(resorts).filter((n) =>
      n.toLowerCase().includes(search.toLowerCase()) ||
      resorts[n].region.toLowerCase().includes(search.toLowerCase())
    ),
    [search, resorts]
  );

  return (
    <div className="min-h-screen bg-black text-pink-50 font-sans pb-24 overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(to right, #ec4899 1px, transparent 1px), linear-gradient(to bottom, #ec4899 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          transform: "perspective(500px) rotateX(60deg)",
          height: "200%", top: "-50%",
        }} />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <div style={{display:"inline-flex", flexDirection:"column", alignItems:"flex-start"}}>
              <div style={{paddingLeft:"calc(13.2em - 22px)", marginBottom:"-8px", lineHeight:1}}>
                <svg width="40" height="22" viewBox="0 0 40 22" fill="none"><rect x="0" y="18" width="10" height="1" rx="1" fill="#22d3ee"/><rect x="1" y="20" width="7" height="1" rx="1" fill="#a5f3fc"/><rect x="4" y="22" width="4" height="1" rx="1" fill="#67e8f9"/><rect x="11" y="16" width="2" height="2" fill="#ffffff"/><rect x="13" y="16" width="2" height="2" fill="#ffffff"/><rect x="15" y="16" width="2" height="2" fill="#ffffff"/><rect x="17" y="16" width="2" height="2" fill="#ffffff"/><rect x="19" y="16" width="2" height="2" fill="#ffffff"/><rect x="21" y="16" width="2" height="2" fill="#ffffff"/><rect x="23" y="16" width="2" height="2" fill="#ffffff"/><rect x="25" y="16" width="2" height="2" fill="#ffffff"/><rect x="27" y="16" width="2" height="2" fill="#ffffff"/><rect x="29" y="16" width="2" height="2" fill="#ffffff"/><rect x="31" y="16" width="2" height="2" fill="#ffffff"/><rect x="11" y="18" width="2" height="2" fill="#ffffff"/><rect x="13" y="18" width="2" height="2" fill="#ffffff"/><rect x="15" y="18" width="2" height="2" fill="#ffffff"/><rect x="17" y="18" width="2" height="2" fill="#ffffff"/><rect x="19" y="18" width="2" height="2" fill="#ffffff"/><rect x="21" y="18" width="2" height="2" fill="#ffffff"/><rect x="23" y="18" width="2" height="2" fill="#ffffff"/><rect x="25" y="18" width="2" height="2" fill="#ffffff"/><rect x="27" y="18" width="2" height="2" fill="#ffffff"/><rect x="29" y="18" width="2" height="2" fill="#ffffff"/><rect x="31" y="18" width="2" height="2" fill="#ffffff"/><rect x="11" y="20" width="2" height="2" fill="#94a3b8"/><rect x="13" y="20" width="2" height="2" fill="#94a3b8"/><rect x="15" y="20" width="2" height="2" fill="#94a3b8"/><rect x="17" y="20" width="2" height="2" fill="#94a3b8"/><rect x="19" y="20" width="2" height="2" fill="#94a3b8"/><rect x="21" y="20" width="2" height="2" fill="#94a3b8"/><rect x="23" y="20" width="2" height="2" fill="#94a3b8"/><rect x="25" y="20" width="2" height="2" fill="#94a3b8"/><rect x="27" y="20" width="2" height="2" fill="#94a3b8"/><rect x="29" y="20" width="2" height="2" fill="#94a3b8"/><rect x="31" y="20" width="2" height="2" fill="#94a3b8"/><rect x="18" y="0" width="2" height="2" fill="#a5f3fc"/><rect x="20" y="0" width="2" height="2" fill="#a5f3fc"/><rect x="22" y="0" width="2" height="2" fill="#a5f3fc"/><rect x="24" y="0" width="2" height="2" fill="#a5f3fc"/><rect x="16" y="2" width="2" height="2" fill="#a5f3fc"/><rect x="18" y="2" width="2" height="2" fill="#22d3ee"/><rect x="20" y="2" width="2" height="2" fill="#22d3ee"/><rect x="22" y="2" width="2" height="2" fill="#22d3ee"/><rect x="24" y="2" width="2" height="2" fill="#a5f3fc"/><rect x="16" y="4" width="2" height="2" fill="#22d3ee"/><rect x="18" y="4" width="2" height="2" fill="#22d3ee"/><rect x="20" y="4" width="2" height="2" fill="#22d3ee"/><rect x="22" y="4" width="2" height="2" fill="#22d3ee"/><rect x="24" y="4" width="2" height="2" fill="#22d3ee"/><rect x="26" y="4" width="2" height="2" fill="#0a0a1a"/><rect x="14" y="6" width="2" height="2" fill="#0e7490"/><rect x="16" y="6" width="2" height="2" fill="#22d3ee"/><rect x="18" y="6" width="2" height="2" fill="#22d3ee"/><rect x="20" y="6" width="2" height="2" fill="#e0f9ff"/><rect x="22" y="6" width="2" height="2" fill="#e0f9ff"/><rect x="24" y="6" width="2" height="2" fill="#22d3ee"/><rect x="26" y="6" width="2" height="2" fill="#fbbf24"/><rect x="28" y="6" width="2" height="2" fill="#fbbf24"/><rect x="12" y="8" width="2" height="2" fill="#0e7490"/><rect x="14" y="8" width="2" height="2" fill="#0e7490"/><rect x="16" y="8" width="2" height="2" fill="#22d3ee"/><rect x="18" y="8" width="2" height="2" fill="#22d3ee"/><rect x="20" y="8" width="2" height="2" fill="#e0f9ff"/><rect x="22" y="8" width="2" height="2" fill="#e0f9ff"/><rect x="24" y="8" width="2" height="2" fill="#22d3ee"/><rect x="26" y="8" width="2" height="2" fill="#22d3ee"/><rect x="14" y="10" width="2" height="2" fill="#0e7490"/><rect x="16" y="10" width="2" height="2" fill="#0e7490"/><rect x="18" y="10" width="2" height="2" fill="#22d3ee"/><rect x="20" y="10" width="2" height="2" fill="#22d3ee"/><rect x="22" y="10" width="2" height="2" fill="#22d3ee"/><rect x="24" y="10" width="2" height="2" fill="#22d3ee"/><rect x="16" y="12" width="2" height="2" fill="#0e7490"/><rect x="18" y="12" width="2" height="2" fill="#22d3ee"/><rect x="20" y="12" width="2" height="2" fill="#22d3ee"/><rect x="22" y="12" width="2" height="2" fill="#22d3ee"/><rect x="24" y="12" width="2" height="2" fill="#0e7490"/><rect x="18" y="14" width="2" height="2" fill="#0e7490"/><rect x="20" y="14" width="2" height="2" fill="#22d3ee"/><rect x="22" y="14" width="2" height="2" fill="#0e7490"/></svg>
              </div>
              <h1 className="font-black italic tracking-tighter uppercase" style={{fontFamily:"'Work Sans', sans-serif", fontSize:"clamp(2.5rem,8vw,3.75rem)", lineHeight:1}}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-pink-500">BLUEB</span><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">I</span><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">RD</span>
              </h1>
            </div>
            <p className="text-pink-400 text-xs font-black tracking-widest uppercase mt-1 italic">AI Powered Mountain Reports</p>
          </div>
          <div className="flex gap-2">
            {[{ id: "report", I: Mountain }, { id: "gear", I: Gamepad2 }, { id: "spots", I: UtensilsCrossed }].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`p-3 border-2 transition-all ${activeTab === t.id ? "border-pink-500 bg-pink-500 text-black" : "border-neutral-800 text-neutral-500 hover:border-cyan-500"}`}>
                <t.I className="w-5 h-5" />
              </button>
            ))}
          </div>
        </header>

        <div className="mb-4 bg-neutral-900 border-2 border-neutral-800 p-2 font-mono text-xs uppercase tracking-tighter text-cyan-500 flex items-center gap-3 overflow-hidden">
          <div className="bg-cyan-500 text-black px-1 font-black flex items-center gap-1 shrink-0 text-xs">
            <Command className="w-2 h-2" /> STATUS
          </div>
          <div className="flex gap-4 whitespace-nowrap overflow-hidden">
            {terminalLogs.map((log, i) => <span key={i} className="opacity-80">[{log}]</span>)}
          </div>
        </div>

        <div className="relative mb-6" ref={searchRef}>
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
            {isGlobalLoading ? <Loader2 className="h-5 w-5 text-pink-500 animate-spin" /> : <Search className="h-5 w-5 text-pink-500" />}
          </div>
          <input
            type="text"
            className="w-full bg-black border-2 border-cyan-500 py-4 pl-12 pr-4 focus:outline-none focus:border-pink-500 text-lg placeholder:text-neutral-700"
            style={shadow("#ec4899")}
            placeholder="SEARCH ANY PEAK..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIsSearching(true); }}
            onFocus={() => setIsSearching(true)}
            onKeyDown={(e) => e.key === "Enter" && fetchGlobalResort(search)}
          />
          {isSearching && (
            <div className="absolute z-50 w-full mt-2 bg-black border-2 border-pink-500" style={shadow("#06b6d4")}>
              {filteredResorts.map((name) => (
                <button key={name} onClick={() => { setSelectedResort(name); setSearch(""); setIsSearching(false); }}
                  className="w-full text-left px-6 py-4 hover:bg-neutral-900 border-b border-neutral-900 flex justify-between group">
                  <div>
                    <span className="font-black block uppercase italic group-hover:text-pink-500 text-sm">{name}</span>
                    <span className="text-xs text-cyan-500 uppercase font-bold">{resorts[name].region}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pink-500" />
                </button>
              ))}
              {search.length > 2 && (
                <button onClick={() => fetchGlobalResort(search)}
                  className="w-full text-left px-6 py-5 bg-cyan-900/20 hover:bg-cyan-900/40 flex items-center gap-4 border-t border-cyan-500 group">
                  <Globe className="w-6 h-6 text-cyan-400" />
                  <div>
                    <span className="font-black block uppercase italic group-hover:text-white underline underline-offset-4 text-cyan-400">FETCH DATA FOR "{search.toUpperCase()}"</span>
                    <span className="text-xs text-pink-500 uppercase font-bold tracking-widest">AI-Generated Snow Report</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-950/40 border-2 border-red-500 p-4 flex items-center gap-3">
            <AlertTriangle className="text-red-500 shrink-0" />
            <span className="text-xs font-black uppercase text-red-500 tracking-widest">{error}</span>
          </div>
        )}

        <main>
          {activeTab === "report" && !resort && !isGlobalLoading && (
            <div className="text-center py-20">
              <p className="text-2xl font-black italic uppercase tracking-widest text-neutral-700">Search any peak to begin</p>
              <p className="text-xs font-mono mt-2 text-neutral-800 tracking-widest">↑ TYPE A RESORT ABOVE ↑</p>
            </div>
          )}
          {activeTab === "report" && resort && (
            <div className="space-y-6">
              <div className="bg-black border-2 border-pink-500 p-6 relative" style={shadow("#7c3aed")}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-4xl font-black italic uppercase text-cyan-400 tracking-tighter truncate max-w-xs mb-2">{selectedResort}</h2>
                    <span className="text-xs text-neutral-500 uppercase font-black tracking-widest">{resort.region}</span>
                  </div>
                  <div className="text-6xl font-black italic text-pink-500 tabular-nums">{resort.current.tempF}°</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-neutral-900 border-2 border-cyan-500 p-4 hover:bg-neutral-800 transition-colors" style={shadow("#ec4899")}>
                    <span className="text-xs font-black text-pink-500 uppercase block mb-1">Fresh Powder</span>
                    <div className="text-4xl font-black italic text-white leading-none tabular-nums">{resort.current.newSnowIn}"</div>
                    <span className="text-xs text-neutral-600 uppercase font-bold mt-1 block">24H SESSION DUMP</span>
                  </div>
                  <div className="bg-neutral-900 border-2 border-pink-500 p-4 hover:bg-neutral-800 transition-colors" style={shadow("#06b6d4")}>
                    <span className="text-xs font-black text-cyan-400 uppercase block mb-1">Mountain Base</span>
                    <div className="text-4xl font-black italic text-white leading-none tabular-nums">{resort.current.baseIn}"</div>
                    <span className="text-xs text-neutral-600 uppercase font-bold mt-1 block">TOTAL ACCUMULATION</span>
                  </div>
                </div>
                <div className="bg-neutral-900/50 border-l-4 border-pink-500 p-4 italic text-sm text-pink-100 mb-6">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-black uppercase text-pink-500 tracking-widest flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> The Rad Report
                    </span>
                    <button onClick={generateHype} disabled={isGeneratingHype}
                      className="text-xs uppercase font-black text-cyan-400 flex items-center gap-1 hover:text-white transition-colors">
                      {isGeneratingHype ? <Loader2 className="w-2 h-2 animate-spin" /> : <RefreshCcw className="w-2 h-2" />} RE-SYNC
                    </button>
                  </div>
                  <div className="min-h-12 leading-relaxed py-1">
                    {isGeneratingHype
                      ? <div className="flex items-center gap-2 opacity-50"><Loader2 className="w-3 h-3 animate-spin" /><span>DECRYPTING VIBES...</span></div>
                      : `"${hypeReport || "Awaiting radio transmission..."}"`}
                  </div>
                </div>
                <div className="flex justify-around text-center pt-4 border-t border-neutral-800">
                  {[{ l: "Surface", v: resort.current.condition }, { l: "Lifts", v: resort.current.lifts }, { l: "Trails", v: resort.current.trails }].map((x) => (
                    <div key={x.l} className="px-2">
                      <span className="block text-xs text-neutral-600 uppercase font-black mb-1">{x.l}</span>
                      <span className="text-xs font-black text-cyan-400 uppercase italic tracking-widest">{x.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <section className="space-y-3 pt-2">
                <h3 className="text-xs font-black italic uppercase text-pink-500 tracking-widest px-2 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Long Range Shred Forecast
                </h3>
                {resort.forecast.map((f, i) => (
                  <div key={f.day + i} className={`bg-neutral-900 border-2 p-4 flex justify-between items-center transition-all ${i === 0 ? "border-cyan-400" : "border-neutral-900 opacity-60 hover:opacity-100"}`}>
                    <div className="flex flex-col w-24">
                      <span className="font-black italic uppercase text-xs text-white tracking-widest">{f.day}</span>
                      <span className="text-neutral-500 text-xs font-mono">{f.date || new Date(Date.now() + i * 86400000).toLocaleDateString("en-US", {month:"short", day:"numeric"})}</span>
                    </div>
                    <span className="text-pink-400 text-xs font-bold tabular-nums">{f.high}° / {f.low}°</span>
                    {f.snow && f.snow !== '0"' && f.snow !== "0in"
                      ? <span className="bg-cyan-500 text-black px-2 py-1 text-xs font-black italic uppercase" style={shadow("#ec4899")}>+{f.snow} FRESHIES</span>
                      : <span className="text-xs text-neutral-700 italic font-black uppercase tracking-widest">Blue Bird</span>}
                  </div>
                ))}
              </section>
            </div>
          )}

          {activeTab === "gear" && (
            <div className="bg-black border-2 border-cyan-400 p-10 text-center relative overflow-hidden" style={shadow("#ec4899")}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-600" />
              <Gamepad2 className="w-20 h-20 text-pink-500 mx-auto mb-6" />
              <h2 className="text-4xl font-black italic uppercase mb-2 tracking-tighter">Rad Gear Advisor</h2>
              <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-10">Look good // Shred harder</p>
              {isGeneratingGear ? (
                <div className="py-12">
                  <Loader2 className="w-12 h-12 animate-spin mx-auto text-pink-500" />
                  <p className="mt-6 text-xs font-black italic uppercase text-neutral-600 tracking-widest">Browsing '86 Winter Catalog...</p>
                </div>
              ) : (
                <div className="bg-neutral-900 border-2 border-pink-500 border-dashed p-8 text-sm text-pink-100 italic whitespace-pre-wrap leading-relaxed text-left relative">
                  <div className="absolute -top-4 right-6 bg-pink-500 text-black px-3 py-1 text-xs font-black italic tracking-widest" style={shadow("#06b6d4")}>STYLED FOR STOKE</div>
                  {gearAdvice || (
                    <div className="text-center py-6">
                      <button onClick={generateGear} className="bg-pink-500 text-black font-black uppercase px-10 py-5 hover:scale-105 active:translate-y-1 transition-all text-lg italic tracking-tighter" style={shadow("#06b6d4")}>
                        GET MY LOOK
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "spots" && (
            <div className="space-y-6">
              <div className="bg-black border-2 border-cyan-400 p-6 text-center relative" style={shadow("#ec4899")}>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-pink-500 to-purple-600" />
                <UtensilsCrossed className="w-14 h-14 text-pink-500 mx-auto mb-4" />
                <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-1">Local Eats & Brews</h2>
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-6">Near {selectedResort}</p>
                {!localSpots && !isLoadingSpots && (
                  <button onClick={fetchLocalSpots}
                    className="bg-pink-500 text-black font-black uppercase px-10 py-4 hover:scale-105 active:translate-y-1 transition-all text-base italic tracking-tighter"
                    style={shadow("#06b6d4")}>
                    FIND THE SPOTS
                  </button>
                )}
                {isLoadingSpots && (
                  <div className="py-8">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-pink-500" />
                    <p className="mt-4 text-xs font-black italic uppercase text-neutral-600 tracking-widest">Scanning local intel...</p>
                  </div>
                )}
              </div>

              {localSpots && !localSpots.error && (
                <>
                  <section className="space-y-3">
                    <h3 className="text-xs font-black italic uppercase text-pink-500 tracking-widest px-2 flex items-center gap-2">
                      <UtensilsCrossed className="w-3 h-3" /> Restaurants
                    </h3>
                    {localSpots.restaurants?.map((r, i) => (
                      <div key={i} className="bg-neutral-900 border-2 border-neutral-800 hover:border-pink-500 p-4 transition-all group">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-black uppercase italic text-white group-hover:text-pink-400 transition-colors text-sm">{r.name}</span>
                          <span className="text-cyan-400 font-black text-xs">{r.priceRange}</span>
                        </div>
                        <p className="text-xs text-neutral-500 uppercase font-bold mb-2">{r.vibe}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-pink-500 font-black uppercase tracking-widest">Must Order:</span>
                          <span className="text-xs text-neutral-300 italic">{r.mustOrder}</span>
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-xs font-black italic uppercase text-cyan-400 tracking-widest px-2 flex items-center gap-2">
                      <Coffee className="w-3 h-3" /> Coffee Shops
                    </h3>
                    {localSpots.coffee?.map((c, i) => (
                      <div key={i} className="bg-neutral-900 border-2 border-neutral-800 hover:border-cyan-500 p-4 transition-all group">
                        <div className="mb-1">
                          <span className="font-black uppercase italic text-white group-hover:text-cyan-400 transition-colors text-sm">{c.name}</span>
                        </div>
                        <p className="text-xs text-neutral-500 uppercase font-bold mb-2">{c.vibe}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-cyan-400 font-black uppercase tracking-widest">Must Order:</span>
                          <span className="text-xs text-neutral-300 italic">{c.mustOrder}</span>
                        </div>
                      </div>
                    ))}
                  </section>

                  <div className="text-center pt-2">
                    <button onClick={fetchLocalSpots}
                      className="text-xs font-black uppercase text-neutral-600 hover:text-pink-500 flex items-center gap-1 mx-auto transition-colors">
                      <RefreshCcw className="w-3 h-3" /> Refresh Picks
                    </button>
                  </div>
                </>
              )}

              {localSpots?.error && (
                <div className="bg-red-950/40 border-2 border-red-500 p-4 flex items-center gap-3">
                  <AlertTriangle className="text-red-500 shrink-0" />
                  <span className="text-xs font-black uppercase text-red-500 tracking-widest">Signal lost. Could not load local spots.</span>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="mt-20 text-center opacity-30 text-xs font-black uppercase tracking-widest text-pink-500 pb-12 flex flex-col items-center gap-6">
          <div className="h-px w-48 bg-gradient-to-r from-transparent via-pink-500 to-transparent" />
          <span>Stay Safe // Shred Hard // Stay Gnarly 🤙</span>
        </footer>
      </div>
    </div>
  );
}
