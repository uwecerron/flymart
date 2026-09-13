// FlyMart camera and panel controls only. No changes to neural inputs or behavior.
document.getElementById('detailsBtn').onclick = function () {
 var visible = document.body.classList.toggle('show-stats');
 this.setAttribute('aria-pressed', String(visible));
 this.classList.toggle('active', visible);
};
document.getElementById('followBtn').onclick = function () {
 flymartFollow = !flymartFollow;
 this.textContent = 'Follow: ' + (flymartFollow ? 'On' : 'Off');
 this.setAttribute('aria-pressed', String(flymartFollow));
 this.classList.toggle('active', flymartFollow);
};
document.getElementById('centerButton').title = 'Center camera on fly';
document.getElementById('centerButton').onclick = function () { flymartFollow = true; zoomLevel = 1.7; document.getElementById('followBtn').textContent = 'Follow: On'; document.getElementById('followBtn').setAttribute('aria-pressed','true'); document.getElementById('followBtn').classList.add('active'); };
