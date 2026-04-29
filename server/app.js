const express = require("express");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHmac, timingSafeEqual } = require("node:crypto");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const vm = require("node:vm");
const { instagramGetUrl } = require("instagram-url-direct");

const app = express();
const rootDir = path.resolve(process.cwd());
const assetsDir = path.join(rootDir, "Assets");
const promptDataPath = path.join(rootDir, "data.js");
const mediaTokenTtlMs = 20 * 60 * 1000;
const mediaTokenSecret = process.env.MEDIA_TOKEN_SECRET || "ai-prompt-vault-local-secret";
const adminRoutePath = "/vault-admin-8c7f5k2m";
const adminWriteKey = process.env.ADMIN_WRITE_KEY || "vault-admin-8c7f5k2m";
const instagramUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const youtubeUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

let youtubeClientPromise;

app.use(express.json({ limit: "15mb" }));
app.use(express.static(rootDir));

app.get(adminRoutePath, (req, res) => {
  res.type("html").send(renderAdminPage());
});

app.get("/api/admin/prompts", async (req, res) => {
  if (!isAuthorizedAdminRequest(req)) {
    return res.status(403).json({ error: "Admin access denied." });
  }

  try {
    const prompts = sortPromptsNewestFirst(await readPromptData());
    return res.json({ prompts });
  } catch (error) {
    return res.status(500).json({ error: "Unable to load prompts right now." });
  }
});

app.post("/api/admin/prompts", async (req, res) => {
  if (!isAuthorizedAdminRequest(req)) {
    return res.status(403).json({ error: "Admin access denied." });
  }

  try {
    const currentPrompts = await readPromptData();
    const promptInput = await normalizePromptInput(req.body, currentPrompts);
    const existingIndex = currentPrompts.findIndex(
      (entry) => Number(entry.id) === Number(promptInput.id)
    );
    let savedPromptId;

    let nextPrompts;
    if (existingIndex >= 0) {
      const existingPrompt = currentPrompts[existingIndex];
      savedPromptId = existingPrompt.id;
      const updatedPrompt = {
        ...existingPrompt,
        ...promptInput,
        id: existingPrompt.id,
        createdAt: existingPrompt.createdAt || promptInput.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      nextPrompts = currentPrompts.slice();
      nextPrompts[existingIndex] = updatedPrompt;
    } else {
      const nextId = getNextPromptId(currentPrompts);
      savedPromptId = nextId;
      const createdAt = new Date().toISOString();
      nextPrompts = [
        {
          ...promptInput,
          id: nextId,
          createdAt,
          updatedAt: createdAt
        },
        ...currentPrompts
      ];
    }

    const sortedPrompts = sortPromptsNewestFirst(nextPrompts);
    await writePromptData(sortedPrompts);

    return res.json({
      prompt: sortedPrompts.find((entry) => Number(entry.id) === Number(savedPromptId)),
      prompts: sortedPrompts
    });
  } catch (error) {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 400;
    return res.status(statusCode).json({
      error: error.publicMessage || "We could not save that prompt right now."
    });
  }
});

app.post("/api/download", async (req, res) => {
  const submittedUrl = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    const platform = detectSupportedPlatform(submittedUrl);

  if (!platform) {
    return res.status(400).json({
      error: "Paste a public Instagram reel or YouTube video/Shorts link."
    });
  }

  try {
    const resolved = await resolveMediaForPlatform(platform, submittedUrl);
    const mediaToken = createMediaToken({
      platform: resolved.platform,
      canonicalUrl: resolved.canonicalUrl
    });

    return res.json({
      platform: resolved.platform,
      canonicalUrl: resolved.canonicalUrl,
      title: resolved.title,
      owner: resolved.owner,
      caption: resolved.caption,
      source: resolved.source,
      message: resolved.message,
      thumbnailPath: resolved.thumbnail ? `/api/media/thumbnail?token=${encodeURIComponent(mediaToken)}` : null,
      previewPath: resolved.preview ? `/api/media/preview?token=${encodeURIComponent(mediaToken)}` : null,
      videoDownloadPath: resolved.video ? `/api/media/video?token=${encodeURIComponent(mediaToken)}` : null,
      audioDownloadPath: resolved.audio ? `/api/media/audio?token=${encodeURIComponent(mediaToken)}` : null,
      videoFilename: resolved.video ? `${resolved.fileBase}.mp4` : null,
      audioFilename: resolved.audio ? `${resolved.fileBase}.mp3` : null
    });
  } catch (error) {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

    return res.status(statusCode).json({
      error:
        error.publicMessage ||
        "We could not fetch this media right now. Try another public Instagram or YouTube URL."
    });
  }
});

app.get("/api/media/:kind", async (req, res) => {
  const { kind } = req.params;
  const token = typeof req.query.token === "string" ? req.query.token : "";

  let tokenPayload;
  try {
    tokenPayload = readMediaToken(token);
  } catch (error) {
    return res.status(404).send("This media link expired. Please fetch the media again.");
  }

  let media;
  try {
    media = await resolveMediaForPlatform(tokenPayload.platform, tokenPayload.canonicalUrl);
  } catch (error) {
    return res.status(404).send("That media could not be reloaded. Please fetch it again.");
  }

  const targetUrl = getSessionMediaTarget(media, kind);

  if (!targetUrl) {
    return res.status(404).send("That media file is not available for this item.");
  }

  try {
    await proxyRemoteMedia(req, res, {
      url: targetUrl,
      fileBase: media.fileBase,
      kind,
      headers: createUpstreamHeaders(media.platform, kind)
    });
  } catch (error) {
    if (!res.headersSent) {
      return res.status(502).send("Unable to stream that file right now.");
    }

    res.destroy(error);
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(rootDir, "index.html"));
});

app.get("/downloader", (req, res) => {
  res.sendFile(path.join(rootDir, "downloader.html"));
});

module.exports = app;

async function resolveMediaForPlatform(platform, submittedUrl) {
  if (platform === "instagram") {
    return resolveInstagramMedia(submittedUrl);
  }

  if (platform === "youtube") {
    return resolveYouTubeMedia(submittedUrl);
  }

  throw createPublicError("That platform is not supported yet.", 400);
}

async function resolveInstagramMedia(rawUrl) {
  const canonicalUrl = await resolveInstagramUrl(rawUrl);

  if (detectSupportedPlatform(canonicalUrl) !== "instagram") {
    throw createPublicError("This Instagram link type is not supported yet.", 400);
  }

  try {
    return await resolveInstagramWithPackage(canonicalUrl);
  } catch (packageError) {
    return resolveInstagramWithPageMetadata(canonicalUrl, packageError);
  }
}

async function resolveInstagramUrl(rawUrl) {
  const parsed = new URL(rawUrl);

  if (!parsed.pathname.toLowerCase().startsWith("/share/")) {
    return parsed.toString();
  }

  const response = await fetch(parsed.toString(), {
    redirect: "follow",
    headers: {
      "User-Agent": instagramUserAgent,
      Accept: "text/html,application/xhtml+xml"
    }
  });

  return response.url;
}

async function resolveInstagramWithPackage(instagramUrl) {
  const result = await instagramGetUrl(instagramUrl);
  const videoMedia =
    result.media_details?.find((entry) => entry.type === "video" && entry.url) ||
    result.media_details?.[0];

  if (!videoMedia?.url) {
    throw createPublicError("No downloadable Instagram video was found.", 404);
  }

  const owner = result.post_info?.owner_username || "";
  const caption = result.post_info?.caption || "";
  const title = result.post_info?.owner_fullname || owner || "Instagram Reel";

  return {
    platform: "instagram",
    canonicalUrl: instagramUrl,
    title,
    owner,
    caption,
    thumbnail: videoMedia.thumbnail || null,
    preview: videoMedia.url,
    video: videoMedia.url,
    audio: null,
    source: "Resolved directly from Instagram",
    message: owner
      ? `Ready to preview and download from @${owner}.`
      : "Your Instagram reel is ready to preview and download.",
    fileBase: createFileBase("instagram", instagramUrl, owner)
  };
}

async function resolveInstagramWithPageMetadata(instagramUrl, originalError) {
  const response = await fetch(instagramUrl, {
    headers: {
      "User-Agent": instagramUserAgent,
      Accept: "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    throw createPublicError("Instagram could not be reached for this reel.", 502);
  }

  const html = await response.text();
  const video =
    readMetaTag(html, "og:video") ||
    readMetaTag(html, "og:video:url") ||
    readJsonValue(html, "video_url") ||
    readJsonValue(html, "contentUrl");

  if (!video) {
    throw createPublicError(
      "This Instagram reel could not be resolved. It may be private, removed, or restricted.",
      404,
      originalError
    );
  }

  const thumbnail =
    readMetaTag(html, "og:image") ||
    readJsonValue(html, "display_url") ||
    readJsonValue(html, "thumbnail_src");
  const title = readMetaTag(html, "og:title") || "Instagram Reel";
  const caption = readMetaTag(html, "og:description") || "";
  const owner = extractOwnerFromText(title, caption);

  return {
    platform: "instagram",
    canonicalUrl: instagramUrl,
    title,
    owner,
    caption,
    thumbnail,
    preview: video,
    video,
    audio: null,
    source: "Resolved from Instagram public page metadata",
    message: owner
      ? `Ready to preview and download from @${owner}.`
      : "Your Instagram reel is ready to preview and download.",
    fileBase: createFileBase("instagram", instagramUrl, owner)
  };
}

async function resolveYouTubeMedia(rawUrl) {
  const videoId = extractYouTubeVideoId(rawUrl);

  if (!videoId) {
    throw createPublicError("Paste a valid YouTube video or Shorts URL.", 400);
  }

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const yt = await getYouTubeClient();
  const info = await yt.getInfo(videoId);
  const basicInfo = info.basic_info || {};
  const format = chooseYouTubeFormat(info);

  if (!format?.url) {
    throw createPublicError("No downloadable YouTube MP4 stream was found.", 404);
  }

  return {
    platform: "youtube",
    canonicalUrl,
    title: basicInfo.title || "YouTube Video",
    owner: basicInfo.channel?.name || basicInfo.author || "",
    caption: basicInfo.short_description || "",
    thumbnail: pickThumbnailUrl(basicInfo.thumbnail || basicInfo.thumbnails || []),
    preview: format.url,
    video: format.url,
    audio: null,
    source: isYouTubeShortsUrl(rawUrl)
      ? "Resolved directly from YouTube Shorts"
      : "Resolved directly from YouTube",
    message: isYouTubeShortsUrl(rawUrl)
      ? "Your YouTube Short is ready to preview and download."
      : "Your YouTube video is ready to preview and download.",
    fileBase: createFileBase("youtube", canonicalUrl, basicInfo.channel?.name || basicInfo.author)
  };
}

async function getYouTubeClient() {
  if (!youtubeClientPromise) {
    youtubeClientPromise = import("youtubei.js").then(({ Innertube }) => Innertube.create());
  }

  return youtubeClientPromise;
}

function chooseYouTubeFormat(info) {
  const streamingData = info.streaming_data || {};
  const allFormats = []
    .concat(Array.isArray(streamingData.formats) ? streamingData.formats : [])
    .concat(Array.isArray(streamingData.adaptive_formats) ? streamingData.adaptive_formats : []);

  const progressiveMp4 = allFormats
    .filter(
      (format) =>
        format &&
        format.url &&
        format.has_audio &&
        format.has_video &&
        String(format.mime_type || "").includes("video/mp4")
    )
    .sort(compareFormats);

  if (progressiveMp4.length > 0) {
    return progressiveMp4[0];
  }

  const anyMp4 = allFormats
    .filter((format) => format && format.url && String(format.mime_type || "").includes("video/mp4"))
    .sort(compareFormats);

  return anyMp4[0] || allFormats.find((format) => format && format.url) || null;
}

function compareFormats(left, right) {
  return (
    (Number(right.height) || 0) - (Number(left.height) || 0) ||
    (Number(right.bitrate) || 0) - (Number(left.bitrate) || 0)
  );
}

function pickThumbnailUrl(thumbnails) {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) {
    return null;
  }

  const sorted = thumbnails.slice().sort((left, right) => {
    const leftArea = (Number(left.width) || 0) * (Number(left.height) || 0);
    const rightArea = (Number(right.width) || 0) * (Number(right.height) || 0);
    return rightArea - leftArea;
  });

  return sorted[0]?.url || null;
}

function getSessionMediaTarget(session, kind) {
  if (kind === "audio") {
    return session.audio;
  }

  if (kind === "thumbnail") {
    return session.thumbnail;
  }

  if (kind === "preview") {
    return session.preview || session.video;
  }

  if (kind === "video") {
    return session.video;
  }

  return null;
}

function createMediaToken(payload) {
  const body = Buffer.from(
    JSON.stringify({
      platform: payload.platform,
      canonicalUrl: payload.canonicalUrl,
      exp: Date.now() + mediaTokenTtlMs
    })
  ).toString("base64url");
  const signature = createHmac("sha256", mediaTokenSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function readMediaToken(token) {
  if (!token || !token.includes(".")) {
    throw createPublicError("Invalid media token.", 400);
  }

  const [body, signature] = token.split(".");
  const expected = createHmac("sha256", mediaTokenSecret).update(body).digest("base64url");

  if (
    !signature ||
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw createPublicError("Invalid media token.", 400);
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));

  if (!payload.exp || Date.now() > payload.exp) {
    throw createPublicError("Expired media token.", 400);
  }

  return payload;
}

async function proxyRemoteMedia(req, res, config) {
  const upstream = await fetch(config.url, {
    headers: {
      ...config.headers,
      ...(req.headers.range ? { Range: req.headers.range } : {})
    }
  });

  if (!upstream.ok || !upstream.body) {
    throw createPublicError("Could not stream the media file.", 502);
  }

  const contentType = upstream.headers.get("content-type") || getDefaultContentType(config.kind);
  const extension = getFileExtension(config.kind, contentType, config.url);
  const disposition = config.kind === "thumbnail" || config.kind === "preview" ? "inline" : "attachment";

  res.status(upstream.status);
  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${config.fileBase}.${extension}"`
  );
  res.setHeader("Cache-Control", "no-store");

  copyHeaderIfPresent(upstream, res, "content-length");
  copyHeaderIfPresent(upstream, res, "content-range");
  copyHeaderIfPresent(upstream, res, "accept-ranges");

  await pipeline(Readable.fromWeb(upstream.body), res);
}

function createUpstreamHeaders(platform) {
  if (platform === "instagram") {
    return {
      "User-Agent": instagramUserAgent,
      Referer: "https://www.instagram.com/"
    };
  }

  if (platform === "youtube") {
    return {
      "User-Agent": youtubeUserAgent,
      Referer: "https://www.youtube.com/"
    };
  }

  return {};
}

function copyHeaderIfPresent(upstream, res, headerName) {
  const value = upstream.headers.get(headerName);
  if (value) {
    res.setHeader(headerName, value);
  }
}

function getDefaultContentType(kind) {
  if (kind === "audio") {
    return "audio/mpeg";
  }

  if (kind === "thumbnail") {
    return "image/jpeg";
  }

  return "video/mp4";
}

function detectSupportedPlatform(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const pathName = url.pathname.toLowerCase();

    if (
      (host === "instagram.com" || host.endsWith(".instagram.com")) &&
      (pathName.startsWith("/reel/") ||
        pathName.startsWith("/reels/") ||
        pathName.startsWith("/share/reel/") ||
        pathName.startsWith("/share/p/") ||
        pathName.startsWith("/p/"))
    ) {
      return "instagram";
    }

    if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be"
    ) {
      if (pathName.startsWith("/watch") || pathName.startsWith("/shorts/") || pathName.startsWith("/embed/")) {
        return "youtube";
      }

      if (host === "youtu.be" && pathName.length > 1) {
        return "youtube";
      }
    }
  } catch (error) {
    return null;
  }

  return null;
}

function extractYouTubeVideoId(value) {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const pathName = url.pathname;

    if (host === "youtu.be") {
      return sanitizeYouTubeId(pathName.slice(1));
    }

    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (pathName === "/watch") {
        return sanitizeYouTubeId(url.searchParams.get("v"));
      }

      if (pathName.startsWith("/shorts/")) {
        return sanitizeYouTubeId(pathName.split("/")[2]);
      }

      if (pathName.startsWith("/embed/")) {
        return sanitizeYouTubeId(pathName.split("/")[2]);
      }
    }
  } catch (error) {
    return "";
  }

  return "";
}

function sanitizeYouTubeId(value) {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : "";
}

function isYouTubeShortsUrl(value) {
  try {
    return new URL(value).pathname.toLowerCase().startsWith("/shorts/");
  } catch (error) {
    return false;
  }
}

function createFileBase(platform, sourceUrl, owner) {
  const mediaId = getMediaId(sourceUrl);
  const ownerPart = sanitizeFileSegment(owner || platform);
  return `${ownerPart}-${mediaId}`;
}

function getMediaId(sourceUrl) {
  if (detectSupportedPlatform(sourceUrl) === "youtube") {
    return sanitizeFileSegment(extractYouTubeVideoId(sourceUrl) || "video");
  }

  try {
    const url = new URL(sourceUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    return sanitizeFileSegment(parts[parts.length - 1] || "media");
  } catch (error) {
    return "media";
  }
}

function sanitizeFileSegment(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "media"
  );
}

function getFileExtension(kind, contentType, mediaUrl) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "jpg";
  }

  if (contentType.includes("png")) {
    return "png";
  }

  if (contentType.includes("webp")) {
    return "webp";
  }

  if (contentType.includes("mp4")) {
    return "mp4";
  }

  if (contentType.includes("mpeg") || contentType.includes("mp3")) {
    return "mp3";
  }

  if (contentType.includes("webm")) {
    return "webm";
  }

  try {
    const pathname = new URL(mediaUrl).pathname;
    const extension = path.extname(pathname).replace(".", "").toLowerCase();
    if (extension) {
      return extension;
    }
  } catch (error) {
    return kind === "audio" ? "mp3" : kind === "thumbnail" ? "jpg" : "mp4";
  }

  return kind === "audio" ? "mp3" : kind === "thumbnail" ? "jpg" : "mp4";
}

function readMetaTag(html, propertyName) {
  const expression = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapeRegex(propertyName)}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(expression);
  return match ? decodeHtmlEntities(match[1]) : "";
}

function readJsonValue(html, key) {
  const expression = new RegExp(`"${escapeRegex(key)}":"([^"]+)"`, "i");
  const match = html.match(expression);
  return match ? decodeEscapedString(match[1]) : "";
}

function extractOwnerFromText(...values) {
  const combined = values.filter(Boolean).join(" ");
  const match = combined.match(/@([a-z0-9._]+)/i);
  return match ? match[1] : "";
}

function decodeEscapedString(value) {
  try {
    return JSON.parse(`"${String(value).replace(/"/g, '\\"')}"`);
  } catch (error) {
    return String(value)
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/");
  }
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createPublicError(message, statusCode, cause) {
  const error = new Error(message);
  error.publicMessage = message;
  error.statusCode = statusCode;
  error.cause = cause;
  return error;
}

function isAuthorizedAdminRequest(req) {
  const submittedKey = String(req.get("x-admin-key") || "").trim();

  if (!submittedKey || submittedKey.length !== adminWriteKey.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(submittedKey), Buffer.from(adminWriteKey));
}

async function readPromptData() {
  const source = await fs.readFile(promptDataPath, "utf8");
  const sandbox = {
    window: {},
    encodeURIComponent
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: promptDataPath });

  if (!Array.isArray(sandbox.window.prompts)) {
    throw createPublicError("Prompt data is not readable.", 500);
  }

  return sandbox.window.prompts.map((prompt) => ({ ...prompt }));
}

async function writePromptData(prompts) {
  const serialized = `window.prompts = ${JSON.stringify(prompts, null, 2)};\n`;
  await fs.writeFile(promptDataPath, serialized, "utf8");
}

async function normalizePromptInput(body, currentPrompts) {
  const title = readRequiredField(body.title, "Title");
  const category = readRequiredField(body.category, "Category");
  const format = readRequiredField(body.format, "Format");
  const description = readRequiredField(body.description, "Description");
  const prompt = readRequiredField(body.prompt, "Prompt");
  const tips = readRequiredField(body.tips, "Tips");
  const tools = normalizeStringList(body.tools);
  const variations = normalizeStringList(body.variations);

  if (tools.length === 0) {
    throw createPublicError("Add at least one tool.", 400);
  }

  const requestedId = Number(body.id);
  const existingPrompt = Number.isInteger(requestedId)
    ? currentPrompts.find((entry) => Number(entry.id) === requestedId)
    : null;

  const imagePath =
    (await maybeSaveUploadedImage(body.imageUpload)) ||
    normalizeOptionalString(body.image) ||
    normalizeOptionalString(existingPrompt?.image);

  if (!imagePath) {
    throw createPublicError("Upload an image or provide an image path.", 400);
  }

  return {
    id: existingPrompt ? existingPrompt.id : requestedId || undefined,
    title,
    category,
    format,
    description,
    image: imagePath,
    prompt,
    tools,
    tips,
    variations,
    createdAt: existingPrompt?.createdAt,
    updatedAt: new Date().toISOString()
  };
}

function readRequiredField(value, label) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw createPublicError(`${label} is required.`, 400);
  }

  return normalized;
}

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeOptionalString(entry))
      .filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getNextPromptId(prompts) {
  return prompts.reduce((highest, prompt) => {
    const numericId = Number(prompt.id);
    return Number.isInteger(numericId) ? Math.max(highest, numericId) : highest;
  }, 0) + 1;
}

function sortPromptsNewestFirst(prompts) {
  return prompts.slice().sort((left, right) => {
    const rightValue = getPromptSortValue(right);
    const leftValue = getPromptSortValue(left);
    return rightValue - leftValue || Number(right.id || 0) - Number(left.id || 0);
  });
}

function getPromptSortValue(prompt) {
  const timestamp = Date.parse(prompt.updatedAt || prompt.createdAt || "");
  if (Number.isFinite(timestamp)) {
    return timestamp;
  }

  const numericId = Number(prompt.id);
  return Number.isFinite(numericId) ? numericId : 0;
}

async function maybeSaveUploadedImage(imageUpload) {
  if (!imageUpload || typeof imageUpload !== "object") {
    return "";
  }

  const dataUrl = typeof imageUpload.dataUrl === "string" ? imageUpload.dataUrl : "";
  const mimeType = typeof imageUpload.type === "string" ? imageUpload.type : "";
  const originalName = typeof imageUpload.name === "string" ? imageUpload.name : "prompt-image";
  const parsed = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!parsed || !parsed[2]) {
    throw createPublicError("The uploaded image format was not recognized.", 400);
  }

  const finalMimeType = mimeType || parsed[1];
  const extension = getImageExtension(finalMimeType, originalName);

  if (!extension) {
    throw createPublicError("Only JPG, PNG, GIF, SVG, and WebP images are supported.", 400);
  }

  const fileName = `${Date.now()}-${sanitizeFileSegment(originalName.replace(/\.[^.]+$/, ""))}.${extension}`;
  const outputPath = path.join(assetsDir, fileName);
  const bytes = Buffer.from(parsed[2], "base64");

  await fs.mkdir(assetsDir, { recursive: true });
  await fs.writeFile(outputPath, bytes);
  return `/Assets/${fileName}`;
}

function getImageExtension(mimeType, originalName) {
  const normalizedMimeType = String(mimeType).toLowerCase();
  const mimeMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg"
  };

  if (mimeMap[normalizedMimeType]) {
    return mimeMap[normalizedMimeType];
  }

  const extension = path.extname(originalName).replace(".", "").toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(extension)
    ? extension === "jpeg"
      ? "jpg"
      : extension
    : "";
}

function renderAdminPage() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex,nofollow" />
    <title>AI Prompt Vault Admin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Instrument+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/style.css" />
  </head>
  <body data-page="admin">
    <div class="page-shell">
      <header class="site-header">
        <a class="brand-mark" href="/index.html" aria-label="AI Prompt Vault home">
          <span class="brand-mark__orb"></span>
          <span>AI Prompt Vault</span>
        </a>
        <div class="topbar-actions">
          <span class="topbar-badge">Private admin console</span>
          <a class="ghost-link" href="/index.html">View public library</a>
        </div>
      </header>

      <main>
        <section class="admin-shell panel">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Admin flow</p>
              <h1 class="admin-title">Upload or update prompts without editing IDs by hand</h1>
            </div>
            <p class="section-copy section-copy--tight">
              This URL is intentionally private. New and updated prompts are saved into <code>data.js</code> automatically, and the public library shows the latest items first.
            </p>
          </div>

          <div class="admin-layout">
            <section class="glass-card admin-card">
              <div class="admin-card__header">
                <h2>Prompt form</h2>
                <button class="ghost-button utility-button" id="newPromptButton" type="button">New prompt</button>
              </div>

              <form class="admin-form" id="adminPromptForm">
                <input id="promptId" name="id" type="hidden" />

                <label class="input-stack" for="promptSelect">
                  <span class="field-label">Edit existing prompt</span>
                  <select class="download-input" id="promptSelect">
                    <option value="">Create a new prompt</option>
                  </select>
                </label>

                <div class="admin-grid">
                  <label class="input-stack" for="promptTitle">
                    <span class="field-label">Title</span>
                    <input class="download-input" id="promptTitle" name="title" type="text" required />
                  </label>

                  <label class="input-stack" for="promptCategory">
                    <span class="field-label">Category</span>
                    <input class="download-input" id="promptCategory" name="category" type="text" required />
                  </label>
                </div>

                <div class="admin-grid">
                  <label class="input-stack" for="promptFormat">
                    <span class="field-label">Format</span>
                    <input class="download-input" id="promptFormat" name="format" type="text" required />
                  </label>

                  <label class="input-stack" for="promptImage">
                    <span class="field-label">Image path or URL</span>
                    <input class="download-input" id="promptImage" name="image" type="text" placeholder="/Assets/example.png or https://..." />
                  </label>
                </div>

                <label class="input-stack" for="promptImageFile">
                  <span class="field-label">Upload image</span>
                  <input class="download-input download-input--file" id="promptImageFile" name="imageFile" type="file" accept="image/*" />
                  <p class="input-hint">Upload a file to save it into the local <code>Assets/</code> folder automatically.</p>
                </label>

                <label class="input-stack" for="promptDescription">
                  <span class="field-label">Description</span>
                  <textarea class="download-input download-input--textarea" id="promptDescription" name="description" required></textarea>
                </label>

                <label class="input-stack" for="promptBody">
                  <span class="field-label">Prompt</span>
                  <textarea class="download-input download-input--textarea download-input--prompt" id="promptBody" name="prompt" required></textarea>
                </label>

                <label class="input-stack" for="promptTools">
                  <span class="field-label">Tools</span>
                  <textarea class="download-input download-input--textarea" id="promptTools" name="tools" placeholder="One per line or comma separated" required></textarea>
                </label>

                <label class="input-stack" for="promptTips">
                  <span class="field-label">Tips</span>
                  <textarea class="download-input download-input--textarea" id="promptTips" name="tips" required></textarea>
                </label>

                <label class="input-stack" for="promptVariations">
                  <span class="field-label">Variations</span>
                  <textarea class="download-input download-input--textarea" id="promptVariations" name="variations" placeholder="One variation per line"></textarea>
                </label>

                <div class="cta-row">
                  <button class="button button--primary" id="savePromptButton" type="submit">Save prompt</button>
                  <p class="admin-status" id="adminStatus" role="status" aria-live="polite"></p>
                </div>
              </form>
            </section>

            <aside class="glass-card admin-card admin-card--list">
              <div class="admin-card__header">
                <h2>Latest prompts</h2>
                <span class="pill" id="adminPromptCount">0 total</span>
              </div>
              <div class="admin-list" id="adminPromptList"></div>
            </aside>
          </div>
        </section>
      </main>
    </div>

    <script>
      window.promptVaultAdmin = {
        apiKey: ${JSON.stringify(adminWriteKey)}
      };
    </script>
    <script src="/admin.js"></script>
  </body>
</html>`;
}
