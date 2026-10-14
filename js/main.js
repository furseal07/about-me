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

  // 헤더 로고 물음표 블록: 칠 때마다 경험치 +14 와 한마디가 튀어나오고, 막대가 다 차면 레벨이 오릅니다.
  // 레벨은 소개 창의 'LV.' 숫자까지 함께 바뀝니다. (새로고침하면 28로 돌아옵니다)
  var logoQuest = document.getElementById('logoQuest');
  if (logoQuest) {
    var logoXp = logoQuest.querySelector('.logo-xp');
    var logoStatus = document.getElementById('logoStatus');
    var levelLabels = document.querySelectorAll('[data-level]');
    var logoLevel = 28;
    var logoExp = 72;
    var logoGain = 14;
    var logoLines = ['버그 처치!', '커피 수혈 ☕', '문서 정리 완료', '커밋 푸시!', '회의 생존', '리팩터링 성공', '오타 발견!', '배포 무사 통과'];
    var logoLineIndex = 0;
    var logoTimer = 0;
    var replayClass = function (name) {
      logoQuest.classList.remove(name);
      void logoQuest.offsetWidth; // 같은 애니메이션을 다시 재생하기 위한 리플로우
      logoQuest.classList.add(name);
    };
    var popLogo = function (text, levelUp) {
      var old = logoQuest.querySelector('.logo-pop');
      if (old) old.remove();
      var pop = document.createElement('span');
      pop.className = 'logo-pop' + (levelUp ? ' is-levelup' : '');
      pop.setAttribute('aria-hidden', 'true');
      pop.textContent = text;
      logoQuest.appendChild(pop);
      pop.addEventListener('animationend', function () { pop.remove(); });
    };
    logoQuest.addEventListener('click', function () {
      var line = logoLines[logoLineIndex++ % logoLines.length];
      logoExp += logoGain;
      var levelUp = logoExp >= 100;
      if (levelUp) {
        logoExp -= 100;
        logoLevel += 1;
        levelLabels.forEach(function (label) { label.textContent = String(logoLevel); });
      }
      // 레벨업이면 막대를 끝까지 채웠다가 남은 경험치로 다시 시작합니다.
      logoXp.style.setProperty('--xp', levelUp ? '100' : String(logoExp));
      if (levelUp) setTimeout(function () { logoXp.style.setProperty('--xp', String(logoExp)); }, 450);
      replayClass(levelUp ? 'is-levelup' : 'is-bump');
      clearTimeout(logoTimer);
      logoTimer = setTimeout(function () { logoQuest.classList.remove('is-bump', 'is-levelup'); }, 950);
      var message = levelUp ? 'LEVEL UP! LV.' + logoLevel : '+' + logoGain + ' EXP ' + line;
      popLogo(message, levelUp);
      if (logoStatus) logoStatus.textContent = levelUp ? '레벨 업! 엄상희 LV.' + logoLevel + ' 달성.' : '경험치 +' + logoGain + ', ' + line + ' 경험치 ' + logoExp + '%';
    });
  }

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
  // 분야 메뉴 → 상태창 → 전체 요약 수치 → 맨 아래 메뉴 버튼(업무 전략·운세·점메추) 순서로 하나씩 나타납니다.
  var heroSummaryItems = Array.from(document.querySelectorAll('.hero .role-menu, .hero .role-tab, .hero .role-panel, .hero .stat-badges[data-stats="all"] > li, .hero .catalog-menu > .catalog-tab'));
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

  // 요약 칸 누르기: 업무 경력·교육 → 경력·학력 탭의 해당 구역으로, 프로젝트 → 포트폴리오로 이동할지 묻는 창,
  // 'dialog:아이디' → 그 자세히 보기 창(기획 칸). 창 안의 '▶ ○○ 보기' 버튼은 지금 창을 닫고 다른 창을 엽니다.
  var portfolioDialog = document.getElementById('portfolioDialog');
  document.querySelectorAll('.stat-link, .info-jump[data-go]').forEach(function (link) {
    link.addEventListener('click', function () {
      var target = link.dataset.go;
      if (target.indexOf('dialog:') === 0) {
        var dialog = document.getElementById(target.slice(7));
        var current = link.closest('dialog');
        if (current) current.close();
        if (dialog && dialog.showModal) dialog.showModal();
        return;
      }
      if (target === 'portfolio') {
        if (portfolioDialog && portfolioDialog.showModal) portfolioDialog.showModal();
        else if (window.confirm('개발자 포트폴리오 페이지로 넘어가시겠습니까?')) location.href = 'https://furseal07.github.io/';
        return;
      }
      showTab('career');
      var section = document.getElementById(target);
      if (section) section.scrollIntoView({ behavior: motionPreference.matches ? 'auto' : 'smooth', block: 'nearest' });
    });
  });
  // 창 바깥(어두운 부분)을 눌러도 닫힙니다.
  document.querySelectorAll('.go-dialog, .info-dialog').forEach(function (dialog) {
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  });

  // 오늘의 운세(카탈로그 02): 날짜로 정해지는 운세라 같은 날에는 몇 번을 열어도 같고, 다음 날 바뀝니다.
  var fortunePanel = document.getElementById('panelFortune');
  if (fortunePanel) {
    var today = new Date();
    var dateKey = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
    var seed = 0;
    for (var c = 0; c < dateKey.length; c++) seed = (seed * 31 + dateKey.charCodeAt(c)) >>> 0;
    var random = function () { // 날짜 씨앗으로 만드는 작은 난수 (mulberry32)
      seed = (seed + 0x6D2B79F5) >>> 0;
      var t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var pick = function (list) { return list[Math.floor(random() * list.length)]; };
    var fortunes = [
      ['대길', '막혔던 일이 술술 풀리는 날. 미뤄 둔 버그부터 잡아 보세요.'],
      ['대길', '오늘 쓴 코드는 한 번에 빌드됩니다. 아마도요.'],
      ['대길', '회의가 예정보다 일찍 끝납니다. 남은 시간은 온전히 당신 것.'],
      ['길', '작은 친절이 큰 기회로 돌아옵니다. 동료의 질문에 한 번 더 답해 주세요.'],
      ['길', '새로운 걸 배우기 딱 좋은 날. 문서 한 페이지가 내일의 무기가 됩니다.'],
      ['길', '오늘 만난 사람이 좋은 인연이 됩니다. 먼저 인사해 보세요.'],
      ['길', '오래 연락 못 한 사람에게서 반가운 소식이 옵니다.'],
      ['중길', '꾸준함이 빛을 보는 날. 평소처럼만 해도 칭찬받습니다.'],
      ['중길', '점심 메뉴 고민이 길어질 수 있어요. 오늘의 점메추에 맡겨 보세요.'],
      ['중길', '정리 정돈하면 운이 들어옵니다. 바탕화면 폴더부터!'],
      ['소길', '서두르면 오타가 납니다. 저장하기 전에 한 번 더 확인!'],
      ['소길', '작은 실수는 웃어넘기면 금방 수습됩니다.']
    ];
    var items = ['따뜻한 아메리카노', '기계식 키보드', '포스트잇', '무선 이어폰', '텀블러', '형광펜', '고무 오리', '초코우유', '손수건', '새 공책'];
    var colors = [['민트', '#22b68f'], ['하늘색', '#4aa3f0'], ['금색', '#f5a524'], ['분홍', '#f0577e'], ['보라', '#9b7bff'], ['크림', '#fff1d6'], ['남색', '#2b2a4a']];
    var words = ['일단 시작!', '천천히, 정확하게', '오늘도 LEVEL UP', '물 많이 마시기', '칭찬 한마디', '퇴근길 산책'];
    var stars = function (count) { return '★'.repeat(count) + '<span>' + '★'.repeat(5 - count) + '</span>'; };
    var fortune = pick(fortunes);
    var color = pick(colors);
    document.getElementById('fortuneDate').textContent = '오늘의 운세 · ' + today.getFullYear() + '.' + String(today.getMonth() + 1).padStart(2, '0') + '.' + String(today.getDate()).padStart(2, '0');
    document.getElementById('fortuneGrade').textContent = fortune[0];
    document.getElementById('fortuneText').textContent = fortune[1];
    document.getElementById('fortuneWork').innerHTML = stars(2 + Math.floor(random() * 4));
    document.getElementById('fortunePeople').innerHTML = stars(2 + Math.floor(random() * 4));
    document.getElementById('fortuneItem').textContent = pick(items);
    document.getElementById('fortuneColor').innerHTML = '<span class="fortune-swatch" style="background:' + color[1] + '"></span>' + color[0];
    document.getElementById('fortuneNumber').textContent = String(1 + Math.floor(random() * 99));
    document.getElementById('fortuneWord').textContent = pick(words);
  }

  // 오늘의 점메추(카탈로그 03): 탭을 열 때마다 슬롯머신처럼 메뉴가 빠르게 돌다가 점점 느려지며 하나에 멈춥니다.
  var lunchSlot = document.getElementById('lunchSlot');
  if (lunchSlot) {
    var lunchMenus = [
      ['🍲', '김치찌개'], ['🍲', '된장찌개'], ['🥘', '제육볶음'], ['🍖', '돈가스'], ['🍚', '비빔밥'], ['🍜', '칼국수'],
      ['🍜', '냉면'], ['🥢', '짜장면'], ['🌶️', '짬뽕'], ['🍣', '초밥'], ['🍜', '쌀국수'], ['🌶️', '마라탕'],
      ['🍔', '햄버거'], ['🥗', '샐러드'], ['🍢', '떡볶이'], ['🍲', '부대찌개'], ['🍲', '순대국'], ['🍙', '김밥'],
      ['🍛', '카레'], ['🍝', '파스타'], ['🍜', '우동'], ['🐙', '쭈꾸미볶음'], ['🍗', '닭갈비'], ['🍲', '국밥']
    ];
    var lunchComments = ['오늘은 이걸로 결정! 고민은 시간만 뺏어요.', '든든하게 먹고 오후도 LEVEL UP!', '이 메뉴라면 실패할 리가 없죠.', '동료도 같이 데려가면 행복 두 배.', '탁월한 선택입니다. (제가 골랐지만요)', '마음에 안 들면 한 번 더 돌려도 괜찮아요.'];
    var lunchEmoji = document.getElementById('lunchEmoji');
    var lunchName = document.getElementById('lunchName');
    var lunchComment = document.getElementById('lunchComment');
    var lunchRoll = document.getElementById('lunchRoll');
    var lunchLast = -1;
    var lunchTimer = 0;
    var showLunch = function (index) {
      lunchEmoji.textContent = lunchMenus[index][0];
      lunchName.textContent = lunchMenus[index][1];
    };
    var finishLunch = function (index) {
      lunchComment.textContent = '오늘의 점메추는 ' + lunchMenus[index][1] + '! ' + lunchComments[Math.floor(Math.random() * lunchComments.length)];
      lunchRoll.disabled = false;
    };
    var rollLunch = function () {
      clearTimeout(lunchTimer);
      var final;
      do { final = Math.floor(Math.random() * lunchMenus.length); } while (final === lunchLast);
      lunchLast = final;
      lunchComment.textContent = '';
      lunchSlot.classList.remove('is-done');
      if (motionPreference.matches) { showLunch(final); finishLunch(final); return; }
      lunchRoll.disabled = true;
      lunchSlot.classList.add('is-rolling');
      var step = 0;
      var steps = 18;
      var spin = function () {
        step++;
        if (step < steps) {
          showLunch(Math.floor(Math.random() * lunchMenus.length));
          lunchTimer = setTimeout(spin, 45 + step * step * 0.8); // 점점 느려집니다
          return;
        }
        showLunch(final);
        lunchSlot.classList.remove('is-rolling');
        void lunchSlot.offsetWidth; // 멈춘 순간 그림이 톡 튀어나오는 애니메이션을 다시 재생
        lunchSlot.classList.add('is-done');
        finishLunch(final);
      };
      spin();
    };
    lunchRoll.addEventListener('click', rollLunch);
  }

  // 카탈로그 메뉴: 첫 화면 맨 아래 버튼 세 개(업무 전략 · 오늘의 운세 · 오늘의 점메추).
  // 누르면 바로 아래 카탈로그 창이 열리고 그 버튼의 면이 보입니다. 열린 버튼을 다시 누르거나 '닫기'를 누르면 닫힙니다.
  // 창이 화면 아래로 넘치면 창이 다 보이도록 부드럽게 내려 줍니다. (세 면은 같은 칸에 겹쳐 있어 바꿔도 높이가 흔들리지 않습니다)
  var catalogTabs = Array.from(document.querySelectorAll('.catalog-tab'));
  var catalogWindow = document.getElementById('catalogWindow');
  var catalogClose = document.getElementById('catalogClose');
  var revealCatalog = function () {
    var rect = catalogWindow.getBoundingClientRect();
    var headerHeight = header ? header.getBoundingClientRect().height : 0;
    var delta = Math.min(rect.bottom - window.innerHeight + 24, rect.top - headerHeight - 16);
    if (delta > 0) window.scrollBy({ top: delta, behavior: motionPreference.matches ? 'auto' : 'smooth' });
  };
  var openCatalog = function (tab) {
    catalogTabs.forEach(function (other) {
      var active = other === tab;
      var panel = document.getElementById(other.dataset.panel);
      other.setAttribute('aria-expanded', String(active));
      panel.classList.toggle('is-active', active);
      panel.setAttribute('aria-hidden', String(!active));
      panel.inert = !active;
    });
    catalogWindow.dataset.cat = tab.dataset.cat;
    catalogWindow.hidden = false;
    if (tab.id === 'tabLunch' && typeof rollLunch === 'function') rollLunch();
    requestAnimationFrame(revealCatalog);
  };
  var closeCatalog = function () {
    var opened = catalogTabs.filter(function (tab) { return tab.getAttribute('aria-expanded') === 'true'; })[0];
    catalogTabs.forEach(function (tab) { tab.setAttribute('aria-expanded', 'false'); });
    catalogWindow.hidden = true;
    return opened;
  };
  if (catalogWindow) {
    catalogTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (!catalogWindow.hidden && tab.getAttribute('aria-expanded') === 'true') closeCatalog();
        else openCatalog(tab);
      });
    });
    if (catalogClose) catalogClose.addEventListener('click', function () {
      var opened = closeCatalog();
      if (opened) opened.focus({ preventScroll: true });
    });
  }

  // 땅 위 동물들: 닭 · 갈색 닭 · 토끼 · 고양이 · 강아지 · 오리가 마을 앞 흙길을 이리저리 걸어 다니다 가끔 멈춰 쉽니다.
  // 동물을 누르면 누른 동물만 깡충 뛰어오릅니다. (움직임 줄이기 설정이면 걷지 않고 제자리에 있고, 눌러도 뛰지 않습니다)
  // (인트로 애니메이션과 이름이 겹치지 않도록 critterTick · critterLastTime 이라는 이름을 씁니다)
  var critterLayer = document.getElementById('critters');
  if (critterLayer) {
    var critters = Array.from(critterLayer.querySelectorAll('.critter')).map(function (el, index) {
      return {
        el: el,
        x: 0,
        dir: index % 2 ? -1 : 1,
        speed: Number(el.dataset.speed) || 22,   // 화면 픽셀/초
        hop: el.dataset.hop === 'true',           // 토끼는 걸을 때도 콩콩 뜁니다
        walking: true,
        timer: 1 + Math.random() * 3,             // 지금 상태(걷기/쉬기)를 유지할 남은 시간(초)
        stepClock: 0,
        jumpStart: -1,
        jumpDelay: 0
      };
    });
    var layerWidth = 0;
    var placeCritters = function () {
      layerWidth = critterLayer.clientWidth;
      critters.forEach(function (c, i) {
        c.x = layerWidth * (0.06 + 0.88 * (i + 0.5) / critters.length) + (Math.random() - 0.5) * 60;
      });
    };
    // 처음(인트로 중) 화면에 안 보일 때는 폭이 0이라, 보이기 시작하거나 창 크기가 바뀌면 그때 자리를 다시 잡습니다.
    var syncLayerWidth = function () {
      var width = critterLayer.clientWidth;
      if (!width || width === layerWidth) return;
      if (!layerWidth) { placeCritters(); return; }
      critters.forEach(function (c) { c.x = c.x / layerWidth * width; });
      layerWidth = width;
    };
    var drawCritter = function (c, lift) {
      var w = c.el.offsetWidth;
      c.x = Math.max(0, Math.min(layerWidth - w, c.x));
      c.el.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + (-lift).toFixed(1) + 'px,0) scaleX(' + c.dir + ')';
    };
    critters.forEach(function (c) { drawCritter(c, 0); });
    var critterLastTime = 0;
    var critterTick = function (now) {
      var dt = critterLastTime ? Math.min(0.05, (now - critterLastTime) / 1000) : 0;
      critterLastTime = now;
      var still = motionPreference.matches;
      syncLayerWidth();
      critters.forEach(function (c) {
        var lift = 0;
        if (!still) {
          c.timer -= dt;
          if (c.timer <= 0) {
            c.walking = !c.walking || Math.random() < 0.3;
            if (c.walking && Math.random() < 0.45) c.dir = -c.dir;   // 가끔 방향을 바꿉니다
            c.timer = c.walking ? 2 + Math.random() * 4 : 1 + Math.random() * 2.5;
          }
          if (c.walking) {
            c.x += c.dir * c.speed * dt;
            var w = c.el.offsetWidth;
            if (c.x <= 0) { c.x = 0; c.dir = 1; }
            if (c.x >= layerWidth - w) { c.x = layerWidth - w; c.dir = -1; }
            c.stepClock += dt;
            if (c.stepClock > 0.18) { c.stepClock = 0; c.el.classList.toggle('is-step'); }
            if (c.hop) lift = Math.abs(Math.sin(now / 160)) * 6;
          } else if (c.el.classList.contains('is-step') && !c.hop) {
            c.el.classList.remove('is-step');
          }
        }
        // 점프: 0.5초 동안 포물선으로 떠올랐다 내려옵니다
        if (c.jumpStart >= 0) {
          var t = (now - c.jumpStart) / 500;
          if (t < 0) { /* 아직 차례가 안 됨 */ }
          else if (t < 1) { lift = Math.sin(t * Math.PI) * 26; c.el.classList.add('is-step'); }
          else { c.jumpStart = -1; }
        }
        drawCritter(c, lift);
      });
      requestAnimationFrame(critterTick);
    };
    requestAnimationFrame(critterTick);
    // 동물을 누르면 그 동물만 깡충 뜁니다
    critters.forEach(function (c) {
      c.el.addEventListener('click', function () {
        if (motionPreference.matches) return;
        c.jumpStart = performance.now();
      });
    });
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