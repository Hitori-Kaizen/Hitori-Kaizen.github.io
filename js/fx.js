/* ============================================================
   fx.js — OBSIDIAN CUT, reel two: the interaction layer.
   Command palette (Ctrl+K) · hero flashlight ·
   letter repel · scroll-velocity marquee & skew · scramble
   hovers · cursor labels · CRT mode (Konami) · matrix rain ·
   opt-in sound · toasts · count-up stats · darkroom physics ·
   footer eye · reel timer · scroll progress.
   Vanilla JS, bilingual, respects prefers-reduced-motion.
   ============================================================ */

(function () {
  'use strict';

  /* Preview escape hatch: append ?motion=full to the URL to see the site at
     full motion even when the OS asks for reduced motion. Sets data-motion on
     <html> so the matching CSS blocks in style.css stand down too.
     The OS setting still wins by default, so accessibility is unchanged. */
  var forceFull = /[?&]motion=full\b/.test(window.location.search);
  if (forceFull) document.documentElement.setAttribute('data-motion', 'full');

  var reduced = !forceFull && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;
  var LANG = document.documentElement.lang;
  var isStart = null; /* resolved on DOM ready */

  /* ---------- i18n ---------- */

  var MAIN_PAGE = { en: 'Main.html', es: 'Main-es.html', fil: 'Main-fil.html' };
  var SWITCH_TO = { en: 'Switch to English', es: 'Cambiar a español', fil: 'Lumipat sa Filipino' };

  var STRINGS = {};
  STRINGS.es = {
    cmdPlaceholder: 'Escribe un comando o busca…',
    gNav: 'Navegar', gActions: 'Acciones', gFun: 'Extras',
    about: 'Sobre mí', skills: 'Habilidades', work: 'Proyectos',
    education: 'Formación', contact: 'Contacto',
    cv: 'Descargar CV', copyMail: 'Copiar email',
    sound: 'Sonido sí / no', crt: 'Modo CRT',
    matrix: 'Lluvia matrix', top: 'Volver arriba',
    footKeys: '↑↓ navegar · ↵ ejecutar · esc cerrar',
    noResults: 'nada encontrado — prueba "cv" o "matrix"',
    mailCopied: 'email copiado al portapapeles',
    sndOn: 'sonido activado', sndOff: 'sonido desactivado',
    crtOn: 'modo crt — señal analógica activa', crtOff: 'modo crt desactivado',
    mxOn: 'lluvia matrix — esc para salir', mxOff: 'de vuelta a la realidad',
    konami: 'código konami aceptado — crt activado',
    hint: 'Ctrl+K — paleta de comandos',
    reel: 'BOBINA'
  };
  STRINGS.fil = {
    cmdPlaceholder: 'Mag-type ng command o maghanap…',
    gNav: 'Pumunta sa', gActions: 'Mga aksyon', gFun: 'Extra',
    about: 'Tungkol sa akin', skills: 'Mga kasanayan', work: 'Mga proyekto',
    education: 'Edukasyon', contact: 'Kontak',
    cv: 'I-download ang CV', copyMail: 'Kopyahin ang email',
    sound: 'Tunog on / off', crt: 'CRT mode',
    matrix: 'Matrix rain', top: 'Bumalik sa itaas',
    footKeys: '↑↓ pumili · ↵ patakbuhin · esc isara',
    noResults: 'walang nahanap — subukan ang "cv" o "matrix"',
    mailCopied: 'nakopya ang email sa clipboard',
    sndOn: 'naka-on ang tunog', sndOff: 'naka-off ang tunog',
    crtOn: 'crt mode — naka-on ang analog signal', crtOff: 'naka-off ang crt mode',
    mxOn: 'matrix rain — esc para lumabas', mxOff: 'balik sa realidad',
    konami: 'tanggap ang konami code — naka-on ang crt',
    hint: 'Ctrl+K — command palette',
    reel: 'REEL'
  };
  STRINGS.en = {
    cmdPlaceholder: 'Type a command or search…',
    gNav: 'Navigate', gActions: 'Actions', gFun: 'Fun',
    about: 'About', skills: 'Skills', work: 'Work',
    education: 'Education', contact: 'Contact',
    cv: 'Download CV', copyMail: 'Copy email',
    sound: 'Toggle sound', crt: 'CRT mode',
    matrix: 'Matrix rain', top: 'Back to top',
    footKeys: '↑↓ navigate · ↵ run · esc close',
    noResults: 'nothing found — try "cv" or "matrix"',
    mailCopied: 'email copied to clipboard',
    sndOn: 'sound on', sndOff: 'sound off',
    crtOn: 'crt mode — analog signal engaged', crtOff: 'crt mode off',
    mxOn: 'matrix rain — esc to exit', mxOff: 'back to reality',
    konami: 'konami code accepted — crt engaged',
    hint: 'Ctrl+K — command palette',
    reel: 'REEL'
  };
  var T = STRINGS[LANG] || STRINGS.en;

  var MAIL = 'macalintaljames26@gmail.com';

  /* ---------- utils ---------- */

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function pad(n, w) {
    n = String(n);
    while (n.length < w) n = '0' + n;
    return n;
  }

  /* path helpers — fx runs on Start (root) and Main (subdirs) */
  function upPath() { return isStart ? '' : '../'; }
  function mainHref() {
    if (document.getElementById('about')) return '';
    if (isStart) return 'english/Main.html';
    return MAIN_PAGE[LANG] || MAIN_PAGE.en;
  }

  /* ============================================================
     TOASTS
     ============================================================ */

  var toastStack = null;
  function toast(msg) {
    if (!toastStack) {
      toastStack = el('div', 'toast-stack');
      toastStack.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastStack);
    }
    var t = el('div', 'toast', msg);
    toastStack.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 500);
    }, 3600);
  }

  /* ============================================================
     SOUND — tiny WebAudio blips, opt-in, persisted
     ============================================================ */

  var snd = {
    on: false,
    ctx: null,
    btn: null,
    init: function () {
      snd.on = localStorage.getItem('mm-snd') === '1';
      snd.updateBtn();
    },
    ac: function () {
      if (!snd.ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        snd.ctx = new AC();
      }
      if (snd.ctx.state === 'suspended') snd.ctx.resume();
      return snd.ctx;
    },
    blip: function (freq, dur, gain, type, slide) {
      if (!snd.on) return;
      var ctx = snd.ac();
      if (!ctx) return;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur);
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur + 0.02);
    },
    tick: function () { snd.blip(1900, 0.03, 0.012, 'square'); },
    click: function () { snd.blip(240, 0.06, 0.03, 'triangle'); },
    open: function () { snd.blip(280, 0.18, 0.02, 'sine', 940); },
    toggle: function () {
      snd.on = !snd.on;
      localStorage.setItem('mm-snd', snd.on ? '1' : '0');
      snd.updateBtn();
      if (snd.on) snd.click();
      toast(snd.on ? T.sndOn : T.sndOff);
    },
    updateBtn: function () {
      if (snd.btn) snd.btn.textContent = 'snd ' + (snd.on ? 'on' : 'off');
    }
  };

  function initSoundEvents() {
    var lastHover = null;
    document.addEventListener('mouseover', function (e) {
      if (!snd.on) return;
      var t = e.target.closest && e.target.closest('a, button, .skill-item, .work-row, .cmdk-item, .print, .m-link');
      if (t && t !== lastHover) { lastHover = t; snd.tick(); }
      if (!t) lastHover = null;
    }, { passive: true });
    document.addEventListener('pointerdown', function (e) {
      if (!snd.on) return;
      if (e.target.closest && e.target.closest('a, button, .print')) snd.click();
    }, { passive: true });
  }

  /* ============================================================
     TOPBAR BUTTONS — sound toggle + palette trigger (injected)
     ============================================================ */

  function initTopbarButtons() {
    var links = document.querySelector('.top-links');
    if (!links) return;
    var lang = links.querySelector('.lang');

    var sb = el('button', 'chip-btn snd-btn', 'snd off');
    sb.type = 'button';
    sb.setAttribute('aria-label', 'Toggle sound');
    sb.addEventListener('click', snd.toggle);
    snd.btn = sb;
    snd.updateBtn();

    var kb = el('button', 'chip-btn cmd-btn', 'ctrl k');
    kb.type = 'button';
    kb.setAttribute('aria-label', 'Command palette');
    kb.addEventListener('click', function () { palette.open(); });

    if (lang) {
      links.insertBefore(sb, lang);
      links.insertBefore(kb, lang);
    } else {
      links.appendChild(sb);
      links.appendChild(kb);
    }
  }

  /* ============================================================
     COMMAND PALETTE — Ctrl/Cmd+K
     ============================================================ */

  var palette = {
    root: null, input: null, list: null,
    items: [], visible: [], sel: 0, isOpen: false,

    build: function () {
      var mh = mainHref();
      var items = [
        { g: T.gNav, label: T.about, hint: '01', act: { goto: mh + '#about' } },
        { g: T.gNav, label: T.skills, hint: '02', act: { goto: mh + '#skills' } },
        { g: T.gNav, label: T.work, hint: '03', act: { goto: mh + '#work' } },
        { g: T.gNav, label: T.education, hint: '04', act: { goto: mh + '#education' } },
        { g: T.gNav, label: T.contact, hint: '05', act: { goto: mh + '#contact' } },
        { g: T.gNav, label: T.top, hint: '↑', act: { fn: function () { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); } } },
        { g: T.gActions, label: T.cv, hint: 'pdf ↓', act: { dl: upPath() + 'files/CV.pdf' } },
        { g: T.gActions, label: T.copyMail, hint: '✉', act: { fn: copyMail } },
        { g: T.gActions, label: T.sound, hint: 'snd', act: { fn: snd.toggle } },
        { g: T.gFun, label: T.crt, hint: 'tv', act: { fn: toggleCRT } },
        { g: T.gFun, label: T.matrix, hint: 'rain', act: { fn: toggleMatrix } }
      ];
      var langLinks = document.querySelectorAll('.top-links .lang');
      for (var i = 0; i < langLinks.length; i++) {
        var code = langLinks[i].getAttribute('hreflang');
        items.splice(9 + i, 0, { g: T.gActions, label: SWITCH_TO[code], hint: code, act: { goto: langLinks[i].getAttribute('href') } });
      }
      palette.items = items;
    },

    mount: function () {
      var root = el('div', 'cmdk');
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Command palette');
      root.innerHTML =
        '<div class="cmdk-back"></div>' +
        '<div class="cmdk-box">' +
        '  <div class="cmdk-input-row"><span class="cmdk-caret">›</span>' +
        '    <input class="cmdk-input" type="text" spellcheck="false" autocomplete="off" placeholder="' + T.cmdPlaceholder + '">' +
        '  </div>' +
        '  <div class="cmdk-list"></div>' +
        '  <div class="cmdk-foot">' + T.footKeys + '</div>' +
        '</div>';
      document.body.appendChild(root);
      palette.root = root;
      palette.input = root.querySelector('.cmdk-input');
      palette.list = root.querySelector('.cmdk-list');

      root.querySelector('.cmdk-back').addEventListener('click', palette.close);
      palette.input.addEventListener('input', function () { palette.render(palette.input.value); });
      palette.input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); palette.move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); palette.move(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); palette.run(); }
      });
    },

    render: function (q) {
      q = (q || '').trim().toLowerCase();
      var vis = palette.items.filter(function (it) {
        if (!q) return true;
        var s = it.label.toLowerCase() + ' ' + it.g.toLowerCase();
        if (s.indexOf(q) !== -1) return true;
        /* loose subsequence match */
        var i = 0;
        for (var j = 0; j < s.length && i < q.length; j++) if (s[j] === q[i]) i++;
        return i === q.length;
      });
      palette.visible = vis;
      palette.sel = 0;
      var html = '';
      var lastG = null;
      vis.forEach(function (it, i) {
        if (it.g !== lastG) {
          html += '<div class="cmdk-group">' + it.g + '</div>';
          lastG = it.g;
        }
        html += '<button type="button" class="cmdk-item' + (i === 0 ? ' sel' : '') + '" data-i="' + i + '">' +
          '<span>' + it.label + '</span><i>' + it.hint + '</i></button>';
      });
      if (!vis.length) html = '<div class="cmdk-empty">' + T.noResults + '</div>';
      palette.list.innerHTML = html;
      palette.list.querySelectorAll('.cmdk-item').forEach(function (b) {
        b.addEventListener('click', function () {
          palette.sel = parseInt(b.getAttribute('data-i'), 10);
          palette.run();
        });
        b.addEventListener('mousemove', function () {
          var i = parseInt(b.getAttribute('data-i'), 10);
          if (i !== palette.sel) { palette.sel = i; palette.paint(); }
        });
      });
    },

    paint: function () {
      palette.list.querySelectorAll('.cmdk-item').forEach(function (b, i) {
        b.classList.toggle('sel', i === palette.sel);
      });
      var s = palette.list.querySelector('.cmdk-item.sel');
      if (s) s.scrollIntoView({ block: 'nearest' });
    },

    move: function (d) {
      if (!palette.visible.length) return;
      palette.sel = (palette.sel + d + palette.visible.length) % palette.visible.length;
      palette.paint();
      snd.tick();
    },

    run: function () {
      var it = palette.visible[palette.sel];
      if (!it) return;
      palette.close();
      snd.click();
      var a = it.act;
      if (a.fn) a.fn();
      else if (a.goto) window.location.href = a.goto;
      else if (a.ext) window.open(a.ext, a.ext.indexOf('mailto:') === 0 ? '_self' : '_blank');
      else if (a.dl) {
        var link = el('a');
        link.href = a.dl;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    },

    open: function () {
      if (!palette.root) { palette.build(); palette.mount(); }
      palette.isOpen = true;
      palette.root.classList.add('open');
      document.body.classList.add('locked');
      palette.input.value = '';
      palette.render('');
      snd.open();
      setTimeout(function () { palette.input.focus(); }, 30);
    },

    close: function () {
      if (!palette.root) return;
      palette.isOpen = false;
      palette.root.classList.remove('open');
      document.body.classList.remove('locked');
      palette.input.blur();
    }
  };

  function copyMail() {
    function done() { toast(T.mailCopied); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(MAIL).then(done, function () { window.location.href = 'mailto:' + MAIL; });
    } else {
      window.location.href = 'mailto:' + MAIL;
    }
  }

  /* ============================================================
     CRT MODE + KONAMI
     ============================================================ */

  var crtOverlay = null;
  function toggleCRT(silent) {
    var on = document.documentElement.classList.toggle('crt');
    if (on && !crtOverlay) {
      crtOverlay = el('div', 'crt-overlay');
      crtOverlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(crtOverlay);
    }
    if (!silent) toast(on ? T.crtOn : T.crtOff);
  }

  function initKonami() {
    var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    var pos = 0;
    document.addEventListener('keydown', function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[pos]) {
        pos++;
        if (pos === seq.length) {
          pos = 0;
          if (!document.documentElement.classList.contains('crt')) toggleCRT(true);
          toast(T.konami);
          snd.open();
        }
      } else {
        pos = k === seq[0] ? 1 : 0;
      }
    });
  }

  /* ============================================================
     MATRIX RAIN
     ============================================================ */

  var matrix = { canvas: null, raf: null, on: false };
  function toggleMatrix() {
    if (matrix.on) {
      matrix.on = false;
      cancelAnimationFrame(matrix.raf);
      if (matrix.canvas) {
        matrix.canvas.classList.remove('show');
        var c = matrix.canvas;
        setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 600);
        matrix.canvas = null;
      }
      toast(T.mxOff);
      return;
    }
    matrix.on = true;
    var canvas = el('canvas', 'matrix-canvas');
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    matrix.canvas = canvas;
    requestAnimationFrame(function () { canvas.classList.add('show'); });

    var ctx = canvas.getContext('2d');
    var chars = 'アイウエオカキクケコサシスセソタチツテト01<>/\\=+*#$';
    var drops = [];
    var fs = 15;

    function size() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      var cols = Math.floor(canvas.width / fs);
      drops = [];
      for (var i = 0; i < cols; i++) drops.push(Math.random() * -60);
    }
    size();
    window.addEventListener('resize', size);

    var last = 0;
    function draw(ts) {
      if (!matrix.on) return;
      matrix.raf = requestAnimationFrame(draw);
      if (ts - last < 50) return;
      last = ts;
      ctx.fillStyle = 'rgba(8, 8, 8, 0.16)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fs + 'px monospace';
      for (var i = 0; i < drops.length; i++) {
        var ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = Math.random() > 0.975 ? '#efece6' : 'rgba(80, 250, 123, 0.8)';
        ctx.fillText(ch, i * fs, drops[i] * fs);
        if (drops[i] * fs > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    }
    matrix.raf = requestAnimationFrame(draw);
    toast(T.mxOn);
  }

  /* ============================================================
     GLOBAL KEYBOARD
     ============================================================ */

  function initKeys() {
    document.addEventListener('keydown', function (e) {
      var inField = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (palette.isOpen) palette.close();
        else palette.open();
        return;
      }
      if (e.key === 'Escape') {
        if (palette.isOpen) { palette.close(); return; }
        if (matrix.on) { toggleMatrix(); return; }
        return;
      }
      if (inField) return;
    });
  }

  /* ============================================================
     SCROLL ENGINE — velocity, progress, skew, marquee
     ============================================================ */

  var scrollVel = 0;
  var scrollDir = 1;

  function initScrollEngine() {
    var bar = el('div', 'progress-bar');
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var readout = document.querySelector('.readout');
    var pct = null;
    if (readout) {
      pct = el('b', 'ro-pct', '000%');
      readout.appendChild(pct);
    }

    var lastY = window.scrollY;
    var skewEls = document.querySelectorAll('.work-list, .edu-list, .skill-list');
    var track = document.querySelector('.marquee-track');
    var mx = 0, half = 0;

    if (track && !reduced) {
      track.classList.add('js-drive');
      var measure = function () { half = track.scrollWidth / 2; };
      measure();
      window.addEventListener('resize', measure);
    }

    function frame() {
      requestAnimationFrame(frame);
      var y = window.scrollY;
      var d = y - lastY;
      lastY = y;
      if (d) scrollDir = d > 0 ? 1 : -1;
      scrollVel += (d - scrollVel) * 0.1;

      /* progress */
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? y / max : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      if (pct) pct.textContent = pad(Math.round(p * 100), 3) + '%';

      if (reduced) return;

      /* velocity skew */
      var sk = clamp(scrollVel * 0.05, -2.4, 2.4);
      for (var i = 0; i < skewEls.length; i++) {
        skewEls[i].style.transform = Math.abs(sk) > 0.05 ? 'skewY(' + sk.toFixed(2) + 'deg)' : '';
      }

      /* marquee: baseline drift + scroll boost, direction follows scroll */
      if (track && half > 0) {
        var speed = 0.7 + Math.min(Math.abs(scrollVel) * 0.22, 7);
        mx -= speed * scrollDir;
        if (mx <= -half) mx += half;
        if (mx > 0) mx -= half;
        track.style.transform = 'translateX(' + mx.toFixed(1) + 'px)';
      }
    }
    requestAnimationFrame(frame);
  }

  /* ============================================================
     TEXT SCRAMBLE — decode-on-hover
     ============================================================ */

  function initScramble() {
    if (reduced) return;
    var GLYPHS = '█▓▒░<>/\\|=+*#01';
    var sel = '.rail a, .top-links a:not(.lang), .c-socials a, .work-row h3, .skill-item .nm';
    document.querySelectorAll(sel).forEach(function (target) {
      var busy = false;
      var host = target.matches('h3, .nm') ? (target.closest('.work-row, .skill-item') || target) : target;
      host.addEventListener('mouseenter', function () {
        if (busy) return;
        busy = true;
        var orig = target.getAttribute('data-orig') || target.textContent;
        target.setAttribute('data-orig', orig);
        var w = target.getBoundingClientRect().width;
        if (w) target.style.minWidth = w + 'px';
        var frame = 0;
        var total = Math.min(3 + orig.length, 16);
        var iv = setInterval(function () {
          frame++;
          var done = Math.floor((frame / total) * orig.length);
          var out = '';
          for (var i = 0; i < orig.length; i++) {
            if (orig[i] === ' ') { out += ' '; continue; }
            out += i < done ? orig[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          target.textContent = out;
          if (frame >= total) {
            clearInterval(iv);
            target.textContent = orig;
            target.style.minWidth = '';
            busy = false;
          }
        }, 28);
      });
    });
  }

  /* ============================================================
     CURSOR LABEL — data-cursor contextual chip
     ============================================================ */

  function initCursorLabel() {
    if (!fine || reduced) return;
    var chip = el('div', 'cursor-label');
    chip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(chip);
    var mx = -100, my = -100, x = -100, y = -100, on = false;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      var t = e.target.closest && e.target.closest('[data-cursor]');
      if (t) {
        var txt = t.getAttribute('data-cursor');
        if (chip.textContent !== txt) chip.textContent = txt;
        if (!on) { on = true; chip.classList.add('show'); }
      } else if (on) {
        on = false;
        chip.classList.remove('show');
      }
    }, { passive: true });

    (function loop() {
      x += (mx - x) * 0.2;
      y += (my - y) * 0.2;
      chip.style.transform = 'translate(' + (x + 22) + 'px,' + (y + 24) + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ============================================================
     HERO — flashlight reveal + letter repel
     ============================================================ */

  function initSpotlight() {
    if (!fine || reduced) return;
    var hero = document.querySelector('.hero');
    var base = document.querySelector('.hero-img');
    if (!hero || !base) return;

    var color = base.cloneNode();
    color.className = 'hero-img hero-img-color';
    color.removeAttribute('data-parallax');
    color.setAttribute('aria-hidden', 'true');
    base.parentNode.insertBefore(color, base.nextSibling);

    hero.addEventListener('mousemove', function (e) {
      var r = color.getBoundingClientRect();
      color.style.setProperty('--sx', (e.clientX - r.left) + 'px');
      color.style.setProperty('--sy', (e.clientY - r.top) + 'px');
    }, { passive: true });

    hero.addEventListener('mouseleave', function () {
      color.style.setProperty('--sx', '-999px');
      color.style.setProperty('--sy', '-999px');
    });

    (function sync() {
      if (color.style.transform !== base.style.transform) color.style.transform = base.style.transform;
      requestAnimationFrame(sync);
    })();
  }

  function initHeroLetters() {
    if (!fine || reduced) return;
    var h1 = document.querySelector('.hero h1');
    if (!h1) return;

    h1.querySelectorAll('.ww').forEach(function (w) {
      var txt = w.textContent;
      w.textContent = '';
      for (var i = 0; i < txt.length; i++) {
        var s = el('span', 'hl', txt[i]);
        w.appendChild(s);
      }
    });

    var letters = Array.prototype.slice.call(h1.querySelectorAll('.hl'));
    if (!letters.length) return;
    var pts = [];

    function map() {
      pts = letters.map(function (l) {
        var r = l.getBoundingClientRect();
        return {
          el: l,
          x: r.left + r.width / 2 + window.scrollX,
          y: r.top + r.height / 2 + window.scrollY,
          tx: 0, ty: 0, cx: 0, cy: 0
        };
      });
    }

    /* free the word masks once reveal has played, then measure */
    setTimeout(function () {
      h1.classList.add('free');
      map();
    }, 2400);
    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(map, 200);
    });

    var mpx = -9999, mpy = -9999;
    document.addEventListener('mousemove', function (e) {
      mpx = e.pageX;
      mpy = e.pageY;
    }, { passive: true });

    var R = 170;
    (function loop() {
      requestAnimationFrame(loop);
      if (!pts.length) return;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var dx = p.x - mpx;
        var dy = p.y - mpy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < R && dist > 0.1) {
          var f = 1 - dist / R;
          p.tx = (dx / dist) * f * 34;
          p.ty = (dy / dist) * f * 22;
        } else {
          p.tx = 0;
          p.ty = 0;
        }
        p.cx += (p.tx - p.cx) * 0.16;
        p.cy += (p.ty - p.cy) * 0.16;
        if (Math.abs(p.cx) > 0.05 || Math.abs(p.cy) > 0.05) {
          p.el.style.transform = 'translate(' + p.cx.toFixed(1) + 'px,' + p.cy.toFixed(1) + 'px)';
        } else if (p.el.style.transform) {
          p.el.style.transform = '';
        }
      }
    })();
  }

  /* ============================================================
     COUNT-UP STATS
     ============================================================ */

  function initCounts() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;

    function run(elm) {
      var target = parseInt(elm.getAttribute('data-count'), 10) || 0;
      var padW = parseInt(elm.getAttribute('data-pad'), 10) || 0;
      if (reduced) { elm.textContent = pad(target, padW); return; }
      var start = null;
      var dur = 1400;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        elm.textContent = pad(Math.round(eased * target), padW);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) {
      els.forEach(run);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          run(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.4 });
    els.forEach(function (elm) { io.observe(elm); });
  }

  /* ============================================================
     DARKROOM — draggable, throwable prints
     ============================================================ */

  function initDeck() {
    var stage = document.getElementById('deck-stage');
    if (!stage) return;
    var prints = Array.prototype.slice.call(stage.querySelectorAll('.print'));
    if (!prints.length) return;

    var seeds = [[8, 12], [33, 46], [58, 10], [77, 42]];
    var zTop = 10;
    var cards = prints.map(function (p, i) {
      return {
        el: p,
        x: 0, y: 0, vx: 0, vy: 0,
        rot: parseFloat(p.getAttribute('data-rot')) || 0,
        tilt: 0,
        held: false,
        gx: 0, gy: 0, px: 0, py: 0
      };
    });

    function layout() {
      var sw = stage.clientWidth, sh = stage.clientHeight;
      cards.forEach(function (c, i) {
        var s = seeds[i % seeds.length];
        c.x = clamp(s[0] / 100 * sw, 0, Math.max(0, sw - c.el.offsetWidth));
        c.y = clamp(s[1] / 100 * sh, 0, Math.max(0, sh - c.el.offsetHeight));
        c.vx = 0;
        c.vy = 0;
      });
    }
    layout();
    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(layout, 200);
    });

    cards.forEach(function (c) {
      c.el.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { c.el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or stale pointer */ }
        c.held = true;
        c.pid = e.pointerId;
        c.vx = 0;
        c.vy = 0;
        var sr = stage.getBoundingClientRect();
        c.gx = e.clientX - sr.left - c.x;
        c.gy = e.clientY - sr.top - c.y;
        c.px = c.x;
        c.py = c.y;
        zTop++;
        c.el.style.zIndex = zTop;
        c.el.classList.add('held');
      });
    });

    /* drag is tracked at window level so fast flicks never escape */
    window.addEventListener('pointermove', function (e) {
      var sr = null;
      cards.forEach(function (c) {
        if (!c.held || c.pid !== e.pointerId) return;
        if (!sr) sr = stage.getBoundingClientRect();
        c.px = c.x;
        c.py = c.y;
        c.x = e.clientX - sr.left - c.gx;
        c.y = e.clientY - sr.top - c.gy;
        c.vx = c.x - c.px;
        c.vy = c.y - c.py;
      });
    });

    function releaseAll(e) {
      cards.forEach(function (c) {
        if (!c.held || c.pid !== e.pointerId) return;
        c.held = false;
        c.el.classList.remove('held');
        if (reduced) { c.vx = 0; c.vy = 0; }
      });
    }
    window.addEventListener('pointerup', releaseAll);
    window.addEventListener('pointercancel', releaseAll);

    (function loop() {
      requestAnimationFrame(loop);
      var sw = stage.clientWidth, sh = stage.clientHeight;
      cards.forEach(function (c) {
        if (!c.held) {
          c.x += c.vx;
          c.y += c.vy;
          c.vx *= 0.94;
          c.vy *= 0.94;
          if (Math.abs(c.vx) < 0.05) c.vx = 0;
          if (Math.abs(c.vy) < 0.05) c.vy = 0;
        }
        var maxX = Math.max(0, sw - c.el.offsetWidth);
        var maxY = Math.max(0, sh - c.el.offsetHeight);
        if (c.x < 0) { c.x = 0; c.vx = Math.abs(c.vx) * 0.55; }
        if (c.x > maxX) { c.x = maxX; c.vx = -Math.abs(c.vx) * 0.55; }
        if (c.y < 0) { c.y = 0; c.vy = Math.abs(c.vy) * 0.55; }
        if (c.y > maxY) { c.y = maxY; c.vy = -Math.abs(c.vy) * 0.55; }

        var targetTilt = clamp(c.vx * 1.6, -12, 12);
        c.tilt += (targetTilt - c.tilt) * 0.12;
        c.el.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,0) rotate(' + (c.rot + c.tilt).toFixed(2) + 'deg)';
      });
    })();
  }

  /* ============================================================
     FOOTER EYE + REEL TIMER
     ============================================================ */

  function initEye() {
    var wrap = document.querySelector('.eye-wrap');
    if (!wrap) return;
    var pupil = wrap.querySelector('.pupil');
    if (!pupil) return;

    if (fine && !reduced) {
      var tx = 0, ty = 0, cx = 0, cy = 0;
      document.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var m = Math.min(d / 18, 9);
        tx = (dx / d) * m;
        ty = (dy / d) * m * 0.6;
      }, { passive: true });
      (function loop() {
        cx += (tx - cx) * 0.12;
        cy += (ty - cy) * 0.12;
        pupil.style.transform = 'translate(calc(-50% + ' + cx.toFixed(1) + 'px), calc(-50% + ' + cy.toFixed(1) + 'px))';
        requestAnimationFrame(loop);
      })();
    }

    /* random blinks */
    if (!reduced) {
      (function blink() {
        setTimeout(function () {
          wrap.classList.add('blink');
          setTimeout(function () { wrap.classList.remove('blink'); }, 160);
          blink();
        }, 2400 + Math.random() * 4200);
      })();
    }
  }

  var bootTime = Date.now();
  function initReel() {
    var meta = document.querySelector('.credits .c-meta');
    if (!meta) return;
    var span = el('span', 'reel-time', T.reel + ' 00:00');
    meta.insertBefore(span, meta.lastElementChild);
    setInterval(function () {
      var s = Math.floor((Date.now() - bootTime) / 1000);
      span.textContent = T.reel + ' ' + pad(Math.floor(s / 60), 2) + ':' + pad(s % 60, 2);
    }, 1000);
  }

  /* ============================================================
     FIRST-VISIT HINT + CONSOLE CARD
     ============================================================ */

  function initHint() {
    if (!fine) return;
    if (sessionStorage.getItem('mm-hint')) return;
    sessionStorage.setItem('mm-hint', '1');
    setTimeout(function () { toast(T.hint); }, 2600);
  }

  function consoleCard() {
    try {
      console.log(
        '%c MACALINTAL — OBSIDIAN CUT %c\n' +
        'psst… Ctrl+K opens the command palette,\nand the Konami code does something.\n',
        'background:#efece6;color:#080808;font-weight:bold;padding:4px 8px;',
        ''
      );
    } catch (e) { /* no console, no problem */ }
  }

  /* ============================================================
     BOOT
     ============================================================ */

  document.addEventListener('DOMContentLoaded', function () {
    isStart = !!document.querySelector('.title-card');

    snd.init();
    initSoundEvents();
    initTopbarButtons();
    initKeys();
    initKonami();
    initScrollEngine();
    initScramble();
    initCursorLabel();
    initSpotlight();
    initHeroLetters();
    initCounts();
    initDeck();
    initEye();
    initReel();
    initHint();
    consoleCard();
  });
})();
