/*
 * CPadel motion graphics.
 *
 *   <cpadel-court-rally>  top-down padel court that draws itself on scroll,
 *                         then a ball plays a rally across it.
 *   <cpadel-reveal>       children marked [data-reveal-item] rise into view.
 *   <cpadel-hero-motion>  opening sequence (crowned C, wordmark, curtain), then
 *                         the headline rises letter by letter; scroll parallax.
 *   <cpadel-showcase>     pinned, scroll-scrubbed 3D racket reveal with spec
 *                         callouts and a closing price card.
 *   <cpadel-band-motion>  the spec band speeds up and leans with scroll velocity.
 *   [data-magnetic]       buttons pull towards the cursor.
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

  const html = document.documentElement;
  const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------------ */
  /* Hero: opening sequence, letter-by-letter headline, scroll parallax  */
  /* ------------------------------------------------------------------ */
  class CpadelHeroMotion extends HTMLElement {
    connectedCallback() {
      if (reduceMotion()) {
        this.finishIntro();
        return;
      }
      html.classList.add('cpadel-motion');
      this.ctx = gsap.context(() => this.build(), this);
    }

    disconnectedCallback() {
      if (this.ctx) this.ctx.revert();
      if (this.split) this.split.revert();
    }

    finishIntro() {
      html.classList.remove('cpadel-intro-pending');
      try {
        sessionStorage.setItem('cpadel-intro-seen', '1');
      } catch (e) {}
    }

    build() {
      const q = (sel) => this.querySelector(sel);
      const media = q('[data-hero-media]');
      const image = media && media.querySelector('img');
      const heading = q('[data-hero-heading]');
      const content = q('[data-hero-content]');
      const fades = this.querySelectorAll('[data-hero-fade]');
      const intro = html.classList.contains('cpadel-intro-pending') ? q('[data-intro]') : null;
      if (intro) window.cpadelIntroStarted = true;

      let chars = null;
      if (heading && window.SplitText) {
        gsap.registerPlugin(window.SplitText);
        this.split = window.SplitText.create(heading, { type: 'words,chars', mask: 'chars', charsClass: 'cpadel-char' });
        chars = this.split.chars;
      }

      gsap.set(fades, { autoAlpha: 0, y: 30 });
      if (chars) gsap.set(chars, { yPercent: 115 });
      else if (heading) gsap.set(heading, { autoAlpha: 0, y: 40 });
      if (image) gsap.set(image, { scale: 1.25, transformOrigin: '50% 60%' });

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      if (intro) {
        const c = intro.querySelector('[data-intro-c]');
        const crown = intro.querySelector('[data-intro-crown]');
        const wordmark = intro.querySelector('[data-intro-wordmark]');
        const rule = intro.querySelector('[data-intro-rule]');
        const mark = intro.querySelector('[data-intro-mark]');
        const panel = intro.querySelector('[data-intro-panel]');
        const back = intro.querySelector('[data-intro-panel-back]');

        gsap.set(c, { clipPath: 'inset(0% 100% 0% 0%)', rotate: -28, scale: 0.55, transformOrigin: '55% 65%' });
        gsap.set(crown, { y: -160, autoAlpha: 0, rotate: -18, transformOrigin: '50% 100%' });
        gsap.set(wordmark, { clipPath: 'inset(0% 100% 0% 0%)', x: -40 });
        gsap.set(rule, { scaleX: 0 });

        tl.to(c, { clipPath: 'inset(0% 0% 0% 0%)', rotate: 0, scale: 1, duration: 1.2 }, 0.15)
          .to(crown, { y: 0, autoAlpha: 1, rotate: 0, duration: 1, ease: 'bounce.out' }, 0.8)
          .to(wordmark, { clipPath: 'inset(0% 0% 0% 0%)', x: 0, duration: 1.1 }, 1.0)
          .to(rule, { scaleX: 1, duration: 0.8 }, 1.4)
          .to(mark, { y: -50, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 2.35)
          .to(panel, { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, 2.55)
          .to(back, { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, 2.72)
          .add(() => this.finishIntro(), 3.9)
          .addLabel('reveal', 3.05);

        // Click or key press skips the sequence.
        const skip = () => tl.progress(1);
        intro.addEventListener('click', skip, { once: true });
        window.addEventListener('keydown', skip, { once: true });
      } else {
        this.finishIntro();
        tl.addLabel('reveal', 0.1);
      }

      if (image) tl.to(image, { scale: 1, duration: 2.6, ease: 'power3.out' }, 'reveal');
      if (chars) tl.to(chars, { yPercent: 0, duration: 1.1, stagger: 0.035 }, 'reveal+=0.15');
      else if (heading) tl.to(heading, { autoAlpha: 1, y: 0, duration: 1 }, 'reveal+=0.15');
      tl.to(fades, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 'reveal+=0.45');

      // Scroll: the court drifts behind, the copy lifts away.
      if (media) {
        gsap.to(media, {
          yPercent: 18,
          ease: 'none',
          scrollTrigger: { trigger: this, start: 'top top', end: 'bottom top', scrub: true },
        });
      }
      if (content) {
        gsap.to(content, {
          y: -90,
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: { trigger: this, start: 'top top', end: '65% top', scrub: true },
        });
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Showcase: pinned 3D racket reveal                                    */
  /* ------------------------------------------------------------------ */
  class CpadelShowcase extends HTMLElement {
    connectedCallback() {
      if (reduceMotion()) return;
      this.classList.add('is-animated');
      this.mm = gsap.matchMedia();
      this.mm.add({ desktop: '(min-width: 750px)', mobile: '(max-width: 749px)' }, (ctx) => this.build(ctx.conditions.desktop));
    }

    disconnectedCallback() {
      if (this.mm) this.mm.revert();
      this.classList.remove('is-animated');
    }

    build(desktop) {
      const q = (sel) => this.querySelector(sel);
      const stage = q('[data-stage]');
      const bg = q('[data-bg]');
      const glow = q('[data-glow]');
      const word = q('[data-word]');
      const introCopy = q('[data-intro-copy]');
      const box = q('[data-racket-box]');
      const racket = q('[data-racket]');
      const shadow = q('[data-shadow]');
      const sheen = q('[data-sheen]');
      const final = q('[data-final]');
      const callouts = gsap.utils.toArray(this.querySelectorAll('[data-callout]'));

      // Positioning that GSAP owns from here on (replaces the CSS translates).
      gsap.set(introCopy, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
      gsap.set(box, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
      gsap.set(final, desktop ? { yPercent: -50, y: 40, autoAlpha: 0 } : { xPercent: -50, y: 40, autoAlpha: 0 });

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: this,
          start: 'top top',
          end: desktop ? '+=320%' : '+=380%',
          pin: stage,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Backdrop: cream to ink, a burgundy glow, a giant word sliding past.
      tl.fromTo(word, { xPercent: 8 }, { xPercent: -58, duration: 10 }, 0)
        .fromTo(bg, { backgroundColor: '#f4eee6' }, { keyframes: { backgroundColor: ['#f4eee6', '#6b1e24', '#2b1618'] }, duration: 1.8, ease: 'power1.inOut' }, 0.6)
        .fromTo(glow, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 2 }, 1.2)
        .to(introCopy, { autoAlpha: 0, y: -60, scale: 0.94, duration: 1, ease: 'power2.in' }, 0.3);

      // The racket rises and turns to face you.
      tl.fromTo(
        racket,
        { yPercent: 80, rotateY: 78, rotateZ: -30, rotateX: 12, scale: 0.5 },
        { yPercent: 0, rotateY: 0, rotateZ: 0, rotateX: 0, scale: 1, duration: 2.4, ease: 'power3.out' },
        0.5
      )
        .fromTo(shadow, { autoAlpha: 0, scaleX: 0.3 }, { autoAlpha: 1, scaleX: 1, duration: 2.4, ease: 'power3.out' }, 0.5)
        .fromTo(sheen, { backgroundPosition: '120% 0%' }, { backgroundPosition: '-20% 0%', duration: 1.6, ease: 'power1.inOut' }, 2.6)
        .to(racket, { rotateY: -14, rotateZ: 3, duration: 2.2, ease: 'sine.inOut' }, 3.0)
        .to(racket, { rotateY: 10, rotateZ: -2, duration: 2.2, ease: 'sine.inOut' }, 5.2);

      // Spec callouts, one after another.
      const step = 1.2;
      const first = 3.1;
      callouts.forEach((el, i) => {
        const dot = el.querySelector('[data-callout-dot]');
        const line = el.querySelector('[data-callout-line]');
        const label = el.querySelector('[data-callout-label]');
        const at = first + i * step;
        if (desktop) {
          const fromLeft = el.classList.contains('cpadel-showcase__callout--left');
          gsap.set(dot, { scale: 0 });
          gsap.set(line, { scaleX: 0 });
          gsap.set(label, { autoAlpha: 0, x: fromLeft ? 24 : -24 });
          tl.to(dot, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, at)
            .to(line, { scaleX: 1, duration: 0.6, ease: 'power2.out' }, at + 0.2)
            .to(label, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'power2.out' }, at + 0.6);
        } else {
          gsap.set(label, { autoAlpha: 0, y: 24 });
          tl.to(label, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, at);
          if (i < callouts.length - 1) tl.to(label, { autoAlpha: 0, y: -24, duration: 0.4, ease: 'power2.in' }, at + 0.9);
        }
      });

      // Close: specs clear, the racket steps aside, the price card lands.
      const end = first + callouts.length * step + 0.2;
      tl.to(callouts, { autoAlpha: 0, duration: 0.5 }, end);
      if (desktop) {
        tl.to(box, { x: () => -window.innerWidth * 0.2, duration: 1.4, ease: 'power2.inOut' }, end + 0.2);
      } else {
        tl.to(box, { scale: 0.72, y: () => -window.innerHeight * 0.1, duration: 1.4, ease: 'power2.inOut' }, end + 0.2);
      }
      tl.to(racket, { rotateY: -20, rotateZ: 7, duration: 1.4, ease: 'power2.inOut' }, end + 0.2)
        .to(final, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, end + 0.9)
        .to({}, { duration: 0.8 });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Spec band: velocity-reactive marquee                                 */
  /* ------------------------------------------------------------------ */
  class CpadelBandMotion extends HTMLElement {
    connectedCallback() {
      if (reduceMotion()) return;
      const band = this.querySelector('.cpadel-band');
      const track = this.querySelector('.cpadel-band__track');
      if (!band || !track) return;
      this.classList.add('is-gsap');

      this.ctx = gsap.context(() => {
        const duration = parseFloat(getComputedStyle(band).getPropertyValue('--cpadel-band-duration')) || 40;
        const loop = gsap.to(track, { xPercent: -50, duration, ease: 'none', repeat: -1 });
        loop.totalTime(duration * 200); // room to run backwards when scrolling up
        const skewTo = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
        let direction = 1;
        let boost = 0;

        ScrollTrigger.create({
          trigger: this,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            direction = self.direction;
            boost = Math.min(8, Math.abs(self.getVelocity()) / 250);
          },
        });

        this.tick = () => {
          boost *= 0.93;
          loop.timeScale(direction * (1 + boost));
          skewTo(gsap.utils.clamp(-12, 12, -direction * boost * 1.6));
        };
        gsap.ticker.add(this.tick);
      }, this);
    }

    disconnectedCallback() {
      if (this.tick) gsap.ticker.remove(this.tick);
      if (this.ctx) this.ctx.revert();
      this.classList.remove('is-gsap');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Magnetic buttons                                                     */
  /* ------------------------------------------------------------------ */
  const initMagnetic = (root = document) => {
    if (!finePointer() || reduceMotion()) return;
    root.querySelectorAll('[data-magnetic]').forEach((el) => {
      if (el.cpadelMagnetic) return;
      el.cpadelMagnetic = true;
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', (event) => {
        const r = el.getBoundingClientRect();
        xTo((event.clientX - (r.left + r.width / 2)) * 0.35);
        yTo((event.clientY - (r.top + r.height / 2)) * 0.45);
      });
      el.addEventListener('pointerleave', () => {
        xTo(0);
        yTo(0);
      });
    });
  };

  // Register in page order so ScrollTriggers (and the pin's spacing) are
  // created top to bottom.
  const elements = [
    ['cpadel-hero-motion', CpadelHeroMotion],
    ['cpadel-band-motion', CpadelBandMotion],
    ['cpadel-showcase', CpadelShowcase],
    ['cpadel-reveal', CpadelReveal],
    ['cpadel-court-rally', CpadelCourtRally],
  ];
  elements.forEach(([name, ctor]) => {
    if (!customElements.get(name)) customElements.define(name, ctor);
  });

  initMagnetic();
  document.addEventListener('shopify:section:load', (event) => {
    initMagnetic(event.target);
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
  window.addEventListener('load', () => {
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
})();
