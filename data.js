function createPreview(config) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" role="img" aria-label="${config.title}">
      <defs>
        <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${config.start}" />
          <stop offset="100%" stop-color="${config.end}" />
        </linearGradient>
        <radialGradient id="glow" cx="30%" cy="25%" r="65%">
          <stop offset="0%" stop-color="${config.glow}" stop-opacity="0.8" />
          <stop offset="100%" stop-color="${config.glow}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="900" height="1200" fill="url(#bg)" />
      <circle cx="200" cy="230" r="250" fill="url(#glow)" />
      <circle cx="750" cy="980" r="220" fill="url(#glow)" opacity="0.75" />
      <g opacity="0.3">
        <rect x="65" y="82" width="770" height="1036" rx="42" fill="none" stroke="white" stroke-width="2" />
        <rect x="105" y="122" width="690" height="956" rx="34" fill="none" stroke="white" stroke-width="1.5" />
      </g>
      <rect x="96" y="104" width="220" height="54" rx="27" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.22)" />
      <text x="128" y="139" fill="#ffffff" font-size="26" font-family="Arial, sans-serif" font-weight="700">${config.badge}</text>
      <text x="96" y="862" fill="#ffffff" font-size="78" font-family="Arial, sans-serif" font-weight="700">${config.lineOne}</text>
      <text x="96" y="946" fill="#ffffff" font-size="78" font-family="Arial, sans-serif" font-weight="700">${config.lineTwo}</text>
      <text x="100" y="1015" fill="rgba(255,255,255,0.84)" font-size="30" font-family="Arial, sans-serif">${config.caption}</text>
      <rect x="96" y="1054" width="238" height="56" rx="28" fill="rgba(5,5,10,0.28)" stroke="rgba(255,255,255,0.16)" />
      <text x="132" y="1090" fill="#ffffff" font-size="24" font-family="Arial, sans-serif">${config.tool}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const prompts = [
  {
    id: 1,
    title: "Cinematic Party Scene",
    category: "Image Generation",
    format: "9:16 visual prompt",
    description:
      "A high-energy nightlife visual designed for reels covers, teaser frames, and event promo edits.",
    image: "/Users/srinath-10489/Documents/AI Prompt Vault/Assets/Young man with cool water.png",
    // createPreview({
      title: "Cinematic Party Scene",
      badge: "Trending Visual",
      lineOne: "Cinematic",
      lineTwo: "Party Scene",
     caption: "Neon club lights, glossy crowd motion, premium lens look",
     tool: "Midjourney + ChatGPT",
    // start: "#10091f",
    // end: "#35127a",
    // glow: "#9e6eff"
    // }),
    prompt: `Use the above image for reference image
    
Ultra-realistic cinematic party scene poster, vertical composition (9.16 ratio), dramatic night atmosphere, shallow depth of field. A stylish South Indian young man standing in the center foreground, messy spikey hair, light beard, intense emotional expression with eyes closed as if lost in music. He is wearing a black jacket over a dark shirt, minimal accessories, masculine rugged look. He is holding a clear glass bottle upside down above his head, pouring liquid dramatically onto his hair and face. Water splashes frozen mid-air with ultra-detailed droplets, high shutter speed photography effect, sparkling highlights on droplets. The liquid streams down his hair and jacket, realistic wet texture and reflections. Behind him, a group of energetic young men dancing wildly, slightly motion-blurred to create depth and movement. They are holding green and brown glass bottles raised in the air. Party vibe, celebration mood, raw emotional energy. Background characters partially out of focus`, //`Ultra-realistic cinematic party scene inside a luxury rooftop club at midnight, neon violet edge lighting, glossy black surfaces, champagne sparkle bokeh, stylish crowd in motion blur, confident lead subject in focus, shallow depth of field, filmic contrast, premium editorial color grading, volumetric haze, captured like a viral nightlife reel thumbnail, hyper-detailed textures, dramatic highlights, clean skin tones, elegant framing --ar 9:16 --stylize 250`,
    tools: ["Midjourney", "ChatGPT"],
    tips:
      "Use this as your cover-frame prompt, then animate with subtle zoom and crowd noise in CapCut. Increasing stylize pushes the luxury editorial feel.",
    variations: [
      "Ultra-realistic dark neon warehouse party, electric blue lighting, fashion-forward crowd, fog beams, central subject sharply lit, premium music video aesthetic --ar 9:16",
      "Luxury afterparty inside a penthouse suite, moody amber highlights, glass reflections, velvet textures, cinematic social teaser composition --ar 9:16",
      "Open-air beach club at sunset into night, magenta sky glow, moving dancers, dreamy shallow focus, polished festival promo still --ar 9:16"
    ]
  },
  {
    id: 2,
    title: "Luxury Skincare Reel Hook",
    category: "Instagram Reels",
    format: "Hook script + visual angle",
    description:
      "A faceless short-form content prompt for premium skincare creators pushing a polished, saves-worthy hook.",
    image: createPreview({
      title: "Luxury Skincare Reel Hook",
      badge: "Reel Hook",
      lineOne: "Luxury",
      lineTwo: "Skincare Hook",
      caption: "Premium lighting, tactile textures, clean UGC-style pacing",
      tool: "ChatGPT + CapCut",
      start: "#0b0d17",
      end: "#1f5b72",
      glow: "#54e8ff"
    }),
    prompt: `Write a 15-second Instagram reel hook for a luxury skincare brand. The video is faceless and uses close-up product shots, creamy textures, soft window light, and elegant bathroom styling. The script should open with a curiosity gap, feel premium instead of salesy, and end with a subtle CTA that encourages viewers to save the reel. Provide an on-screen text hook, voiceover line, and 5 quick B-roll shot ideas.`,
    tools: ["ChatGPT", "CapCut", "Instagram"],
    tips:
      "Ask for 3 hook styles in one generation: curiosity, problem-solution, and aspiration. Then pair the strongest line with fast 0.5 to 0.8 second cuts.",
    variations: [
      "Rewrite the reel hook for a clinical dermatologist-backed brand with minimalist visuals and trust-building language.",
      "Create the same reel concept for a glass-skin night routine with a softer, feminine luxury tone.",
      "Turn this into a 20-second product ritual script with whispery ASMR cues and save-worthy text overlays."
    ]
  },
  {
    id: 3,
    title: "Anime Streetwear Portrait",
    category: "Image Generation",
    format: "Character art prompt",
    description:
      "A bold portrait prompt for posters, profile graphics, and punchy social carousels with a Gen Z art direction.",
    image: createPreview({
      title: "Anime Streetwear Portrait",
      badge: "Character Prompt",
      lineOne: "Anime",
      lineTwo: "Streetwear",
      caption: "Glossy anime rendering with fashion-forward urban energy",
      tool: "Midjourney + Leonardo",
      start: "#090a11",
      end: "#5d1d5b",
      glow: "#ff5fd2"
    }),
    prompt: `Stylized anime portrait of a confident streetwear creator standing under futuristic city signage, layered oversized jacket, reflective accessories, moody magenta and cyan rim light, expressive eyes, crisp linework, glossy cel-shading, rain-slick street reflections, bold composition with premium poster energy, high detail, social-media-ready character art --ar 4:5 --stylize 400`,
    tools: ["Midjourney", "Leonardo AI"],
    tips:
      "Add a creator niche to the subject styling like gaming, dance, or tech to make the portrait feel more ownable for a personal brand.",
    variations: [
      "Anime portrait inside a subway station with chrome details, cyber fashion styling, cool blue highlights, cinematic poster framing --ar 4:5",
      "Stylized fashion anime close-up with warm sunset flare, vintage sneakers, editorial magazine cover energy --ar 4:5",
      "Neo-Tokyo rooftop portrait, oversized varsity jacket, glowing billboards, high-contrast cel shading, trendy creator avatar aesthetic --ar 4:5"
    ]
  },
  {
    id: 4,
    title: "Viral Travel Montage Cut",
    category: "Video Editing",
    format: "Edit plan prompt",
    description:
      "A fast-cut travel edit system designed for retention-heavy reels with beat drops, speed ramps, and scroll-stopping transitions.",
    image: createPreview({
      title: "Viral Travel Montage Cut",
      badge: "Edit Blueprint",
      lineOne: "Travel",
      lineTwo: "Montage Cut",
      caption: "Fast pacing, scenic impact, beat-aware transition planning",
      tool: "ChatGPT + CapCut",
      start: "#081018",
      end: "#16486f",
      glow: "#5dcaff"
    }),
    prompt: `Create a 20-second travel reel edit blueprint using clips from airports, city streets, coffee shots, scenic drone footage, and one hotel room reveal. Structure it for high retention on Instagram. I need a second-by-second sequence, transition ideas, speed ramp suggestions, text overlay cues, and music moment recommendations. Make the pacing feel cinematic but social-native, with a strong opening 2 seconds and a satisfying final reveal.`,
    tools: ["ChatGPT", "CapCut", "Premiere Pro"],
    tips:
      "Paste your exact clip list into the prompt and ask for 3 pacing versions: calm cinematic, high-energy trend cut, and luxury storytelling.",
    variations: [
      "Rewrite this edit plan for a solo Europe itinerary with romantic visuals and slower emotional pacing.",
      "Turn this into a hotel-focused reel with room details, food, pool shots, and a luxe creator voiceover structure.",
      "Create a version optimized for a fast Afro-house beat with aggressive speed ramps and flash transitions."
    ]
  },
  {
    id: 5,
    title: "Faceless Productivity Reel",
    category: "Instagram Reels",
    format: "Script + shot prompt",
    description:
      "A polished productivity format for creators selling routines, templates, or digital products without appearing on camera.",
    image: createPreview({
      title: "Faceless Productivity Reel",
      badge: "Creator Prompt",
      lineOne: "Faceless",
      lineTwo: "Productivity",
      caption: "Desk setup, tight pacing, dopamine-friendly routine cues",
      tool: "ChatGPT + Notion",
      start: "#08090f",
      end: "#2b394d",
      glow: "#97adff"
    }),
    prompt: `Write a faceless Instagram reel script for creators who want to show a productive morning workflow without talking on camera. The reel should use desk setup shots, laptop close-ups, coffee making, to-do list scenes, and quick app screen recordings. Provide a 12-second structure with a high-performing hook, text overlays, B-roll sequence, and a low-pressure CTA that points viewers to a digital template or guide.`,
    tools: ["ChatGPT", "Notion", "CapCut"],
    tips:
      "Combine a pain-point hook with a reward outcome. Viewers stay longer when the first line promises a simpler system, not just motivation.",
    variations: [
      "Rewrite this for creators selling a notion planner with a more direct product-led CTA.",
      "Create the same reel idea for a student study routine with calmer visuals and late-night desk energy.",
      "Turn this into a work-from-home reset reel with organizing shots, ambient sounds, and a minimalist script."
    ]
  },
  {
    id: 6,
    title: "Neon Product Ad Loop",
    category: "Video Editing",
    format: "Motion concept prompt",
    description:
      "A punchy looping ad concept for tech, beauty, and accessories brands that want premium motion without a full 3D pipeline.",
    image: createPreview({
      title: "Neon Product Ad Loop",
      badge: "Ad Motion",
      lineOne: "Neon",
      lineTwo: "Product Loop",
      caption: "Reflective surfaces, luxury ad mood, seamless repetition",
      tool: "Runway + CapCut",
      start: "#06070b",
      end: "#411f90",
      glow: "#8a6dff"
    }),
    prompt: `Design a 10-second looping vertical ad concept for a premium product using dark reflective surfaces, neon edge lighting, floating particles, smooth camera orbits, and a final frame that can loop seamlessly back to the first shot. Provide shot descriptions, motion cues, sound design notes, and text overlay suggestions. Keep it premium, futuristic, and suitable for Instagram reels and Pinterest video pins.`,
    tools: ["Runway", "CapCut", "After Effects"],
    tips:
      "Ask for one hero motion and one texture motion per shot. That gives your edit depth without overcomplicating the final render pipeline.",
    variations: [
      "Create the same loop for a perfume bottle with smoky light beams and luxurious gold reflections.",
      "Rewrite this as a gaming headset ad with sharper motion, RGB glow, and punchier impact cuts.",
      "Build a skincare version with water droplets, floating glass surfaces, and soft aqua lighting."
    ]
  },
  {
    id: 7,
    title: "Pinterest Room Makeover",
    category: "Image Generation",
    format: "Interior makeover prompt",
    description:
      "A home decor concept prompt for highly shareable before-and-after style content and pin-friendly visual inspiration.",
    image: createPreview({
      title: "Pinterest Room Makeover",
      badge: "Decor Prompt",
      lineOne: "Room",
      lineTwo: "Makeover",
      caption: "Warm editorial interiors with pin-worthy styling details",
      tool: "Midjourney + ChatGPT",
      start: "#120d0a",
      end: "#7c5035",
      glow: "#ffba7a"
    }),
    prompt: `Editorial interior design visualization of a small bedroom makeover for a Pinterest-worthy creator apartment, warm neutral palette, sculptural lighting, textured bedding, natural wood details, layered decor, sunlight pouring through linen curtains, realistic styling, elevated but achievable aesthetic, crisp shadows, shot like a premium interiors magazine spread --ar 4:5 --stylize 175`,
    tools: ["Midjourney", "ChatGPT"],
    tips:
      "Include a precise room type and target aesthetic such as Japandi, quiet luxury, or eclectic modern to steer the composition more reliably.",
    variations: [
      "Small studio apartment office nook makeover, matte black accents, cozy lamp glow, Pinterest editorial realism --ar 4:5",
      "Teen bedroom makeover with creamy neutrals, curved mirror, soft morning light, elevated creator aesthetic --ar 4:5",
      "Living room refresh with olive tones, oversized art, organic shapes, realistic decor styling, magazine-ready framing --ar 4:5"
    ]
  },
  {
    id: 8,
    title: "Storytelling Launch Reel",
    category: "Instagram Reels",
    format: "Launch script framework",
    description:
      "A narrative reel formula for product drops, course launches, and creator offers that need emotional momentum before the CTA.",
    image: createPreview({
      title: "Storytelling Launch Reel",
      badge: "Launch Flow",
      lineOne: "Storytelling",
      lineTwo: "Launch Reel",
      caption: "Narrative hook, emotional build, clean digital product CTA",
      tool: "ChatGPT + CapCut",
      start: "#080912",
      end: "#3a2455",
      glow: "#d78bff"
    }),
    prompt: `Write a 25-second storytelling Instagram reel script for launching a digital product. The tone should feel honest, cinematic, and creator-led. Start with the frustration or turning point, build toward the breakthrough moment, then reveal the product as the system that helped. Include on-screen text, voiceover script, B-roll moments, and one elegant CTA that feels inviting rather than pushy.`,
    tools: ["ChatGPT", "CapCut", "Instagram"],
    tips:
      "The strongest launch reels zoom in on one specific turning point instead of summarizing your whole journey. Ask for emotional pacing, not just copywriting.",
    variations: [
      "Rewrite this for a prompt bundle launch with a sharper social-proof angle and a faster opening hook.",
      "Turn this into a calm founder-story reel for a template shop with minimalist visuals and slower pacing.",
      "Create a punchier creator-economy version for a YouTube audience with stronger contrast between old workflow and new system."
    ]
  }
];

window.prompts = prompts;
