/* v52: #preview = the website's home-page card (no interface; atlas.js reads this class) */
if(/^#preview\b/.test(location.hash)) document.documentElement.classList.add('rh-preview');

/* boot watchdog: runs before the 3D engine loads, so a slow or failed download is reported
   instead of leaving the splash screen hanging */
(function(){
  var t0=Date.now(), msg=function(t,err){ var m=document.getElementById('boot-msg'), b=document.getElementById('boot');
    if(!m||!b||b.classList.contains('gone')) return; m.textContent=t;
    if(err){ m.style.color='#C7534A'; m.style.textTransform='none'; m.style.letterSpacing='0'; } };
  window.__bootStage='engine';
  msg('loading 3D engine\u2026');
  addEventListener('error',function(e){
    var el=e.target;
    if(el && el.tagName==='SCRIPT') msg('Could not download the 3D engine \u2014 check the connection and reload.',true);
  },true);
  var iv=setInterval(function(){
    var b=document.getElementById('boot'); if(!b||b.classList.contains('gone')){ clearInterval(iv); return; }
    var s=Math.round((Date.now()-t0)/1000);
    if(window.__bootStage==='engine' && s>=8) msg('loading 3D engine\u2026 '+s+' s (slow connection)');
    if(s>=45 && window.__bootStage==='engine'){ msg('The 3D engine did not load after 45 s \u2014 reload on a faster connection.',true); clearInterval(iv); }
  },1000);
})();
