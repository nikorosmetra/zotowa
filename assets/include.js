function loadPartial(url, mountId){
  return fetch(url)
    .then(function(r){ return r.text(); })
    .then(function(html){
      var el = document.getElementById(mountId);
      el.innerHTML = html;
      el.querySelectorAll('script').forEach(function(oldScript){
        var newScript = document.createElement('script');
        for (var i = 0; i < oldScript.attributes.length; i++){
          newScript.setAttribute(oldScript.attributes[i].name, oldScript.attributes[i].value);
        }
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });
    })
    .catch(function(err){ console.error('Не удалось загрузить '+url, err); });
}

function ymGoal(name){
  if (typeof window.ym === 'function') window.ym(110878848, 'reachGoal', name);
}

function initConsultForm(){
  var form = document.getElementById('consult-form');
  if (!form) return;
  var msg = form.querySelector('.form-msg');
  var phoneInput = form.querySelector('input[name=phone]');
  if (phoneInput && window.zpMaskPhone) window.zpMaskPhone(phoneInput);

  var opened = false;
  form.addEventListener('focusin', function(){
    if (!opened) { opened = true; ymGoal('form_open'); }
  });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (form.website.value) return; // honeypot: боты дальше не проходят

    var mailtoUrl = window.zpBuildMailto({
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim()
    }, (form.form_name && form.form_name.value) || 'Получить консультацию');

    window.location.href = mailtoUrl;
    msg.textContent = 'Открылся ваш почтовый клиент с готовым письмом - отправьте его, чтобы мы получили заявку. Если ничего не открылось, напишите нам напрямую на zotowa.a.s@yandex.ru.';
    msg.className = 'form-msg ok';
    ymGoal('form_submit');
    form.reset();
  });
}

function initMessengerTracking(){
  document.addEventListener('click', function(e){
    var link = e.target.closest('[data-track]');
    if (link) ymGoal(link.getAttribute('data-track'));
  });
}

var siteFooterEl = document.getElementById('site-footer');
var footerUrl = (siteFooterEl && siteFooterEl.getAttribute('data-footer') === 'compact')
  ? '/partials/footer-compact.html'
  : '/partials/footer.html';

Promise.all([
  loadPartial('/partials/header.html', 'site-header'),
  loadPartial(footerUrl, 'site-footer')
]).then(function(){
  document.getElementById('burger').addEventListener('click',function(){
    document.body.classList.toggle('nav-open');
  });
  document.querySelectorAll('.mobile-nav a').forEach(function(a){
    a.addEventListener('click',function(){
      document.body.classList.remove('nav-open');
    });
  });
  initConsultForm();
  initMessengerTracking();
});
