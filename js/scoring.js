(function () {
  const clamp = value => Math.max(0, Math.min(100, Math.round(value)));
  const linearPenalty = (value, idealMin, idealMax, outerMin, outerMax) => {
    if (value == null) return null;
    if (value >= idealMin && value <= idealMax) return 100;
    if (value < idealMin) return clamp(((value - outerMin) / (idealMin - outerMin)) * 100);
    return clamp(((outerMax - value) / (outerMax - idealMax)) * 100);
  };

  const scorers = {
    ph: v => linearPenalty(v, 7.8, 8.4, 7.0, 9.0),
    temperature: v => linearPenalty(v, 20, 27, 12, 34),
    turbidity: v => v == null ? null : clamp(100 - v * 8),
    dissolvedOxygen: v => v == null ? null : clamp((v - 3) * 22),
    salinity: v => linearPenalty(v, 30, 35, 20, 40),
    waterTest: v => ({ "적합": 100, "주의": 55, "부적합": 10 }[v] ?? null),
    waveHeight: v => v == null ? null : clamp(100 - Math.max(0, v - 0.3) * 38),
    windSpeed: v => v == null ? null : clamp(100 - Math.max(0, v - 2) * 9),
    ripCurrent: v => ({ "낮음": 100, "보통": 70, "높음": 30, "매우 높음": 5 }[v] ?? null),
    rainfall: v => v == null ? null : clamp(100 - v * 4),
    airTemperature: v => linearPenalty(v, 22, 30, 14, 38),
    weatherAlert: v => ({ "없음": 100, "예비특보": 65, "호우 예비특보": 45, "주의보": 30, "경보": 5 }[v] ?? null)
  };

  const metricMeta = {
    ph: ["pH", ""], temperature: ["수온", "℃"], turbidity: ["탁도", " NTU"], dissolvedOxygen: ["용존산소", " mg/L"], salinity: ["염분", " PSU"], waterTest: ["공식 수질검사", ""], waveHeight: ["파도 높이", " m"], windSpeed: ["풍속", " m/s"], ripCurrent: ["이안류 위험도", ""], rainfall: ["강수량", " mm"], airTemperature: ["기온", "℃"], weatherAlert: ["기상특보", ""]
  };

  function grade(score) {
    if (score == null) return { level: "-", label: "등급 없음", status: "측정정보 없음", className: "caution" };
    if (score >= 90) return { level: 1, label: "1등급", status: "안전", className: "safe" };
    if (score >= 75) return { level: 2, label: "2등급", status: "안전", className: "safe" };
    if (score >= 55) return { level: 3, label: "3등급", status: "불안전", className: "caution" };
    if (score >= 35) return { level: 4, label: "4등급", status: "위험", className: "danger" };
    return { level: 5, label: "5등급", status: "매우 위험", className: "critical" };
  }

  function average(values) {
    const valid = values.filter(v => Number.isFinite(v));
    return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  }

  function evaluateBeach(beach) {
    const scores = {};
    Object.entries(beach.metrics).forEach(([key, value]) => {
      if (scorers[key]) scores[key] = scorers[key](value);
    });
    const categories = {
      water: average([scores.ph, scores.temperature, scores.turbidity, scores.dissolvedOxygen, scores.salinity, scores.waterTest]),
      marine: average([scores.waveHeight, scores.windSpeed, scores.ripCurrent]),
      weather: average([scores.rainfall, scores.airTemperature, scores.weatherAlert])
    };
    let overall = average(Object.values(scores));
    const criticalKeys = ["waterTest", "waveHeight", "ripCurrent", "weatherAlert"];
    const criticalScore = Math.min(...criticalKeys.map(k => scores[k]).filter(Number.isFinite));
    if (Number.isFinite(criticalScore) && criticalScore < 40 && overall > 59) overall = 59;
    return { scores, categories, overall, grade: grade(overall) };
  }

  window.Scoring = { evaluateBeach, grade, metricMeta };
})();

