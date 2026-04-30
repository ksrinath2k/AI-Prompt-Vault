(function () {
  const config = window.promptVaultAdmin || {};
  const apiKey = typeof config.apiKey === "string" ? config.apiKey : "";
  const form = document.getElementById("adminPromptForm");
  const promptIdInput = document.getElementById("promptId");
  const promptSelect = document.getElementById("promptSelect");
  const newPromptButton = document.getElementById("newPromptButton");
  const status = document.getElementById("adminStatus");
  const promptList = document.getElementById("adminPromptList");
  const promptCount = document.getElementById("adminPromptCount");
  const imageFileInput = document.getElementById("promptImageFile");
  const liveChannel =
    typeof BroadcastChannel === "function"
      ? new BroadcastChannel("prompt-vault-updates")
      : null;

  const fields = {
    title: document.getElementById("promptTitle"),
    category: document.getElementById("promptCategory"),
    format: document.getElementById("promptFormat"),
    image: document.getElementById("promptImage"),
    description: document.getElementById("promptDescription"),
    prompt: document.getElementById("promptBody"),
    tools: document.getElementById("promptTools"),
    tips: document.getElementById("promptTips"),
    variations: document.getElementById("promptVariations")
  };

  const state = {
    prompts: []
  };

  initThemeControls();
  initNavigationMenu();

  if (!form || !promptSelect || !newPromptButton || !status || !promptList || !promptCount) {
    return;
  }

  newPromptButton.addEventListener("click", () => {
    resetForm();
    setStatus("Ready to create a new prompt.", false);
  });

  promptSelect.addEventListener("change", () => {
    const selectedId = Number(promptSelect.value);
    if (!selectedId) {
      resetForm();
      setStatus("Ready to create a new prompt.", false);
      return;
    }

    const prompt = state.prompts.find((entry) => Number(entry.id) === selectedId);
    if (!prompt) {
      return;
    }

    fillForm(prompt);
    setStatus(`Editing prompt #${prompt.id}.`, false);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Saving prompt...", false);

    try {
      const payload = await buildPayload();
      const response = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: createAdminHeaders(),
        body: JSON.stringify(payload)
      });
      const result = await parseJson(response);

      if (!response.ok) {
        throw new Error(result.error || "Unable to save prompt.");
      }

      state.prompts = Array.isArray(result.prompts) ? result.prompts : [];
      syncPromptPicker(result.prompt ? String(result.prompt.id) : "");
      renderPromptList();

      if (result.prompt) {
        fillForm(result.prompt);
        setStatus(`Saved prompt #${result.prompt.id}.`, false);
      } else {
        setStatus("Prompt saved.", false);
      }

      broadcastPromptUpdate("saved");
    } catch (error) {
      setStatus(error.message || "Unable to save prompt.", true);
    }
  });

  loadPrompts();

  function initThemeControls() {
    const preference = getThemePreference();
    applyThemePreference(preference);

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      if (button.dataset.themeBound === "true") {
        return;
      }

      button.dataset.themeBound = "true";
      button.addEventListener("click", () => {
        const nextPreference = getNextThemePreference(getThemePreference());
        persistThemePreference(nextPreference);
        applyThemePreference(nextPreference);
      });
    });
  }

  function initNavigationMenu() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const menu = document.getElementById("siteMenu");

    if (!toggle || !menu) {
      return;
    }

    const setMenuState = (isOpen) => {
      document.body.classList.toggle("menu-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    };

    setMenuState(false);

    if (toggle.dataset.menuBound !== "true") {
      toggle.dataset.menuBound = "true";
      toggle.addEventListener("click", () => {
        setMenuState(!document.body.classList.contains("menu-open"));
      });
    }

    menu.querySelectorAll("a, button").forEach((node) => {
      if (node.dataset.menuCloseBound === "true") {
        return;
      }

      node.dataset.menuCloseBound = "true";
      node.addEventListener("click", () => {
        if (window.innerWidth < 720) {
          setMenuState(false);
        }
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 720) {
        setMenuState(false);
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setMenuState(false);
      }
    });
  }

  function getThemePreference() {
    try {
      const stored = window.localStorage.getItem("vault-theme-preference");
      return stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    } catch (error) {
      return "system";
    }
  }

  function persistThemePreference(preference) {
    try {
      if (preference === "system") {
        window.localStorage.removeItem("vault-theme-preference");
      } else {
        window.localStorage.setItem("vault-theme-preference", preference);
      }
    } catch (error) {
      // Ignore storage restrictions.
    }
  }

  function applyThemePreference(preference) {
    if (preference === "light" || preference === "dark") {
      document.documentElement.setAttribute("data-theme", preference);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    document.documentElement.dataset.themePreference = preference;
    syncThemeToggleLabels(preference);
  }

  function syncThemeToggleLabels(preference) {
    const label =
      preference === "light"
        ? "Theme: Light"
        : preference === "dark"
          ? "Theme: Dark"
          : "Theme: System";

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.textContent = label;
      button.setAttribute("aria-label", label);
      button.setAttribute("title", "Cycle theme mode");
    });
  }

  function getNextThemePreference(currentPreference) {
    if (currentPreference === "system") {
      return "light";
    }

    if (currentPreference === "light") {
      return "dark";
    }

    return "system";
  }

  async function loadPrompts() {
    setStatus("Loading prompts...", false);

    try {
      const response = await fetch("/api/admin/prompts", {
        headers: createAdminHeaders()
      });
      const result = await parseJson(response);

      if (!response.ok) {
        throw new Error(result.error || "Unable to load prompts.");
      }

      state.prompts = Array.isArray(result.prompts) ? result.prompts : [];
      syncPromptPicker(promptIdInput.value);
      renderPromptList();
      setStatus("Admin console is ready.", false);
    } catch (error) {
      setStatus(error.message || "Unable to load prompts.", true);
    }
  }

  async function deletePrompt(promptId) {
    const prompt = state.prompts.find((entry) => Number(entry.id) === Number(promptId));
    if (!prompt || !window.confirm(`Delete "${prompt.title}"?`)) {
      return;
    }

    setStatus(`Deleting prompt #${prompt.id}...`, false);

    try {
      const response = await fetch(`/api/admin/prompts/${encodeURIComponent(prompt.id)}`, {
        method: "DELETE",
        headers: createAdminHeaders()
      });
      const result = await parseJson(response);

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete prompt.");
      }

      state.prompts = Array.isArray(result.prompts) ? result.prompts : [];
      if (String(promptIdInput.value) === String(prompt.id)) {
        resetForm();
      }
      syncPromptPicker("");
      renderPromptList();
      setStatus(`Deleted prompt #${prompt.id}.`, false);
      broadcastPromptUpdate("deleted");
    } catch (error) {
      setStatus(error.message || "Unable to delete prompt.", true);
    }
  }

  async function buildPayload() {
    return {
      id: promptIdInput.value ? Number(promptIdInput.value) : undefined,
      title: fields.title.value.trim(),
      category: fields.category.value.trim(),
      format: fields.format.value.trim(),
      image: fields.image.value.trim(),
      description: fields.description.value.trim(),
      prompt: fields.prompt.value.trim(),
      tools: splitLines(fields.tools.value),
      tips: fields.tips.value.trim(),
      variations: splitLines(fields.variations.value),
      imageUpload: await readSelectedFile()
    };
  }

  function fillForm(prompt) {
    promptIdInput.value = String(prompt.id || "");
    fields.title.value = prompt.title || "";
    fields.category.value = prompt.category || "";
    fields.format.value = prompt.format || "";
    fields.image.value = prompt.image || "";
    fields.description.value = prompt.description || "";
    fields.prompt.value = prompt.prompt || "";
    fields.tools.value = Array.isArray(prompt.tools) ? prompt.tools.join("\n") : "";
    fields.tips.value = prompt.tips || "";
    fields.variations.value = Array.isArray(prompt.variations)
      ? prompt.variations.join("\n")
      : "";
    imageFileInput.value = "";
    promptSelect.value = String(prompt.id || "");
  }

  function resetForm() {
    form.reset();
    promptIdInput.value = "";
    promptSelect.value = "";
    imageFileInput.value = "";
  }

  function syncPromptPicker(selectedValue) {
    promptSelect.innerHTML = '<option value="">Create a new prompt</option>';

    state.prompts.forEach((prompt) => {
      const option = document.createElement("option");
      option.value = String(prompt.id);
      option.textContent = `#${prompt.id} - ${prompt.title}`;
      promptSelect.appendChild(option);
    });

    promptSelect.value =
      selectedValue && state.prompts.some((prompt) => String(prompt.id) === String(selectedValue))
        ? String(selectedValue)
        : "";
    promptCount.textContent = `${state.prompts.length} total`;
  }

  function renderPromptList() {
    promptList.innerHTML = "";

    if (state.prompts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "input-hint";
      empty.textContent = "No prompts saved yet.";
      promptList.appendChild(empty);
      return;
    }

    state.prompts.forEach((prompt) => {
      const card = document.createElement("article");
      card.className = "admin-list__item";

      const meta = document.createElement("span");
      meta.className = "admin-list__meta";
      meta.textContent = `#${prompt.id} · ${prompt.category || "Uncategorized"}`;

      const title = document.createElement("strong");
      title.textContent = prompt.title || "Untitled prompt";

      const time = document.createElement("span");
      time.className = "admin-list__time";
      time.textContent = formatTimestamp(prompt.updatedAt || prompt.createdAt);

      const actions = document.createElement("div");
      actions.className = "admin-list__actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "ghost-button utility-button admin-action-button";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => {
        fillForm(prompt);
        setStatus(`Editing prompt #${prompt.id}.`, false);
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "ghost-button utility-button admin-action-button admin-action-button--danger";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        deletePrompt(prompt.id);
      });

      actions.append(editButton, deleteButton);
      card.append(meta, title, time, actions);
      promptList.appendChild(card);
    });
  }

  async function readSelectedFile() {
    const file = imageFileInput.files && imageFileInput.files[0];
    if (!file) {
      return null;
    }

    const dataUrl = await readFileAsDataUrl(file);
    return {
      name: file.name,
      type: file.type,
      dataUrl
    };
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Could not read the selected image."));
      reader.readAsDataURL(file);
    });
  }

  function createAdminHeaders() {
    return {
      "Content-Type": "application/json",
      "x-admin-key": apiKey
    };
  }

  async function parseJson(response) {
    try {
      return await response.json();
    } catch (error) {
      return {};
    }
  }

  function splitLines(value) {
    return String(value || "")
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
  }

  function formatTimestamp(value) {
    const timestamp = Date.parse(value || "");
    if (!Number.isFinite(timestamp)) {
      return "No timestamp";
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(timestamp));
  }

  function broadcastPromptUpdate(action) {
    const payload = {
      action,
      timestamp: Date.now()
    };

    if (liveChannel) {
      liveChannel.postMessage(payload);
    }

    try {
      window.localStorage.setItem("prompt-vault-update", JSON.stringify(payload));
    } catch (error) {
      // Ignore storage failures in private browsing or restricted environments.
    }
  }
})();
