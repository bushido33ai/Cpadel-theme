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
  const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /*
   * Horizon scrolls `.page-wrapper` on desktop (>= 990px) and the document on
   * phones (see assets/scroll-container.js). ScrollTrigger must listen to the
   * same scroller, so every motion element can be stopped and restarted, and
   * all of them are rebuilt, in page order, when that breakpoint is crossed.
   */
  const scrollContainerQuery = window.matchMedia('(min-width: 990px)');
  const getScroller = () => (scrollContainerQuery.matches && document.querySelector('.page-wrapper')) || window;
  ScrollTrigger.defaults({ scroller: getScroller() });
  if (!reduceMotion()) document.documentElement.classList.add('cpadel-motion');

  const live = new Set();
  const inPageOrder = () =>
    [...live].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  class MotionElement extends HTMLElement {
    connectedCallback() {
      live.add(this);
      this.start();
    }

    disconnectedCallback() {
      live.delete(this);
      this.stop();
    }

    start() {}

    stop() {}
  }

  scrollContainerQuery.addEventListener('change', () => {
    const ordered = inPageOrder();
    [...ordered].reverse().forEach((el) => el.stop());
    ScrollTrigger.defaults({ scroller: getScroller() });
    ordered.forEach((el) => el.start());
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });

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

  class CpadelCourtRally extends MotionElement {
    start() {
      this.ctx = gsap.context(() => this.build(), this);
    }

    stop() {
      if (this.ro) this.ro.disconnect();
      if (this.ctx) this.ctx.revert();
    }

    build() {
      const q = (sel) => this.querySelector(sel);
      const qa = (sel) => gsap.utils.toArray(this.querySelectorAll(sel));
      const plane = q('[data-plane]');
      const court = q('[data-court]');
      const ball = q('[data-ball]');
      const ballBody = q('[data-ball-body]');
      const shadow = q('[data-ball-shadow]');
      const trail = q('[data-ball-trail]');
      const net = q('[data-net]');
      const lines = qa('[data-court-line]');
      const specs = qa('[data-court-spec]');
      const [farWall, leftWall, rightWall] = qa('[data-wall]');
      if (!plane || !ball || !shadow) return;

      // One court unit (10 cm) in pixels, so the ball's height scales with the court.
      const setUnit = () => this.style.setProperty('--u', `${plane.offsetWidth / 200}px`);
      setUnit();
      this.ro = new ResizeObserver(setUnit);
      this.ro.observe(plane);

      const place = (x, y, h) => {
        this.style.setProperty('--bx', x.toFixed(2));
        this.style.setProperty('--by', y.toFixed(2));
        this.style.setProperty('--bz', Math.max(0, h).toFixed(2));
      };

      if (reduceMotion()) {
        place(150, 62, 0);
        return;
      }

      // Camera: as the section passes, the court tilts from a flat plan into a
      // broadcast angle and keeps orbiting; walls and net fold up out of the floor.
      gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set(specs, { autoAlpha: 0, y: 30 });
      gsap.set([ball, shadow], { autoAlpha: 0 });

      const camera = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: this, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
      });
      camera
        .fromTo(this, { '--tilt': '4deg', '--orbit': '-58deg' }, { '--tilt': '60deg', '--orbit': '-22deg', duration: 0.5, ease: 'power2.inOut' }, 0)
        .to(this, { '--orbit': '16deg', '--tilt': '56deg', duration: 0.5 }, 0.5)
        .to(lines, { strokeDashoffset: 0, duration: 0.28, stagger: 0.04, ease: 'power1.out' }, 0.06)
        .fromTo(farWall, { rotationX: 0 }, { rotationX: 90, duration: 0.2, ease: 'power2.out' }, 0.3)
        .fromTo(leftWall, { rotationY: 0 }, { rotationY: -90, duration: 0.2, ease: 'power2.out' }, 0.34)
        .fromTo(rightWall, { rotationY: 0 }, { rotationY: 90, duration: 0.2, ease: 'power2.out' }, 0.38)
        .fromTo(net, { rotationY: 0 }, { rotationY: -90, duration: 0.16, ease: 'back.out(2)' }, 0.42);

      ScrollTrigger.create({
        trigger: this,
        start: 'top 55%',
        once: true,
        onEnter: () => gsap.to(specs, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15, delay: 0.4 }),
      });

      // The rally: the shadow runs along the turf, the ball flies above it in 3D,
      // and a faint trail follows the shadow.
      const rally = gsap.timeline({ repeat: -1, repeatDelay: 1, paused: true, defaults: { ease: 'none' } });
      const pos = { x: RALLY_START.x, y: RALLY_START.y, h: 9 };
      const contacts = [];

      rally.set(pos, { x: RALLY_START.x, y: RALLY_START.y, h: 9 });
      rally.fromTo([ball, shadow, trail].filter(Boolean), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });

      RALLY.forEach((shot) => {
        const t = rally.duration();
        const peak = shot.h * 1.6; // metres-ish to court units, exaggerated a touch for drama
        rally.to(pos, { x: shot.to.x, y: shot.to.y, duration: shot.d }, t);
        rally.to(pos, { h: peak, duration: shot.d / 2, ease: 'sine.out' }, t);
        rally.to(pos, { h: shot.glass ? peak * 0.45 : 0, duration: shot.d / 2, ease: 'sine.in' }, t + shot.d / 2);
        contacts.push({ t: t + shot.d, x: shot.to.x, y: shot.to.y });
        rally.fromTo(
          ballBody,
          { scaleX: 1.3, scaleY: 0.75 },
          { scaleX: 1, scaleY: 1, duration: 0.22, ease: 'back.out(3)', immediateRender: false },
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
        start: 'top 65%',
        end: 'bottom top',
        onEnter: () => rally.play(),
        onEnterBack: () => rally.play(),
        onLeave: () => rally.pause(),
        onLeaveBack: () => rally.pause(),
      });
    }
  }

  class CpadelReveal extends MotionElement {
    start() {
      if (reduceMotion()) return;
      this.cleanups = [];
      this.ctx = gsap.context(() => {
        const items = gsap.utils.toArray(this.querySelectorAll('[data-reveal-item]'));
        if (items.length) {
          // Each card wipes up from behind a curtain, lifting and turning slightly.
          gsap.set(items, { clipPath: 'inset(100% 0% 0% 0%)', y: 80, rotation: 2, transformOrigin: '0% 100%' });
          ScrollTrigger.batch(items, {
            start: 'top 88%',
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, {
                clipPath: 'inset(0% 0% 0% 0%)',
                y: 0,
                rotation: 0,
                duration: 1.3,
                ease: 'expo.out',
                stagger: 0.14,
              }),
          });
          items.forEach((item) => {
            const image = item.querySelector('.cpadel-card__image, .cpadel-card__emblem');
            if (image) {
              gsap.fromTo(
                image,
                { yPercent: -6, scale: 1.12 },
                { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: true } }
              );
            }
          });
        }

        // Cards tilt towards the pointer, with a soft glare.
        if (finePointer()) {
          this.querySelectorAll('[data-tilt]').forEach((card) => {
            const glare = card.querySelector('[data-tilt-glare]');
            const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
            const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
            const move = (event) => {
              const r = card.getBoundingClientRect();
              const px = (event.clientX - r.left) / r.width;
              const py = (event.clientY - r.top) / r.height;
              ry((px - 0.5) * 16);
              rx((0.5 - py) * 16);
              if (glare) {
                glare.style.setProperty('--glare-x', `${px * 100}%`);
                glare.style.setProperty('--glare-y', `${py * 100}%`);
              }
            };
            const leave = () => {
              rx(0);
              ry(0);
            };
            card.addEventListener('pointermove', move);
            card.addEventListener('pointerleave', leave);
            this.cleanups.push(() => {
              card.removeEventListener('pointermove', move);
              card.removeEventListener('pointerleave', leave);
            });
          });
        }
      }, this);
    }

    stop() {
      if (this.cleanups) this.cleanups.forEach((fn) => fn());
      if (this.ctx) this.ctx.revert();
    }
  }

  const html = document.documentElement;

  /* ------------------------------------------------------------------ */
  /* Hero: opening sequence, letter-by-letter headline, scroll parallax  */
  /* ------------------------------------------------------------------ */
  class CpadelHeroMotion extends MotionElement {
    start() {
      if (reduceMotion()) {
        this.finishIntro();
        return;
      }
      html.classList.add('cpadel-motion');
      this.ctx = gsap.context(() => this.build(), this);
    }

    stop() {
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
  class CpadelShowcase extends MotionElement {
    start() {
      if (reduceMotion()) return;
      this.classList.add('is-animated');
      this.mm = gsap.matchMedia();
      this.mm.add({ desktop: '(min-width: 750px)', mobile: '(max-width: 749px)' }, (ctx) => this.build(ctx.conditions.desktop));
    }

    stop() {
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
  class CpadelBandMotion extends MotionElement {
    start() {
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

    stop() {
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
