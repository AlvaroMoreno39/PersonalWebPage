(function () {
  "use strict";

  const header = document.querySelector("#header");
  const headerToggleBtn = document.querySelector(".header-toggle");
  const navmenuLinks = Array.from(document.querySelectorAll("#navmenu a"));
  const sectionNodes = Array.from(document.querySelectorAll("main section[id]"));
  let navScrollLockUntil = 0;

  function alignToSectionHash(hash) {
    if (!hash || !hash.startsWith("#")) return;
    const target = document.querySelector(hash);
    if (!target) return;

    const targetTop = target.getBoundingClientRect().top + window.pageYOffset - 10;
    window.scrollTo({ top: targetTop, behavior: "auto" });
  }

  function headerToggle() {
    if (!header || !headerToggleBtn) return;
    header.classList.toggle("header-show");
    headerToggleBtn.classList.toggle("bi-list");
    headerToggleBtn.classList.toggle("bi-x");
  }

  function closeMobileMenu() {
    if (header && header.classList.contains("header-show")) {
      headerToggle();
    }
  }

  function setActiveNavLink(hash) {
    if (!hash || !hash.startsWith("#")) return;

    navmenuLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      link.classList.toggle("active", href === hash);
    });
  }

  function updateActiveNavOnScroll() {
    if (!sectionNodes.length) return;
    if (Date.now() < navScrollLockUntil) return;

    const scrollPosition = window.scrollY + 140;
    let currentSectionId = sectionNodes[0].id;

    sectionNodes.forEach((section) => {
      if (scrollPosition >= section.offsetTop) {
        currentSectionId = section.id;
      }
    });

    setActiveNavLink(`#${currentSectionId}`);
  }

  let scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(() => {
      toggleScrollTop();
      updateActiveNavOnScroll();
      scrollTicking = false;
    });
  }

  if (headerToggleBtn) {
    headerToggleBtn.addEventListener("click", headerToggle);
  }

  navmenuLinks.forEach((navmenuLink) => {
    navmenuLink.addEventListener("click", (event) => {
      const href = navmenuLink.getAttribute("href") || "";

      if (href.startsWith("#")) {
        const section = document.querySelector(href);
        if (section) {
          event.preventDefault();
          setActiveNavLink(href);
          section.scrollIntoView({ behavior: "smooth", block: "start" });

          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", href);
          }
        }
      }

      closeMobileMenu();
    });
  });

  const scrollTop = document.querySelector(".scroll-top");

  function toggleScrollTop() {
    if (!scrollTop) return;
    if (window.scrollY > 100) {
      scrollTop.classList.add("active");
    } else {
      scrollTop.classList.remove("active");
    }
  }

  if (scrollTop) {
    scrollTop.addEventListener("click", (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function initAos() {
    if (typeof AOS === "undefined") return;
    AOS.init({
      duration: 650,
      easing: "ease-out-cubic",
      once: true,
      mirror: false,
    });
  }

  function initTyped() {
    const selectTyped = document.querySelector(".typed");
    if (!selectTyped || typeof Typed === "undefined") return;

    let typedStrings = selectTyped.getAttribute("data-typed-items") || "";
    typedStrings = typedStrings.split(",").map((item) => item.trim()).filter(Boolean);
    if (!typedStrings.length) return;

    new Typed(".typed", {
      strings: typedStrings,
      loop: true,
      typeSpeed: 70,
      backSpeed: 35,
      backDelay: 1600,
    });
  }

  function setCurrentYear() {
    const yearNode = document.querySelector("#year");
    if (yearNode) {
      yearNode.textContent = String(new Date().getFullYear());
    }
  }

  function initWriteupTagLimit() {
    const writeupCards = Array.from(document.querySelectorAll(".writeup-card"));
    if (!writeupCards.length) return;

    const MAX_TAGS_PER_CARD = 5;

    writeupCards.forEach((card) => {
      const tagList = card.querySelector(".tag-list");
      if (!tagList || tagList.dataset.processed === "true") return;

      const tags = Array.from(tagList.querySelectorAll(".tag"));
      if (tags.length <= MAX_TAGS_PER_CARD) {
        tagList.dataset.processed = "true";
        return;
      }

      tags.forEach((tag, index) => {
        if (index >= MAX_TAGS_PER_CARD) {
          tag.classList.add("tag-hidden");
          tag.setAttribute("aria-hidden", "true");
        }
      });

      const hiddenCount = tags.length - MAX_TAGS_PER_CARD;
      const moreTag = document.createElement("span");
      moreTag.className = "tag tag-overflow";
      moreTag.textContent = `+${hiddenCount} more`;
      tagList.appendChild(moreTag);
      tagList.dataset.processed = "true";
    });
  }

  function initWriteupFilters() {
    const writeupCards = Array.from(document.querySelectorAll(".writeup-card"));
    const difficultySelect = document.querySelector("#filter-difficulty");
    const osSelect = document.querySelector("#filter-os");
    const techniqueSelect = document.querySelector("#filter-technique");
    const resetButton = document.querySelector("#filter-reset");
    const emptyState = document.querySelector("#writeups-empty");
    const hideTimers = new WeakMap();
    const enterTimers = new WeakMap();

    if (!writeupCards.length || !difficultySelect || !osSelect || !techniqueSelect) return;

    const normalizeList = (value) =>
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

    const applyFilters = () => {
      const difficulty = difficultySelect.value;
      const os = osSelect.value;
      const technique = techniqueSelect.value;
      let visibleCount = 0;

      writeupCards.forEach((card) => {
        const cardDifficulty = (card.dataset.difficulty || "").toLowerCase();
        const cardOs = (card.dataset.os || "").toLowerCase();
        const cardTechniques = normalizeList(card.dataset.techniques || "");

        const matchesDifficulty = difficulty === "all" || cardDifficulty === difficulty;
        const matchesOs = os === "all" || cardOs === os;
        const matchesTechnique = technique === "all" || cardTechniques.includes(technique);

        const isMatch = matchesDifficulty && matchesOs && matchesTechnique;
        const existingTimer = hideTimers.get(card);

        if (isMatch) {
          if (existingTimer) {
            window.clearTimeout(existingTimer);
            hideTimers.delete(card);
          }

          const existingEnterTimer = enterTimers.get(card);
          if (existingEnterTimer) {
            window.clearTimeout(existingEnterTimer);
            enterTimers.delete(card);
          }

          visibleCount += 1;

          const wasHidden =
            card.classList.contains("is-hidden") || card.classList.contains("is-leaving");

          card.classList.remove("is-hidden", "is-leaving");
          card.style.display = "block";

          if (wasHidden) {
            card.classList.remove("is-visible", "is-entering");
            void card.offsetWidth;
            card.classList.add("is-visible", "is-entering");
            const enterTimer = window.setTimeout(() => {
              card.classList.remove("is-entering");
              enterTimers.delete(card);
            }, 320);
            enterTimers.set(card, enterTimer);
          } else {
            card.classList.add("is-visible");
          }

          return;
        }

        if (!card.classList.contains("is-hidden")) {
          if (existingTimer) {
            window.clearTimeout(existingTimer);
          }
          const existingEnterTimer = enterTimers.get(card);
          if (existingEnterTimer) {
            window.clearTimeout(existingEnterTimer);
            enterTimers.delete(card);
          }
          card.classList.remove("is-entering");
          card.classList.add("is-leaving");
          const timer = window.setTimeout(() => {
            card.classList.remove("is-visible", "is-leaving");
            card.classList.add("is-hidden");
            card.style.display = "none";
          }, 180);
          hideTimers.set(card, timer);
        }
      });

      if (emptyState) {
        emptyState.classList.toggle("active", visibleCount === 0);
      }
    };

    const resetFilters = () => {
      difficultySelect.value = "all";
      osSelect.value = "all";
      techniqueSelect.value = "all";
      applyFilters();
    };

    difficultySelect.addEventListener("change", applyFilters);
    osSelect.addEventListener("change", applyFilters);
    techniqueSelect.addEventListener("change", applyFilters);

    if (resetButton) {
      resetButton.addEventListener("click", resetFilters);
    }

    applyFilters();
  }

  function initPageTransitions() {
    document.body.classList.add("page-transition-in");

    const transitionLinks = Array.from(
      document.querySelectorAll(".writeup-card, .back-link")
    );
    if (!transitionLinks.length) return;

    transitionLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#")) return;
        if (link.getAttribute("target") === "_blank") return;

        event.preventDefault();
        document.body.classList.add("page-transition-out");
        window.setTimeout(() => {
          window.location.href = href;
        }, 180);
      });
    });
  }

  window.addEventListener("load", () => {
    toggleScrollTop();
    initAos();
    initTyped();
    setCurrentYear();
    initWriteupTagLimit();
    initWriteupFilters();
    initPageTransitions();

    if (window.location.hash) {
      const hashSection = document.querySelector(window.location.hash);
      if (hashSection) {
        navScrollLockUntil = Date.now() + 1800;
        window.setTimeout(() => {
          alignToSectionHash(window.location.hash);
          setActiveNavLink(window.location.hash);
          navScrollLockUntil = Date.now() + 1800;
        }, 40);

        window.setTimeout(() => {
          alignToSectionHash(window.location.hash);
        }, 420);
      } else {
        setActiveNavLink(window.location.hash);
      }
    } else {
      updateActiveNavOnScroll();
    }
  });

  document.addEventListener("scroll", onScroll, { passive: true });

  window.addEventListener("hashchange", () => {
    if (window.location.hash) {
      navScrollLockUntil = Date.now() + 1400;
      alignToSectionHash(window.location.hash);
      setActiveNavLink(window.location.hash);
    }
  });
})();
