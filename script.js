/**
 * Zoha & Ibrahim — Save the Date
 * One paused, reversible GSAP timeline. Tap to open / reverse to close.
 *
 * ---------------------------------------------------------------------------
 * DEBUG — Timeline stages (open direction)
 * ---------------------------------------------------------------------------
 *  0.00 – 0.35  Closed flap fades out
 *  0.04 – 0.82  Open flap fades in + rotateX 92→0 (power2.inOut)
 *  0.22         Paper-inside becomes visible at START_Y
 *  0.28 – 1.23  Both papers rise START→CLEAR together (front still invisible)
 *               Rise overlaps the still-opening flap — no pause between steps
 *  ~1.23        Layer swap ~0.15s (label "swap"):
 *                 paper-front autoAlpha 0→1
 *                 paper-inside autoAlpha 1→0
 *               Same x/y/scale — pure opacity handoff, no layout reads
 *  after swap   Paper-front settles CLEAR→FINAL slightly downward (sine.out)
 *
 * Layer swap timing:
 *   .paper-well is inset:0 on .invitation-scene, so paper-inside and
 *   paper-front share one coordinate system. Identical transform values
 *   keep the handoff pixel-aligned without getBoundingClientRect().
 *
 * Open / close state:
 *   isOpen = intended end state. Taps ignored while isAnimating / tl.isActive().
 *   Close = timeline.reverse() (exact reverse of open).
 *   Resize debounces, rebuilds via gsap.context(), restores progress 0 or 1.
 * ---------------------------------------------------------------------------
 */

(() => {
  const envelope = document.getElementById("envelope");
  const scene = document.getElementById("scene");
  const closeflap = document.getElementById("closeflap");
  const openflap = document.getElementById("openflap");
  const paperInside = document.getElementById("paper-inside");
  const paperFront = document.getElementById("paper-front");
  const hint = document.getElementById("hint");

  if (!envelope || !scene || typeof gsap === "undefined") return;

  /**
   * Paper Y stations (transform % of each paper’s own height —
   * both papers are identical artboard-sized layers).
   * START  — tucked behind the pocket
   * CLEAR  — fully above the pocket lip (swap point)
   * FINAL  — settled slightly downward in front of the envelope
   */
  const PAPER_START_Y = "8%";
  const PAPER_CLEAR_Y = "-23%";
  const PAPER_FINAL_Y = "4%";
  const PAPER_FINAL_SCALE = 1.02;

  /**
   * Flap origin: requirement language is "50% 100%" (bottom of the flap).
   * These PNGs are full 780×2000 artboards, so the hinge sits at ~47.3%.
   */
  const FLAP_ORIGIN = "50% 47.3%";
  const PAPER_ORIGIN = "50% 50%";

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let ctx = null;
  let timeline = null;
  let isOpen = false;
  let isAnimating = false;
  let resizeTimer = null;

  function setClosedUi() {
    envelope.classList.remove("is-open");
    envelope.setAttribute(
      "aria-label",
      "Open the envelope to reveal the save the date"
    );
    hint.classList.remove("is-hidden");
  }

  function setOpenUi() {
    envelope.classList.add("is-open");
    envelope.setAttribute(
      "aria-label",
      "Save the date revealed — tap to close"
    );
    hint.classList.add("is-hidden");
  }

  function applyInstantState(open) {
    if (open) {
      gsap.set(closeflap, { opacity: 0 });
      gsap.set(openflap, {
        opacity: 1,
        rotateX: 0,
        transformOrigin: FLAP_ORIGIN,
      });
      gsap.set(paperInside, {
        autoAlpha: 0,
        x: 0,
        y: PAPER_CLEAR_Y,
        scale: 1,
        transformOrigin: PAPER_ORIGIN,
      });
      gsap.set(paperFront, {
        autoAlpha: 1,
        x: 0,
        y: PAPER_FINAL_Y,
        scale: PAPER_FINAL_SCALE,
        transformOrigin: PAPER_ORIGIN,
      });
      setOpenUi();
    } else {
      gsap.set(closeflap, { opacity: 1 });
      gsap.set(openflap, {
        opacity: 0,
        rotateX: 92,
        transformOrigin: FLAP_ORIGIN,
      });
      gsap.set([paperInside, paperFront], {
        autoAlpha: 0,
        x: 0,
        y: PAPER_START_Y,
        scale: 1,
        transformOrigin: PAPER_ORIGIN,
      });
      setClosedUi();
    }
  }

  function buildTimeline() {
    if (ctx) {
      ctx.revert();
      ctx = null;
      timeline = null;
    }

    ctx = gsap.context(() => {
      // ---- Explicit initial state (closed) ------------------------------
      gsap.set(closeflap, { opacity: 1 });

      gsap.set(openflap, {
        opacity: 0,
        rotateX: 92,
        transformOrigin: FLAP_ORIGIN,
        force3D: true,
      });

      gsap.set(paperInside, {
        x: 0,
        y: PAPER_START_Y,
        scale: 1,
        autoAlpha: 0,
        transformOrigin: PAPER_ORIGIN,
        force3D: true,
      });

      gsap.set(paperFront, {
        x: 0,
        y: PAPER_START_Y,
        scale: 1,
        autoAlpha: 0,
        transformOrigin: PAPER_ORIGIN,
        force3D: true,
      });

      timeline = gsap.timeline({
        paused: true,
        defaults: { force3D: true },
        onStart() {
          isAnimating = true;
        },
        onComplete() {
          isAnimating = false;
          isOpen = true;
          setOpenUi();
        },
        onReverseComplete() {
          isAnimating = false;
          isOpen = false;
          gsap.set([paperInside, paperFront], {
            autoAlpha: 0,
            x: 0,
            y: PAPER_START_Y,
            scale: 1,
            transformOrigin: PAPER_ORIGIN,
          });
          gsap.set(openflap, {
            opacity: 0,
            rotateX: 92,
            transformOrigin: FLAP_ORIGIN,
          });
          gsap.set(closeflap, { opacity: 1 });
          setClosedUi();
        },
      });

      // 1 — Closed flap dissolves
      timeline.to(
        closeflap,
        {
          opacity: 0,
          duration: 0.35,
          ease: "power2.out",
        },
        0
      );

      // 2 — Open flap fades in and rotates up from the hinge
      timeline.to(
        openflap,
        {
          opacity: 1,
          rotateX: 0,
          duration: 0.78,
          ease: "power2.inOut",
        },
        0.04
      );

      // 3 — Reveal inside paper; park invisible front on the same pose
      timeline.set(
        paperInside,
        {
          autoAlpha: 1,
          x: 0,
          y: PAPER_START_Y,
          scale: 1,
        },
        0.22
      );

      timeline.set(
        paperFront,
        {
          autoAlpha: 0,
          x: 0,
          y: PAPER_START_Y,
          scale: 1,
        },
        0.22
      );

      // 4 — Both papers rise together (front stays invisible until swap)
      //     Overlaps remaining flap motion — no empty pause tween
      timeline.to(
        paperInside,
        {
          y: PAPER_CLEAR_Y,
          duration: 0.95,
          ease: "power2.out",
        },
        0.28
      );

      timeline.to(
        paperFront,
        {
          y: PAPER_CLEAR_Y,
          duration: 0.95,
          ease: "power2.out",
        },
        0.28
      );

      // 5 — Seamless layer swap (~0.15s overlap). Never hard-hide first.
      timeline.to(
        paperFront,
        {
          autoAlpha: 1,
          duration: 0.15,
          ease: "sine.out",
        },
        "swap"
      );

      timeline.to(
        paperInside,
        {
          autoAlpha: 0,
          duration: 0.15,
          ease: "sine.out",
        },
        "swap"
      );

      // 6 — Front paper settles slightly downward into its final pose
      timeline.to(
        paperFront,
        {
          y: PAPER_FINAL_Y,
          scale: PAPER_FINAL_SCALE,
          duration: 0.85,
          ease: "sine.out",
        },
        "-=0.05"
      );
    }, scene);

    // Restore open/closed after a rebuild (e.g. resize)
    if (timeline) {
      timeline.progress(isOpen ? 1 : 0).pause();
      applyInstantState(isOpen);
      isAnimating = false;
    }
  }

  function toggleEnvelope() {
    if (!timeline || isAnimating || timeline.isActive()) return;

    if (prefersReducedMotion) {
      isOpen = !isOpen;
      applyInstantState(isOpen);
      timeline.progress(isOpen ? 1 : 0).pause();
      return;
    }

    if (isOpen) {
      // Already fully closed — stay consistent instead of locking forever
      if (timeline.progress() === 0) {
        isOpen = false;
        applyInstantState(false);
        return;
      }
      isAnimating = true;
      timeline.reverse();
    } else {
      if (timeline.progress() === 1) {
        isOpen = true;
        applyInstantState(true);
        return;
      }
      isAnimating = true;
      timeline.play();
    }
  }

  /**
   * One pointer handler only — avoids touchstart + click double-firing
   * on Mobile Safari. Keyboard remains via keydown on the <button>.
   */
  function onPointerUp(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (event.pointerType !== "mouse") {
      event.preventDefault();
    }
    toggleEnvelope();
  }

  function onKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleEnvelope();
    }
  }

  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const stayOpen = isOpen;
      isOpen = stayOpen;
      buildTimeline();
      if (timeline) {
        timeline.progress(stayOpen ? 1 : 0).pause();
      }
      applyInstantState(stayOpen);
      isAnimating = false;
    }, 150);
  }

  buildTimeline();

  envelope.addEventListener("pointerup", onPointerUp);
  envelope.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize, { passive: true });
})();
