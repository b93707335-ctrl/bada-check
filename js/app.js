(function () {
  let selectedBeach = BEACH_DATA[0];
  let selectedCategory = 'water';
  let language = localStorage.getItem('badaCheckLanguage') || 'ko';
  const translations = {
    ko: { appName: '🌊 바다체크', tagline: '바다도 체크하고, 안전도 체크!', notice: '현재 화면에는 시연용 데이터가 포함되어 있습니다.', searchLabel: '가고 싶은 물놀이 장소를 검색하세요.', searchPlaceholder: '예: 해운대해수욕장, 대천천 애기소', nearby: '내 주변', selectedPlace: '선택한 장소', overallScore: '종합점수', safetyGuide: '안전 안내', history: '최근 확인 기록', home: '홈', waterSafety: '물가 안전', footer: '바다체크의 정보는 참고용입니다. 실제 물놀이 전 현장 통제, 기상특보 및 안전요원의 안내를 반드시 확인하세요.', water: '수질', marine: '물가 안전', weather: '날씨', completeness: '데이터 완성도', detailScore: '세부 점수', metricHint: '각 수치는 100점 만점으로 환산됩니다', dataSource: '데이터 출처', location: '위치', safe: '안전', unstable: '불안전', danger: '위험', critical: '매우 위험', noData: '측정정보 없음' },
    ja: { appName: '🌊 海チェック', tagline: '海の状態と安全をチェック！', notice: 'この画面にはデモデータが含まれています。', searchLabel: '行きたい水辺スポットを検索してください。', searchPlaceholder: '例：海雲台海水浴場、大川川', nearby: '現在地の近く', selectedPlace: '選択した場所', overallScore: '総合スコア', safetyGuide: '安全案内', history: '最近の履歴', home: 'ホーム', waterSafety: '水辺の安全', footer: 'この情報は参考用です。入水前に現地の規制、気象警報、安全員の案内を必ず確認してください。', water: '水質', marine: '水辺の安全', weather: '天気', completeness: 'データ完全性', detailScore: '詳細スコア', metricHint: '各数値は100点満点に換算されています', dataSource: 'データ出典', location: '位置', safe: '安全', unstable: '注意', danger: '危険', critical: '非常に危険', noData: '測定情報なし' },
    zh: { appName: '🌊 海洋检查', tagline: '检查海况，也检查安全！', notice: '此页面包含演示数据。', searchLabel: '搜索想去的水边地点。', searchPlaceholder: '例如：海云台海水浴场、大川川', nearby: '附近地点', selectedPlace: '已选地点', overallScore: '综合评分', safetyGuide: '安全指南', history: '最近记录', home: '首页', waterSafety: '水边安全', footer: '此信息仅供参考。入水前请务必确认现场管制、天气预警和安全员指引。', water: '水质', marine: '水边安全', weather: '天气', completeness: '数据完整度', detailScore: '详细评分', metricHint: '每项数值均换算为100分制', dataSource: '数据来源', location: '位置', safe: '安全', unstable: '不安全', danger: '危险', critical: '非常危险', noData: '无测量信息' }
  };
  const t = key => translations[language][key] || translations.ko[key] || key;
  const statusKey = status => ({ '안전': 'safe', '불안전': 'unstable', '위험': 'danger', '매우 위험': 'critical', '측정정보 없음': 'noData' }[status] || status);
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const categoryDefinitions = [
    { id: 'water', nameKey: 'water', metricKeys: ['ph', 'temperature', 'turbidity', 'dissolvedOxygen', 'salinity', 'waterTest'] },
    { id: 'marine', nameKey: 'marine', metricKeys: ['waveHeight', 'windSpeed', 'ripCurrent'] },
    { id: 'weather', nameKey: 'weather', metricKeys: ['rainfall', 'airTemperature', 'weatherAlert'] },
    { id: 'completeness', nameKey: 'completeness', metricKeys: [] }
  ];

  function visibleMetricKeys(category) {
    return category.metricKeys.filter(key => !(selectedBeach.waterType && key === 'salinity'));
  }

  function selectBeach(beach) {
    selectedBeach = beach;
    $('#beachSearch').value = beach.name;
    $('#autocomplete').classList.add('hidden');
    saveHistory(beach);
    renderBeach();
    renderLocationMap();
  }

  function renderLocationMap() {
    const { lat, lng, name } = selectedBeach;
    const offset = 0.012;
    const bbox = `${lng - offset},${lat - offset},${lng + offset},${lat + offset}`;
    $('#mapLocationName').textContent = `${name} ${t('location')}`;
    $('#locationMap').src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  }

  function renderBeach() {
    const result = Scoring.evaluateBeach(selectedBeach);
    $('#beachName').textContent = selectedBeach.name;
    $('#beachLocation').textContent = selectedBeach.location;
    $('#updatedAt').textContent = `${t('location')}: ${selectedBeach.measuredAt}`;
    $('#overallScore').textContent = result.overall ?? '-';
    $('#overallGrade').textContent = result.grade.label;
    $('#overallGrade').className = `grade-pill ${result.grade.className}`;
    $('#overallReason').textContent = createReason(result);
    $('#actionGuide').textContent = actionGuide(result.overall);
    $('#dataSource').textContent = `${t('dataSource')}: ${selectedBeach.source}`;

    const categories = categoryDefinitions.map(category => ({
      ...category,
      name: t(category.nameKey),
      metricKeys: visibleMetricKeys(category),
      score: category.id === 'completeness' ? dataCompleteness(selectedBeach) : result.categories[category.id]
    }));
    $('#categoryGrid').innerHTML = categories.map(category => {
      const { id, name, score } = category;
      const g = Scoring.grade(score);
      return `<button class="category-card card ${id === selectedCategory ? 'active' : ''}" data-category="${id}" aria-pressed="${id === selectedCategory}"><span>${name}</span><strong>${score ?? '-'}점</strong><span class="grade-level">${g.label}</span><span class="grade-pill grade-status ${g.className}">${t(statusKey(g.status))}</span></button>`;
    }).join('');
    renderCategoryDetails(result);
    updateFavoriteButton();
  }

  function renderCategoryDetails(result) {
    const category = categoryDefinitions.find(item => item.id === selectedCategory) || categoryDefinitions[0];
    const details = category.id === 'completeness'
      ? categoryDefinitions.filter(item => item.id !== 'completeness').map(item => {
          const metricKeys = visibleMetricKeys(item);
          const filled = metricKeys.filter(key => selectedBeach.metrics[key] != null).length;
          return { label: `${t(item.nameKey)} 데이터`, value: `${filled}/${metricKeys.length}개 입력`, score: Math.round(filled / metricKeys.length * 100) };
        })
      : visibleMetricKeys(category).map(key => ({
          key,
          label: Scoring.metricMeta[key][0],
          value: selectedBeach.metrics[key] == null ? '측정정보 없음' : `${selectedBeach.metrics[key]}${Scoring.metricMeta[key][1]}`,
          score: result.scores[key],
          definition: Scoring.metricDefinitions[key]
        }));

    $('#metricTitle').textContent = `${t(category.nameKey)} ${t('detailScore')}`;
    $('#metricHint').textContent = category.id === 'completeness' ? `${t('completeness')} 100%` : t('metricHint');
    $('#metricGrid').innerHTML = details.map(({ key, label, value, score, definition }) => {
      const g = Scoring.grade(score);
      const width = Number.isFinite(score) ? score : 0;
      const help = definition ? `<button class="term-help" type="button" data-definition-key="${key}" aria-expanded="false" aria-label="${label} 뜻 보기">＊</button>` : '';
      const definitionPanel = definition ? `<p class="term-definition hidden" data-definition-panel="${key}">${definition}</p>` : '';
      return `<article class="metric-card"><div class="metric-top"><div><strong>${label}${help}</strong><div class="muted">${value}</div></div><div class="metric-value">${score == null ? '-' : score}점</div></div><div class="progress"><span style="width:${width}%;background:${barColor(score)}"></span></div><span class="grade-pill ${g.className}">${g.label} · ${t(statusKey(g.status))}</span>${definitionPanel}</article>`;
    }).join('');
  }

  function createReason(result) {
    const low = Object.entries(result.scores).filter(([, score]) => score != null && score < 60).sort((a,b) => a[1]-b[1]);
    if (!low.length) return '현재 확인된 수질, 파도, 날씨 항목이 대체로 양호합니다.';
    const labels = low.slice(0,2).map(([key]) => Scoring.metricMeta[key][0]).join(', ');
    return `${labels} 항목의 점수가 낮아 현장 상황을 추가로 확인해야 합니다.`;
  }

  function actionGuide(score) {
    if (score >= 80) return '현재 확인된 정보에서는 물놀이하기에 비교적 안전합니다. 현장 안전요원의 안내를 따라주세요.';
    if (score >= 60) return '어린이와 노약자는 물놀이에 주의하고, 현장 상황을 다시 확인하세요.';
    if (score >= 40) return '현재 물놀이를 권장하지 않습니다. 파도와 수질 상태가 개선된 후 이용하세요.';
    return '입수하지 마세요. 현장 통제와 안전요원의 지시를 따라주세요.';
  }

  function dataCompleteness(beach) {
    const values = Object.values(beach.metrics);
    return Math.round(values.filter(v => v != null).length / values.length * 100);
  }

  function barColor(score) {
    if (score >= 80) return '#2e9d63'; if (score >= 60) return '#e0a800'; if (score >= 40) return '#f07b22'; return '#d64545';
  }

  function setupSearch() {
    const input = $('#beachSearch');
    input.value = selectedBeach.name;
    input.placeholder = t('searchPlaceholder');
    function showMatches(query) {
      const q = query.trim();
      const matches = BEACH_DATA.filter(b => !q || b.name.includes(q) || b.location.includes(q));
      const box = $('#autocomplete');
      if (!matches.length) return box.classList.add('hidden');
      box.innerHTML = matches.map(b => `<button data-beach-id="${b.id}">${b.name}<br><small>${b.location}</small></button>`).join('');
      box.classList.remove('hidden');
    }
    input.addEventListener('focus', () => showMatches(''));
    input.addEventListener('click', () => showMatches(''));
    input.addEventListener('input', () => showMatches(input.value));
    $('#autocomplete').addEventListener('click', e => {
      const button = e.target.closest('[data-beach-id]');
      if (button) selectBeach(BEACH_DATA.find(b => b.id === button.dataset.beachId));
    });
  }

  function applyLanguage() {
    document.documentElement.lang = language;
    $$('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
    $('.language-switcher').querySelectorAll('[data-language]').forEach(button => button.classList.toggle('active', button.dataset.language === language));
    $('#beachSearch').placeholder = t('searchPlaceholder');
    renderBeach();
    renderLocationMap();
  }

  function setupLanguageSwitcher() {
    $('.language-switcher').addEventListener('click', event => {
      const button = event.target.closest('[data-language]');
      if (!button) return;
      language = button.dataset.language;
      localStorage.setItem('badaCheckLanguage', language);
      applyLanguage();
    });
  }

  function setupNavigation() {
    $$('[data-target]').forEach(button => button.addEventListener('click', () => {
      const target = button.dataset.target;
      $$('.view').forEach(v => v.classList.toggle('active', v.id === target));
      $$('.nav-button').forEach(n => n.classList.toggle('active', n.dataset.target === target));
      if (target === 'historyView') renderHistory();
    }));
  }

  function setupCategoryCards() {
    $('#categoryGrid').addEventListener('click', event => {
      const card = event.target.closest('[data-category]');
      if (!card) return;
      selectedCategory = card.dataset.category;
      renderBeach();
    });
  }

  function setupTermDefinitions() {
    $('#metricGrid').addEventListener('click', event => {
      const button = event.target.closest('[data-definition-key]');
      if (!button) return;
      const panel = $(`[data-definition-panel="${button.dataset.definitionKey}"]`);
      const isHidden = panel.classList.contains('hidden');
      panel.classList.toggle('hidden', !isHidden);
      button.setAttribute('aria-expanded', String(isHidden));
    });
  }

  function saveHistory(beach) {
    const history = JSON.parse(localStorage.getItem('badaCheckHistory') || '[]').filter(x => x.id !== beach.id);
    history.unshift({ id: beach.id, name: beach.name, checkedAt: new Date().toLocaleString('ko-KR') });
    localStorage.setItem('badaCheckHistory', JSON.stringify(history.slice(0, 8)));
  }

  function renderHistory() {
    const history = JSON.parse(localStorage.getItem('badaCheckHistory') || '[]');
    $('#historyList').innerHTML = history.length ? history.map(item => `<button class="history-item" data-history-id="${item.id}"><span><strong>${item.name}</strong><br><small>${item.checkedAt}</small></span><span>다시 보기 →</span></button>`).join('') : '<p class="muted">아직 확인한 해수욕장이 없습니다.</p>';
  }

  function setupHistory() {
    $('#historyList').addEventListener('click', e => {
      const button = e.target.closest('[data-history-id]');
      if (!button) return;
      selectBeach(BEACH_DATA.find(b => b.id === button.dataset.historyId));
      $('[data-target="homeView"]').click();
    });
  }

  function favoriteIds() { return JSON.parse(localStorage.getItem('badaCheckFavorites') || '[]'); }
  function updateFavoriteButton() { $('#favoriteBtn').textContent = favoriteIds().includes(selectedBeach.id) ? '★' : '☆'; }
  function toggleFavorite() {
    const ids = favoriteIds(); const i = ids.indexOf(selectedBeach.id);
    if (i >= 0) ids.splice(i,1); else ids.push(selectedBeach.id);
    localStorage.setItem('badaCheckFavorites', JSON.stringify(ids)); updateFavoriteButton();
  }

  $('#favoriteBtn').addEventListener('click', toggleFavorite);
  $('#locationBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return alert('이 브라우저는 위치 기능을 지원하지 않습니다.');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const nearest = BEACH_DATA.slice().sort((a,b) => distance(latitude, longitude, a.lat, a.lng) - distance(latitude, longitude, b.lat, b.lng))[0];
      selectBeach(nearest);
    }, () => alert('위치 권한을 허용하지 않아 기본 해수욕장을 표시합니다.'));
  });

  function distance(lat1, lon1, lat2, lon2) { return Math.hypot(lat1-lat2, lon1-lon2); }

  setupSearch(); setupNavigation(); setupHistory(); setupCategoryCards(); setupTermDefinitions(); setupLanguageSwitcher(); saveHistory(selectedBeach); applyLanguage();
})();

