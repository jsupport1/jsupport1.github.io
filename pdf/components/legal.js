/**
 * DailyPDFTask — Shared Legal Page JS
 * Handles: theme toggle, dynamic year, cookie banner
 */

// ── Theme (mirrors main app) ──────────────────────────────────
(function(){
  const html = document.documentElement;
  const btn  = document.getElementById('themeToggle');
  const KEY  = 'dpttheme';
  const t    = localStorage.getItem(KEY) || (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  html.dataset.theme = t;
  btn && btn.setAttribute('aria-checked', t === 'dark');

  function apply(theme){
    html.dataset.theme = theme;
    btn && btn.setAttribute('aria-checked', theme === 'dark');
    localStorage.setItem(KEY, theme);
  }

  btn && btn.addEventListener('click',   () => apply(html.dataset.theme === 'dark' ? 'light' : 'dark'));
  btn && btn.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); btn.click(); }});
})();

// ── Dynamic copyright year ────────────────────────────────────
const yearEl = document.getElementById('footerYear');
if(yearEl) yearEl.textContent = new Date().getFullYear();

// ── Dynamic last updated date ─────────────────────────────────
const lastUpdEl = document.getElementById('lastUpdatedDate');
if(lastUpdEl) {
  const now = new Date();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  lastUpdEl.textContent = now.toLocaleDateString('en-US', options);
  // Also update datetime attribute
  const iso = now.toISOString().split('T')[0];
  lastUpdEl.setAttribute('datetime', iso);
}

// ── Cookie banner ─────────────────────────────────────────────
(function(){
  const banner  = document.getElementById('cookieBanner');
  const accept  = document.getElementById('cbAccept');
  const decline = document.getElementById('cbDecline');
  const KEY     = 'dpt_cookie_consent';

  if(!banner || localStorage.getItem(KEY)) return;

  setTimeout(() => banner.classList.add('visible'), 800);

  accept  && accept.addEventListener('click',  () => { localStorage.setItem(KEY,'accepted');  banner.classList.remove('visible'); });
  decline && decline.addEventListener('click', () => { localStorage.setItem(KEY,'declined');  banner.classList.remove('visible'); });
})();

// ── Contact form — full validation + Formspree fetch + mailto fallback ───
(function(){
  const form       = document.getElementById('contactForm');
  if (!form) return;

  const success    = document.getElementById('formSuccess');
  const sending    = document.getElementById('formSending');
  const errorBox   = document.getElementById('formError');
  const errorMsg   = document.getElementById('formErrorMsg');
  const submitBtn  = document.getElementById('submitBtn');

  // ── Field-level validators ─────────────────────────────────
  const validators = {
    cName:    v => v.trim().length < 2  ? 'Please enter your full name (at least 2 characters).' : '',
    cEmail:   v => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Please enter a valid email address.' : '',
    cSubject: v => !v ? 'Please select a subject.' : '',
    cMsg:     v => v.trim().length < 10 ? 'Please write at least 10 characters.' : '',
    cConsent: v => !v ? 'You must agree to the Privacy Policy to send a message.' : '',
  };

  function validateField(id) {
    const el  = document.getElementById(id);
    const err = document.getElementById(id + 'Err');
    if (!el || !err) return true;
    const val = el.type === 'checkbox' ? el.checked : el.value;
    const msg = (validators[id] || (() => ''))(val);
    err.textContent   = msg;
    err.style.display = msg ? 'block' : 'none';
    el.style.borderColor = msg ? 'var(--rd)' : '';
    return !msg;
  }

  // Live validation on blur
  ['cName','cEmail','cSubject','cMsg','cConsent'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('blur',   () => validateField(id));
    el?.addEventListener('change', () => validateField(id));
    el?.addEventListener('input',  () => {
      // Clear error on input (don't re-validate mid-type)
      const err = document.getElementById(id + 'Err');
      if (err && err.textContent) validateField(id);
    });
  });

  // ── Submit handler ─────────────────────────────────────────
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Validate all fields
    const valid = ['cName','cEmail','cSubject','cMsg','cConsent']
      .map(id => validateField(id))
      .every(Boolean);

    if (!valid) {
      // Scroll to first error
      const firstErr = form.querySelector('[style*="block"]');
      firstErr?.closest('.fg, .consent-row')?.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }

    // Show sending state
    form.style.display     = 'none';
    if (sending)  sending.style.display  = 'block';
    if (errorBox) errorBox.style.display = 'none';

    const action = form.getAttribute('action') || '';
    const isFormspree = action.includes('formspree.io') && !action.includes('YOUR_FORM_ID');

    try {
      if (isFormspree) {
        // ── Formspree fetch submission ──────────────────────
        const data = new FormData(form);
        const resp = await fetch(action, {
          method: 'POST',
          body:   data,
          headers: { 'Accept': 'application/json' }
        });

        if (sending) sending.style.display = 'none';

        if (resp.ok) {
          if (success) success.style.display = 'block';
        } else {
          const json = await resp.json().catch(() => ({}));
          throw new Error(json.error || `Server returned ${resp.status}`);
        }

      } else {
        // ── Mailto fallback — opens email client ────────────
        // Build a formatted email body from form fields
        const name    = document.getElementById('cName')?.value.trim()    || '';
        const email   = document.getElementById('cEmail')?.value.trim()   || '';
        const phone   = document.getElementById('cPhone')?.value.trim()   || 'Not provided';
        const subject = document.getElementById('cSubject')?.value.trim() || 'General Enquiry';
        const msg     = document.getElementById('cMsg')?.value.trim()     || '';

        const body = encodeURIComponent(
          `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nMessage:\n${msg}\n\n---\nSent via DailyPDFTask contact form`
        );
        const mailtoLink = `mailto:jsupport1.tool@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;

        if (sending) sending.style.display = 'none';

        // Open mailto in a new tab to avoid navigating away
        const a = document.createElement('a');
        a.href   = mailtoLink;
        a.target = '_blank';
        a.rel    = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Show success message (user may still need to send from their email client)
        if (success) {
          success.querySelector('strong').textContent = '📧 Your email client has opened!';
          success.innerHTML += '<p style="margin-top:8px;font-size:.82rem;color:var(--t2c)">Review the pre-filled message and click Send in your email app. Or email us directly at <a href="mailto:jsupport1.tool@gmail.com" style="color:var(--v)">jsupport1.tool@gmail.com</a></p>';
          success.style.display = 'block';
        }

        // Tip: to avoid mailto and use Formspree, replace the form action:
        // form.setAttribute('action', 'https://formspree.io/f/YOUR_FORM_ID');
      }

    } catch (err) {
      if (sending)  sending.style.display  = 'none';
      form.style.display = 'block'; // Restore form so user can retry
      if (errorBox) {
        if (errorMsg) errorMsg.textContent = ` ${err.message || 'Please try again or email us directly at jsupport1.tool@gmail.com'}`;
        errorBox.style.display = 'block';
      }
      if (submitBtn) {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Try Again';
      }
    }
  });
})();
