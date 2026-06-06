export interface LandingPageConfig {
  bookTitle: string;
  authorName: string;
  bookBlurb: string;
  bookCoverUrl: string;
  accentColor: string;
  launchDate: string;
  showCountdown: boolean;
  showEmailSignup: boolean;
  emailPlaceholder: string;
  ctaText: string;
  backgroundColor: string;
}

const STORAGE_KEY = "inkreach_landing";

export function getLandingConfig(): LandingPageConfig | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveLandingConfig(config: LandingPageConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}

export function buildLandingPageHTML(config: LandingPageConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${config.bookTitle} — Coming Soon</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: ${config.backgroundColor};
    color: #1a1a2e;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  .container {
    max-width: 900px;
    width: 100%;
    text-align: center;
  }
  .cover { max-width: 320px; width: 100%; border-radius: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); margin-bottom: 2rem; }
  h1 { font-family: 'Playfair Display', serif; font-size: 2.8rem; margin-bottom: 0.5rem; color: #1a1a2e; }
  .author { font-size: 1.1rem; color: #666; margin-bottom: 1.5rem; }
  .blurb { font-size: 1.05rem; line-height: 1.7; color: #444; max-width: 600px; margin: 0 auto 2rem; }
  .countdown { display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 2.5rem; flex-wrap: wrap; }
  .countdown-item { text-align: center; }
  .countdown-num { font-size: 2.5rem; font-weight: 700; color: ${config.accentColor}; line-height: 1; }
  .countdown-label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .email-form { display: flex; gap: 0.75rem; max-width: 450px; margin: 0 auto; flex-wrap: wrap; justify-content: center; }
  .email-form input {
    flex: 1; min-width: 220px; padding: 0.9rem 1.2rem; border: 2px solid #e0e0e0;
    border-radius: 8px; font-size: 1rem; outline: none; transition: border-color 0.2s;
  }
  .email-form input:focus { border-color: ${config.accentColor}; }
  .email-form button {
    background: ${config.accentColor}; color: white; border: none; padding: 0.9rem 1.8rem;
    border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s;
  }
  .email-form button:hover { opacity: 0.9; }
  .footer { margin-top: 2.5rem; font-size: 0.85rem; color: #999; }
</style>
</head>
<body>
<div class="container">
  ${config.bookCoverUrl ? `<img src="${config.bookCoverUrl}" alt="${config.bookTitle}" class="cover">` : ""}
  <h1>${config.bookTitle}</h1>
  <p class="author">by ${config.authorName}</p>
  ${config.bookBlurb ? `<p class="blurb">${config.bookBlurb}</p>` : ""}
  ${config.showCountdown && config.launchDate ? `
  <div class="countdown" id="countdown">
    <div class="countdown-item"><div class="countdown-num" id="days">00</div><div class="countdown-label">Days</div></div>
    <div class="countdown-item"><div class="countdown-num" id="hours">00</div><div class="countdown-label">Hours</div></div>
    <div class="countdown-item"><div class="countdown-num" id="minutes">00</div><div class="countdown-label">Minutes</div></div>
    <div class="countdown-item"><div class="countdown-num" id="seconds">00</div><div class="countdown-label">Seconds</div></div>
  </div>
  ` : ""}
  ${config.showEmailSignup ? `
  <form class="email-form" id="signup" action="#" method="post">
    <input type="email" id="email-input" placeholder="${config.emailPlaceholder || "your@email.com"}" required>
    <button type="submit">${config.ctaText || "Get Updates"}</button>
  </form>
  <p style="margin-top:0.75rem;font-size:0.8rem;color:#999;" id="form-message"></p>
  ` : ""}
  <p class="footer">Built with InkReach</p>
</div>
<script>
  ${config.showCountdown && config.launchDate ? `
  (function() {
    const launch = new Date("${config.launchDate}T00:00:00").getTime();
    function tick() {
      const now = new Date().getTime();
      const diff = launch - now;
      if (diff <= 0) { document.getElementById("countdown").innerHTML = "<p style='font-size:1.2rem;color:" + "${config.accentColor}" + ";font-weight:600;'>Now Available!</p>"; return; }
      document.getElementById("days").textContent = String(Math.floor(diff / (1000*60*60*24))).padStart(2,"0");
      document.getElementById("hours").textContent = String(Math.floor((diff%(1000*60*60*24))/(1000*60*60))).padStart(2,"0");
      document.getElementById("minutes").textContent = String(Math.floor((diff%(1000*60*60))/(1000*60))).padStart(2,"0");
      document.getElementById("seconds").textContent = String(Math.floor((diff%(1000*60))/(1000))).padStart(2,"0");
    }
    tick(); setInterval(tick, 1000);
  })();
  ` : ""}
  ${config.showEmailSignup ? `
  document.getElementById("signup")?.addEventListener("submit", function(e) {
    e.preventDefault();
    const email = document.getElementById("email-input").value;
    const msg = document.getElementById("form-message");
    const btn = this.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Sending...";
    fetch("/api/landing-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, bookTitle: "${config.bookTitle}" })
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.success) {
        msg.textContent = "Thanks! You're on the list.";
        msg.style.color = "${config.accentColor}";
      } else {
        msg.textContent = "Something went wrong. Try again.";
        msg.style.color = "#e74c3c";
        btn.disabled = false;
        btn.textContent = "${config.ctaText || "Get Updates"}";
      }
    }).catch(function() {
      msg.textContent = "Connection failed. Try again.";
      msg.style.color = "#e74c3c";
      btn.disabled = false;
      btn.textContent = "${config.ctaText || "Get Updates"}";
    });
  });
  ` : ""}
</script>
</body>
</html>`;
}

export function buildEmbedCode(config: LandingPageConfig): string {
  const html = buildLandingPageHTML(config);
  return `<iframe src="data:text/html;charset=utf-8,${encodeURIComponent(html)}" width="100%" height="600" frameborder="0" style="border:none;max-width:900px;margin:0 auto;display:block;"></iframe>`;
}
