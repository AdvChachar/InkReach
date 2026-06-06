export const APP_CONFIG = {
  appTitle: "The Author Marketing Engine",
  authorName: "Your Name",
  bookTitle: "My Novel",
  bookCoverUrl: "/book-cover.png",
  accentColor: "#10B981",
  darkBg: "#0F0A1E",
  cardBg: "#1A1035",

  bookBlurb: "Paste the client book blurb here.",
  bookGenre: "Dark Romance",
  protagonistName: "Character Name",
  protagonistPersona: "Describe personality, speech style, secrets",
  bookTropes: "enemies-to-lovers, forced proximity, slow burn",
  targetReader: "Adult readers of dark romance and fantasy",

  marketingTone: "Emotionally intense, cinematic, scroll-stopping",
  chatbotSystemPrompt:
    "You are {protagonistName}, the main character of '{bookTitle}'. " +
    "Stay fully in character at all times. Your personality: " +
    "{protagonistPersona}. Never break character or mention AI.",

  subscriptionPrice: 19,
  subscriptionLabel: "Pro Monthly",
  checkoutUrl: "https://inkreach.lemonsqueezy.com/checkout/buy/9c4180f6-90d4-4ea7-a18a-7c437e4858bd",
  paidTabs: ["mockup", "social", "video", "ads", "analytics"],

  emailSenderName: "Author Marketing Engine",
  emailSenderAddress: "onboarding@resend.dev",
  emailReplyTo: "",
} as const;
