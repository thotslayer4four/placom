(function () {
    const navbar = document.querySelector('.site-header .navbar');

    if (navbar) {
        const toggleNavbarShadow = () => {
            navbar.classList.toggle('navbar-scrolled', window.scrollY > 8);
        };

        toggleNavbarShadow();
        window.addEventListener('scroll', toggleNavbarShadow, { passive: true });
    }

    const groupedSelectors = [
        '.hero-content, .about-hero-content, .what-we-do-hero-content, .ecosystem-hero-content, .invest-hero-content, .insights-hero-content',
        'main section .container > *',
        '.fade-up',
        'main section [role="listitem"]',
        'main section article',
        '.footer-top > *',
        '.footer-bottom'
    ];

    const revealTargets = [];
    const seen = new Set();

    groupedSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element, index) => {
            if (seen.has(element)) {
                return;
            }

            seen.add(element);
            element.classList.add('reveal-on-scroll');
            element.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 40}ms`);
            revealTargets.push(element);
        });
    });

    if (!revealTargets.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        revealTargets.forEach((element) => element.classList.add('is-visible', 'visible'));
        return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            entry.target.classList.add('is-visible', 'visible');
            observer.unobserve(entry.target);
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px 10% 0px'
    });

    revealTargets.forEach((element) => revealObserver.observe(element));
})();
