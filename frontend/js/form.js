// ── UTM Capture
const getUTMs = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get('utm_source') || sessionStorage.getItem('utm_source') || '',
    utm_medium: p.get('utm_medium') || sessionStorage.getItem('utm_medium') || '',
    utm_campaign: p.get('utm_campaign') || sessionStorage.getItem('utm_campaign') || '',
    utm_term: p.get('utm_term') || sessionStorage.getItem('utm_term') || '',
    utm_content: p.get('utm_content') || sessionStorage.getItem('utm_content') || '',
    refer_url: document.referrer || ''
  };
};
// Store UTMs in session
(()=>{ const p=new URLSearchParams(window.location.search); ['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(k=>{ if(p.get(k)) sessionStorage.setItem(k,p.get(k)); }); })();

// ── intl-tel-input init
let itiInstances = {};
const initITI = () => {
  document.querySelectorAll('input[type="tel"]').forEach((el, i) => {
    if (el._itiInit) return;
    el._itiInit = true;
    const id = el.id || 'phone_' + i;
    itiInstances[id] = window.intlTelInput(el, {
      initialCountry: 'in',
      separateDialCode: true,
      preferredCountries: ['in', 'ae', 'gb', 'us', 'sg'],
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js'
    });
  });
};
document.addEventListener('DOMContentLoaded', initITI);

// ── Form Submit Handler
const handleFormSubmit = async (formEl, sourceButton) => {
  const nameEl = formEl.querySelector('[name="name"]');
  const phoneEl = formEl.querySelector('[name="phone"]');
  const emailEl = formEl.querySelector('[name="email"]');
  const honeypot = formEl.querySelector('[name="_honey_trap"]');
  const btnEl = formEl.querySelector('[type="submit"]');

  // Honeypot
  if (honeypot && honeypot.value.trim() !== '') return;

  // Validate
  const name = nameEl?.value.trim() || '';
  const email = emailEl?.value.trim() || '';

  if (!name || name.length < 2) {
    showFieldError(nameEl, 'Please enter your full name.');
    return;
  }

  // Get phone with country code from iti
  let phone = phoneEl?.value.trim() || '';
  const phoneId = phoneEl?.id || 'phone_0';
  const iti = itiInstances[phoneId] || Object.values(itiInstances)[0];
  if (iti) {
    phone = iti.getNumber();
    if (!iti.isValidNumber()) {
      showFieldError(phoneEl, 'Please enter a valid phone number.');
      return;
    }
  } else if (phone.replace(/\D/g,'').length < 7) {
    showFieldError(phoneEl, 'Please enter a valid phone number.');
    return;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError(emailEl, 'Please enter a valid email address.');
    return;
  }

  // Disable button
  const origText = btnEl?.innerHTML || 'Submit';
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<span class="spinner"></span> Sending...'; }

  const utms = getUTMs();
  const payload = {
    name, phone, email,
    source_button: sourceButton || 'Website Form',
    page_url: window.location.href,
    _honey_trap: '',
    ...utms
  };

  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      // Fire GTM event
      if (window.dataLayer) window.dataLayer.push({ event: 'lead_submitted', source: sourceButton });
      // Redirect to thank you page for Google Ads conversion tracking
      window.location.href = 'thank-you.html';
    } else {
      showFormError(formEl, data.message || 'Something went wrong. Please try again.');
      if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origText; }
    }
  } catch (e) {
    showFormError(formEl, 'Network error. Please try again.');
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origText; }
  }
};

const showFieldError = (el, msg) => {
  if (!el) return;
  el.classList.add('error');
  let err = el.parentElement.querySelector('.field-error');
  if (!err) { err = document.createElement('span'); err.className = 'field-error'; el.parentElement.appendChild(err); }
  err.textContent = msg;
  el.focus();
  setTimeout(() => { el.classList.remove('error'); err.remove(); }, 4000);
};

const showFormSuccess = (formEl) => {
  formEl.innerHTML = `<div class="form-success"><div class="success-icon">✅</div><h3>Thank You!</h3><p>Our team will contact you within 24 hours.</p></div>`;
};

const showFormError = (formEl, msg) => {
  let err = formEl.querySelector('.form-error-msg');
  if (!err) { err = document.createElement('div'); err.className = 'form-error-msg'; formEl.appendChild(err); }
  err.textContent = msg;
  setTimeout(() => err.remove(), 5000);
};

// ── Bind all forms
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form[data-lead-form]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      handleFormSubmit(form, form.dataset.source || 'Website Form');
    });
  });
});
