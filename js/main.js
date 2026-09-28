document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var panels = document.querySelectorAll('.tab-panel');
  var navButtons = document.querySelectorAll('.nav-btn[data-target]');
  var header = document.querySelector('.site-header');
  function measureHeader() {
    if (header) document.documentElement.style.setProperty('--site-header-height', header.getBoundingClientRect().height + 'px');
  }
  measureHeader();
  if (header && 'ResizeObserver' in window) new ResizeObserver(measureHeader).observe(header);
  else window.addEventListener('resize', measureHeader);

  var heroHome = document.querySelector('[data-panel="home"]');
  var heroPortrait = document.querySelector('.hero-portrait');
  var heroPortraitInView = true;
  var portraitStatus = document.getElementById('portraitStatus');
  var portraitBlinkTimer = 0;
  var portraitBlinkEnd = 0;
  var portraitLaughTimer = 0;
  var portraitBlinkIndex = 0;
  var portraitFaces = { blink: false, laugh: false };

  function clearPortraitBlink() {
    clearTimeout(portraitBlinkTimer);
    clearTimeout(portraitBlinkEnd);
    portraitBlinkTimer = portraitBlinkEnd = 0;
    if (heroPortrait) heroPortrait.classList.remove('is-blinking');
  }
  function endPortraitLaugh() {
    clearTimeout(portraitLaughTimer);
    portraitLaughTimer = 0;
    if (heroPortrait) heroPortrait.classList.remove('is-laughing');
    if (portraitStatus) portraitStatus.textContent = '';
  }
  function schedulePortraitBlink() {
    if (!heroPortrait || !portraitFaces.blink || portraitBlinkTimer || portraitBlinkEnd ||
        !heroPortrait.classList.contains('is-animated') || heroPortrait.classList.contains('is-laughing')) return;
    // Uneven intervals keep the idle expression from looking like a repeating metronome.
    var intervals = [3600, 5200, 4200, 6100];
    portraitBlinkTimer = setTimeout(function () {
      portraitBlinkTimer = 0;
      heroPortrait.classList.add('is-blinking');
      portraitBlinkEnd = setTimeout(function () {
        portraitBlinkEnd = 0;
        heroPortrait.classList.remove('is-blinking');
        schedulePortraitBlink();
      }, 150);
    }, intervals[portraitBlinkIndex++ % intervals.length]);
  }
  function syncHeroMotion() {
    if (!heroPortrait) return;
    var visible = heroIsVisible() && heroPortraitInView;
    var animated = visible && !motionPreference.matches;
    heroPortrait.classList.toggle('is-animated', animated);
    if (!visible) endPortraitLaugh();
    if (animated) schedulePortraitBlink();
    else clearPortraitBlink();
  }
  if (heroPortrait) {
    // Wait for the expression asset so a click never displays a missing frame.
    heroPortrait.disabled = true;
    ['blink', 'laugh'].forEach(function (expression) {
      var face = new Image();
      face.onload = function () {
        portraitFaces[expression] = true;
        if (expression === 'laugh') heroPortrait.disabled = false;
        syncHeroMotion();
      };
      face.src = 'assets/character-' + expression + '.png';
    });
    heroPortrait.addEventListener('click', function () {
      if (!portraitFaces.laugh || !heroIsVisible() || heroPortrait.classList.contains('is-laughing')) return;
      clearPortraitBlink();
      heroPortrait.classList.add('is-laughing');
      if (portraitStatus) portraitStatus.textContent = '엄상희가 꺄르르 웃습니다.';
      portraitLaughTimer = setTimeout(function () {
        endPortraitLaugh();
        syncHeroMotion();
      }, 2200);
    });
  }
  if (heroPortrait && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroPortraitInView = entries[0].isIntersecting;
      syncHeroMotion();
    }).observe(heroPortrait);
  }
  var heroDialogue = document.querySelector('.hero-dialogue');
  var heroGreeting = document.getElementById('heroDialogue');
  var heroDetails = document.getElementById('heroCharacterDetails');
  var heroToggle = document.getElementById('heroDialogueToggle');
  var heroTimer = 0;
  var heroSegmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null;

  function createHeroWriter(groups, accessible, delay, rowPause) {
    var writer = { glyphs: [], index: 0, caret: null, complete: false, delay: delay, rowPause: rowPause };
    groups.forEach(function (fields, rowIndex) {
      if (rowIndex > 0) writer.glyphs.push(null);
      fields.forEach(function (field) {
        var text = field.textContent;
        field.textContent = '';
        var visual = field;
        // Keep each definition readable to assistive technology while its visible text types.
        if (accessible) {
          var readable = document.createElement('span');
          readable.className = 'sr-only';
          readable.textContent = text;
          visual = document.createElement('span');
          visual.setAttribute('aria-hidden', 'true');
          field.appendChild(readable);
          field.appendChild(visual);
        }
        var letters = heroSegmenter ? Array.from(heroSegmenter.segment(text), function (part) { return part.segment; }) : Array.from(text);
        letters.forEach(function (letter) {
          var glyph = document.createElement('span');
          glyph.className = 'dialogue-glyph';
          glyph.textContent = letter;
          visual.appendChild(glyph);
          writer.glyphs.push(glyph);
        });
      });
    });
    return writer;
  }

  var greetingWriter = heroGreeting ? createHeroWriter(Array.from(heroGreeting.querySelectorAll('.dialogue-line'), function (line) { return [line]; }), false, 48, 320) : null;
  var detailsWriter = heroDetails ? createHeroWriter(Array.from(heroDetails.children, function (row) { return Array.from(row.querySelectorAll('dt, dd')); }), true, 34, 160) : null;
  var activeHeroWriter = greetingWriter;
  if (heroDialogue) heroDialogue.classList.add('is-prepared');
  if (heroDialogue && greetingWriter && detailsWriter && heroToggle) {
    heroToggle.hidden = false;
    heroToggle.addEventListener('click', function () {
      var showDetails = heroToggle.getAttribute('aria-expanded') !== 'true';
      clearTimeout(heroTimer);
      if (activeHeroWriter.caret) activeHeroWriter.caret.classList.remove('is-caret');
      heroGreeting.setAttribute('aria-hidden', String(showDetails));
      heroGreeting.inert = showDetails;
      heroDetails.setAttribute('aria-hidden', String(!showDetails));
      heroDetails.inert = !showDetails;
      heroToggle.setAttribute('aria-expanded', String(showDetails));
      activeHeroWriter = showDetails ? detailsWriter : greetingWriter;
      activeHeroWriter.glyphs.forEach(function (glyph) { if (glyph) glyph.classList.remove('is-visible', 'is-caret'); });
      activeHeroWriter.index = 0;
      activeHeroWriter.caret = null;
      activeHeroWriter.complete = false;
      heroDialogue.classList.remove('is-complete');
      syncHeroTyping();
    });
  }
  function finishHeroTyping() {
    clearTimeout(heroTimer);
    var writer = activeHeroWriter;
    if (!writer) return;
    if (writer.caret) writer.caret.classList.remove('is-caret');
    writer.glyphs.forEach(function (glyph) {
      if (glyph) { glyph.classList.add('is-visible'); writer.caret = glyph; }
    });
    // The final caret keeps blinking after the last letter has appeared.
    if (writer.caret) writer.caret.classList.add('is-caret');
    writer.index = writer.glyphs.length;
    writer.complete = true;
    if (heroDialogue) heroDialogue.classList.add('is-complete');
  }
  function heroIsVisible() {
    return heroHome && !heroHome.hidden && !document.hidden && !document.body.classList.contains('intro-active');
  }
  function typeHeroGlyph() {
    var writer = activeHeroWriter;
    if (!heroIsVisible() || !writer || writer.complete) return;
    var glyph = writer.glyphs[writer.index++];
    if (glyph) {
      if (writer.caret) writer.caret.classList.remove('is-caret');
      glyph.classList.add('is-visible', 'is-caret');
      writer.caret = glyph;
    }
    if (writer.index >= writer.glyphs.length) { finishHeroTyping(); return; }
    var delay = !glyph ? writer.rowPause : /[,.!]/.test(glyph.textContent) ? 160 : writer.delay;
    heroTimer = setTimeout(typeHeroGlyph, delay);
  }
  function syncHeroTyping() {
    syncHeroMotion();
    clearTimeout(heroTimer);
    if (!heroDialogue || !activeHeroWriter || activeHeroWriter.complete) return;
    if (motionPreference.matches) { finishHeroTyping(); return; }
    if (heroIsVisible()) heroTimer = setTimeout(typeHeroGlyph, activeHeroWriter.index === 0 ? 240 : 80);
  }
  document.addEventListener('visibilitychange', syncHeroTyping);
  motionPreference.addEventListener('change', syncHeroTyping);

  function showTab(id) {
    panels.forEach(function (panel) { panel.hidden = panel.dataset.panel !== id; });
    navButtons.forEach(function (button) {
      var selected = button.dataset.target === id;
      button.classList.toggle('active', selected);
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    syncHeroTyping();
  }
  navButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      showTab(button.dataset.target);
      window.scrollTo({ top: 0, behavior: motionPreference.matches ? 'instant' : 'smooth' });
    });
  });
  showTab('home');

  var intro = document.getElementById('intro');
  if (!intro) { syncHeroTyping(); return; }
  var skip = document.getElementById('introSkip');
  var replay = document.getElementById('introReplay');
  var stage = intro.querySelector('.intro-stage');
  var actor = document.getElementById('pixelChar');
  var sprites = intro.querySelectorAll('.char-sprite');
  var far = intro.querySelector('.city-far');
  var near = intro.querySelector('.city-near');
  var ground = intro.querySelector('.intro-ground');
  var stars = intro.querySelector('.sky-stars');
  var sparks = intro.querySelectorAll('.pickup-sparks i');
  var items = intro.querySelectorAll('.intro-item');
  var badges = intro.querySelectorAll('.intro-progress span');
  var ring = intro.querySelector('.pickup-ring');
  var popup = intro.querySelector('.pickup-text');
  var caption = intro.querySelector('.intro-caption');
  var pageRegions = document.querySelectorAll('.site-header, main, .site-footer');
  var names = ['기획', '운영', '개발'];
  var roleColors = ['#ffc857', '#7cdfc0', '#ff8fa3'];
  var captions = ['아이디어를 구체적인 계획으로.', '꾸준한 운영으로 더 나은 결과를.', '직접 만드는 힘까지 더했습니다.'];
  // 첫 안내와 기획·운영·개발을 각각 2초씩 보여줍니다.
  var stageDuration = 2000;
  var pickupLead = 2000;
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
    actorX = stageWidth * parseFloat(getComputedStyle(stage).getPropertyValue('--actor-x')) / 100;
  }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function render(time) {
    // All moving elements share this clock; hidden tabs pause it without skipped pickups.
    var travelSpeed = stageWidth * .72 / stageDuration;
    var distance = time * travelSpeed;
    far.style.transform = 'translateX(' + -(distance * .1 % 320) + 'px)';
    near.style.transform = 'translateX(' + -(distance * .24 % 280) + 'px)';
    ground.style.transform = 'translateX(' + -(distance % 40) + 'px)';
    stage.style.setProperty('--floor-shift', -(distance % 64) + 'px');
    if (stars) stars.style.opacity = .72 + Math.sin(time / 1500) * .13;
    var frame = Math.floor(time / 130) % 4;
    var phase = time % 520 / 520;
    var bob = -1.5 * Math.pow(Math.sin(phase * Math.PI * 2), 2);
    actor.style.transform = 'translateY(' + bob + 'px)';

    var latest = -1;
    pickups.forEach(function (at, index) { if (time >= at) latest = index; });
    // 이미지 행: 학생(0) → 기획(1) → 운영(2) → 개발(3).
    var role = latest + 1;
    var sincePickup = latest < 0 ? -1 : time - pickups[latest];
    var blend = latest >= 0 ? clamp(sincePickup / 180, 0, 1) : 1;
    sprites[0].style.backgroundPosition = (frame * 100 / 3) + '% ' + (Math.max(0, role - 1) * 100 / 3) + '%';
    sprites[1].style.backgroundPosition = (frame * 100 / 3) + '% ' + (role * 100 / 3) + '%';
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
      badges.forEach(function (badge, index) {
        badge.classList.toggle('is-collected', index <= latest);
        badge.classList.toggle('is-current', index === latest);
      });
      if (latest >= 0) {
        intro.style.setProperty('--scene-accent', roleColors[latest]);
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
    badges.forEach(function (badge, index) {
      badge.style.setProperty('--step-progress', clamp((time - pickups[index]) / stageDuration, 0, 1));
    });
    var sparkProgress = sincePickup < 0 ? 1 : clamp(sincePickup / 560, 0, 1);
    sparks.forEach(function (spark, index) {
      var angle = index * Math.PI / 4;
      var radius = 18 + sparkProgress * 58;
      spark.style.opacity = Math.pow(1 - sparkProgress, 2) * .9;
      spark.style.transform = 'translate(' + (Math.cos(angle) * radius) + 'px,' + (Math.sin(angle) * radius - sparkProgress * 16) + 'px)';
    });
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
    syncHeroTyping();
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
    syncHeroTyping();
    skip.focus({ preventScroll: true });
    intro.style.setProperty('--scene-accent', '#bfb2ff');
    badges.forEach(function (badge) {
      badge.classList.remove('is-collected', 'is-current');
      badge.style.setProperty('--step-progress', 0);
    });
    sparks.forEach(function (spark) { spark.style.opacity = 0; });
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
  syncHeroTyping();
});
