# AI-Prompt-Vault

The downloader supports one global input for Instagram reels/posts, Instagram active story profile links, Facebook videos, YouTube videos/Shorts, and X/Twitter videos.

Instagram active story lists may require a server-side Instagram session because Instagram does not consistently expose story trays to anonymous requests. On Netlify, set either `INSTAGRAM_COOKIE` or `INSTAGRAM_SESSION_ID` when story-list fetching needs authenticated public-profile access.
