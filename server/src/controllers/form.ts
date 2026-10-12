import { FORM_CSS } from '../../../admin/src/form-css';
import { isSafeRedirect } from '../lib/embed';

const PLUGIN_ID = 'strapi-plugin-form-builder-cms';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function publicPageHtml(form: any): string {
  const title = escapeHtml(form.title || 'Form');
  const description = escapeHtml(form.description || '');
  const formId = form.id;
  // resolved theme vars → inline style on the card so it themes together with the form inside
  const tv = (form.settings && form.settings.themeVars) || {};
  const cardVars = Object.keys(tv)
    .map((k) => `${k}: ${String(tv[k]).replace(/[;{}<>]/g, '')}`)
    .join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--sfb-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      background: var(--sfb-page-bg, #f5f5f9);
      color: var(--sfb-text, #32324d);
      min-height: 100vh;
      display: flex;
      align-items: var(--sfb-page-align, flex-start);
      justify-content: center;
      padding: 48px 20px;
    }
    .card {
      background: var(--sfb-bg, #fff);
      color: var(--sfb-text, #32324d);
      border: var(--sfb-card-border, 1px solid var(--sfb-border, #dcdce4));
      border-radius: var(--sfb-card-radius, 14px);
      box-shadow: var(--sfb-shadow, none);
      padding: 40px 48px;
      width: 100%;
      max-width: var(--sfb-form-width, 640px);
    }
    h1 { font-size: 22px; font-weight: 700; margin: 0 0 6px; }
    .desc { font-size: 14px; color: var(--sfb-muted, #666687); margin: 0 0 28px; }
    @media (max-width: 600px) { .card { padding: 28px 20px; } }
    body { ${cardVars} }
  </style>
</head>
<body>
  <div class="card"${form.settings && form.settings.theme && form.settings.theme.fieldStyle ? ` data-sfb-fields="${form.settings.theme.fieldStyle}"` : ''}>
    <h1>${title}</h1>
    ${description ? `<p class="desc">${description}</p>` : ''}
    <div id="sfb-form-${formId}"></div>
  </div>
  <script
    src="/api/strapi-plugin-form-builder-cms/embed.js"
    data-form-id="${formId}"
    async
  ></script>
</body>
</html>`;
}

function embedScript(): string {
  return `(function () {
  var PLUGIN = 'strapi-plugin-form-builder-cms';
  var isSafeRedirect = ${isSafeRedirect.toString()};

  function init() {
    document.querySelectorAll('script[data-form-id]').forEach(function (script) {
      var formId = script.getAttribute('data-form-id');
      var target = document.getElementById('sfb-form-' + formId);
      if (!target) return;

      var base = new URL(script.src).origin;
      injectStyles();

      fetch(base + '/api/' + PLUGIN + '/forms/' + formId + '/embed-schema')
        .then(function (r) { return r.json(); })
        .then(function (resp) {
          var form = resp && resp.data;
          if (!form) { target.textContent = 'Form not found.'; return; }
          mount(target, form, base);
        })
        .catch(function () { target.textContent = 'Could not load form.'; });
    });
  }

  function mount(el, form, base) {
    var startDate = form.settings && form.settings.startDate;
    if (startDate && new Date() < new Date(startDate)) {
      var wrapStart = document.createElement('div');
      wrapStart.className = 'sfb-form';
      if (form.settings && form.settings.themeVars) {
        var tvs = form.settings.themeVars;
        for (var ks in tvs) { if (Object.prototype.hasOwnProperty.call(tvs, ks)) wrapStart.style.setProperty(ks, tvs[ks]); }
      }
      var startMsg = document.createElement('p');
      startMsg.className = 'sfb-error sfb-not-started';
      startMsg.textContent = 'This form is not yet accepting responses.';
      wrapStart.appendChild(startMsg);
      el.innerHTML = '';
      el.appendChild(wrapStart);
      return;
    }

    var expiryDate = form.settings && form.settings.expiryDate;
    if (expiryDate && new Date() >= new Date(expiryDate)) {
      var wrap = document.createElement('div');
      wrap.className = 'sfb-form';
      if (form.settings && form.settings.themeVars) {
        var tv = form.settings.themeVars;
        for (var k in tv) { if (Object.prototype.hasOwnProperty.call(tv, k)) wrap.style.setProperty(k, tv[k]); }
      }
      var expMsg = document.createElement('p');
      expMsg.className = 'sfb-error sfb-expired';
      expMsg.textContent = 'This form has expired and is no longer accepting responses.';
      wrap.appendChild(expMsg);
      el.innerHTML = '';
      el.appendChild(wrap);
      return;
    }

    var formEl = document.createElement('form');
    formEl.className = 'sfb-form';
    // let the plugin's own validation + server errors drive messages instead of
    // the browser's native required bubble
    formEl.noValidate = true;

    // apply the form's resolved theme (variables + the field-style variant attribute)
    if (form.settings && form.settings.themeVars) {
      var tv = form.settings.themeVars;
      for (var k in tv) { if (Object.prototype.hasOwnProperty.call(tv, k)) formEl.style.setProperty(k, tv[k]); }
    }
    if (form.settings && form.settings.theme && form.settings.theme.fieldStyle) {
      formEl.setAttribute('data-sfb-fields', form.settings.theme.fieldStyle);
    }

    var captchaCfg = (form.settings && form.settings.captcha) || null;
    var captchaOn = !!(captchaCfg && captchaCfg.provider && captchaCfg.provider !== 'none' && captchaCfg.siteKey);

    // honeypot: hidden field bots tend to fill; humans never see it
    if (form.settings && form.settings.enableHoneypot) {
      var hp = document.createElement('input');
      hp.type = 'text';
      hp.name = '_fc_hp';
      hp.tabIndex = -1;
      hp.autocomplete = 'off';
      hp.setAttribute('aria-hidden', 'true');
      hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
      formEl.appendChild(hp);
    }

    var grid = document.createElement('div');
    grid.className = 'sfb-grid';
    (form.fields || []).forEach(function (field) {
      var node = renderField(field);
      if (node) grid.appendChild(node);
    });
    formEl.appendChild(grid);

    // hidden tracking fields: value comes from a URL query param (e.g. ?utm_source=…)
    // falling back to a configured default. Never visible; submitted + stored like any field.
    var params = new URLSearchParams(window.location.search);
    (form.fields || []).forEach(function (field) {
      if (field.type === 'hidden') {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.name = field.name;
        var val = field.defaultValue != null ? String(field.defaultValue) : '';
        if (field.queryParam && params.get(field.queryParam) !== null) val = params.get(field.queryParam);
        hidden.value = val;
        formEl.appendChild(hidden);
      } else if (field.type === 'calculated') {
        var hiddenCalc = document.createElement('input');
        hiddenCalc.type = 'hidden';
        hiddenCalc.name = field.name;
        hiddenCalc.setAttribute('data-field-type', 'calculated');
        hiddenCalc.setAttribute('data-formula', field.formula || '');
        if (field.min !== undefined && field.min !== null) hiddenCalc.setAttribute('data-min', String(field.min));
        if (field.max !== undefined && field.max !== null) hiddenCalc.setAttribute('data-max', String(field.max));
        hiddenCalc.value = '0';
        formEl.appendChild(hiddenCalc);
      }
    });

    if (captchaOn) mountCaptcha(formEl, captchaCfg);

    var hasPayment = (form.fields || []).some(function (f) { return f.type === 'payment'; });
    var btn = null;
    if (!hasPayment) {
      btn = document.createElement('button');
      btn.type = 'submit';
      btn.className = 'sfb-btn';
      btn.textContent = (form.settings && form.settings.submitButtonText) || 'Submit';
      formEl.appendChild(btn);
    }

    function evaluateFormula(formula, data, min, max) {
      if (!formula || typeof formula !== 'string' || !formula.trim()) return 0;
      var expr = formula.replace(/\{([a-zA-Z0-9_-]+)\}/g, function (_, k) {
        var v = data[k];
        if (v === undefined || v === null || v === '') return '0';
        if (Array.isArray(v)) return String(v.length);
        var n = Number(v);
        return isNaN(n) ? '0' : String(n);
      });
      var stripped = expr.replace(/\bMath\.(floor|ceil|round|abs|min|max|pow)\b/g, '');
      if (/[a-zA-Z_$]/.test(stripped)) return 0;
      try {
        var fn = new Function('Math', 'return (' + expr + ');');
        var res = fn(Math);
        res = (typeof res === 'number' && !isNaN(res) && isFinite(res)) ? res : 0;
        if (min !== undefined && min !== null && !isNaN(Number(min))) res = Math.max(Number(min), res);
        if (max !== undefined && max !== null && !isNaN(Number(max))) res = Math.min(Number(max), res);
        return res;
      } catch (err) {
        return 0;
      }
    }

    function recalculateFormulas() {
      var currentData = {};
      new FormData(formEl).forEach(function (v, k) {
        if (!k.endsWith('[]')) {
          currentData[k] = v;
        }
      });

      // Auto-compute field values for fields with data-logic-formula
      formEl.querySelectorAll('.sfb-field[data-logic-formula]').forEach(function (fieldWrapper) {
        var lFormula = fieldWrapper.getAttribute('data-logic-formula') || '';
        var fName = fieldWrapper.getAttribute('data-field-name');
        var inp = fieldWrapper.querySelector('input, select, textarea');
        if (inp && lFormula) {
          var computed = evaluateFormula(lFormula, currentData);
          inp.value = computed;
          currentData[fName] = computed;
        }
      });

      // Field Logic Tab Dynamic Constraints
      formEl.querySelectorAll('.sfb-field').forEach(function (fieldWrapper) {
        var maxFormula = fieldWrapper.getAttribute('data-logic-max-formula');
        var minFormula = fieldWrapper.getAttribute('data-logic-min-formula');
        if (!maxFormula && !minFormula) return;

        var fName = fieldWrapper.getAttribute('data-field-name');
        var customError = fieldWrapper.getAttribute('data-logic-error-message');
        var inp = fieldWrapper.querySelector('input, select, textarea');
        var val = inp ? Number(inp.value) : NaN;

        var existingErr = fieldWrapper.querySelector('.sfb-dynamic-limit-error');
        if (existingErr) existingErr.remove();

        var errMsg = null;
        if (maxFormula && !isNaN(val)) {
          var maxLimit = evaluateFormula(maxFormula, currentData);
          if (val > maxLimit) {
            var labelEl = fieldWrapper.querySelector('.sfb-label');
            var labelText = (labelEl ? labelEl.textContent : fName).replace('*', '').trim();
            errMsg = customError || (labelText + ' cannot exceed ' + maxLimit);
          }
        }
        if (!errMsg && minFormula && !isNaN(val)) {
          var minLimit = evaluateFormula(minFormula, currentData);
          if (val < minLimit) {
            var labelEl2 = fieldWrapper.querySelector('.sfb-label');
            var labelText2 = (labelEl2 ? labelEl2.textContent : fName).replace('*', '').trim();
            errMsg = customError || (labelText2 + ' must be at least ' + minLimit);
          }
        }

        if (errMsg) {
          fieldWrapper.classList.add('sfb-field--error');
          var errEl = document.createElement('p');
          errEl.className = 'sfb-field-error sfb-dynamic-limit-error';
          errEl.textContent = errMsg;
          fieldWrapper.appendChild(errEl);
        } else if (!fieldWrapper.querySelector('.sfb-field-error:not(.sfb-dynamic-limit-error)')) {
          fieldWrapper.classList.remove('sfb-field--error');
        }
      });

      formEl.querySelectorAll('input[data-field-type="calculated"]').forEach(function (calcInp) {
        var formula = calcInp.getAttribute('data-formula') || '';
        var minAttr = calcInp.getAttribute('data-min');
        var maxAttr = calcInp.getAttribute('data-max');
        var minVal = minAttr !== null ? Number(minAttr) : undefined;
        var maxVal = maxAttr !== null ? Number(maxAttr) : undefined;
        var prefix = calcInp.getAttribute('data-prefix') || '';
        var suffix = calcInp.getAttribute('data-suffix') || '';
        var decimals = parseInt(calcInp.getAttribute('data-decimals') || '0', 10) || 0;

        var computed = evaluateFormula(formula, currentData, minVal, maxVal);
        var fieldName = calcInp.name;
        if (fieldName) {
          currentData[fieldName] = computed;
        }
        var formatted = prefix + Number(computed.toFixed(decimals)).toLocaleString() + suffix;
        calcInp.value = formatted;
        calcInp.setAttribute('data-computed-value', String(computed));
      });

      formEl.querySelectorAll('.sfb-payment-placeholder[data-amount-type="calculated"]').forEach(function (pBox) {
        var pFormula = pBox.getAttribute('data-amount-formula') || '';
        var pCur = pBox.getAttribute('data-currency') || 'USD';
        var pComputed = evaluateFormula(pFormula, currentData);
        var amtEl = pBox.querySelector('.sfb-payment-amount');
        if (amtEl) {
          amtEl.textContent = pCur + ' ' + Number(pComputed).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        pBox.setAttribute('data-current-amount', String(pComputed));
      });
    }

    formEl.addEventListener('input', recalculateFormulas);
    formEl.addEventListener('change', recalculateFormulas);
    recalculateFormulas();

    function clearErrors() {
      formEl.querySelectorAll('.sfb-field-error').forEach(function (el) { el.remove(); });
      formEl.querySelectorAll('.sfb-field').forEach(function (el) { el.classList.remove('sfb-field--error'); });
      var ge = formEl.querySelector('.sfb-error');
      if (ge) ge.remove();
    }

    function showFieldErrors(errors) {
      Object.keys(errors).forEach(function (name) {
        var fieldEl = formEl.querySelector('[data-field-name="' + name + '"]');
        if (!fieldEl) return;
        fieldEl.classList.add('sfb-field--error');
        var errEl = document.createElement('p');
        errEl.className = 'sfb-field-error';
        errEl.textContent = errors[name][0];
        fieldEl.appendChild(errEl);
      });
    }

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      clearErrors();
      recalculateFormulas();
      if (formEl.querySelector('.sfb-dynamic-limit-error')) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = (form.settings && form.settings.submitButtonText) || 'Submit';
        }
        return;
      }
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Sending…';
      }

      // collect form data, handling checkbox-group arrays
      var data = {};
      new FormData(formEl).forEach(function (v, k) {
        if (k.endsWith('[]')) {
          var name = k.slice(0, -2);
          if (!data[name]) data[name] = [];
          data[name].push(v);
        } else {
          data[k] = v;
        }
      });

      // normalize the provider's token field to a single key the server expects
      if (captchaOn) {
        data._fc_captcha = data['cf-turnstile-response'] || data['g-recaptcha-response'] || '';
        delete data['cf-turnstile-response'];
        delete data['g-recaptcha-response'];

        // client-side guard: don't even hit the server without a challenge token
        if (!data._fc_captcha) {
          if (btn) {
            btn.disabled = false;
            btn.textContent = submitText;
          }
          var ce = document.createElement('p');
          ce.className = 'sfb-error';
          ce.textContent = 'Please complete the verification challenge.';
          if (btn) formEl.insertBefore(ce, btn);
          else formEl.appendChild(ce);
          return;
        }
      }

      fetch(base + '/api/' + PLUGIN + '/forms/' + form.slug + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: data }),
      })
        .then(function (r) {
          return r.json().then(function (body) {
            if (!r.ok) return Promise.reject(body);
            return body;
          });
        })
        .then(function () {
          // redirect after submit, if configured — only to an http(s) or relative URL,
          // so a "javascript:"/"data:" value can never run as an open-redirect/XSS.
          var redirect = form.settings && form.settings.redirectUrl;
          if (redirect && isSafeRedirect(redirect, window.location.href)) { window.location.href = redirect; return; }
          // otherwise show the success message — wrapped in .sfb-form + re-applying the
          // theme so it stays styled (the themed <form> we just cleared is gone)
          var wrap = document.createElement('div');
          wrap.className = 'sfb-form';
          if (form.settings && form.settings.themeVars) {
            var stv = form.settings.themeVars;
            for (var sk in stv) { if (Object.prototype.hasOwnProperty.call(stv, sk)) wrap.style.setProperty(sk, stv[sk]); }
          }
          var msg = document.createElement('p');
          msg.className = 'sfb-success';
          msg.textContent = (form.settings && form.settings.successMessage) || 'Form submitted successfully';
          wrap.appendChild(msg);
          el.innerHTML = '';
          el.appendChild(wrap);
        })
        .catch(function (body) {
          if (btn) {
            btn.disabled = false;
            btn.textContent = submitText;
          }
          // captcha tokens are single-use — reset the widget so the user can retry
          if (captchaOn && captchaCfg.provider === 'turnstile' && window.turnstile) window.turnstile.reset();
          if (captchaOn && captchaCfg.provider === 'recaptcha' && window.grecaptcha) window.grecaptcha.reset();
          if (body && body.errors && Object.keys(body.errors).length > 0) {
            showFieldErrors(body.errors);
          } else {
            var errEl = document.createElement('p');
            errEl.className = 'sfb-error';
            errEl.textContent = (body && body.message) ? body.message : 'Something went wrong. Please try again.';
            if (btn) formEl.insertBefore(errEl, btn);
            else formEl.appendChild(errEl);
          }
        });
    });

    el.innerHTML = '';
    el.appendChild(formEl);
  }

  function renderField(field) {
    if (field.type === 'hidden' || field.type === 'calculated') return null;

    if (field.type === 'divider') {
      var hr = document.createElement('hr');
      hr.className = 'sfb-divider';
      if (field.cssClass) hr.className += ' ' + field.cssClass;
      hr.style.gridColumn = '1 / -1';
      return hr;
    }

    if (field.type === 'heading') {
      var h = document.createElement('p');
      h.className = 'sfb-heading';
      if (field.cssClass) h.className += ' ' + field.cssClass;
      h.style.gridColumn = '1 / -1';
      h.textContent = field.label || '';
      return h;
    }

    if (field.type === 'paragraph') {
      var p = document.createElement('p');
      p.className = 'sfb-paragraph';
      if (field.cssClass) p.className += ' ' + field.cssClass;
      p.style.gridColumn = '1 / -1';
      p.textContent = field.label || '';
      return p;
    }

    var wrapper = document.createElement('div');
    wrapper.className = 'sfb-field';
    if (field.cssClass) wrapper.className += ' ' + field.cssClass;
    wrapper.setAttribute('data-field-name', field.name);
    if (field.validation && field.validation.length) {
      wrapper.setAttribute('data-validation', JSON.stringify(field.validation));
    }
    if (field.logicFormula) wrapper.setAttribute('data-logic-formula', field.logicFormula);
    if (field.logicMaxFormula) wrapper.setAttribute('data-logic-max-formula', field.logicMaxFormula);
    if (field.logicMinFormula) wrapper.setAttribute('data-logic-min-formula', field.logicMinFormula);
    if (field.logicErrorMessage) wrapper.setAttribute('data-logic-error-message', field.logicErrorMessage);
    if (field.width !== 'half') wrapper.style.gridColumn = '1 / -1';

    if (field.type !== 'checkbox') {
      var label = document.createElement('label');
      label.className = 'sfb-label';
      label.htmlFor = 'sfb-' + field.id;
      label.textContent = field.label || '';
      if (field.required) {
        var req = document.createElement('span');
        req.className = 'sfb-required';
        req.textContent = ' *';
        label.appendChild(req);
      }
      wrapper.appendChild(label);
    }

    var input = buildInput(field);
    if (input) wrapper.appendChild(input);

    if (field.helpText) {
      var help = document.createElement('p');
      help.className = 'sfb-help';
      help.textContent = field.helpText;
      wrapper.appendChild(help);
    }

    return wrapper;
  }

  function buildInput(field) {
    var id = 'sfb-' + field.id;

    function applyValidationAttrs(el, rules) {
      (rules || []).forEach(function (rule) {
        if (rule.type === 'min' && rule.value != null && rule.value !== '') el.min = rule.value;
        if (rule.type === 'max' && rule.value != null && rule.value !== '') el.max = rule.value;
        if (rule.type === 'minLength' && rule.value != null && rule.value !== '') el.minLength = Number(rule.value);
        if (rule.type === 'maxLength' && rule.value != null && rule.value !== '') el.maxLength = Number(rule.value);
        if (rule.type === 'pattern' && rule.value) el.pattern = rule.value;
      });
    }

    if (field.type === 'textarea') {
      var ta = document.createElement('textarea');
      ta.id = id; ta.name = field.name; ta.className = 'sfb-input';
      ta.placeholder = field.placeholder || '';
      ta.required = !!field.required;
      ta.rows = 4;
      applyValidationAttrs(ta, field.validation);
      return ta;
    }

    if (field.type === 'select' || field.type === 'state' || field.type === 'dynamic-select') {
      var sel = document.createElement('select');
      sel.id = id; sel.name = field.name; sel.className = 'sfb-input';
      sel.required = !!field.required;
      var def = document.createElement('option');
      def.value = ''; def.textContent = field.placeholder || 'Select an option…';
      sel.appendChild(def);
      (field.options || []).forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.value; opt.textContent = o.label || o.value;
        sel.appendChild(opt);
      });

      if (field.min !== undefined && field.max !== undefined) {
        sel.setAttribute('data-child-type', field.childType || 'text');
        sel.setAttribute('data-child-required', 'true');
        if (field.childMinLength) sel.setAttribute('data-child-min-length', String(field.childMinLength));
        if (field.childMaxLength) sel.setAttribute('data-child-max-length', String(field.childMaxLength));
        if (field.childPattern) sel.setAttribute('data-child-pattern', field.childPattern);
        if (field.itemLabel) sel.setAttribute('data-child-label', field.itemLabel);
        if (field.itemPlaceholder) sel.setAttribute('data-child-placeholder', field.itemPlaceholder);

        var wrap = document.createElement('div');
        wrap.className = 'sfb-dynamic-wrap';
        wrap.appendChild(sel);
        var childContainer = document.createElement('div');
        childContainer.className = 'sfb-dynamic-container';
        childContainer.style.marginTop = '10px';
        childContainer.style.display = 'grid';
        childContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
        childContainer.style.gap = '10px';
        wrap.appendChild(childContainer);

        var childKey = field.itemLabel || field.name;
        var itemLabel = field.itemLabel || 'Item';

        sel.addEventListener('change', function () {
          var count = parseInt(sel.value, 10) || 0;
          var existingInputs = childContainer.querySelectorAll('input');
          var oldVals = [];
          existingInputs.forEach(function (inp) { oldVals.push(inp.value); });
          childContainer.innerHTML = '';
          for (var i = 1; i <= count; i++) {
            var row = document.createElement('div');
            row.className = 'sfb-field sfb-dynamic-child-row';
            row.style.marginBottom = '8px';
            var lbl = document.createElement('label');
            lbl.className = 'sfb-label';
            lbl.textContent = itemLabel + ' #' + i + ' *';
            var inp = document.createElement('input');
            inp.type = field.childType || 'text';
            inp.name = childKey + '[]';
            inp.value = oldVals[i - 1] || '';
            inp.placeholder = field.itemPlaceholder ? (field.itemPlaceholder + ' ' + i) : ('Enter ' + itemLabel + ' #' + i);
            inp.className = 'sfb-input';
            inp.required = true;
            if (field.childMinLength) inp.minLength = Number(field.childMinLength);
            if (field.childMaxLength) inp.maxLength = Number(field.childMaxLength);
            if (field.childPattern) inp.pattern = field.childPattern;
            row.appendChild(lbl);
            row.appendChild(inp);
            childContainer.appendChild(row);
          }
        });
        return wrap;
      }

      return sel;
    }

    if (field.type === 'radio') {
      var group = document.createElement('div');
      group.className = 'sfb-radio-group';
      (field.options || []).forEach(function (o) {
        var lbl = document.createElement('label');
        lbl.className = 'sfb-radio-label';
        var inp = document.createElement('input');
        inp.type = 'radio'; inp.name = field.name; inp.value = o.value;
        inp.required = !!field.required;
        lbl.appendChild(inp);
        lbl.appendChild(document.createTextNode(o.label || o.value));
        group.appendChild(lbl);
      });
      return group;
    }

    if (field.type === 'checkbox-group') {
      var cgroup = document.createElement('div');
      cgroup.className = 'sfb-radio-group';
      (field.options || []).forEach(function (o) {
        var lbl = document.createElement('label');
        lbl.className = 'sfb-radio-label';
        var inp = document.createElement('input');
        inp.type = 'checkbox'; inp.name = field.name + '[]'; inp.value = o.value;
        lbl.appendChild(inp);
        lbl.appendChild(document.createTextNode(o.label || o.value));
        cgroup.appendChild(lbl);
      });
      return cgroup;
    }

    if (field.type === 'checkbox') {
      var clbl = document.createElement('label');
      clbl.className = 'sfb-checkbox-label';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = id; cb.name = field.name; cb.value = '1';
      cb.required = !!field.required;
      clbl.appendChild(cb);
      clbl.appendChild(document.createTextNode(' ' + (field.label || '')));
      return clbl;
    }

    if (field.type === 'payment') {
      var p = field.payment || { provider: 'paypal', amount: 1, currency: 'USD', description: '' };
      var box = document.createElement('div');
      box.className = 'sfb-payment-placeholder';
      box.setAttribute('data-field-name', field.name);
      box.setAttribute('data-provider', p.provider || 'paypal');
      box.setAttribute('data-currency', p.currency || 'USD');
      box.setAttribute('data-amount-type', p.amountType || 'fixed');
      if (p.amountType === 'calculated' && p.amountFormula) {
        box.setAttribute('data-amount-formula', p.amountFormula);
      }
      box.style.cssText = 'border:1px solid #dcdce4;border-radius:6px;padding:12px 14px;background:#f6f6f9;display:flex;flex-direction:column;gap:8px;';
      if (p.description) {
        var pDesc = document.createElement('div');
        pDesc.style.cssText = 'font-size:12px;color:#666687;';
        pDesc.textContent = p.description;
        box.appendChild(pDesc);
      }
      var pAmt = document.createElement('div');
      pAmt.className = 'sfb-payment-amount';
      pAmt.style.cssText = 'font-size:16px;font-weight:700;color:#32324d;';
      pAmt.textContent = (p.currency || 'USD') + ' ' + Number(p.amount ?? 1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      box.appendChild(pAmt);
      var pBtn = document.createElement('button');
      pBtn.type = 'button';
      pBtn.disabled = true;
      pBtn.style.cssText = 'height:38px;background:#0070ba;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:not-allowed;opacity:0.85;';
      pBtn.textContent = 'Pay with PayPal';
      box.appendChild(pBtn);
      return box;
    }

    var typeMap = { text:'text', email:'email', number:'number', phone:'tel',
                    password:'password', url:'url', date:'date', time:'time' };
    var inp2 = document.createElement('input');
    inp2.type = typeMap[field.type] || 'text';
    inp2.id = id; inp2.name = field.name; inp2.className = 'sfb-input';
    inp2.placeholder = field.placeholder || '';
    inp2.required = !!field.required;
    applyValidationAttrs(inp2, field.validation);
    return inp2;
  }

  function loadScript(src, id, cb) {
    if (document.getElementById(id)) { cb && cb(); return; }
    var s = document.createElement('script');
    s.id = id; s.src = src; s.async = true; s.defer = true;
    s.onload = function () { cb && cb(); };
    document.head.appendChild(s);
  }

  // poll until the provider's global is ready, then run cb (widgets mount dynamically)
  function whenReady(check, cb) {
    if (check()) { cb(); return; }
    var t = setInterval(function () { if (check()) { clearInterval(t); cb(); } }, 50);
  }

  function mountCaptcha(formEl, cfg) {
    var box = document.createElement('div');
    box.className = 'sfb-captcha';
    box.style.margin = '4px 0 16px';
    formEl.appendChild(box);

    var failed = false;
    function fail() {
      if (failed) return;
      failed = true;
      box.innerHTML = '';
      var m = document.createElement('p');
      m.className = 'sfb-error';
      m.textContent = 'Verification could not load. Please contact the site owner.';
      box.appendChild(m);
    }
    // fallback: an invalid site key renders nothing and fires no error — flag it after a grace period
    function guard() { setTimeout(function () { if (!box.querySelector('iframe')) fail(); }, 5000); }

    if (cfg.provider === 'turnstile') {
      loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', 'sfb-turnstile', function () {
        whenReady(function () { return window.turnstile; }, function () {
          try { window.turnstile.render(box, { sitekey: cfg.siteKey, 'error-callback': fail }); guard(); }
          catch (e) { fail(); }
        });
      });
    } else if (cfg.provider === 'recaptcha') {
      loadScript('https://www.google.com/recaptcha/api.js?render=explicit', 'sfb-recaptcha', function () {
        whenReady(function () { return window.grecaptcha && window.grecaptcha.render; }, function () {
          try { window.grecaptcha.render(box, { sitekey: cfg.siteKey, 'error-callback': fail }); guard(); }
          catch (e) { fail(); }
        });
      });
    }
  }

  function injectStyles() {
    if (document.getElementById('sfb-css')) return;
    var s = document.createElement('style');
    s.id = 'sfb-css';
    s.textContent = ${JSON.stringify(FORM_CSS)};
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
}

export default {
  async find(ctx: any) {
    const forms = await strapi.plugin(PLUGIN_ID).service('form').find(ctx.query);
    ctx.body = forms;
  },

  async findOne(ctx: any) {
    const { id } = ctx.params;
    const form = await strapi.plugin(PLUGIN_ID).service('form').findOne(Number(id));
    if (!form) return ctx.notFound('Form not found');
    ctx.body = form;
  },

  async create(ctx: any) {
    const fields = ctx.request.body?.fields;
    if (Array.isArray(fields) && fields.filter((f: any) => f?.type === 'payment').length > 1) {
      return ctx.badRequest('Only one payment button is allowed per form');
    }
    const form = await strapi.plugin(PLUGIN_ID).service('form').create(ctx.request.body);
    ctx.body = form;
  },

  async update(ctx: any) {
    const fields = ctx.request.body?.fields;
    if (Array.isArray(fields) && fields.filter((f: any) => f?.type === 'payment').length > 1) {
      return ctx.badRequest('Only one payment button is allowed per form');
    }
    const { id } = ctx.params;
    const form = await strapi
      .plugin(PLUGIN_ID)
      .service('form')
      .update(Number(id), ctx.request.body);
    if (!form) return ctx.notFound('Form not found');
    ctx.body = form;
  },

  async delete(ctx: any) {
    const { id } = ctx.params;
    await strapi.plugin(PLUGIN_ID).service('form').delete(Number(id));
    ctx.status = 204;
  },

  async duplicate(ctx: any) {
    const { id } = ctx.params;
    const form = await strapi.plugin(PLUGIN_ID).service('form').duplicate(Number(id));
    if (!form) return ctx.notFound('Form not found');
    ctx.body = form;
  },

  async getPublicSchema(ctx: any) {
    const { slug } = ctx.params;
    const schema = await strapi.plugin(PLUGIN_ID).service('form').getPublicSchema(slug);
    if (!schema) return ctx.notFound('Form not found');
    ctx.body = schema;
  },

  async getPublicSchemaById(ctx: any) {
    const { id } = ctx.params;
    const schema = await strapi.plugin(PLUGIN_ID).service('form').getPublicSchemaById(Number(id));
    if (!schema) return ctx.notFound('Form not found');
    ctx.body = schema;
  },

  async serveEmbed(ctx: any) {
    ctx.set('Content-Type', 'application/javascript; charset=utf-8');
    ctx.set('Cache-Control', 'public, max-age=3600');
    ctx.body = embedScript();
  },

  async servePublicPage(ctx: any) {
    const { slug } = ctx.params;
    const schema = await strapi.plugin(PLUGIN_ID).service('form').getPublicSchema(slug);

    if (!schema || !schema.data) return ctx.notFound('Form not found');

    const form = schema.data;
    if (!form.settings?.publicPage)
      return ctx.notFound('This form does not have a public page enabled');

    ctx.set('Content-Type', 'text/html; charset=utf-8');

    // Strapi's global security middleware sets a strict CSP (script-src 'self') that would
    // block the CAPTCHA provider's script + iframe. Relax it just for this page when a
    // provider is configured — overrides the header set upstream by helmet.
    const provider = form.settings?.captcha?.provider;
    if (provider && provider !== 'none') {
      ctx.set(
        'Content-Security-Policy',
        [
          "default-src 'self'",
          "script-src 'self' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com",
          'frame-src https://challenges.cloudflare.com https://www.google.com',
          "style-src 'self' 'unsafe-inline' https:",
          "img-src 'self' data: https:",
          "connect-src 'self' https:",
          "font-src 'self' https: data:",
        ].join(';')
      );
    }

    ctx.body = publicPageHtml(form);
  },
};
