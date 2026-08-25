(function () {
  'use strict';

  var WHATSAPP_NUMBER = '5511999999999';
  var WHATSAPP_MESSAGE = encodeURIComponent('Olá! Vim pelo site da WebJite e gostaria de um orçamento.');
  var WHATSAPP_URL = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + WHATSAPP_MESSAGE;
  var THEME_KEY = 'webjite-theme';

  function getStoredTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    setStoredTheme(theme);
  }

  function initThemeToggle() {
    var stored = getStoredTheme();
    if (stored === 'dark' || stored === 'light') {
      applyTheme(stored);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }

    var toggle = document.getElementById('themeToggle');
    if (!toggle) {
      return;
    }

    toggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  function applyWhatsAppLinks() {
    var links = document.querySelectorAll('[id="whatsappBtn"], [href*="wa.me"]');
    Array.prototype.forEach.call(links, function (link) {
      link.setAttribute('href', WHATSAPP_URL);
    });
  }

  function initNavbar() {
    var navbar = document.getElementById('navbar');
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');

    function onScroll() {
      if (window.scrollY > 10) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    Array.prototype.forEach.call(links.querySelectorAll('a'), function (link) {
      link.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initActiveNav() {
    var sections = document.querySelectorAll('main section[id]');
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links .nav-link'));

    if (!('IntersectionObserver' in window)) {
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (link) {
              if (link.getAttribute('href') === '#' + entry.target.id) {
                link.style.color = 'var(--accent-text)';
                link.style.fontWeight = '600';
              } else {
                link.style.color = '';
                link.style.fontWeight = '';
              }
            });
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function initReveal() {
    var items = document.querySelectorAll('.reveal');

    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) {
        el.classList.add('visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    items.forEach(function (el) {
      observer.observe(el);
    });
  }

  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1600;
    var start = null;

    function step(timestamp) {
      if (!start) {
        start = timestamp;
      }
      var progress = Math.min((timestamp - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  }

  function initStats() {
    var numbers = document.querySelectorAll('.stat-number[data-count]');

    if (!('IntersectionObserver' in window)) {
      numbers.forEach(function (el) {
        animateCount(el);
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    numbers.forEach(function (el) {
      observer.observe(el);
    });
  }

  function initYear() {
    var yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initThemeToggle();
    applyWhatsAppLinks();
    initNavbar();
    initActiveNav();
    initReveal();
    initStats();
    initYear();

    var heroRingsEl = document.getElementById('heroRings');
    if (heroRingsEl && typeof MagicRings !== 'undefined') {
      new MagicRings('#heroRings', {
        color: "#e5e5e6",
        colorTwo: "#a0a0a0",
        ringCount: 6,
        speed: 1,
        attenuation: 10,
        lineThickness: 2,
        baseRadius: 0.35,
        radiusStep: 0.1,
        scaleRate: 0.1,
        opacity: 1,
        blur: 0,
        noiseAmount: 0.1,
        rotation: 0,
        ringGap: 1.5,
        fadeIn: 0.7,
        fadeOut: 0.5,
        followMouse: false,
        mouseInfluence: 0.2,
        hoverScale: 1.2,
        parallax: 0.05,
        clickBurst: false
      });
    }
  });
})();
