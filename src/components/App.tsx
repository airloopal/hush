"use client";

import { BadgeCheck, Camera, ChevronRight, Clock3, MessageCircle, Search, Send, ShieldCheck, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { categories, creators, type Creator, type CreatorCategory } from "@/lib/data";
import ThemeToggle from "./ThemeToggle";

type View = "discover" | "profile" | "chat" | "dashboard";

function lastSeenLabel(minutes: number) {
  if (minutes <= 1) return "Last seen just now";
  if (minutes < 60) return `Last seen ${minutes} minutes ago`;
  return "Last seen today";
}

export default function App() {
  const [view, setView] = useState<View>("discover");
  const [selected, setSelected] = useState<Creator>(creators[0]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | CreatorCategory>("All");
  const [unlocked, setUnlocked] = useState(false);

  const filtered = useMemo(
    () => creators.filter((creator) => {
      const matchesQuery = `${creator.displayName} ${creator.username}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "All" || creator.category === category;
      return matchesQuery && matchesCategory;
    }),
    [query, category]
  );

  function openProfile(creator: Creator) {
    setSelected(creator);
    setView("profile");
  }

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setView("discover")}>HUSH</button>
        <nav>
          <button onClick={() => setView("discover")}>Discover</button>
          <button onClick={() => setView("dashboard")}>Creator dashboard</button>
        </nav>
        <div className="topActions">
          <ThemeToggle />
          <button className="secondary">Log in</button>
          <button className="primary small">Sign up</button>
        </div>
      </header>

      {view === "discover" && (
        <>
          <section className="hero">
            <div>
              <span className="eyebrow">Private messaging, simplified</span>
              <h1>Private conversations.<br /><em>Fair pricing.</em></h1>
              <p>Talk privately with creators from gaming, music, fitness, lifestyle, adult and beyond. Pay once and chat freely for 24 hours.</p>
              <div className="heroActions">
                <button className="primary" onClick={() => document.getElementById("creators")?.scrollIntoView({ behavior: "smooth" })}>Find creators</button>
                <button className="secondary">How it works</button>
              </div>
              <div className="trustRow">
                <span><MessageCircle size={17} /> Usernames only</span>
                <span><Camera size={17} /> Real-time media</span>
                <span><ShieldCheck size={17} /> Secure payments</span>
                <span><Clock3 size={17} /> 24-hour access</span>
              </div>
            </div>
            <button className="featureCard" onClick={() => openProfile(creators[0])}>
              <img src={creators[0].image} alt="Featured creator" />
              <div className="featureOverlay">
                <strong>{creators[0].displayName}</strong>
                <span>{lastSeenLabel(creators[0].lastSeenMinutes)}</span>
              </div>
            </button>
          </section>

          <section className="creatorSection" id="creators">
            <div className="sectionHeader">
              <div>
                <span className="eyebrow">Live availability</span>
                <h2>Recently active</h2>
              </div>
              <label className="searchBox"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search username" /></label>
            </div>
            <div className="categoryTabs" aria-label="Creator categories">
              {categories.map((item) => (
                <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
              ))}
            </div>
            <div className="categoryNote">Adult profiles are restricted to verified users aged 18 or over.</div>
            <div className="creatorGrid">
              {filtered.map((creator) => (
                <button className="creatorCard" key={creator.username} onClick={() => openProfile(creator)}>
                  <div className="imageWrap">
                    <img src={creator.image} alt={creator.displayName} />
                    {creator.boosted && <span className="sponsored">Sponsored</span>}
                    {creator.ageRestricted && <span className="ageBadge">18+</span>}
                  </div>
                  <div className="creatorInfo">
                    <div><strong>{creator.displayName}</strong>{creator.verified && <BadgeCheck size={16} />}</div>
                    <span className="categoryLabel">{creator.category}</span>
                    <span>{lastSeenLabel(creator.lastSeenMinutes)}</span>
                    <small>Usually replies in {creator.responseMinutes} min</small>
                    <b>${creator.chatPrice} / 24h</b>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {view === "profile" && (
        <section className="profileLayout">
          <button className="back" onClick={() => setView("discover")}>← Back to discovery</button>
          <div className="profileHero">
            <img src={selected.image} alt={selected.displayName} />
            <div>
              <div className="profileName"><h1>{selected.displayName}</h1>{selected.verified && <BadgeCheck />}</div>
              <p>@{selected.username} · {selected.category}</p>
              <span className="presence"><i /> {lastSeenLabel(selected.lastSeenMinutes)}</span>
              <span>Usually replies in {selected.responseMinutes} minutes</span>
              <p className="bio">{selected.bio}</p>
              {selected.ageRestricted && <div className="ageNotice">18+ creator profile. Age verification is required before purchase.</div>}
            </div>
          </div>
          <div className="pricePanel">
            <div><MessageCircle /><span><strong>24-hour chat access</strong><small>Unlimited text messages</small></span><b>${selected.chatPrice}</b></div>
            <div><Camera /><span><strong>Live photo</strong><small>Taken and sent in real time</small></span><b>${selected.photoPrice}</b></div>
            <div><Video /><span><strong>Live video</strong><small>Recorded and sent in real time</small></span><b>${selected.videoPrice}</b></div>
            <button className="primary full" onClick={() => { setUnlocked(true); setView("chat"); }}>Unlock chat — ${selected.chatPrice}</button>
            <small className="finePrint">One payment. 24-hour access. No subscription.</small>
          </div>
        </section>
      )}

      {view === "chat" && (
        <section className="chatShell">
          <div className="chatHeader">
            <button className="back" onClick={() => setView("profile")}>←</button>
            <img src={selected.image} alt={selected.displayName} />
            <div><strong>{selected.displayName}</strong><span>{lastSeenLabel(selected.lastSeenMinutes)}</span></div>
            <span className="timer">23h 17m left</span>
          </div>
          <div className="accessNotice">Chat access is active. You have 23h 17m remaining.</div>
          <div className="messages">
            <div className="bubble incoming">Hey there 👋 Thanks for unlocking my chat!</div>
            <div className="bubble outgoing">Hi! Great to meet you.</div>
            <div className="bubble incoming">What would you like to talk about?</div>
          </div>
          <div className="mediaOffers">
            <button><Camera /><span><strong>Live photo</strong><small>${selected.photoPrice}</small></span><ChevronRight /></button>
            <button><Video /><span><strong>Live video</strong><small>${selected.videoPrice}</small></span><ChevronRight /></button>
          </div>
          <div className="composer"><button>＋</button><input placeholder={unlocked ? "Type a message…" : "Unlock chat to send messages"} disabled={!unlocked} /><button className="send"><Send size={18} /></button></div>
        </section>
      )}

      {view === "dashboard" && (
        <section className="dashboard">
          <div className="dashboardIntro"><span className="eyebrow">Creator workspace</span><h1>Welcome back, LunaRose</h1><p>Prioritise active conversations by expiry, activity and spend.</p></div>
          <div className="stats"><div><span>Today’s earnings</span><strong>$532.40</strong></div><div><span>Active chats</span><strong>24</strong></div><div><span>Photos sold</span><strong>18</strong></div><div><span>Videos sold</span><strong>7</strong></div></div>
          <div className="dashboardGrid">
            <div className="panel">
              <div className="panelHeader"><h2>Active chats</h2><select defaultValue="expiring"><option value="expiring">Expiring soon</option><option>Recent activity</option><option>Highest spend</option></select></div>
              {[
                ["@alexx", "41m", "$15.00", "14 min ago"],
                ["@love2chat", "1h 12m", "$25.00", "33 min ago"],
                ["@sweetguy", "2h 08m", "$60.00", "1 min ago"],
                ["@johnx91", "23h 17m", "$38.00", "2 min ago"]
              ].map(([name, time, spent, last]) => (
                <div className="chatRow" key={name}><div className="avatar">{name[1].toUpperCase()}</div><div><strong>{name}</strong><span>Last message {last}</span></div><b className={time === "41m" ? "urgent" : ""}>{time}<small> remaining</small></b><span>{spent} spent</span></div>
              ))}
            </div>
            <div className="panel boostPanel"><span className="eyebrow">24-hour exposure</span><h2>Boost your profile</h2><p>Appear larger and higher in discovery for one full day. Boosts are always clearly labelled as sponsored.</p><div className="boostPrice"><strong>$12</strong><span>/ 24 hours</span></div><button className="primary full">Start boost</button></div>
          </div>
        </section>
      )}
    </main>
  );
}
