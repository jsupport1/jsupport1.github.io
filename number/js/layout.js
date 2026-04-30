export function renderHeader(activePage = '') {
  const isRoot = activePage === 'home';
  const prefix = isRoot ? '' : '../';
  const pagePrefix = isRoot ? 'pages/' : './';
  const ctaBtn = (activePage === 'tool' || activePage === 'emi')
    ? ''
    : `<a href="${pagePrefix}tool.html" class="nav-link nav-cta" aria-label="Try the free converter">Try Free →</a>`;
  return `
<!-- Skip to main content (keyboard / screen-reader) -->
<a href="#main-content" class="sr-only"
  style="position:absolute;top:-99px;left:0;z-index:999;padding:0.5rem 1rem;background:var(--clr-accent);color:white;border-radius:0 0 var(--rad-sm) var(--rad-sm);transition:top 0.2s"
  onfocus="this.style.top='0'">Skip to main content</a>
<div class="offline-banner" id="offlineBanner" role="alert" aria-live="assertive">
  ⚡ You are offline — DailyNumberTask still works!
</div>
<header class="site-header" role="banner">
  <div class="container">
    <a href="${isRoot ? './index.html' : '../index.html'}" class="logo" aria-label="DailyNumberTask Home">
      <div class="logo__icon" aria-hidden="true">N</div>
      <span class="logo__name">Daily<span>Number</span>Task</span>
    </a>
    <nav class="site-nav" id="siteNav" role="navigation" aria-label="Main navigation">
      <a href="${isRoot ? './index.html' : '../index.html'}" class="nav-link ${activePage==='home'   ?'active':''}" aria-current="${activePage==='home'   ?'page':'false'}">Home</a>
      <a href="${pagePrefix}tool.html"           class="nav-link ${activePage==='tool'   ?'active':''}" aria-current="${activePage==='tool'   ?'page':'false'}">Converter</a>
      <a href="${pagePrefix}emi-calculator.html" class="nav-link ${activePage==='emi'    ?'active':''}" aria-current="${activePage==='emi'    ?'page':'false'}">EMI Calc</a>
      <a href="${pagePrefix}about.html"          class="nav-link ${activePage==='about'  ?'active':''}" aria-current="${activePage==='about'  ?'page':'false'}">About</a>
      <a href="${pagePrefix}blog.html"           class="nav-link ${activePage==='blog'   ?'active':''}" aria-current="${activePage==='blog'   ?'page':'false'}">Blog</a>
      <a href="${pagePrefix}contact.html"        class="nav-link ${activePage==='contact'?'active':''}" aria-current="${activePage==='contact'?'page':'false'}">Contact</a>
      ${ctaBtn}
      <!-- Social icons in nav (desktop) -->
      <div class="nav-social" aria-label="Follow us">
        <a href="https://www.youtube.com/@DailyNumberTask" target="_blank" rel="noopener noreferrer"
          class="nav-social-link nav-social-link--youtube"
          aria-label="DailyNumberTask on YouTube" title="YouTube">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5v-7l6.25 3.5-6.25 3.5z"/>
          </svg>
        </a>
        <a href="https://www.instagram.com/dailynumbertask" target="_blank" rel="noopener noreferrer"
          class="nav-social-link nav-social-link--instagram"
          aria-label="DailyNumberTask on Instagram" title="Instagram">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.2.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.1 3.2-1.7 4.8-4.9 4.9-1.2.1-1.6.1-4.8.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12c0-3.2 0-3.6.1-4.8C2.4 3.9 4 2.3 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1.0 8.3 0 8.7 0 12c0 3.3 0 3.7.1 4.9.2 4.4 2.6 6.8 7 7C8.3 24 8.7 24 12 24s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9 0-3.3 0-3.7-.1-4.9C23.7 2.7 21.3.3 16.9.1 15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/>
          </svg>
        </a>
      </div>
    </nav>
    <button class="hamburger" id="hamburger" aria-expanded="false" aria-controls="siteNav" aria-label="Open navigation menu">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>`;
}
export function renderFooter() {
  const year = new Date().getFullYear();
  const isRoot = document.querySelector('nav.breadcrumb') === null; // Simple heuristic: home page doesn't have breadcrumbs
  const pagePrefix = isRoot ? 'pages/' : './';
  return `
<footer class="site-footer" role="contentinfo">
  <div class="container">
    <!-- Footer Ad Slot (hidden via CSS .ad-slot { display:none }) -->
    <div class="ad-slot ad-slot--footer" aria-hidden="true">
      <ins class="adsbygoogle" style="display:block"
        data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" data-ad-slot="FOOTER_AD_SLOT"
        data-ad-format="auto" data-full-width-responsive="true"></ins>
    </div>
    <div class="footer-grid">
      <!-- Brand + social -->
      <div class="footer-brand">
        <div class="footer-brand__name">Daily<span>Number</span>Task</div>
        <p class="footer-brand__desc">Free, fast, privacy-first number tools — number-to-words converter &amp; EMI calculator. Works offline. No account needed.</p>
        <!-- Social links in footer -->
        <div class="social-links mt-2" aria-label="Follow DailyNumberTask">
          <a href="https://www.youtube.com/@DailyNumberTask" target="_blank" rel="noopener noreferrer"
            class="social-link social-link--youtube" aria-label="YouTube channel" title="YouTube">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5v-7l6.25 3.5-6.25 3.5z"/>
            </svg>
          </a>
          <a href="https://www.instagram.com/dailynumbertask" target="_blank" rel="noopener noreferrer"
            class="social-link social-link--instagram" aria-label="Instagram profile" title="Instagram">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.2.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.1 3.2-1.7 4.8-4.9 4.9-1.2.1-1.6.1-4.8.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12c0-3.2 0-3.6.1-4.8C2.4 3.9 4 2.3 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1.0 8.3 0 8.7 0 12c0 3.3 0 3.7.1 4.9.2 4.4 2.6 6.8 7 7C8.3 24 8.7 24 12 24s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9 0-3.3 0-3.7-.1-4.9C23.7 2.7 21.3.3 16.9.1 15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/>
            </svg>
          </a>
        </div>
      </div>
      <!-- Tools column — now includes EMI Calculator -->
      <div class="footer-col">
        <div class="footer-col__title">Tools</div>
        <ul class="footer-links">
          <li><a href="${pagePrefix}tool.html">Number to Words</a></li>
          <li><a href="${pagePrefix}tool.html">Currency Words</a></li>
          <li><a href="${pagePrefix}tool.html">Cheque Writing</a></li>
          <li><a href="${pagePrefix}tool.html">Roman Numerals</a></li>
          <li><a href="${pagePrefix}tool.html">Bulk Converter</a></li>
          <li><a href="${pagePrefix}emi-calculator.html">EMI Calculator</a></li>
          <li><a href="${pagePrefix}blog.html">Blog</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <div class="footer-col__title">Company</div>
        <ul class="footer-links">
          <li><a href="${pagePrefix}about.html">About Us</a></li>
          <li><a href="${pagePrefix}contact.html">Contact</a></li>
          <li>
            <a href="https://www.youtube.com/@DailyNumberTask" target="_blank" rel="noopener noreferrer">
              YouTube
            </a>
          </li>
          <li>
            <a href="https://www.instagram.com/dailynumbertask" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          </li>
        </ul>
      </div>
      <div class="footer-col">
        <div class="footer-col__title">Legal</div>
        <ul class="footer-links">
          <li><a href="${pagePrefix}privacy-policy.html">Privacy Policy</a></li>
          <li><a href="${pagePrefix}terms.html">Terms of Service</a></li>
          <li><a href="${pagePrefix}disclaimer.html">Disclaimer</a></li>
          <li><a href="${pagePrefix}cookie-policy.html">Cookie Policy</a></li>
          <li><a href="${pagePrefix}copyright.html">Copyright</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© ${year} DailyNumberTask. All rights reserved.</p>
      <p>Built with ❤️ · 100% browser-based · No data stored · Free forever</p>
    </div>
  </div>
</footer>
<!-- Toast notification -->
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<!-- Cookie Consent Banner (GDPR / AdSense compliance) -->
<div id="cookieBanner" role="dialog" aria-label="Cookie consent" aria-modal="false" style="
  display:none;position:fixed;bottom:0;left:0;right:0;
  background:var(--clr-ink);color:rgba(255,255,255,0.85);
  padding:1rem 1.5rem;z-index:200;
  box-shadow:0 -4px 20px rgba(0,0,0,0.2);">
  <div style="max-width:var(--max-w);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1.5rem;flex-wrap:wrap;">
    <p style="font-size:var(--sz-sm);margin:0;max-width:none;color:rgba(255,255,255,0.8);">
      We use cookies to serve ads and analyse traffic. By continuing, you agree to our
      <a href="${pagePrefix}cookie-policy.html" style="color:var(--clr-accent-2);">Cookie Policy</a> and
      <a href="${pagePrefix}privacy-policy.html" style="color:var(--clr-accent-2);">Privacy Policy</a>.
    </p>
    <div style="display:flex;gap:0.5rem;flex-shrink:0;">
      <button id="cookieDecline" class="btn btn--ghost btn--sm" style="color:rgba(255,255,255,0.6);border-color:rgba(255,255,255,0.2);">Decline</button>
      <button id="cookieAccept" class="btn btn--primary btn--sm">Accept &amp; Continue</button>
    </div>
  </div>
</div>`;
}
export function initLayout() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('siteNav');
  if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!open));
      hamburger.setAttribute('aria-label', open ? 'Open navigation menu' : 'Close navigation menu');
      nav.classList.toggle('mobile-menu', !open);
      nav.classList.toggle('open', !open);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && hamburger.getAttribute('aria-expanded') === 'true') {
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open navigation menu');
        nav.classList.remove('mobile-menu', 'open');
        hamburger.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (hamburger.getAttribute('aria-expanded') === 'true'
          && !nav.contains(e.target)
          && !hamburger.contains(e.target)) {
        hamburger.setAttribute('aria-expanded', 'false');
        nav.classList.remove('mobile-menu', 'open');
      }
    });
  }
  const updateOnlineStatus = () => {
    document.body.classList.toggle('offline', !navigator.onLine);
  };
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
  const adSlots = document.querySelectorAll('ins.adsbygoogle');
  try {
    adSlots.forEach(() => {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  } catch(e) {}
  const banner = document.getElementById('cookieBanner');
  if (banner) {
    const COOKIE_KEY = 'dnt_cookie_consent';
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      setTimeout(() => { banner.style.display = 'block'; }, 1200);
    }
    const acceptBtn  = document.getElementById('cookieAccept');
    const declineBtn = document.getElementById('cookieDecline');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        localStorage.setItem(COOKIE_KEY, 'accepted');
        banner.style.display = 'none';
      });
    }
    if (declineBtn) {
      declineBtn.addEventListener('click', () => {
        localStorage.setItem(COOKIE_KEY, 'declined');
        banner.style.display = 'none';
      });
    }
  }
}
export function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = '';
  if (type === 'success') {
    toast.textContent = '✓ ' + message;
    toast.className = 'toast success show';
  } else {
    toast.textContent = message;
    toast.className = 'toast show';
  }
  setTimeout(() => { toast.className = 'toast'; }, 2400);
}