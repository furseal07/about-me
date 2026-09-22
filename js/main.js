document.addEventListener('DOMContentLoaded', function () {
  var panels = document.querySelectorAll('.tab-panel');
  var navButtons = document.querySelectorAll('.nav-btn[data-target]');

  if (!panels.length || !navButtons.length) return;

  function showTab(id) {
    panels.forEach(function (panel) {
      panel.hidden = panel.dataset.panel !== id;
    });
    navButtons.forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.target === id);
    });
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      showTab(btn.dataset.target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // 첫 화면은 '소개' 탭
  showTab('home');
});