/*
 * CPadel motion graphics.
 *
 *   <cpadel-court-rally>  top-down padel court that draws itself on scroll,
 *                         then a ball plays a rally across it.
 *   <cpadel-reveal>       children marked [data-reveal-item] rise into view.
 *
 * Progressive: without JS (or GSAP) everything is visible and static.
 * Reduced motion: lines are shown drawn, the ball rests on court, nothing loops.
 * Custom elements re-initialise when the theme editor reloads a section.
 */
(() => {
  const ready = () => typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (!ready()) return;

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /*
   * Rally, in court units (the SVG court is 200 x 100, i.e. 10 units per metre).
   * Each shot travels along the ground from the previous point to `to`;
   * `h` is how high the ball arcs above its shadow on the way.
   * `hit` marks a racket strike, `glass` a rebound off the walls.
   */
  const RALLY_START = { x: 22, y: 86 };
  const RALLY = [
    { to: { x: 150, y: 28 }, h: 16, d: 1.15 },               // serve, diagonal, bounces in the box
    { to: { x: 198, y: 20 }, h: 7, d: 0.45, glass: true },   // into the back glass
    { to: { x: 182, y: 34 }, h: 6, d: 0.4, hit: true },      // off the glass, returned
    { to: { x: 52, y: 80 }, h: 22, d: 1.25 },                // lob cross-court, bounces
    { to: { x: 2, y: 94 }, h: 8, d: 0.5, glass: true },      // into the back glass
    { to: { x: 26, y: 84 }, h: 6, d: 0.4, hit: true },       // off the glass, volley
    { to: { x: 145, y: 58 }, h: 10, d: 0.85 },               // drive down the middle
    { to: { x: 172, y: 68 }, h: 4, d: 0.35 },                // second bounce: point
  ];

  class CpadelCourtRally extends HTMLElement {
    connectedCallback() {
      this.ctx = gsap.context(() => this.build(), this);
    }

    disconnectedCallback() {
      if (this.ctx) this.ctx.revert();
    }

    build() {
      const lines = gsap.utils.toArray(this.querySelectorAll('[data-court-line]'));
      const specs = gsap.utils.toArray(this.querySelectorAll('[data-court-spec]'));
      const ball = this.querySelector('[data-ball]');
      const ballBody = this.querySelector('[data-ball-body]');
      const shadow = this.querySelector('[data-ball-shadow]');
      const trail = this.querySelector('[data-ball-trail]');
      const court = this.querySelector('[data-court]');
      if (!ball || !shadow || !court) return;

      const place = (x, y, h = 0) => {
        gsap.set(shadow, { x, y });
        gsap.set(ball, { x, y: y - h });
      };

      if (reduceMotion()) {
        place(150, 58, 0);
        gsap.set([ball, shadow], { autoAlpha: 1 });
        return;
      }

      // Lines draw themselves as the court scrolls into view.
      gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(specs, { autoAlpha: 0, y: 24 });
      gsap.set([ball, shadow], { autoAlpha: 0 });

      gsap
        .timeline({
          scrollTrigger: { trigger: court, start: 'top 85%', end: 'center 55%', scrub: 0.6 },
        })
        .to(lines, { strokeDashoffset: 0, duration: 1, ease: 'power2.out', stagger: 0.08 });

      ScrollTrigger.create({
        trigger: this,
        start: 'top 70%',
        once: true,
        onEnter: () =>
          gsap.to(specs, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15 }),
      });

      // The rally: the shadow runs along the ground, the ball arcs above it,
      // and a faint trail follows the shadow.
      const rally = gsap.timeline({ repeat: -1, repeatDelay: 1.2, paused: true, defaults: { ease: 'none' } });
      const pos = { x: RALLY_START.x, y: RALLY_START.y, h: 4 };
      const contacts = []; // { t, x, y } for each completed shot

      rally.set(pos, { x: RALLY_START.x, y: RALLY_START.y, h: 4 });
      rally.fromTo([ball, shadow, trail].filter(Boolean), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });

      RALLY.forEach((shot) => {
        const t = rally.duration();
        rally.to(pos, { x: shot.to.x, y: shot.to.y, duration: shot.d }, t);
        rally.to(pos, { h: shot.h, duration: shot.d / 2, ease: 'sine.out' }, t);
        rally.to(pos, { h: shot.glass ? shot.h * 0.4 : 0, duration: shot.d / 2, ease: 'sine.in' }, t + shot.d / 2);
        contacts.push({ t: t + shot.d, x: shot.to.x, y: shot.to.y });

        // A little squash on every contact.
        rally.fromTo(
          ballBody,
          { scaleX: 1.35, scaleY: 0.7, svgOrigin: '0 0' },
          { scaleX: 1, scaleY: 1, duration: 0.25, ease: 'back.out(3)', immediateRender: false },
          t + shot.d
        );
      });

      rally.to([ball, shadow, trail].filter(Boolean), { autoAlpha: 0, duration: 0.5 }, '+=0.4');

      rally.eventCallback('onUpdate', () => {
        place(pos.x, pos.y, pos.h);
        if (!trail) return;
        const now = rally.time();
        const points = [`${RALLY_START.x},${RALLY_START.y}`];
        contacts.forEach((c) => {
          if (c.t <= now) points.push(`${c.x},${c.y}`);
        });
        points.push(`${pos.x.toFixed(1)},${pos.y.toFixed(1)}`);
        trail.setAttribute('points', points.join(' '));
      });

      ScrollTrigger.create({
        trigger: court,
        start: 'top 60%',
        end: 'bottom top',
        onEnter: () => rally.play(),
        onEnterBack: () => rally.play(),
        onLeave: () => rally.pause(),
        onLeaveBack: () => rally.pause(),
      });
    }
  }

  class CpadelReveal extends HTMLElement {
    connectedCallback() {
      if (reduceMotion()) return;
      this.ctx = gsap.context(() => {
        const items = gsap.utils.toArray(this.querySelectorAll('[data-reveal-item]'));
        if (!items.length) return;
        gsap.set(items, { autoAlpha: 0, y: 40 });
        ScrollTrigger.batch(items, {
          start: 'top 90%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12 }),
        });
      }, this);
    }

    disconnectedCallback() {
      if (this.ctx) this.ctx.revert();
    }
  }

  if (!customElements.get('cpadel-court-rally')) customElements.define('cpadel-court-rally', CpadelCourtRally);
  if (!customElements.get('cpadel-reveal')) customElements.define('cpadel-reveal', CpadelReveal);
})();
