(function () {
  const vaultPrompts = Array.isArray(window.prompts)
    ? window.prompts.slice().sort(sortPromptsNewestFirst)
    : [];
  const toastElement = document.getElementById("toast");
  const analytics = window.promptVaultAnalytics || {
    track(eventName, payload) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: eventName,
        payload: payload || {},
        timestamp: new Date().toISOString()
      });
    }
  };

  function init() {
    const page = document.body.dataset.page;
    updateYear();
    bindGlobalCtas();

    if (page === "home") {
      initHomePage();
    }

    if (page === "detail") {
      initDetailPage();
    }

    if (page === "downloader") {
      initDownloaderPage();
    }

    initMotion();
  }

  function sortPromptsNewestFirst(left, right) {
    return getPromptTimestamp(right) - getPromptTimestamp(left) ||
      Number(right.id || 0) - Number(left.id || 0);
  }

  function getPromptTimestamp(prompt) {
    const timestamp = Date.parse(prompt.updatedAt || prompt.createdAt || "");
    return Number.isFinite(timestamp) ? timestamp : Number(prompt.id) || 0;
  }

  function updateYear() {
    document.querySelectorAll("#currentYear").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }

  function bindGlobalCtas() {
    document.querySelectorAll("[data-cta]").forEach((link) => {
      attachPlaceholderCta(link, { location: link.dataset.cta });
    });
  }

  function initHomePage() {
    const promptGrid = document.getElementById("promptGrid");
    const filterGroup = document.getElementById("filterGroup");
    const searchInput = document.getElementById("promptSearch");
    const resultsLabel = document.getElementById("resultsLabel");
    const promptCount = document.getElementById("promptCount");

    if (!promptGrid || !filterGroup || !searchInput || !resultsLabel) {
      return;
    }

    const categories = ["All"].concat(
      [...new Set(vaultPrompts.map((prompt) => prompt.category))].sort()
    );
    const state = {
      query: "",
      activeFilter: "All"
    };

    promptCount.textContent = String(vaultPrompts.length);

    categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-chip";
      button.textContent = category;
      button.setAttribute("aria-pressed", category === state.activeFilter ? "true" : "false");

      if (category === state.activeFilter) {
        button.classList.add("is-active");
      }

      button.addEventListener("click", () => {
        state.activeFilter = category;
        filterGroup.querySelectorAll(".filter-chip").forEach((chip) => {
          const isSelected = chip.textContent === category;
          chip.classList.toggle("is-active", isSelected);
          chip.setAttribute("aria-pressed", String(isSelected));
        });
        renderLibrary();
      });

      filterGroup.appendChild(button);
    });

    searchInput.addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderLibrary();
    });

    renderLibrary();

    function renderLibrary() {
      const filtered = vaultPrompts.filter((prompt) => matchesPrompt(prompt, state));
      resultsLabel.textContent =
        filtered.length > 0
          ? `${filtered.length} prompt${filtered.length === 1 ? "" : "s"} ready to explore`
          : "No prompts match this search yet";

      promptGrid.innerHTML = "";

      if (filtered.length === 0) {
        promptGrid.appendChild(
          createEmptyState(
            "No prompt matched that search",
            "Try a tool name like CapCut or Midjourney, or switch back to All categories."
          )
        );
        return;
      }

      filtered.forEach((prompt) => {
        promptGrid.appendChild(createPromptCard(prompt));
      });

      refreshMotion(promptGrid);
    }
  }

  function initDetailPage() {
    const detailTarget = document.getElementById("promptDetail");
    const relatedTarget = document.getElementById("relatedPrompts");
    const relatedSection = document.getElementById("relatedSection");

    if (!detailTarget || !relatedTarget || !relatedSection) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const promptId = params.get("id");
    const currentPrompt = vaultPrompts.find((item) => String(item.id) === String(promptId));

    if (!currentPrompt) {
      detailTarget.appendChild(
        createEmptyState(
          "Prompt not found",
          "The prompt you tried to open does not exist or the link is incomplete."
        )
      );
      relatedSection.hidden = true;
      return;
    }

    document.title = `${currentPrompt.title} | AI Prompt Vault`;
    detailTarget.appendChild(createDetailLayout(currentPrompt));
    analytics.track("prompt_viewed", { id: currentPrompt.id, title: currentPrompt.title });

    const related = getRelatedPrompts(currentPrompt);
    relatedTarget.innerHTML = "";

    if (related.length === 0) {
      relatedSection.hidden = true;
      return;
    }

    related.forEach((prompt) => {
      relatedTarget.appendChild(createPromptCard(prompt, true));
    });

    refreshMotion(detailTarget);
    refreshMotion(relatedTarget);
  }

  function initDownloaderPage() {
    const demoLinks = {
      instagram: "https://www.instagram.com/reel/DBElt2UIuUG/?utm_source=ig_web_copy_link",
      youtube: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    };
    const platformCopy = {
      instagram: {
        title: "Instagram Reel & YouTube Downloader",
        subtitle:
          "Paste a public Instagram reel, YouTube video, or YouTube Shorts link and get a real preview plus downloadable file with a phone-first flow.",
        label: "Instagram reel or YouTube link",
        placeholder: "Paste Instagram reel or YouTube link",
        hint:
          "Supports public Instagram reel links, YouTube watch links, and YouTube Shorts links.",
        demoLabel: "Try Demo Reel"
      },
      youtube: {
        title: "YouTube Video & Shorts Downloader",
        subtitle:
          "Paste a public YouTube watch or Shorts link to preview the video inline and download it with fewer taps.",
        label: "YouTube video or Shorts link",
        placeholder: "Paste YouTube video or Shorts link",
        hint: "Supports public YouTube watch links, Shorts links, and youtu.be share URLs.",
        demoLabel: "Try Demo Video"
      }
    };
    const form = document.getElementById("downloadForm");
    const input = document.getElementById("reelUrl");
    const button = document.getElementById("downloadButton");
    const downloadTitle = document.getElementById("downloadTitle");
    const downloadSubtitle = document.getElementById("downloadSubtitle");
    const downloadLabel = document.getElementById("downloadLabel");
    const platformTabs = Array.from(document.querySelectorAll("[data-platform-tab]"));
    const pasteButton = document.getElementById("pasteFromClipboard");
    const demoButton = document.getElementById("tryDemoButton");
    const downloadAgainButton = document.getElementById("downloadAgainButton");
    const error = document.getElementById("downloadError");
    const loading = document.getElementById("downloadLoading");
    const status = document.getElementById("downloadStatus");
    const result = document.getElementById("downloadResult");
    const placeholder = document.getElementById("resultPlaceholder");
    const preview = document.getElementById("resultPreview");
    const previewVideo = document.getElementById("resultVideo");
    const thumbnailWrap = document.getElementById("resultThumbnailWrap");
    const thumbnail = document.getElementById("resultThumbnail");
    const content = document.getElementById("resultContent");
    const title = document.getElementById("resultTitle");
    const source = document.getElementById("resultSource");
    const meta = document.getElementById("resultMeta");
    const owner = document.getElementById("resultOwner");
    const canonicalLink = document.getElementById("resultCanonicalLink");
    const videoLink = document.getElementById("videoDownloadLink");
    const audioLink = document.getElementById("audioDownloadLink");

    if (
      !form ||
      !input ||
      !button ||
      !downloadTitle ||
      !downloadSubtitle ||
      !downloadLabel ||
      !platformTabs.length ||
      !pasteButton ||
      !demoButton ||
      !downloadAgainButton ||
      !error ||
      !loading ||
      !status ||
      !result ||
      !placeholder ||
      !preview ||
      !previewVideo ||
      !thumbnailWrap ||
      !thumbnail ||
      !content ||
      !title ||
      !source ||
      !meta ||
      !owner ||
      !canonicalLink ||
      !videoLink ||
      !audioLink
    ) {
      return;
    }

    const state = {
      platform: "instagram"
    };

    resetDownloaderState();
    applyPlatformCopy(state.platform);
    refreshMotion(result);

    if (window.location.protocol === "file:") {
      status.textContent =
        "This downloader will not work from a file URL. Open it through http://localhost:3000/downloader.html or your Netlify site.";
      status.hidden = false;
    }

    window.addEventListener("pageshow", (event) => {
      if (event.persisted) {
        resetDownloaderState();
        applyPlatformCopy(state.platform);
      }
    });

    input.addEventListener("input", () => {
      clearDownloaderMessages();
      input.classList.remove("is-invalid");
    });

    platformTabs.forEach((tab) => {
      tab.addEventListener("click", (event) => {
        event.preventDefault();
        const nextPlatform = tab.dataset.platformTab === "youtube" ? "youtube" : "instagram";
        state.platform = nextPlatform;
        resetDownloaderState();
        applyPlatformCopy(nextPlatform);
        input.focus();
      });
    });

    pasteButton.addEventListener("click", async () => {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
        showToast("Clipboard paste is not available here");
        return;
      }

      try {
        const text = (await navigator.clipboard.readText()).trim();
        if (text) {
          input.value = text;
          input.focus();
          clearDownloaderMessages();
          showToast("Link pasted");
        }
      } catch (error) {
        showToast("Clipboard access was blocked");
      }
    });

    demoButton.addEventListener("click", () => {
      input.value = demoLinks[state.platform];
      clearDownloaderMessages();
      input.classList.remove("is-invalid");
      input.focus();
      showToast("Demo link loaded");
    });

    downloadAgainButton.addEventListener("click", () => {
      resetDownloaderState();
      applyPlatformCopy(state.platform);
      input.focus();
      scrollResultIntoView(form);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearDownloaderMessages();

      const url = input.value.trim();
      const detectedPlatform = detectSupportedPlatform(url);

      if (!detectedPlatform) {
        input.classList.add("is-invalid");
        error.hidden = false;
        showToast("Invalid link");
        return;
      }

      if (state.platform !== detectedPlatform) {
        state.platform = detectedPlatform;
        applyPlatformCopy(detectedPlatform);
      }

      setLoadingState(true);

      try {
        const response = await fetch("/api/download", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ url })
        });

        const payload = await parseJsonSafely(response);

        if (!response.ok) {
          throw new Error(payload.error || "Could not fetch media assets.");
        }

        state.platform = payload.platform || detectedPlatform;
        applyPlatformCopy(state.platform);

        preview.hidden = !payload.previewPath;
        previewVideo.hidden = !payload.previewPath;
        previewVideo.src = payload.previewPath || "";
        previewVideo.poster = payload.thumbnailPath || "";
        previewVideo.load();

        thumbnailWrap.hidden = Boolean(payload.previewPath) || !payload.thumbnailPath;
        thumbnail.src = payload.thumbnailPath || "";

        title.textContent = payload.title || "Download assets";
        source.textContent = payload.source || "Direct resolver";
        meta.textContent =
          payload.message ||
          "Your media links are ready. Use the buttons below to preview or save the file.";
        owner.textContent = payload.owner || "Public media";
        canonicalLink.href = payload.canonicalUrl || url;
        canonicalLink.textContent = payload.canonicalUrl
          ? shortenUrlLabel(payload.canonicalUrl)
          : "Open reel";

        videoLink.href = payload.videoDownloadPath || "#";
        if (payload.videoFilename) {
          videoLink.setAttribute("download", payload.videoFilename);
        } else {
          videoLink.removeAttribute("download");
        }

        if (payload.audioDownloadPath) {
          audioLink.href = payload.audioDownloadPath;
          audioLink.setAttribute("download", payload.audioFilename || "media-audio.mp3");
          audioLink.hidden = false;
        } else {
          audioLink.hidden = true;
          audioLink.removeAttribute("href");
          audioLink.removeAttribute("download");
        }

        placeholder.hidden = true;
        content.hidden = false;

        analytics.track("reel_download_requested", {
          url,
          platform: payload.platform || detectedPlatform,
          resolvedUrl: payload.canonicalUrl || url,
          hasAudio: Boolean(payload.audioDownloadPath)
        });
        showToast("Media assets ready");
        scrollResultIntoView(result);
        refreshMotion(result);
      } catch (requestError) {
        status.textContent = requestError.message || "Something went wrong.";
        status.hidden = false;
      } finally {
        setLoadingState(false);
      }
    });

    function clearDownloaderMessages() {
      error.hidden = true;
      status.hidden = true;
      status.textContent = "";
    }

    function applyPlatformCopy(platform) {
      const copy = platformCopy[platform] || platformCopy.instagram;

      downloadTitle.textContent = copy.title;
      downloadSubtitle.textContent = copy.subtitle;
      downloadLabel.textContent = copy.label;
      input.placeholder = copy.placeholder;
      document.getElementById("downloadHint").textContent = copy.hint;
      demoButton.textContent = copy.demoLabel;

      platformTabs.forEach((tab) => {
        const isActive = tab.dataset.platformTab === platform;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-current", isActive ? "page" : "false");
      });
    }

    function resetDownloaderState() {
      form.reset();
      clearDownloaderMessages();
      input.classList.remove("is-invalid");
      preview.hidden = true;
      previewVideo.pause();
      previewVideo.removeAttribute("src");
      previewVideo.removeAttribute("poster");
      previewVideo.load();
      previewVideo.hidden = true;
      thumbnailWrap.hidden = true;
      thumbnail.removeAttribute("src");
      placeholder.hidden = false;
      content.hidden = true;
      title.textContent = "Download assets";
      source.textContent = "Direct resolver";
      meta.textContent =
        "Your media links are ready. Use the buttons below to preview or save the file.";
      owner.textContent = "Unknown";
      canonicalLink.href = "#";
      canonicalLink.textContent = "Open reel";
      videoLink.href = "#";
      videoLink.removeAttribute("download");
      audioLink.hidden = true;
      audioLink.removeAttribute("href");
      audioLink.removeAttribute("download");
      setLoadingState(false);
    }

    function setLoadingState(isLoading) {
      form.setAttribute("aria-busy", String(isLoading));
      button.disabled = isLoading;
      pasteButton.disabled = isLoading;
      demoButton.disabled = isLoading;
      downloadAgainButton.disabled = isLoading;
      button.textContent = isLoading ? "Loading..." : "Download";
      loading.hidden = !isLoading;
    }
  }

  function detectSupportedPlatform(value) {
    if (!value) {
      return null;
    }

    try {
      const url = new URL(value);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const path = url.pathname.toLowerCase();
      if (
        (host === "instagram.com" || host.endsWith(".instagram.com")) &&
        (path.startsWith("/reel/") ||
          path.startsWith("/reels/") ||
          path.startsWith("/share/reel/") ||
          path.startsWith("/share/p/") ||
          path.startsWith("/p/"))
      ) {
        return "instagram";
      }

      if (host === "youtu.be" && path.length > 1) {
        return "youtube";
      }

      if (
        (host === "youtube.com" || host.endsWith(".youtube.com")) &&
        (path === "/watch" || path.startsWith("/shorts/") || path.startsWith("/embed/"))
      ) {
        return "youtube";
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async function parseJsonSafely(response) {
    try {
      return await response.json();
    } catch (error) {
      return {};
    }
  }

  function shortenUrlLabel(value) {
    try {
      const url = new URL(value);
      return `${url.hostname}${url.pathname}`;
    } catch (error) {
      return "Open reel";
    }
  }

  function scrollResultIntoView(node) {
    if (!node || typeof node.scrollIntoView !== "function") {
      return;
    }

    node.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  function matchesPrompt(prompt, state) {
    const searchStack = [
      prompt.title,
      prompt.description,
      prompt.category,
      prompt.format,
      prompt.tips,
      ...prompt.tools,
      ...prompt.variations
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = state.query ? searchStack.includes(state.query) : true;
    const matchesFilter =
      state.activeFilter === "All" ? true : prompt.category === state.activeFilter;

    return matchesQuery && matchesFilter;
  }

  function createPromptCard(prompt, compact) {
    const article = document.createElement("article");
    article.className = "prompt-card";

    const media = document.createElement("div");
    media.className = "prompt-card__media";

    const image = document.createElement("img");
    image.src = prompt.image;
    image.alt = `${prompt.title} preview`;
    image.loading = "lazy";
    media.appendChild(image);

    const overlay = document.createElement("span");
    overlay.className = "preview-overlay";
    overlay.textContent = prompt.category;
    media.appendChild(overlay);

    const body = document.createElement("div");
    body.className = "prompt-card__body";

    const topRow = document.createElement("div");
    topRow.className = "prompt-card__top";

    const formatPill = document.createElement("span");
    formatPill.className = "prompt-card__format";
    formatPill.textContent = prompt.format;

    const title = document.createElement("h3");
    title.textContent = prompt.title;

    const meta = document.createElement("p");
    meta.className = "prompt-meta";
    meta.textContent = prompt.description;

    const toolList = document.createElement("div");
    toolList.className = "tool-list";
    prompt.tools.forEach((tool) => {
      const chip = document.createElement("span");
      chip.className = "tool-chip";
      chip.textContent = tool;
      toolList.appendChild(chip);
    });

    const footer = document.createElement("div");
    footer.className = "prompt-card__footer";

    const format = document.createElement("span");
    format.className = "tool-note";
    format.textContent = `${prompt.variations.length} variations`;

    const link = document.createElement("a");
    link.className = compact ? "ghost-button" : "button button--secondary";
    link.href = `prompt.html?id=${encodeURIComponent(prompt.id)}`;
    link.textContent = compact ? "Open Prompt" : "View Prompt";
    link.addEventListener("click", () => {
      analytics.track("prompt_card_clicked", { id: prompt.id, title: prompt.title });
    });

    topRow.appendChild(formatPill);
    body.append(topRow, title, meta, toolList);
    footer.append(format, link);
    body.appendChild(footer);

    article.append(media, body);
    return article;
  }

  function createDetailLayout(prompt) {
    const shell = document.createElement("div");
    shell.className = "detail-layout";

    const previewColumn = document.createElement("div");
    previewColumn.className = "detail-column";

    const previewCard = document.createElement("section");
    previewCard.className = "detail-card";

    const previewFigure = document.createElement("figure");
    previewFigure.className = "preview-figure";

    const previewImage = document.createElement("img");
    previewImage.src = prompt.image;
    previewImage.alt = `${prompt.title} preview artwork`;
    previewFigure.appendChild(previewImage);

    const previewLabel = document.createElement("span");
    previewLabel.className = "preview-overlay";
    previewLabel.textContent = prompt.format;
    previewFigure.appendChild(previewLabel);

    const previewGlow = document.createElement("div");
    previewGlow.className = "preview-glow";
    previewFigure.appendChild(previewGlow);
    previewCard.appendChild(previewFigure);

    const insightCard = document.createElement("section");
    insightCard.className = "detail-card insight-card";

    const insightGrid = document.createElement("div");
    insightGrid.className = "insight-grid";
    insightGrid.append(
      createMetricCard("Format", prompt.format),
      createMetricCard("Tools", `${prompt.tools.length} stack items`),
      createMetricCard("Variations", `${prompt.variations.length} remix options`)
    );
    insightCard.appendChild(insightGrid);

    const tipsCard = document.createElement("section");
    tipsCard.className = "tip-card";

    const tipsEyebrow = document.createElement("p");
    tipsEyebrow.className = "eyebrow";
    tipsEyebrow.textContent = "Pro Tips";

    const tipsTitle = document.createElement("h3");
    tipsTitle.textContent = "Turn one prompt into a reusable content system";

    const tipsCopy = document.createElement("p");
    tipsCopy.textContent = prompt.tips;

    tipsCard.append(tipsEyebrow, tipsTitle, tipsCopy);

    const premiumCard = document.createElement("section");
    premiumCard.className = "premium-card";
    premiumCard.innerHTML = `
      <div class="cta-head">
        <div>
          <p class="eyebrow">Monetize the traffic</p>
          <h2>Unlock Premium Prompt Bundle</h2>
        </div>
      </div>
      <p>
        Bundle this prompt with swipe files, cover templates, hook ideas, and edit
        blueprints for a clean digital-product upsell.
      </p>
    `;

    const premiumTags = document.createElement("div");
    premiumTags.className = "cta-tags";
    ["100+ prompts", "Reel hooks", "Video edit blueprints"].forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = tag;
      premiumTags.appendChild(pill);
    });

    const premiumRow = document.createElement("div");
    premiumRow.className = "cta-row";

    const premiumLink = document.createElement("a");
    premiumLink.className = "button button--primary";
    premiumLink.href = "#";
    premiumLink.dataset.cta = "detail-premium";
    premiumLink.textContent = "Unlock Premium Prompt Bundle";
    attachPlaceholderCta(premiumLink, {
      location: "detail-premium",
      id: prompt.id,
      title: prompt.title
    });

    const homeLink = document.createElement("a");
    homeLink.className = "button button--secondary";
    homeLink.href = "index.html";
    homeLink.textContent = "Browse More Prompts";

    premiumRow.append(premiumLink, homeLink);
    premiumCard.append(premiumTags, premiumRow);

    previewColumn.append(previewCard, insightCard, tipsCard, premiumCard);

    const contentColumn = document.createElement("div");
    contentColumn.className = "detail-column";

    const headerCard = document.createElement("section");
    headerCard.className = "detail-card detail-header";

    const label = document.createElement("span");
    label.className = "detail-label";
    label.textContent = prompt.category;

    const title = document.createElement("h1");
    title.className = "detail-title";
    title.textContent = prompt.title;

    const copy = document.createElement("p");
    copy.className = "detail-copy";
    copy.textContent = prompt.description;

    const detailLead = document.createElement("div");
    detailLead.className = "detail-lead";

    const detailKicker = document.createElement("p");
    detailKicker.className = "detail-kicker";
    detailKicker.textContent =
      "Designed for creators who want social-native prompt assets that feel curated, premium, and immediately usable.";

    const heroActionRow = document.createElement("div");
    heroActionRow.className = "prompt-actions prompt-actions--hero";

    const jumpButton = document.createElement("a");
    jumpButton.className = "button button--secondary";
    jumpButton.href = "#relatedSection";
    jumpButton.textContent = "Explore Related Prompts";

    const toolSummary = document.createElement("div");
    toolSummary.className = "hero-tool-summary";
    toolSummary.textContent = prompt.tools.join(" • ");

    heroActionRow.append(toolSummary, jumpButton);

    detailLead.append(detailKicker, heroActionRow);
    headerCard.append(label, title, copy, detailLead);

    const promptCard = document.createElement("section");
    promptCard.className = "detail-card";

    const promptSection = document.createElement("div");
    promptSection.className = "detail-section";

    const promptHeading = document.createElement("h3");
    promptHeading.textContent = "Full Prompt";

    const promptSubheading = document.createElement("p");
    promptSubheading.className = "section-copy section-copy--tight";
    promptSubheading.textContent =
      "Copy this directly or use it as the hero input inside your favorite image, script, or edit workflow.";

    const promptBox = document.createElement("div");
    promptBox.className = "prompt-box";

    const promptText = document.createElement("pre");
    promptText.textContent = prompt.prompt;
    promptBox.appendChild(promptText);

    const promptActions = document.createElement("div");
    promptActions.className = "prompt-actions";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "copy-button";
    copyButton.textContent = "Copy Prompt";
    copyButton.addEventListener("click", async () => {
      const copied = await copyText(prompt.prompt);
      if (copied) {
        setCopiedState(copyButton, "Copied");
        analytics.track("prompt_copied", { id: prompt.id, title: prompt.title });
        showToast("Prompt copied to clipboard");
      } else {
        showToast("Copy failed on this browser");
      }
    });

    const secondaryLink = document.createElement("a");
    secondaryLink.className = "ghost-button";
    secondaryLink.href = "index.html#prompt-library";
    secondaryLink.textContent = "Back to Library";

    promptActions.append(copyButton, secondaryLink);
    promptSection.append(promptHeading, promptSubheading, promptBox, promptActions);
    promptCard.appendChild(promptSection);

    const toolsCard = document.createElement("section");
    toolsCard.className = "detail-card";

    const toolsSection = document.createElement("div");
    toolsSection.className = "detail-section";

    const toolsHeading = document.createElement("h3");
    toolsHeading.textContent = "Tools Used";

    const toolsWrap = document.createElement("div");
    toolsWrap.className = "detail-tools";

    prompt.tools.forEach((tool) => {
      const chip = document.createElement("span");
      chip.className = "tool-chip";
      chip.textContent = tool;
      toolsWrap.appendChild(chip);
    });

    const toolsNote = document.createElement("p");
    toolsNote.className = "tool-note";
    toolsNote.textContent =
      "Use the listed tools as your base stack, then adapt the prompt for your workflow or audience niche.";

    toolsSection.append(toolsHeading, toolsWrap, toolsNote);
    toolsCard.appendChild(toolsSection);

    const variationCard = document.createElement("section");
    variationCard.className = "detail-card";

    const variationSection = document.createElement("div");
    variationSection.className = "detail-section";

    const variationHeading = document.createElement("h3");
    variationHeading.textContent = "Variation Prompts";

    const variationList = document.createElement("div");
    variationList.className = "variation-list";

    prompt.variations.forEach((variation, index) => {
      const item = document.createElement("article");
      item.className = "variation-card";

      const header = document.createElement("div");
      header.className = "variation-card__header";

      const labelNode = document.createElement("strong");
      labelNode.textContent = `Variation ${index + 1}`;

      const variationButton = document.createElement("button");
      variationButton.type = "button";
      variationButton.className = "variation-copy";
      variationButton.textContent = "Copy";
      variationButton.addEventListener("click", async () => {
        const copied = await copyText(variation);
        if (copied) {
          setCopiedState(variationButton, "Copied");
          analytics.track("variation_copied", {
            id: prompt.id,
            title: prompt.title,
            variationIndex: index + 1
          });
          showToast("Variation copied");
        } else {
          showToast("Copy failed on this browser");
        }
      });

      const copyNode = document.createElement("p");
      copyNode.textContent = variation;

      header.append(labelNode, variationButton);
      item.append(header, copyNode);
      variationList.appendChild(item);
    });

    variationSection.append(variationHeading, variationList);
    variationCard.appendChild(variationSection);

    contentColumn.append(headerCard, promptCard, toolsCard, variationCard);

    shell.append(previewColumn, contentColumn);
    return shell;
  }

  function createMetricCard(label, value) {
    const card = document.createElement("div");
    card.className = "metric-card";

    const strong = document.createElement("strong");
    strong.textContent = value;

    const span = document.createElement("span");
    span.textContent = label;

    card.append(strong, span);
    return card;
  }

  function initMotion() {
    document.body.classList.add("has-motion");

    window.requestAnimationFrame(() => {
      document.body.classList.add("is-ready");
    });

    markStaticReveals();
    refreshMotion(document);
  }

  function refreshMotion(root) {
    if (!root) {
      return;
    }

    markDynamicReveals(root);
    bindRevealObserver(root);
    bindInteractiveSurfaces(root);
  }

  function markStaticReveals() {
    markRevealBatch([document.querySelector(".site-header")], 0, 0);
    markRevealBatch([document.querySelector(".hero")], 80, 0);
    markRevealBatch([document.querySelector(".library")], 180, 0);
    markRevealBatch([document.querySelector(".detail-shell")], 140, 0);
    markRevealBatch([document.querySelector(".downloader-shell")], 160, 0);
    markRevealBatch([document.querySelector(".related-section")], 220, 0);
    markRevealBatch([document.querySelector(".site-footer")], 280, 0);

    markRevealBatch(
      document.querySelectorAll(
        ".hero__content > *, .hero-showcase > *, .section-heading > *, .library-toolbar, .results-row"
      ),
      140,
      70
    );
  }

  function markDynamicReveals(root) {
    markRevealBatch(
      root.querySelectorAll(
        ".prompt-card, .mini-panel, .stat-card, .metric-card, .detail-card, .tip-card, .premium-card, .variation-card, .downloader-card, .result-content"
      ),
      80,
      55
    );
  }

  function markRevealBatch(nodes, baseDelay, stepDelay) {
    Array.from(nodes || [])
      .filter(Boolean)
      .forEach((node, index) => {
        if (node.dataset.revealReady === "true") {
          return;
        }

        node.dataset.revealReady = "true";
        node.setAttribute("data-reveal", "");
        node.style.setProperty("--reveal-delay", `${baseDelay + index * stepDelay}ms`);
      });
  }

  function bindRevealObserver(root) {
    const revealNodes = root.querySelectorAll
      ? root.querySelectorAll("[data-reveal]")
      : [];

    if (!revealNodes.length) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      revealNodes.forEach((node) => {
        node.classList.add("is-visible");
      });
      return;
    }

    if (!window.__vaultRevealObserver) {
      window.__vaultRevealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              window.__vaultRevealObserver.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.16,
          rootMargin: "0px 0px -8% 0px"
        }
      );
    }

    revealNodes.forEach((node) => {
      if (!node.classList.contains("is-visible")) {
        window.__vaultRevealObserver.observe(node);
      }
    });
  }

  function bindInteractiveSurfaces(root) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const supportsPointer = window.matchMedia("(pointer: fine)").matches;
    const surfaces = root.querySelectorAll
      ? root.querySelectorAll(
          ".prompt-card, .hero-card--primary, .mini-panel, .detail-card, .premium-card, .variation-card, .stat-card, .metric-card, .library-toolbar, .downloader-card, .result-content"
        )
      : [];

    surfaces.forEach((surface) => {
      if (surface.dataset.motionBound === "true") {
        return;
      }

      surface.dataset.motionBound = "true";
      surface.classList.add("interactive-surface");
      surface.style.setProperty("--mx", "50%");
      surface.style.setProperty("--my", "50%");

      if (!supportsPointer) {
        return;
      }

      surface.addEventListener("pointermove", (event) => {
        const bounds = surface.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 100;
        const y = ((event.clientY - bounds.top) / bounds.height) * 100;
        surface.style.setProperty("--mx", `${x}%`);
        surface.style.setProperty("--my", `${y}%`);
      });

      surface.addEventListener("pointerleave", () => {
        surface.style.setProperty("--mx", "50%");
        surface.style.setProperty("--my", "50%");
      });
    });
  }

  function createEmptyState(title, description) {
    const wrapper = document.createElement("div");
    wrapper.className = "empty-state";

    const heading = document.createElement("h2");
    heading.textContent = title;

    const copy = document.createElement("p");
    copy.textContent = description;

    const linkRow = document.createElement("div");
    linkRow.className = "cta-row";

    const link = document.createElement("a");
    link.className = "button button--primary";
    link.href = "index.html";
    link.textContent = "Open Prompt Library";

    linkRow.appendChild(link);
    wrapper.append(heading, copy, linkRow);
    return wrapper;
  }

  function getRelatedPrompts(currentPrompt) {
    return vaultPrompts
      .filter((prompt) => prompt.id !== currentPrompt.id)
      .sort((left, right) => scorePrompt(right, currentPrompt) - scorePrompt(left, currentPrompt))
      .slice(0, 3);
  }

  function scorePrompt(candidate, currentPrompt) {
    let score = 0;

    if (candidate.category === currentPrompt.category) {
      score += 3;
    }

    candidate.tools.forEach((tool) => {
      if (currentPrompt.tools.includes(tool)) {
        score += 1;
      }
    });

    return score;
  }

  function attachPlaceholderCta(link, payload) {
    if (!link) {
      return;
    }

    link.addEventListener("click", (event) => {
      event.preventDefault();
      analytics.track("cta_clicked", payload || {});
      showToast("Premium bundle link placeholder");
    });
  }

  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.position = "absolute";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();

    let successful = false;
    try {
      successful = document.execCommand("copy");
    } catch (error) {
      successful = false;
    }

    document.body.removeChild(helper);
    return successful;
  }

  function setCopiedState(button, copiedLabel) {
    const originalLabel = button.dataset.originalLabel || button.textContent;
    button.dataset.originalLabel = originalLabel;
    button.textContent = copiedLabel;
    button.classList.add("is-copied");

    window.setTimeout(() => {
      button.textContent = originalLabel;
      button.classList.remove("is-copied");
    }, 1800);
  }

  function showToast(message) {
    if (!toastElement) {
      return;
    }

    toastElement.textContent = message;
    toastElement.classList.add("is-visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      toastElement.classList.remove("is-visible");
    }, 2200);
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  init();
})();
