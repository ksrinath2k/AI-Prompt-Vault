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
    image: "/Assets/Young man with cool water.png",
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
    title: "Pavazhamalli Trending Reel Hook",
    category: "Instagram Reels",
    format: "Hook script + visual angle",
    description:
      "Instagram trending Pavazhamalli reel hook formula with a cinematic lighting angle designed.",
    image: "/Assets/Pavazhamalli.png",
    // createPreview({
      title: "Pavazhamalli Trending Reel Hook",
      badge: "Reel Hook",
      lineOne: "Sun kisses",
      lineTwo: "Pavazhamalli Hook",
      caption: "Premium lighting, tactile textures, clean UGC-style pacing",
      tool: "ChatGPT + CapCut",
      // start: "#0b0d17",
      // end: "#1f5b72",
      // glow: "#54e8ff"
    // }),
    prompt: `Ultra-realistic cinematic collage of a young woman using the uploaded face exactly. The image is composed of multiple rectangular photo panels layered vertically and diagonally, creating a scrapbook-style layout. Each panel shows close-up and mid-shot portraits of the same girl in a dim indoor room.

Lighting: strong, warm, golden-orange direct flash lighting hitting the face from the front-left, creating high contrast, deep shadows, and a glowing skin effect. Background remains dark with visible window curtains slightly illuminated. Harsh highlights on cheekbones, nose, and lips. Slight film grain and soft blur for a dreamy vintage feel.

Color grading: intense amber, burnt orange, and golden tones dominating the entire image.

High saturation, slightly crushed blacks, and glowing highlights.

Subject styling: messy tied-back hair with loose strands falling on face, glossy lips, subtle eyeliner, dewy skin. Wearing a delicate necklace with small pendants and a casual off-shoulder
white top.

Composition details:
Top panel: serious expression, looking directly at camera.
Middle panel: cropped lips and necklace close-up.
Bottom left: extreme close-up of eyes with strong shadow split across face.
Bottom right: angled portrait with soft side gaze.
Panels overlap slightly with uneven spacing for aesthetic collage look.
Overlay elements: Add realistic flower stickers (lilies in orange, cream, and red tones) placed around the collage.
Add a music player Ut card in the center-left area with a soft rounded design.
Music player text: 
Title: "Pavazhamalli"
Artist: "Sai"
Include minimal playback bar and icons (play/pause, skip).
Final touches: Slight glow/bloom effect on highlights Subtle vignette around edges Flash photography look, like taken on a digital camera at night Maintain natural skin texture, avoid over-smoothing.`,
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
    title: "Spidy Women",
    category: "Image Generation",
    format: "Character art prompt",
    description:
      "A bold portrait prompt for posters, profile graphics, and punchy social carousels with a Gen Z art direction.",
    image: "/Assets/Spidy women.png",
    // createPreview({
      title: "Spidy Women",
      badge: "Character Prompt",
      lineOne: "Spider Women",
      lineTwo: "Spidy dress",
      caption: "Dressed in a red and blue Spider-Man bodysuit",
      tool: "Midjourney + Leonardo",
    //   start: "#090a11",
    //   end: "#5d1d5b",
    //   glow: "#ff5fd2"
    // }),
    prompt: `A realistic high-angle full-body shot of a young women with messy, textured black hair looking up at the camera. She is dressed in a red and blue Spider-Man bodysuit on his upper half, but wearing loose casual grey sweatpants on his lower half, white clean canvas shoes. She has a black backpack on his shoulders and is holding a red Spider-Man mask in his left hand. She is standing indoors on a grey marble tiled floor. The lighting is soft and natural, giving a casual 'Peter Parker after school' vibe.`,
    tools: ["Chatgpt", "Gemini"],
    // tips:
    //   "Add a creator niche to the subject styling like gaming, dance, or tech to make the portrait feel more ownable for a personal brand.",
    // variations: [
    //   "Anime portrait inside a subway station with chrome details, cyber fashion styling, cool blue highlights, cinematic poster framing --ar 4:5",
    //   "Stylized fashion anime close-up with warm sunset flare, vintage sneakers, editorial magazine cover energy --ar 4:5",
    //   "Neo-Tokyo rooftop portrait, oversized varsity jacket, glowing billboards, high-contrast cel shading, trendy creator avatar aesthetic --ar 4:5"
    // ]
  },
  {
    id: 4,
    title: "Viral Travel Montage Cut",
    category: "Image Generation",
    format: "Edit plan prompt",
    description:
      "A fast-cut travel edit system designed for retention-heavy reels with beat drops, speed ramps, and scroll-stopping transitions.",
    image: "/Assets/Child and current me.png",
    // createPreview({
      title: "Viral Travel Montage Cut",
      badge: "Edit Blueprint",
      lineOne: "Travel",
      lineTwo: "Montage Cut",
      caption: "Fast pacing, scenic impact, beat-aware transition planning",
      tool: "ChatGPT + CapCut",
    //   start: "#081018",
    //   end: "#16486f",
    //   glow: "#5dcaff"
    // }),
    prompt: `Using the images I'm going to upload to create a soft, emotional, black and white art. Let the formation be as follows :
On the left: a child version of me (from a childhood photo) looking with an innocent smile to the right, with
"2004 written above it.as black and white On the right: A present version of me (from a recent photo) sits with her right hand under her chin and looks at the child with a calm smile, with "2026" written above her.
As color photo the first uploaded pic purple color saree pic In the middle: a table with a simple, elegant birthday cake with number 21 on top.
Studio background: plain and soft (studio background) The lighting: Soft, cinematic, warm (even a black-and-white photo).
Style: Professional, minimal, emotional photography, focusing on feelings and visual communication between the two versions. Make the picture look so real like a real photoshoot. Keep my original features without changing.photo size 4:5.`,
    tools: ["ChatGPT", "CapCut", "Premiere Pro"],
    tips:
      "Paste your exact clip list into the prompt and ask for 3 pacing versions: calm cinematic, high-energy trend cut, and luxury storytelling.",
    variations: [
      "Rewrite this edit plan for a solo Europe itinerary with romantic visuals and slower emotional pacing.",
      "Turn this into a hotel-focused reel with room details, food, pool shots, and a luxe creator voiceover structure.",
      "Create a version optimized for a fast Afro-house beat with aggressive speed ramps and flash transitions."
    ]
  },

];

window.prompts = prompts;
