(function(){
  function num(s){ var m=String(s||'').match(/-?\d+(\.\d+)?/); return m?parseFloat(m[0]):NaN; }
  document.querySelectorAll('.lvbar').forEach(function(bar){
    var key = bar.getAttribute('data-listview') || 'lv';
    var grid = bar.parentNode.querySelector('[data-listgrid]') || document.querySelector('[data-listgrid]');
    if(!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.card'));
    var search = bar.querySelector('.lv-search');
    var sort = bar.querySelector('.lv-sort');
    var toggle = bar.querySelector('.lvtoggle');
    var count = bar.querySelector('.lv-count');
    function applyView(v){
      grid.classList.toggle('listview', v==='list');
      if(toggle) toggle.querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-view')===v); });
      try{ localStorage.setItem('lv:'+key, v); }catch(e){}
    }
    function render(){
      var q=((search&&search.value)||'').toLowerCase().trim();
      var visible=0;
      cards.forEach(function(c){
        var hay=(c.getAttribute('data-search')||'').toLowerCase();
        var show = !q || hay.indexOf(q)>=0;
        c.style.display = show?'':'none';
        if(show) visible++;
      });
      if(count) count.textContent = visible+' / '+cards.length;
      if(sort && sort.value){
        var p=sort.value.split(':'), k=p[0], isNum=p.indexOf('num')>=0, desc=p.indexOf('desc')>=0;
        cards.slice().sort(function(a,b){
          var av=a.getAttribute('data-'+k)||'', bv=b.getAttribute('data-'+k)||'', r;
          if(isNum){ var an=num(av),bn=num(bv);
            if(isNaN(an)&&isNaN(bn))r=0; else if(isNaN(an))return 1; else if(isNaN(bn))return -1; else r=an-bn;
          } else r=av.localeCompare(bv,'de',{sensitivity:'base'});
          return desc?-r:r;
        }).forEach(function(c){ grid.appendChild(c); });
      }
    }
    if(search) search.addEventListener('input', render);
    if(sort) sort.addEventListener('change', render);
    if(toggle) toggle.addEventListener('click', function(e){ var b=e.target.closest('button'); if(b){ e.preventDefault(); applyView(b.getAttribute('data-view')); } });
    var saved=null; try{ saved=localStorage.getItem('lv:'+key); }catch(e){}
    applyView(saved||'grid');
    render();
  });
})();
