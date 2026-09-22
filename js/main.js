document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var panels = document.querySelectorAll('.tab-panel');
  var navButtons = document.querySelectorAll('.nav-btn[data-target]');

  function showTab(id) {
    panels.forEach(function (panel) { panel.hidden = panel.dataset.panel !== id; });
    navButtons.forEach(function (button) {
      var selected = button.dataset.target === id;
      button.classList.toggle('active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }
  navButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      showTab(button.dataset.target);
      window.scrollTo({ top: 0, behavior: motionPreference.matches ? 'instant' : 'smooth' });
    });
  });
  showTab('home');

  var intro = document.getElementById('intro');
  if (!intro) return;
  var skip = document.getElementById('introSkip');
  var replay = document.getElementById('introReplay');
  var stage = intro.querySelector('.intro-stage');
  var actor = document.getElementById('pixelChar');
  var sprites = intro.querySelectorAll('.char-sprite');
  var far = intro.querySelector('.city-far');
  var near = intro.querySelector('.city-near');
  var ground = intro.querySelector('.intro-ground');
  var items = intro.querySelectorAll('.intro-item');
  var badges = intro.querySelectorAll('.intro-progress span');
  var ring = intro.querySelector('.pickup-ring');
  var popup = intro.querySelector('.pickup-text');
  var caption = intro.querySelector('.intro-caption');
  var pageRegions = document.querySelectorAll('.site-header, main, .site-footer');
  var names = ['기획', '운영', '개발'];
  var captions = ['아이디어를 구체적인 계획으로.', '꾸준한 운영으로 더 나은 결과를.', '직접 만드는 힘까지 더했습니다.'];
  // 각 아이템 획득 후 해당 의상과 설명을 3초씩 보여줍니다.
  var stageDuration = 3000;
  var pickupLead = 1200;
  var pickups = names.map(function (_, index) { return pickupLead + index * stageDuration; });
  var duration = pickups[pickups.length - 1] + stageDuration;
  var playing = false;
  var elapsed = 0;
  var lastTime = null;
  var raf = 0;
  var loadTimeout = 0;
  var closeTimeout = 0;
  var assetReady = false;
  var collected = -1;
  var returnFocus = null;
  var stageWidth = 0;
  var actorX = 0;
  var runId = 0;

  function measure() {
    stageWidth = stage.clientWidth;
    actorX = stageWidth * .25;
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function render(time) {
    // All moving elements share this clock; hidden tabs pause it without skipped pickups.
    var travelSpeed = stageWidth * .72 / stageDuration;
    var distance = time * travelSpeed;
    far.style.transform = 'translateX(' + -(distance * .1 % 320) + 'px)';
    near.style.transform = 'translateX(' + -(distance * .24 % 280) + 'px)';
    ground.style.transform = 'translateX(' + -(distance % 40) + 'px)';
    var frame = Math.floor(time / 130) % 4;
    var phase = time % 520 / 520;
    var bob = -1.5 * Math.pow(Math.sin(phase * Math.PI * 2), 2);
    actor.style.transform = 'translateY(' + bob + 'px)';

    var latest = -1;
    pickups.forEach(function (at, index) { if (time >= at) latest = index; });
    var role = Math.max(0, latest);
    var sincePickup = latest < 0 ? -1 : time - pickups[latest];
    var blend = latest > 0 ? clamp(sincePickup / 180, 0, 1) : 1;
    sprites[0].style.backgroundPosition = (frame * 100 / 3) + '% ' + (Math.max(0, role - 1) * 50) + '%';
    sprites[1].style.backgroundPosition = (frame * 100 / 3) + '% ' + (role * 50) + '%';
    sprites[0].style.opacity = 1 - blend;
    sprites[1].style.opacity = blend;

    items.forEach(function (item, index) {
      var delta = pickups[index] - time;
      var x = actorX + delta * travelSpeed;
      var absorption = clamp(-delta / 180, 0, 1);
      var float = delta > 0 ? Math.sin(time / 250 + index) * 3 : -absorption * 9;
      item.style.transform = 'translate(' + (x - 24) + 'px,' + float + 'px) scale(' + (1 - absorption * .65) + ')';
      item.style.opacity = delta < -180 ? 0 : clamp((stageWidth - x) / 48, 0, 1) * (1 - absorption);
    });
    if (latest !== collected) {
      collected = latest;
      badges.forEach(function (badge, index) { badge.classList.toggle('is-collected', index <= latest); });
      if (latest >= 0) {
        caption.textContent = captions[latest];
        popup.textContent = '+ ' + names[latest];
      }
    }
    var ringProgress = sincePickup < 0 ? 1 : clamp(sincePickup / 420, 0, 1);
    ring.style.opacity = (1 - ringProgress) * .65;
    ring.style.transform = 'scale(' + (.65 + ringProgress * .7) + ')';
    var popupProgress = sincePickup < 0 ? 1 : clamp(sincePickup / 750, 0, 1);
    popup.style.opacity = Math.sin(popupProgress * Math.PI);
    popup.style.transform = 'translate(-50%,' + (-popupProgress * 16) + 'px)';
  }

  function tick(now) {
    if (!playing || !assetReady) return;
    if (lastTime !== null) elapsed += now - lastTime;
    lastTime = now;
    render(elapsed);
    if (elapsed >= duration) endIntro();
    else raf = requestAnimationFrame(tick);
  }
  function restorePage() {
    intro.hidden = true;
    intro.classList.remove('intro-hide', 'is-ready');
    pageRegions.forEach(function (region) { region.inert = false; });
    document.body.classList.remove('intro-active');
    if (intro.contains(document.activeElement)) {
      (returnFocus || document.getElementById('mainContent')).focus({ preventScroll: true });
    }
  }
  function endIntro(immediate) {
    if (!playing) return;
    playing = false;
    runId++;
    cancelAnimationFrame(raf);
    clearTimeout(loadTimeout);
    clearTimeout(closeTimeout);
    intro.classList.add('intro-hide');
    if (immediate === true || motionPreference.matches) restorePage();
    else closeTimeout = setTimeout(restorePage, 440);
  }
  function beginAnimation(id) {
    if (!playing || id !== runId) return;
    clearTimeout(loadTimeout);
    assetReady = true;
    intro.classList.add('is-ready');
    replay.hidden = false;
    measure();
    render(0);
    raf = requestAnimationFrame(tick);
  }
  function startIntro(fromReplay) {
    if (playing || motionPreference.matches) return;
    clearTimeout(closeTimeout);
    var id = ++runId;
    playing = true;
    elapsed = 0;
    lastTime = null;
    collected = -1;
    returnFocus = fromReplay ? replay : null;
    intro.hidden = false;
    intro.classList.remove('intro-hide', 'is-ready');
    pageRegions.forEach(function (region) { region.inert = true; });
    document.body.classList.add('intro-active');
    skip.focus({ preventScroll: true });
    badges.forEach(function (badge) { badge.classList.remove('is-collected'); });
    caption.textContent = '기획에서 운영으로, 그리고 개발까지.';
    items.forEach(function (item) { item.style.opacity = 0; });
    popup.style.opacity = 0;
    ring.style.opacity = 0;
    if (assetReady) { beginAnimation(id); return; }
    // An unavailable or slow image must never prevent reading the actual resume.
    loadTimeout = setTimeout(function () { endIntro(true); }, 1800);
    var image = new Image();
    image.onload = function () {
      if (image.decode) image.decode().then(function () { beginAnimation(id); }, function () { if (id === runId) endIntro(true); });
      else beginAnimation(id);
    };
    image.onerror = function () { if (id === runId) endIntro(true); };
    image.src = 'assets/character-atlas.png';
  }
  skip.addEventListener('click', function () { endIntro(); });
  replay.addEventListener('click', function () { startIntro(true); });
  intro.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { event.preventDefault(); endIntro(); }
    if (event.key === 'Tab') { event.preventDefault(); skip.focus(); }
  });
  document.addEventListener('visibilitychange', function () {
    if (!playing || !assetReady) return;
    cancelAnimationFrame(raf);
    lastTime = null;
    if (!document.hidden) raf = requestAnimationFrame(tick);
  });
  window.addEventListener('resize', measure);
  motionPreference.addEventListener('change', function () {
    if (motionPreference.matches) endIntro(true);
  });
  startIntro(false);
});
