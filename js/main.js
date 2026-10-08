document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  // 항상 첫 화면(소개)부터 시작합니다. 새로고침해도 이전 스크롤 위치나 주소 끝의 #앵커(#work-values)로 내려가지 않습니다.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  function scrollToPageTop() { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }
  scrollToPageTop();
  window.addEventListener('load', function () {
    // 이미지까지 다 불러온 뒤 브라우저가 위치를 다시 옮기는 경우를 막습니다. 인트로가 재생 중일 때만 (사용자가 아직 스크롤할 수 없을 때).
    if (document.body.classList.contains('intro-active')) scrollToPageTop();
  }, { once: true });
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
  var portraitFrame = document.getElementById('portraitFrame');
  var portraitPose = document.getElementById('portraitPose');
  var portraitEmotion = document.getElementById('portraitEmotion');
  var portraitFrameTimer = 0;
  var portraitLaughTimer = 0;
  var portraitReady = false;
  var portraitSequence = '';
  // [sprite index, hold in milliseconds]. Changes happen only at frame boundaries.
  var portraitIdleFrames = [[0, 1500], [1, 150], [0, 100], [2, 150], [0, 100], [1, 150], [0, 100], [2, 150], [0, 1900], [3, 140], [0, 2400]];
  // Laugh steps: [arm pose, hold, vertical pixel offset, facial expression, sparkle beat].
  var portraitLaughFrames = [[0, 100, 0, 5, 0], [1, 140, -12, 4, 1], [2, 140, -24, 4, 2], [1, 120, -12, 5, 1], [0, 180, 0, 4, 0], [1, 140, -12, 4, 1], [2, 140, -24, 4, 2], [1, 120, -12, 5, 1], [0, 220, 0, 4, 0], [1, 140, -12, 4, 1], [2, 140, -24, 4, 2], [1, 140, -12, 5, 1], [0, 220, 0, 4, 0], [0, 260, 0, 5, 0]];
  var portraitLaughDuration = portraitLaughFrames.reduce(function (total, frame) { return total + frame[1]; }, 0);

  function setPortraitFrame(index, lift, expression, beat) {
    if (!portraitFrame) return;
    portraitFrame.setAttribute('x', String(180 - index * 1000));
    if (portraitPose) portraitPose.setAttribute('transform', 'translate(0 ' + (lift || 0) + ')');
    if (portraitEmotion) portraitEmotion.setAttribute('x', String(180 - (expression === undefined ? 4 : expression) * 1000));
    heroPortrait.dataset.frame = String(index);
    heroPortrait.dataset.beat = String(beat || 0);
  }
  function stopPortraitFrames() {
    clearTimeout(portraitFrameTimer);
    portraitFrameTimer = 0;
    portraitSequence = '';
  }
  function endPortraitLaugh() {
    clearTimeout(portraitLaughTimer);
    portraitLaughTimer = 0;
    stopPortraitFrames();
    if (heroPortrait) heroPortrait.classList.remove('is-laughing');
    if (portraitStatus) portraitStatus.textContent = '';
    setPortraitFrame(0);
  }
  function playPortraitFrames(name) {
    if (portraitSequence === name && portraitFrameTimer) return;
    stopPortraitFrames();
    portraitSequence = name;
    var frames = name === 'laugh' ? portraitLaughFrames : portraitIdleFrames;
    var index = 0;
    function nextFrame() {
      portraitFrameTimer = 0;
      if (!heroIsVisible() || !heroPortraitInView || motionPreference.matches) { syncHeroMotion(); return; }
      var frame = frames[index];
      setPortraitFrame(frame[0], frame[2], frame[3], frame[4]);
      index = (index + 1) % frames.length;
      portraitFrameTimer = setTimeout(nextFrame, frame[1]);
    }
    nextFrame();
  }
  function syncHeroMotion() {
    if (!heroPortrait) return;
    var visible = heroIsVisible() && heroPortraitInView;
    var animated = visible && portraitReady && !motionPreference.matches;
    heroPortrait.classList.toggle('is-animated', animated);
    if (!visible || !portraitReady) { endPortraitLaugh(); return; }
    var laughing = heroPortrait.classList.contains('is-laughing');
    if (animated) playPortraitFrames(laughing ? 'laugh' : 'idle');
    else { stopPortraitFrames(); setPortraitFrame(laughing ? 4 : 0); }
  }
  if (heroPortrait && portraitFrame) {
    // Preload one atlas so every pose switches instantly, including the first click.
    heroPortrait.disabled = true;
    var portraitAtlas = new Image();
    function readyPortraitAtlas() {
      portraitReady = true;
      heroPortrait.classList.add('is-sprite-ready');
      heroPortrait.disabled = false;
      syncHeroMotion();
    }
    portraitAtlas.onload = function () {
      if (portraitAtlas.decode) portraitAtlas.decode().then(readyPortraitAtlas, function () {});
      else readyPortraitAtlas();
    };
    portraitAtlas.src = 'assets/character-portrait-frames.png';
    heroPortrait.addEventListener('click', function () {
      if (!portraitReady || !heroIsVisible() || heroPortrait.classList.contains('is-laughing')) return;
      heroPortrait.classList.add('is-laughing');
      if (portraitStatus) portraitStatus.textContent = '엄상희가 꺄르르 웃습니다.';
      portraitLaughTimer = setTimeout(function () {
        endPortraitLaugh();
        syncHeroMotion();
      }, portraitLaughDuration);
      syncHeroMotion();
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
  var heroSummary = document.querySelector('.hero');
  // 분야 메뉴 → 상태창 → 전체 요약 수치 순서로 하나씩 나타납니다.
  var heroSummaryItems = Array.from(document.querySelectorAll('.hero .role-menu, .hero .role-tab, .hero .role-panel, .hero .stat-badges[data-stats="all"] > li'));
  var heroSummaryTimer = 0;
  var heroSummaryIndex = 0;
  var heroSummaryStarted = false;
  var heroSegmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ko', { granularity: 'grapheme' }) : null;

  if (heroSummary) {
    heroSummary.classList.add('is-summary-prepared');
    heroSummaryItems.forEach(function (item) {
      item.classList.add('hero-summary-item');
      item.setAttribute('aria-hidden', 'true');
    });
  }
  function revealHeroSummaryItem() {
    heroSummaryTimer = 0;
    if (!heroIsVisible()) return;
    var item = heroSummaryItems[heroSummaryIndex++];
    if (item) { item.classList.add('is-revealed'); item.removeAttribute('aria-hidden'); }
    if (heroSummaryIndex < heroSummaryItems.length) {
      heroSummaryTimer = setTimeout(revealHeroSummaryItem, 130);
    }
  }
  function syncHeroSummary() {
    clearTimeout(heroSummaryTimer);
    heroSummaryTimer = 0;
    if (!heroSummaryStarted || heroSummaryIndex >= heroSummaryItems.length) return;
    if (motionPreference.matches) {
      heroSummaryItems.forEach(function (item) { item.classList.add('is-revealed'); item.removeAttribute('aria-hidden'); });
      heroSummaryIndex = heroSummaryItems.length;
      return;
    }
    if (heroIsVisible()) heroSummaryTimer = setTimeout(revealHeroSummaryItem, 180);
  }

  // 경험 분야 메뉴: 고른 분야(전체·기획·운영·개발)의 수치를 상태창에 보여줍니다.
  var roleStatus = document.getElementById('roleStatus');
  if (roleStatus) {
    var roleTabs = Array.from(roleStatus.querySelectorAll('.role-tab'));
    var roleLists = Array.from(roleStatus.querySelectorAll('.stat-badges[data-stats]'));
    var roleCaption = document.getElementById('roleCaption');
    var roleAnnounce = document.getElementById('roleAnnounce');
    var showRoleStats = function (role) {
      if (roleStatus.dataset.role === role) return;
      roleStatus.dataset.role = role;
      roleTabs.forEach(function (tab) { tab.setAttribute('aria-pressed', String(tab.dataset.role === role)); });
      roleLists.forEach(function (list) {
        var active = list.dataset.stats === role;
        list.classList.remove('is-switching');
        list.classList.toggle('is-active', active);
        if (!active) return;
        if (roleCaption) roleCaption.textContent = list.dataset.title;
        if (roleAnnounce) {
          roleAnnounce.textContent = list.dataset.title + ': ' + Array.from(list.children, function (item) {
            return item.querySelector('em').textContent + ' ' + item.querySelector('strong').textContent + ', ' + item.querySelector('span').textContent;
          }).join(' / ');
        }
        if (motionPreference.matches) return;
        void list.offsetWidth; // 같은 애니메이션을 다시 재생하기 위한 리플로우
        list.classList.add('is-switching');
      });
    };
    roleTabs.forEach(function (tab) {
      tab.addEventListener('click', function () { showRoleStats(tab.dataset.role); });
    });
  }

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
    if (!heroSummaryStarted) { heroSummaryStarted = true; syncHeroSummary(); }
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
    syncHeroSummary();
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

  // 첫 화면 아래 '업무 전략 ↓' 안내: 주소에 #work-values 를 남기지 않고 업무 전략으로 스크롤만 합니다.
  var heroScroll = document.querySelector('.hero-scroll');
  var workValues = document.getElementById('work-values');
  if (heroScroll && workValues) {
    heroScroll.addEventListener('click', function (event) {
      event.preventDefault();
      workValues.scrollIntoView({ behavior: motionPreference.matches ? 'auto' : 'smooth', block: 'start' });
    });
  }

  // 업무 전략 회전 카드: 가운데 카드가 지금 보는 전략이고, 나머지 두 장은 양옆 뒤에 떠 있습니다(끝에서 처음으로 이어짐).
  // ◀ ▶ 버튼 · 번호 버튼 · 좌우 밀기(스와이프/드래그) · 양옆 카드 클릭 · 키보드 ← → 로 넘깁니다.
  var strategyCarousel = document.getElementById('strategyCarousel');
  if (strategyCarousel) {
    var strategyStage = strategyCarousel.querySelector('.strategy-stage');
    var strategyCards = Array.from(strategyCarousel.querySelectorAll('.strategy'));
    var strategyDots = Array.from(strategyCarousel.querySelectorAll('.strategy-dot'));
    var strategyStatus = document.getElementById('strategyStatus');
    var strategyIndex = 0;
    var dragX = null;
    var dragY = 0;
    var resetTilt = function (card) {
      var face = card.querySelector('.strategy-card');
      face.style.removeProperty('--tilt-x');
      face.style.removeProperty('--tilt-y');
    };
    var showStrategy = function (index, announce) {
      var count = strategyCards.length;
      strategyIndex = (index % count + count) % count;
      strategyCards.forEach(function (card, i) {
        var offset = (i - strategyIndex + count) % count;
        var pos = offset === 0 ? 'center' : offset === 1 ? 'next' : 'prev';
        card.dataset.pos = pos;
        resetTilt(card);
        if (pos === 'center') card.removeAttribute('aria-hidden');
        else card.setAttribute('aria-hidden', 'true');
      });
      strategyDots.forEach(function (dot, i) { dot.setAttribute('aria-current', String(i === strategyIndex)); });
      if (announce && strategyStatus) {
        var active = strategyCards[strategyIndex];
        strategyStatus.textContent = active.getAttribute('aria-label') + ': ' + active.querySelector('.strategy-title').textContent;
      }
    };
    strategyCarousel.querySelectorAll('.strategy-arrow').forEach(function (arrow) {
      arrow.addEventListener('click', function () { showStrategy(strategyIndex + Number(arrow.dataset.step), true); });
    });
    strategyDots.forEach(function (dot) {
      dot.addEventListener('click', function () { showStrategy(Number(dot.dataset.index), true); });
    });
    strategyCarousel.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      showStrategy(strategyIndex + (event.key === 'ArrowRight' ? 1 : -1), true);
    });
    // 좌우로 40px 넘게 밀면 넘기고, 거의 안 움직이고 누르면 그 카드(양옆 카드)를 가운데로 가져옵니다.
    strategyStage.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      dragX = event.clientX;
      dragY = event.clientY;
    });
    strategyStage.addEventListener('pointerup', function (event) {
      if (dragX === null) return;
      var dx = event.clientX - dragX;
      var dy = event.clientY - dragY;
      dragX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { showStrategy(strategyIndex + (dx < 0 ? 1 : -1), true); return; }
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        var card = event.target.closest('.strategy');
        if (card && card.dataset.pos !== 'center') showStrategy(strategyCards.indexOf(card), true);
      }
    });
    strategyStage.addEventListener('pointercancel', function () { dragX = null; });
    // 가운데 카드에 마우스를 올리면 게임 카드처럼 마우스 쪽으로 살짝 기울어집니다. (마우스가 있는 기기에서만)
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    strategyCards.forEach(function (card) {
      var face = card.querySelector('.strategy-card');
      card.addEventListener('pointermove', function (event) {
        if (card.dataset.pos !== 'center' || dragX !== null || !finePointer.matches || motionPreference.matches) return;
        var box = face.getBoundingClientRect();
        var x = (event.clientX - box.left) / box.width - .5;
        var y = (event.clientY - box.top) / box.height - .5;
        face.style.setProperty('--tilt-x', (x * 14).toFixed(2) + 'deg');
        face.style.setProperty('--tilt-y', (-y * 12).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', function () { resetTilt(card); });
    });
    showStrategy(0, false);
  }

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
    // 처음 인트로가 끝나면 맨 위 첫 화면에서 시작합니다. (푸터의 '인트로 다시 보기'로 본 경우는 제자리)
    if (returnFocus !== replay) scrollToPageTop();
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