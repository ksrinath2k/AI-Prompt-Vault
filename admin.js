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

  if (!form || !promptSelect || !newPromptButton || !status || !promptList || !promptCount) {
    return;
  }

  newPromptButton.addEventListener("click", () => {
    form.reset();
    promptIdInput.value = "";
    promptSelect.value = "";
    setStatus("Ready to create a new prompt.", false);
  });

  promptSelect.addEventListener("change", () => {
    const selectedId = Number(promptSelect.value);
    if (!selectedId) {
      form.reset();
      promptIdInput.value = "";
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
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": apiKey
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save prompt.");
      }

      state.prompts = Array.isArray(result.prompts) ? result.prompts : [];
      syncPromptPicker();
      renderPromptList();

      if (result.prompt) {
        fillForm(result.prompt);
        promptSelect.value = String(result.prompt.id);
        setStatus(`Saved prompt #${result.prompt.id}.`, false);
      } else {
        setStatus("Prompt saved.", false);
      }
    } catch (error) {
      setStatus(error.message || "Unable to save prompt.", true);
    }
  });

  loadPrompts();

  async function loadPrompts() {
    setStatus("Loading prompts...", false);

    try {
      const response = await fetch("/api/admin/prompts", {
        headers: {
          "x-admin-key": apiKey
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load prompts.");
      }

      state.prompts = Array.isArray(result.prompts) ? result.prompts : [];
      syncPromptPicker();
      renderPromptList();
      setStatus("Admin console is ready.", false);
    } catch (error) {
      setStatus(error.message || "Unable to load prompts.", true);
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
  }

  function syncPromptPicker() {
    const previousValue = promptSelect.value;
    promptSelect.innerHTML = '<option value="">Create a new prompt</option>';

    state.prompts.forEach((prompt) => {
      const option = document.createElement("option");
      option.value = String(prompt.id);
      option.textContent = `#${prompt.id} - ${prompt.title}`;
      promptSelect.appendChild(option);
    });

    promptSelect.value = previousValue && state.prompts.some((prompt) => String(prompt.id) === previousValue)
      ? previousValue
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
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-list__item";
      button.innerHTML = `
        <span class="admin-list__meta">#${prompt.id} · ${escapeHtml(prompt.category || "Uncategorized")}</span>
        <strong>${escapeHtml(prompt.title || "Untitled prompt")}</strong>
        <span class="admin-list__time">${escapeHtml(formatTimestamp(prompt.updatedAt || prompt.createdAt))}</span>
      `;
      button.addEventListener("click", () => {
        promptSelect.value = String(prompt.id);
        fillForm(prompt);
        setStatus(`Editing prompt #${prompt.id}.`, false);
      });
      promptList.appendChild(button);
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
