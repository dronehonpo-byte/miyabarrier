/**
 * Layer 2.5: ブラウザ自動化の痕跡検知。
 *
 * headless ブラウザや自動化ドライバは、通常のブラウザなら必ず持っている性質を
 * いくつか取りこぼす。1 つ 1 つは誤検知しうる（キオスク端末、プライバシー拡張、
 * 変わったブラウザ）ので、単独では決め手にせず矛盾の重なりとして加点する。
 */
import type { EnvironmentSnapshot, LayerResult, LayerWeightConfig, Signal } from './types';
import { tuneStrings } from './util';

const DEFAULT_HEADLESS_MARKERS = ['headlesschrome', 'headless'];
const DEFAULT_AUTOMATION_MARKERS = [
  'puppeteer',
  'playwright',
  'selenium',
  'phantomjs',
  'electron/',
  'webdriver',
];
const DEFAULT_BOT_MARKERS = [
  'bot',
  'crawler',
  'spider',
  'python-requests',
  'curl/',
  'wget/',
  'axios/',
  'okhttp',
  'scrapy',
  'http-client',
];

const MOBILE_UA_PATTERN = /(android|iphone|ipad|ipod|mobile|windows phone)/;

/**
 * 短いマーカー（"bot" など）は前後を英字で挟まれていない場合だけ一致とみなす。
 * "Cubot"（実在の Android 端末名）のような語での誤検知を避けるため。
 */
const matchesMarker = (userAgent: string, marker: string): boolean => {
  if (marker.length > 4 || /[^a-z]/.test(marker)) return userAgent.includes(marker);
  let index = userAgent.indexOf(marker);
  while (index !== -1) {
    const before = userAgent[index - 1] ?? '';
    const after = userAgent[index + marker.length] ?? '';
    if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) return true;
    index = userAgent.indexOf(marker, index + 1);
  }
  return false;
};

export const evaluateEnvironment = (
  input: EnvironmentSnapshot | undefined,
  config?: LayerWeightConfig,
): LayerResult => {
  if (!input) {
    return {
      layer: 'environment',
      applicable: false,
      signals: [],
      metrics: {},
      skipped: '実行環境の計測値がない',
    };
  }

  const tuning = config?.tuning;
  const headlessMarkers = tuneStrings(tuning, 'headlessMarkers', DEFAULT_HEADLESS_MARKERS);
  const automationMarkers = tuneStrings(tuning, 'automationMarkers', DEFAULT_AUTOMATION_MARKERS);
  const botMarkers = tuneStrings(tuning, 'botUserAgentMarkers', DEFAULT_BOT_MARKERS);

  const signals: Signal[] = [];
  const userAgent = (input.userAgent ?? '').toLowerCase();
  const isMobileUa = MOBILE_UA_PATTERN.test(userAgent);
  const isTouchCapable = (input.maxTouchPoints ?? 0) > 0;

  if (input.webdriver === true) {
    signals.push({ code: 'env.webdriver' });
  }

  const headlessHit = headlessMarkers.find((marker) => matchesMarker(userAgent, marker));
  if (headlessHit) {
    signals.push({ code: 'env.headlessUserAgent', detail: headlessHit });
  }

  const automationHit = automationMarkers.find((marker) => matchesMarker(userAgent, marker));
  if (automationHit) {
    signals.push({ code: 'env.automationUserAgent', detail: automationHit });
  }

  const botHit = botMarkers.find((marker) => matchesMarker(userAgent, marker));
  if (botHit) {
    signals.push({ code: 'env.botUserAgent', detail: botHit });
  }

  // navigator.plugins はモバイルや非 Chromium では空になりうるので、
  // 「Chromium 系のデスクトップなのに空」に限って加点する。
  if (input.isChromium === true && !isTouchCapable && input.pluginCount === 0) {
    signals.push({ code: 'env.noPlugins' });
  }

  if (input.isChromium === true && input.hasChromeObject === false) {
    signals.push({ code: 'env.chromeObjectMissing' });
  }

  if (Array.isArray(input.languages) && input.languages.length === 0) {
    signals.push({ code: 'env.noLanguages' });
  }

  if (
    typeof input.innerWidth === 'number' &&
    typeof input.innerHeight === 'number' &&
    typeof input.screenWidth === 'number' &&
    typeof input.screenHeight === 'number' &&
    input.innerWidth > 0 &&
    input.innerWidth === input.screenWidth &&
    input.innerHeight === input.screenHeight
  ) {
    // 実ブラウザにはツールバーやタブバーがあるため、通常は縦方向が一致しない。
    signals.push({
      code: 'env.viewportEqualsScreen',
      detail: `${input.innerWidth}x${input.innerHeight}`,
    });
  }

  if (input.outerWidth === 0 || input.outerHeight === 0) {
    signals.push({ code: 'env.zeroOuterWindow' });
  }

  if (isMobileUa && input.maxTouchPoints === 0) {
    signals.push({
      code: 'env.touchInconsistency',
      detail: 'モバイル UA なのに maxTouchPoints が 0',
    });
  }

  if (typeof input.hardwareConcurrency === 'number') {
    if (input.hardwareConcurrency === 0) {
      signals.push({ code: 'env.suspiciousHardwareConcurrency', detail: '0 コア' });
    } else if (input.hardwareConcurrency > 64) {
      signals.push({
        code: 'env.suspiciousHardwareConcurrency',
        intensity: 0.5,
        detail: `${input.hardwareConcurrency} コア`,
      });
    }
  }

  // headless Chrome の典型: Notification.permission は 'denied' なのに
  // permissions.query は 'prompt' を返す。
  if (input.notificationPermission === 'denied' && input.permissionsQueryState === 'prompt') {
    signals.push({ code: 'env.permissionsInconsistency' });
  }

  return {
    layer: 'environment',
    applicable: true,
    signals,
    metrics: {
      userAgent: input.userAgent?.slice(0, 180) ?? '',
      webdriver: input.webdriver ?? null,
      pluginCount: input.pluginCount ?? null,
      languageCount: input.languages?.length ?? null,
      isChromium: input.isChromium ?? null,
      hasChromeObject: input.hasChromeObject ?? null,
      viewport:
        typeof input.innerWidth === 'number'
          ? `${input.innerWidth}x${input.innerHeight ?? 0}`
          : null,
      screen:
        typeof input.screenWidth === 'number'
          ? `${input.screenWidth}x${input.screenHeight ?? 0}`
          : null,
      outer:
        typeof input.outerWidth === 'number'
          ? `${input.outerWidth}x${input.outerHeight ?? 0}`
          : null,
      devicePixelRatio: input.devicePixelRatio ?? null,
      hardwareConcurrency: input.hardwareConcurrency ?? null,
      maxTouchPoints: input.maxTouchPoints ?? null,
    },
  };
};
