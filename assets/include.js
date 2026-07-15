function loadPartial(url, mountId){
  return fetch(url)
    .then(function(r){ return r.text(); })
    .then(function(html){ document.getElementById(mountId).innerHTML = html; })
    .catch(function(err){ console.error('Не удалось загрузить '+url, err); });
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
});
