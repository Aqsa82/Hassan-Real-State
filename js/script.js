/* ==========================================================================
   Hasaan Real Estate — homepage demo
   Vanilla JS, no dependencies. Each feature lives in its own init function.

   1. Header scroll state
   2. Mobile navigation
   3. Scroll reveal (IntersectionObserver)
   4. Property search + filters (demo, reads data-* on the cards)
   5. Favourite toggle
   6. Property details modal
   7. Locations list <-> map highlight
   8. Image fallback
   ========================================================================== */

(function () {
  'use strict';

  var WHATSAPP_NUMBER = '923003084176';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ------------------------------------------------------------------------
     1. Header scroll state: adds a border + shadow once the page has moved
     ------------------------------------------------------------------------ */
  function initHeader() {
    var header = $('#site-header');
    if (!header) return;

    var update = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ------------------------------------------------------------------------
     2. Mobile navigation
     ------------------------------------------------------------------------ */
  function initMobileNav() {
    var header = $('#site-header');
    var toggle = $('#nav-toggle');
    var menu = $('#mobile-menu');
    if (!toggle || !menu) return;

    var isOpen = false;

    function open() {
      isOpen = true;
      menu.hidden = false;
      void menu.offsetWidth;                 // force a reflow so the transition runs
      menu.classList.add('is-open');
      header.classList.add('is-open');
      document.body.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      menu.classList.remove('is-open');
      header.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      // hide after the fade so it leaves the tab order
      window.setTimeout(function () { if (!isOpen) menu.hidden = true; }, 300);
    }

    toggle.addEventListener('click', function () { isOpen ? close() : open(); });

    // Any link inside the menu closes it (the browser then scrolls to the anchor)
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) { close(); toggle.focus(); }
    });

    // Close if the viewport grows past the menu breakpoint
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (mq) {
      if (mq.matches) close();
    });
  }

  /* ------------------------------------------------------------------------
     3. Scroll reveal: adds .is-visible once, then stops observing
     ------------------------------------------------------------------------ */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    var showAll = function () { items.forEach(function (el) { el.classList.add('is-visible'); }); };

    if (!('IntersectionObserver' in window)) { showAll(); return; }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------------
     4. Property search + filters
        Demo only: reads the data-* attributes on each .property-card.
        With a PHP backend this becomes a normal GET request instead.
     ------------------------------------------------------------------------ */
  function initSearch() {
    var form = $('#property-search');
    var section = $('#properties');
    var grid = $('#property-grid');
    if (!form || !grid) return;

    var cards = $$('.property-card', grid);
    var status = $('#filter-status');
    var statusText = $('#filter-status-text');
    var empty = $('#empty-state');

    var fields = {
      purpose: $('#search-purpose'),
      type: $('#search-type'),
      location: $('#search-location'),
      price: $('#search-price')
    };

    function matchesPrice(price, range) {
      if (!range) return true;
      var parts = range.split('-');
      var min = Number(parts[0]) || 0;
      var max = parts[1] ? Number(parts[1]) : Infinity;
      return price >= min && price < max;
    }

    // Human-readable summary of the active filters, e.g. "Buy, House, DHA Karachi"
    function describe(f) {
      var labels = [];
      Object.keys(fields).forEach(function (key) {
        if (!f[key]) return;
        var option = $('option[value="' + f[key] + '"]', fields[key]);
        if (option) labels.push(option.textContent);
      });
      return labels.join(', ');
    }

    function applyFilters(f) {
      var shown = 0;

      cards.forEach(function (card) {
        var d = card.dataset;
        var visible =
          (!f.purpose || d.purpose === f.purpose) &&
          (!f.type || d.type === f.type) &&
          (!f.location || d.location === f.location) &&
          matchesPrice(Number(d.price), f.price);
        card.hidden = !visible;
        if (visible) shown++;
      });

      var active = Boolean(f.purpose || f.type || f.location || f.price);
      grid.hidden = shown === 0;
      empty.hidden = shown !== 0;
      status.hidden = !active || shown === 0;
      if (active) {
        statusText.innerHTML = 'Showing <strong>' + shown + ' of ' + cards.length +
          '</strong> properties for ' + describe(f);
      }
    }

    function scrollToResults() {
      // aim at the heading (not the section edge) so the overlapping search bar is out of view
      ($('.section-head', section) || section).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Hero search form
    form.addEventListener('submit', function (e) {
      e.preventDefault();                    // no page refresh
      applyFilters({
        purpose: fields.purpose.value,
        type: fields.type.value,
        location: fields.location.value,
        price: fields.price.value
      });
      scrollToResults();
    });

    // Shortcuts elsewhere on the page: category tiles and footer links
    // (data-filter-type / data-filter-purpose) and "clear" controls (data-filter-reset)
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-filter-type], [data-filter-purpose], [data-filter-reset]');
      if (!link) return;
      e.preventDefault();

      if (link.hasAttribute('data-filter-reset')) {
        form.reset();
        applyFilters({});
      } else {
        applyFilters({
          purpose: link.dataset.filterPurpose || '',
          type: link.dataset.filterType || ''
        });
      }
      scrollToResults();
    });
  }

  /* ------------------------------------------------------------------------
     5. Favourite toggle (visual only; later this can POST to the backend)
     ------------------------------------------------------------------------ */
  function initFavourites() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.fav-btn');
      if (!btn) return;
      var pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', String(!pressed));
    });
  }

  /* ------------------------------------------------------------------------
     6. Property details modal: filled from the card that was clicked
     ------------------------------------------------------------------------ */
  function initModal() {
    var modal = $('#property-modal');
    if (!modal || typeof modal.showModal !== 'function') return;

    var els = {
      img: $('#modal-img'),
      badge: $('#modal-badge'),
      type: $('#modal-type'),
      title: $('#modal-title'),
      location: $('#modal-location'),
      price: $('#modal-price'),
      whatsapp: $('#modal-whatsapp')
    };

    function openFor(card) {
      var img = $('.property-card__media img', card);
      var badge = $('.badge', card);
      var title = $('.property-card__title', card).textContent.trim();
      var location = $('.property-card__location', card).textContent.trim();

      els.img.src = img.currentSrc || img.src;
      els.img.alt = img.alt;
      els.badge.textContent = badge.textContent;
      els.badge.className = badge.className;
      els.type.textContent = $('.property-card__type', card).textContent;
      els.title.textContent = title;
      els.location.textContent = location;
      els.price.innerHTML = $('.property-card__price', card).innerHTML;

      var message = 'Hello, I am interested in "' + title + '" (' + location + ').';
      els.whatsapp.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);

      modal.showModal();
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.js-view-details');
      if (btn) openFor(btn.closest('.property-card'));
    });

    $('#modal-close').addEventListener('click', function () { modal.close(); });
    $('#modal-dismiss').addEventListener('click', function () { modal.close(); });

    // Click on the backdrop (the dialog element itself) closes it
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.close();
    });
  }

  /* ------------------------------------------------------------------------
     7. Locations list <-> map: hovering or focusing either side highlights
        the matching row and pin (matched on data-loc)
     ------------------------------------------------------------------------ */
  function initLocations() {
    var map = $('#city-map');
    var rows = $$('#location-list .location');
    if (!map || !rows.length) return;
    var pins = $$('.map-pin', map);

    function highlight(loc) {
      rows.forEach(function (r) { r.classList.toggle('is-active', r.dataset.loc === loc); });
      pins.forEach(function (p) { p.classList.toggle('is-active', p.dataset.loc === loc); });
      map.classList.toggle('is-all', loc === 'other');
    }
    function clear() { highlight(null); }

    rows.concat(pins).forEach(function (el) {
      var loc = el.dataset.loc;
      el.addEventListener('mouseenter', function () { highlight(loc); });
      el.addEventListener('mouseleave', clear);
      el.addEventListener('focus', function () { highlight(loc); });
      el.addEventListener('blur', clear);
      el.addEventListener('click', function () { highlight(loc); });   // touch devices
    });
  }

  /* ------------------------------------------------------------------------
     8. Image fallback: if a remote photo fails to load, swap in the local
        placeholder (or hide it when data-fallback="hide", e.g. the hero)
     ------------------------------------------------------------------------ */
  function initImageFallback() {
    var PLACEHOLDER = 'assets/images/placeholder.svg';

    function fallback(img) {
      if (img.dataset.failed) return;
      img.dataset.failed = 'true';
      if (img.dataset.fallback === 'hide') { img.style.display = 'none'; return; }
      img.src = PLACEHOLDER;
    }

    $$('img.js-img').forEach(function (img) {
      img.addEventListener('error', function () { fallback(img); });
      // already failed before this script ran
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fallback(img);
    });
  }

  /* ------------------------------------------------------------------------ */
  function init() {
    initHeader();
    initMobileNav();
    initReveal();
    initSearch();
    initFavourites();
    initModal();
    initLocations();
    initImageFallback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
