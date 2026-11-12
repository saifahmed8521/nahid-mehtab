/* =========================================================
   Nahid & Mehtab · Nikah Invitation — interactions
   ========================================================= */
(() => {
  'use strict';

  /* ---------- Settings you may want to change ---------- */
  const CONFIG = {
    // Put a song file in assets/audio/ and set its path here, e.g. 'assets/audio/song.mp3'.
    // Leave empty for no music (the music button stays hidden).
    music: '',

    // Soft chime + whoosh when the doors open (made in the browser, no file needed). Set to false to turn off.
    gateSound: true,
    // Optional: use your own door sound instead, e.g. 'assets/audio/door.mp3'
    gateSoundFile: '',

    // WhatsApp group invite link for "Nahid ki Mehfil" (bride's side).
    // Paste the link from WhatsApp → Group info → Invite via link, e.g. 'https://chat.whatsapp.com/AbCdEf123...'
    whatsappGroup: '',

    // Countdown target — Nikah ceremony, 8:00 PM India time
    nikah: new Date('2027-01-02T20:00:00+05:30'),
    dayStart: new Date('2027-01-02T00:00:00+05:30'),
    dayEnd: new Date('2027-01-03T02:00:00+05:30'),

  };

  const EVENTS = {
    haldi: {
      title: 'Haldi ki Sunehri Shaam · Nahid & Mehtab',
      start: '20261231T123000Z', // 6:00 PM IST
      end: '20261231T163000Z',   // 10:00 PM IST
      location: "Bride's Family Home, Ramesh Park, Laxmi Nagar, New Delhi – 110092",
      details: 'Haldi ki Sunehri Shaam — a golden evening of turmeric, laughter & love.',
    },
    nikah: {
      title: 'Nikah of Nahid & Mehtab',
      start: '20270102T133000Z', // 7:00 PM IST
      end: '20270102T180000Z',   // 11:30 PM IST
      location: 'Community Centre, Ramesh Park, Laxmi Nagar, New Delhi – 110092',
      details: 'Nikah · Ahad-e-Wafa\nBaraat Arrival – 7:00 PM\nNikah Ceremony – 8:00 PM\nRukhsati – 11:00 PM\n\nMaps: https://www.google.com/maps/dir/?api=1&destination=28.6348538,77.2704275',
    },
  };

  /* ---------- Environment ---------- */
  const params = new URLSearchParams(location.search);
  const SHOW_HALDI = params.has('haldi');
  const guest = (params.get('to') || '').replace(/[<>]/g, '').trim().slice(0, 60);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- Haldi / Nikah-only version ---------- */
  $$('[data-only="haldi"]').forEach((el) => (SHOW_HALDI ? (el.hidden = false) : el.remove()));
  if (SHOW_HALDI) document.title = 'Nahid & Mehtab · Haldi & Nikah Invitation';

  /* ---------- Personal greeting ---------- */
  if (guest) {
    $('#guestGreeting').textContent = `Dear ${guest}`;
    $('#guestSub').hidden = false;
  }

  /* =========================================================
     GATE
     ========================================================= */
  const gate = $('#gate');
  const openBtn = $('#openBtn');
  let opened = false;

  function openGate() {
    if (opened) return;
    opened = true;
    gate.classList.add('is-opening');
    burst(innerWidth / 2, innerHeight / 2, 46);
    playGateSound();
    if (navigator.vibrate) { try { navigator.vibrate([12, 60, 18]); } catch (e) { /* ignore */ } } // gentle tap on Android
    startMusic();
    setTimeout(() => {
      document.body.classList.remove('is-locked');
      window.scrollTo(0, 0);
      document.body.classList.add('hero-in');
      startPetals();
    }, 900);
    setTimeout(() => gate.remove(), 2400);
  }
  /* ---------- Gate sound ----------
     Not a tune: a soft latch "thunk", the two doors sweeping open (air, left & right),
     a low swell of the room opening up, and a faint scatter of gold-dust glitter. */
  function playGateSound() {
    if (!CONFIG.gateSound) return;
    if (CONFIG.gateSoundFile) { // your own sound file, if you prefer
      try { const a = new Audio(CONFIG.gateSoundFile); a.volume = 0.8; a.play().catch(() => {}); } catch (e) { /* ignore */ }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ac = new AC();
      if (ac.state === 'suspended' && ac.resume) ac.resume();
      const t0 = ac.currentTime + 0.02;
      const sr = ac.sampleRate;
      const rnd = (a, b) => a + Math.random() * (b - a);

      // output: master -> soft compressor -> speakers, plus a short airy reverb
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
      comp.connect(ac.destination);
      const master = ac.createGain(); master.gain.value = 1;
      const verb = ac.createConvolver();
      const irLen = Math.floor(sr * 1.8);
      const ir = ac.createBuffer(2, irLen, sr);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 4);
      }
      verb.buffer = ir;
      const wet = ac.createGain(); wet.gain.value = 0.28;
      master.connect(comp);
      master.connect(verb); verb.connect(wet); wet.connect(comp);

      const env = (g, t, peak, attack, release) => {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
      };
      const noiseBuf = (sec, brown) => {
        const b = ac.createBuffer(1, Math.floor(sr * sec), sr);
        const d = b.getChannelData(0);
        let last = 0;
        for (let i = 0; i < d.length; i++) {
          const w = Math.random() * 2 - 1;
          if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
        }
        return b;
      };
      const pan = (node, p) => {
        if (!ac.createStereoPanner) return node;
        const s = ac.createStereoPanner(); s.pan.value = p; node.connect(s); return s;
      };

      // 1) latch: a muffled wooden thunk + tiny click
      const th = ac.createOscillator(); th.type = 'sine';
      th.frequency.setValueAtTime(120, t0); th.frequency.exponentialRampToValueAtTime(48, t0 + 0.2);
      const thg = ac.createGain(); env(thg, t0, 0.45, 0.004, 0.26);
      th.connect(thg); thg.connect(master); th.start(t0); th.stop(t0 + 0.35);
      const ck = ac.createBufferSource(); ck.buffer = noiseBuf(0.08, false);
      const ckf = ac.createBiquadFilter(); ckf.type = 'bandpass'; ckf.frequency.value = 2200; ckf.Q.value = 1.4;
      const ckg = ac.createGain(); env(ckg, t0, 0.07, 0.002, 0.05);
      ck.connect(ckf); ckf.connect(ckg); ckg.connect(master); ck.start(t0); ck.stop(t0 + 0.1);

      // 2) the two doors sweeping open — soft air, one each side
      [[-0.75, 0.12], [0.75, 0.2]].forEach(([p, d]) => {
        const t = t0 + d;
        const n = ac.createBufferSource(); n.buffer = noiseBuf(2.2, true);
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
        lp.frequency.setValueAtTime(260, t);
        lp.frequency.exponentialRampToValueAtTime(1600, t + 0.75);
        lp.frequency.exponentialRampToValueAtTime(500, t + 1.9);
        const g = ac.createGain(); env(g, t, 0.32, 0.6, 1.35);
        n.connect(lp); lp.connect(g); pan(g, p).connect(master);
        n.start(t); n.stop(t + 2.2);
      });

      // 3) low swell — the room opening up
      const sw = ac.createBufferSource(); sw.buffer = noiseBuf(2.6, true);
      const swf = ac.createBiquadFilter(); swf.type = 'lowpass'; swf.frequency.value = 170;
      const swg = ac.createGain(); env(swg, t0 + 0.1, 0.5, 0.7, 1.7);
      sw.connect(swf); swf.connect(swg); swg.connect(master); sw.start(t0 + 0.1); sw.stop(t0 + 2.7);

      // 4) faint gold-dust shimmer — tiny airy noise grains (no pitch, nothing musical)
      const grain = noiseBuf(0.06, false);
      for (let i = 0; i < 16; i++) {
        const t = t0 + rnd(0.4, 1.7);
        const n = ac.createBufferSource(); n.buffer = grain;
        const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = rnd(5000, 8000);
        const g = ac.createGain(); env(g, t, rnd(0.02, 0.05), 0.004, rnd(0.03, 0.05));
        n.connect(f); f.connect(g); pan(g, rnd(-0.8, 0.8)).connect(master);
        n.start(t); n.stop(t + 0.07);
      }

      setTimeout(() => { try { ac.close(); } catch (e) { /* ignore */ } }, 5000);
    } catch (e) { /* sound is optional */ }
  }

  openBtn.addEventListener('click', openGate);
  gate.addEventListener('click', (e) => { if (e.target !== openBtn && !openBtn.contains(e.target)) openGate(); });
  document.addEventListener('keydown', (e) => { if (!opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openGate(); } });

  /* =========================================================
     GOLD DUST (canvas)
     ========================================================= */
  const canvas = $('#dust');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, motes = [], bursts = [], rafId = 0;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  {
    const sc = sprite.getContext('2d');
    const g = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255, 248, 225, 1)');
    g.addColorStop(.18, 'rgba(244, 222, 170, .95)');
    g.addColorStop(.45, 'rgba(232, 200, 140, .3)');
    g.addColorStop(1, 'rgba(232, 200, 140, 0)');
    sc.fillStyle = g; sc.fillRect(0, 0, 32, 32);
  }

  function sizeCanvas() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = Math.round(Math.min(70, (W * H) / 14000));
    while (motes.length < n) motes.push(makeMote(true));
    motes.length = n;
  }
  function makeMote(anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 10,
      r: Math.random() * 1.6 + .4,
      vy: -(Math.random() * .25 + .06),
      vx: (Math.random() - .5) * .12,
      t: Math.random() * Math.PI * 2,
      ts: Math.random() * .02 + .008,
    };
  }
  function burst(x, y, n) {
    if (reduceMotion) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = Math.random() * 5 + 1.5;
      bursts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.2, r: Math.random() * 2.2 + .6, life: 1 });
    }
  }
  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const m of motes) {
      m.x += m.vx; m.y += m.vy; m.t += m.ts;
      if (m.y < -10 || m.x < -10 || m.x > W + 10) Object.assign(m, makeMote(false));
      // pre-rendered glow sprite instead of shadowBlur: much lighter on phones
      ctx.globalAlpha = .25 + .55 * (0.5 + 0.5 * Math.sin(m.t));
      const s = m.r * 7;
      ctx.drawImage(sprite, m.x - s / 2, m.y - s / 2, s, s);
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.x += b.vx; b.y += b.vy; b.vx *= .97; b.vy = b.vy * .97 + .04; b.life -= .012;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      ctx.globalAlpha = b.life;
      const s = b.r * 6;
      ctx.drawImage(sprite, b.x - s / 2, b.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(frame);
  }
  if (!reduceMotion) {
    sizeCanvas();
    addEventListener('resize', sizeCanvas);
    rafId = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafId); else rafId = requestAnimationFrame(frame);
    });
  }

  /* =========================================================
     FALLING PETALS
     ========================================================= */
  function startPetals() {
    if (reduceMotion) return;
    const box = $('#petals');
    const colours = ['#c99590', '#e8d6c2', '#b97c78', '#dcc08c', '#a8645f'];
    const count = innerWidth < 600 ? 9 : 14;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'petal';
      const s = 8 + Math.random() * 9;
      p.style.cssText = `--x:${Math.random() * 100}%;--fd:${13 + Math.random() * 12}s;--fdl:${-Math.random() * 20}s;` +
        `--s:${s}px;--c:${colours[i % colours.length]};--o:${.45 + Math.random() * .35};--sd:${2.5 + Math.random() * 2.5}s`;
      p.appendChild(document.createElement('span'));
      box.appendChild(p);
    }
  }

  /* =========================================================
     SPARKLE TRAIL (desktop)
     ========================================================= */
  if (finePointer && !reduceMotion) {
    let last = 0;
    addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - last < 45) return;
      last = now;
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = e.clientX + 'px';
      s.style.top = e.clientY + 'px';
      s.style.setProperty('--sx', (Math.random() - .5) * 30 + 'px');
      s.style.setProperty('--sy', (Math.random() * 24 + 6) + 'px');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }, { passive: true });
  }

  /* =========================================================
     HERO CARD TILT (desktop)
     ========================================================= */
  const card = $('#card');
  if (finePointer && !reduceMotion && card) {
    const hero = $('.hero');
    hero.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / r.width;
      const y = (e.clientY - (r.top + r.height / 2)) / r.height;
      card.style.transform = `perspective(1400px) rotateY(${x * 5}deg) rotateX(${-y * 4}deg)`;
    });
    hero.addEventListener('pointerleave', () => { card.style.transform = ''; });
  }

  /* =========================================================
     VERSE — split into words
     ========================================================= */
  const verse = $('#verseText');
  if (verse) {
    const words = verse.textContent.trim().split(/\s+/);
    verse.innerHTML = words.map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');
    verse.setAttribute('data-reveal-words', '');
  }

  /* =========================================================
     SCROLL REVEAL
     ========================================================= */
  $$('[data-reveal="stagger"] > *').forEach((el, i) => el.style.setProperty('--i', i));
  // light stagger for siblings revealed together
  $$('.wrap').forEach((w) => {
    let k = 0;
    $$(':scope > [data-reveal]', w).forEach((el) => { el.style.setProperty('--d', Math.min(k++, 4) * 90); });
  });

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-reveal-words]').forEach((el) => io.observe(el));

  // lazy-load the map when nearby
  const mapFrame = $('#mapFrame');
  if (mapFrame) {
    const mio = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { mapFrame.src = mapFrame.dataset.src; mio.disconnect(); }
    }, { rootMargin: '400px 0px' });
    mio.observe(mapFrame);
  }

  /* =========================================================
     TIMELINE PROGRESS + PARALLAX
     ========================================================= */
  const timeline = $('#timeline');
  const tlItems = timeline ? $$('.tl', timeline) : [];
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (timeline) {
        const r = timeline.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (innerHeight * .72 - r.top) / r.height));
        timeline.style.setProperty('--p', p.toFixed(3));
        tlItems.forEach((li) => {
          const lr = li.getBoundingClientRect();
          li.classList.toggle('is-lit', lr.top + 18 < innerHeight * .72);
        });
      }
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* =========================================================
     COUNTDOWN LANTERNS
     ========================================================= */
  const lanternSVG = `
    <svg viewBox="0 0 100 172" aria-hidden="true">
      <circle cx="50" cy="6" r="5" fill="none" stroke="url(#g-gold)" stroke-width="2"/>
      <path d="M50 11v6" stroke="url(#g-gold)" stroke-width="2"/>
      <path d="M50 16c-8 0-16 7-21 18h42c-5-11-13-18-21-18z" fill="url(#g-gold)"/>
      <rect x="24" y="34" width="52" height="6" rx="2" fill="url(#g-gold)"/>
      <path d="M28 40h44l6 16v66l-6 16H28l-6-16V56z" fill="#3b1018" stroke="url(#g-gold)" stroke-width="2"/>
      <path class="lantern__glow" d="M30 44h40l4 14v62l-4 14H30l-4-14V58z" fill="url(#g-glow)"/>
      <path d="M34 128V66a16 16 0 0 1 32 0v62" fill="none" stroke="url(#g-gold)" stroke-width="1.4" opacity=".75"/>
      <path d="M22 56h56M22 122h56" stroke="url(#g-gold)" stroke-width="1.2" opacity=".6"/>
      <rect x="26" y="138" width="48" height="6" rx="2" fill="url(#g-gold)"/>
      <path d="M36 144h28l-8 14H44z" fill="url(#g-gold)"/>
      <circle cx="50" cy="163" r="4" fill="url(#g-gold)"/>
    </svg>`;
  const units = [['d', 'Days'], ['h', 'Hours'], ['m', 'Minutes'], ['s', 'Seconds']];
  const lanternsBox = $('#lanterns');
  const nums = {};
  units.forEach(([k, label], i) => {
    const el = document.createElement('div');
    el.className = 'lantern';
    el.style.setProperty('--dur', (3.6 + i * .45) + 's');
    el.style.setProperty('--delay', (-i * .9) + 's');
    el.innerHTML = `<span class="lantern__chain"></span>${lanternSVG}<span class="lantern__num" data-k="${k}">--</span><span class="lantern__label">${label}</span>`;
    lanternsBox.appendChild(el);
    nums[k] = el.querySelector('.lantern__num');
  });
  // position the number in the glass part of the lantern
  function placeNums() {
    $$('.lantern', lanternsBox).forEach((l) => {
      const svg = l.querySelector('svg');
      const num = l.querySelector('.lantern__num');
      const top = svg.offsetTop + svg.clientHeight * (90 / 172) - num.offsetHeight / 2;
      num.style.top = top + 'px';
    });
  }
  const cdMsg = $('#cdMsg');
  const pad = (n) => String(n).padStart(2, '0');
  function setNum(k, v) {
    const el = nums[k];
    if (el.textContent === v) return;
    el.textContent = v;
    el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
  }
  function tick() {
    const now = new Date();
    let diff = Math.max(0, CONFIG.nikah - now);
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    const s = Math.floor(diff / 1e3);
    setNum('d', String(d)); setNum('h', pad(h)); setNum('m', pad(m)); setNum('s', pad(s));
    if (now >= CONFIG.dayStart && now < CONFIG.dayEnd) cdMsg.textContent = 'Today is the day — Alhamdulillah!';
    else if (now >= CONFIG.dayEnd) cdMsg.textContent = 'Alhamdulillah — thank you for your duas & love.';
  }
  tick();
  setInterval(tick, 1000);
  placeNums();
  addEventListener('resize', placeNums);
  document.fonts && document.fonts.ready.then(placeNums);

  /* =========================================================
     CALENDAR
     ========================================================= */
  function googleUrl(ev) {
    const q = new URLSearchParams({ action: 'TEMPLATE', text: ev.title, dates: `${ev.start}/${ev.end}`, details: ev.details, location: ev.location });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  function icsEscape(s) { return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
  function downloadIcs(key) {
    const ev = EVENTS[key];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ahmed Family//Nahid & Mehtab//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${key}-nahid-mehtab@invite`, `DTSTAMP:${stamp}`, `DTSTART:${ev.start}`, `DTEND:${ev.end}`,
      `SUMMARY:${icsEscape(ev.title)}`, `LOCATION:${icsEscape(ev.location)}`, `DESCRIPTION:${icsEscape(ev.details)}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(ev.title)} tomorrow`, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = key === 'haldi' ? 'Haldi-Nahid-Mehtab.ics' : 'Nikah-Nahid-Mehtab.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Calendar file downloaded');
  }
  // One button: Apple devices get a calendar file (opens Apple Calendar),
  // everyone else goes to Google Calendar.
  const isApple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  $$('[data-cal]').forEach((el) => {
    el.addEventListener('click', () => {
      const key = el.dataset.cal;
      if (isApple) downloadIcs(key);
      else window.open(googleUrl(EVENTS[key]), '_blank', 'noopener');
    });
  });

  /* =========================================================
     WHATSAPP GROUP — Nahid ki Mehfil
     ========================================================= */
  const groupBtn = $('#groupBtn');
  if (groupBtn) {
    if (CONFIG.whatsappGroup) groupBtn.href = CONFIG.whatsappGroup;
    else groupBtn.addEventListener('click', (e) => { e.preventDefault(); toast('Group link coming soon, InshaAllah'); });
  }

  // little live chat preview that plays while the section is on screen
  const chatBody = $('#chatBody');
  const chatStatus = $('#chatStatus');
  const CHAT_STATUS = "Ahmed Family · Bride's side";
  const CHAT = [
    { side: 'in', name: 'Ahmed Family', text: 'Assalamu Alaikum, and welcome to Nahid ki Mehfil!', time: '7:02 PM' },
    { side: 'out', text: 'Wa Alaikum Assalam! MashaAllah, counting the days to 2nd January', time: '7:03 PM' },
    { side: 'in', name: 'Ahmed Family', text: 'Venue location & timings are pinned above', time: '7:05 PM' },
    { side: 'out', text: 'Duas for Nahid & Mehtab, InshaAllah', time: '7:06 PM' },
  ];
  let chatRunning = false, chatTimer = 0, chatRun = 0;
  const wait = (ms) => new Promise((r) => { chatTimer = setTimeout(r, ms); });
  function bubble(m) {
    const el = document.createElement('div');
    el.className = `bubble bubble--${m.side}`;
    if (m.name) {
      const n = document.createElement('span'); n.className = 'bubble__name'; n.textContent = m.name; el.appendChild(n);
    }
    const t = document.createElement('span'); t.className = 'bubble__text'; t.textContent = m.text; el.appendChild(t);
    const tm = document.createElement('span'); tm.className = 'bubble__time'; tm.textContent = m.time; el.appendChild(tm);
    return el;
  }
  async function playChat(run) {
    const live = () => chatRunning && run === chatRun;
    while (live()) {
      for (const m of CHAT) {
        if (!live()) return;
        const typing = document.createElement('div');
        typing.className = 'typing' + (m.side === 'out' ? ' typing--out' : '');
        typing.innerHTML = '<i></i><i></i><i></i>';
        chatBody.appendChild(typing);
        if (m.side === 'in') { chatStatus.textContent = 'typing…'; chatStatus.classList.add('is-typing'); }
        await wait(reduceMotion ? 0 : 1300);
        if (!live()) return;
        chatBody.removeChild(typing);
        chatStatus.textContent = CHAT_STATUS; chatStatus.classList.remove('is-typing');
        chatBody.appendChild(bubble(m));
        await wait(reduceMotion ? 0 : 1100);
      }
      if (reduceMotion) { chatRunning = false; return; }
      await wait(3200);
      if (!live()) return;
      $$('.bubble', chatBody).forEach((el) => el.classList.add('is-leaving'));
      await wait(550);
      chatBody.textContent = '';
      await wait(500);
    }
  }
  if (chatBody) {
    new IntersectionObserver((es) => {
      const vis = es[0].isIntersecting;
      if (vis && !chatRunning) {
        chatRunning = true; chatRun++;
        chatBody.textContent = '';
        chatStatus.textContent = CHAT_STATUS; chatStatus.classList.remove('is-typing');
        playChat(chatRun);
      } else if (!vis && chatRunning) {
        chatRunning = false; clearTimeout(chatTimer);
      }
    }, { threshold: .35 }).observe(chatBody);
  }

  /* =========================================================
     SHARE
     ========================================================= */
  const shareUrl = location.origin + location.pathname + (SHOW_HALDI && params.has('haldi') ? '?haldi' : '');
  async function shareInvite() {
    const data = { title: 'Nahid & Mehtab · Nikah Invitation', text: 'You are invited to the Nikah of Nahid & Mehtab — Saturday, 2nd January 2027.', url: shareUrl };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(shareUrl);
      toast('Link copied');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      toast(shareUrl);
    }
  }
  $$('#shareBtn, [data-share]').forEach((b) => b.addEventListener('click', shareInvite));

  /* =========================================================
     QUICK-ACTION DOCK (phones) — appears after the card, hides at the very end
     ========================================================= */
  const dock = $('#dock');
  const dockGroup = $('#dockGroup');
  if (dockGroup && CONFIG.whatsappGroup) {
    dockGroup.href = CONFIG.whatsappGroup; dockGroup.target = '_blank'; dockGroup.rel = 'noopener';
  }
  function updateDock() {
    if (!dock || !opened) return;
    const y = scrollY;
    const nearEnd = y + innerHeight > document.documentElement.scrollHeight - 260;
    const on = y > innerHeight * 0.55 && !nearEnd;
    dock.classList.toggle('is-on', on);
    document.body.classList.toggle('dock-on', on);
  }
  addEventListener('scroll', updateDock, { passive: true });

  /* =========================================================
     FAMILY NAMES — keep each line on one line on any phone width
     ========================================================= */
  const familyNames = $('#familyNames');
  function fitNames() {
    if (!familyNames) return;
    familyNames.style.fontSize = '';
    const avail = familyNames.clientWidth;
    const widest = Math.max(...$$('.ln', familyNames).map((l) => l.scrollWidth));
    if (widest > avail) {
      const fs = parseFloat(getComputedStyle(familyNames).fontSize);
      familyNames.style.fontSize = Math.floor(fs * (avail / widest) * 10) / 10 + 'px';
    }
  }
  fitNames();
  addEventListener('resize', fitNames);
  if (document.fonts) document.fonts.ready.then(fitNames);

  /* =========================================================
     MUSIC (activates only when CONFIG.music is set)
     ========================================================= */
  const musicBtn = $('#musicBtn');
  let audio = null;
  if (CONFIG.music) {
    audio = new Audio(CONFIG.music);
    audio.loop = true; audio.preload = 'auto'; audio.volume = .6;
    musicBtn.hidden = false;
    musicBtn.addEventListener('click', () => (audio.paused ? playMusic() : pauseMusic()));
  }
  function playMusic() {
    if (!audio) return;
    audio.play().then(() => { musicBtn.classList.add('is-playing'); musicBtn.setAttribute('aria-label', 'Pause music'); }).catch(() => {});
  }
  function pauseMusic() {
    audio.pause(); musicBtn.classList.remove('is-playing'); musicBtn.setAttribute('aria-label', 'Play music');
  }
  function startMusic() { if (audio) playMusic(); }

  /* =========================================================
     CLOSING STARS
     ========================================================= */
  const stars = $('#stars');
  if (stars) {
    const n = innerWidth < 600 ? 28 : 46;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 70}%;--t:${2 + Math.random() * 3}s;--dl:${-Math.random() * 4}s;` +
        `transform:scale(${.5 + Math.random()})`;
      stars.appendChild(s);
    }
  }

  /* ---------- toast ---------- */
  const toastEl = $('#toast');
  let toastT = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2400);
  }
})();
