(function(){
  var input = document.getElementById('doc-search-input');
  if(!input) return;
  var list = document.getElementById('doc-tpl-list');
  var countEl = document.getElementById('doc-search-count');
  var children = Array.prototype.slice.call(list.children);

  function apply(){
    var q = input.value.trim().toLowerCase();
    var visible = 0;
    children.forEach(function(el){
      if(el.classList.contains('doc-tpl-item')){
        var match = !q || el.dataset.title.indexOf(q) > -1;
        el.classList.toggle('hidden', !match);
        if(match) visible++;
      }
    });
    var i = 0;
    while(i < children.length){
      var el = children[i];
      if(el.classList.contains('doc-group-head')){
        var j = i + 1;
        var hasVisible = false;
        while(j < children.length && !children[j].classList.contains('doc-group-head')){
          if(children[j].classList.contains('doc-tpl-item') && !children[j].classList.contains('hidden')){
            hasVisible = true;
          }
          j++;
        }
        el.classList.toggle('hidden', !hasVisible);
      }
      i++;
    }
    countEl.textContent = q ? ('Найдено: ' + visible) : '';
  }

  input.addEventListener('input', apply);
  apply();
})();
