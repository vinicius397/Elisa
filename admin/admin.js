/* ==========================================================================
   Painel do site — Elisa Vasconcelos
   Edita content/content.js (textos e fotos) com prévia ao vivo.
   Salva de três jeitos:
   1. Hospedagem com PHP: direto no site publicado (api.php, com senha).
   2. No computador (Chrome/Edge): direto na pasta do site.
   3. Outros navegadores: baixa os arquivos para você colocar na pasta.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- utils */
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function el(tag, props) {
    var parts = tag.split('.'), e = document.createElement(parts[0] || 'div');
    if (parts.length > 1) e.className = parts.slice(1).join(' ');
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'on') Object.keys(v).forEach(function (ev) { e.addEventListener(ev, v[ev]); });
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'value') e.value = v;
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { e.dataset[d] = v[d]; });
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function add(e, k) {
    if (k == null || k === false) return;
    if (Array.isArray(k)) { k.forEach(function (x) { add(e, x); }); return; }
    e.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function get(o, path) {
    if (!path) return o;
    return path.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o);
  }
  function set(o, path, val) {
    var ks = path.split('.'), last = ks.pop();
    var t = ks.reduce(function (a, k, i) {
      if (a[k] == null || typeof a[k] !== 'object') a[k] = /^\d+$/.test(ks[i + 1] || last) ? [] : {};
      return a[k];
    }, o);
    t[last] = val;
  }
  function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  function hasPh(s) { return typeof s === 'string' && /\[[^\]]*\]/.test(s); }
  function slug(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* noop */ }
    s = s.replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (s || 'foto').slice(0, 50);
  }
  var toastTimer;
  function toast(msg, err) {
    var t = $('#toast'); t.textContent = msg; t.classList.toggle('is-err', !!err); t.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, err ? 7000 : 3200);
  }

  /* ---------------------------------------------------------------- state */
  var content = null;
  var savedJSON = '';
  var pending = {};            // caminho -> { blob, url, dataUrl, name }
  var mode = 'local';          // 'server' | 'local'
  var csrf = null;
  var dirHandle = null;
  var current = 'geral';
  var openItems = {};
  var canFS = typeof window.showDirectoryPicker === 'function';

  /* --------------------------------------------------------------- schema */
  var SIZE = [['l', 'Grande'], ['m', 'Média'], ['s', 'Pequena']];
  var YPOS = [['top', 'Mais alta'], ['mid', 'No meio'], ['low', 'Mais baixa']];
  var IT = 'Use *asteriscos* para deixar uma palavra em itálico.';

  var SCHEMA = [
    { id: 'geral', title: 'Informações gerais', anchor: 'inicio', help: 'Nome, contatos e os textos que aparecem no Google e quando alguém compartilha o link.',
      groups: [
        { fields: [
          { k: 'site.name1', label: 'Nome (primeira linha da abertura)' },
          { k: 'site.name2', label: 'Sobrenome (segunda linha, em itálico)' },
          { k: 'site.role', label: 'O que o escritório faz' },
          { k: 'site.city', label: 'Cidade / região' }
        ] },
        { title: 'Contato', fields: [
          { k: 'site.phone', label: 'Telefone (como aparece no site)' },
          { k: 'site.whatsapp', label: 'Número do WhatsApp (só números: 55 + DDD + número)', hint: 'Ex.: 5517991812268. O formulário do site manda as mensagens para este número.' },
          { k: 'site.email', label: 'E-mail' },
          { k: 'site.instagram', label: 'Instagram', hint: 'Ex.: @elisavasconcelos.arq' },
          { k: 'site.cau', label: 'Registro no CAU', hint: 'Aparece no rodapé. Ex.: CAU A123456-7' }
        ] },
        { title: 'Google e compartilhamento', fields: [
          { k: 'site.title', label: 'Título da página', hint: 'Aparece na aba do navegador e como título no Google.' },
          { k: 'site.description', label: 'Descrição curta', type: 'textarea', hint: 'Uma ou duas frases. Aparece embaixo do título no Google e no WhatsApp.' }
        ] }
      ] },
    { id: 'abertura', title: 'Abertura', anchor: 'inicio', help: 'A primeira tela: o nome grande e a foto vertical. Prefira uma foto em pé com céu claro em cima: a segunda linha do nome passa por cima dele.',
      groups: [{ fields: [
        { k: 'hero.image', label: 'Foto da abertura', type: 'image' },
        { k: 'hero.caption', label: 'Legenda da foto', hint: 'Use " — " para separar em duas partes. Ex.: Prancha 00 — Casa no Damha, 2024' },
        { k: 'hero.eyebrow', label: 'Linha pequena acima do texto' },
        { k: 'hero.intro', label: 'Frase de apresentação', type: 'textarea' },
        { k: 'hero.cta', label: 'Texto do link para a galeria' },
        { k: 'hero.edge', label: 'Texto vertical na lateral (detalhe decorativo)' }
      ] }] },
    { id: 'galeria', title: 'Galeria', anchor: 'galeria', help: 'As fotos que deslizam de lado. Funciona melhor com 8 a 12 fotos, misturando fotos em pé e deitadas.',
      groups: [
        { fields: [
          { k: 'gallery.label', label: 'Etiqueta da seção' },
          { k: 'gallery.title', label: 'Título', hint: IT },
          { k: 'gallery.intro', label: 'Texto de apresentação', type: 'textarea' }
        ] },
        { title: 'Fotos', fields: [
          { k: 'gallery.items', type: 'list', label: 'Fotos da galeria', max: 24, itemName: 'Foto',
            title: function (it) { return it.title || 'Sem título'; }, thumb: function (it) { return it.src; },
            newItem: { src: '', alt: '', ratio: 1.5, title: 'Nova foto', meta: '[Categoria · cidade, ano]', edge: 'EV ▸ ', size: 'm', y: 'mid' },
            fields: [
              { k: '', label: 'Foto', type: 'image' },
              { k: 'title', label: 'Título (legenda)' },
              { k: 'meta', label: 'Linha de baixo da legenda', hint: 'Ex.: Residencial · São José do Rio Preto, 2024' },
              { k: 'edge', label: 'Marca de filme acima da foto (decorativo)' },
              { row: [
                { k: 'size', label: 'Tamanho na parede', type: 'select', options: SIZE },
                { k: 'y', label: 'Altura na parede', type: 'select', options: YPOS }
              ] }
            ] }
        ] }
      ] },
    { id: 'projetos', title: 'Projetos', anchor: 'projetos', help: 'As três frentes de trabalho, com a capa que fica parada ao lado enquanto a lista anda.',
      groups: [
        { fields: [
          { k: 'series.label', label: 'Etiqueta da seção' },
          { k: 'series.title', label: 'Título', hint: IT }
        ] },
        { title: 'Itens', fields: [
          { k: 'series.items', type: 'list', label: 'Frentes de projeto', max: 6, itemName: 'Item',
            title: function (it) { return it.title || 'Sem título'; }, thumb: function (it) { return it.image && it.image.src; },
            newItem: { title: 'Nova frente', text: '', tags: '', image: { src: '', alt: '', ratio: 0.8 } },
            fields: [
              { k: 'title', label: 'Título', hint: IT },
              { k: 'text', label: 'Texto', type: 'textarea' },
              { k: 'tags', label: 'Linha pequena (palavras-chave)' },
              { k: 'image', label: 'Foto de capa (de preferência em pé)', type: 'image' }
            ] }
        ] }
      ] },
    { id: 'sobre', title: 'Sobre', anchor: 'sobre', help: 'Citação, apresentação, a folha de contato com o círculo vermelho e os quatro números grandes.',
      groups: [
        { fields: [
          { k: 'about.label', label: 'Etiqueta da seção' },
          { k: 'about.quote', label: 'Citação em destaque', type: 'textarea' },
          { k: 'about.quoteBy', label: 'Quem disse' },
          { k: 'about.paragraphs', label: 'Parágrafos do texto', type: 'strings', multiline: true, addLabel: 'Adicionar parágrafo', hint: 'O primeiro parágrafo aparece maior.' }
        ] },
        { title: 'Folha de contato', fields: [
          { k: 'about.sheetLabel', label: 'Etiqueta' },
          { k: 'about.sheetCaption', label: 'Legenda' },
          { k: 'about.sheet', label: 'Fotos da folha (de 4 em 4 por tira)', type: 'sheet' },
          { k: 'about.circled', label: 'Foto marcada com o círculo vermelho', type: 'circled', of: 'about.sheet' }
        ] },
        { title: 'Números', fields: [
          { k: 'about.stats', type: 'list', label: 'Números grandes', max: 4, itemName: 'Número',
            title: function (it) { return (it.value || '') + ' ' + (it.label || ''); },
            newItem: { value: '[00]', label: 'legenda' },
            fields: [{ row: [{ k: 'value', label: 'Número' }, { k: 'label', label: 'Legenda' }] }] }
        ] }
      ] },
    { id: 'servicos', title: 'Serviços & valores', anchor: 'servicos', help: 'A lista de serviços com preços, no estilo de um cardápio editorial.',
      groups: [
        { fields: [
          { k: 'services.label', label: 'Etiqueta da seção' },
          { k: 'services.title', label: 'Título', hint: IT },
          { k: 'services.intro', label: 'Texto de apresentação', type: 'textarea' }
        ] },
        { title: 'Serviços', fields: [
          { k: 'services.items', type: 'list', label: 'Serviços', max: 10, itemName: 'Serviço',
            title: function (it) { return it.title || 'Sem título'; },
            newItem: { title: 'Novo serviço', text: '', includes: '', price: 'R$ [valor]', unit: '' },
            fields: [
              { k: 'title', label: 'Nome do serviço', hint: IT },
              { k: 'text', label: 'Descrição', type: 'textarea' },
              { k: 'includes', label: 'O que está incluído', type: 'textarea' },
              { row: [{ k: 'price', label: 'Valor', hint: 'Ex.: R$ 90 ou Sob consulta' }, { k: 'unit', label: 'Unidade', hint: 'Ex.: a partir de · por m²' }] }
            ] },
          { k: 'services.note', label: 'Observação no fim da lista', type: 'textarea' }
        ] }
      ] },
    { id: 'clientes', title: 'Clientes', anchor: 'clientes', help: 'A faixa escura com os nomes que vão "revelando" do cinza para o branco. Se apagar todos os nomes, a faixa some do site.',
      groups: [{ fields: [
        { k: 'clients.label', label: 'Etiqueta da seção' },
        { k: 'clients.title', label: 'Frase ao lado da etiqueta' },
        { k: 'clients.names', label: 'Nomes', type: 'strings', addLabel: 'Adicionar nome', hint: 'Só publique nomes de clientes que autorizaram.' }
      ] }] },
    { id: 'contato', title: 'Contato', anchor: 'contato', help: 'O "Escreva-me." grande e o formulário. O formulário abre o WhatsApp do visitante com a mensagem pronta, endereçada ao número das Informações gerais.',
      groups: [
        { fields: [
          { k: 'contact.label', label: 'Etiqueta da seção' },
          { k: 'contact.title', label: 'Título grande', hint: 'Se tiver hífen, quebra a linha nele (Escreva- / me.).' },
          { k: 'contact.intro', label: 'Texto embaixo do título', type: 'textarea' }
        ] },
        { title: 'Formulário', fields: [
          { k: 'contact.fieldName', label: 'Rótulo: nome' },
          { k: 'contact.fieldEmail', label: 'Rótulo: e-mail' },
          { k: 'contact.fieldType', label: 'Rótulo: tipo de projeto' },
          { k: 'contact.types', label: 'Opções de tipo de projeto', type: 'strings', addLabel: 'Adicionar opção' },
          { k: 'contact.fieldCity', label: 'Rótulo: cidade' },
          { k: 'contact.fieldMessage', label: 'Rótulo: mensagem' },
          { k: 'contact.button', label: 'Texto do botão' },
          { k: 'contact.formNote', label: 'Aviso embaixo do botão', type: 'textarea' }
        ] }
      ] },
    { id: 'rodape', title: 'Rodapé e menu', anchor: '__end', help: 'O "Fim do rolo 36 / 36" e os nomes do menu do topo.',
      groups: [
        { title: 'Rodapé', fields: [
          { k: 'footer.roll', label: 'Texto pequeno' },
          { k: 'footer.count', label: 'Número grande', hint: 'O primeiro número fica em vermelho.' },
          { k: 'footer.top', label: 'Link "voltar ao início"' }
        ] },
        { title: 'Menu do topo', fields: [
          { row: [{ k: 'nav.gallery', label: 'Galeria' }, { k: 'nav.series', label: 'Projetos' }] },
          { row: [{ k: 'nav.about', label: 'Sobre' }, { k: 'nav.services', label: 'Serviços' }] },
          { k: 'nav.contact', label: 'Contato' }
        ] }
      ] },
    { id: 'conta', title: 'Salvar, senha e histórico', anchor: null, special: true }
  ];
  var ROOT_TO_SECTION = { site: 'geral', hero: 'abertura', gallery: 'galeria', series: 'projetos', about: 'sobre', services: 'servicos', clients: 'clientes', contact: 'contato', footer: 'rodape', nav: 'rodape' };

  /* -------------------------------------------------------------- images */
  function resolve(src) {
    if (!src) return '';
    if (pending[src]) return pending[src].url;
    if (/^(data:|blob:|https?:)/.test(src)) return src;
    return '../' + String(src).replace(/^\/+/, '');
  }
  function collectImages() {
    var seen = {}, out = [];
    (function walk(o, k) {
      if (typeof o === 'string') {
        if (/\.(jpe?g|png|webp|avif)$/i.test(o) && !seen[o]) { seen[o] = 1; out.push(o); }
      } else if (o && typeof o === 'object') Object.keys(o).forEach(function (kk) { walk(o[kk], kk); });
    })(content);
    Object.keys(pending).forEach(function (p) { if (!seen[p]) out.push(p); });
    return out;
  }
  function loadImg(url) {
    return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('Não consegui abrir esta imagem.')); }; i.src = url; });
  }
  function blobToDataURL(b) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(b); }); }
  function processFile(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.reject(new Error('Formato não aceito. Use JPG, PNG ou WebP.'));
    var url = URL.createObjectURL(file);
    return loadImg(url).then(function (img) {
      URL.revokeObjectURL(url);
      var w = img.naturalWidth, h = img.naturalHeight;
      // limite de tamanho do servidor (hospedagens costumam aceitar de 2 a 64 MB)
      var limit = mode === 'server' && serverInfo && serverInfo.maxUpload ? serverInfo.maxUpload * 0.9 : Infinity;
      var tries = [[2200, 0.84], [1800, 0.74], [1400, 0.66]];
      var cw, ch;
      function encode(i) {
        var s = Math.min(1, tries[i][0] / Math.max(w, h));
        cw = Math.round(w * s); ch = Math.round(h * s);
        var c = document.createElement('canvas'); c.width = cw; c.height = ch;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#F4F2EE'; ctx.fillRect(0, 0, cw, ch);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, cw, ch);
        return new Promise(function (res) { c.toBlob(res, 'image/jpeg', tries[i][1]); }).then(function (blob) {
          if (blob.size <= limit) return blob;
          if (i + 1 < tries.length) return encode(i + 1);
          throw new Error('A hospedagem só aceita arquivos de até ' + Math.round(serverInfo.maxUpload / 1048576) + ' MB e esta foto não coube. Tente outra foto.');
        });
      }
      return encode(0).then(function (blob) {
        var name = slug(file.name) + '-' + Date.now().toString(36).slice(-5) + '.jpg';
        var path = 'photos/' + name;
        return blobToDataURL(blob).then(function (dataUrl) {
          pending[path] = { blob: blob, url: URL.createObjectURL(blob), dataUrl: dataUrl, name: name };
          return { path: path, ratio: Math.round((cw / ch) * 10000) / 10000 };
        });
      });
    });
  }

  /* -------------------------------------------------------------- picker */
  var pickerCb = null;
  function openPicker(cb) {
    pickerCb = cb;
    var grid = $('#picker-grid'); grid.innerHTML = '';
    collectImages().forEach(function (p) {
      var img = el('img', { src: resolve(p), alt: '', loading: 'lazy' });
      grid.append(el('button', { type: 'button', title: p, on: { click: function () {
        var r = img.naturalWidth ? Math.round(img.naturalWidth / img.naturalHeight * 10000) / 10000 : null;
        closeModal('#picker'); if (pickerCb) pickerCb({ path: p, ratio: r });
      } } }, img));
    });
    openModal('#picker');
  }
  function handleFiles(files) {
    var f = files && files[0]; if (!f) return;
    toast('Preparando a foto…');
    processFile(f).then(function (r) {
      closeModal('#picker');
      if (pickerCb) pickerCb(r);
      toast('Foto pronta. Lembre de clicar em Salvar.');
    }).catch(function (e) { toast(e.message, true); });
  }

  /* ------------------------------------------------------------- modals */
  var lastFocus = null;
  function openModal(sel) { lastFocus = document.activeElement; var m = $(sel); m.hidden = false; var b = $('[data-close]', m); if (b) b.focus(); }
  function closeModal(sel) { $(sel).hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  /* ------------------------------------------------------------- fields */
  function field(f, path) {
    if (f.row) return el('div.row2', null, f.row.map(function (sf) { return field(sf, rel(path, sf.k)); }));
    var type = f.type || 'text';
    if (type === 'list') return listField(f, path);
    if (type === 'strings') return stringsField(f, path);
    if (type === 'image') return imageField(f, path);
    if (type === 'sheet') return sheetField(f, path);
    if (type === 'circled') return circledField(f, path);
    var val = get(content, path);
    var id = 'f-' + path.replace(/\W/g, '-');
    var input;
    if (type === 'textarea') input = el('textarea', { id: id, rows: 3, value: val == null ? '' : String(val) });
    else if (type === 'select') {
      input = el('select', { id: id }, f.options.map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
      input.value = val || f.options[0][0];
    } else input = el('input', { id: id, type: 'text', value: val == null ? '' : String(val) });
    var wrap = el('label.f', { for: id, dataset: { path: path } }, el('span', { text: f.label }), input, f.hint ? el('small', { text: f.hint }) : null);
    wrap.classList.toggle('has-ph', hasPh(val));
    input.addEventListener('input', function () {
      set(content, path, input.value);
      wrap.classList.toggle('has-ph', hasPh(input.value));
      changed();
    });
    return wrap;
  }
  function rel(base, k) { return k ? (base ? base + '.' + k : k) : base; }

  function imageField(f, path) {
    var obj = get(content, path);
    if (!obj || typeof obj !== 'object') { obj = { src: '', alt: '', ratio: 1.5 }; set(content, path, obj); }
    var thumb = el('div.img__thumb', null, obj.src ? el('img', { src: resolve(obj.src), alt: '' }) : null, pending[obj.src] ? el('em', { text: 'nova' }) : null);
    var pathTxt = el('p.img__path', { text: obj.src || 'Nenhuma foto escolhida' });
    var alt = field({ k: 'alt', label: 'Descrição da foto', hint: 'Para o Google e para quem usa leitor de tela. Ex.: Sala com sofá claro e grande janela.' }, rel(path, 'alt'));
    var btn = el('button.btn.btn--small', { type: 'button', text: obj.src ? 'Trocar foto' : 'Escolher foto', on: { click: function () {
      openPicker(function (r) {
        var o = get(content, path);
        o.src = r.path; if (r.ratio) o.ratio = r.ratio;
        changed(); renderEditor(true);
      });
    } } });
    return el('div.f', { dataset: { path: rel(path, 'src') } }, el('span', { text: f.label }),
      el('div.img', null, thumb, el('div.img__side', null, el('div', null, btn), pathTxt, alt)));
  }

  function moveIn(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }

  function listField(f, path) {
    var arr = get(content, path);
    if (!Array.isArray(arr)) { arr = []; set(content, path, arr); }
    var list = el('div.list');
    arr.forEach(function (item, i) {
      var ipath = path + '.' + i;
      var isOpen = !!openItems[ipath];
      var label = el('b', { text: f.title(item) });
      var thumbSrc = f.thumb ? f.thumb(item) : null;
      var body = el('div.item__body', { hidden: !isOpen }, f.fields.map(function (sf) { return field(sf, sf.row ? ipath : rel(ipath, sf.k)); }));
      var toggle = el('button.item__toggle', { type: 'button', 'aria-expanded': String(isOpen), on: { click: function () {
        var o = body.hidden; body.hidden = !o; toggle.setAttribute('aria-expanded', String(o));
        if (o) openItems[ipath] = 1; else delete openItems[ipath];
      } } }, el('span', { text: pad(i + 1) }), label);
      var tools = el('div.item__tools', null,
        el('button.icon', { type: 'button', title: 'Subir', 'aria-label': 'Subir', disabled: i === 0, text: '↑', on: { click: function () { moveIn(arr, i, -1); openItems = {}; changed(); renderEditor(true); } } }),
        el('button.icon', { type: 'button', title: 'Descer', 'aria-label': 'Descer', disabled: i === arr.length - 1, text: '↓', on: { click: function () { moveIn(arr, i, 1); openItems = {}; changed(); renderEditor(true); } } }),
        el('button.icon.btn--danger', { type: 'button', title: 'Apagar', 'aria-label': 'Apagar', text: '✕', on: { click: function () {
          if (!confirm('Apagar "' + f.title(item) + '"?')) return;
          arr.splice(i, 1); openItems = {}; changed(); renderEditor(true);
        } } })
      );
      body.addEventListener('input', function () { label.textContent = f.title(get(content, ipath)); });
      list.append(el('div.item', { dataset: { path: ipath } }, el('div.item__head', null, thumbSrc !== null && f.thumb ? el('img', { src: resolve(thumbSrc), alt: '' }) : null, toggle, tools), body));
    });
    var addBtn = (!f.max || arr.length < f.max) ? el('button.btn.btn--small.add', { type: 'button', text: '+ Adicionar ' + (f.itemName || 'item').toLowerCase(), on: { click: function () {
      arr.push(clone(f.newItem)); openItems = {}; openItems[path + '.' + (arr.length - 1)] = 1; changed(); renderEditor(true);
    } } }) : null;
    return el('div.f', null, el('span', { text: f.label + ' (' + arr.length + ')' }), f.hint ? el('small', { text: f.hint }) : null, list, addBtn);
  }

  function stringsField(f, path) {
    var arr = get(content, path);
    if (!Array.isArray(arr)) { arr = []; set(content, path, arr); }
    var box = el('div.strs');
    arr.forEach(function (s, i) {
      var p = path + '.' + i;
      var inp = f.multiline ? el('textarea', { rows: 3, value: s, 'aria-label': f.label + ' ' + (i + 1) }) : el('input', { type: 'text', value: s, 'aria-label': f.label + ' ' + (i + 1) });
      var wrap = el('div.f.str', { dataset: { path: p } }, inp, el('div.item__tools', null,
        el('button.icon', { type: 'button', 'aria-label': 'Subir', disabled: i === 0, text: '↑', on: { click: function () { moveIn(arr, i, -1); changed(); renderEditor(true); } } }),
        el('button.icon', { type: 'button', 'aria-label': 'Descer', disabled: i === arr.length - 1, text: '↓', on: { click: function () { moveIn(arr, i, 1); changed(); renderEditor(true); } } }),
        el('button.icon.btn--danger', { type: 'button', 'aria-label': 'Apagar', text: '✕', on: { click: function () { arr.splice(i, 1); changed(); renderEditor(true); } } })
      ));
      wrap.classList.toggle('has-ph', hasPh(s));
      inp.addEventListener('input', function () { arr[i] = inp.value; wrap.classList.toggle('has-ph', hasPh(inp.value)); changed(); });
      box.append(wrap);
    });
    return el('div.f', null, el('span', { text: f.label }), f.hint ? el('small', { text: f.hint }) : null, box,
      el('button.btn.btn--small.add', { type: 'button', text: '+ ' + (f.addLabel || 'Adicionar'), on: { click: function () { arr.push(''); changed(); renderEditor(true); } } }));
  }

  function sheetField(f, path) {
    var arr = get(content, path);
    if (!Array.isArray(arr)) { arr = []; set(content, path, arr); }
    var circled = parseInt(get(content, 'about.circled'), 10);
    var grid = el('div.sheetgrid');
    arr.forEach(function (p, i) {
      grid.append(el('div.sheetcell' + (i === circled ? '.is-circled' : ''), { dataset: { path: path + '.' + i } },
        el('img', { src: resolve(p), alt: '' }),
        el('span.n', { text: String(i + 1) }),
        el('button', { type: 'button', 'aria-label': 'Trocar foto ' + (i + 1), on: { click: function () { openPicker(function (r) { arr[i] = r.path; changed(); renderEditor(true); }); } } }),
        el('button.x', { type: 'button', 'aria-label': 'Tirar foto ' + (i + 1), text: '✕', on: { click: function () {
          arr.splice(i, 1);
          var c = parseInt(get(content, 'about.circled'), 10);
          if (c === i) set(content, 'about.circled', -1); else if (c > i) set(content, 'about.circled', c - 1);
          changed(); renderEditor(true);
        } } })
      ));
    });
    return el('div.f', null, el('span', { text: f.label }), el('small', { text: 'Clique numa foto para trocar. O ideal são 8 ou 12 fotos.' }), grid,
      el('button.btn.btn--small.add', { type: 'button', text: '+ Adicionar foto', on: { click: function () { openPicker(function (r) { arr.push(r.path); changed(); renderEditor(true); }); } } }));
  }

  function circledField(f, path) {
    var n = (get(content, f.of) || []).length;
    var opts = [['-1', 'Nenhuma']];
    for (var i = 0; i < n; i++) opts.push([String(i), 'Foto ' + (i + 1)]);
    var sel = el('select', { id: 'f-circled' }, opts.map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var v = get(content, path); sel.value = String(v == null ? -1 : v);
    sel.addEventListener('change', function () { set(content, path, parseInt(sel.value, 10)); changed(); renderEditor(true); });
    return el('label.f', { for: 'f-circled', dataset: { path: path } }, el('span', { text: f.label }), sel);
  }

  /* ------------------------------------------------------------ editor */
  function sectionById(id) { for (var i = 0; i < SCHEMA.length; i++) if (SCHEMA[i].id === id) return SCHEMA[i]; return SCHEMA[0]; }
  function renderSide() {
    var counts = placeholderCounts();
    var side = $('#side'); side.innerHTML = '';
    SCHEMA.forEach(function (s, i) {
      side.append(el('button' + (s.id === current ? '.is-on' : ''), { type: 'button', on: { click: function () { go(s.id); } } },
        el('span', { text: s.special ? '·' : pad(i + 1) }), s.title, counts[s.id] ? el('i', { text: counts[s.id], title: counts[s.id] + ' pendência(s)' }) : null));
    });
  }
  function go(id, keepScroll) {
    current = id; openItems = {};
    renderSide(); renderEditor(keepScroll);
    var s = sectionById(id);
    if (s.anchor) sendPreview(s.anchor);
    if (!keepScroll) $('#editor').scrollTop = 0;
  }
  function renderEditor(keepScroll) {
    var ed = $('#editor'), y = ed.scrollTop;
    var s = sectionById(current);
    ed.innerHTML = '';
    add(ed, [el('h1.sec__title', { text: s.title }), s.help ? el('p.sec__help', { text: s.help }) : null]);
    if (s.special) { ed.append(accountSection()); }
    else s.groups.forEach(function (g) {
      ed.append(el('section.group', null, g.title ? el('h2.group__title', { text: g.title }) : null, g.fields.map(function (f) { return field(f, f.row ? '' : f.k); })));
    });
    if (keepScroll) ed.scrollTop = y;
  }

  /* ------------------------------------------------------ placeholders */
  function placeholders() {
    var out = [];
    (function walk(o, p) {
      if (typeof o === 'string') { if (hasPh(o)) out.push({ path: p, text: o }); }
      else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { walk(o[k], p ? p + '.' + k : k); });
    })(content, '');
    return out;
  }
  function placeholderCounts() {
    var c = {};
    placeholders().forEach(function (ph) { var s = ROOT_TO_SECTION[ph.path.split('.')[0]]; if (s) c[s] = (c[s] || 0) + 1; });
    return c;
  }
  function describe(path) {
    var sec = sectionById(ROOT_TO_SECTION[path.split('.')[0]]), label = null;
    function scan(fields, base, prefix) {
      fields.forEach(function (f) {
        if (label) return;
        if (f.row) { scan(f.row, base, prefix); return; }
        var fp = rel(base, f.k);
        if (fp === path) label = prefix + f.label;
        else if (f.type === 'image' && (path === rel(fp, 'alt') || path === rel(fp, 'src'))) label = prefix + f.label + (/\.alt$/.test(path) ? ' (descrição)' : '');
        else if ((f.type === 'list' || f.type === 'strings' || f.type === 'sheet') && path.indexOf(fp + '.') === 0) {
          var idx = parseInt(path.slice(fp.length + 1).split('.')[0], 10);
          if (f.type !== 'list') label = prefix + f.label + ' ' + (idx + 1);
          else { var p2 = prefix + (f.itemName || 'Item') + ' ' + (idx + 1) + ' — '; scan(f.fields, fp + '.' + idx, p2); if (!label) label = p2.slice(0, -3); }
        }
      });
    }
    if (sec.groups) sec.groups.forEach(function (g) { scan(g.fields, '', ''); });
    return { section: sec, label: label || path };
  }
  function renderTodo() {
    var list = $('#todo-list'); list.innerHTML = '';
    var ph = placeholders();
    if (!ph.length) { list.append(el('li.done', { text: 'Nenhuma pendência. Tudo preenchido!' })); return; }
    ph.forEach(function (p) {
      var d = describe(p.path);
      list.append(el('li', null, el('button', { type: 'button', on: { click: function () { closeModal('#todo'); focusPath(p.path); } } },
        el('small', { text: (d.section ? d.section.title : '') + ' · ' + d.label }),
        el('span', { text: p.text.length > 120 ? p.text.slice(0, 117) + '…' : p.text }))));
    });
  }
  function focusPath(path) {
    var sid = ROOT_TO_SECTION[path.split('.')[0]];
    current = sid; openItems = {};
    // abre o item da lista que contém o campo
    var parts = path.split('.');
    for (var i = 1; i < parts.length; i++) if (/^\d+$/.test(parts[i])) openItems[parts.slice(0, i + 1).join('.')] = 1;
    renderSide(); renderEditor(false);
    var s = sectionById(sid); if (s.anchor) sendPreview(s.anchor);
    var target = $('[data-path="' + path + '"]') || $('[data-path="' + path.replace(/\.alt$/, '.src') + '"]');
    if (target) {
      target.scrollIntoView({ block: 'center' });
      var inp = $('input, textarea, select', target); if (inp) inp.focus({ preventScroll: true });
      target.classList.add('is-flash'); setTimeout(function () { target.classList.remove('is-flash'); }, 1500);
    }
  }

  /* ------------------------------------------------------------- dirty */
  function isDirty() { return JSON.stringify(content) !== savedJSON || Object.keys(pending).length > 0; }
  var sideTimer;
  function changed() {
    $('#btn-save').disabled = !isDirty();
    var n = placeholders().length, b = $('#todo-count');
    b.textContent = n; b.classList.toggle('is-zero', n === 0);
    clearTimeout(sideTimer); sideTimer = setTimeout(renderSide, 250);
    schedulePreview();
  }

  /* ----------------------------------------------------------- preview */
  var frame, ready = false, pTimer, device = window.innerWidth < 760 ? 'phone' : 'desktop';
  function previewContent() {
    var c = clone(content);
    (function walk(o) {
      Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (typeof v === 'string' && pending[v]) o[k] = pending[v].dataUrl;
        else if (v && typeof v === 'object') walk(v);
      });
    })(c);
    return c;
  }
  function sendPreview(anchor) {
    if (!ready || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type: 'ev-preview', content: previewContent(), scrollTo: anchor || null }, '*');
  }
  function schedulePreview() { clearTimeout(pTimer); pTimer = setTimeout(function () { sendPreview(null); }, 350); }
  function fitPreview() {
    var stage = $('#preview-stage'), W = stage.clientWidth, H = stage.clientHeight;
    if (!W || !H) return;
    var base = device === 'phone' ? 390 : 1280;
    var s = Math.min(1, (W - (device === 'phone' ? 32 : 0)) / base);
    var h = device === 'phone' ? Math.min(844, (H - 32) / s) : H / s;
    frame.style.width = base + 'px'; frame.style.height = Math.round(h) + 'px';
    frame.style.transform = 'scale(' + s + ')';
    frame.style.left = device === 'phone' ? Math.round((W - base * s) / 2) + 'px' : '0px';
    frame.style.top = device === 'phone' ? '16px' : '0px';
    $('#preview').classList.toggle('is-phone', device === 'phone');
  }

  /* ------------------------------------------------------------- server */
  function api(action, body) {
    var opts = { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: {} };
    if (csrf) opts.headers['X-CSRF'] = csrf;
    if (body instanceof FormData) opts.body = body;
    else if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch('api.php?action=' + action, opts).then(function (r) {
      return r.json().catch(function () { throw new Error('O servidor respondeu de um jeito inesperado (' + r.status + ').'); }).then(function (j) {
        if (r.status === 401 && action !== 'login' && action !== 'password') { showGate(false); }
        if (!j.ok) throw new Error(j.error || 'Algo deu errado.');
        return j;
      });
    });
  }
  function detectServer() {
    if (!/^https?:$/.test(location.protocol)) return Promise.resolve(null);
    return fetch('api.php?action=status', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.ok && j.server ? j : null; })
      .catch(function () { return null; });
  }
  function parseContentJS(text) {
    var i = text.indexOf('SITE_CONTENT'); i = text.indexOf('{', i < 0 ? 0 : i);
    var j = text.lastIndexOf('}');
    return JSON.parse(text.slice(i, j + 1));
  }

  function showGate(setup) {
    $('#app').hidden = true; $('#gate').hidden = false;
    $('#gate-title').textContent = setup ? 'Criar senha' : 'Entrar';
    $('#gate-text').textContent = setup ? 'Primeiro acesso: crie a senha do painel (mínimo de 8 caracteres). Guarde-a num lugar seguro.' : 'Digite a senha do painel.';
    $('#gate-pass2-wrap').hidden = !setup;
    $('#gate-pass').setAttribute('autocomplete', setup ? 'new-password' : 'current-password');
    $('#gate-btn').textContent = setup ? 'Criar senha e entrar' : 'Entrar';
    $('#gate-form').dataset.setup = setup ? '1' : '';
    setTimeout(function () { $('#gate-pass').focus(); }, 30);
  }
  function initGate() {
    $('#gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var setup = !!$('#gate-form').dataset.setup, p = $('#gate-pass').value, err = $('#gate-err');
      err.textContent = '';
      if (setup && p !== $('#gate-pass2').value) { err.textContent = 'As duas senhas não são iguais.'; return; }
      $('#gate-btn').disabled = true;
      api(setup ? 'setup' : 'login', { password: p }).then(function (j) {
        csrf = j.csrf; $('#gate-pass').value = ''; $('#gate-pass2').value = '';
        $('#gate').hidden = true;
        if (content) { $('#app').hidden = false; } else startApp();
      }).catch(function (e2) { err.textContent = e2.message; }).then(function () { $('#gate-btn').disabled = false; });
    });
  }

  /* -------------------------------------------------------- local folder */
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('ev-admin', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet(k) { return idb().then(function (db) { return new Promise(function (res) { var q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { res(null); }; }); }).catch(function () { return null; }); }
  function idbSet(k, v) { return idb().then(function (db) { return new Promise(function (res) { var tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = res; }); }).catch(function () {}); }
  function connectFolder() {
    return window.showDirectoryPicker({ id: 'ev-site', mode: 'readwrite' }).then(function (h) {
      return h.getFileHandle('index.html').then(function () { return h.getDirectoryHandle('content'); }).then(function () {
        dirHandle = h; idbSet('dir', h); modePill(); return h;
      }).catch(function () {
        throw new Error(h.name === 'admin' ? 'Você escolheu a pasta "admin". Escolha a pasta de cima: a do site (onde fica o index.html).' : 'Essa pasta não parece ser a do site. Escolha a pasta onde fica o arquivo index.html.');
      });
    });
  }
  function ensurePermission(h) {
    var o = { mode: 'readwrite' };
    return h.queryPermission(o).then(function (p) { return p === 'granted' ? p : h.requestPermission(o); }).then(function (p) {
      if (p !== 'granted') throw new Error('Sem permissão para gravar na pasta.');
    });
  }
  function writeFile(dir, name, data) {
    return dir.getFileHandle(name, { create: true }).then(function (fh) { return fh.createWritable(); }).then(function (w) { return w.write(data).then(function () { return w.close(); }); });
  }
  function subdir(dir, path) {
    return path.split('/').reduce(function (p, name) { return p.then(function (d) { return d.getDirectoryHandle(name, { create: true }); }); }, Promise.resolve(dir));
  }
  function stamp() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + '-' + pad(d.getMinutes()) + '-' + pad(d.getSeconds()); }
  function contentJS(c) {
    var d = new Date();
    return '/* =====================================================================\n' +
      '   CONTEÚDO DO SITE — gerado pelo painel em ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '\n' +
      '   O jeito fácil de editar é pelo painel: abra  admin/index.html\n' +
      '   ===================================================================== */\n' +
      'window.SITE_CONTENT = ' + JSON.stringify(c, null, 2) + ';\n';
  }
  function escHtml(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function metaBlock(c) {
    var t = escHtml(c.site && c.site.title), d = escHtml(c.site && c.site.description);
    return '<!--META:START-->\n<title>' + t + '</title>\n<meta name="description" content="' + d + '">\n<meta property="og:title" content="' + t + '">\n<meta property="og:description" content="' + d + '">\n<!--META:END-->';
  }
  function saveLocalFolder() {
    var start = dirHandle ? ensurePermission(dirHandle) : connectFolder();
    return start.then(function () {
      var names = Object.keys(pending);
      return names.reduce(function (p, path) {
        return p.then(function () {
          var parts = path.split('/'), file = parts.pop();
          return subdir(dirHandle, parts.join('/')).then(function (d) { return writeFile(d, file, pending[path].blob); });
        });
      }, Promise.resolve());
    }).then(function () {
      return dirHandle.getDirectoryHandle('content', { create: true }).then(function (cd) {
        return cd.getFileHandle('content.js').then(function (fh) { return fh.getFile(); }).then(function (f) { return f.text(); })
          .then(function (old) { return subdir(dirHandle, 'admin/data/backups').then(function (bd) { return writeFile(bd, 'content-' + stamp() + '.js', old); }); })
          .catch(function () { /* primeira vez: sem backup */ })
          .then(function () { return writeFile(cd, 'content.js', contentJS(content)); });
      });
    }).then(function () {
      return dirHandle.getFileHandle('index.html').then(function (fh) { return fh.getFile().then(function (f) { return f.text(); }).then(function (html) {
        var nh = html.replace(/<!--META:START-->[\s\S]*?<!--META:END-->/, metaBlock(content));
        if (nh !== html) return writeFile(dirHandle, 'index.html', nh);
      }); }).catch(function () {});
    });
  }
  function download(name, blob) {
    var a = el('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function saveDownload() {
    download('content.js', new Blob([contentJS(content)], { type: 'text/javascript' }));
    var names = Object.keys(pending);
    names.forEach(function (p, i) { setTimeout(function () { download(pending[p].name, pending[p].blob); }, 400 * (i + 1)); });
    notice('Baixei <b>content.js</b>' + (names.length ? ' e ' + names.length + ' foto(s)' : '') + '. Coloque o content.js dentro da pasta <b>content</b> do site e as fotos dentro da pasta <b>photos</b>, substituindo os arquivos antigos.', false);
    return Promise.resolve();
  }

  /* --------------------------------------------------------------- save */
  function replacePath(oldP, newP) {
    (function walk(o) { Object.keys(o).forEach(function (k) { var v = o[k]; if (v === oldP) o[k] = newP; else if (v && typeof v === 'object') walk(v); }); })(content);
  }
  function save() {
    var btn = $('#btn-save'); btn.disabled = true; btn.textContent = 'Salvando…';
    var job;
    if (mode === 'server') {
      var names = Object.keys(pending);
      job = names.reduce(function (p, path) {
        return p.then(function () {
          var fd = new FormData(); fd.append('file', pending[path].blob, pending[path].name); fd.append('name', pending[path].name);
          return api('upload', fd).then(function (r) { if (r.path !== path) { replacePath(path, r.path); pending[r.path] = pending[path]; delete pending[path]; } });
        });
      }, Promise.resolve()).then(function () { return api('save', { content: content }); });
    } else job = canFS ? saveLocalFolder() : saveDownload();
    return job.then(function () {
      savedJSON = JSON.stringify(content);
      Object.keys(pending).forEach(function (k) { delete pending[k]; });
      toast(mode === 'server' ? 'Salvo. O site já está atualizado.' : 'Salvo na pasta do site.');
      renderEditor(true);
    }).catch(function (e) {
      if (e && e.name === 'AbortError') toast('Você cancelou a escolha da pasta. Nada foi salvo.', true);
      else toast((e && e.message) || 'Não consegui salvar.', true);
    }).then(function () { btn.textContent = 'Salvar alterações'; changed(); });
  }

  /* ------------------------------------------------------ account / help */
  function accountSection() {
    var box = el('div');
    if (mode === 'server') {
      var cur = el('input', { type: 'password', autocomplete: 'current-password' });
      var nw = el('input', { type: 'password', autocomplete: 'new-password' });
      box.append(el('section.group', null, el('h2.group__title', { text: 'Trocar senha' }),
        el('label.f', null, el('span', { text: 'Senha atual' }), cur),
        el('label.f', null, el('span', { text: 'Nova senha (mínimo de 8 caracteres)' }), nw),
        el('button.btn.btn--small.add', { type: 'button', text: 'Trocar senha', on: { click: function () {
          api('password', { current: cur.value, password: nw.value }).then(function () { cur.value = nw.value = ''; toast('Senha trocada.'); }).catch(function (e) { toast(e.message, true); });
        } } })));
      var hist = el('div.list', null, el('p.sec__help', { text: 'Carregando…' }));
      box.append(el('section.group', null, el('h2.group__title', { text: 'Histórico (desfazer)' }),
        el('p.sec__help', { text: 'A cada vez que você salva, a versão anterior fica guardada aqui. Restaurar uma versão troca os textos do site por ela (fotos enviadas continuam na pasta).' }), hist));
      api('backups').then(function (j) {
        hist.innerHTML = '';
        if (!j.backups.length) hist.append(el('p.sec__help', { text: 'Ainda não há versões anteriores.' }));
        j.backups.slice(0, 25).forEach(function (b) {
          var d = new Date(b.time);
          hist.append(el('div.item', null, el('div.item__head', null, el('p.item__toggle', null, el('b', { text: d.toLocaleString('pt-BR') })),
            el('button.btn.btn--small', { type: 'button', text: 'Restaurar', on: { click: function () {
              if (isDirty() && !confirm('Você tem alterações não salvas que serão perdidas. Continuar?')) return;
              if (!confirm('Restaurar a versão de ' + d.toLocaleString('pt-BR') + '?')) return;
              api('restore', { name: b.name }).then(function () { toast('Versão restaurada.'); setTimeout(function () { location.reload(); }, 800); }).catch(function (e) { toast(e.message, true); });
            } } }))));
        });
      }).catch(function (e) { hist.innerHTML = ''; hist.append(el('p.sec__help', { text: e.message })); });
      box.append(el('section.group', null, el('h2.group__title', { text: 'Sair' }),
        el('button.btn.btn--small.add', { type: 'button', text: 'Sair do painel', on: { click: function () {
          if (isDirty() && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
          api('logout', {}).then(function () { csrf = null; savedJSON = JSON.stringify(content); location.reload(); });
        } } })));
    } else {
      box.append(el('section.group', null, el('h2.group__title', { text: 'Como o painel salva agora' }),
        el('p.sec__help', { html: canFS
          ? 'Você está usando o painel <b>no computador</b>. Ao clicar em <b>Salvar alterações</b>, o navegador pede para escolher a <b>pasta do site</b> (a que tem o arquivo index.html) e grava os textos e as fotos direto nela. Depois é só enviar a pasta atualizada para a hospedagem.'
          : 'Este navegador não deixa gravar direto na pasta. Ao clicar em <b>Salvar alterações</b>, o painel <b>baixa</b> o arquivo content.js e as fotos novas. Coloque o content.js na pasta <b>content</b> e as fotos na pasta <b>photos</b> do site. Dica: no Google Chrome ou no Microsoft Edge, o painel grava sozinho.' }),
        canFS ? el('button.btn.btn--small.add', { type: 'button', text: dirHandle ? 'Trocar a pasta conectada' : 'Conectar a pasta do site agora', on: { click: function () {
          connectFolder().then(function () { toast('Pasta conectada.'); renderEditor(true); }).catch(function (e) { if (e.name !== 'AbortError') toast(e.message, true); });
        } } }) : null));
      box.append(el('section.group', null, el('h2.group__title', { text: 'Painel online' }),
        el('p.sec__help', { html: 'Quando o site estiver numa hospedagem com PHP (Hostinger, HostGator, Locaweb…), abra <b>seusite.com.br/admin</b>: na primeira vez o painel pede para criar uma senha e, daí em diante, salva direto no site publicado.' })));
    }
    box.append(el('section.group', null, el('h2.group__title', { text: 'Descartar alterações' }),
      el('p.sec__help', { text: 'Volta para a última versão salva, apagando o que você mudou desde então.' }),
      el('button.btn.btn--small.btn--danger.add', { type: 'button', text: 'Descartar o que não foi salvo', on: { click: function () {
        if (!isDirty()) { toast('Não há nada para descartar.'); return; }
        if (!confirm('Descartar todas as alterações não salvas?')) return;
        content = JSON.parse(savedJSON); Object.keys(pending).forEach(function (k) { delete pending[k]; }); changed(); renderEditor(true); toast('Alterações descartadas.');
      } } })));
    return box;
  }

  /* --------------------------------------------------------------- boot */
  function notice(html, ok) { var n = $('#notice'); n.innerHTML = html; n.hidden = !html; n.classList.toggle('is-ok', !!ok); }
  function modePill() {
    var m = $('#mode-pill');
    if (mode === 'server') m.innerHTML = '<b>Online</b> — ao salvar, as mudanças vão direto para o site publicado.';
    else if (canFS) m.innerHTML = '<b>No computador</b> — ' + (dirHandle ? 'salvando na pasta <b>' + escHtml(dirHandle.name) + '</b>.' : 'ao salvar, você escolhe a pasta do site.');
    else m.innerHTML = '<b>No computador</b> — ao salvar, os arquivos são baixados.';
  }
  function setName() {
    var s = content.site || {};
    $('#bar-name').innerHTML = escHtml(s.name1 || '') + ' <em>' + escHtml(s.name2 || '') + '</em>';
  }

  function startApp() {
    var load = mode === 'server'
      ? fetch('../content/content.js', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(parseContentJS).catch(function () { return clone(window.SITE_CONTENT); })
      : Promise.resolve(window.SITE_CONTENT ? clone(window.SITE_CONTENT) : null);
    return load.then(function (c) {
      if (!c) { document.body.innerHTML = '<p style="padding:40px">Não encontrei o arquivo <b>content/content.js</b>. O painel precisa ficar dentro da pasta <b>admin</b> do site.</p>'; return; }
      content = c; savedJSON = JSON.stringify(content);
      $('#app').hidden = false;
      setName(); modePill();
      if (mode === 'server' && serverInfo && !serverInfo.writable) notice('Atenção: a hospedagem não está deixando gravar nas pastas <b>content</b> e <b>photos</b>. Ajuste as permissões (755) pelo gerenciador de arquivos.', false);
      if (mode === 'local' && location.protocol === 'file:' && !canFS) notice('Dica: abra este painel no <b>Google Chrome</b> ou no <b>Microsoft Edge</b> para salvar direto na pasta do site.', false);
      renderSide(); renderEditor(false); changed();
      $('#btn-save').disabled = true;

      frame = $('#preview-frame');
      frame.src = '../index.html?preview';
      window.addEventListener('message', function (e) {
        if (e.source === frame.contentWindow && e.data && e.data.type === 'ev-ready') { ready = true; sendPreview(sectionById(current).anchor); }
      });
      frame.addEventListener('load', function () { setTimeout(function () { if (!ready) { ready = true; sendPreview(null); } }, 1500); });
      if (window.ResizeObserver) new ResizeObserver(fitPreview).observe($('#preview-stage')); else window.addEventListener('resize', fitPreview);
      fitPreview();
      $$('.seg button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.dev === device); });
      $$('.seg button').forEach(function (b) {
        b.addEventListener('click', function () {
          device = b.dataset.dev; $$('.seg button').forEach(function (x) { x.classList.toggle('is-on', x === b); }); fitPreview();
        });
      });
      $('#btn-preview-toggle').addEventListener('click', function () {
        var p = $('#preview'), open = !p.classList.contains('is-open');
        p.classList.toggle('is-open', open); this.textContent = open ? 'Voltar a editar' : 'Ver prévia';
        if (open) setTimeout(function () { fitPreview(); sendPreview(sectionById(current).anchor); }, 30);
      });
      $('#btn-save').addEventListener('click', save);
      $('#btn-todo').addEventListener('click', function () { renderTodo(); openModal('#todo'); });
      $$('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeModal('#' + b.closest('.modal').id); }); });
      $$('.modal').forEach(function (m) { m.addEventListener('click', function (e) { if (e.target === m) closeModal('#' + m.id); }); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') $$('.modal').forEach(function (m) { if (!m.hidden) closeModal('#' + m.id); });
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (isDirty()) save(); }
      });
      $('#picker-file').addEventListener('change', function () { handleFiles(this.files); this.value = ''; });
      var drop = $('#picker-drop');
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
      drop.addEventListener('drop', function (e) { handleFiles(e.dataTransfer && e.dataTransfer.files); });
      window.addEventListener('beforeunload', function (e) { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
      $('#editor').addEventListener('input', function (e) { if (e.target.closest('[data-path^="site.name"]')) setName(); });
    });
  }

  var serverInfo = null;
  initGate();
  detectServer().then(function (info) {
    serverInfo = info;
    if (info) {
      mode = 'server';
      if (!info.configured) { showGate(true); return; }
      if (!info.logged) { showGate(false); return; }
      csrf = info.csrf;
      startApp();
    } else {
      mode = 'local';
      var p = canFS ? idbGet('dir').then(function (h) { if (h) dirHandle = h; }) : Promise.resolve();
      p.then(startApp);
    }
  });
})();
