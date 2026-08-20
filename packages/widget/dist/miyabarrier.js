/*! Miyabarrier v0.5.0 | MIT License | https://github.com/dronehonpo-byte/miyabarrier */
"use strict";
(() => {
  // ../core/src/util.ts
  var clamp = (value, min, max) => value < min ? min : value > max ? max : value;
  var clamp01 = (value) => clamp(value, 0, 1);
  var isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
  var round = (value, digits = 3) => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  };
  var mean = (values) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
  var stdev = (values) => {
    if (values.length < 2) return 0;
    const average = mean(values);
    const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  };
  var coefficientOfVariation = (values) => {
    const average = mean(values);
    if (average === 0) return 0;
    return stdev(values) / Math.abs(average);
  };
  var median = (values) => {
    var _a, _b, _c;
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return (_a = sorted[middle]) != null ? _a : 0;
    return (((_b = sorted[middle - 1]) != null ? _b : 0) + ((_c = sorted[middle]) != null ? _c : 0)) / 2;
  };
  var diffs = (values) => {
    var _a, _b;
    const result = [];
    for (let i = 1; i < values.length; i += 1) {
      result.push(((_a = values[i]) != null ? _a : 0) - ((_b = values[i - 1]) != null ? _b : 0));
    }
    return result;
  };
  var belowFloor = (value, floor) => {
    if (floor <= 0) return 0;
    return clamp01((floor - value) / floor);
  };
  var aboveCeiling = (value, ceiling, max = 1) => {
    if (max <= ceiling) return value > ceiling ? 1 : 0;
    return clamp01((value - ceiling) / (max - ceiling));
  };
  var modeRatio = (values, quantum = 1) => {
    var _a;
    if (values.length === 0) return 0;
    const counts = /* @__PURE__ */ new Map();
    for (const value of values) {
      const bucket = Math.round(value / quantum);
      counts.set(bucket, ((_a = counts.get(bucket)) != null ? _a : 0) + 1);
    }
    let top = 0;
    for (const count of counts.values()) if (count > top) top = count;
    return top / values.length;
  };
  var normalizeText = (text) => text.normalize("NFKC").toLowerCase().replace(/[\t ]+/g, " ");
  var countOccurrences = (haystack, needle) => {
    if (needle.length === 0) return 0;
    let count = 0;
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      count += 1;
      index = haystack.indexOf(needle, index + needle.length);
    }
    return count;
  };
  var splitSentences = (text) => text.split(/(?<=[。！？!?])|(?<=\.)(?=\s|$)|\n+/g).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
  var JAPANESE_PATTERN = /[぀-ヿ㐀-䶿一-鿿]/;
  var containsJapanese = (text) => JAPANESE_PATTERN.test(text);
  var countUrls = (text) => {
    var _a;
    return ((_a = text.match(/\b(?:https?:\/\/|www\.)[^\s<>"'）)]{3,}/gi)) != null ? _a : []).length;
  };
  var tuneNumber = (tuning, key, fallback) => {
    const value = tuning == null ? void 0 : tuning[key];
    return isFiniteNumber(value) ? value : fallback;
  };
  var tuneStrings = (tuning, key, fallback) => {
    const value = tuning == null ? void 0 : tuning[key];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value;
    }
    return [...fallback];
  };

  // ../core/src/behavior.ts
  var distance = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  var pathLength = (samples) => {
    let total = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const previous = samples[i - 1];
      const current = samples[i];
      if (!previous || !current) continue;
      total += distance(previous.x, previous.y, current.x, current.y);
    }
    return total;
  };
  var localDeviations = (samples) => {
    const result = [];
    for (let i = 1; i < samples.length - 1; i += 1) {
      const previous = samples[i - 1];
      const current = samples[i];
      const next = samples[i + 1];
      if (!previous || !current || !next) continue;
      const baseLength = distance(previous.x, previous.y, next.x, next.y);
      if (baseLength === 0) continue;
      const cross = Math.abs(
        (next.x - previous.x) * (previous.y - current.y) - (previous.x - current.x) * (next.y - previous.y)
      );
      result.push(cross / baseLength);
    }
    return result;
  };
  var stepDistances = (samples) => {
    const result = [];
    for (let i = 1; i < samples.length; i += 1) {
      const previous = samples[i - 1];
      const current = samples[i];
      if (!previous || !current) continue;
      result.push(distance(previous.x, previous.y, current.x, current.y));
    }
    return result;
  };
  var pointerSpeeds = (samples) => {
    const result = [];
    for (let i = 1; i < samples.length; i += 1) {
      const previous = samples[i - 1];
      const current = samples[i];
      if (!previous || !current) continue;
      const dt = current.t - previous.t;
      if (dt <= 0) continue;
      result.push(distance(previous.x, previous.y, current.x, current.y) / dt);
    }
    return result;
  };
  var evaluateBehavior = (input, config) => {
    var _a, _b, _c;
    if (!input) {
      return {
        layer: "behavior",
        applicable: false,
        signals: [],
        metrics: {},
        skipped: "行動の計測値がない"
      };
    }
    const tuning = config == null ? void 0 : config.tuning;
    const instantSubmitMs = tuneNumber(tuning, "instantSubmitMs", 1500);
    const fastSubmitMs = tuneNumber(tuning, "fastSubmitMs", 5e3);
    const staleFormMs = tuneNumber(tuning, "staleFormMs", 72e5);
    const maxCharsPerMinute = tuneNumber(tuning, "maxPlausibleCharsPerMinute", 1200);
    const minMouseSamples = tuneNumber(tuning, "minMouseSamples", 3);
    const pastedCharsThreshold = tuneNumber(tuning, "pastedCharsThreshold", 120);
    const signals = [];
    const elapsedMs = Math.max(0, input.submittedAt - input.renderedAt);
    const pastedChars = input.pastes.reduce((sum, paste) => sum + paste.length, 0);
    const touchCount = (_a = input.touchEventCount) != null ? _a : 0;
    const keyTimes = input.keys.map((key) => key.t).sort((a, b) => a - b);
    if (elapsedMs < instantSubmitMs) {
      signals.push({
        code: "behavior.instantSubmit",
        intensity: belowFloor(elapsedMs, instantSubmitMs),
        detail: `表示から送信まで ${elapsedMs}ms`
      });
    } else if (elapsedMs < fastSubmitMs) {
      signals.push({
        code: "behavior.fastSubmit",
        intensity: belowFloor(elapsedMs, fastSubmitMs),
        detail: `表示から送信まで ${elapsedMs}ms`
      });
    } else if (elapsedMs > staleFormMs) {
      signals.push({
        code: "behavior.staleForm",
        intensity: clamp01((elapsedMs - staleFormMs) / staleFormMs),
        detail: `表示から送信まで ${Math.round(elapsedMs / 6e4)} 分`
      });
    }
    if (input.pointer.length < minMouseSamples && touchCount === 0) {
      signals.push({
        code: "behavior.noMouseActivity",
        intensity: belowFloor(input.pointer.length, minMouseSamples),
        detail: `ポインタ観測 ${input.pointer.length} 件 / タッチ ${touchCount} 件`
      });
    }
    if (input.focus.length === 0) {
      signals.push({ code: "behavior.noFocusEvents" });
    }
    if (input.typedChars > 0 && keyTimes.length === 0 && pastedChars === 0) {
      signals.push({ code: "behavior.noKeystrokes" });
    }
    const typedByHand = Math.max(0, input.typedChars - pastedChars);
    const typingWindowMs = keyTimes.length >= 2 ? ((_b = keyTimes[keyTimes.length - 1]) != null ? _b : 0) - ((_c = keyTimes[0]) != null ? _c : 0) : 0;
    let charsPerMinute = null;
    if (keyTimes.length >= 5 && typingWindowMs >= 200) {
      charsPerMinute = typedByHand / (typingWindowMs / 6e4);
      if (charsPerMinute > maxCharsPerMinute) {
        signals.push({
          code: "behavior.impossibleTypingSpeed",
          intensity: aboveCeiling(charsPerMinute, maxCharsPerMinute, maxCharsPerMinute * 3),
          detail: `${Math.round(charsPerMinute)} 文字/分`
        });
      }
    }
    if (pastedChars >= pastedCharsThreshold) {
      signals.push({
        code: "behavior.pastedBody",
        intensity: aboveCeiling(pastedChars, pastedCharsThreshold, pastedCharsThreshold * 4),
        detail: `貼り付け ${pastedChars} 文字`
      });
    }
    return {
      layer: "behavior",
      applicable: true,
      signals,
      metrics: {
        elapsedMs,
        pointerSamples: input.pointer.length,
        touchEventCount: touchCount,
        keyCount: keyTimes.length,
        focusCount: input.focus.length,
        typedChars: input.typedChars,
        pastedChars,
        charsPerMinute: charsPerMinute === null ? null : round(charsPerMinute, 1)
      }
    };
  };
  var evaluateMimicry = (input, config) => {
    if (!input) {
      return {
        layer: "mimicry",
        applicable: false,
        signals: [],
        metrics: {},
        skipped: "行動の計測値がない"
      };
    }
    const tuning = config == null ? void 0 : config.tuning;
    const minMouseSamples = tuneNumber(tuning, "minMouseSamples", 12);
    const minKeyIntervals = tuneNumber(tuning, "minKeyIntervals", 8);
    const minFieldTransitions = tuneNumber(tuning, "minFieldTransitions", 3);
    const mouseSpeedCvFloor = tuneNumber(tuning, "mouseSpeedCvFloor", 0.18);
    const keyIntervalCvFloor = tuneNumber(tuning, "keyIntervalCvFloor", 0.22);
    const fieldTransitionCvFloor = tuneNumber(tuning, "fieldTransitionCvFloor", 0.12);
    const straightnessCeiling = tuneNumber(tuning, "straightnessCeiling", 0.985);
    const quantizedRatioCeiling = tuneNumber(tuning, "quantizedRatioCeiling", 0.6);
    const jitterFloorPx = tuneNumber(tuning, "jitterFloorPx", 0.75);
    const signals = [];
    const metrics = {};
    const pointer = [...input.pointer].sort((a, b) => a.t - b.t);
    const analysablePointer = pointer.length >= minMouseSamples;
    if (analysablePointer) {
      const speeds = pointerSpeeds(pointer);
      const speedCv = coefficientOfVariation(speeds);
      metrics.pointerSpeedCv = round(speedCv);
      if (speeds.length >= 3 && speedCv < mouseSpeedCvFloor) {
        signals.push({
          code: "mimicry.uniformMouseSpeed",
          intensity: belowFloor(speedCv, mouseSpeedCvFloor),
          detail: `速度の変動係数 ${round(speedCv)}`
        });
      }
      const first = pointer[0];
      const last = pointer[pointer.length - 1];
      const total = pathLength(pointer);
      const straightness = first && last && total > 0 ? distance(first.x, first.y, last.x, last.y) / total : 0;
      metrics.straightness = round(straightness);
      if (total > 0 && straightness > straightnessCeiling) {
        signals.push({
          code: "mimicry.straightMousePath",
          intensity: aboveCeiling(straightness, straightnessCeiling),
          detail: `直線度 ${round(straightness)}`
        });
      }
      const steps = stepDistances(pointer).filter((step) => step > 0);
      const stepModeRatio = modeRatio(steps, 1);
      metrics.stepModeRatio = round(stepModeRatio);
      if (steps.length >= 5 && stepModeRatio > quantizedRatioCeiling) {
        signals.push({
          code: "mimicry.quantizedMouseSteps",
          intensity: aboveCeiling(stepModeRatio, quantizedRatioCeiling),
          detail: `同一移動量の比率 ${round(stepModeRatio)}`
        });
      }
      const jitter = median(localDeviations(pointer));
      metrics.jitterPx = round(jitter);
      if (jitter < jitterFloorPx) {
        signals.push({
          code: "mimicry.noJitter",
          intensity: belowFloor(jitter, jitterFloorPx),
          detail: `局所的な揺れの中央値 ${round(jitter)}px`
        });
      }
    }
    const keyTimes = input.keys.map((key) => key.t).sort((a, b) => a - b);
    const keyIntervals = diffs(keyTimes).filter((interval) => interval >= 0);
    const analysableKeys = keyIntervals.length >= minKeyIntervals;
    if (analysableKeys) {
      const keyCv = coefficientOfVariation(keyIntervals);
      metrics.keyIntervalCv = round(keyCv);
      metrics.keyIntervalMedianMs = round(median(keyIntervals), 1);
      if (keyCv < keyIntervalCvFloor) {
        signals.push({
          code: "mimicry.uniformKeyIntervals",
          intensity: belowFloor(keyCv, keyIntervalCvFloor),
          detail: `打鍵間隔の変動係数 ${round(keyCv)}`
        });
      }
      const keyModeRatio = modeRatio(keyIntervals, 5);
      metrics.keyIntervalModeRatio = round(keyModeRatio);
      if (keyModeRatio > quantizedRatioCeiling) {
        signals.push({
          code: "mimicry.quantizedKeyIntervals",
          intensity: aboveCeiling(keyModeRatio, quantizedRatioCeiling),
          detail: `同一打鍵間隔の比率 ${round(keyModeRatio)}`
        });
      }
    }
    const focusTimes = input.focus.map((focus) => focus.t).sort((a, b) => a - b);
    const transitions = diffs(focusTimes).filter((interval) => interval >= 0);
    const analysableFocus = transitions.length >= minFieldTransitions;
    if (analysableFocus) {
      const transitionCv = coefficientOfVariation(transitions);
      metrics.fieldTransitionCv = round(transitionCv);
      if (transitionCv < fieldTransitionCvFloor) {
        signals.push({
          code: "mimicry.uniformFieldTransitions",
          intensity: belowFloor(transitionCv, fieldTransitionCvFloor),
          detail: `欄移動間隔の変動係数 ${round(transitionCv)}`
        });
      }
    }
    const applicable = analysablePointer || analysableKeys || analysableFocus;
    return {
      layer: "mimicry",
      applicable,
      signals,
      metrics: {
        ...metrics,
        pointerSamples: pointer.length,
        keyIntervals: keyIntervals.length,
        fieldTransitions: transitions.length
      },
      ...applicable ? {} : { skipped: "統計判定に足るサンプル数がない" }
    };
  };

  // ../core/src/checkbox.ts
  var evaluateCheckbox = (input, config) => {
    var _a, _b, _c;
    if (!input || !input.present) {
      return {
        layer: "checkbox",
        applicable: false,
        signals: [],
        metrics: {},
        skipped: input ? "チェックボックス UI が無効" : "チェックボックスの計測値がない"
      };
    }
    const tuning = config == null ? void 0 : config.tuning;
    const instantCheckMs = tuneNumber(tuning, "instantCheckMs", 250);
    const minPointerTrail = tuneNumber(tuning, "minPointerTrail", 2);
    const maxToggles = tuneNumber(tuning, "maxToggles", 6);
    const signals = [];
    const elapsedToCheck = input.checked && typeof input.checkedAt === "number" ? input.checkedAt - input.renderedAt : null;
    const toggleCount = (_a = input.toggleCount) != null ? _a : input.checked ? 1 : 0;
    const pointerSamples = (_b = input.pointerSamplesBeforeCheck) != null ? _b : 0;
    if (!input.checked) {
      signals.push({ code: "checkbox.unchecked" });
    } else {
      if (input.trustedClick === false) {
        signals.push({ code: "checkbox.programmaticCheck" });
      }
      if (elapsedToCheck !== null && elapsedToCheck < instantCheckMs) {
        signals.push({
          code: "checkbox.instantCheck",
          intensity: belowFloor(Math.max(elapsedToCheck, 0), instantCheckMs),
          detail: `表示から ${Math.max(elapsedToCheck, 0)}ms でチェック`
        });
      }
      if (pointerSamples < minPointerTrail) {
        signals.push({
          code: "checkbox.noPointerTrail",
          intensity: belowFloor(pointerSamples, minPointerTrail),
          detail: `チェック前のポインタ／タッチ観測 ${pointerSamples} 件`
        });
      }
    }
    if (toggleCount > maxToggles) {
      signals.push({
        code: "checkbox.excessiveToggles",
        detail: `切り替え ${toggleCount} 回`
      });
    }
    return {
      layer: "checkbox",
      applicable: true,
      signals,
      metrics: {
        checked: input.checked,
        elapsedToCheckMs: elapsedToCheck,
        trustedClick: (_c = input.trustedClick) != null ? _c : null,
        pointerSamplesBeforeCheck: pointerSamples,
        toggleCount
      }
    };
  };

  // ../core/src/content.ts
  var CORPORATE_PATTERN = /(株式会社|合同会社|有限会社|一般社団法人|合資会社|\bco\.,?\s?ltd\b|\binc\b)/;
  var SELF_INTRO_PATTERN = /(と申します|と言います|担当(?:者)?(?:です|でございます)|営業部|マーケティング部)/;
  var SIGNATURE_MARKERS = [
    /〒\s*\d{3}[-ー－]?\d{4}/,
    /(?:tel|電話)[:：]?\s*0\d/,
    /(?:fax)[:：]?\s*0\d/,
    /(?:e-?mail|メール)[:：]/,
    /0\d{1,3}[-(]\d{2,4}[-)]\d{3,4}/,
    /https?:\/\//,
    /(?:所在地|住所|事業内容|会社概要)[:：]/
  ];
  var LIST_LINE_PATTERN = /^\s*(?:[・･◆●○■□*\-–—]|\d{1,2}[.)、]|[①-⑳])\s*\S/;
  var scoreNgWords = (text, list) => {
    var _a, _b, _c;
    const normalized = normalizeText(text);
    const allowPhrases = ((_b = (_a = list.allowlist) == null ? void 0 : _a.terms) != null ? _b : []).map((phrase) => normalizeText(phrase)).filter((phrase) => phrase.length > 0 && normalized.includes(phrase));
    const matches = [];
    const perCategory = {};
    let total = 0;
    for (const category of list.categories) {
      let categoryScore = 0;
      const limitReached = () => category.score > 0 ? categoryScore >= category.cap : categoryScore <= category.cap;
      for (const rawTerm of category.terms) {
        if (limitReached()) break;
        const term = normalizeText(rawTerm);
        const hits = countOccurrences(normalized, term);
        if (hits === 0) continue;
        const shieldedHits = allowPhrases.filter((phrase) => phrase.includes(term)).reduce((sum, phrase) => sum + countOccurrences(normalized, phrase), 0);
        if (hits <= shieldedHits) continue;
        categoryScore += category.score;
        matches.push({
          categoryId: category.id,
          label: category.label,
          term: rawTerm,
          kind: "term",
          score: category.score
        });
      }
      for (const source of (_c = category.patterns) != null ? _c : []) {
        if (limitReached()) break;
        let regex;
        try {
          regex = new RegExp(source, "gi");
        } catch {
          continue;
        }
        if (!regex.test(normalized)) continue;
        categoryScore += category.score;
        matches.push({
          categoryId: category.id,
          label: category.label,
          term: source,
          kind: "pattern",
          score: category.score
        });
      }
      if (categoryScore !== 0) {
        const capped = category.score > 0 ? Math.min(categoryScore, category.cap) : Math.max(categoryScore, category.cap);
        perCategory[category.id] = capped;
        total += capped;
      }
    }
    return { score: round(total, 2), matches, perCategory };
  };
  var evaluateContent = (input, config, list) => {
    var _a, _b;
    if (!input || !list) {
      return {
        layer: "content",
        applicable: false,
        signals: [],
        metrics: {},
        skipped: "本文またはパターン定義がない"
      };
    }
    const tuning = config == null ? void 0 : config.tuning;
    const minChars = tuneNumber(tuning, "minChars", 24);
    const ngScoreSaturation = tuneNumber(tuning, "ngScoreSaturation", 12);
    const freeUrlAllowance = tuneNumber(tuning, "freeUrlAllowance", 1);
    const urlSaturation = tuneNumber(tuning, "urlSaturation", 4);
    const headChars = tuneNumber(tuning, "companyIntroHeadChars", 120);
    const text = (_a = input.text) != null ? _a : "";
    const trimmed = text.trim();
    if (trimmed.length < minChars) {
      return {
        layer: "content",
        applicable: false,
        signals: [],
        metrics: { chars: trimmed.length },
        skipped: `本文が短すぎる (${trimmed.length} 文字 < ${minChars})`
      };
    }
    const signals = [];
    const ng = scoreNgWords(text, list);
    if (ng.score > 0) {
      const topTerms = ng.matches.filter((match) => match.score > 0).slice(0, 6).map((match) => match.term);
      signals.push({
        code: "content.ngWords",
        intensity: clamp01(ng.score / ngScoreSaturation),
        detail: `営業スコア ${ng.score} / 検出語: ${topTerms.join("、")}`
      });
    }
    const urls = countUrls(text);
    if (urls > freeUrlAllowance) {
      signals.push({
        code: "content.urlSpam",
        intensity: aboveCeiling(urls, freeUrlAllowance, urlSaturation),
        detail: `URL ${urls} 件`
      });
    }
    const head = trimmed.slice(0, headChars);
    const senderName = (_b = input.senderName) != null ? _b : "";
    if (CORPORATE_PATTERN.test(head) && SELF_INTRO_PATTERN.test(head) || CORPORATE_PATTERN.test(senderName)) {
      signals.push({
        code: "content.companyIntroOpening",
        detail: CORPORATE_PATTERN.test(senderName) ? "氏名欄に法人格" : "冒頭に法人格つきの自己紹介"
      });
    }
    const tail = trimmed.slice(-260);
    const signatureHits = SIGNATURE_MARKERS.filter((pattern) => pattern.test(tail)).length;
    if (signatureHits >= 3) {
      signals.push({
        code: "content.signatureBlock",
        intensity: clamp01(signatureHits / 4),
        detail: `署名要素 ${signatureHits} 種`
      });
    }
    if (input.formLanguage === "ja" && !containsJapanese(text)) {
      signals.push({ code: "content.noJapaneseOnJapaneseForm" });
    }
    const categorySummary = Object.entries(ng.perCategory).map(([id, score]) => `${id}:${score}`).join(", ");
    return {
      layer: "content",
      applicable: true,
      signals,
      metrics: {
        chars: trimmed.length,
        ngScore: ng.score,
        ngMatchCount: ng.matches.length,
        ngCategories: categorySummary,
        urls,
        signatureHits
      }
    };
  };
  var DEFAULT_POLITE_PHRASES = [
    "いただければ",
    "いただけますと",
    "させていただき",
    "ご検討いただ",
    "幸いです",
    "存じます",
    "何卒",
    "よろしくお願い申し上げます",
    "つきましては"
  ];
  var DEFAULT_NOISE_MARKERS = ["！！", "。。", "、、", "www", "笑", "すみません", "ちょっと"];
  var EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  var burstiness = (lengths) => {
    var _a, _b;
    if (lengths.length < 2) return 1;
    const average = mean(lengths);
    if (average === 0) return 1;
    let sum = 0;
    for (let i = 1; i < lengths.length; i += 1) {
      sum += Math.abs(((_a = lengths[i]) != null ? _a : 0) - ((_b = lengths[i - 1]) != null ? _b : 0));
    }
    return sum / (lengths.length - 1) / average;
  };
  var evaluateAiText = (input, config) => {
    var _a;
    if (!input) {
      return {
        layer: "aiText",
        applicable: false,
        signals: [],
        metrics: {},
        skipped: "本文がない"
      };
    }
    const tuning = config == null ? void 0 : config.tuning;
    const minChars = tuneNumber(tuning, "minChars", 80);
    const minSentences = tuneNumber(tuning, "minSentences", 4);
    const sentenceLengthCvFloor = tuneNumber(tuning, "sentenceLengthCvFloor", 0.32);
    const politeDensityCeiling = tuneNumber(tuning, "politePhraseDensityCeiling", 0.012);
    const burstinessFloor = tuneNumber(tuning, "burstinessFloor", 0.35);
    const politePhrases = tuneStrings(tuning, "politePhrases", DEFAULT_POLITE_PHRASES);
    const noiseMarkers = tuneStrings(tuning, "humanNoiseMarkers", DEFAULT_NOISE_MARKERS);
    const text = ((_a = input.text) != null ? _a : "").trim();
    const sentences = splitSentences(text);
    if (text.length < minChars || sentences.length < minSentences) {
      return {
        layer: "aiText",
        applicable: false,
        signals: [],
        metrics: { chars: text.length, sentences: sentences.length },
        skipped: `統計判定に足る長さがない (${text.length} 文字 / ${sentences.length} 文)`
      };
    }
    const signals = [];
    const normalized = normalizeText(text);
    const lengths = sentences.map((sentence) => sentence.length);
    const lengthCv = round(coefficientOfVariation(lengths));
    if (lengthCv < sentenceLengthCvFloor) {
      signals.push({
        code: "ai.uniformSentenceLength",
        intensity: belowFloor(lengthCv, sentenceLengthCvFloor),
        detail: `文長の変動係数 ${lengthCv}`
      });
    }
    const politeHits = politePhrases.reduce(
      (sum, phrase) => sum + countOccurrences(normalized, normalizeText(phrase)),
      0
    );
    const politeDensity = politeHits / text.length;
    if (politeDensity > politeDensityCeiling) {
      signals.push({
        code: "ai.politeTemplateDensity",
        intensity: aboveCeiling(politeDensity, politeDensityCeiling, politeDensityCeiling * 3),
        detail: `定型丁寧表現 ${politeHits} 箇所 / ${text.length} 文字`
      });
    }
    const rhythm = round(burstiness(lengths));
    if (rhythm < burstinessFloor) {
      signals.push({
        code: "ai.lowBurstiness",
        intensity: belowFloor(rhythm, burstinessFloor),
        detail: `文長の揺らぎ ${rhythm}`
      });
    }
    const listLines = text.split(/\n/).filter((line) => LIST_LINE_PATTERN.test(line)).length;
    if (listLines >= 3) {
      signals.push({
        code: "ai.structuredListing",
        intensity: clamp01((listLines - 2) / 4),
        detail: `箇条書き ${listLines} 行`
      });
    }
    const noiseHits = noiseMarkers.filter(
      (marker) => normalized.includes(normalizeText(marker))
    ).length;
    if (noiseHits === 0 && !EMOJI_PATTERN.test(text) && text.length >= 200) {
      signals.push({ code: "ai.noTypos", intensity: 0.6 });
    }
    return {
      layer: "aiText",
      applicable: true,
      signals,
      metrics: {
        chars: text.length,
        sentences: sentences.length,
        sentenceLengthCv: lengthCv,
        burstiness: rhythm,
        politeHits,
        politeDensity: round(politeDensity, 4),
        listLines,
        noiseHits
      }
    };
  };

  // ../core/src/environment.ts
  var DEFAULT_HEADLESS_MARKERS = ["headlesschrome", "headless"];
  var DEFAULT_AUTOMATION_MARKERS = [
    "puppeteer",
    "playwright",
    "selenium",
    "phantomjs",
    "electron/",
    "webdriver"
  ];
  var DEFAULT_BOT_MARKERS = [
    "bot",
    "crawler",
    "spider",
    "python-requests",
    "curl/",
    "wget/",
    "axios/",
    "okhttp",
    "scrapy",
    "http-client"
  ];
  var MOBILE_UA_PATTERN = /(android|iphone|ipad|ipod|mobile|windows phone)/;
  var matchesMarker = (userAgent, marker) => {
    var _a, _b;
    if (marker.length > 4 || /[^a-z]/.test(marker)) return userAgent.includes(marker);
    let index = userAgent.indexOf(marker);
    while (index !== -1) {
      const before = (_a = userAgent[index - 1]) != null ? _a : "";
      const after = (_b = userAgent[index + marker.length]) != null ? _b : "";
      if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) return true;
      index = userAgent.indexOf(marker, index + 1);
    }
    return false;
  };
  var evaluateEnvironment = (input, config) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
    if (!input) {
      return {
        layer: "environment",
        applicable: false,
        signals: [],
        metrics: {},
        skipped: "実行環境の計測値がない"
      };
    }
    const tuning = config == null ? void 0 : config.tuning;
    const headlessMarkers = tuneStrings(tuning, "headlessMarkers", DEFAULT_HEADLESS_MARKERS);
    const automationMarkers = tuneStrings(tuning, "automationMarkers", DEFAULT_AUTOMATION_MARKERS);
    const botMarkers = tuneStrings(tuning, "botUserAgentMarkers", DEFAULT_BOT_MARKERS);
    const signals = [];
    const userAgent = ((_a = input.userAgent) != null ? _a : "").toLowerCase();
    const isMobileUa = MOBILE_UA_PATTERN.test(userAgent);
    const isTouchCapable = ((_b = input.maxTouchPoints) != null ? _b : 0) > 0;
    if (input.webdriver === true) {
      signals.push({ code: "env.webdriver" });
    }
    const headlessHit = headlessMarkers.find((marker) => matchesMarker(userAgent, marker));
    if (headlessHit) {
      signals.push({ code: "env.headlessUserAgent", detail: headlessHit });
    }
    const automationHit = automationMarkers.find((marker) => matchesMarker(userAgent, marker));
    if (automationHit) {
      signals.push({ code: "env.automationUserAgent", detail: automationHit });
    }
    const botHit = botMarkers.find((marker) => matchesMarker(userAgent, marker));
    if (botHit) {
      signals.push({ code: "env.botUserAgent", detail: botHit });
    }
    if (input.isChromium === true && !isTouchCapable && input.pluginCount === 0) {
      signals.push({ code: "env.noPlugins" });
    }
    if (input.isChromium === true && input.hasChromeObject === false) {
      signals.push({ code: "env.chromeObjectMissing" });
    }
    if (Array.isArray(input.languages) && input.languages.length === 0) {
      signals.push({ code: "env.noLanguages" });
    }
    if (typeof input.innerWidth === "number" && typeof input.innerHeight === "number" && typeof input.screenWidth === "number" && typeof input.screenHeight === "number" && input.innerWidth > 0 && input.innerWidth === input.screenWidth && input.innerHeight === input.screenHeight) {
      signals.push({
        code: "env.viewportEqualsScreen",
        detail: `${input.innerWidth}x${input.innerHeight}`
      });
    }
    if (input.outerWidth === 0 || input.outerHeight === 0) {
      signals.push({ code: "env.zeroOuterWindow" });
    }
    if (isMobileUa && input.maxTouchPoints === 0) {
      signals.push({
        code: "env.touchInconsistency",
        detail: "モバイル UA なのに maxTouchPoints が 0"
      });
    }
    if (typeof input.hardwareConcurrency === "number") {
      if (input.hardwareConcurrency === 0) {
        signals.push({ code: "env.suspiciousHardwareConcurrency", detail: "0 コア" });
      } else if (input.hardwareConcurrency > 64) {
        signals.push({
          code: "env.suspiciousHardwareConcurrency",
          intensity: 0.5,
          detail: `${input.hardwareConcurrency} コア`
        });
      }
    }
    if (input.notificationPermission === "denied" && input.permissionsQueryState === "prompt") {
      signals.push({ code: "env.permissionsInconsistency" });
    }
    return {
      layer: "environment",
      applicable: true,
      signals,
      metrics: {
        userAgent: (_d = (_c = input.userAgent) == null ? void 0 : _c.slice(0, 180)) != null ? _d : "",
        webdriver: (_e = input.webdriver) != null ? _e : null,
        pluginCount: (_f = input.pluginCount) != null ? _f : null,
        languageCount: (_h = (_g = input.languages) == null ? void 0 : _g.length) != null ? _h : null,
        isChromium: (_i = input.isChromium) != null ? _i : null,
        hasChromeObject: (_j = input.hasChromeObject) != null ? _j : null,
        viewport: typeof input.innerWidth === "number" ? `${input.innerWidth}x${(_k = input.innerHeight) != null ? _k : 0}` : null,
        screen: typeof input.screenWidth === "number" ? `${input.screenWidth}x${(_l = input.screenHeight) != null ? _l : 0}` : null,
        outer: typeof input.outerWidth === "number" ? `${input.outerWidth}x${(_m = input.outerHeight) != null ? _m : 0}` : null,
        devicePixelRatio: (_n = input.devicePixelRatio) != null ? _n : null,
        hardwareConcurrency: (_o = input.hardwareConcurrency) != null ? _o : null,
        maxTouchPoints: (_p = input.maxTouchPoints) != null ? _p : null
      }
    };
  };

  // ../core/src/honeypot.ts
  var evaluateHoneypot = (input) => {
    var _a, _b, _c, _d, _e, _f;
    if (!input) {
      return {
        layer: "honeypot",
        applicable: false,
        signals: [],
        metrics: {},
        skipped: "ハニーポットの計測値がない"
      };
    }
    const signals = [];
    const filled = input.fields.filter((field) => field.value.trim().length > 0);
    const checkedDecoys = ((_a = input.decoys) != null ? _a : []).filter((decoy) => decoy.checked);
    if (filled.length > 0) {
      signals.push({
        code: "honeypot.filled",
        detail: `隠しフィールドに入力あり: ${filled.map((field) => field.name).join(", ")}`
      });
    }
    if (checkedDecoys.length > 0) {
      signals.push({
        code: "honeypot.decoyChecked",
        detail: `おとりチェックボックスがオン: ${checkedDecoys.map((decoy) => decoy.name).join(", ")}`
      });
    }
    if (typeof input.expectedFieldCount === "number" && input.fields.length < input.expectedFieldCount) {
      signals.push({
        code: "honeypot.fieldMissing",
        detail: `注入 ${input.expectedFieldCount} 件に対し送信時 ${input.fields.length} 件`
      });
    }
    if (input.token) {
      if (!input.token.present) {
        signals.push({ code: "honeypot.tokenMissing" });
      } else if (!input.token.valid) {
        signals.push({ code: "honeypot.tokenTampered" });
      }
    }
    return {
      layer: "honeypot",
      applicable: true,
      signals,
      metrics: {
        fieldCount: input.fields.length,
        filledCount: filled.length,
        decoyCount: ((_b = input.decoys) != null ? _b : []).length,
        checkedDecoyCount: checkedDecoys.length,
        tokenPresent: (_d = (_c = input.token) == null ? void 0 : _c.present) != null ? _d : null,
        tokenValid: (_f = (_e = input.token) == null ? void 0 : _e.valid) != null ? _f : null
      }
    };
  };

  // ../core/src/patterns.data.ts
  var defaultNgWords = {
    "$schema": "./ng-words.schema.json",
    "version": 1,
    "updated": "2026-08-19",
    "locale": [
      "ja",
      "en"
    ],
    "notes": [
      "categories[].score は『1語ヒットするごとに加算される点数』。マイナス値を書くと減点(=正当な問い合わせらしさ)として働く。",
      "categories[].cap は、そのカテゴリ単体で加算できる点数の上限(マイナスカテゴリでは下限)。1カテゴリに語を大量に並べても暴走しないための安全弁。",
      "terms は部分一致。比較前に小文字化・全角英数の半角化・空白の正規化を行うので、リストは小文字・半角で書く。",
      "patterns は JavaScript 正規表現のソース文字列(フラグは gi 固定)。1つのパターンがマッチしたら1ヒットとして score を加算する。",
      "allowlist.terms に含まれる語が本文にあると、その語に内包される NG ワードのヒットを1件ずつ打ち消す(誤検知の抑制)。",
      "追記の作法: 既存カテゴリへは score/cap を変えずに terms を1語ずつ追加する。新カテゴリは id を kebab-case、score は絶対値 1〜4 に収めるのが目安。"
    ],
    "categories": [
      {
        "id": "cold-open",
        "label": "面識のない相手への定型的な前置き",
        "score": 3,
        "cap": 9,
        "terms": [
          "突然のご連絡",
          "突然のメール",
          "初めてご連絡",
          "はじめてご連絡",
          "初めてメール",
          "ご担当者様",
          "ご担当者さま",
          "担当者様",
          "web担当者様",
          "採用ご担当者様",
          "貴社",
          "御社",
          "ホームページを拝見",
          "サイトを拝見",
          "hpを拝見",
          "問い合わせフォームより失礼",
          "フォームより失礼",
          "お問い合わせフォームから失礼"
        ],
        "patterns": [
          "(株式会社|合同会社|有限会社)[^\\s、。,.]{1,14}の[^\\s、。,.]{1,12}と申します",
          "^[\\s\\S]{0,60}(と申します|と言います)[\\s\\S]{0,120}(ご提案|ご案内|ご紹介)"
        ]
      },
      {
        "id": "sales-offer",
        "label": "提案・紹介の申し出",
        "score": 3,
        "cap": 9,
        "terms": [
          "ご提案",
          "提案させて",
          "ご案内させて",
          "ご紹介させて",
          "ご紹介したく",
          "ご案内したく",
          "弊社サービス",
          "当社サービス",
          "弊社では",
          "当社では",
          "弊社商品",
          "お役立ていただける",
          "お力添えできる",
          "お手伝いできる",
          "導入のご検討",
          "営業支援",
          "販路拡大",
          "代理店募集",
          "業務提携",
          "アライアンス"
        ]
      },
      {
        "id": "benefit-claim",
        "label": "効果・成果の売り込み",
        "score": 2,
        "cap": 8,
        "terms": [
          "課題解決",
          "課題を解決",
          "お悩みを解決",
          "売上向上",
          "売上アップ",
          "売上が伸び",
          "コスト削減",
          "コストカット",
          "業務効率化",
          "生産性向上",
          "工数削減",
          "集客力",
          "集客につながる",
          "成約率",
          "問い合わせ数を増",
          "リード獲得",
          "新規開拓",
          "劇的に改善",
          "大幅に改善",
          "劇的に向上",
          "利益率が改善"
        ]
      },
      {
        "id": "proof-authority",
        "label": "実績・権威づけ",
        "score": 2,
        "cap": 6,
        "terms": [
          "導入実績",
          "導入企業",
          "実績多数",
          "導入社数",
          "導入事例",
          "事例集",
          "上場企業",
          "大手企業様",
          "大手企業を中心に",
          "業界no.1",
          "シェアno.1",
          "顧客満足度no.1",
          "特許取得",
          "テレビで紹介",
          "メディア掲載"
        ]
      },
      {
        "id": "cta-meeting",
        "label": "商談・面談への誘導",
        "score": 3,
        "cap": 9,
        "terms": [
          "無料相談",
          "無料でご相談",
          "無料トライアル",
          "無料デモ",
          "無料診断",
          "無料分析",
          "無料でお試し",
          "資料をお送り",
          "資料送付",
          "お打ち合わせ",
          "打ち合わせのお時間",
          "オンライン面談",
          "web会議",
          "zoomにて",
          "お電話にて",
          "30分ほど",
          "30分だけ",
          "15分ほど",
          "日程調整",
          "ご都合のよい",
          "ご都合の良い",
          "ご都合のつく",
          "候補日",
          "面談のご依頼",
          "ご挨拶の機会"
        ]
      },
      {
        "id": "price-bait",
        "label": "価格・期間限定の煽り",
        "score": 2,
        "cap": 6,
        "terms": [
          "初期費用0円",
          "初期費用無料",
          "初期費用ゼロ",
          "成果報酬",
          "完全成果報酬",
          "業界最安",
          "特別価格",
          "特別条件",
          "キャンペーン中",
          "今だけ",
          "期間限定",
          "限定5社",
          "限定10社",
          "枠が埋まり",
          "残りわずか"
        ]
      },
      {
        "id": "web-marketing",
        "label": "Web制作・広告・SEO系の売り込み",
        "score": 3,
        "cap": 9,
        "terms": [
          "seo対策",
          "seo施策",
          "検索順位",
          "上位表示",
          "被リンク",
          "外部リンク対策",
          "meo対策",
          "リスティング広告",
          "web広告運用",
          "広告運用代行",
          "ホームページ制作",
          "hp制作",
          "サイトリニューアル",
          "lp制作",
          "ランディングページ制作",
          "instagram運用代行",
          "sns運用代行",
          "youtube運用",
          "アクセス解析",
          "maツール",
          "crm導入",
          "生成aiの導入支援",
          "dx推進支援"
        ]
      },
      {
        "id": "recruit-hr",
        "label": "人材・採用系の売り込み",
        "score": 3,
        "cap": 6,
        "terms": [
          "人材紹介",
          "人材派遣",
          "採用支援",
          "採用代行",
          "求人広告のご案内",
          "エンジニアのご紹介",
          "即戦力人材",
          "オフショア開発",
          "ニアショア",
          "常駐可能",
          "業務委託でのご協力",
          "フリーランス人材"
        ]
      },
      {
        "id": "finance-legal",
        "label": "資金・節税・コスト削減系の売り込み",
        "score": 3,
        "cap": 6,
        "terms": [
          "資金調達",
          "ファクタリング",
          "つなぎ融資",
          "助成金",
          "補助金申請",
          "補助金の採択",
          "節税対策",
          "保険の見直し",
          "電気代の削減",
          "通信費の削減",
          "オフィス移転のご相談"
        ]
      },
      {
        "id": "mass-mail-boilerplate",
        "label": "一斉送信の痕跡（配信停止文・免責文）",
        "score": 4,
        "cap": 8,
        "terms": [
          "配信停止",
          "配信の停止",
          "心当たりのない場合",
          "心当たりがない場合",
          "お心当たりのない",
          "ご不要でしたら",
          "不要な場合はご返信",
          "今後のご案内を希望されない",
          "重複してお送り",
          "本メールは営業目的",
          "掲載情報をもとに",
          "公開情報をもとに",
          "ホームページに掲載されている情報",
          "unsubscribe",
          "opt out",
          "opt-out"
        ]
      },
      {
        "id": "signature-block",
        "label": "署名ブロック（会社情報の列挙）",
        "score": 2,
        "cap": 6,
        "terms": [
          "tel:",
          "fax:",
          "e-mail:",
          "所在地:",
          "事業内容:",
          "営業部",
          "マーケティング部",
          "事業開発部"
        ],
        "patterns": [
          "〒\\s*\\d{3}[-ー－]?\\d{4}",
          "0\\d{1,3}[-(]\\d{2,4}[-)]\\d{3,4}"
        ]
      },
      {
        "id": "english-outreach",
        "label": "英語のコールドアプローチ定型句",
        "score": 3,
        "cap": 12,
        "terms": [
          "dear sir",
          "dear madam",
          "to whom it may concern",
          "i hope this email finds you well",
          "i hope you are doing well",
          "hope this message finds you",
          "we specialize in",
          "we specialise in",
          "we are a leading",
          "increase your sales",
          "boost your traffic",
          "grow your business",
          "first page of google",
          "rank higher on google",
          "backlinks",
          "guest post",
          "link building",
          "seo services",
          "web design services",
          "outsourcing partner",
          "dedicated developers",
          "let me know if you are interested",
          "book a call",
          "schedule a quick call",
          "15-minute call",
          "no obligation",
          "free quote",
          "free audit"
        ]
      },
      {
        "id": "legit-inquiry",
        "label": "正当な問い合わせらしさ（減点）",
        "score": -3,
        "cap": -12,
        "terms": [
          "見積",
          "納期",
          "在庫",
          "購入したい",
          "購入を検討",
          "注文",
          "発注",
          "予約",
          "キャンセル",
          "返品",
          "交換",
          "修理",
          "故障",
          "不具合",
          "エラーが出",
          "動作しない",
          "ログインできない",
          "パスワードを忘れ",
          "領収書",
          "請求書の",
          "支払い方法",
          "料金について知りたい",
          "使い方がわからない",
          "使い方を教えて",
          "取材のご依頼",
          "求人に応募",
          "応募したい",
          "採用に応募",
          "体験してみたい",
          "見学",
          "空き状況"
        ]
      }
    ],
    "allowlist": {
      "notes": "ここに書かれた語が本文にあると、その語に内包される NG ワードのヒットを1件打ち消す。『貴社』『無料相談』などで誤検知しやすいケースに使う。",
      "terms": [
        "貴社製品を購入",
        "御社の製品を購入",
        "貴社の求人",
        "御社の求人",
        "無料相談の予約",
        "資料送付いただいた件",
        "先日ご提案いただいた"
      ]
    }
  };
  var defaultWeights = {
    "$schema": "./weights.schema.json",
    "version": 1,
    "updated": "2026-08-19",
    "notes": [
      "各レイヤーは『シグナル(code)』を出力し、scoring がここに書かれた points を引いて加算する。",
      "シグナルは 0〜1 の intensity を持つことができ、加点は points * intensity になる(既定は 1)。",
      "レイヤーのスコア = clamp(シグナル加点の合計 / saturation, 0, 1)。saturation はそのレイヤーが満点になる点数。",
      "レイヤーは group に属する。group スコア = Σ(レイヤースコア * weight) / Σ(判定できたレイヤーの weight)。テレメトリが取れず判定不能なレイヤーは母数から外れるので、モバイルでポインタ軌跡が取れないだけでスコアが動くことはない。",
      "weight はグループ内での相対的な重み。グループごとに合計 1.0 になるように書く。",
      "layers[].evidenceOnly を true にすると、そのレイヤーは加点があるときだけ母数に入る。ハニーポットは『引っかかれば決定的な証拠、無反応なら何の情報でもない』ため true にしている。",
      "総合スコア = combine で決める。noisy-or では 1 - Π(1 - groupスコア * groupの weight)。『bot らしさ』と『営業らしさ』は独立した疑いなので、どちらか一方だけでもしきい値に到達できるようにするための既定値。weighted-mean にすると groups[].weight による加重平均になる。",
      "hardBlock に挙げた code が1つでも立つと、他のスコアに関係なく block になる。",
      "points に未登録の code は 0 点として扱われ、result.warnings に列挙される(タイポ検知用)。",
      "チューニングの目安: まず thresholds を動かし、次に layers[].weight、最後に個別の points を触る。"
    ],
    "thresholds": {
      "review": 0.4,
      "block": 0.62
    },
    "hardBlock": [
      "honeypot.filled",
      "honeypot.decoyChecked"
    ],
    "layers": {
      "honeypot": {
        "label": "Layer 1 ハニーポット",
        "group": "automation",
        "weight": 0.12,
        "evidenceOnly": true,
        "saturation": 4,
        "points": {
          "honeypot.filled": 4,
          "honeypot.decoyChecked": 4,
          "honeypot.fieldMissing": 2,
          "honeypot.tokenMissing": 2,
          "honeypot.tokenTampered": 3
        }
      },
      "behavior": {
        "label": "Layer 2 行動解析",
        "group": "automation",
        "weight": 0.28,
        "saturation": 6,
        "points": {
          "behavior.instantSubmit": 4,
          "behavior.fastSubmit": 2.5,
          "behavior.noMouseActivity": 2,
          "behavior.noFocusEvents": 2,
          "behavior.impossibleTypingSpeed": 3,
          "behavior.noKeystrokes": 2.5,
          "behavior.pastedBody": 1.5,
          "behavior.staleForm": 1
        },
        "tuning": {
          "instantSubmitMs": 1500,
          "fastSubmitMs": 5e3,
          "staleFormMs": 72e5,
          "maxPlausibleCharsPerMinute": 1200,
          "minMouseSamples": 3,
          "pastedCharsThreshold": 120
        }
      },
      "environment": {
        "label": "Layer 2.5 自動化ブラウザの痕跡",
        "group": "automation",
        "weight": 0.22,
        "saturation": 6,
        "points": {
          "env.webdriver": 4,
          "env.headlessUserAgent": 4,
          "env.automationUserAgent": 3,
          "env.botUserAgent": 3,
          "env.noPlugins": 1.5,
          "env.chromeObjectMissing": 2,
          "env.noLanguages": 2,
          "env.viewportEqualsScreen": 1.5,
          "env.zeroOuterWindow": 1.5,
          "env.touchInconsistency": 1.5,
          "env.suspiciousHardwareConcurrency": 1,
          "env.permissionsInconsistency": 1.5
        },
        "tuning": {
          "headlessMarkers": [
            "headlesschrome",
            "headless"
          ],
          "automationMarkers": [
            "puppeteer",
            "playwright",
            "selenium",
            "phantomjs",
            "webdriver"
          ],
          "botUserAgentMarkers": [
            "bot",
            "crawler",
            "spider",
            "python-requests",
            "curl/",
            "wget/",
            "axios/",
            "okhttp",
            "scrapy",
            "http-client"
          ]
        }
      },
      "mimicry": {
        "label": "Layer 2.6 『不自然な自然さ』検知",
        "group": "automation",
        "weight": 0.26,
        "saturation": 5,
        "points": {
          "mimicry.uniformMouseSpeed": 2,
          "mimicry.straightMousePath": 2,
          "mimicry.quantizedMouseSteps": 2,
          "mimicry.uniformKeyIntervals": 2.5,
          "mimicry.quantizedKeyIntervals": 2,
          "mimicry.uniformFieldTransitions": 1.5,
          "mimicry.noJitter": 1.5
        },
        "tuning": {
          "minMouseSamples": 12,
          "minKeyIntervals": 8,
          "minFieldTransitions": 3,
          "mouseSpeedCvFloor": 0.18,
          "keyIntervalCvFloor": 0.22,
          "fieldTransitionCvFloor": 0.12,
          "straightnessCeiling": 0.985,
          "quantizedRatioCeiling": 0.6,
          "jitterFloorPx": 0.75
        }
      },
      "checkbox": {
        "label": "Layer 3 チェックボックス認証",
        "group": "automation",
        "weight": 0.12,
        "saturation": 4,
        "points": {
          "checkbox.unchecked": 3,
          "checkbox.programmaticCheck": 4,
          "checkbox.instantCheck": 2,
          "checkbox.noPointerTrail": 1.5,
          "checkbox.excessiveToggles": 1
        },
        "tuning": {
          "instantCheckMs": 250,
          "minPointerTrail": 1,
          "maxToggles": 6
        }
      },
      "content": {
        "label": "Layer 4 営業文面判定",
        "group": "sales",
        "weight": 0.75,
        "saturation": 6,
        "points": {
          "content.ngWords": 4,
          "content.urlSpam": 2,
          "content.companyIntroOpening": 2,
          "content.signatureBlock": 1.5,
          "content.noJapaneseOnJapaneseForm": 1
        },
        "tuning": {
          "minChars": 24,
          "ngScoreSaturation": 12,
          "freeUrlAllowance": 1,
          "urlSaturation": 4,
          "companyIntroHeadChars": 120
        }
      },
      "aiText": {
        "label": "Layer 6 AI生成文っぽさ判定",
        "group": "sales",
        "weight": 0.25,
        "saturation": 5,
        "points": {
          "ai.uniformSentenceLength": 2,
          "ai.politeTemplateDensity": 2,
          "ai.lowBurstiness": 1.5,
          "ai.structuredListing": 1,
          "ai.noTypos": 1
        },
        "tuning": {
          "minChars": 80,
          "minSentences": 4,
          "sentenceLengthCvFloor": 0.32,
          "politePhraseDensityCeiling": 0.012,
          "burstinessFloor": 0.35,
          "humanNoiseMarkers": [
            "！！",
            "。。",
            "、、",
            "www",
            "笑",
            "すみません",
            "ごめん",
            "ちょっと",
            "とりあえず",
            "よろしくです",
            "！？",
            "?!"
          ],
          "politePhrases": [
            "いただければ",
            "いただけますと",
            "いただけますでしょうか",
            "させていただき",
            "させていただければ",
            "ご検討いただ",
            "幸いです",
            "幸甚",
            "存じます",
            "お忙しいところ",
            "お忙しい中",
            "何卒",
            "よろしくお願い申し上げます",
            "ご確認のほど",
            "恐れ入りますが",
            "誠に",
            "つきましては",
            "なお、",
            "また、",
            "さらに、"
          ]
        }
      }
    },
    "combine": "noisy-or",
    "groups": {
      "automation": {
        "label": "自動化・bot の疑い",
        "weight": 1
      },
      "sales": {
        "label": "営業・勧誘目的の疑い",
        "weight": 1
      }
    }
  };

  // ../core/src/signals.ts
  var SIGNAL_LABELS = {
    // Layer 1
    "honeypot.filled": "人間には見えない隠しフィールドに入力があった",
    "honeypot.decoyChecked": "人間なら触らないおとりのチェックボックスがオンになっていた",
    "honeypot.fieldMissing": "注入した隠しフィールドが削除されていた",
    "honeypot.tokenMissing": "フォームに埋め込んだトークンが欠落していた",
    "honeypot.tokenTampered": "フォームに埋め込んだトークンが改ざんされていた",
    // Layer 2
    "behavior.instantSubmit": "表示から送信までが短すぎる",
    "behavior.fastSubmit": "入力にかけた時間が不自然に短い",
    "behavior.noMouseActivity": "マウス／タッチの操作がまったく観測されなかった",
    "behavior.noFocusEvents": "入力欄へのフォーカス操作が観測されなかった",
    "behavior.impossibleTypingSpeed": "人間には出せない速度で文字が入力された",
    "behavior.noKeystrokes": "キー入力なしで本文が埋まっていた",
    "behavior.pastedBody": "本文がまとめて貼り付けられた",
    "behavior.staleForm": "フォームを開いたまま長時間放置されていた",
    // Layer 2.5
    "env.webdriver": "ブラウザ自動化フラグ (navigator.webdriver) が立っている",
    "env.headlessUserAgent": "ヘッドレスブラウザの User-Agent",
    "env.automationUserAgent": "自動化ツールの User-Agent",
    "env.botUserAgent": "クローラー／HTTP クライアントの User-Agent",
    "env.noPlugins": "プラグインが 1 つも存在しない",
    "env.chromeObjectMissing": "Chromium 系なのに window.chrome が存在しない",
    "env.noLanguages": "言語設定が空",
    "env.viewportEqualsScreen": "ビューポートと画面解像度が完全に一致している",
    "env.zeroOuterWindow": "ウィンドウの外形サイズが 0",
    "env.touchInconsistency": "タッチ対応の申告と実際の操作が矛盾している",
    "env.suspiciousHardwareConcurrency": "CPU コア数の申告が不自然",
    "env.permissionsInconsistency": "通知許可の状態に矛盾がある",
    // Layer 2.6
    "mimicry.uniformMouseSpeed": "マウス速度のばらつきが小さすぎる",
    "mimicry.straightMousePath": "マウス軌跡が直線的すぎる",
    "mimicry.quantizedMouseSteps": "マウスの移動量が等間隔に量子化されている",
    "mimicry.uniformKeyIntervals": "キー入力間隔が一定すぎる",
    "mimicry.quantizedKeyIntervals": "キー入力間隔が特定の値に張り付いている",
    "mimicry.uniformFieldTransitions": "入力欄の移動間隔が一定すぎる",
    "mimicry.noJitter": "ポインタの微細な揺れがない",
    // Layer 3
    "checkbox.unchecked": "確認チェックボックスがオンになっていない",
    "checkbox.programmaticCheck": "チェックがスクリプトから操作された",
    "checkbox.instantCheck": "表示直後にチェックされた",
    "checkbox.noPointerTrail": "チェック前のポインタ操作が観測されなかった",
    "checkbox.excessiveToggles": "チェックの切り替え回数が異常に多い",
    // Layer 4
    "content.ngWords": "営業文面に典型的な表現が含まれている",
    "content.urlSpam": "本文に含まれる URL が多い",
    "content.companyIntroOpening": "冒頭が法人格つきの自己紹介で始まっている",
    "content.signatureBlock": "会社情報を並べた署名ブロックがある",
    "content.noJapaneseOnJapaneseForm": "日本語フォームに日本語がまったく含まれていない",
    // Layer 6
    "ai.uniformSentenceLength": "文の長さが均質すぎる",
    "ai.politeTemplateDensity": "定型的な丁寧表現の密度が高い",
    "ai.lowBurstiness": "文章のリズムに揺らぎがない",
    "ai.structuredListing": "箇条書き中心の整った構成になっている",
    "ai.noTypos": "口語的な崩れや打ち間違いがまったくない"
  };
  var SIGNAL_CODES = Object.keys(SIGNAL_LABELS);
  var signalLabel = (code) => {
    var _a;
    return (_a = SIGNAL_LABELS[code]) != null ? _a : code;
  };

  // ../core/src/scoring.ts
  var DEFAULT_LAYER_LABELS = {
    honeypot: "Layer 1 ハニーポット",
    behavior: "Layer 2 行動解析",
    environment: "Layer 2.5 自動化ブラウザの痕跡",
    mimicry: "Layer 2.6 不自然な自然さ",
    checkbox: "Layer 3 チェックボックス認証",
    content: "Layer 4 営業文面判定",
    aiText: "Layer 6 AI生成文っぽさ"
  };
  var DEFAULT_GROUP_LABELS = {
    automation: "自動化・bot の疑い",
    sales: "営業・勧誘目的の疑い"
  };
  var GROUP_ORDER = ["automation", "sales"];
  var decideVerdict = (score, thresholds, hardBlocked = false) => {
    if (hardBlocked) return "block";
    if (score >= thresholds.block) return "block";
    if (score >= thresholds.review) return "review";
    return "pass";
  };
  var scoreLayers = (results, weights) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const warnings = [];
    const hardBlockCodes = new Set((_a = weights.hardBlock) != null ? _a : []);
    const layers = [];
    const accumulator = /* @__PURE__ */ new Map();
    let hardBlocked = false;
    for (const result of results) {
      const config = weights.layers[result.layer];
      if (!config) {
        warnings.push(`weights.json に layers.${result.layer} の定義がありません`);
      }
      const points = (_b = config == null ? void 0 : config.points) != null ? _b : {};
      const saturation = (_c = config == null ? void 0 : config.saturation) != null ? _c : 1;
      const weight = (_d = config == null ? void 0 : config.weight) != null ? _d : 0;
      const group = (_e = config == null ? void 0 : config.group) != null ? _e : "automation";
      const signals = result.signals.map((signal) => {
        var _a2;
        const intensity = clamp01((_a2 = signal.intensity) != null ? _a2 : 1);
        const unitPoints = points[signal.code];
        if (unitPoints === void 0) {
          warnings.push(
            `weights.json に layers.${result.layer}.points["${signal.code}"] がありません`
          );
        }
        if (hardBlockCodes.has(signal.code)) hardBlocked = true;
        return {
          code: signal.code,
          intensity: round(intensity),
          points: round((unitPoints != null ? unitPoints : 0) * intensity),
          label: signalLabel(signal.code),
          ...signal.detail ? { detail: signal.detail } : {}
        };
      });
      const layerPoints = signals.reduce((sum, signal) => sum + signal.points, 0);
      const layerScore = clamp01(layerPoints / saturation);
      const counted = result.applicable && weight > 0 && ((config == null ? void 0 : config.evidenceOnly) !== true || layerPoints > 0);
      if (counted) {
        const bucket = (_f = accumulator.get(group)) != null ? _f : { weighted: 0, weight: 0 };
        bucket.weighted += layerScore * weight;
        bucket.weight += weight;
        accumulator.set(group, bucket);
      }
      layers.push({
        layer: result.layer,
        label: (_h = (_g = config == null ? void 0 : config.label) != null ? _g : DEFAULT_LAYER_LABELS[result.layer]) != null ? _h : result.layer,
        group,
        weight,
        applicable: result.applicable,
        counted,
        score: round(layerScore),
        points: round(layerPoints),
        saturation,
        signals,
        metrics: result.metrics,
        ...result.skipped ? { skipped: result.skipped } : {}
      });
    }
    const groupIds = [.../* @__PURE__ */ new Set([...GROUP_ORDER, ...layers.map((layer) => layer.group)])];
    const groups = groupIds.map((group) => {
      var _a2, _b2, _c2, _d2;
      const bucket = accumulator.get(group);
      const config = (_a2 = weights.groups) == null ? void 0 : _a2[group];
      return {
        group,
        label: (_c2 = (_b2 = config == null ? void 0 : config.label) != null ? _b2 : DEFAULT_GROUP_LABELS[group]) != null ? _c2 : group,
        weight: (_d2 = config == null ? void 0 : config.weight) != null ? _d2 : 1,
        score: bucket && bucket.weight > 0 ? round(bucket.weighted / bucket.weight) : 0,
        applicable: Boolean(bucket && bucket.weight > 0)
      };
    });
    const active = groups.filter((group) => group.applicable);
    let score = 0;
    if (active.length > 0) {
      if (((_i = weights.combine) != null ? _i : "noisy-or") === "weighted-mean") {
        const weightTotal = active.reduce((sum, group) => sum + group.weight, 0);
        score = weightTotal > 0 ? active.reduce((sum, group) => sum + group.score * group.weight, 0) / weightTotal : 0;
      } else {
        score = 1 - active.reduce((product, group) => product * (1 - clamp01(group.score * group.weight)), 1);
      }
    }
    score = round(clamp01(score));
    const verdict = decideVerdict(score, weights.thresholds, hardBlocked);
    const scored = layers.filter((layer) => layer.applicable).flatMap((layer) => layer.signals).filter((signal) => signal.points > 0 || hardBlockCodes.has(signal.code));
    const reasons = [
      ...scored.filter((signal) => hardBlockCodes.has(signal.code)),
      ...scored.filter((signal) => !hardBlockCodes.has(signal.code)).sort((a, b) => b.points - a.points)
    ].slice(0, 6).map((signal) => signal.detail ? `${signal.label}（${signal.detail}）` : signal.label);
    return {
      score,
      groups,
      verdict,
      hardBlocked,
      thresholds: weights.thresholds,
      layers,
      reasons,
      warnings: [...new Set(warnings)]
    };
  };

  // ../core/src/index.ts
  var analyze = (input, options = {}) => {
    var _a, _b;
    const weights = (_a = options.weights) != null ? _a : defaultWeights;
    const ngWords = (_b = options.ngWords) != null ? _b : defaultNgWords;
    const results = [
      evaluateHoneypot(input.honeypot),
      evaluateBehavior(input.behavior, weights.layers.behavior),
      evaluateEnvironment(input.environment, weights.layers.environment),
      evaluateMimicry(input.behavior, weights.layers.mimicry),
      evaluateCheckbox(input.checkbox, weights.layers.checkbox),
      evaluateContent(input.content, weights.layers.content, ngWords),
      evaluateAiText(input.content, weights.layers.aiText)
    ];
    return scoreLayers(results, weights);
  };
  var isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
  var mergeWeights = (base, override) => {
    const merge = (target, patch) => {
      if (!isPlainObject(patch)) return patch === void 0 ? target : patch;
      const result = isPlainObject(target) ? { ...target } : {};
      for (const [key, value] of Object.entries(patch)) {
        result[key] = merge(result[key], value);
      }
      return result;
    };
    return merge(base, override);
  };
  var mergeNgWords = (base, extra) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!extra) return base;
    const byId = new Map(
      base.categories.map((category) => [category.id, { ...category }])
    );
    for (const category of (_a = extra.categories) != null ? _a : []) {
      const existing = byId.get(category.id);
      if (!existing) {
        byId.set(category.id, category);
        continue;
      }
      byId.set(category.id, {
        ...existing,
        ...category,
        terms: [.../* @__PURE__ */ new Set([...existing.terms, ...(_b = category.terms) != null ? _b : []])],
        patterns: [.../* @__PURE__ */ new Set([...(_c = existing.patterns) != null ? _c : [], ...(_d = category.patterns) != null ? _d : []])]
      });
    }
    return {
      ...base,
      ...extra,
      categories: [...byId.values()],
      allowlist: {
        ...base.allowlist,
        ...extra.allowlist,
        terms: [.../* @__PURE__ */ new Set([...(_f = (_e = base.allowlist) == null ? void 0 : _e.terms) != null ? _f : [], ...(_h = (_g = extra.allowlist) == null ? void 0 : _g.terms) != null ? _h : []])]
      }
    };
  };

  // src/inject.ts
  var HIDDEN_STYLE = [
    "position:absolute !important",
    "left:-9999px !important",
    "top:auto !important",
    "width:1px !important",
    "height:1px !important",
    "overflow:hidden !important",
    "opacity:0 !important",
    "pointer-events:none !important"
  ].join(";");
  var hash = (input) => {
    let value = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      value ^= input.charCodeAt(i);
      value = Math.imul(value, 16777619) >>> 0;
    }
    return value.toString(36);
  };
  var injectHoneypot = (form, options = {}) => {
    var _a;
    const doc = form.ownerDocument;
    const prefix = (_a = options.prefix) != null ? _a : "mb";
    const renderedAt = Date.now();
    const salt = `${Math.random().toString(36).slice(2)}${renderedAt.toString(36)}`;
    const container = doc.createElement("div");
    container.setAttribute("aria-hidden", "true");
    container.setAttribute("data-miyabarrier", "honeypot");
    container.setAttribute("style", HIDDEN_STYLE);
    const textFieldNames = [`${prefix}_website`, `${prefix}_company_url`];
    const decoyName = `${prefix}_sales_optin`;
    const tokenName = `${prefix}_t`;
    for (const name of textFieldNames) {
      const input = doc.createElement("input");
      input.type = "text";
      input.name = name;
      input.tabIndex = -1;
      input.autocomplete = "off";
      input.setAttribute("aria-hidden", "true");
      const label = doc.createElement("label");
      label.textContent = name.includes("url") ? "Company URL" : "Website";
      label.setAttribute("aria-hidden", "true");
      container.append(label, input);
    }
    let decoy;
    if (options.decoy !== false) {
      decoy = doc.createElement("input");
      decoy.type = "checkbox";
      decoy.name = decoyName;
      decoy.tabIndex = -1;
      decoy.setAttribute("aria-hidden", "true");
      const decoyLabel = doc.createElement("label");
      decoyLabel.textContent = "営業目的の連絡を希望します";
      decoyLabel.setAttribute("aria-hidden", "true");
      container.append(decoy, decoyLabel);
    }
    const token = doc.createElement("input");
    token.type = "hidden";
    token.name = tokenName;
    token.setAttribute("aria-hidden", "true");
    token.value = `${renderedAt}.${hash(`${renderedAt}${salt}`)}`;
    container.append(token);
    form.append(container);
    const names = [...textFieldNames, ...decoy ? [decoyName] : []];
    return {
      names,
      state() {
        var _a2;
        const fields = textFieldNames.map((name) => {
          var _a3;
          const element = container.querySelector(`input[name="${name}"]`);
          return { name, value: (_a3 = element == null ? void 0 : element.value) != null ? _a3 : "" };
        });
        const presentCount = textFieldNames.filter(
          (name) => container.querySelector(`input[name="${name}"]`)
        ).length;
        const tokenElement = container.querySelector(`input[name="${tokenName}"]`);
        const rawToken = (_a2 = tokenElement == null ? void 0 : tokenElement.value) != null ? _a2 : "";
        const [stamp, signature] = rawToken.split(".");
        const tokenValid = Boolean(stamp) && signature === hash(`${stamp}${salt}`) && Number(stamp) === renderedAt;
        return {
          fields,
          decoys: decoy ? [{ name: decoyName, checked: decoy.checked }] : [],
          expectedFieldCount: presentCount === 0 ? textFieldNames.length : presentCount,
          token: { present: rawToken.length > 0, valid: tokenValid }
        };
      },
      destroy() {
        container.remove();
      }
    };
  };
  var NAME_FIELD_PATTERN = /(name|氏名|お名前|担当|company|会社|法人|organization)/i;
  var SKIP_TYPES = /* @__PURE__ */ new Set([
    "password",
    "hidden",
    "submit",
    "button",
    "reset",
    "file",
    "image",
    "checkbox",
    "radio",
    "range",
    "color"
  ]);
  var NON_BODY_TYPES = /* @__PURE__ */ new Set(["email", "tel", "url", "number", "date", "time", "datetime-local"]);
  var collectFormValues = (form) => {
    var _a, _b;
    const bodyParts = [];
    let senderName = "";
    let email = "";
    let typedChars = 0;
    const elements = form.querySelectorAll("input, textarea");
    for (const element of elements) {
      if (element.closest("[data-miyabarrier]")) continue;
      if (element instanceof HTMLInputElement && SKIP_TYPES.has(element.type)) continue;
      const value = (_a = element.value) != null ? _a : "";
      if (value.length === 0) continue;
      typedChars += value.length;
      const type = element instanceof HTMLInputElement ? element.type : "textarea";
      const identity = `${element.name} ${element.id} ${(_b = element.getAttribute("placeholder")) != null ? _b : ""}`;
      if (!senderName && NAME_FIELD_PATTERN.test(identity)) senderName = value;
      if (!email && (type === "email" || /mail/i.test(identity))) email = value.trim();
      if (NON_BODY_TYPES.has(type)) continue;
      bodyParts.push(value);
    }
    return { text: bodyParts.join("\n"), senderName, email, typedChars };
  };
  var findForms = (doc, selector) => {
    if (selector) return [...doc.querySelectorAll(selector)];
    return [...doc.querySelectorAll("form")].filter((form) => {
      if (form.getAttribute("data-miyabarrier") === "off") return false;
      if (form.querySelector('input[type="password"]')) return false;
      const hasTextarea = form.querySelector("textarea") !== null;
      const hasLongText = form.querySelectorAll('input[type="text"], input[type="email"], input:not([type])').length >= 2;
      return hasTextarea || hasLongText;
    });
  };

  // src/telemetry.ts
  var POINTER_SAMPLE_INTERVAL_MS = 40;
  var MAX_POINTER_SAMPLES = 400;
  var MAX_KEY_SAMPLES = 600;
  var MAX_EVENT_SAMPLES = 100;
  var BULK_INSERT_CHARS = 20;
  var DEDUPE_WINDOW_MS = 50;
  var isTypingKey = (key) => key.length === 1 || key === "Backspace" || key === "Enter" || key === "Process" || key === "Unidentified";
  var push = (buffer, item, limit) => {
    buffer.push(item);
    if (buffer.length > limit) buffer.shift();
  };
  var isTrackedField = (element) => element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
  var fieldName = (element) => {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.name || element.id || element.type;
    }
    if (element instanceof HTMLSelectElement) return element.name || element.id || "select";
    return "unknown";
  };
  var FormTelemetry = class {
    constructor(form, doc = form.ownerDocument) {
      this.form = form;
      this.doc = doc;
      this.renderedAt = Date.now();
      this.pointer = [];
      this.keys = [];
      this.focus = [];
      this.pastes = [];
      this.touchEventCount = 0;
      this.lastPointerSampleAt = 0;
      this.lastKeyAt = 0;
      this.lastPasteAt = 0;
      this.fieldLengths = /* @__PURE__ */ new Map();
      this.detachers = [];
      this.attach();
      this.probePermissions();
    }
    on(target, type, handler) {
      const listener = handler;
      const options = { passive: true, capture: true };
      target.addEventListener(type, listener, options);
      this.detachers.push(() => target.removeEventListener(type, listener, options));
    }
    attach() {
      this.on(this.doc, "pointermove", (event) => {
        const now = Date.now();
        if (now - this.lastPointerSampleAt < POINTER_SAMPLE_INTERVAL_MS) return;
        this.lastPointerSampleAt = now;
        push(this.pointer, { x: event.clientX, y: event.clientY, t: now }, MAX_POINTER_SAMPLES);
      });
      this.on(this.doc, "pointerdown", (event) => {
        push(
          this.pointer,
          { x: event.clientX, y: event.clientY, t: Date.now() },
          MAX_POINTER_SAMPLES
        );
      });
      this.on(this.doc, "touchstart", () => {
        this.touchEventCount += 1;
      });
      this.on(this.form, "keydown", (event) => {
        if (!isTypingKey(event.key)) return;
        this.lastKeyAt = Date.now();
        push(
          this.keys,
          { t: this.lastKeyAt, field: fieldName(event.target) },
          MAX_KEY_SAMPLES
        );
      });
      this.on(this.form, "input", (event) => {
        var _a, _b, _c;
        const target = event.target;
        if (!isTrackedField(target) || target instanceof HTMLSelectElement) return;
        const field = fieldName(target);
        const length = (_b = (_a = target.value) == null ? void 0 : _a.length) != null ? _b : 0;
        const delta = length - ((_c = this.fieldLengths.get(field)) != null ? _c : 0);
        this.fieldLengths.set(field, length);
        const now = Date.now();
        if (delta >= BULK_INSERT_CHARS) {
          if (now - this.lastPasteAt > DEDUPE_WINDOW_MS) {
            push(this.pastes, { field, t: now, length: delta }, MAX_EVENT_SAMPLES);
          }
        } else if (now - this.lastKeyAt > DEDUPE_WINDOW_MS) {
          push(this.keys, { t: now, field }, MAX_KEY_SAMPLES);
        }
      });
      this.on(this.form, "focusin", (event) => {
        const target = event.target;
        if (!isTrackedField(target)) return;
        push(this.focus, { field: fieldName(target), t: Date.now() }, MAX_EVENT_SAMPLES);
      });
      this.on(this.form, "paste", (event) => {
        var _a, _b;
        const text = (_b = (_a = event.clipboardData) == null ? void 0 : _a.getData("text")) != null ? _b : "";
        this.lastPasteAt = Date.now();
        push(
          this.pastes,
          { field: fieldName(event.target), t: this.lastPasteAt, length: text.length },
          MAX_EVENT_SAMPLES
        );
      });
    }
    /** headless Chrome では Notification.permission と permissions.query の結果が食い違う。 */
    probePermissions() {
      var _a, _b;
      try {
        const permissions = (_b = (_a = this.doc.defaultView) == null ? void 0 : _a.navigator) == null ? void 0 : _b.permissions;
        void (permissions == null ? void 0 : permissions.query({ name: "notifications" }).then((status) => {
          this.permissionsQueryState = status.state;
        }).catch(() => void 0));
      } catch {
      }
    }
    pointerSampleCount() {
      return this.pointer.length + this.touchEventCount;
    }
    /** 送信時点の行動スナップショット。typedChars は呼び出し側が数えたフォーム内文字数。 */
    behavior(typedChars, submittedAt = Date.now()) {
      return {
        renderedAt: this.renderedAt,
        submittedAt,
        pointer: [...this.pointer],
        keys: [...this.keys],
        focus: [...this.focus],
        pastes: [...this.pastes],
        typedChars,
        touchEventCount: this.touchEventCount
      };
    }
    environment() {
      var _a;
      return readEnvironment((_a = this.doc.defaultView) != null ? _a : void 0, this.permissionsQueryState);
    }
    destroy() {
      for (const detach of this.detachers) detach();
      this.detachers.length = 0;
    }
  };
  var CHROMIUM_UA = /(chrome|chromium|crios|edg\/|opr\/)/i;
  var readEnvironment = (view, permissionsQueryState) => {
    var _a, _b, _c, _d;
    const win = view != null ? view : typeof window === "undefined" ? void 0 : window;
    const nav = win == null ? void 0 : win.navigator;
    const userAgent = (_a = nav == null ? void 0 : nav.userAgent) != null ? _a : "";
    let pluginCount;
    try {
      pluginCount = (_b = nav == null ? void 0 : nav.plugins) == null ? void 0 : _b.length;
    } catch {
      pluginCount = void 0;
    }
    let notificationPermission;
    try {
      notificationPermission = win && "Notification" in win ? win.Notification.permission : void 0;
    } catch {
      notificationPermission = void 0;
    }
    const snapshot = {
      userAgent,
      webdriver: (nav == null ? void 0 : nav.webdriver) === true,
      isChromium: CHROMIUM_UA.test(userAgent),
      hasChromeObject: win ? "chrome" in win : void 0,
      languages: (nav == null ? void 0 : nav.languages) ? [...nav.languages] : (nav == null ? void 0 : nav.language) ? [nav.language] : [],
      screenWidth: (_c = win == null ? void 0 : win.screen) == null ? void 0 : _c.width,
      screenHeight: (_d = win == null ? void 0 : win.screen) == null ? void 0 : _d.height,
      innerWidth: win == null ? void 0 : win.innerWidth,
      innerHeight: win == null ? void 0 : win.innerHeight,
      outerWidth: win == null ? void 0 : win.outerWidth,
      outerHeight: win == null ? void 0 : win.outerHeight,
      devicePixelRatio: win == null ? void 0 : win.devicePixelRatio,
      hardwareConcurrency: nav == null ? void 0 : nav.hardwareConcurrency,
      maxTouchPoints: nav == null ? void 0 : nav.maxTouchPoints
    };
    if (pluginCount !== void 0) snapshot.pluginCount = pluginCount;
    if (notificationPermission !== void 0)
      snapshot.notificationPermission = notificationPermission;
    if (permissionsQueryState !== void 0) snapshot.permissionsQueryState = permissionsQueryState;
    return snapshot;
  };

  // src/log.ts
  var LOG_STORAGE_KEY = "miyabarrier:log";
  var readLog = () => {
    try {
      const raw = localStorage.getItem(LOG_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  var appendLog = (entry, limit) => {
    try {
      const entries = [...readLog(), entry].slice(-Math.max(1, limit));
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
    } catch {
    }
  };
  var clearLog = () => {
    try {
      localStorage.removeItem(LOG_STORAGE_KEY);
    } catch {
    }
  };

  // src/counter.ts
  var COUNTER_STORAGE_KEY = "miyabarrier:counter";
  var defaultCounterOptions = {
    enabled: false,
    minSalesScore: 0.6,
    subject: "ご連絡ありがとうございます（{{site}} より）",
    body: `{{name}} 様

お問い合わせフォームよりご連絡いただきありがとうございます。
いただいた内容は営業・勧誘のご案内と判断したため、恐れ入りますが対応いたしかねます。

せっかくのご縁ですので、こちらからもご案内をお送りいたします。
（ここに自社のサービス紹介を書いてください）

{{site}}
`,
    showOnScreen: true,
    queueLimit: 50
  };
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;
  var isPlausibleEmail = (value) => value.length <= 254 && EMAIL_PATTERN.test(value.trim());
  var shouldCounter = (options, input) => {
    if (!options.enabled) return { ok: false, reason: "無効" };
    if (input.verdict === "pass") return { ok: false, reason: "通過した送信" };
    if (!input.salesApplicable) return { ok: false, reason: "文面が判定対象外（短すぎるなど）" };
    if (input.salesScore < options.minSalesScore) {
      return { ok: false, reason: `営業らしさ ${input.salesScore.toFixed(2)} がしきい値未満` };
    }
    if (!isPlausibleEmail(input.email)) return { ok: false, reason: "有効なメールアドレスがない" };
    return { ok: true };
  };
  var renderTemplate = (template, context) => template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => {
    switch (key) {
      case "name":
        return context.name || "ご担当者";
      case "email":
        return context.email;
      case "score":
        return context.score.toFixed(2);
      case "salesScore":
        return context.salesScore.toFixed(2);
      case "reasons":
        return context.reasons.join("\n");
      case "site":
        return context.site;
      case "path":
        return context.path;
      case "date":
        return context.at.slice(0, 10);
      default:
        return "";
    }
  });
  var buildCounterMail = (options, context) => ({
    to: context.email.trim(),
    subject: renderTemplate(options.subject, context).replace(/\s+/g, " ").trim(),
    body: renderTemplate(options.body, context),
    context
  });
  var readCounterQueue = () => {
    try {
      const raw = localStorage.getItem(COUNTER_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  var queueCounterMail = (mail, limit) => {
    try {
      const queue = readCounterQueue();
      if (queue.some((entry) => entry.to.toLowerCase() === mail.to.toLowerCase())) return "duplicate";
      const next = [...queue, mail].slice(-Math.max(1, limit));
      localStorage.setItem(COUNTER_STORAGE_KEY, JSON.stringify(next));
      return "queued";
    } catch {
      return "failed";
    }
  };
  var clearCounterQueue = () => {
    try {
      localStorage.removeItem(COUNTER_STORAGE_KEY);
    } catch {
    }
  };
  var mailtoUrl = (mail) => `mailto:${encodeURIComponent(mail.to)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;

  // ../design/src/logo.ts
  var LOBES = 3;
  var DEFAULTS = {
    strokeWidth: 0.8,
    rings: 14,
    offset: 16,
    radius: 33,
    innerRadius: 12,
    flatten: 0.64,
    tilt: 116,
    drift: 11
  };
  var COMPACT = { rings: 5, strokeWidth: 2.2, innerRadius: 16, drift: 6 };
  var ring = (angle, o) => {
    const parts = [];
    const radians = angle * Math.PI / 180;
    for (let i = 0; i < o.rings; i += 1) {
      const t = o.rings === 1 ? 1 : i / (o.rings - 1);
      const rx = o.innerRadius + (o.radius - o.innerRadius) * t;
      const ry = rx * o.flatten;
      const distance2 = o.offset + (1 - t) * o.drift;
      const cx = Math.cos(radians) * distance2;
      const cy = Math.sin(radians) * distance2;
      const rotation = angle + o.tilt;
      const opacity = (0.45 + 0.55 * (1 - t * 0.55)).toFixed(3);
      parts.push(
        `<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${rx.toFixed(2)}" ry="${ry.toFixed(2)}" transform="rotate(${rotation.toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})" opacity="${opacity}"/>`
      );
    }
    return parts.join("");
  };
  var markSvg = (options = {}) => {
    var _a;
    const o = { ...DEFAULTS, ...options };
    const prefix = (_a = options.idPrefix) != null ? _a : "mb-logo";
    const stroke = options.monochrome ? "currentColor" : `url(#${prefix}-grad)`;
    const core = options.monochrome ? "currentColor" : `url(#${prefix}-core)`;
    const rings = Array.from(
      { length: LOBES },
      (_, index) => ring(index * (360 / LOBES) - 96, o)
    ).join("");
    const defs = options.monochrome ? "" : `<defs>
<linearGradient id="${prefix}-grad" x1="-38" y1="-42" x2="34" y2="44" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="var(--mb-brand-400, #5b8df0)"/>
<stop offset="0.5" stop-color="var(--mb-brand-600, #2a5bd7)"/>
<stop offset="1" stop-color="var(--mb-brand-700, #1e46ad)"/>
</linearGradient>
<radialGradient id="${prefix}-core" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" stop-color="var(--mb-brand-700, #1e46ad)"/>
<stop offset="1" stop-color="var(--mb-brand-600, #2a5bd7)" stop-opacity="0"/>
</radialGradient></defs>`;
    return `<svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">${defs}<g stroke="${stroke}" stroke-width="${o.strokeWidth}">${rings}</g><ellipse cx="-2" cy="1" rx="12" ry="10" fill="${core}" opacity="${options.monochrome ? 0.5 : 0.85}"/></svg>`;
  };

  // ../design/src/tokens.ts
  var LIGHT = `
  color-scheme: light dark;

  /* Miyabee ブルー */
  --mb-brand-050: #eef3fe;
  --mb-brand-100: #dbe6fc;
  --mb-brand-200: #bcd0f8;
  --mb-brand-400: #5b8df0;
  --mb-brand-500: #3b72e8;
  --mb-brand-600: #2a5bd7;
  --mb-brand-700: #1e46ad;
  --mb-brand-800: #17357f;

  /* 面と線（わずかに青を含ませて、無彩色のグレーにしない） */
  --mb-canvas: #f6f8fc;
  --mb-surface: #ffffff;
  --mb-surface-2: #fbfcfe;
  --mb-surface-inset: #f2f5fa;
  --mb-line: #e3e8f1;
  --mb-line-strong: #cfd7e6;

  /* 文字 */
  --mb-ink-900: #0c1220;
  --mb-ink-700: #26314a;
  --mb-ink-500: #5b6780;
  --mb-ink-400: #7c879c;
  --mb-ink-300: #a3adbf;

  /* 判定の意味色。彩度を抑え、面ではなく点・細い帯で使う */
  --mb-block: #c0413a;
  --mb-block-soft: #fdf2f1;
  --mb-block-line: #f0cfcc;
  --mb-review: #9a6a12;
  --mb-review-soft: #fdf6e9;
  --mb-review-line: #ecdcba;
  --mb-pass: #1f7a5c;
  --mb-pass-soft: #eff8f4;
  --mb-pass-line: #c6e5d8;

  /* 高さ（影は極薄に留め、境界線で構造を作る） */
  --mb-shadow-sm: 0 1px 2px rgba(12, 18, 32, 0.04);
  --mb-shadow-md: 0 4px 16px -4px rgba(12, 18, 32, 0.1), 0 1px 2px rgba(12, 18, 32, 0.04);
  --mb-shadow-lg: 0 18px 48px -12px rgba(12, 18, 32, 0.22), 0 2px 6px rgba(12, 18, 32, 0.06);
  --mb-ring: 0 0 0 3px rgba(42, 91, 215, 0.16);

  /* 角丸・間隔 */
  --mb-r-sm: 6px;
  --mb-r-md: 10px;
  --mb-r-lg: 14px;
  --mb-r-full: 999px;

  /* 書体 */
  --mb-font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Hiragino Sans',
    'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic UI', sans-serif;
  --mb-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Mono', Menlo, Consolas, monospace;`;
  var DARK = `
  --mb-brand-050: #101a2e;
  --mb-brand-100: #16233d;
  --mb-brand-200: #24365c;
  --mb-brand-400: #6f9bf5;
  --mb-brand-500: #5b8df0;
  --mb-brand-600: #7aa6f7;
  --mb-brand-700: #9dbdfa;
  --mb-brand-800: #c3d6fc;

  --mb-canvas: #080b12;
  --mb-surface: #0f141f;
  --mb-surface-2: #131926;
  --mb-surface-inset: #161d2c;
  --mb-line: #212a3b;
  --mb-line-strong: #2f3a4f;

  --mb-ink-900: #eef1f6;
  --mb-ink-700: #ccd3e0;
  --mb-ink-500: #93a0b6;
  --mb-ink-400: #7a8699;
  --mb-ink-300: #5d6878;

  --mb-block: #f18a82;
  --mb-block-soft: #24161a;
  --mb-block-line: #4a2a28;
  --mb-review: #e0b45c;
  --mb-review-soft: #231c10;
  --mb-review-line: #453a1e;
  --mb-pass: #62c69f;
  --mb-pass-soft: #10201b;
  --mb-pass-line: #23453a;

  --mb-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --mb-shadow-md: 0 4px 16px -4px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4);
  --mb-shadow-lg: 0 18px 48px -12px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.5);
  --mb-ring: 0 0 0 3px rgba(122, 166, 247, 0.22);
`;
  var tokensCss = `
:root {${LIGHT}}
@media (prefers-color-scheme: dark) {
  :root {${DARK}}
}
`;
  var scopedTokensCss = (selector) => `
${selector} {${LIGHT}}
@media (prefers-color-scheme: dark) {
  ${selector} {${DARK}}
}
`;

  // src/ui.ts
  var STYLE_ID = "miyabarrier-style";
  var REPO_URL = "https://github.com/dronehonpo-byte/miyabarrier";
  var COMPONENT_CSS = `
.mb-root {
  font-family: var(--mb-font);
  font-size: 14px;
  line-height: 1.7;
  color: var(--mb-ink-900);
  text-align: left;
  letter-spacing: normal;
  font-feature-settings: 'palt' 1;
  box-sizing: border-box;
}
.mb-root *, .mb-root *::before, .mb-root *::after { box-sizing: border-box; }
.mb-root svg { display: block; }

/* ---------- Layer 3: 確認チェックボックス ---------- */

.mb-guard {
  display: flex;
  align-items: center;
  gap: 0.7em;
  margin: 0.9em 0;
  padding: 0.8em 0.95em;
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-md);
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow-sm);
}
.mb-guard__check {
  display: flex;
  align-items: center;
  gap: 0.6em;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  cursor: pointer;
  font-size: 0.95em;
  color: var(--mb-ink-900);
}
.mb-guard__box {
  appearance: none;
  -webkit-appearance: none;
  flex: 0 0 auto;
  width: 1.15em;
  height: 1.15em;
  margin: 0;
  border: 1.5px solid var(--mb-line-strong);
  border-radius: 4px;
  background: var(--mb-surface);
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.mb-guard__box:hover { border-color: var(--mb-brand-400); }
.mb-guard__box:checked {
  border-color: var(--mb-brand-600);
  background-color: var(--mb-brand-600);
  /* チェックマークは data URI で描く（外部リソースを増やさない） */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.4l2.2 2.2 4.8-5' fill='none' stroke='%23fff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: 100% 100%;
}
.mb-guard__box:focus-visible { outline: none; box-shadow: var(--mb-ring); }
.mb-guard__brand {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.35em;
  font-size: 0.72em;
  letter-spacing: 0.02em;
  color: var(--mb-ink-400);
  white-space: nowrap;
}
.mb-guard__brand svg { width: 1.35em; height: 1.35em; }

/* 送信できたとき / 止めたときに、この行の見た目でも状態を伝える */
.mb-guard--verified { border-color: var(--mb-pass-line); background: var(--mb-pass-soft); }
.mb-guard--flagged { border-color: var(--mb-review-line); background: var(--mb-review-soft); }
.mb-guard--blocked { border-color: var(--mb-block-line); background: var(--mb-block-soft); }
.mb-guard__state {
  flex: 0 0 auto;
  display: none;
  align-items: center;
  gap: 0.3em;
  font-size: 0.78em;
  font-weight: 560;
  white-space: nowrap;
}
.mb-guard--verified .mb-guard__state,
.mb-guard--flagged .mb-guard__state,
.mb-guard--blocked .mb-guard__state { display: flex; }
.mb-guard--verified .mb-guard__state { color: var(--mb-pass); }
.mb-guard--flagged .mb-guard__state { color: var(--mb-review); }
.mb-guard--blocked .mb-guard__state { color: var(--mb-block); }
/* 状態が出たらブランド表記は引っ込める（横幅を食い合わないように） */
.mb-guard--verified .mb-guard__brand span,
.mb-guard--flagged .mb-guard__brand span,
.mb-guard--blocked .mb-guard__brand span { display: none; }
.mb-guard__state svg { width: 1.1em; height: 1.1em; }

/* ---------- バッジ ---------- */

/* 送信ボタンと同じ行に並ばないよう、通常のバッジは行を独立させる */
.mb-badge {
  display: flex;
  width: -moz-fit-content;
  width: fit-content;
  align-items: center;
  gap: 0.4em;
  margin: 0.6em 0;
  font-size: 0.75em;
  color: var(--mb-ink-400);
  text-decoration: none;
  letter-spacing: 0.01em;
}
.mb-badge:hover { color: var(--mb-brand-600); text-decoration: none; }
.mb-badge svg { width: 1.25em; height: 1.25em; }
.mb-badge--floating {
  display: inline-flex;
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 2147483000;
  margin: 0;
  padding: 0.45em 0.8em;
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-full);
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow-md);
}

/* ---------- 判定パネル ---------- */

.mb-panel {
  position: relative;
  margin: 1em 0;
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-lg);
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow-md);
  overflow: hidden;
}
/* 意味色は左端の帯だけ（面で塗らない） */
.mb-panel::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
}
.mb-panel--block::before { background: var(--mb-block); }
.mb-panel--review::before { background: var(--mb-review); }

.mb-panel__head {
  display: flex;
  align-items: flex-start;
  gap: 0.75em;
  padding: 1em 1.1em 0.85em 1.2em;
}
.mb-panel__icon {
  flex: 0 0 auto;
  width: 2em;
  height: 2em;
  display: grid;
  place-items: center;
  border-radius: var(--mb-r-sm);
  border: 1px solid var(--mb-line);
  background: var(--mb-surface-2);
}
.mb-panel__icon svg { width: 1.35em; height: 1.35em; }
.mb-panel__heading { flex: 1 1 auto; min-width: 0; }
.mb-panel__title {
  margin: 0;
  font-size: 0.95em;
  font-weight: 620;
  letter-spacing: -0.01em;
  line-height: 1.5;
}
.mb-panel--block .mb-panel__title { color: var(--mb-block); }
.mb-panel--review .mb-panel__title { color: var(--mb-review); }
.mb-panel__message {
  margin: 0.2em 0 0;
  font-size: 0.86em;
  color: var(--mb-ink-500);
  line-height: 1.65;
}
.mb-panel__score {
  flex: 0 0 auto;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.mb-panel__score b {
  display: block;
  font-size: 1.2em;
  font-weight: 620;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.mb-panel__score span {
  font-size: 0.68em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mb-ink-400);
}

/* 疑いの内訳（自動化 / 営業文面） */
.mb-panel__groups {
  display: grid;
  gap: 0.5em;
  padding: 0 1.1em 0.9em 1.2em;
}
.mb-meter {
  display: grid;
  grid-template-columns: 7.5em 1fr 2.4em;
  align-items: center;
  gap: 0.6em;
  font-size: 0.8em;
}
.mb-meter__name {
  color: var(--mb-ink-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mb-meter__track {
  height: 5px;
  border-radius: var(--mb-r-full);
  background: var(--mb-surface-inset);
  overflow: hidden;
}
.mb-meter__fill {
  height: 100%;
  border-radius: var(--mb-r-full);
  background: var(--mb-brand-500);
}
.mb-meter__fill--block { background: var(--mb-block); }
.mb-meter__fill--review { background: var(--mb-review); }
.mb-meter__fill--pass { background: var(--mb-pass); }
.mb-meter__value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--mb-ink-700);
}
.mb-meter--muted .mb-meter__value { color: var(--mb-ink-300); }

/* 理由 */
.mb-panel__reasons {
  margin: 0;
  padding: 0.85em 1.1em 0.9em 1.2em;
  list-style: none;
  border-top: 1px solid var(--mb-line);
  background: var(--mb-surface-2);
}
.mb-panel__reasons li {
  display: flex;
  gap: 0.55em;
  font-size: 0.84em;
  color: var(--mb-ink-700);
  line-height: 1.6;
}
.mb-panel__reasons li + li { margin-top: 0.35em; }
.mb-panel__reasons li::before {
  content: '';
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  margin-top: 0.62em;
  border-radius: 50%;
  background: var(--mb-ink-300);
}
.mb-panel--block .mb-panel__reasons li:first-child::before { background: var(--mb-block); }

/* お返しの営業（相手にその場で読ませる文面） */
.mb-counter {
  border-top: 1px solid var(--mb-line);
  padding: 0.9em 1.1em 1em 1.2em;
  background: var(--mb-brand-050);
}
.mb-counter__head {
  display: flex;
  align-items: center;
  gap: 0.45em;
  font-size: 0.8em;
  font-weight: 600;
  color: var(--mb-brand-800);
  margin-bottom: 0.45em;
}
.mb-counter__head svg { width: 1.1em; height: 1.1em; }
.mb-counter__subject {
  font-size: 0.84em;
  font-weight: 560;
  color: var(--mb-ink-900);
  margin: 0 0 0.3em;
}
.mb-counter__body {
  margin: 0;
  font-family: inherit;
  font-size: 0.82em;
  line-height: 1.75;
  color: var(--mb-ink-700);
  white-space: pre-wrap;
  max-height: 11em;
  overflow-y: auto;
}
.mb-counter__note {
  margin: 0.5em 0 0;
  font-size: 0.74em;
  color: var(--mb-ink-400);
}

/* 操作 */
.mb-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  padding: 0.85em 1.1em 1em 1.2em;
  border-top: 1px solid var(--mb-line);
}
.mb-btn {
  font: inherit;
  font-size: 0.84em;
  font-weight: 520;
  padding: 0.45em 0.9em;
  border-radius: var(--mb-r-sm);
  border: 1px solid var(--mb-line-strong);
  background: var(--mb-surface);
  color: var(--mb-ink-700);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.mb-btn:hover { border-color: var(--mb-brand-400); color: var(--mb-brand-700); }
.mb-btn:focus-visible { outline: none; box-shadow: var(--mb-ring); }
.mb-btn--primary {
  background: var(--mb-brand-600);
  border-color: var(--mb-brand-600);
  color: #fff;
}
.mb-btn--primary:hover {
  background: var(--mb-brand-700);
  border-color: var(--mb-brand-700);
  color: #fff;
}

/* 内訳（data-debug="true" のとき） */
.mb-panel__debug {
  border-top: 1px solid var(--mb-line);
  font-size: 0.82em;
}
.mb-panel__debug > summary {
  padding: 0.7em 1.1em 0.7em 1.2em;
  cursor: pointer;
  color: var(--mb-ink-500);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.mb-panel__debug > summary::-webkit-details-marker { display: none; }
.mb-panel__debug > summary::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 4px solid currentColor;
  border-top: 3.5px solid transparent;
  border-bottom: 3.5px solid transparent;
  transition: transform 0.15s;
}
.mb-panel__debug[open] > summary::before { transform: rotate(90deg); }
.mb-panel__debug > summary:hover { color: var(--mb-ink-900); }
.mb-debug {
  display: grid;
  gap: 0.55em;
  padding: 0 1.1em 1em 1.2em;
}
.mb-debug__row { display: grid; gap: 0.3em; }
.mb-debug__signals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25em;
  padding-left: 8.1em;
}
.mb-debug__chip {
  font-family: var(--mb-mono);
  font-size: 0.82em;
  padding: 0.05em 0.4em;
  border-radius: 4px;
  background: var(--mb-surface-inset);
  border: 1px solid var(--mb-line);
  color: var(--mb-ink-500);
}
.mb-debug__note {
  padding-top: 0.4em;
  font-size: 0.9em;
  color: var(--mb-ink-400);
  line-height: 1.6;
}

.mb-sr {
  position: absolute !important;
  width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .mb-root * { transition: none !important; }
}
`;
  var ensureStyles = (doc) => {
    if (doc.getElementById(STYLE_ID)) return;
    const style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = scopedTokensCss(".mb-root") + COMPONENT_CSS;
    doc.head.append(style);
  };
  var el = (doc, tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = text;
    return node;
  };
  var mark = (doc, idPrefix) => {
    const host = el(doc, "span");
    host.innerHTML = markSvg({ ...COMPACT, idPrefix });
    return host;
  };
  var createCheckbox = (doc, label, name) => {
    const wrapper = el(doc, "div", "mb-root mb-guard");
    const field = el(doc, "label", "mb-guard__check");
    const input = el(doc, "input", "mb-guard__box");
    input.type = "checkbox";
    input.name = name;
    input.id = `${name}-${Math.random().toString(36).slice(2, 8)}`;
    field.htmlFor = input.id;
    field.append(input, el(doc, "span", "mb-guard__label", label));
    const state = el(doc, "span", "mb-guard__state");
    state.setAttribute("aria-live", "polite");
    const brand = el(doc, "span", "mb-guard__brand");
    brand.title = "Miyabarrier が送信内容を端末内で検証します（外部送信なし）";
    brand.append(mark(doc, "guard"), el(doc, "span", void 0, "Miyabarrier"));
    wrapper.append(field, state, brand);
    return { wrapper, input };
  };
  var GUARD_STATE_TEXT = {
    verified: "確認しました",
    review: "確認が必要です",
    blocked: "送信を止めました"
  };
  var setGuardState = (wrapper, next) => {
    if (!wrapper) return;
    wrapper.classList.remove("mb-guard--verified", "mb-guard--flagged", "mb-guard--blocked");
    const state = wrapper.querySelector(".mb-guard__state");
    if (!state) return;
    if (next === "idle") {
      state.textContent = "";
      return;
    }
    wrapper.classList.add(
      next === "verified" ? "mb-guard--verified" : next === "review" ? "mb-guard--flagged" : "mb-guard--blocked"
    );
    state.textContent = GUARD_STATE_TEXT[next];
  };
  var createBadge = (doc, floating) => {
    const badge = el(doc, "a", `mb-root mb-badge${floating ? " mb-badge--floating" : ""}`);
    badge.href = REPO_URL;
    badge.target = "_blank";
    badge.rel = "noopener noreferrer";
    badge.append(mark(doc, floating ? "badge-float" : "badge"));
    badge.append(el(doc, "span", void 0, "Miyabarrier で保護されています"));
    return badge;
  };
  var GROUP_LABEL = {
    automation: "自動化・bot",
    sales: "営業・勧誘の文面"
  };
  var LAYER_SHORT = {
    honeypot: "L1 ハニーポット",
    behavior: "L2 行動",
    environment: "L2.5 環境",
    mimicry: "L2.6 揺らぎ",
    checkbox: "L3 チェック",
    content: "L4 文面",
    aiText: "L6 AI文"
  };
  var meter = (doc, name, score, tone, title) => {
    const row = el(doc, "div", `mb-meter${score === null ? " mb-meter--muted" : ""}`);
    const label = el(doc, "span", "mb-meter__name", name);
    if (title) label.title = title;
    const track = el(doc, "div", "mb-meter__track");
    const fill = el(
      doc,
      "div",
      `mb-meter__fill${tone === "brand" ? "" : ` mb-meter__fill--${tone}`}`
    );
    fill.style.width = `${Math.round((score != null ? score : 0) * 100)}%`;
    track.append(fill);
    row.append(
      label,
      track,
      el(doc, "span", "mb-meter__value", score === null ? "—" : score.toFixed(2))
    );
    return row;
  };
  var toneFor = (score, thresholds) => score >= thresholds.block ? "block" : score >= thresholds.review ? "review" : "pass";
  var createPanel = (doc, options) => {
    var _a, _b;
    const { result } = options;
    const level = result.verdict === "block" ? "block" : "review";
    const panel = el(doc, "div", `mb-root mb-panel mb-panel--${level}`);
    panel.setAttribute("role", "alert");
    panel.setAttribute("aria-live", "assertive");
    const head = el(doc, "div", "mb-panel__head");
    const icon = el(doc, "div", "mb-panel__icon");
    icon.append(mark(doc, "panel"));
    const heading = el(doc, "div", "mb-panel__heading");
    heading.append(
      el(
        doc,
        "p",
        "mb-panel__title",
        result.verdict === "block" ? "送信をブロックしました" : "送信内容の確認をお願いします"
      ),
      el(doc, "p", "mb-panel__message", options.message)
    );
    const score = el(doc, "div", "mb-panel__score");
    score.append(
      el(doc, "b", void 0, result.score.toFixed(2)),
      el(doc, "span", void 0, "score")
    );
    score.title = `ブロックのしきい値 ${result.thresholds.block.toFixed(2)} / 確認 ${result.thresholds.review.toFixed(2)}`;
    head.append(icon, heading, score);
    panel.append(head);
    const groups = el(doc, "div", "mb-panel__groups");
    for (const group of result.groups) {
      groups.append(
        meter(
          doc,
          (_a = GROUP_LABEL[group.group]) != null ? _a : group.label,
          group.applicable ? group.score : null,
          group.applicable ? toneFor(group.score, result.thresholds) : "pass",
          group.applicable ? void 0 : "判定に必要な情報が足りないため対象外"
        )
      );
    }
    panel.append(groups);
    if (result.reasons.length > 0) {
      const list = el(doc, "ul", "mb-panel__reasons");
      for (const reason of result.reasons.slice(0, 3)) {
        list.append(el(doc, "li", void 0, reason));
      }
      panel.append(list);
    }
    if (options.counter) {
      const counter = el(doc, "div", "mb-counter");
      const head2 = el(doc, "div", "mb-counter__head");
      head2.append(mark(doc, "counter"), el(doc, "span", void 0, "こちらからのご案内"));
      counter.append(
        head2,
        el(doc, "p", "mb-counter__subject", options.counter.subject),
        el(doc, "p", "mb-counter__body", options.counter.body),
        el(doc, "p", "mb-counter__note", `${options.counter.to} 宛の返信文を控えました。`)
      );
      panel.append(counter);
    }
    const actions = el(doc, "div", "mb-panel__actions");
    if (options.onOverride) {
      const button = el(
        doc,
        "button",
        "mb-btn mb-btn--primary",
        (_b = options.overrideLabel) != null ? _b : "それでも送信する"
      );
      button.type = "button";
      button.addEventListener("click", options.onOverride);
      actions.append(button);
    }
    if (options.onDismiss) {
      const button = el(doc, "button", "mb-btn", "閉じる");
      button.type = "button";
      button.addEventListener("click", options.onDismiss);
      actions.append(button);
    }
    if (actions.childElementCount > 0) panel.append(actions);
    if (options.debug) panel.append(createDebugSection(doc, result));
    return panel;
  };
  var describeLayer = (layer) => {
    if (layer.skipped) return `${layer.label} — 判定対象外: ${layer.skipped}`;
    if (!layer.counted) {
      return `${layer.label} — 加点がないため集計対象外（沈黙は証拠として扱わない）`;
    }
    return `${layer.label} — ${layer.points} / ${layer.saturation} 点 · グループ内の重み ${layer.weight}`;
  };
  var createDebugSection = (doc, result) => {
    var _a, _b;
    const details = el(doc, "details", "mb-panel__debug");
    const summary = el(doc, "summary");
    summary.append(doc.createTextNode("レイヤー別の内訳を見る"));
    details.append(summary);
    const body = el(doc, "div", "mb-debug");
    for (const layer of result.layers) {
      const row = el(doc, "div", "mb-debug__row");
      row.append(
        meter(
          doc,
          (_a = LAYER_SHORT[layer.layer]) != null ? _a : layer.label,
          layer.counted ? layer.score : null,
          layer.counted ? toneFor(layer.score, result.thresholds) : "pass",
          describeLayer(layer)
        )
      );
      if (layer.signals.length > 0) {
        const chips = el(doc, "div", "mb-debug__signals");
        for (const signal of layer.signals) {
          const chip = el(doc, "span", "mb-debug__chip", (_b = signal.code.split(".")[1]) != null ? _b : signal.code);
          chip.title = `${signal.label}（+${signal.points}）${signal.detail ? ` — ${signal.detail}` : ""}`;
          chips.append(chip);
        }
        row.append(chips);
      }
      body.append(row);
    }
    body.append(
      el(
        doc,
        "p",
        "mb-debug__note",
        `総合 ${result.score.toFixed(2)} ／ ブロックは ${result.thresholds.block.toFixed(2)} 以上・確認は ${result.thresholds.review.toFixed(2)} 以上${result.hardBlocked ? " ／ ハニーポット検知による即時ブロック" : ""}`
      )
    );
    if (result.warnings.length > 0) {
      body.append(el(doc, "p", "mb-debug__note", `設定の警告: ${result.warnings.join(" / ")}`));
    }
    details.append(body);
    return details;
  };

  // src/index.ts
  var VERSION = true ? "0.5.0" : "0.0.0";
  var defaultOptions = {
    mode: "block",
    checkbox: true,
    checkboxLabel: "営業・勧誘目的の送信ではありません",
    honeypot: true,
    badge: "inline",
    blockMessage: "営業・勧誘目的の送信、または自動送信の可能性が高いと判定したため送信をブロックしました。お心当たりのない場合は、内容を見直して再度お試しください。",
    reviewMessage: "営業・勧誘目的の可能性がある内容が含まれています。お問い合わせ内容であれば、そのまま送信してください。",
    formLanguage: "ja",
    debug: false,
    log: true,
    logLimit: 200,
    autoInit: true,
    counter: defaultCounterOptions
  };
  var scriptElement = typeof document === "undefined" ? null : document.currentScript;
  var parseBoolean = (value, fallback) => {
    if (value === void 0) return fallback;
    return value !== "false" && value !== "0" && value !== "off";
  };
  var parseNumber = (value) => {
    if (value === void 0) return void 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  };
  var readScriptConfig = (script) => {
    if (!script) return {};
    const data = script.dataset;
    const config = {};
    if (data.mode === "block" || data.mode === "warn" || data.mode === "report")
      config.mode = data.mode;
    if (data.selector) config.selector = data.selector;
    if (data.checkbox !== void 0) config.checkbox = parseBoolean(data.checkbox, true);
    if (data.checkboxLabel) config.checkboxLabel = data.checkboxLabel;
    if (data.honeypot !== void 0) config.honeypot = parseBoolean(data.honeypot, true);
    if (data.badge !== void 0) {
      config.badge = data.badge === "floating" ? "floating" : parseBoolean(data.badge, true) ? "inline" : false;
    }
    if (data.blockMessage) config.blockMessage = data.blockMessage;
    if (data.reviewMessage) config.reviewMessage = data.reviewMessage;
    if (data.formLanguage === "ja" || data.formLanguage === "en" || data.formLanguage === "auto") {
      config.formLanguage = data.formLanguage;
    }
    if (data.debug !== void 0) config.debug = parseBoolean(data.debug, false);
    if (data.log !== void 0) config.log = parseBoolean(data.log, true);
    if (data.autoInit !== void 0) config.autoInit = parseBoolean(data.autoInit, true);
    const logLimit = parseNumber(data.logLimit);
    if (logLimit !== void 0) config.logLimit = logLimit;
    const review = parseNumber(data.reviewThreshold);
    const block = parseNumber(data.blockThreshold);
    if (review !== void 0 || block !== void 0) {
      config.thresholds = {
        ...review !== void 0 ? { review } : {},
        ...block !== void 0 ? { block } : {}
      };
    }
    return config;
  };
  var globalConfig = () => {
    const candidate = globalThis.MIYABARRIER_CONFIG;
    return candidate && typeof candidate === "object" ? candidate : {};
  };
  var resolveOptions = (...overrides) => overrides.reduce(
    (accumulated, override) => ({ ...accumulated, ...override }),
    { ...defaultOptions }
  );
  var buildWeights = (options) => {
    let weights = defaultWeights;
    if (options.weights) weights = mergeWeights(weights, options.weights);
    if (options.thresholds) {
      weights = mergeWeights(weights, {
        thresholds: { ...weights.thresholds, ...options.thresholds }
      });
    }
    return weights;
  };
  var ProtectedForm = class {
    constructor(form, options = {}) {
      this.form = form;
      this.checkedAt = null;
      this.pointerSamplesBeforeCheck = 0;
      this.toggleCount = 0;
      this.allowNextSubmit = false;
      this.cleanups = [];
      this.options = resolveOptions(options);
      this.weights = buildWeights(this.options);
      this.ngWords = mergeNgWords(defaultNgWords, this.options.ngWords);
      this.telemetry = new FormTelemetry(form);
      const doc = form.ownerDocument;
      ensureStyles(doc);
      if (this.options.honeypot) this.honeypot = injectHoneypot(form);
      if (this.options.checkbox) this.mountCheckbox(doc);
      if (this.options.badge) this.mountBadge(doc);
      const onInput = () => this.clearVerdictUi();
      form.addEventListener("input", onInput, { passive: true });
      this.cleanups.push(() => form.removeEventListener("input", onInput));
      const onSubmit = (event) => this.handleSubmit(event);
      form.addEventListener("submit", onSubmit, true);
      this.cleanups.push(() => form.removeEventListener("submit", onSubmit, true));
      form.setAttribute("data-miyabarrier-protected", "true");
    }
    /** 送信ボタンの直前に差し込む。見つからなければフォーム末尾に追加する。 */
    insertBeforeSubmit(node) {
      const submitButton = this.form.querySelector(
        'button[type="submit"], input[type="submit"], button:not([type])'
      );
      if (submitButton == null ? void 0 : submitButton.parentElement) {
        submitButton.parentElement.insertBefore(node, submitButton);
      } else {
        this.form.append(node);
      }
    }
    mountCheckbox(doc) {
      const { wrapper, input } = createCheckbox(doc, this.options.checkboxLabel, "mb_confirm");
      this.checkboxInput = input;
      this.checkboxRow = wrapper;
      input.addEventListener("click", (event) => {
        this.toggleCount += 1;
        this.trustedClick = event.isTrusted;
        if (input.checked) {
          this.checkedAt = Date.now();
          this.pointerSamplesBeforeCheck = this.telemetry.pointerSampleCount();
        } else {
          this.checkedAt = null;
        }
      });
      this.insertBeforeSubmit(wrapper);
      this.cleanups.push(() => wrapper.remove());
    }
    mountBadge(doc) {
      const badge = createBadge(doc, this.options.badge === "floating");
      if (this.options.badge === "floating") {
        if (!doc.querySelector(".mb-badge-floating")) doc.body.append(badge);
        else return;
      } else {
        this.form.append(badge);
      }
      this.cleanups.push(() => badge.remove());
    }
    /** 現在のフォーム状態で判定する（送信をせずに結果だけ欲しいときにも使える）。 */
    analyze() {
      var _a, _b, _c;
      const values = collectFormValues(this.form);
      return analyze(
        {
          honeypot: (_a = this.honeypot) == null ? void 0 : _a.state(),
          behavior: this.telemetry.behavior(values.typedChars),
          environment: this.telemetry.environment(),
          checkbox: {
            present: Boolean(this.checkboxInput),
            checked: (_c = (_b = this.checkboxInput) == null ? void 0 : _b.checked) != null ? _c : false,
            renderedAt: this.telemetry.renderedAt,
            checkedAt: this.checkedAt,
            trustedClick: this.trustedClick,
            pointerSamplesBeforeCheck: this.pointerSamplesBeforeCheck,
            toggleCount: this.toggleCount
          },
          content: {
            text: values.text,
            senderName: values.senderName,
            formLanguage: this.options.formLanguage
          }
        },
        { weights: this.weights, ngWords: this.ngWords }
      );
    }
    /**
     * 営業と判定したときに、お返しの営業文を組み立てて送信箱に積む。
     * ネットワークへは出さない（理由は counter.ts のコメント参照）。
     */
    buildCounter(result) {
      var _a, _b, _c, _d, _e;
      const options = this.options.counter;
      const sales = result.groups.find((group) => group.group === "sales");
      const values = collectFormValues(this.form);
      const decision = shouldCounter(options, {
        verdict: result.verdict,
        salesApplicable: (_a = sales == null ? void 0 : sales.applicable) != null ? _a : false,
        salesScore: (_b = sales == null ? void 0 : sales.score) != null ? _b : 0,
        email: values.email
      });
      if (!decision.ok) {
        if (this.options.debug && options.enabled) {
          console.warn("[miyabarrier] お返しの営業は作りませんでした:", decision.reason);
        }
        return void 0;
      }
      const mail = buildCounterMail(options, {
        email: values.email,
        name: values.senderName,
        score: result.score,
        salesScore: (_c = sales == null ? void 0 : sales.score) != null ? _c : 0,
        reasons: result.reasons.slice(0, 3),
        site: typeof location === "undefined" ? "" : location.hostname,
        path: typeof location === "undefined" ? "" : location.pathname,
        at: (/* @__PURE__ */ new Date()).toISOString()
      });
      const queued = queueCounterMail(mail, options.queueLimit);
      if (this.options.debug) {
        console.warn("[miyabarrier] お返しの営業を送信箱に積みました:", queued, mail.to);
      }
      (_e = (_d = this.options).onCounter) == null ? void 0 : _e.call(_d, mail, { form: this.form });
      return mail;
    }
    /**
     * 前回の判定結果の表示をすべて消す。
     *
     * 判定パネル（理由・スコア内訳・お返しの営業の文面）とチェック行の状態は
     * **必ず一緒に**消すこと。片方だけ消すと、内容を書き換えたのに古いスコアと
     * 古い理由が残り続けることになる。
     */
    clearVerdictUi() {
      var _a;
      (_a = this.panel) == null ? void 0 : _a.remove();
      this.panel = void 0;
      setGuardState(this.checkboxRow, "idle");
    }
    showPanel(result, allowOverride, counterMail) {
      var _a, _b;
      (_a = this.panel) == null ? void 0 : _a.remove();
      const panel = createPanel(this.form.ownerDocument, {
        message: result.verdict === "block" ? this.options.blockMessage : this.options.reviewMessage,
        result,
        debug: this.options.debug,
        ...counterMail && this.options.counter.showOnScreen ? { counter: counterMail } : {},
        ...allowOverride ? {
          onOverride: () => {
            var _a2;
            (_a2 = this.panel) == null ? void 0 : _a2.remove();
            this.panel = void 0;
            this.submitAnyway();
          }
        } : {},
        onDismiss: () => {
          var _a2;
          (_a2 = this.panel) == null ? void 0 : _a2.remove();
          this.panel = void 0;
        }
      });
      this.panel = panel;
      this.insertBeforeSubmit(panel);
      (_b = panel.scrollIntoView) == null ? void 0 : _b.call(panel, { behavior: "smooth", block: "nearest" });
    }
    /** 利用者が「それでも送信する」を選んだときに、判定を 1 回だけ迂回して送信する。 */
    submitAnyway() {
      this.allowNextSubmit = true;
      if (typeof this.form.requestSubmit === "function") this.form.requestSubmit();
      else this.form.submit();
    }
    handleSubmit(event) {
      var _a, _b, _c;
      if (this.allowNextSubmit) {
        this.allowNextSubmit = false;
        return;
      }
      const result = this.analyze();
      this.lastResult = result;
      if (this.options.log) {
        appendLog(
          {
            t: (/* @__PURE__ */ new Date()).toISOString(),
            verdict: result.verdict,
            score: result.score,
            hard: result.hardBlocked,
            reasons: result.reasons,
            form: this.form.id || this.form.name || "form",
            path: typeof location === "undefined" ? "" : location.pathname
          },
          this.options.logLimit
        );
      }
      const hookResult = (_b = (_a = this.options).onVerdict) == null ? void 0 : _b.call(_a, result, { form: this.form });
      const overriddenByHook = hookResult === false;
      if (this.options.debug) {
        console.warn("[miyabarrier]", result.verdict, result.score, result.reasons, result);
      }
      const counterMail = this.buildCounter(result);
      setGuardState(
        this.checkboxRow,
        result.verdict === "pass" ? "verified" : result.verdict === "review" ? "review" : "blocked"
      );
      if (this.options.mode === "report" || overriddenByHook || result.verdict === "pass") {
        (_c = this.panel) == null ? void 0 : _c.remove();
        this.panel = void 0;
        return;
      }
      const allowOverride = this.options.mode === "warn" || result.verdict === "review";
      event.preventDefault();
      event.stopImmediatePropagation();
      this.showPanel(result, allowOverride, counterMail);
    }
    destroy() {
      var _a, _b;
      for (const cleanup of this.cleanups) cleanup();
      this.cleanups.length = 0;
      (_a = this.honeypot) == null ? void 0 : _a.destroy();
      this.telemetry.destroy();
      (_b = this.panel) == null ? void 0 : _b.remove();
      this.form.removeAttribute("data-miyabarrier-protected");
    }
  };
  var protectedForms = /* @__PURE__ */ new Map();
  var protect = (target, options = {}) => {
    const form = typeof target === "string" ? document.querySelector(target) : target;
    if (!(form instanceof HTMLFormElement)) return void 0;
    const existing = protectedForms.get(form);
    if (existing) return existing;
    const protectedForm = new ProtectedForm(form, options);
    protectedForms.set(form, protectedForm);
    return protectedForm;
  };
  var protectAll = (options = {}) => {
    const resolved = resolveOptions(globalConfig(), readScriptConfig(scriptElement), options);
    return findForms(document, resolved.selector).map((form) => protect(form, resolved)).filter((instance) => instance !== void 0);
  };
  var analyzeText = (text, options = {}) => {
    const resolved = resolveOptions(options);
    const weights = buildWeights(resolved);
    const ngWords = mergeNgWords(defaultNgWords, resolved.ngWords);
    const content = { text, formLanguage: resolved.formLanguage };
    return scoreLayers(
      [
        evaluateContent(content, weights.layers.content, ngWords),
        evaluateAiText(content, weights.layers.aiText)
      ],
      weights
    );
  };
  var getLog = () => readLog();
  var clearLog2 = () => clearLog();
  var destroyAll = () => {
    for (const instance of protectedForms.values()) instance.destroy();
    protectedForms.clear();
  };
  var api = {
    version: VERSION,
    protect,
    protectAll,
    analyzeText,
    getLog,
    clearLog: clearLog2,
    getCounterQueue: readCounterQueue,
    clearCounterQueue,
    counterMailtoUrl: mailtoUrl,
    destroyAll,
    defaultOptions,
    defaultWeights,
    markSvg,
    defaultNgWords,
    instances: protectedForms
  };
  if (typeof window !== "undefined") {
    window.Miyabarrier = api;
    const autoInit = () => {
      const resolved = resolveOptions(globalConfig(), readScriptConfig(scriptElement));
      if (resolved.autoInit === false) return;
      protectAll();
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoInit, { once: true });
    } else {
      autoInit();
    }
  }
})();
