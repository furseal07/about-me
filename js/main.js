document.addEventListener('DOMContentLoaded', function () {

  /* ---------- 인트로 (캐릭터 애니메이션) ---------- */
  var intro = document.getElementById('intro');
  var introSkip = document.getElementById('introSkip');
  var pixelChar = document.getElementById('pixelChar');
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function endIntro() {
    if (!intro || intro.classList.contains('intro-hide')) return;
    intro.classList.add('intro-hide');
    document.body.classList.remove('intro-active');
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

      if (pixelChar) {
        pixelChar.addEventListener('animationend', function () {
          setTimeout(endIntro, 500);
        });
      }

      // 애니메이션이 어떤 이유로든 끝나지 않을 경우를 대비한 안전장치
      setTimeout(endIntro, 9000);
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