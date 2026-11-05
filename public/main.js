// Phone menu, services sub-menu, gallery filters and the back-to-top button.
(() => {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu');
  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  document.querySelectorAll('.sub-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.closest('.has-sub').classList.toggle('is-open', open);
    });
  });

  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const buttons = document.querySelectorAll('.filter');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.filter;
        buttons.forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        gallery.querySelectorAll('.gitem').forEach((item) => {
          item.hidden = cat !== 'all' && item.dataset.cat !== cat;
        });
      });
    });
  }

  // Map camera controls: zoom, map/satellite and full screen for the embedded map.
  const map = document.querySelector('[data-map]');
  const mapToggle = document.querySelector('.mapctl__toggle');
  if (map && mapToggle) {
    const panel = document.getElementById(mapToggle.getAttribute('aria-controls'));
    let zoom = Number(map.dataset.z) || 13;
    let satellite = false;
    const render = () => {
      map.src = `https://maps.google.com/maps?q=${encodeURIComponent(map.dataset.q)}&z=${zoom}${satellite ? '&t=k' : ''}&output=embed`;
    };
    mapToggle.addEventListener('click', () => {
      const open = mapToggle.getAttribute('aria-expanded') !== 'true';
      mapToggle.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
    });
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-map-act]');
      if (!btn) return;
      const act = btn.dataset.mapAct;
      if (act === 'in' && zoom < 20) zoom += 1;
      else if (act === 'out' && zoom > 3) zoom -= 1;
      else if (act === 'type') {
        satellite = !satellite;
        btn.setAttribute('aria-pressed', String(satellite));
      } else if (act === 'full') {
        const box = map.closest('.mapsec__box');
        if (document.fullscreenElement) document.exitFullscreen();
        else box.requestFullscreen?.();
        return;
      } else return;
      render();
    });
  }

  const totop = document.querySelector('.totop');
  if (totop) {
    const update = () => totop.classList.toggle('is-visible', window.scrollY > 400);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
})();
