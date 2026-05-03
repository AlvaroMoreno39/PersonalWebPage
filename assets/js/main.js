(function () {
  "use strict";

  const header = document.querySelector("#header");
  const headerToggleBtn = document.querySelector(".header-toggle");
  const navmenuLinks = Array.from(document.querySelectorAll("#navmenu a"));
  const sectionNodes = Array.from(document.querySelectorAll("main section[id]"));
  const isIndexPage = document.body.classList.contains("index-page");
  const reduceMotionQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  let smoothScrollFrame = 0;
  let smoothScrollToken = 0;
  let smoothScrollCancelCallback = null;

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  function stopSmoothScroll() {
    if (smoothScrollFrame) {
      window.cancelAnimationFrame(smoothScrollFrame);
      smoothScrollFrame = 0;
    }
    if (typeof smoothScrollCancelCallback === "function") {
      const cancelCb = smoothScrollCancelCallback;
      smoothScrollCancelCallback = null;
      cancelCb();
    }
    smoothScrollToken += 1;
  }

  const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

  function smoothScrollTo(targetTop, options = {}) {
    const { duration = 340, onUpdate = null, onComplete = null, onCancel = null } = options;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const maxTop = Math.max(docHeight - window.innerHeight, 0);
    const startTop = window.scrollY;
    const clampedTarget = Math.min(Math.max(targetTop, 0), maxTop);
    const distance = clampedTarget - startTop;

    if (Math.abs(distance) < 1) {
      stopSmoothScroll();
      window.scrollTo({ top: clampedTarget, left: 0, behavior: "auto" });
      if (typeof onUpdate === "function") onUpdate(clampedTarget, 1);
      if (typeof onComplete === "function") onComplete();
      return;
    }

    if (reduceMotionQuery && reduceMotionQuery.matches) {
      stopSmoothScroll();
      window.scrollTo({ top: clampedTarget, left: 0, behavior: "auto" });
      if (typeof onUpdate === "function") onUpdate(clampedTarget, 1);
      if (typeof onComplete === "function") onComplete();
      return;
    }

    stopSmoothScroll();
    const token = smoothScrollToken;
    smoothScrollCancelCallback = () => {
      if (typeof onCancel === "function") onCancel();
    };
    const startTime = performance.now();
    const requestedDuration = Number(duration);
    const baseDuration = Number.isFinite(requestedDuration) ? requestedDuration : 340;
    const distanceBoost = Math.min(Math.abs(distance) * 0.03, 90);
    const finalDuration = Math.round(
      Math.max(150, Math.min(baseDuration + distanceBoost, 360))
    );

    const step = (now) => {
      if (token !== smoothScrollToken) return;
      const progress = Math.min((now - startTime) / finalDuration, 1);
      const eased = easeOutCubic(progress);
      const nextTop = startTop + distance * eased;
      window.scrollTo({ top: nextTop, left: 0, behavior: "auto" });
      if (typeof onUpdate === "function") onUpdate(nextTop, progress);

      if (progress < 1) {
        smoothScrollFrame = window.requestAnimationFrame(step);
      } else {
        smoothScrollFrame = 0;
        smoothScrollCancelCallback = null;
        window.scrollTo({ top: clampedTarget, left: 0, behavior: "auto" });
        if (typeof onUpdate === "function") onUpdate(clampedTarget, 1);
        if (typeof onComplete === "function") onComplete();
      }
    };

    smoothScrollFrame = window.requestAnimationFrame(step);
  }

  function alignToSectionHash(hash, smooth = false) {
    if (!hash || !hash.startsWith("#")) return;
    const target = document.querySelector(hash);
    if (!target) return;

    const targetTop = Math.max(target.offsetTop, 0);
    if (smooth) {
      smoothScrollTo(targetTop, {
        duration: 320,
        onComplete: () => {
          if (isIndexPage) setActiveNavLink(hash);
        },
      });
      return;
    }

    stopSmoothScroll();
    window.scrollTo({ top: targetTop, left: 0, behavior: "auto" });
  }

  const interruptSmoothScroll = () => {
    stopSmoothScroll();
  };

  window.addEventListener("wheel", interruptSmoothScroll, { passive: true });
  window.addEventListener("touchstart", interruptSmoothScroll, { passive: true });

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
    const pageBottom = window.scrollY + window.innerHeight;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );

    // Keep last section active when user is at the bottom of the page.
    if (pageBottom >= docHeight - 4) {
      const lastSectionId = sectionNodes[sectionNodes.length - 1].id;
      setActiveNavLink(`#${lastSectionId}`);
      return;
    }

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
          setActiveNavLink(href);
          smoothScrollTo(Math.max(section.offsetTop, 0), {
            duration: 340,
            onComplete: () => {
              setActiveNavLink(href);
            },
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
      smoothScrollTo(0, {
        duration: 280,
      });
    });
  }

  function initAos() {
    const revealAosNodes = () => {
      document.querySelectorAll("[data-aos]").forEach((node) => {
        node.classList.add("aos-animate");
      });
    };

    if (typeof AOS === "undefined") {
      revealAosNodes();
      return;
    }

    AOS.init({
      duration: 650,
      easing: "ease-out-cubic",
      once: true,
      mirror: false,
    });

    // Fallback: if AOS fails to animate some nodes, keep content visible.
    window.setTimeout(() => {
      document.querySelectorAll("[data-aos]").forEach((node) => {
        const styles = window.getComputedStyle(node);
        if (!node.classList.contains("aos-animate") && styles.opacity === "0") {
          node.classList.add("aos-animate");
        }
      });
    }, 900);
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
    const getTagPriority = (label) => {
      const text = (label || "").trim().toLowerCase();
      if (text === "red team" || text === "blue team") return 0;
      if (text === "easy" || text === "medium" || text === "hard") return 1;
      if (text === "linux" || text === "windows") return 2;
      return 3;
    };

    const applyTagLimit = () => {
      writeupCards.forEach((card) => {
        if (card.classList.contains("is-hidden") || card.offsetParent === null) return;

        const tagList = card.querySelector(".tag-list");
        if (!tagList) return;

        const existingOverflow = tagList.querySelector(".tag-overflow");
        if (existingOverflow) existingOverflow.remove();

        const tags = Array.from(tagList.querySelectorAll(".tag:not(.tag-overflow)"));
        if (!tags.length) return;

        tags
          .map((tag, index) => ({
            tag,
            index,
            priority: getTagPriority(tag.textContent),
          }))
          .sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return a.index - b.index;
          })
          .forEach((item) => {
            tagList.appendChild(item.tag);
          });

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
        const availableHeight = Math.max(Math.floor(tagsTop - descTop), 24);
        description.style.maxHeight = `${availableHeight}px`;

        if (description.scrollHeight <= description.clientHeight + 2) return;

        let low = 0;
        let high = fullText.length;
        let best = "…";

        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          const candidate = `${fullText.slice(0, mid)}…`;
          description.textContent = candidate;

          if (description.scrollHeight <= description.clientHeight + 2) {
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
    const searchInput = document.querySelector("#filter-search");
    const resetButton = document.querySelector("#filter-reset");
    const activeFiltersNode = document.querySelector("#writeups-active-filters");
    const emptyState = document.querySelector("#writeups-empty");
    const counterNode = document.querySelector("#writeups-counter");
    const writeupsGrid = document.querySelector(".writeups-grid");
    const prevButton = document.querySelector("#writeups-prev");
    const nextButton = document.querySelector("#writeups-next");
    const pageInfo = document.querySelector("#writeups-page-info");
    const PAGE_SIZE = 4;
    const selectedTechniques = new Set();
    const cardShowTimers = new WeakMap();
    let currentPage = 1;
    let hasInitialized = false;

    if (!writeupCards.length || !teamSelect || !difficultySelect || !osSelect || !techniqueSelect || !searchInput) return;

    const normalizeList = (value) =>
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

    const getOptionLabel = (selectNode, value) => {
      const option = Array.from(selectNode.options || []).find((item) => item.value === value);
      return option ? option.textContent.trim() : value;
    };

    const renderActiveFilterChips = () => {
      if (!activeFiltersNode) return;

      const chips = [];

      if (teamSelect.value !== "all") {
        chips.push({ type: "team", value: teamSelect.value, label: getOptionLabel(teamSelect, teamSelect.value) });
      }
      if (difficultySelect.value !== "all") {
        chips.push({
          type: "difficulty",
          value: difficultySelect.value,
          label: getOptionLabel(difficultySelect, difficultySelect.value),
        });
      }
      if (osSelect.value !== "all") {
        chips.push({ type: "os", value: osSelect.value, label: getOptionLabel(osSelect, osSelect.value) });
      }

      Array.from(selectedTechniques).forEach((technique) => {
        chips.push({
          type: "technique",
          value: technique,
          label: getOptionLabel(techniqueSelect, technique),
        });
      });

      activeFiltersNode.innerHTML = chips
        .map(
          (chip) =>
            `<span class="active-filter-chip" data-filter-type="${chip.type}" data-filter-value="${chip.value}">
              ${chip.label}
              <button class="active-filter-chip-remove" type="button" aria-label="Remove ${chip.label}">&times;</button>
            </span>`
        )
        .join("");
    };

    const getScrollY = () => window.scrollY || window.pageYOffset || 0;

    const restoreScrollY = (preserveScrollY) => {
      if (!Number.isFinite(preserveScrollY)) return;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const docHeight = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );
          const maxTop = Math.max(docHeight - window.innerHeight, 0);
          const clampedTop = Math.min(Math.max(preserveScrollY, 0), maxTop);
          window.scrollTo({ top: clampedTop, left: 0, behavior: "auto" });
        });
      });
    };

    const applyFilters = (options = {}) => {
      const preserveScrollY = Number.isFinite(options.preserveScrollY)
        ? options.preserveScrollY
        : null;
      const team = teamSelect.value;
      const difficulty = difficultySelect.value;
      const os = osSelect.value;
      const searchTerm = searchInput.value.trim().toLowerCase();
      const matchedCards = [];

      writeupCards.forEach((card) => {
        const cardTeam = (card.dataset.team || "").toLowerCase();
        const cardDifficulty = (card.dataset.difficulty || "").toLowerCase();
        const cardOs = (card.dataset.os || "").toLowerCase();
        const cardTechniques = normalizeList(card.dataset.techniques || "");
        const cardText = (card.textContent || "").toLowerCase();

        const matchesTeam = team === "all" || cardTeam === team;
        const matchesDifficulty = difficulty === "all" || cardDifficulty === difficulty;
        const matchesOs = os === "all" || cardOs === os;
        const matchesTechnique =
          selectedTechniques.size === 0 ||
          Array.from(selectedTechniques).every((technique) => cardTechniques.includes(technique));
        const matchesSearch = !searchTerm || cardText.includes(searchTerm);

        const isMatch = matchesTeam && matchesDifficulty && matchesOs && matchesTechnique && matchesSearch;
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
        const showTimer = cardShowTimers.get(card);
        if (showTimer) {
          window.clearTimeout(showTimer);
          cardShowTimers.delete(card);
        }

        const isMatch = matchedSet.has(card);
        const position = matchedPositions.get(card);
        const isWithinPage = isMatch && position >= startIndex && position < endIndex;

        if (isWithinPage) {
          if (!hasInitialized) {
            card.classList.remove("is-hidden", "is-leaving", "is-entering");
            card.style.display = "block";
            card.classList.add("is-visible");
            return;
          }

          if (card.classList.contains("is-visible") && card.style.display !== "none") return;

          card.style.display = "block";
          card.classList.remove("is-hidden", "is-leaving", "is-visible", "is-filter-refresh");
          card.classList.add("is-entering");

          const timer = window.setTimeout(() => {
            card.classList.remove("is-entering");
            card.classList.add("is-visible");
            cardShowTimers.delete(card);
          }, 320);
          cardShowTimers.set(card, timer);
          return;
        }

        if (!hasInitialized) {
          card.classList.remove("is-visible", "is-leaving", "is-entering", "is-filter-refresh");
          card.classList.add("is-hidden");
          card.style.display = "none";
          return;
        }

        card.classList.remove("is-visible", "is-entering", "is-leaving", "is-filter-refresh");
        card.classList.add("is-hidden");
        card.style.display = "none";
      });

      if (emptyState) {
        emptyState.classList.toggle("active", matchedCards.length === 0);
      }

      if (writeupsGrid) {
        writeupsGrid.classList.toggle("has-empty-state", matchedCards.length === 0);
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

      renderActiveFilterChips();
      hasInitialized = true;
      document.dispatchEvent(new Event("writeupCardsUpdated"));
      restoreScrollY(preserveScrollY);
    };

    const resetFilters = () => {
      const preserveScrollY = getScrollY();
      teamSelect.value = "all";
      difficultySelect.value = "all";
      osSelect.value = "all";
      techniqueSelect.value = "all";
      searchInput.value = "";
      selectedTechniques.clear();
      currentPage = 1;
      applyFilters({ preserveScrollY });
    };

    const onFilterChange = () => {
      const preserveScrollY = getScrollY();
      currentPage = 1;
      applyFilters({ preserveScrollY });
    };

    teamSelect.addEventListener("change", onFilterChange);
    difficultySelect.addEventListener("change", onFilterChange);
    osSelect.addEventListener("change", onFilterChange);
    techniqueSelect.addEventListener("change", () => {
      const value = (techniqueSelect.value || "").toLowerCase();
      if (value && value !== "all") {
        selectedTechniques.add(value);
      }
      techniqueSelect.value = "all";
      onFilterChange();
    });
    searchInput.addEventListener("input", onFilterChange);

    if (activeFiltersNode) {
      activeFiltersNode.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.classList.contains("active-filter-chip-remove")) return;

        const chip = target.closest(".active-filter-chip");
        if (!chip) return;

        const filterType = chip.getAttribute("data-filter-type");
        const filterValue = chip.getAttribute("data-filter-value");

        if (filterType === "team") teamSelect.value = "all";
        if (filterType === "difficulty") difficultySelect.value = "all";
        if (filterType === "os") osSelect.value = "all";
        if (filterType === "technique" && filterValue) selectedTechniques.delete(filterValue);
        onFilterChange();
      });
    }

    if (resetButton) {
      resetButton.addEventListener("click", resetFilters);
    }

    if (prevButton) {
      prevButton.addEventListener("click", (event) => {
        event.preventDefault();
        const preserveScrollY = getScrollY();
        if (event.currentTarget instanceof HTMLElement) {
          event.currentTarget.blur();
        }
        if (currentPage > 1) {
          currentPage -= 1;
          applyFilters({ preserveScrollY });
        }
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", (event) => {
        event.preventDefault();
        const preserveScrollY = getScrollY();
        if (event.currentTarget instanceof HTMLElement) {
          event.currentTarget.blur();
        }
        currentPage += 1;
        applyFilters({ preserveScrollY });
      });
    }

    applyFilters();
  }

  function initSectionReveal() {
    if (!document.body.classList.contains("index-page")) return;

    const sections = Array.from(document.querySelectorAll("main section.section"));
    if (!sections.length) return;

    sections.forEach((section) => {
      section.classList.add("section-reveal-init");
    });

    if (typeof IntersectionObserver === "undefined") {
      sections.forEach((section) => section.classList.add("section-reveal-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("section-reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        root: null,
        threshold: 0.16,
        rootMargin: "0px 0px -6% 0px",
      }
    );

    sections.forEach((section) => observer.observe(section));
  }

  function initWriteupEnhancements() {
    const detailBox = document.querySelector(".writeup-detail .detail-box");
    if (!detailBox) return;
    if (window.__writeupEnhancementsInitialized) return;
    window.__writeupEnhancementsInitialized = true;

    // Defensive cleanup in case this initializer runs more than once.
    document.querySelectorAll(".writeup-toc").forEach((node) => node.remove());
    detailBox.querySelectorAll(".writeup-bottom-spacer").forEach((node) => node.remove());

    const slugify = (value) =>
      (value || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

    // Build table of contents from writeup section titles.
    const headings = Array.from(detailBox.querySelectorAll("h2"));
    if (headings.length) {
      const toc = document.createElement("nav");
      toc.className = "writeup-toc";
      toc.setAttribute("aria-label", "Writeup index");

      const tocTitle = document.createElement("h3");
      tocTitle.textContent = "Index";
      toc.appendChild(tocTitle);

      const tocList = document.createElement("ul");

      headings.forEach((heading, index) => {
        if (!heading.id) {
          const base = slugify(heading.textContent) || `section-${index + 1}`;
          let candidate = `toc-${base}`;
          let suffix = 1;
          while (document.getElementById(candidate)) {
            candidate = `toc-${base}-${suffix}`;
            suffix += 1;
          }
          heading.id = candidate;
        }

        const li = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${heading.id}`;
        link.textContent = heading.textContent.trim();
        li.appendChild(link);
        tocList.appendChild(li);
      });

      toc.appendChild(tocList);
      document.body.appendChild(toc);

      const tocLinks = Array.from(toc.querySelectorAll("a"));
      let tocScrollTicking = false;
      let tocIsNavigating = false;
      let tocTargetId = "";
      let tocLockedId = "";
      let activeTocId = "";
      const topOffset = 96;
      const alignOffset = topOffset - 8;
      let headingPositions = [];

      const getHeadingTop = (heading) =>
        Math.max(heading.getBoundingClientRect().top + window.scrollY, 0);

      const refreshHeadingPositions = () => {
        headingPositions = headings.map((heading) => getHeadingTop(heading));
      };

      const setBottomSpacerHeight = () => {
        refreshHeadingPositions();
      };

      const setActiveTocById = (id) => {
        if (!id) return;
        const changed = activeTocId !== id;
        activeTocId = id;
        let activeLink = null;

        tocLinks.forEach((link) => {
          const hash = (link.getAttribute("href") || "").replace("#", "");
          const isActive = hash === id;
          link.classList.toggle("active", isActive);
          if (isActive) activeLink = link;
        });

        if (changed && activeLink) {
          activeLink.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      };

      const lockTocLinkHeights = () => {
        tocLinks.forEach((link) => {
          link.style.minHeight = "";
          link.style.height = "";
        });

        tocLinks.forEach((link) => {
          const height = Math.ceil(link.getBoundingClientRect().height);
          if (height > 0) {
            link.style.minHeight = `${height}px`;
            link.style.height = `${height}px`;
          }
        });
      };

      const clearTocLock = () => {
        if (tocIsNavigating || !tocLockedId) return;
        tocLockedId = "";
      };

      const syncActiveToc = () => {
        if (tocIsNavigating && tocTargetId) {
          setActiveTocById(tocTargetId);
          return;
        }
        if (!headingPositions.length) refreshHeadingPositions();

        if (tocLockedId) {
          const lockedHeading = document.getElementById(tocLockedId);
          if (lockedHeading) {
            const rect = lockedHeading.getBoundingClientRect();
            const isStillInView = rect.bottom > topOffset && rect.top < window.innerHeight - 40;
            if (isStillInView) {
              setActiveTocById(tocLockedId);
              return;
            }
          }
          tocLockedId = "";
        }

        const scrollY = window.scrollY;
        const docHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
        const maxScroll = Math.max(docHeight - window.innerHeight, 0);
        const finalHeadingRect = headings[headings.length - 1].getBoundingClientRect();
        const finalHeadingVisible =
          finalHeadingRect.top < window.innerHeight - 80 && finalHeadingRect.bottom > topOffset;

        if (maxScroll - scrollY <= 8 || finalHeadingVisible) {
          setActiveTocById(headings[headings.length - 1].id);
          return;
        }

        const activationLine = topOffset + 36;
        const activationMarker = scrollY + activationLine;
        let activeIndex = 0;

        for (let i = headingPositions.length - 1; i >= 0; i -= 1) {
          if (activationMarker >= headingPositions[i] - 1) {
            activeIndex = i;
            break;
          }
        }

        if (activeIndex === 0 && headings[0].getBoundingClientRect().top > activationLine) {
          const firstVisible = headings.findIndex((heading) => {
            const rect = heading.getBoundingClientRect();
            return rect.bottom > topOffset && rect.top < window.innerHeight;
          });
          if (firstVisible >= 0) {
            activeIndex = firstVisible;
          }
        }

        const nearWriteupEnd = maxScroll - scrollY <= window.innerHeight * 0.45;

        // Only near the end, short final sections can be visible without crossing
        // the normal activation line. Elsewhere, keep the classic scroll-spy feel.
        if (nearWriteupEnd) {
          for (let i = headings.length - 1; i >= 0; i -= 1) {
            const rect = headings[i].getBoundingClientRect();
            if (rect.top < window.innerHeight - 96 && rect.bottom > topOffset) {
              activeIndex = Math.max(activeIndex, i);
              break;
            }
          }
        }

        setActiveTocById(headings[Math.min(activeIndex, headings.length - 1)].id);
      };

      tocLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          const hash = (link.getAttribute("href") || "").replace("#", "");
          const target = hash ? document.getElementById(hash) : null;
          if (!target) return;

          refreshHeadingPositions();
          const targetTop = Math.max(getHeadingTop(target) - alignOffset, 0);
          tocIsNavigating = true;
          tocTargetId = hash;
          tocLockedId = hash;
          setActiveTocById(hash);
          smoothScrollTo(targetTop, {
            duration: 300,
            onUpdate: () => {
              setActiveTocById(hash);
            },
            onComplete: () => {
              tocIsNavigating = false;
              tocTargetId = "";
              refreshHeadingPositions();
              syncActiveToc();
            },
            onCancel: () => {
              tocIsNavigating = false;
              tocTargetId = "";
              syncActiveToc();
            },
          });

          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, "", `#${hash}`);
          }
        });
      });

      lockTocLinkHeights();
      setBottomSpacerHeight();
      syncActiveToc();

      window.addEventListener(
        "resize",
        () => {
          lockTocLinkHeights();
          setBottomSpacerHeight();
          syncActiveToc();
        },
        { passive: true }
      );

      window.setTimeout(() => {
        lockTocLinkHeights();
        setBottomSpacerHeight();
        syncActiveToc();
      }, 180);

      const detailImages = Array.from(detailBox.querySelectorAll("img"));
      detailImages.forEach((img) => {
        if (img.complete) return;
        img.addEventListener(
          "load",
          () => {
            setBottomSpacerHeight();
            syncActiveToc();
          },
          { once: true }
        );
        img.addEventListener(
          "error",
          () => {
            setBottomSpacerHeight();
            syncActiveToc();
          },
          { once: true }
        );
      });

      window.addEventListener("scroll", () => {
        if (tocScrollTicking) return;
        tocScrollTicking = true;
        window.requestAnimationFrame(() => {
          syncActiveToc();
          tocScrollTicking = false;
        });
      }, { passive: true });

      window.addEventListener("wheel", clearTocLock, { passive: true });
      window.addEventListener("touchstart", clearTocLock, { passive: true });
      window.addEventListener("keydown", clearTocLock);
    }

    // Add copy button to each code block.
    const codeBlocks = Array.from(detailBox.querySelectorAll("pre"));
    codeBlocks.forEach((pre) => {
      const code = pre.querySelector("code");
      if (!code) return;

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-code-btn";
      copyBtn.textContent = "Copy";
      copyBtn.setAttribute("aria-label", "Copy command");

      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(code.innerText);
          const previous = copyBtn.textContent;
          copyBtn.textContent = "Copied";
          window.setTimeout(() => {
            copyBtn.textContent = previous;
          }, 1200);
        } catch (_) {
          copyBtn.textContent = "Failed";
          window.setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 1200);
        }
      });

      pre.appendChild(copyBtn);
    });
  }

  function initPageTransitions() {
    return;
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSectionReveal();
  });

  window.addEventListener("load", () => {
    toggleScrollTop();
    initAos();
    initTyped();
    setCurrentYear();
    initWriteupTagLimit();
    initWriteupDescriptionFit();
    initWriteupFilters();
    initWriteupEnhancements();
    initPageTransitions();

    if (isIndexPage) {
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
    }
  });

  document.addEventListener("scroll", onScroll, { passive: true });

  window.addEventListener("hashchange", () => {
    if (!isIndexPage) return;
    if (window.location.hash) {
      alignToSectionHash(window.location.hash, false);
      setActiveNavLink(window.location.hash);
    }
  });
})();
