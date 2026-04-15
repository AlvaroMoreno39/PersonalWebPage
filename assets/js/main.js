(function () {
  "use strict";

  const header = document.querySelector("#header");
  const headerToggleBtn = document.querySelector(".header-toggle");
  const navmenuLinks = Array.from(document.querySelectorAll("#navmenu a"));
  const sectionNodes = Array.from(document.querySelectorAll("main section[id]"));
  let navRequestToken = 0;

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  function alignToSectionHash(hash, smooth = false) {
    if (!hash || !hash.startsWith("#")) return;
    const target = document.querySelector(hash);
    if (!target) return;

    const targetTop = Math.max(target.offsetTop, 0);
    window.scrollTo({ top: targetTop, behavior: smooth ? "smooth" : "auto" });
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
    const scrollPosition = window.scrollY + 120;
    let currentSectionId = sectionNodes[0].id;

    for (const section of sectionNodes) {
      if (scrollPosition >= section.offsetTop) {
        currentSectionId = section.id;
      } else {
        break;
      }
    }

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
          const token = ++navRequestToken;
          setActiveNavLink(href);
          alignToSectionHash(href, false);
          window.requestAnimationFrame(() => {
            if (token !== navRequestToken) return;
            alignToSectionHash(href, false);
          });

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

    let resizeTimer = null;

    const applyTagLimit = () => {
      writeupCards.forEach((card) => {
        if (card.classList.contains("is-hidden") || card.offsetParent === null) return;

        const tagList = card.querySelector(".tag-list");
        if (!tagList) return;

        const existingOverflow = tagList.querySelector(".tag-overflow");
        if (existingOverflow) existingOverflow.remove();

        const tags = Array.from(tagList.querySelectorAll(".tag:not(.tag-overflow)"));
        if (!tags.length) return;

        tags.forEach((tag) => {
          tag.classList.remove("tag-hidden");
          tag.removeAttribute("aria-hidden");
        });

        const maxHeight = parseFloat(window.getComputedStyle(tagList).maxHeight || "0");
        if (!maxHeight || Number.isNaN(maxHeight)) return;

        if (tagList.scrollHeight <= maxHeight) return;

        let hiddenCount = 0;
        const moreTag = document.createElement("span");
        moreTag.className = "tag tag-overflow";
        moreTag.textContent = "+0 more";
        tagList.appendChild(moreTag);

        for (let i = tags.length - 1; i >= 0; i -= 1) {
          const tag = tags[i];
          tag.classList.add("tag-hidden");
          tag.setAttribute("aria-hidden", "true");
          hiddenCount += 1;
          moreTag.textContent = `+${hiddenCount} more`;

          if (tagList.scrollHeight <= maxHeight) {
            break;
          }
        }
      });
    };

    window.requestAnimationFrame(applyTagLimit);

    window.addEventListener("resize", () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        applyTagLimit();
      }, 120);
    });

    document.addEventListener("writeupCardsUpdated", () => {
      window.requestAnimationFrame(applyTagLimit);
    });
  }

  function initWriteupDescriptionFit() {
    const writeupCards = Array.from(document.querySelectorAll(".writeup-card"));
    if (!writeupCards.length) return;

    let resizeTimer = null;

    const fitDescriptions = () => {
      writeupCards.forEach((card) => {
        if (card.classList.contains("is-hidden") || card.offsetParent === null) return;

        const description = card.querySelector(".writeup-card p");
        const tagList = card.querySelector(".writeup-card .tag-list");
        if (!description || !tagList) return;

        if (!description.dataset.fullText) {
          description.dataset.fullText = description.textContent.trim();
        }

        const fullText = description.dataset.fullText;
        description.textContent = fullText;
        description.style.maxHeight = "";

        const descTop = description.getBoundingClientRect().top;
        const tagsTop = tagList.getBoundingClientRect().top;
        const availableHeight = Math.max(Math.floor(tagsTop - descTop - 6), 24);
        description.style.maxHeight = `${availableHeight}px`;

        if (description.scrollHeight <= description.clientHeight + 1) return;

        let low = 0;
        let high = fullText.length;
        let best = "...";

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const candidate = `${fullText.slice(0, mid).trimEnd()}...`;
          description.textContent = candidate;

          if (description.scrollHeight <= description.clientHeight + 1) {
            best = candidate;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        }

        description.textContent = best;
      });
    };

    window.requestAnimationFrame(fitDescriptions);

    window.addEventListener("resize", () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        fitDescriptions();
      }, 120);
    });

    document.addEventListener("writeupCardsUpdated", () => {
      window.requestAnimationFrame(fitDescriptions);
    });
  }

  function initWriteupFilters() {
    const writeupCards = Array.from(document.querySelectorAll(".writeup-card"));
    const teamSelect = document.querySelector("#filter-team");
    const difficultySelect = document.querySelector("#filter-difficulty");
    const osSelect = document.querySelector("#filter-os");
    const techniqueSelect = document.querySelector("#filter-technique");
    const resetButton = document.querySelector("#filter-reset");
    const emptyState = document.querySelector("#writeups-empty");
    const counterNode = document.querySelector("#writeups-counter");
    const prevButton = document.querySelector("#writeups-prev");
    const nextButton = document.querySelector("#writeups-next");
    const pageInfo = document.querySelector("#writeups-page-info");
    const PAGE_SIZE = 4;
    let currentPage = 1;
    let hasInitialized = false;

    if (!writeupCards.length || !teamSelect || !difficultySelect || !osSelect || !techniqueSelect) return;

    const normalizeList = (value) =>
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

    const applyFilters = () => {
      const team = teamSelect.value;
      const difficulty = difficultySelect.value;
      const os = osSelect.value;
      const technique = techniqueSelect.value;
      const matchedCards = [];

      writeupCards.forEach((card) => {
        const cardTeam = (card.dataset.team || "").toLowerCase();
        const cardDifficulty = (card.dataset.difficulty || "").toLowerCase();
        const cardOs = (card.dataset.os || "").toLowerCase();
        const cardTechniques = normalizeList(card.dataset.techniques || "");

        const matchesTeam = team === "all" || cardTeam === team;
        const matchesDifficulty = difficulty === "all" || cardDifficulty === difficulty;
        const matchesOs = os === "all" || cardOs === os;
        const matchesTechnique = technique === "all" || cardTechniques.includes(technique);

        const isMatch = matchesTeam && matchesDifficulty && matchesOs && matchesTechnique;
        if (isMatch) matchedCards.push(card);
      });

      const matchedSet = new Set(matchedCards);
      const matchedPositions = new Map(matchedCards.map((card, index) => [card, index]));
      const totalPages = Math.max(1, Math.ceil(matchedCards.length / PAGE_SIZE));
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      const startIndex = (currentPage - 1) * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      const visibleTarget = Math.max(0, Math.min(endIndex, matchedCards.length) - startIndex);

      writeupCards.forEach((card) => {
        const isMatch = matchedSet.has(card);
        const position = matchedPositions.get(card);
        const isWithinPage = isMatch && position >= startIndex && position < endIndex;
        if (isWithinPage) {
          card.classList.remove("is-hidden", "is-leaving", "is-entering");
          card.style.display = "block";
          card.classList.add("is-visible");
          return;
        }

        if (!card.classList.contains("is-hidden")) {
          if (!hasInitialized) {
            card.classList.remove("is-visible", "is-leaving", "is-entering");
            card.classList.add("is-hidden");
            card.style.display = "none";
            return;
          }

          card.classList.remove("is-entering", "is-visible", "is-leaving");
          card.classList.add("is-hidden");
          card.style.display = "none";
        }
      });

      if (emptyState) {
        emptyState.classList.toggle("active", matchedCards.length === 0);
      }

      if (counterNode) {
        const label = visibleTarget === 1 ? "machine" : "machines";
        counterNode.textContent = `${visibleTarget} ${label}`;
      }

      if (pageInfo) {
        pageInfo.textContent = matchedCards.length === 0
          ? "Page 0 of 0"
          : `Page ${currentPage} of ${totalPages}`;
      }

      if (prevButton) {
        prevButton.disabled = currentPage <= 1 || matchedCards.length === 0;
      }

      if (nextButton) {
        nextButton.disabled = currentPage >= totalPages || matchedCards.length === 0;
      }

      hasInitialized = true;
      document.dispatchEvent(new Event("writeupCardsUpdated"));
    };

    const resetFilters = () => {
      teamSelect.value = "all";
      difficultySelect.value = "all";
      osSelect.value = "all";
      techniqueSelect.value = "all";
      currentPage = 1;
      applyFilters();
    };

    const onFilterChange = () => {
      currentPage = 1;
      applyFilters();
    };

    teamSelect.addEventListener("change", onFilterChange);
    difficultySelect.addEventListener("change", onFilterChange);
    osSelect.addEventListener("change", onFilterChange);
    techniqueSelect.addEventListener("change", onFilterChange);

    if (resetButton) {
      resetButton.addEventListener("click", resetFilters);
    }

    if (prevButton) {
      prevButton.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage -= 1;
          applyFilters();
        }
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        currentPage += 1;
        applyFilters();
      });
    }

    applyFilters();
  }

  function initPageTransitions() {
    return;
  }

  window.addEventListener("load", () => {
    toggleScrollTop();
    initAos();
    initTyped();
    setCurrentYear();
    initWriteupTagLimit();
    initWriteupDescriptionFit();
    initWriteupFilters();
    initPageTransitions();

    if (window.location.hash) {
      const hashSection = document.querySelector(window.location.hash);
      if (hashSection) {
        const hash = window.location.hash;
        window.requestAnimationFrame(() => {
          alignToSectionHash(hash, false);
          setActiveNavLink(hash);
        });
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
      alignToSectionHash(window.location.hash, false);
      setActiveNavLink(window.location.hash);
    }
  });
})();
