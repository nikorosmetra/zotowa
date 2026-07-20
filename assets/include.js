function loadPartial(url, mountId){
  return fetch(url)
    .then(function(r){ return r.text(); })
    .then(function(html){ document.getElementById(mountId).innerHTML = html; })
    .catch(function(err){ console.error('Не удалось загрузить '+url, err); });
}

function initConsultForm(){
  var form = document.getElementById('consult-form');
  if (!form) return;
  var msg = form.querySelector('.form-msg');
  var btn = form.querySelector('button[type=submit]');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    btn.disabled = true;
    msg.textContent = 'Отправляем...';
    msg.className = 'form-msg';

    fetch(form.getAttribute('action'), {
      method: 'POST',
      body: new FormData(form),
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function(r){ return r.json().catch(function(){ return { ok:false }; }); })
      .then(function(data){
        if (data.ok) {
          msg.textContent = 'Спасибо! Мы свяжемся с вами в ближайшее время.';
          msg.className = 'form-msg ok';
          form.reset();
        } else {
          msg.textContent = 'Не удалось отправить. Позвоните нам или попробуйте ещё раз.';
          msg.className = 'form-msg err';
        }
      })
      .catch(function(){
        msg.textContent = 'Не удалось отправить. Позвоните нам или попробуйте ещё раз.';
        msg.className = 'form-msg err';
      })
      .finally(function(){
        btn.disabled = false;
      });
  });
}

Promise.all([
  loadPartial('/partials/header.html', 'site-header'),
  loadPartial('/partials/footer.html', 'site-footer')
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
});
