/**
 * Zoha & Ibrahim — Save the Date
 * Reversible GSAP sequence: tap to open, tap again to close.
 *
 * Two-paper technique: matched-position handoff via getBoundingClientRect()
 * so .paper-front never jumps from a centered/default pose.
 */

(() => {
  const envelope = document.getElementById("envelope");
  const closeflap = document.getElementById("closeflap");
  const openflap = document.getElementById("openflap");
  const paperInside = document.getElementById("paper-inside");
  const paperFront = document.getElementById("paper-front");
  const hint = document.getElementById("hint");

  /**
   * START  — tucked behind the pocket (only shown after the flap lifts)
   * CLEAR  — fully above the pocket lip → matched handoff
   * FINAL  — resting in front, centered on the envelope
   */
  const PAPER_START_Y = "8%";
  const PAPER_CLEAR_Y = "-23%";
  const PAPER_FINAL_Y = "4%";
  const PAPER_FINAL_SCALE = 1.02;
  const PAPER_X = 0;

  /** Soft pop-out motion */
  const SLIDE_DURATION = 1.2;
  const CROSSFADE = 0.1;
  const GLIDE_DURATION = 1.4;
  const GLIDE_OVERLAP = "-=0.25";

  /** Reveal inside paper shortly after the flap begins lifting */
  const PAPER_REVEAL_AT = 0.22;

  /** Matched handoff transform (screen-synced), used for the downward glide */
  let handoffX = 0;
  let handoffY = 0;
  let handoffScale = 1;

  function layoutHeight(el) {
    return el.offsetHeight || el.getBoundingClientRect().height;
  }

  function percentToYPx(percentStr, el) {
    return (parseFloat(percentStr) / 100) * layoutHeight(el);
  }

  function numProp(el, prop) {
    return parseFloat(gsap.getProperty(el, prop)) || 0;
  }

  /**
   * Pin .paper-front to the exact on-screen box of .paper-inside
   * before revealing it (opacity stays 0; visibility becomes visible).
   */
  function syncFrontToInside() {
    const insideX = numProp(paperInside, "x");
    const insideY = numProp(paperInside, "y");
    const insideScale = numProp(paperInside, "scale") || 1;

    gsap.set(paperFront, {
      x: insideX,
      y: insideY,
      scale: insideScale,
      opacity: 0,
      visibility: "visible",
    });

    const ir = paperInside.getBoundingClientRect();
    let fr = paperFront.getBoundingClientRect();

    // Match scale if layout boxes differ slightly across parents
    if (fr.width > 1 && Math.abs(ir.width - fr.width) > 0.5) {
      const matchedScale = insideScale * (ir.width / fr.width);
      gsap.set(paperFront, { scale: matchedScale });
      fr = paperFront.getBoundingClientRect();
      handoffScale = matchedScale;
    } else {
      handoffScale = insideScale;
    }

    handoffX = numProp(paperFront, "x") + (ir.left - fr.left);
    handoffY = numProp(paperFront, "y") + (ir.top - fr.top);

    gsap.set(paperFront, {
      x: handoffX,
      y: handoffY,
      scale: handoffScale,
      opacity: 0,
      visibility: "visible",
    });
  }

  /**
   * Pin .paper-inside to the exact on-screen box of .paper-front (close path).
   */
  function syncInsideToFront() {
    const frontX = numProp(paperFront, "x");
    const frontY = numProp(paperFront, "y");

    gsap.set(paperInside, {
      x: frontX,
      y: frontY,
      scale: 1,
      opacity: 0,
      visibility: "visible",
    });

    const fr = paperFront.getBoundingClientRect();
    const ir = paperInside.getBoundingClientRect();

    gsap.set(paperInside, {
      x: numProp(paperInside, "x") + (fr.left - ir.left),
      y: numProp(paperInside, "y") + (fr.top - ir.top),
      scale: 1,
      opacity: 0,
      visibility: "visible",
    });
  }

  /** Final Y in .paper-front space, preserving any handoff parent offset */
  function paperFrontFinalY() {
    const clearY = percentToYPx(PAPER_CLEAR_Y, paperFront);
    const finalY = percentToYPx(PAPER_FINAL_Y, paperFront);
    const offset = handoffY - clearY;
    return finalY + offset;
  }

  // ---- Initial state (fully closed — both papers invisible) ------------

  gsap.set(openflap, {
    opacity: 0,
    rotateX: 92,
    transformOrigin: "50% 47.3%",
  });

  gsap.set(closeflap, {
    opacity: 1,
  });

  gsap.set(paperInside, {
    x: PAPER_X,
    y: PAPER_START_Y,
    scale: 1,
    autoAlpha: 0,
    pointerEvents: "none",
    transformOrigin: "center center",
  });

  gsap.set(paperFront, {
    x: PAPER_X,
    y: PAPER_START_Y,
    scale: 1,
    autoAlpha: 0,
    pointerEvents: "none",
    transformOrigin: "center center",
  });

  // ---- Timeline: closed → open (reversible for toggle) -----------------

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "power2.inOut" },
    onComplete() {
      envelope.classList.add("is-open");
      envelope.setAttribute("aria-label", "Save the date revealed — tap to close");
      hint.classList.add("is-hidden");
    },
    onReverseComplete() {
      gsap.set([paperInside, paperFront], {
        autoAlpha: 0,
        pointerEvents: "none",
        y: PAPER_START_Y,
        scale: 1,
        x: PAPER_X,
      });
      envelope.classList.remove("is-open");
      envelope.setAttribute(
        "aria-label",
        "Open the envelope to reveal the save the date"
      );
      hint.classList.remove("is-hidden");
    },
  });

  // 1 — Closed flap dissolves
  tl.to(
    closeflap,
    {
      opacity: 0,
      duration: 0.4,
      ease: "power2.out",
    },
    0
  );

  // 2 — Open flap fades in and lifts from the hinge
  tl.to(
    openflap,
    {
      opacity: 1,
      rotateX: 0,
      duration: 0.8,
      ease: "power3.out",
    },
    0.04
  );

  // Reveal .paper-inside once the flap has started lifting
  tl.set(
    paperInside,
    {
      x: PAPER_X,
      y: PAPER_START_Y,
      scale: 1,
      autoAlpha: 1,
    },
    PAPER_REVEAL_AT
  );

  // 3 — Brief pause before the card emerges (after flap motion)
  tl.to({}, { duration: 0.3 }, 0.84);

  // 4 — Inside paper rises until it clears the pocket
  tl.to(paperInside, {
    y: PAPER_CLEAR_Y,
    duration: SLIDE_DURATION,
    ease: "power2.out",
  });

  // 5 — Matched-position handoff (getBoundingClientRect), then short crossfade
  tl.add(() => {
    if (tl.reversed()) {
      syncInsideToFront();
    } else {
      syncFrontToInside();
    }
  });

  tl.to(
    paperFront,
    {
      opacity: 1,
      duration: CROSSFADE,
      ease: "sine.out",
    },
    "crossfade"
  );

  tl.to(
    paperInside,
    {
      opacity: 0,
      duration: CROSSFADE,
      ease: "sine.out",
    },
    "crossfade"
  );

  tl.set(paperInside, { visibility: "hidden" });

  // 6 — Continue from the matched handoff pose downward to final rest
  //     (no x/y reset to center — keeps handoffX / descends from handoffY)
  tl.to(
    paperFront,
    {
      x: () => handoffX,
      y: () => paperFrontFinalY(),
      scale: PAPER_FINAL_SCALE,
      duration: GLIDE_DURATION,
      ease: "power2.out",
    },
    GLIDE_OVERLAP
  );

  // ---- Toggle ----------------------------------------------------------

  let isOpen = false;

  function toggleEnvelope() {
    if (tl.isActive()) return;

    if (isOpen) {
      isOpen = false;
      tl.reverse();
    } else {
      isOpen = true;
      tl.play();
    }
  }

  function toggleInstant() {
    if (tl.isActive()) return;
    isOpen = !isOpen;

    if (isOpen) {
      gsap.set(closeflap, { opacity: 0 });
      gsap.set(openflap, { opacity: 1, rotateX: 0 });
      gsap.set(paperInside, {
        autoAlpha: 0,
        y: PAPER_CLEAR_Y,
        scale: 1,
      });
      handoffX = PAPER_X;
      handoffY = percentToYPx(PAPER_CLEAR_Y, paperFront);
      gsap.set(paperFront, {
        autoAlpha: 1,
        x: handoffX,
        y: paperFrontFinalY(),
        scale: PAPER_FINAL_SCALE,
        visibility: "visible",
      });
      tl.progress(1).pause();
      envelope.classList.add("is-open");
      hint.classList.add("is-hidden");
    } else {
      gsap.set(closeflap, { opacity: 1 });
      gsap.set(openflap, { opacity: 0, rotateX: 92 });
      gsap.set(paperFront, {
        autoAlpha: 0,
        pointerEvents: "none",
        x: PAPER_X,
        y: PAPER_START_Y,
        scale: 1,
      });
      gsap.set(paperInside, {
        autoAlpha: 0,
        pointerEvents: "none",
        x: PAPER_X,
        y: PAPER_START_Y,
        scale: 1,
      });
      tl.progress(0).pause();
      envelope.classList.remove("is-open");
      hint.classList.remove("is-hidden");
    }
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const onActivate = prefersReducedMotion ? toggleInstant : toggleEnvelope;

  envelope.addEventListener("click", onActivate);

  envelope.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  });
})();
