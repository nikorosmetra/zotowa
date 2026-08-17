/*
 * Единая модальная форма заявки. Открывается по клику на любую кнопку
 * с data-modal-form. Отправка - через mailto: (открывает почтовый клиент
 * посетителя с готовым письмом на MAIL_TO), т.к. серверный SMTP до Яндекса
 * с хостинга сейчас не проходит на сетевом уровне.
 */
(function () {
  var YM_ID = 110878848;
  var MAIL_TO = 'zotowa.a.s@yandex.ru';
  var MAX_LINK = 'https://max.ru/u/f9LHodD0cOJFfVwK4IK3pn11IkGqHMcaDNZF--FreLo8wgsxTNxKT4zhWqY';

  function ymGoal(name) {
    if (typeof window.ym === 'function') {
      window.ym(YM_ID, 'reachGoal', name);
    }
  }

  window.zpBuildMailto = function (fields, formName) {
    var subject = 'Заявка с сайта zotowa.ru - ' + formName;
    var bodyLines = [
      'Имя: ' + fields.name,
      'Телефон: ' + fields.phone,
      'Email: ' + fields.email,
      'Страница: ' + window.location.href,
      'Согласие на обработку персональных данных: получено'
    ];
    return 'mailto:' + MAIL_TO
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(bodyLines.join('\r\n'));
  };

  window.zpMaskPhone = function (input) {
    input.addEventListener('input', function () {
      var digits = input.value.replace(/\D/g, '');
      if (digits.charAt(0) === '8') digits = '7' + digits.slice(1);
      if (digits.charAt(0) !== '7') digits = '7' + digits;
      digits = digits.slice(0, 11);
      var out = '+7';
      if (digits.length > 1) out += ' (' + digits.slice(1, 4);
      if (digits.length >= 4) out += ') ' + digits.slice(4, 7);
      if (digits.length >= 7) out += '-' + digits.slice(7, 9);
      if (digits.length >= 9) out += '-' + digits.slice(9, 11);
      input.value = out;
    });
  };

  var overlay, modal, headingEl, subEl, form, msgEl, btn, formNameInput;
  var lastFocused = null;

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'zp-modal-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<div class="zp-modal" role="dialog" aria-modal="true" aria-labelledby="zp-modal-heading">' +
        '<button type="button" class="zp-modal-close" aria-label="Закрыть">&times;</button>' +
        '<h3 id="zp-modal-heading"></h3>' +
        '<p class="zp-modal-sub"></p>' +
        '<form class="zp-modal-form" novalidate>' +
          '<input type="text" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">' +
          '<input type="hidden" name="form_name" value="">' +
          '<label><span class="zp-field-label">Ваше имя</span>' +
            '<input type="text" name="name" autocomplete="name" required></label>' +
          '<label><span class="zp-field-label">Телефон</span>' +
            '<input type="tel" name="phone" autocomplete="tel" placeholder="+7 (___) ___-__-__" required></label>' +
          '<label><span class="zp-field-label">Электронная почта</span>' +
            '<input type="email" name="email" autocomplete="email" required></label>' +
          '<label class="chk-row">' +
            '<input type="checkbox" name="consent" required>' +
            '<span>Даю <a href="/consent/" target="_blank" rel="noopener">согласие на обработку персональных данных</a> и ознакомлен(а) с <a href="/privacy/" target="_blank" rel="noopener">Политикой конфиденциальности</a></span>' +
          '</label>' +
          '<button type="submit" class="btn btn-dark">Отправить</button>' +
          '<p class="form-msg" role="status" aria-live="polite"></p>' +
        '</form>' +
        '<a class="form-max-link" href="' + MAX_LINK + '" target="_blank" rel="noopener" data-track="messenger_max_click">' +
          '<span class="ic"><img src="/assets/icons/max.svg" alt="" width="24" height="24"></span>' +
          '<span>Написать в MAX</span>' +
        '</a>' +
      '</div>';
    document.body.appendChild(overlay);

    modal = overlay.querySelector('.zp-modal');
    headingEl = overlay.querySelector('#zp-modal-heading');
    subEl = overlay.querySelector('.zp-modal-sub');
    form = overlay.querySelector('.zp-modal-form');
    msgEl = overlay.querySelector('.form-msg');
    btn = overlay.querySelector('button[type=submit]');
    formNameInput = overlay.querySelector('input[name=form_name]');

    window.zpMaskPhone(overlay.querySelector('input[name=phone]'));

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    overlay.querySelector('.zp-modal-close').addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') {
        var focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (form.website.value) return; // honeypot: боты дальше не проходят

      var mailtoUrl = window.zpBuildMailto({
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        email: form.email.value.trim()
      }, formNameInput.value || 'Получить консультацию');

      window.location.href = mailtoUrl;
      msgEl.textContent = 'Открылся ваш почтовый клиент с готовым письмом - отправьте его, чтобы мы получили заявку. Если ничего не открылось, напишите нам напрямую на zotowa.a.s@yandex.ru.';
      msgEl.className = 'form-msg ok';
      ymGoal('form_submit');
      form.reset();
    });
  }

  function open(trigger) {
    if (!overlay) build();
    lastFocused = document.activeElement;
    headingEl.textContent = trigger.getAttribute('data-modal-heading') || 'Получить консультацию';
    subEl.textContent = trigger.getAttribute('data-modal-sub') || '';
    btn.textContent = trigger.getAttribute('data-modal-submit') || 'Отправить';
    formNameInput.value = trigger.getAttribute('data-modal-form') || 'Получить консультацию';
    msgEl.textContent = '';
    msgEl.className = 'form-msg';
    form.reset();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('zp-modal-open');
    document.body.classList.remove('nav-open');
    var nameInput = form.querySelector('input[name=name]');
    if (nameInput) nameInput.focus();
    ymGoal('form_open');
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('zp-modal-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-modal-form]');
    if (!trigger) return;
    e.preventDefault();
    open(trigger);
  });
})();
