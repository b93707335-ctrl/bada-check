(function () {
  let selectedBeach = BEACH_DATA[0];
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  function selectBeach(beach) {
    selectedBeach = beach;
    $('#beachSearch').value = beach.name;
    $('#autocomplete').classList.add('hidden');
    saveHistory(beach);
    renderBeach();
  }

  function renderBeach() {
    const result = Scoring.evaluateBeach(selectedBeach);
    $('#beachName').textContent = selectedBeach.name;
    $('#beachLocation').textContent = selectedBeach.location;
    $('#updatedAt').textContent = `측정 시각: ${selectedBeach.measuredAt}`;
    $('#overallScore').textContent = result.overall ?? '-';
    $('#overallGrade').textContent = result.grade.label;
    $('#overallGrade').className = `grade-pill ${result.grade.className}`;
    $('#overallReason').textContent = createReason(result);
    $('#actionGuide').textContent = actionGuide(result.overall);
    $('#dataSource').textContent = `데이터 출처: ${selectedBeach.source}`;

    const categories = [
      ['수질', result.categories.water], ['해양 안전', result.categories.marine], ['날씨', result.categories.weather], ['데이터 완성도', dataCompleteness(selectedBeach)]
    ];
    $('#categoryGrid').innerHTML = categories.map(([name, score]) => {
      const g = Scoring.grade(score);
      return `<article class="category-card card"><span>${name}</span><strong>${score ?? '-'}점</strong><span class="grade-pill ${g.className}">${g.label}</span></article>`;
    }).join('');

    $('#metricGrid').innerHTML = Object.entries(selectedBeach.metrics).map(([key, value]) => {
      const score = result.scores[key];
      const [label, unit] = Scoring.metricMeta[key];
      const g = Scoring.grade(score);
      const width = Number.isFinite(score) ? score : 0;
      return `<article class="metric-card"><div class="metric-top"><div><strong>${label}</strong><div class="muted">${value == null ? '측정정보 없음' : `${value}${unit}`}</div></div><div class="metric-value">${score == null ? '-' : score}점</div></div><div class="progress"><span style="width:${width}%;background:${barColor(score)}"></span></div><span class="grade-pill ${g.className}">${g.label}</span></article>`;
    }).join('');
    updateFavoriteButton();
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
    input.addEventListener('input', () => {
      const q = input.value.trim();
      const matches = BEACH_DATA.filter(b => b.name.includes(q) || b.location.includes(q));
      const box = $('#autocomplete');
      if (!q || !matches.length) return box.classList.add('hidden');
      box.innerHTML = matches.map(b => `<button data-beach-id="${b.id}">${b.name}<br><small>${b.location}</small></button>`).join('');
      box.classList.remove('hidden');
    });
    $('#autocomplete').addEventListener('click', e => {
      const button = e.target.closest('[data-beach-id]');
      if (button) selectBeach(BEACH_DATA.find(b => b.id === button.dataset.beachId));
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

  setupSearch(); setupNavigation(); setupHistory(); saveHistory(selectedBeach); renderBeach();
})();

