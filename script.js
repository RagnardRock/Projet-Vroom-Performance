// Smooth scroll interne avec compensation d'offset
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const hash = a.getAttribute('href');
      const id = hash.slice(1);
      if (!id) return;                        // ignore href="#"
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();

      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
      const extra = 100;                        
      const y = target.getBoundingClientRect().top + window.pageYOffset - navH - extra;

            // Respecte prefer-reduced-motion
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });

    });
  });

  // Animation de scroll lumlière
(() => {
  const root = document.documentElement;
  let raf = 0;
  let lastY = -1;

  const update = () => {
    raf = 0;

    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    const y = window.scrollY;

    // évite les updates inutiles 
    if (y === lastY) return;
    lastY = y;

    const p = Math.min(1, Math.max(0, y / max)); // 0..1

    // Amplitude
    const sx = (-220 + p * 440).toFixed(1) + "px";
    const sy = (  30 - p *  60).toFixed(1) + "px";

    root.style.setProperty("--sx", sx);
    root.style.setProperty("--sy", sy);
  };

  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { lastY = -1; onScroll(); });
  update();
})();

// Animation d'apparition au scroll
const revealObserver = (() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return null;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;

      const el = e.target;
      el.classList.add('is-in');
      io.unobserve(el);
    }
  }, {
    root: null,
    threshold: 0.15,
    rootMargin: "0px 0px -10% 0px"
  });

  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  return io;
})();


// Animation d'apparition au scroll avec décalage
function applyStagger(container = document) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  container.querySelectorAll('[data-stagger]').forEach(parent => {
    const step = parseInt(parent.getAttribute('data-stagger'), 10) || 80;
    const items = parent.querySelectorAll('.reveal');

    items.forEach((el, i) => {
      el.style.setProperty('--d', `${i * step}ms`);
    });
  });
}
applyStagger();

// Menu Burger
(() => {
  const nav = document.getElementById("navMenu");
  const fab = document.getElementById("navFab");
  if (!nav || !fab) return;

  const openMenu = () => {
    nav.classList.add("open");
    document.body.classList.add("menu-open");
    fab.setAttribute("aria-expanded", "true");
  };

  const closeMenu = () => {
    nav.classList.remove("open");
    document.body.classList.remove("menu-open");
    fab.setAttribute("aria-expanded", "false");
  };

  fab.addEventListener("click", () => {
    const isOpen = nav.classList.contains("open");
    isOpen ? closeMenu() : openMenu();
  });

  // Ferme quand on clique un lien
  nav.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", () => closeMenu());
  });

  // Ferme avec Escape
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
})();


  //Bifrost Loaded Class
    const t0 = performance.now();

    window.addEventListener('bifrost:collections-loaded', () => {
        console.log('Bifrost loaded in', Math.round(performance.now() - t0), 'ms');
        document.body.classList.add('bifrost-loaded');

        // Setup articles AVANT d'observer (pour que --d soit défini)
        setupArticles();

        // Appliquer stagger et observer les autres éléments .reveal (hors articles)
        applyStagger();
        if (revealObserver) {
            document.querySelectorAll('.reveal:not(.is-in):not(.article-card)').forEach(el => {
                revealObserver.observe(el);
            });
        }
    });

    // Fallback après 2 secondes si l'événement ne se déclenche pas
    setTimeout(() => {
        if (!document.body.classList.contains('bifrost-loaded')) {
            console.log('Bifrost fallback triggered');
            document.body.classList.add('bifrost-loaded');
            setupArticles();
        }
    }, 2000);

// Gestion des articles : pagination + modal
let articlesModal = null;
let setupArticlesTimeout = null;
let isReordering = false; // Flag pour éviter la boucle de réorganisation

function setupArticles() {
    const container = document.querySelector('[data-bifrost-collection="articles"]');
    if (!container) return;

    // Récupérer les articles
    const articles = Array.from(container.querySelectorAll('.article-card'));

    // Inverser l'ordre seulement si pas déjà en cours de réorganisation
    if (!isReordering && articles.length > 1) {
        isReordering = true;
        articles.reverse();
        // Réorganiser le DOM dans l'ordre inversé
        articles.forEach(article => container.appendChild(article));
        // Reset le flag après un tick pour permettre les futurs ajouts
        setTimeout(() => { isReordering = false; }, 200);
    }

    // Nettoyer l'ancien bouton si présent
    const oldBtn = container.parentElement.querySelector('.load-more-btn');
    if (oldBtn) oldBtn.remove();

    if (articles.length === 0) return;

    const ARTICLES_PER_PAGE = 3;
    let visibleCount = ARTICLES_PER_PAGE;

    // Stocker le contenu complet et appliquer stagger à TOUS les articles
    articles.forEach((article, i) => {
        const contenuEl = article.querySelector('[data-field="contenu"]');
        if (contenuEl) {
            article.dataset.fullContent = contenuEl.innerHTML;
        }
        // Appliquer le délai stagger à chaque article
        const step = parseInt(container.getAttribute('data-stagger'), 10) || 200;
        article.style.setProperty('--d', `${i * step}ms`);
    });

    // Fonction pour mettre à jour l'affichage
    function updateVisibility() {
        const step = parseInt(container.getAttribute('data-stagger'), 10) || 200;
        let animationIndex = 0;

        articles.forEach((article, i) => {
            const shouldHide = i >= visibleCount;
            article.classList.toggle('hidden', shouldHide);

            // Animer les articles visibles avec stagger manuel
            if (!shouldHide && !article.classList.contains('is-in')) {
                const delay = animationIndex * step;
                animationIndex++;
                setTimeout(() => {
                    article.classList.add('is-in');
                }, delay);
            }
        });

        // Gérer le bouton "Voir plus"
        let btn = container.parentElement.querySelector('.load-more-btn');

        if (visibleCount < articles.length) {
            if (!btn) {
                btn = document.createElement('button');
                btn.className = 'load-more-btn';
                btn.textContent = 'Voir plus d\'articles';
                btn.addEventListener('click', () => {
                    visibleCount += ARTICLES_PER_PAGE;
                    updateVisibility();
                });
                container.after(btn);
            }
            btn.style.display = '';
        } else if (btn) {
            btn.style.display = 'none';
        }
    }

    updateVisibility();

    // Créer le modal une seule fois
    if (!articlesModal) {
        articlesModal = document.createElement('div');
        articlesModal.className = 'article-modal';
        articlesModal.innerHTML = `
            <div class="article-modal-content">
                <button class="article-modal-close">&times;</button>
                <h3></h3>
                <div class="article-modal-body"></div>
            </div>
        `;
        document.body.appendChild(articlesModal);

        const closeBtn = articlesModal.querySelector('.article-modal-close');

        function closeModal() {
            articlesModal.classList.remove('open');
        }

        closeBtn.addEventListener('click', closeModal);
        articlesModal.addEventListener('click', (e) => {
            if (e.target === articlesModal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && articlesModal.classList.contains('open')) closeModal();
        });
    }

    const modalTitle = articlesModal.querySelector('h3');
    const modalBody = articlesModal.querySelector('.article-modal-body');

    // Ouvrir le modal au clic sur un article
    articles.forEach(article => {
        // Éviter les doublons de listeners
        if (article.dataset.hasClickListener) return;
        article.dataset.hasClickListener = 'true';

        article.addEventListener('click', () => {
            const titre = article.querySelector('[data-field="titre"]')?.textContent || '';
            const contenu = article.dataset.fullContent || '';

            modalTitle.textContent = titre;
            modalBody.innerHTML = contenu;
            articlesModal.classList.add('open');
        });
    });

    // Observer les changements dans le container (nouveaux articles ajoutés via Bifrost)
    if (!container.dataset.observed) {
        container.dataset.observed = 'true';
        const observer = new MutationObserver(() => {
            clearTimeout(setupArticlesTimeout);
            setupArticlesTimeout = setTimeout(() => {
                // Réappliquer stagger et observer
                applyStagger();
                if (revealObserver) {
                    document.querySelectorAll('.reveal:not(.is-in)').forEach(el => {
                        revealObserver.observe(el);
                    });
                }
                setupArticles();
            }, 150);
        });
        observer.observe(container, { childList: true });
    }
}

