/**
 * ブラウザ側の計測。判定は一切せず、core に渡すスナップショットを作ることだけを行う。
 *
 * 収集するのは「操作のタイミングと軌跡の形」だけで、入力内容そのものは送信も保存もしない。
 * リングバッファでサンプル数に上限を設け、長時間開かれたフォームでもメモリを食わないようにしている。
 */
import type {
  BehaviorInput,
  EnvironmentSnapshot,
  FocusSample,
  KeySample,
  PasteSample,
  PointerSample,
} from '@miyabarrier/core';

const POINTER_SAMPLE_INTERVAL_MS = 40;
const MAX_POINTER_SAMPLES = 400;
const MAX_KEY_SAMPLES = 600;
const MAX_EVENT_SAMPLES = 100;
/** 1 回の input で一気に増えた文字数がこれ以上なら、貼り付け相当として扱う。 */
const BULK_INSERT_CHARS = 20;
/** keydown / paste と同じ入力に対する input を二重に数えないための猶予。 */
const DEDUPE_WINDOW_MS = 50;

/**
 * 打鍵として数えるキー。
 * 'Process' / 'Unidentified' は IME が処理したキーで、日本語入力ではこれが大半を占める。
 * ここを落とすと「日本語で入力した人」が全員『キー入力なし』になってしまう。
 */
const isTypingKey = (key: string): boolean =>
  key.length === 1 ||
  key === 'Backspace' ||
  key === 'Enter' ||
  key === 'Process' ||
  key === 'Unidentified';

const push = <T>(buffer: T[], item: T, limit: number): void => {
  buffer.push(item);
  if (buffer.length > limit) buffer.shift();
};

const isTrackedField = (element: Element | null): element is HTMLElement =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLTextAreaElement ||
  element instanceof HTMLSelectElement;

const fieldName = (element: Element | null): string => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.name || element.id || element.type;
  }
  if (element instanceof HTMLSelectElement) return element.name || element.id || 'select';
  return 'unknown';
};

export class FormTelemetry {
  readonly renderedAt = Date.now();

  private readonly pointer: PointerSample[] = [];
  private readonly keys: KeySample[] = [];
  private readonly focus: FocusSample[] = [];
  private readonly pastes: PasteSample[] = [];
  private touchEventCount = 0;
  private lastPointerSampleAt = 0;
  private lastKeyAt = 0;
  private lastPasteAt = 0;
  private readonly fieldLengths = new Map<string, number>();
  private permissionsQueryState: string | undefined;
  private readonly detachers: Array<() => void> = [];

  constructor(
    private readonly form: HTMLFormElement,
    private readonly doc: Document = form.ownerDocument,
  ) {
    this.attach();
    this.probePermissions();
  }

  private on<K extends keyof DocumentEventMap>(
    target: Document | HTMLElement,
    type: K,
    handler: (event: DocumentEventMap[K]) => void,
  ): void {
    const listener = handler as EventListener;
    const options: AddEventListenerOptions = { passive: true, capture: true };
    target.addEventListener(type, listener, options);
    this.detachers.push(() => target.removeEventListener(type, listener, options));
  }

  private attach(): void {
    // ポインタは document 全体で拾う。フォーム上に来る前の動きも「人間らしさ」の材料になる。
    this.on(this.doc, 'pointermove', (event) => {
      const now = Date.now();
      if (now - this.lastPointerSampleAt < POINTER_SAMPLE_INTERVAL_MS) return;
      this.lastPointerSampleAt = now;
      push(this.pointer, { x: event.clientX, y: event.clientY, t: now }, MAX_POINTER_SAMPLES);
    });

    // クリックそのものもポインタ操作として数える。マウスを動かさずタブ移動＋クリックで
    // 入力する人（や、トラックパッドで軌跡がほとんど出ない環境）を bot 扱いしないため。
    this.on(this.doc, 'pointerdown', (event) => {
      push(
        this.pointer,
        { x: event.clientX, y: event.clientY, t: Date.now() },
        MAX_POINTER_SAMPLES,
      );
    });

    this.on(this.doc, 'touchstart', () => {
      this.touchEventCount += 1;
    });

    this.on(this.form, 'keydown', (event) => {
      // 文字を生む打鍵だけを間隔解析の対象にする（Shift 連打などでリズムが歪むのを避ける）。
      if (!isTypingKey(event.key)) return;
      this.lastKeyAt = Date.now();
      push(
        this.keys,
        { t: this.lastKeyAt, field: fieldName(event.target as Element) },
        MAX_KEY_SAMPLES,
      );
    });

    // keydown を伴わない入力（IME の確定、音声入力、オートフィル、CDP の insertText 等）を拾う。
    this.on(this.form, 'input', (event) => {
      const target = event.target as Element | null;
      if (!isTrackedField(target) || target instanceof HTMLSelectElement) return;
      const field = fieldName(target);
      const length = (target as HTMLInputElement | HTMLTextAreaElement).value?.length ?? 0;
      const delta = length - (this.fieldLengths.get(field) ?? 0);
      this.fieldLengths.set(field, length);

      const now = Date.now();
      if (delta >= BULK_INSERT_CHARS) {
        // 一気に大量の文字が入るのは、貼り付けか値の流し込み。paste と二重に数えない。
        if (now - this.lastPasteAt > DEDUPE_WINDOW_MS) {
          push(this.pastes, { field, t: now, length: delta }, MAX_EVENT_SAMPLES);
        }
      } else if (now - this.lastKeyAt > DEDUPE_WINDOW_MS) {
        push(this.keys, { t: now, field }, MAX_KEY_SAMPLES);
      }
    });

    this.on(this.form, 'focusin', (event) => {
      const target = event.target as Element | null;
      if (!isTrackedField(target)) return;
      push(this.focus, { field: fieldName(target), t: Date.now() }, MAX_EVENT_SAMPLES);
    });

    this.on(this.form, 'paste', (event) => {
      const text = event.clipboardData?.getData('text') ?? '';
      this.lastPasteAt = Date.now();
      push(
        this.pastes,
        { field: fieldName(event.target as Element), t: this.lastPasteAt, length: text.length },
        MAX_EVENT_SAMPLES,
      );
    });
  }

  /** headless Chrome では Notification.permission と permissions.query の結果が食い違う。 */
  private probePermissions(): void {
    try {
      const permissions = (this.doc.defaultView as Window & typeof globalThis)?.navigator
        ?.permissions;
      void permissions
        ?.query({ name: 'notifications' as PermissionName })
        .then((status) => {
          this.permissionsQueryState = status.state;
        })
        .catch(() => undefined);
    } catch {
      /* 未対応ブラウザでは何もしない */
    }
  }

  pointerSampleCount(): number {
    return this.pointer.length + this.touchEventCount;
  }

  /** 送信時点の行動スナップショット。typedChars は呼び出し側が数えたフォーム内文字数。 */
  behavior(typedChars: number, submittedAt = Date.now()): BehaviorInput {
    return {
      renderedAt: this.renderedAt,
      submittedAt,
      pointer: [...this.pointer],
      keys: [...this.keys],
      focus: [...this.focus],
      pastes: [...this.pastes],
      typedChars,
      touchEventCount: this.touchEventCount,
    };
  }

  environment(): EnvironmentSnapshot {
    return readEnvironment(this.doc.defaultView ?? undefined, this.permissionsQueryState);
  }

  destroy(): void {
    for (const detach of this.detachers) detach();
    this.detachers.length = 0;
  }
}

const CHROMIUM_UA = /(chrome|chromium|crios|edg\/|opr\/)/i;

export const readEnvironment = (
  view: (Window & typeof globalThis) | undefined,
  permissionsQueryState?: string,
): EnvironmentSnapshot => {
  const win = view ?? (typeof window === 'undefined' ? undefined : window);
  const nav = win?.navigator;
  const userAgent = nav?.userAgent ?? '';

  let pluginCount: number | undefined;
  try {
    pluginCount = nav?.plugins?.length;
  } catch {
    pluginCount = undefined;
  }

  let notificationPermission: string | undefined;
  try {
    notificationPermission = win && 'Notification' in win ? win.Notification.permission : undefined;
  } catch {
    notificationPermission = undefined;
  }

  const snapshot: EnvironmentSnapshot = {
    userAgent,
    webdriver: nav?.webdriver === true,
    isChromium: CHROMIUM_UA.test(userAgent),
    hasChromeObject: win ? 'chrome' in win : undefined,
    languages: nav?.languages ? [...nav.languages] : nav?.language ? [nav.language] : [],
    screenWidth: win?.screen?.width,
    screenHeight: win?.screen?.height,
    innerWidth: win?.innerWidth,
    innerHeight: win?.innerHeight,
    outerWidth: win?.outerWidth,
    outerHeight: win?.outerHeight,
    devicePixelRatio: win?.devicePixelRatio,
    hardwareConcurrency: nav?.hardwareConcurrency,
    maxTouchPoints: nav?.maxTouchPoints,
  };

  if (pluginCount !== undefined) snapshot.pluginCount = pluginCount;
  if (notificationPermission !== undefined)
    snapshot.notificationPermission = notificationPermission;
  if (permissionsQueryState !== undefined) snapshot.permissionsQueryState = permissionsQueryState;

  return snapshot;
};
