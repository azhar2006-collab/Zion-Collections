'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const piecesById = new Map(jewelleryPieces.map(piece => [piece.id, piece]));
const categoryNames = jewelleryCategories.map(category => category.name);
const dialog = $('#gallery-dialog');
const dialogBody = $('#dialog-body');
const dialogTitle = $('#dialog-title');
const storageKey = 'zion-jewellery.saved.v1';
const saved = loadSaved();
let view = { mode: 'all', category: 'All', query: '' };
let currentPiece = null;
let returnFocus = null;
let directDetail = false;
const icon = (name, className = '') => '<svg aria-hidden="true" class="' + className + '"><use href="#i-' + name + '"/></svg>';
const imagePath = id => 'assets/' + id + '.webp';
const announce = message => { $('#announcer').textContent = message; };

function loadSaved() {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return new Set(Array.isArray(ids) ? ids.filter(id => piecesById.has(id)) : []);
  } catch { return new Set(); }
}

function syncSaved() {
  const count = $('.saved-count');
  count.textContent = saved.size;
  count.hidden = saved.size === 0;
  $('.saved-button').setAttribute('aria-label', 'View saved pieces (' + saved.size + ')');
}
function toggleSaved(id, button) {
  if (saved.has(id)) saved.delete(id);
  else saved.add(id);
  try { localStorage.setItem(storageKey, JSON.stringify([...saved])); } catch { /* Keep selections for this visit. */ }
  syncSaved();
  const selected = saved.has(id);
  const name = piecesById.get(id).name;
  announce(name + (selected ? ' saved.' : ' removed from saved pieces.'));
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', (selected ? 'Remove from saved pieces: ' : 'Save piece: ') + name);
  if (currentPiece) $('.save-label', button).textContent = selected ? 'Saved to my pieces' : 'Save this piece';
  else if (view.mode === 'saved') {
    renderResults();
    ($('#results button') || $('.close-dialog')).focus();
  }
}

for (const category of jewelleryCategories) {
  const link = document.createElement('button');
  link.type = 'button';
  link.dataset.category = category.name;
  link.textContent = category.name;
  const strip = $('#category-links');
  if (strip.children.length) {
    const separator = document.createElement('span');
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '✦';
    strip.append(separator);
  }
  strip.append(link);
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'category-card';
  card.dataset.category = category.name;
  card.setAttribute('aria-label', 'Explore ' + category.name.toLowerCase());
  card.innerHTML = '<span class="category-photo"><img loading="lazy" width="510" height="510" src="' + imagePath(category.cover) + '" alt=""></span><span class="category-information"><span class="category-name">' + category.name + '</span><span class="category-more">' + icon('plus') + '</span></span>';
  $('#category-grid').append(card);
}

const featuredIds = ['rani-jhumka', 'emerald-necklace', 'pearl-comb'];
let featureIndex = 0;
function changeFeature(step) {
  featureIndex = (featureIndex + step + featuredIds.length) % featuredIds.length;
  const piece = piecesById.get(featuredIds[featureIndex]);
  const photo = $('#campaign-image');
  photo.src = imagePath(piece.id);
  photo.alt = piece.alt;
  photo.classList.remove('changed');
  void photo.offsetWidth;
  photo.classList.add('changed');
  $('#campaign-title').textContent = piece.name;
  $('#campaign-index').textContent = '0' + (featureIndex + 1) + ' / 03';
  $('[data-featured]').setAttribute('aria-label', 'View ' + piece.name);
  announce('Featured piece ' + (featureIndex + 1) + ' of 3. ' + piece.name);
}

function openDialog(trigger) {
  if (!dialog.open) {
    returnFocus = trigger;
    dialog.showModal();
    $('.close-dialog').focus({ preventScroll: true });
  }
}
function startGallery(mode, category, trigger) {
  view = { mode, category: category || 'All', query: '' };
  currentPiece = null;
  directDetail = false;
  openDialog(trigger);
  renderGallery();
  if (mode === 'search') $('#search-input').focus();
}
function renderGallery() {
  currentPiece = null;
  dialog.scrollTop = 0;
  dialogTitle.textContent = view.mode === 'search' ? 'Search the collection' : view.mode === 'saved' ? 'My saved pieces' : 'The collection';
  dialogBody.replaceChildren();
  if (view.mode === 'search') {
    const label = document.createElement('label');
    label.className = 'search-field';
    label.innerHTML = icon('search') + '<span class="sr-only">Search by piece, colour or category</span><input type="search" id="search-input" placeholder="Try jhumka, pearl or anklets" autocomplete="off">';
    const input = $('input', label);
    input.value = view.query;
    input.addEventListener('input', () => { view.query = input.value; renderResults(); });
    dialogBody.append(label);
  } else if (view.mode === 'all') {
    const filters = document.createElement('div');
    filters.className = 'filter-list';
    filters.setAttribute('role', 'group');
    filters.setAttribute('aria-label', 'Filter by category');
    for (const name of ['All', ...categoryNames]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.filter = name;
      button.textContent = name;
      button.setAttribute('aria-pressed', String(view.category === name));
      filters.append(button);
    }
    dialogBody.append(filters);
  }
  const count = document.createElement('p');
  count.className = 'result-line';
  count.id = 'result-count';
  count.setAttribute('role', 'status');
  const results = document.createElement('div');
  results.id = 'results';
  dialogBody.append(count, results);
  renderResults();
}
function matchesView(piece) {
  if (view.mode === 'saved') return saved.has(piece.id);
  if (view.mode === 'search') {
    const searchable = [piece.name, piece.category, piece.palette, piece.silhouette, piece.description].join(' ').toLowerCase();
    return view.query.toLowerCase().trim().split(/\s+/).every(word => searchable.includes(word));
  }
  return view.category === 'All' || view.category === piece.category;
}
function renderResults() {
  const pieces = jewelleryPieces.filter(matchesView);
  const results = $('#results');
  $('#result-count').textContent = pieces.length + (pieces.length === 1 ? ' piece' : ' pieces');
  results.replaceChildren();
  if (!pieces.length) {
    results.className = 'empty';
    const message = document.createElement('p');
    message.textContent = view.mode === 'saved' ? 'Tap the heart on any piece to keep it here.' : 'No pieces match your search. Try a colour, a category or a shorter name.';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button primary';
    button.dataset.open = 'all';
    button.textContent = 'Browse all pieces';
    results.append(message, button);
    return;
  }
  results.className = 'piece-grid';
  for (const piece of pieces) {
    const card = document.createElement('article');
    card.className = 'piece-card';
    card.innerHTML = '<button class="view-piece" type="button" data-piece="' + piece.id + '"><span class="piece-photo"><img loading="lazy" src="' + imagePath(piece.id) + '" width="510" height="510" alt=""></span><span class="piece-name">' + piece.name + '</span><span class="piece-category">' + piece.category + '</span></button><button type="button" class="piece-save" aria-pressed="' + saved.has(piece.id) + '" data-save="' + piece.id + '">' + icon('heart', 'heart') + '</button>';
    $('[data-save]', card).setAttribute('aria-label', (saved.has(piece.id) ? 'Remove from saved pieces: ' : 'Save piece: ') + piece.name);
    results.append(card);
  }
}
function showPiece(id, trigger, standalone = false) {
  const piece = piecesById.get(id);
  if (!piece) return;
  directDetail = standalone;
  openDialog(trigger);
  currentPiece = piece;
  dialog.scrollTop = 0;
  dialogTitle.textContent = piece.name;
  dialogBody.innerHTML = '<button class="text-button detail-back" type="button" data-back>' + icon('left') + (directDetail ? 'Browse collection' : 'Back to results') + '</button><div class="detail-grid"><img src="' + imagePath(id) + '" alt="' + piece.alt + '"><div><p class="eyebrow">' + piece.category + '</p><p>' + piece.description + '</p><dl><dt>Palette</dt><dd>' + piece.palette + '</dd><dt>Silhouette</dt><dd>' + piece.silhouette + '</dd></dl><button class="button primary" type="button" data-save="' + id + '" aria-pressed="' + saved.has(id) + '">' + icon('heart', 'heart') + '<span class="save-label">' + (saved.has(id) ? 'Saved to my pieces' : 'Save this piece') + '</span></button></div></div>';
  $('[data-back]').focus({ preventScroll: true });
}
function setMenu(open) {
  $('#main-nav').classList.toggle('open', open);
  const toggle = $('.menu-toggle');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  toggle.innerHTML = icon(open ? 'x' : 'menu');
}
document.addEventListener('click', event => {
  const target = event.target.closest('button, a');
  if (!target) return;
  if (target.matches('.menu-toggle')) return setMenu(!$('#main-nav').classList.contains('open'));
  if ($('#main-nav').classList.contains('open')) setMenu(false);
  if (target.matches('.close-dialog')) return dialog.close();
  if (target.hasAttribute('data-slide')) return changeFeature(Number(target.dataset.slide));
  if (target.hasAttribute('data-featured')) return showPiece(featuredIds[featureIndex], target, true);
  if (target.dataset.piece) return showPiece(target.dataset.piece, target);
  if (target.dataset.save) return toggleSaved(target.dataset.save, target);
  if (target.hasAttribute('data-back')) {
    const lastId = currentPiece.id;
    if (directDetail) view = { mode: 'all', category: currentPiece.category, query: '' };
    directDetail = false;
    renderGallery();
    ($('[data-piece="' + lastId + '"]') || $('.close-dialog')).focus();
    return;
  }
  if (target.dataset.filter) {
    view.category = target.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(filter => filter.setAttribute('aria-pressed', String(filter === target)));
    return renderResults();
  }
  if (target.dataset.category || target.dataset.open) return startGallery(target.dataset.open || 'all', target.dataset.category, target);
});
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  currentPiece = null;
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('#main-nav').classList.contains('open')) {
    setMenu(false);
    $('.menu-toggle').focus();
  }
});
const links = [...document.querySelectorAll('.primary-nav a')];
function markSection() {
  const landmark = window.innerHeight * .4;
  const current = $('#story').getBoundingClientRect().top <= landmark ? '#story' : $('#collections').getBoundingClientRect().top <= landmark ? '#collections' : '#home';
  links.forEach(link => {
    const active = link.getAttribute('href') === current;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
let pendingScroll = false;
window.addEventListener('scroll', () => {
  if (pendingScroll) return;
  pendingScroll = true;
  requestAnimationFrame(() => { markSection(); pendingScroll = false; });
}, { passive: true });
markSection();
syncSaved();
