/* ============================================================
   main.js — OBSIDIAN CUT engine
   Injects: film grain, preloader, custom cursor.
   Handles: menu overlay, scroll-spy rail + readout, split-text
   reveals, word rotator, cursor-follow work previews, parallax,
   magnetic buttons, Madrid local time.
   ============================================================ */

(function () {
  'use strict';

  /* Preview escape hatch: ?motion=full plays everything regardless of the OS
     reduced-motion setting. See js/fx.js for the same switch. */
  var forceFull = /[?&]motion=full\b/.test(window.location.search);
  if (forceFull) document.documentElement.setAttribute('data-motion', 'full');

  var reduced = !forceFull && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;

  document.addEventListener('DOMContentLoaded', function () {
    injectGrain();
    initPreloader();
    initMenu();
    initSplit();
    initReveals();
    initRotator();
    initSpy();
    initTime();
    if (!reduced) {
      initParallax();
      if (fine) {
        initCursor();
        initWorkPreview();
        initMagnetic();
      }
    }
  });

  /* ---------- film grain ---------- */

  function injectGrain() {
    var g = document.createElement('div');
    g.className = 'grain';
    g.setAttribute('aria-hidden', 'true');
    document.body.appendChild(g);
  }

  /* ---------- preloader (once per session) ---------- */

  function initPreloader() {
    if (reduced || sessionStorage.getItem('mmIntroSeen')) return;
    sessionStorage.setItem('mmIntroSeen', '1');

    var tags = {
      en: 'a portfolio by matthew macalintal',
      es: 'un portfolio de matthew macalintal',
      fil: 'isang portfolio ni matthew macalintal'
    };
    var loader = document.createElement('div');
    loader.className = 'loader';

    var name = document.createElement('div');
    name.className = 'loader-name';
    var word = 'MACALINTAL';
    for (var i = 0; i < word.length; i++) {
      var s = document.createElement('span');
      s.textContent = word[i];
      s.style.setProperty('--i', i);
      name.appendChild(s);
    }

    var tag = document.createElement('div');
    tag.className = 'loader-tag';
    tag.textContent = tags[document.documentElement.lang] || tags.en;

    var count = document.createElement('div');
    count.className = 'loader-count';
    count.textContent = '000';

    loader.appendChild(name);
    loader.appendChild(tag);
    loader.appendChild(count);
    document.body.appendChild(loader);
    document.body.classList.add('locked');

    var start = null;
    var duration = 1300;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var n = String(Math.round(p * 100));
      while (n.length < 3) n = '0' + n;
      count.textContent = n;
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        loader.classList.add('done');
        document.body.classList.remove('locked');
        setTimeout(function () {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 1000);
      }
    }
    requestAnimationFrame(step);
  }

  /* ---------- fullscreen menu ---------- */

  function initMenu() {
    var btn = document.getElementById('menu-btn');
    var overlay = document.getElementById('menu-overlay');
    if (!btn || !overlay) return;

    btn.addEventListener('click', function () {
      var open = overlay.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('locked', open);
    });

    overlay.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        overlay.classList.remove('open');
        btn.classList.remove('open');
        document.body.classList.remove('locked');
      });
    });
  }

  /* ---------- split-text mask reveals ---------- */

  function initSplit() {
    var els = document.querySelectorAll('[data-split]');
    els.forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach(function (w, i) {
        var mask = document.createElement('span');
        mask.className = 'wm';
        var inner = document.createElement('span');
        inner.className = 'ww';
        inner.style.setProperty('--i', i);
        inner.textContent = w;
        mask.appendChild(inner);
        el.appendChild(mask);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });

    if (els.length === 0) return;

    if (!('IntersectionObserver' in window) || reduced) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- block reveals ---------- */

  function initReveals() {
    var items = document.querySelectorAll('[data-reveal]');
    if (items.length === 0) return;

    if (!('IntersectionObserver' in window) || reduced) {
      items.forEach(function (el) { el.classList.add('revealed'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var d = e.target.getAttribute('data-reveal-delay');
          if (d) e.target.style.transitionDelay = d + 'ms';
          e.target.classList.add('revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- word rotator ---------- */

  function initRotator() {
    var el = document.querySelector('[data-rotate]');
    if (!el) return;

    var words;
    try {
      words = JSON.parse(el.getAttribute('data-rotate'));
    } catch (e) {
      return;
    }
    if (!words || words.length === 0) return;

    var spans = words.map(function (w) {
      var s = document.createElement('span');
      s.textContent = w;
      el.appendChild(s);
      return s;
    });

    var idx = 0;
    spans[0].classList.add('on');
    if (reduced || words.length < 2) return;

    setInterval(function () {
      spans[idx].classList.remove('on');
      idx = (idx + 1) % spans.length;
      spans[idx].classList.add('on');
    }, 2600);
  }

  /* ---------- scroll spy: rail + readout ---------- */

  function initSpy() {
    var sections = document.querySelectorAll('section[data-label]');
    var railLinks = document.querySelectorAll('.rail a[href^="#"]');
    var readoutIdx = document.getElementById('ro-idx');
    var readoutLabel = document.getElementById('ro-label');
    if (sections.length === 0) return;

    var total = sections.length;

    function setActive(id, label, index) {
      railLinks.forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
      if (readoutIdx) {
        var n = String(index + 1);
        if (n.length < 2) n = '0' + n;
        var t = String(total);
        if (t.length < 2) t = '0' + t;
        readoutIdx.textContent = n + '/' + t;
      }
      if (readoutLabel) readoutLabel.textContent = label;
    }

    if (!('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          var index = Array.prototype.indexOf.call(sections, el);
          setActive(el.id, el.getAttribute('data-label'), index);
        }
      });
    }, { rootMargin: '-42% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---------- custom cursor (blend difference) ---------- */

  function initCursor() {
    var dot = document.createElement('div');
    var ring = document.createElement('div');
    dot.className = 'cursor hide';
    ring.className = 'cursor-o hide';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.classList.add('has-cursor');

    var mx = -100, my = -100, rx = -100, ry = -100;
    var shown = false;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (!shown) {
        shown = true;
        dot.classList.remove('hide');
        ring.classList.remove('hide');
      }
      var t = e.target;
      var interactive = t.closest && t.closest('a, button, .skill-item, label, .print, [data-cursor]');
      var field = t.closest && t.closest('input, textarea, select');
      ring.classList.toggle('grow', !!interactive && !field);
      dot.classList.toggle('hide', !!field);
      ring.classList.toggle('hide', !!field);
    }, { passive: true });

    document.addEventListener('mouseleave', function () {
      shown = false;
      dot.classList.add('hide');
      ring.classList.add('hide');
    });

    (function loop() {
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- work rows: cursor-follow preview ---------- */

  function initWorkPreview() {
    var rows = document.querySelectorAll('.work-row[data-preview]');
    if (rows.length === 0) return;

    var box = document.createElement('div');
    box.className = 'work-preview';
    var img = document.createElement('img');
    img.alt = '';
    box.appendChild(img);
    document.body.appendChild(box);

    var mx = 0, my = 0, x = 0, y = 0;
    var active = false;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });

    (function loop() {
      x += (mx - x) * 0.12;
      y += (my - y) * 0.12;
      box.style.transform = 'translate(' + (x + 30) + 'px,' + (y - 110) + 'px)' +
        (active ? ' scale(1)' : ' scale(0.85)');
      requestAnimationFrame(loop);
    })();

    rows.forEach(function (row) {
      row.addEventListener('mouseenter', function () {
        var src = row.getAttribute('data-preview');
        if (!src) return;
        img.src = src;
        active = true;
        box.classList.add('show');
      });
      row.addEventListener('mouseleave', function () {
        active = false;
        box.classList.remove('show');
      });
    });
  }

  /* ---------- parallax ---------- */

  function initParallax() {
    var els = document.querySelectorAll('[data-parallax]');
    if (els.length === 0) return;

    var items = Array.prototype.map.call(els, function (el) {
      return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.1 };
    });

    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      items.forEach(function (it) {
        var rect = it.el.getBoundingClientRect();
        var center = rect.top + rect.height / 2 - vh / 2;
        it.el.style.transform = 'translateY(' + (-center * it.speed).toFixed(1) + 'px)';
      });
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ---------- magnetic buttons ---------- */

  function initMagnetic() {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + x * 0.15 + 'px,' + y * 0.25 + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });
  }

  /* ---------- Madrid local time ---------- */

  function initTime() {
    var el = document.getElementById('local-time');
    if (!el) return;

    function tick() {
      try {
        el.textContent = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Madrid',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(new Date()) + ' CET';
      } catch (e) {
        el.textContent = new Date().toLocaleTimeString();
      }
    }
    tick();
    setInterval(tick, 1000);
  }
})();
