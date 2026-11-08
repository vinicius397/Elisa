/* ==========================================================================
   Elisa Vasconcelos — site.js
   Monta a página a partir de content/content.js e cuida do movimento.
   ========================================================================== */
(function () {
  'use strict';

  var PREVIEW = /[?&]preview\b/.test(location.search);
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var root = document.documentElement;

  /* ---------------------------------------------------------------- utils */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // texto seguro; no modo prévia, marcadores [assim] ficam destacados
  function t(s) {
    var h = esc(s);
    if (PREVIEW) h = h.replace(/\[([^\]]*)\]/g, '<mark class="ph">[$1]</mark>');
    return h;
  }
  function attr(s) { return esc(s); }
  function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function arr(a) { return Array.isArray(a) ? a : []; }
  function obj(o) { return o && typeof o === 'object' ? o : {}; }
  function src(p) { return String(p || '').replace(/^\/+/, ''); }
  function reduced() { return mqReduce.matches; }
  function isPlaceholder(s) { return !s || /^\s*\[.*\]\s*$/.test(String(s)); }
  function ratioOf(o, fallback) { var r = parseFloat(o && o.ratio); return r > 0.2 && r < 5 ? r : fallback; }
  function imgSize(r) { return 'width="' + Math.round(1000 * r) + '" height="1000"'; }
  function waLink(num, text) {
    var n = String(num || '').replace(/\D/g, '');
    return n ? 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '') : '';
  }

  /* ------------------------------------------------------------- cleanup */
  var cleanups = [];
  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    cleanups.push(function () { target.removeEventListener(type, fn, opts); });
  }
  function observe(io) { cleanups.push(function () { io.disconnect(); }); return io; }
  function destroy() { while (cleanups.length) { try { cleanups.pop()(); } catch (e) { /* noop */ } } }

  /* ============================================================ RENDER */
  var C = {};
  var NAV = [
    ['gallery', '#galeria'], ['series', '#projetos'], ['about', '#sobre'], ['services', '#servicos'], ['contact', '#contato']
  ];

  function render(content) {
    C = obj(content);
    var site = obj(C.site), nav = obj(C.nav);
    var fullName = [site.name1, site.name2].filter(Boolean).join(' ');

    // head
    if (site.title) document.title = site.title;
    var md = $('meta[name="description"]'); if (md && site.description) md.setAttribute('content', site.description);

    // header + menu
    $('[data-r="brand"]').innerHTML = esc(site.name1 || '') + ' <em>' + esc(site.name2 || '') + '</em>';
    $('[data-r="brand"]').setAttribute('aria-label', fullName + ', início');
    $('[data-r="nav"]').innerHTML = NAV.map(function (n) {
      return '<a href="' + n[1] + '">' + t(nav[n[0]] || n[0]) + '</a>';
    }).join('');
    $('[data-r="menu"]').innerHTML = NAV.map(function (n, i) {
      return '<a href="' + n[1] + '"><span>' + pad(i + 1) + '</span>' + t(nav[n[0]] || n[0]) + '</a>';
    }).join('');
    $('[data-r="menuFoot"]').innerHTML = '<span class="caps">' + t(site.city) + '</span><br>' +
      (site.phone ? '<a href="' + attr(waLink(site.whatsapp)) + '" target="_blank" rel="noopener">' + t(site.phone) + '</a>' : '');

    renderHero(site);
    renderGallery();
    renderSeries();
    renderAbout();
    renderServices();
    renderClients();
    renderContact(site);
    renderFooter(site);
    renderSchema(site);
  }

  function letters(word, start) {
    return Array.prototype.map.call(String(word || ''), function (ch, i) {
      return '<span class="ch" style="--i:' + (start + i) + '">' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>';
    }).join('');
  }

  function renderHero(site) {
    var h = obj(C.hero), img = obj(h.image);
    var n1 = site.name1 || '', n2 = site.name2 || '';
    var cap = String(h.caption || '');
    var capParts = cap.split(' — ');
    $('[data-r="hero"]').innerHTML =
      '<p class="hero__edge caps" aria-hidden="true">' + t(h.edge) + '</p>' +
      '<figure class="hero__figure">' +
        '<div class="hero__img"><img src="' + attr(src(img.src)) + '" alt="' + attr(img.alt) + '" ' + imgSize(ratioOf(img, .667)) + ' fetchpriority="high" decoding="async"></div>' +
        (cap ? '<figcaption class="hero__caption caps"><span>' + t(capParts[0]) + '</span>' + (capParts[1] ? '<span>' + t(capParts.slice(1).join(' — ')) + '</span>' : '') + '</figcaption>' : '') +
      '</figure>' +
      '<h1 class="hero__name"><span class="sr-only">' + esc(n1 + ' ' + n2) + '</span>' +
        '<span class="hero__line hero__line--1" aria-hidden="true">' + letters(n1, 0) + '</span>' +
        '<span class="hero__line hero__line--2" aria-hidden="true">' + letters(n2, n1.length) + '</span>' +
      '</h1>' +
      '<div class="hero__info">' +
        '<p class="hero__eyebrow caps"><i class="dot"></i>' + t(h.eyebrow || site.role) + '</p>' +
        '<p class="hero__city caps">' + t(site.city) + '</p>' +
        (h.intro ? '<p class="hero__intro">' + t(h.intro) + '</p>' : '') +
        (h.cta ? '<a class="hero__cta caps" href="#galeria">' + t(h.cta) + ' <span aria-hidden="true">↓</span></a>' : '') +
      '</div>';
  }

  function digitStrip(d) {
    var s = '';
    for (var i = 0; i < 10; i++) s += '<span>' + i + '</span>';
    return '<span class="digit"><span class="digit__strip" style="transform:translateY(' + (-d * 10) + '%)">' + s + '</span></span>';
  }

  function renderGallery() {
    var g = obj(C.gallery), items = arr(g.items);
    var n = items.length;
    var marks = '';
    for (var k = 0; k < n; k++) marks += '<i class="progress__mark" style="left:' + (n > 1 ? (k / (n - 1)) * 100 : 0) + '%"></i>';
    $('[data-r="gallery"]').innerHTML =
      '<div class="gallery__pin">' +
        '<div class="gallery__head"><p class="caps"><i class="dot"></i>' + t(g.label) + '</p>' +
          '<p class="gallery__hint caps" aria-hidden="true">Role para caminhar &nbsp;→</p></div>' +
        '<div class="gallery__viewport">' +
          '<ol class="gallery__track">' +
            '<li class="g-intro"><h2 class="g-intro__title">' + t(g.title) + '</h2>' +
              (g.intro ? '<p class="g-intro__text">' + t(g.intro) + '</p>' : '') +
              '<p class="g-intro__hint caps" aria-hidden="true">' + pad(n) + ' fotos</p></li>' +
            items.map(function (it, i) {
              it = obj(it);
              var r = ratioOf(it, 1.5);
              return '<li class="g-item" data-i="' + i + '" data-size="' + attr(it.size || 'm') + '" data-y="' + attr(it.y || 'mid') + '" data-ratio="' + r + '">' +
                '<p class="g-item__edge" aria-hidden="true"><span>' + t(it.edge || ('EV ▸ ' + pad(i + 1) + 'A')) + '</span><span>' + pad(i + 1) + '<i class="dot"></i></span></p>' +
                '<button class="g-item__frame" type="button" aria-label="Ampliar foto ' + (i + 1) + ': ' + attr(it.title) + '">' +
                  '<img src="' + attr(src(it.src)) + '" alt="' + attr(it.alt) + '" ' + imgSize(r) + ' loading="' + (i < 3 ? 'eager' : 'lazy') + '" decoding="async"></button>' +
                '<div class="g-item__cap"><p class="g-item__title">' + t(it.title) + '</p>' +
                  (it.meta ? '<p class="g-item__meta caps">' + t(it.meta) + '</p>' : '') + '</div>' +
              '</li>';
            }).join('') +
          '</ol>' +
        '</div>' +
        '<div class="gallery__foot">' +
          '<p class="counter"><span class="sr-only">Foto </span><span class="counter__cur">' + digitStrip(0) + digitStrip(1) + '</span><span class="counter__sep">/</span><span class="counter__tot">' + pad(n) + '</span></p>' +
          '<div class="progress" aria-hidden="true">' + marks + '<i class="progress__tick"></i></div>' +
        '</div>' +
      '</div>';
  }

  function titleHtml(s) {
    // permite *itálico* nos títulos
    return t(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function renderSeries() {
    var s = obj(C.series), items = arr(s.items);
    $('[data-r="series"]').innerHTML =
      '<header class="sec-head" data-reveal><p class="caps"><i class="dot"></i>' + t(s.label) + '</p><h2 class="sec-title">' + titleHtml(s.title) + '</h2></header>' +
      '<div class="series__cover" aria-hidden="true">' +
        '<div class="series__frames">' + items.map(function (it, i) {
          var img = obj(obj(it).image);
          return '<figure class="' + (i === 0 ? 'is-active' : '') + '"><img src="' + attr(src(img.src)) + '" alt="" ' + imgSize(ratioOf(img, .8)) + ' loading="lazy" decoding="async"></figure>';
        }).join('') + '</div>' +
        '<p class="series__label caps"><span class="series__label-t">' + t(obj(items[0]).title) + '</span><span class="series__label-n">' + pad(1) + ' / ' + pad(items.length) + '</span></p>' +
      '</div>' +
      '<ol class="series__list">' + items.map(function (it, i) {
        it = obj(it); var img = obj(it.image);
        return '<li class="s-item' + (i === 0 ? ' is-active' : '') + '" data-i="' + i + '">' +
          '<p class="s-item__num" aria-hidden="true">' + pad(i + 1) + '</p>' +
          '<div><h3 class="s-item__title">' + titleHtml(it.title) + '</h3>' +
            '<p class="s-item__text">' + t(it.text) + '</p>' +
            (it.tags ? '<p class="s-item__tags caps">' + t(it.tags) + '</p>' : '') + '</div>' +
          '<figure class="s-item__img"><img src="' + attr(src(img.src)) + '" alt="' + attr(img.alt) + '" ' + imgSize(ratioOf(img, .8)) + ' loading="lazy" decoding="async"></figure>' +
        '</li>';
      }).join('') + '</ol>';
  }

  var GREASE = 'M 22 64 C 14 34, 52 14, 104 12 C 158 10, 192 30, 190 58 C 188 88, 146 104, 96 104 C 46 104, 12 88, 14 60 C 16 38, 44 22, 82 17';

  function renderAbout() {
    var a = obj(C.about), sheet = arr(a.sheet), stats = arr(a.stats);
    var circled = parseInt(a.circled, 10); if (isNaN(circled)) circled = -1;
    var strips = [];
    for (var i = 0; i < sheet.length; i += 4) strips.push(sheet.slice(i, i + 4));
    $('[data-r="about"]').innerHTML =
      '<div class="about__grid">' +
        '<div data-reveal><p class="about__label caps"><i class="dot"></i>' + t(a.label) + '</p>' +
          '<blockquote class="about__quote"><p>“' + t(a.quote) + '”</p></blockquote>' +
          (a.quoteBy ? '<p class="about__by caps">— ' + t(a.quoteBy) + '</p>' : '') +
        '</div>' +
        '<div class="about__text" data-reveal>' + arr(a.paragraphs).map(function (p) { return '<p>' + t(p) + '</p>'; }).join('') + '</div>' +
      '</div>' +
      (sheet.length ? '<div class="sheet" data-reveal>' +
        '<div class="sheet__head"><p class="caps">' + t(a.sheetLabel) + '</p><p class="sheet__cap">' + t(a.sheetCaption) + '</p></div>' +
        '<div class="sheet__strips">' + strips.map(function (row, r) {
          return '<div class="sheet__strip">' + row.map(function (p, j) {
            var idx = r * 4 + j;
            return '<div class="sheet__frame' + (idx === circled ? ' is-circled' : '') + '">' +
              '<span class="sheet__no" aria-hidden="true">▸ ' + (idx + 1) + ' &nbsp; ' + (idx + 1) + 'A</span>' +
              '<img src="' + attr(src(p)) + '" alt="" width="600" height="400" loading="lazy" decoding="async">' +
              (idx === circled ? '<svg class="grease" viewBox="0 0 204 116" preserveAspectRatio="none" aria-hidden="true"><filter id="pencil"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.2"/></filter><path filter="url(#pencil)" pathLength="1" d="' + GREASE + '"/></svg>' : '') +
            '</div>';
          }).join('') + '</div>';
        }).join('') + '</div>' +
      '</div>' : '') +
      (stats.length ? '<dl class="stats" data-reveal>' + stats.map(function (s) {
        s = obj(s);
        return '<div class="stat"><dt class="sr-only">' + t(s.label) + '</dt><dd class="stat__v">' + t(s.value) + '</dd><dd class="stat__l caps" aria-hidden="true">' + t(s.label) + '</dd></div>';
      }).join('') + '</dl>' : '');
  }

  function renderServices() {
    var s = obj(C.services), items = arr(s.items);
    $('[data-r="services"]').innerHTML =
      '<header class="sec-head" data-reveal><p class="caps"><i class="dot"></i>' + t(s.label) + '</p><div><h2 class="sec-title">' + titleHtml(s.title) + '</h2>' +
        (s.intro ? '<p class="services__intro" style="grid-column:auto">' + t(s.intro) + '</p>' : '') + '</div></header>' +
      '<ol class="price">' + items.map(function (it, i) {
        it = obj(it);
        return '<li class="price__row" data-reveal>' +
          '<p class="price__no">' + pad(i + 1) + '</p>' +
          '<h3 class="price__title">' + titleHtml(it.title) + '</h3>' +
          '<div class="price__desc-wrap"><p class="price__desc">' + t(it.text) + '</p>' + (it.includes ? '<p class="price__inc">' + t(it.includes) + '</p>' : '') + '</div>' +
          '<div class="price__val"><p class="price__amt">' + t(it.price) + '</p>' + (it.unit ? '<p class="price__unit caps">' + t(it.unit) + '</p>' : '') + '</div>' +
        '</li>';
      }).join('') + '</ol>' +
      (s.note ? '<p class="services__note" data-reveal>' + t(s.note) + '</p>' : '');
  }

  function renderClients() {
    var c = obj(C.clients), names = arr(c.names);
    var el = $('[data-r="clients"]');
    el.hidden = !names.length;
    el.innerHTML =
      '<div class="clients__head"><p class="caps"><i class="dot"></i>' + t(c.label) + '</p><p class="clients__title">' + t(c.title) + '</p></div>' +
      '<ul class="clients__list">' + names.map(function (n, i) { return '<li style="--i:' + i + '">' + t(n) + '</li>'; }).join('') + '</ul>';
  }

  function splitTitle(s) {
    s = String(s || '');
    var i = s.indexOf('-');
    if (i > 0 && i < s.length - 1) return [s.slice(0, i + 1), s.slice(i + 1)];
    i = s.lastIndexOf(' ');
    if (i > 0) return [s.slice(0, i), s.slice(i + 1)];
    return [s];
  }

  function renderContact(site) {
    var c = obj(C.contact), types = arr(c.types);
    var parts = splitTitle(c.title);
    var rows = [];
    if (site.phone) rows.push(['WhatsApp', '<a href="' + attr(waLink(site.whatsapp)) + '" target="_blank" rel="noopener">' + t(site.phone) + '</a>']);
    if (site.email) rows.push(['E-mail', isPlaceholder(site.email) ? t(site.email) : '<a href="mailto:' + attr(site.email) + '">' + t(site.email) + '</a>']);
    if (site.instagram) {
      var ig = String(site.instagram).replace(/^@/, '');
      rows.push(['Instagram', isPlaceholder(site.instagram) ? t(site.instagram) : '<a href="https://instagram.com/' + attr(ig) + '" target="_blank" rel="noopener">@' + t(ig) + '</a>']);
    }
    if (site.city) rows.push(['Onde', t(site.city)]);
    $('[data-r="contact"]').innerHTML =
      '<div>' +
        '<p class="contact__label caps"><i class="dot"></i>' + t(c.label) + '</p>' +
        '<h2 class="contact__title" data-reveal>' + parts.map(function (p) { return '<span>' + t(p) + '</span>'; }).join('') + '</h2>' +
        (c.intro ? '<p class="contact__intro">' + t(c.intro) + '</p>' : '') +
        '<dl class="contact__list">' + rows.map(function (r) { return '<dt class="caps">' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' +
      '</div>' +
      '<form class="form" novalidate>' +
        '<div class="field"><label class="caps" for="f-name">' + t(c.fieldName) + '</label><input id="f-name" name="name" autocomplete="name" required></div>' +
        '<div class="field"><label class="caps" for="f-email">' + t(c.fieldEmail) + '</label><input id="f-email" name="email" type="email" autocomplete="email" inputmode="email"></div>' +
        (types.length ? '<fieldset class="field"><legend class="caps">' + t(c.fieldType) + '</legend><div class="chips">' + types.map(function (ty, i) {
          return '<label class="chip"><input type="radio" name="type" value="' + attr(ty) + '"' + (i === 0 ? ' checked' : '') + '><span>' + t(ty) + '</span></label>';
        }).join('') + '</div></fieldset>' : '') +
        '<div class="field"><label class="caps" for="f-city">' + t(c.fieldCity) + '</label><input id="f-city" name="city" autocomplete="address-level2"></div>' +
        '<div class="field"><label class="caps" for="f-msg">' + t(c.fieldMessage) + '</label><textarea id="f-msg" name="message" rows="4" required></textarea></div>' +
        '<button class="form__send" type="submit">' + t(c.button) + ' <span aria-hidden="true">→</span></button>' +
        '<p class="form__status" role="status" aria-live="polite"></p>' +
        (c.formNote ? '<p class="form__note">' + t(c.formNote) + '</p>' : '') +
      '</form>';
  }

  function renderFooter(site) {
    var f = obj(C.footer);
    var count = String(f.count || '');
    var m = count.match(/^(\s*\d+)(.*)$/);
    var edge = '';
    for (var i = 0; i < 8; i++) edge += '▸ ' + (36 + i) + ' &nbsp;&nbsp; ' + esc(String(site.name1 || '') + ' ' + String(site.name2 || '')).toUpperCase() + ' &nbsp;&nbsp; ▸ ' + (36 + i) + 'A &nbsp;&nbsp;&nbsp;&nbsp; ';
    $('[data-r="footer"]').innerHTML =
      '<div class="foot__row">' +
        '<p class="foot__roll"><span class="caps">' + t(f.roll) + '</span><span class="foot__count">' + (m ? '<i>' + esc(m[1]) + '</i>' + esc(m[2]) : t(count)) + '</span></p>' +
        '<div class="foot__meta caps">' +
          '<p>© ' + new Date().getFullYear() + ' ' + t(site.name1) + ' ' + t(site.name2) + '</p>' +
          '<p>' + t(site.role) + (site.cau ? ' · ' + t(site.cau) : '') + '</p>' +
          '<p><a href="#inicio">' + t(f.top || 'Voltar ao início') + ' ↑</a></p>' +
        '</div>' +
      '</div>' +
      '<p class="foot__edge" aria-hidden="true">' + edge + '</p>';
  }

  function renderSchema(site) {
    var old = $('#ev-schema'); if (old) old.remove();
    var data = {
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      name: [site.name1, site.name2].filter(Boolean).join(' '),
      description: site.description || '',
      areaServed: site.city || undefined,
      telephone: site.whatsapp ? '+' + String(site.whatsapp).replace(/\D/g, '') : undefined,
      email: isPlaceholder(site.email) ? undefined : site.email,
      url: location.protocol.indexOf('http') === 0 ? location.origin + location.pathname : undefined
    };
    var s = document.createElement('script');
    s.type = 'application/ld+json'; s.id = 'ev-schema';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }

  /* ========================================================== BEHAVIOUR */

  // ---- header: fundo sólido depois do topo + link da seção atual
  function initHeader() {
    var top = $('.top');
    function onScroll() { top.classList.toggle('is-solid', window.scrollY > 24); }
    on(window, 'scroll', onScroll, { passive: true }); onScroll();
    var links = $$('.top__nav a');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = observe(new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = map[e.target.id]; if (!a) return;
        if (e.isIntersecting) { links.forEach(function (l) { l.classList.remove('is-current'); }); a.classList.add('is-current'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' }));
    ['galeria', 'projetos', 'sobre', 'servicos', 'contato'].forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    // cabeçalho escuro sobre a faixa preta dos clientes
    var band = document.getElementById('clientes');
    if (band) {
      var io2 = observe(new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { top.classList.toggle('is-dark', e.isIntersecting); });
      }, { rootMargin: '0px 0px -' + Math.max(0, window.innerHeight - 40) + 'px 0px' }));
      io2.observe(band);
    }
  }

  // ---- menu do celular
  function initMenu() {
    var btn = $('.top__menu'), menu = $('#menu');
    function close() {
      btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu';
      menu.classList.remove('is-open'); root.classList.remove('is-locked');
      setTimeout(function () { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 400);
    }
    function open() {
      menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Fechar';
      root.classList.add('is-locked');
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      var first = $('a', menu); if (first) first.focus();
    }
    on(btn, 'click', function () { btn.getAttribute('aria-expanded') === 'true' ? close() : open(); });
    on(menu, 'click', function (e) { if (e.target.closest('a')) close(); });
    on(document, 'keydown', function (e) { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { close(); btn.focus(); } });
    cleanups.push(function () { menu.hidden = true; menu.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.textContent = 'Menu'; });
  }

  // ---- o nome sempre cabe na largura da tela (mesmo se ficar mais comprido)
  function fitName() {
    var name = $('.hero__name'); if (!name) return;
    name.style.fontSize = '';
    var avail = document.documentElement.clientWidth - 8;
    // mede pela posição de layout da última letra (ignora a animação de entrada)
    function widest() {
      var left = name.getBoundingClientRect().left, w = 0;
      $$('.hero__line', name).forEach(function (l) {
        var chs = $$('.ch', l), last = chs[chs.length - 1];
        if (last) w = Math.max(w, left + last.offsetLeft + last.offsetWidth);
      });
      return w;
    }
    for (var i = 0; i < 5; i++) {
      var w = widest();
      if (w <= avail) break;
      var fs = parseFloat(getComputedStyle(name).fontSize);
      name.style.fontSize = Math.floor(fs * Math.max(0.5, avail / w) * 0.98) + 'px';
    }
  }
  function initFit() {
    fitName();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);
    var rt = 0;
    on(window, 'resize', function () { clearTimeout(rt); rt = setTimeout(fitName, 100); });
    cleanups.push(function () { var n = $('.hero__name'); if (n) n.style.fontSize = ''; });
  }

  // ---- abertura: a foto sobe e "revela", as letras sobem
  function initHero(intro) {
    if (!intro || reduced()) { root.classList.add('is-ready'); return; }
    root.classList.remove('is-ready');
    var img = $('.hero__img img');
    var done = false;
    function go() { if (done) return; done = true; requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('is-ready'); }); }); }
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var imgReady = new Promise(function (res) {
      if (!img || img.complete) return res();
      img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true });
    });
    Promise.all([fonts, imgReady]).then(go);
    setTimeout(go, 1600);
  }

  // ---- galeria: a rolagem vertical anda com as fotos de lado
  var G = null;
  function initGallery() {
    var sec = $('#galeria'), pin = $('.gallery__pin', sec), vp = $('.gallery__viewport', sec), track = $('.gallery__track', sec);
    var items = $$('.g-item', track), intro = $('.g-intro', track);
    var tick = $('.progress__tick', sec), progress = $('.progress', sec);
    var strips = $$('.counter__cur .digit__strip', sec);
    if (!items.length) { sec.hidden = true; return; }
    sec.hidden = false;
    var st = { shift: 0, top: 0, cur: 0, target: 0, raf: 0, active: -1, centers: [], widths: [], isStatic: false, vw: 0 };
    G = st;

    var SIZES = { l: 0.94, m: 0.76, s: 0.58 };
    function layout() {
      var vw = document.documentElement.clientWidth;
      st.vw = vw;
      st.isStatic = reduced();
      sec.classList.toggle('is-static', st.isStatic);
      var phone = vw < 760;
      var vh = window.innerHeight;
      var avail = st.isStatic ? Math.min(vh * 0.62, 640) : vp.clientHeight - parseFloat(getComputedStyle(vp).paddingTop);
      var capH = phone ? 58 : 66, edgeH = 18;
      var base = Math.max(160, avail - capH - edgeH - 8);
      var maxW = vw * (phone ? 0.8 : 0.56);
      items.forEach(function (li) {
        var r = parseFloat(li.dataset.ratio) || 1.5;
        var h = base * (SIZES[li.dataset.size] || SIZES.m);
        if (phone) h = Math.max(h, base * 0.62);
        var w = h * r;
        if (w > maxW) { w = maxW; h = w / r; }
        var y = li.dataset.y === 'top' ? 0 : li.dataset.y === 'low' ? base - h : (base - h) / 2;
        li.style.width = Math.round(w) + 'px';
        $('.g-item__frame', li).style.height = Math.round(h) + 'px';
        li.style.marginTop = (st.isStatic ? 0 : Math.round(y)) + 'px';
      });
      var last = items[items.length - 1];
      track.style.paddingRight = Math.max(parseFloat(getComputedStyle(track).paddingLeft), (vw - last.offsetWidth) / 2) + 'px';
      track.style.transform = '';
      st.centers = items.map(function (li) { return li.offsetLeft + li.offsetWidth / 2; });
      st.widths = items.map(function (li) { return li.offsetWidth; });
      if (st.isStatic) {
        sec.style.height = '';
        st.shift = 0;
      } else {
        st.shift = Math.max(0, track.scrollWidth - vw);
        sec.style.height = Math.round(st.shift + pin.offsetHeight) + 'px';
      }
      st.top = sec.getBoundingClientRect().top + window.scrollY;
      update(true);
    }

    function progressNow() { return st.shift ? clamp(-st.cur / st.shift, 0, 1) : 0; }
    function setActive(i) {
      if (i === st.active) return;
      st.active = i;
      items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      var s = pad(i + 1);
      if (strips[0]) strips[0].style.transform = 'translateY(' + (-parseInt(s[0], 10) * 10) + '%)';
      if (strips[1]) strips[1].style.transform = 'translateY(' + (-parseInt(s[1], 10) * 10) + '%)';
      var sr = $('.counter .sr-only', sec); if (sr) sr.textContent = 'Foto ' + (i + 1) + ' de ' + items.length + ' ';
    }
    function frame() {
      st.raf = 0;
      var d = st.target - st.cur;
      st.cur = Math.abs(d) < 0.3 ? st.target : st.cur + d * 0.12;
      paint();
      if (st.cur !== st.target) st.raf = requestAnimationFrame(frame);
    }
    function paint() {
      var x = st.isStatic ? -vp.scrollLeft : st.cur;
      if (!st.isStatic) track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      var mid = st.vw / 2, best = 0, bestD = Infinity;
      for (var i = 0; i < st.centers.length; i++) {
        var c = st.centers[i] + x - mid;
        var dist = Math.abs(c);
        if (dist < bestD) { bestD = dist; best = i; }
        if (!st.isStatic && Math.abs(c) < st.vw * 1.4) {
          var img = items[i].firstElementChild.nextElementSibling.firstElementChild;
          img.style.setProperty('--px', (-c / st.vw * 4).toFixed(3) + '%');
        }
      }
      setActive(best);
      var p = st.isStatic ? (vp.scrollWidth > vp.clientWidth ? vp.scrollLeft / (vp.scrollWidth - vp.clientWidth) : 0) : progressNow();
      if (tick && progress) tick.style.transform = 'translate3d(' + (p * progress.clientWidth).toFixed(1) + 'px,0,0)';
    }
    function update(instant) {
      if (st.isStatic) { paint(); return; }
      var p = st.shift ? clamp((window.scrollY - st.top) / st.shift, 0, 1) : 0;
      st.target = -p * st.shift;
      if (instant || reduced()) { st.cur = st.target; paint(); return; }
      if (!st.raf) st.raf = requestAnimationFrame(frame);
    }
    st.scrollToIndex = function (i, instant) {
      if (st.isStatic) {
        var li = items[i]; vp.scrollTo({ left: li.offsetLeft - (vp.clientWidth - li.offsetWidth) / 2, behavior: instant ? 'auto' : 'smooth' });
        return;
      }
      var p = clamp((st.centers[i] - st.vw / 2) / (st.shift || 1), 0, 1);
      var y = st.top + p * st.shift;
      window.scrollTo({ top: y, behavior: instant ? 'auto' : 'smooth' });
      if (instant) { st.target = st.cur = -p * st.shift; paint(); }
    };
    st.items = items;

    on(window, 'scroll', function () { update(false); }, { passive: true });
    on(vp, 'scroll', function () { if (st.isStatic) paint(); }, { passive: true });
    var lastW = 0, lastH = 0, rt = 0;
    function onResize() {
      var w = window.innerWidth, h = window.innerHeight;
      // no celular a barra de endereço muda a altura: só refaz se mudar bastante
      if (w === lastW && Math.abs(h - lastH) < 120) return;
      lastW = w; lastH = h;
      clearTimeout(rt); rt = setTimeout(layout, 120);
    }
    on(window, 'resize', onResize);
    if (mqReduce.addEventListener) on(mqReduce, 'change', layout);
    $$('img', track).forEach(function (im) { if (!im.complete) on(im, 'load', function () { /* proporção já reservada */ }, { once: true }); });
    on(track, 'focusin', function (e) {
      var li = e.target.closest('.g-item'); if (li) st.scrollToIndex(parseInt(li.dataset.i, 10), true);
    });
    on(track, 'click', function (e) {
      var b = e.target.closest('.g-item__frame'); if (!b) return;
      openViewer(parseInt(b.parentNode.dataset.i, 10));
    });
    cleanups.push(function () { if (st.raf) cancelAnimationFrame(st.raf); sec.style.height = ''; });
    lastW = window.innerWidth; lastH = window.innerHeight;
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (G === st) layout(); });
    on(window, 'load', function () { layout(); });
  }

  // ---- visualizador em tela cheia
  var V = { open: false, i: 0, img: null, busy: false, lastFocus: null };
  function galleryData(i) {
    var it = obj(arr(obj(C.gallery).items)[i]);
    return { src: src(it.src), alt: it.alt || '', title: it.title || '', meta: it.meta || '', ratio: ratioOf(it, 1.5) };
  }
  function fitRect(ratio) {
    var stage = $('.viewer__stage').getBoundingClientRect();
    var pad = window.innerWidth < 760 ? 12 : 40;
    var W = stage.width - pad * 2, H = stage.height - pad * 2;
    var w = W, h = w / ratio;
    if (h > H) { h = H; w = h * ratio; }
    return { left: stage.left + (stage.width - w) / 2, top: stage.top + (stage.height - h) / 2, width: w, height: h };
  }
  function place(el, r) {
    el.style.left = r.left + 'px'; el.style.top = r.top + 'px';
    el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
  }
  function thumbRect(i) {
    var li = G && G.items && G.items[i]; if (!li) return null;
    var r = $('.g-item__frame', li).getBoundingClientRect();
    if (r.right < 0 || r.left > window.innerWidth || r.bottom < 0 || r.top > window.innerHeight) return null;
    return r;
  }
  function flip(el, from, to, dur, cb) {
    var sx = from.width / to.width, sy = from.height / to.height;
    el.style.transition = 'none';
    el.style.transform = 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + sx + ',' + sy + ')';
    el.getBoundingClientRect();
    el.style.transition = 'transform ' + dur + 'ms cubic-bezier(.2,.7,.1,1)';
    el.style.transform = 'none';
    setTimeout(cb || function () {}, dur);
  }
  function setCaption(i) {
    var d = galleryData(i), n = arr(obj(C.gallery).items).length;
    $('.viewer__count').innerHTML = '<i>' + pad(i + 1) + '</i> / ' + pad(n);
    $('.viewer__caption').innerHTML = '<b>' + t(d.title) + '</b>' + (d.meta ? '<span>' + t(d.meta) + '</span>' : '');
  }
  function makeImg(i) {
    var d = galleryData(i);
    var im = document.createElement('img');
    im.className = 'viewer__img'; im.src = d.src; im.alt = d.alt; im.draggable = false;
    im.dataset.ratio = d.ratio;
    return im;
  }
  function openViewer(i) {
    var vw = $('#viewer'), stage = $('.viewer__stage');
    V.lastFocus = document.activeElement;
    V.i = i; V.open = true;
    vw.hidden = false;
    root.classList.add('is-locked');
    stage.innerHTML = '';
    var im = makeImg(i); stage.appendChild(im); V.img = im;
    setCaption(i);
    var to = fitRect(galleryData(i).ratio);
    place(im, to);
    var from = thumbRect(i);
    requestAnimationFrame(function () { vw.classList.add('is-open'); });
    if (from && !reduced()) flip(im, from, to, 720);
    $('.viewer__close').focus();
  }
  function closeViewer() {
    if (!V.open) return;
    var vw = $('#viewer'), im = V.img;
    V.open = false;
    if (G && G.scrollToIndex) G.scrollToIndex(V.i, true);
    if (G && G.items && G.items[V.i]) V.lastFocus = $('.g-item__frame', G.items[V.i]);
    var from = im ? im.getBoundingClientRect() : null;
    var to = thumbRect(V.i);
    vw.classList.remove('is-open');
    function finish() { vw.hidden = true; root.classList.remove('is-locked'); $('.viewer__stage').innerHTML = ''; V.img = null; if (V.lastFocus && V.lastFocus.focus) V.lastFocus.focus({ preventScroll: true }); }
    if (im && to && from && !reduced()) {
      place(im, to);
      flip(im, from, to, 560, finish);
    } else {
      if (im) { im.style.transition = 'opacity .3s'; im.style.opacity = '0'; }
      setTimeout(finish, reduced() ? 0 : 300);
    }
  }
  function go(dir) {
    if (!V.open || V.busy) return;
    var n = arr(obj(C.gallery).items).length; if (n < 2) return;
    var next = (V.i + dir + n) % n;
    var stage = $('.viewer__stage'), old = V.img;
    var im = makeImg(next); place(im, fitRect(galleryData(next).ratio));
    V.i = next; V.img = im; setCaption(next);
    if (reduced()) { if (old) old.remove(); stage.appendChild(im); return; }
    V.busy = true;
    im.style.opacity = '0'; im.style.transform = 'translateX(' + (dir * 6) + '%)';
    stage.appendChild(im);
    im.getBoundingClientRect();
    im.style.transition = 'opacity .5s ease, transform .7s cubic-bezier(.2,.7,.1,1)';
    im.style.opacity = '1'; im.style.transform = 'none';
    if (old) { old.style.transition = 'opacity .4s ease, transform .6s cubic-bezier(.2,.7,.1,1)'; old.style.opacity = '0'; old.style.transform = 'translateX(' + (-dir * 6) + '%)'; }
    setTimeout(function () { if (old) old.remove(); V.busy = false; }, 520);
  }
  function initViewer() {
    var vw = $('#viewer'), stage = $('.viewer__stage');
    on(vw, 'click', function (e) {
      var b = e.target.closest('[data-v]');
      if (b) { var a = b.dataset.v; if (a === 'close') closeViewer(); else go(a === 'next' ? 1 : -1); return; }
      if (e.target === stage) closeViewer();
    });
    on(document, 'keydown', function (e) {
      if (!V.open) return;
      if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Tab') {
        var f = $$('.viewer__btn', vw); var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // arrastar para os lados
    var sx = 0, sy = 0, dragging = false, moved = 0;
    on(stage, 'pointerdown', function (e) { if (!V.img) return; dragging = true; moved = 0; sx = e.clientX; sy = e.clientY; V.img.style.transition = 'none'; });
    on(window, 'pointermove', function (e) {
      if (!dragging || !V.img) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dy) > Math.abs(dx) * 1.2 && Math.abs(dx) < 12) return;
      moved = dx; V.img.style.transform = 'translateX(' + dx * 0.6 + 'px)';
    });
    function end() {
      if (!dragging) return; dragging = false;
      if (Math.abs(moved) > 60) go(moved < 0 ? 1 : -1);
      else if (V.img) { V.img.style.transition = 'transform .4s cubic-bezier(.2,.7,.1,1)'; V.img.style.transform = 'none'; }
    }
    on(window, 'pointerup', end); on(window, 'pointercancel', end);
    on(window, 'resize', function () { if (V.open && V.img) { V.img.style.transition = 'none'; V.img.style.transform = 'none'; place(V.img, fitRect(parseFloat(V.img.dataset.ratio) || 1.5)); } });
    cleanups.push(function () { if (V.open) { V.open = false; vw.hidden = true; vw.classList.remove('is-open'); root.classList.remove('is-locked'); stage.innerHTML = ''; } });
  }

  // ---- três séries: a capa fixa troca conforme a lista anda
  function initSeries() {
    var sec = $('#projetos'), items = $$('.s-item', sec), figs = $$('.series__frames figure', sec);
    var label = $('.series__label-t', sec), num = $('.series__label-n', sec);
    var titles = arr(obj(C.series).items).map(function (it) { return obj(it).title || ''; });
    function setActive(i) {
      items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      figs.forEach(function (f, k) { f.classList.toggle('is-active', k === i); });
      if (label) label.innerHTML = t(titles[i]);
      if (num) num.textContent = pad(i + 1) + ' / ' + pad(items.length);
    }
    var io = observe(new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(parseInt(e.target.dataset.i, 10)); });
    }, { rootMargin: '-42% 0px -52% 0px' }));
    items.forEach(function (li) {
      io.observe(li);
      on(li, 'pointerenter', function (e) { if (e.pointerType === 'mouse') setActive(parseInt(li.dataset.i, 10)); });
    });
  }

  // ---- surgir ao rolar, folha de contato, clientes revelando
  function initReveal() {
    var els = $$('[data-reveal]');
    if (reduced() || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); }
    else {
      var io = observe(new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }));
      els.forEach(function (el) { io.observe(el); });
    }
    function once(sel, cls, thr) {
      var el = $(sel); if (!el) return;
      if (reduced()) { el.classList.add(cls); return; }
      var io2 = observe(new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { el.classList.add(cls); io2.disconnect(); } });
      }, { threshold: thr }));
      io2.observe(el);
    }
    once('.sheet', 'is-drawn', 0.45);
    once('.clients', 'is-developed', 0.3);
  }

  // ---- formulário: monta a mensagem e abre o WhatsApp
  function initForm() {
    var form = $('.form'); if (!form) return;
    var status = $('.form__status', form);
    on(form, 'submit', function (e) {
      e.preventDefault();
      var site = obj(C.site);
      var fd = new FormData(form);
      var name = String(fd.get('name') || '').trim(), msg = String(fd.get('message') || '').trim();
      status.classList.remove('is-error');
      if (!name || !msg) {
        status.classList.add('is-error');
        status.textContent = !name ? 'Escreva o seu nome, por favor.' : 'Escreva uma mensagem, por favor.';
        (!name ? $('#f-name') : $('#f-msg')).focus();
        return;
      }
      var lines = ['Olá! Vim pelo site.', '', 'Nome: ' + name];
      var email = String(fd.get('email') || '').trim(); if (email) lines.push('E-mail: ' + email);
      var type = fd.get('type'); if (type) lines.push('Tipo de projeto: ' + type);
      var city = String(fd.get('city') || '').trim(); if (city) lines.push('Cidade: ' + city);
      lines.push('', msg);
      var text = lines.join('\n');
      var url = waLink(site.whatsapp, text);
      if (!url && site.email && !isPlaceholder(site.email)) url = 'mailto:' + site.email + '?subject=' + encodeURIComponent('Projeto — ' + name) + '&body=' + encodeURIComponent(text);
      if (!url) { status.classList.add('is-error'); status.textContent = 'Nenhum contato configurado ainda.'; return; }
      if (PREVIEW) { status.textContent = 'Prévia: no site publicado, isto abriria o WhatsApp.'; return; }
      status.textContent = 'Abrindo o WhatsApp…';
      var w = window.open(url, '_blank', 'noopener');
      if (!w) location.href = url;
    });
  }

  /* ================================================================ MOUNT */
  function mount(content, intro) {
    destroy();
    G = null;
    render(content);
    initHeader();
    initMenu();
    initFit();
    initHero(intro);
    initGallery();
    initViewer();
    initSeries();
    initReveal();
    initForm();
  }

  if (!window.SITE_CONTENT) {
    document.body.insertAdjacentHTML('afterbegin', '<p class="noscript">Não encontrei o arquivo content/content.js.</p>');
    return;
  }
  mount(window.SITE_CONTENT, !PREVIEW);

  // prévia ao vivo dentro do painel
  if (PREVIEW) {
    window.addEventListener('message', function (e) {
      if (e.source !== window.parent || !e.data || e.data.type !== 'ev-preview') return;
      var y = window.scrollY;
      mount(e.data.content, false);
      if (e.data.scrollTo === '__end') {
        window.scrollTo(0, document.documentElement.scrollHeight);
      } else if (e.data.scrollTo) {
        var el = document.getElementById(e.data.scrollTo);
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
      } else {
        window.scrollTo(0, y);
      }
    });
    try { window.parent.postMessage({ type: 'ev-ready' }, '*'); } catch (e) { /* noop */ }
  }
})();
