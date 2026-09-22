document.addEventListener('DOMContentLoaded', function () {

  /* ---------- 인트로 (도시를 달리다가 아이템이 다가와 외형 교체) ---------- */
  var intro = document.getElementById('intro');
  var introSkip = document.getElementById('introSkip');
  var pixelChar = document.getElementById('pixelChar');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INTRO_TOTAL_MS = 9600; // 아이템3 도착(8.4s) 이후 잠깐 정지하는 여유 포함
  var timers = [];

  function setCostume(name) {
    if (!pixelChar) return;
    pixelChar.classList.remove('costume-planner', 'costume-operator', 'costume-developer');
    pixelChar.classList.add('costume-' + name);
    pixelChar.classList.add('flash');
    setTimeout(function () { pixelChar.classList.remove('flash'); }, 250);
  }

  function endIntro() {
    if (!intro || intro.classList.contains('intro-hide')) return;
    intro.classList.add('intro-hide');
    document.body.classList.remove('intro-active');
    timers.forEach(clearTimeout);
    setTimeout(function () {
      intro.style.display = 'none';
    }, 650);
  }

  if (intro) {
    if (prefersReducedMotion) {
      endIntro();
    } else {
      document.body.classList.add('intro-active');

      if (introSkip) {
        introSkip.addEventListener('click', endIntro);
      }

      // 아이템이 캐릭터에 도착하는 순간(3.0s / 5.7s / 8.4s)에 맞춰 외형 교체
      timers.push(setTimeout(function () { setCostume('operator'); }, 3000));
      timers.push(setTimeout(function () { setCostume('developer'); }, 5700));
      timers.push(setTimeout(endIntro, INTRO_TOTAL_MS));
    }
  }

  /* ---------- 상단 탭 메뉴 전환 ---------- */
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