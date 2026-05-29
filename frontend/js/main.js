// ── Preloader
const hidePreloader = () => {
  const preloader = document.getElementById('preloader');
  if (preloader && !preloader.classList.contains('preloader-fade')) {
    preloader.classList.add('preloader-fade');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 800);
  }
};

// Start fading out after exactly 1 second (1000ms)
window.addEventListener('load', () => {
  setTimeout(hidePreloader, 1000);
});

// Failsafe: force fade out after 1.5 seconds in case some image/iframe is blocked
setTimeout(hidePreloader, 1500);


// ── Navbar scroll
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar?.classList.toggle('scrolled', window.scrollY > 60);
});

// ── Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = navbar ? navbar.offsetHeight + 10 : 80;
      window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
      closeMobileMenu();
    }
  });
});

// ── Mobile menu
const menuToggle = document.getElementById('menu-toggle');
const navLinks = document.getElementById('nav-links');
const closeMobileMenu = () => navLinks?.classList.remove('open');
menuToggle?.addEventListener('click', () => navLinks?.classList.toggle('open'));

// ── Popup modal
const popup = document.getElementById('lead-popup');
const openPopup = (source) => {
  if (!popup) return;
  popup.classList.add('active');
  if (source) {
    const form = popup.querySelector('form[data-lead-form]');
    if (form) form.dataset.source = source;
  }
  document.body.style.overflow = 'hidden';
};
const closePopup = () => {
  popup?.classList.remove('active');
  document.body.style.overflow = '';
};
document.getElementById('popup-close')?.addEventListener('click', closePopup);
popup?.addEventListener('click', e => { if (e.target === popup) closePopup(); });

// Auto-open popup after 5s (once per session)
if (!sessionStorage.getItem('popup_shown')) {
  setTimeout(() => { openPopup('Popup Auto'); sessionStorage.setItem('popup_shown','1'); }, 5000);
}

// CTA buttons open popup
document.querySelectorAll('[data-popup]').forEach(btn => {
  btn.addEventListener('click', () => openPopup(btn.dataset.popup || 'CTA Button'));
});

// ── FAQ accordion
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ── Floor plan tabs
document.querySelectorAll('.fp-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.fp-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.fp-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('fp-' + target)?.classList.add('active');
  });
});

// ── Gallery lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
document.querySelectorAll('.gallery-item img').forEach(img => {
  img.addEventListener('click', () => {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = img.src;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
});
document.getElementById('lightbox-close')?.addEventListener('click', () => {
  lightbox?.classList.remove('active');
  document.body.style.overflow = '';
});
lightbox?.addEventListener('click', e => {
  if (e.target === lightbox) { lightbox.classList.remove('active'); document.body.style.overflow = ''; }
});

// ── Scroll reveal
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Counter animation
const animateCounter = (el) => {
  const target = parseInt(el.dataset.target || el.textContent);
  const suffix = el.dataset.suffix || '';
  let current = 0;
  const step = target / 60;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = Math.floor(current) + suffix;
    if (current >= target) clearInterval(timer);
  }, 25);
};
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); counterObserver.unobserve(e.target); } });
}, { threshold: 0.5 });
document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));
