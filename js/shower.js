(function () {
  const TOTAL_ROOMS = 20;
  const AVG_MINUTES = 10;
  const storageKey = beachId => `badaCheckShower_${beachId}`;

  function load(beachId) {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey(beachId)) || "null");
      return saved && Number.isFinite(saved.currentUsers) && Number.isFinite(saved.waitingUsers)
        ? saved : { currentUsers: 0, waitingUsers: 0, updatedAt: Date.now() };
    } catch { return { currentUsers: 0, waitingUsers: 0, updatedAt: Date.now() }; }
  }

  function save(beachId, data) {
    data.updatedAt = Date.now();
    localStorage.setItem(storageKey(beachId), JSON.stringify(data));
  }

  function estimate(data) {
    if (data.currentUsers < TOTAL_ROOMS && data.waitingUsers === 0) return 0;
    if (data.waitingUsers === 0) return AVG_MINUTES;
    return Math.ceil(data.waitingUsers / TOTAL_ROOMS) * AVG_MINUTES;
  }

  function enter(beachId) {
    const data = load(beachId);
    if (data.currentUsers < TOTAL_ROOMS) data.currentUsers += 1;
    else data.waitingUsers += 1;
    save(beachId, data);
    return data;
  }

  function exit(beachId) {
    const data = load(beachId);
    if (data.currentUsers <= 0) return { data, error: "현재 샤워 중인 사람이 없습니다." };
    data.currentUsers -= 1;
    if (data.waitingUsers > 0) {
      data.waitingUsers -= 1;
      data.currentUsers += 1;
    }
    save(beachId, data);
    return { data, error: null };
  }

  function reset(beachId) {
    const data = { currentUsers: 0, waitingUsers: 0, updatedAt: Date.now() };
    save(beachId, data);
    return data;
  }

  window.Shower = { TOTAL_ROOMS, AVG_MINUTES, load, enter, exit, reset, estimate };
})();

