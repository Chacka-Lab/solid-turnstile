import { createEffect, createSignal, onCleanup, onMount, type JSX } from 'solid-js';
import { withResolvers } from './polyfill';
import type {
  TurnstileObject,
  SupportedLanguages,
  RenderParameters,
} from 'turnstile-types';

// ---------------------------------------------------------------------------
// Module-level singleton: Cloudflare Turnstile script is loaded at most once,
// even if multiple <Turnstile> widgets are rendered on the same page.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalNamespace = (typeof globalThis !== 'undefined' ? globalThis : window) as any;

/** Current load state of the Turnstile SDK. */
let turnstileState: 'unloaded' | 'loading' | 'ready' =
  typeof globalNamespace.turnstile !== 'undefined' ? 'ready' : 'unloaded';

/**
 * Resolves once `window.turnstile` is available.
 * All component instances await this same promise.
 */
const turnstileLoad = withResolvers<void>();
// If the SDK was already on the page before this module loaded, resolve immediately.
if (turnstileState === 'ready') turnstileLoad.resolve();

const TURNSTILE_LOAD_FUNCTION = 'cf__solidTurnstileOnLoad';
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

/**
 * Ensures the Cloudflare Turnstile SDK is loaded exactly once.
 * All callers share the same Promise, so the <script> is inserted only once
 * even when multiple <Turnstile> components mount simultaneously.
 */
function ensureTurnstile(): Promise<void> {
  if (turnstileState === 'unloaded') {
    turnstileState = 'loading';

    globalNamespace[TURNSTILE_LOAD_FUNCTION] = () => {
      turnstileLoad.resolve();
      turnstileState = 'ready';
      delete globalNamespace[TURNSTILE_LOAD_FUNCTION];
    };

    const url = `${TURNSTILE_SRC}?onload=${TURNSTILE_LOAD_FUNCTION}&render=explicit`;
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.addEventListener('error', () => {
      turnstileLoad.reject('Failed to load Turnstile.');
      delete globalNamespace[TURNSTILE_LOAD_FUNCTION];
    });
    document.head.appendChild(script);
  }
  return turnstileLoad.promise;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** All props accepted by the <Turnstile> component. */
export interface TurnstileProps extends TurnstileCallbacks {
  /** Site key from the Cloudflare Turnstile dashboard. Required. */
  sitekey: string;
  /** Arbitrary action label attached to the challenge, visible in analytics. */
  action?: string;
  /** Arbitrary customer data string passed through to the challenge. */
  cData?: string;
  /** Widget color scheme. Defaults to `'auto'` (follows the OS preference). */
  theme?: 'light' | 'dark' | 'auto';
  /** Language for the widget UI. Defaults to `'auto'` (browser language). */
  language?: SupportedLanguages | 'auto';
  /** Tab index of the challenge iframe. */
  tabIndex?: number;
  /**
   * Whether to render a hidden `<input>` containing the token.
   * Useful for plain HTML form submissions without JavaScript.
   */
  responseField?: boolean;
  /** Name of the hidden response field. Defaults to `'cf-turnstile-response'`. */
  responseFieldName?: string;
  /** Visual size of the widget. */
  size?: 'normal' | 'compact' | 'flexible' | 'invisible';
  /**
   * When `true`, injects explicit `width` and `height` styles matching the
   * selected `size` so the container does not collapse in flex/grid layouts.
   */
  fixedSize?: boolean;
  /** Whether to retry automatically on failure. Defaults to `'auto'`. */
  retry?: 'auto' | 'never';
  /** Interval in milliseconds between automatic retries. */
  retryInterval?: number;
  /** What to do when a token expires. Defaults to `'auto'`. */
  refreshExpired?: 'auto' | 'manual' | 'never';
  /** When the widget should be visible. */
  appearance?: 'always' | 'execute' | 'interaction-only';
  /**
   * Controls when the challenge runs.
   * - `'render'` (default): starts automatically when the widget mounts.
   * - `'execute'`: waits for an explicit `bound.execute()` call.
   */
  execution?: 'render' | 'execute';
  /** `id` attribute forwarded to the container `<div>`. */
  id?: string;
  /** Callback ref — receives the underlying `<div>` element after mount. */
  ref?: (el: HTMLDivElement) => void;
  /** CSS class forwarded to the container `<div>`. */
  class?: string;
  /** Inline styles forwarded to the container `<div>`. */
  style?: JSX.CSSProperties;
}

/** Event callbacks exposed by the <Turnstile> component. */
export interface TurnstileCallbacks {
  /**
   * Called when the challenge is solved and a token is issued.
   * Alias for `onSuccess` without the `preClearanceObtained` flag.
   */
  onVerify?: (token: string, boundTurnstile: BoundTurnstileObject) => void;
  /**
   * Called when the challenge is solved and a token is issued.
   * `preClearanceObtained` is `true` when the visitor passed a pre-clearance
   * check (e.g. via Cloudflare Access) rather than solving the widget.
   */
  onSuccess?: (
    token: string,
    preClearanceObtained: boolean,
    boundTurnstile: BoundTurnstileObject,
  ) => void;
  /** Called once the widget has been rendered and received its `widgetId`. */
  onLoad?: (widgetId: string, boundTurnstile: BoundTurnstileObject) => void;
  /** Called when the widget encounters an error. */
  onError?: (error?: unknown, boundTurnstile?: BoundTurnstileObject) => void;
  /** Called when a token expires before it is consumed. */
  onExpire?: (token: string, boundTurnstile: BoundTurnstileObject) => void;
  /** Called when the challenge times out. */
  onTimeout?: (boundTurnstile: BoundTurnstileObject) => void;
  /** Called after the visitor has interacted with the widget. */
  onAfterInteractive?: (boundTurnstile: BoundTurnstileObject) => void;
  /** Called before the visitor is asked to interact with the widget. */
  onBeforeInteractive?: (boundTurnstile: BoundTurnstileObject) => void;
  /** Called when the visitor's browser does not support Turnstile. */
  onUnsupported?: (boundTurnstile: BoundTurnstileObject) => void;
}

/**
 * A widget-bound handle passed to every event callback.
 * Wraps the Turnstile SDK methods with the widget's `id` pre-applied so
 * callers do not need to manage `widgetId` themselves.
 */
export interface BoundTurnstileObject {
  /**
   * Executes the challenge. Only needed when `execution="execute"` is set;
   * the widget does not start automatically in that mode.
   */
  execute: (options?: RenderParameters) => void;
  /** Resets the widget, allowing the visitor to solve the challenge again. */
  reset: () => void;
  /** Returns the current token string, or `undefined` if not yet solved. */
  getResponse: () => string | undefined;
  /** Returns `true` if the most recently issued token has expired. */
  isExpired: () => boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a Cloudflare Turnstile widget.
 *
 * The Turnstile SDK script is loaded lazily on first mount and shared across
 * all widget instances on the page.
 *
 * @example
 * ```tsx
 * <Turnstile
 *   sitekey="1x00000000000000000000AA"
 *   onVerify={(token) => sendToServer(token)}
 * />
 * ```
 */
export default function Turnstile(props: TurnstileProps) {
  // DOM node that the Turnstile SDK mounts into.
  // Plain variable ref avoids `use` in compiled output (SSR-compatible).
  let containerRef!: HTMLDivElement;

  // Forward the ref to the consumer after mount. `onMount` is a no-op in SSR,
  // which is fine because Turnstile is a DOM-only widget.
  onMount(() => props.ref?.(containerRef));

  // -------------------------------------------------------------------------
  // Widget lifecycle.
  // All props are read synchronously at the top to establish reactive
  // subscriptions before the async boundary. When any prop changes: cleanup
  // removes the old widget, the effect body renders a fresh one.
  // -------------------------------------------------------------------------
  createEffect(() => {
    const sitekey = props.sitekey;
    const action = props.action;
    const cData = props.cData;
    const theme = props.theme;
    const language = props.language;
    const tabIndex = props.tabIndex;
    const responseField = props.responseField;
    const responseFieldName = props.responseFieldName;
    const size = props.size;
    const retry = props.retry;
    const retryInterval = props.retryInterval;
    const refreshExpired = props.refreshExpired;
    const appearance = props.appearance;
    const execution = props.execution;
    const onVerify = props.onVerify;
    const onSuccess = props.onSuccess;
    const onLoad = props.onLoad;
    const onError = props.onError;
    const onExpire = props.onExpire;
    const onTimeout = props.onTimeout;
    const onAfterInteractive = props.onAfterInteractive;
    const onBeforeInteractive = props.onBeforeInteractive;
    const onUnsupported = props.onUnsupported;

    let cancelled = false;
    let widgetId = '';

    (async () => {
      if (turnstileState !== 'ready') {
        try {
          await ensureTurnstile();
        } catch (e) {
          onError?.(e);
          return;
        }
      }
      if (cancelled || !containerRef) return;

      // `bound` is assigned right after render(); Turnstile only fires
      // callbacks asynchronously, so it will always be initialized in time.
      // eslint-disable-next-line prefer-const
      let bound: BoundTurnstileObject;

      widgetId = globalNamespace.turnstile.render(containerRef, {
        sitekey,
        action,
        cData,
        theme,
        language,
        tabindex: tabIndex,
        'response-field': responseField,
        'response-field-name': responseFieldName,
        size,
        retry,
        'retry-interval': retryInterval,
        'refresh-expired': refreshExpired,
        appearance,
        execution,
        callback: (token: string, preClearanceObtained: boolean) => {
          onVerify?.(token, bound);
          onSuccess?.(token, preClearanceObtained, bound);
        },
        'error-callback': (error?: unknown) => onError?.(error, bound),
        'expired-callback': (token: string) => onExpire?.(token, bound),
        'timeout-callback': () => onTimeout?.(bound),
        'after-interactive-callback': () => onAfterInteractive?.(bound),
        'before-interactive-callback': () => onBeforeInteractive?.(bound),
        'unsupported-callback': () => onUnsupported?.(bound),
      });

      bound = createBoundTurnstileObject(widgetId);
      onLoad?.(widgetId, bound);
    })();

    onCleanup(() => {
      cancelled = true;
      if (widgetId) globalNamespace.turnstile.remove(widgetId);
    });
  });

  return (
    <div
      ref={containerRef}
      id={props.id}
      class={props.class}
      style={
        props.fixedSize
          ? {
              width:
                props.size === 'compact'
                  ? '130px'
                  : props.size === 'flexible'
                    ? '100%'
                    : '300px',
              height: props.size === 'compact' ? '120px' : '65px',
              ...props.style,
            }
          : props.style
      }
    />
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createBoundTurnstileObject(widgetId: string): BoundTurnstileObject {
  return {
    execute: (options) => globalNamespace.turnstile.execute(widgetId, options),
    reset: () => globalNamespace.turnstile.reset(widgetId),
    getResponse: () => globalNamespace.turnstile.getResponse(widgetId),
    isExpired: () => globalNamespace.turnstile.isExpired(widgetId),
  };
}

// ---------------------------------------------------------------------------
// useTurnstile
// ---------------------------------------------------------------------------

/**
 * Returns a reactive accessor for the global `window.turnstile` object.
 *
 * The accessor returns `undefined` until the SDK has finished loading, then
 * resolves to the real `TurnstileObject`. Any reactive computation that calls
 * it (a `createEffect`, a JSX expression, etc.) will automatically re-run
 * once the SDK becomes available.
 *
 * Useful when you need to call Turnstile SDK methods outside a widget
 * callback, e.g. to imperatively reset a widget by its `widgetId`.
 *
 * @example
 * ```tsx
 * const turnstile = useTurnstile();
 *
 * // Inside a createEffect or JSX:
 * createEffect(() => {
 *   turnstile()?.reset(myWidgetId);
 * });
 * ```
 */
export function useTurnstile(): () => TurnstileObject | undefined {
  const [ready, setReady] = createSignal(turnstileState === 'ready');
  if (!ready()) {
    turnstileLoad.promise.then(() => setReady(true));
  }
  return () => (ready() ? (globalNamespace.turnstile as TurnstileObject) : undefined);
}
