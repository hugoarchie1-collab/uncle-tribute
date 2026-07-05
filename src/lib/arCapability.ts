// =============================================================================
// arCapability.ts — capability + environment detection for the wall visualiser.
// -----------------------------------------------------------------------------
// Prefer real capability probes over user-agent sniffing. The AUTHORITATIVE AR
// signal is model-viewer's async `canActivateAR` (read inside the component);
// this module supplies the surrounding context needed to route the customer to
// the right experience and to explain WHY when AR can't run:
//   • secure-context / HTTPS (getUserMedia + WebXR require it)
//   • in-app browser (Instagram/Facebook/TikTok/etc. can't launch AR)
//   • coarse platform hint (iOS Quick Look vs Android Scene Viewer messaging)
//   • WebXR immersive-ar probe (progressive-enhancement signal)
//   • reduced-motion preference
// All guards are SSR-safe (return conservative values when window is absent).
// =============================================================================

export type Platform = "ios" | "android" | "desktop" | "unknown";

const ua = (): string =>
  typeof navigator !== "undefined" ? navigator.userAgent || "" : "";

/** HTTPS or localhost — required for camera + WebXR. */
export const isSecureContextSafe = (): boolean =>
  typeof window !== "undefined" && Boolean(window.isSecureContext);

/**
 * Best-effort in-app / embedded browser detection. These WebViews (social apps,
 * some email clients) cannot hand off to Scene Viewer / Quick Look, so AR silently
 * fails — we detect them to show an "open in Safari/Chrome" message instead.
 */
export const isInAppBrowser = (): boolean => {
  const s = ua();
  if (!s) return false;
  return /(FBAN|FBAV|FB_IAB|Instagram|Line\/|Twitter|TikTok|Musical_ly|Snapchat|Pinterest|LinkedInApp|WhatsApp|GSA\/|; wv\))/i.test(
    s,
  );
};

export const getPlatform = (): Platform => {
  const s = ua();
  if (!s) return "unknown";
  if (/iPhone|iPad|iPod/i.test(s)) return "ios";
  // iPadOS 13+ reports as desktop Safari; catch it via touch + Macintosh, but not
  // a touch-screen Mac running Chrome/Firefox (those aren't Quick Look devices).
  if (
    /Macintosh/i.test(s) &&
    typeof navigator !== "undefined" &&
    navigator.maxTouchPoints > 1 &&
    !/Chrome|CriOS|FxiOS/i.test(s)
  )
    return "ios";
  if (/Android/i.test(s)) return "android";
  if (/Windows|Macintosh|Linux|CrOS/i.test(s)) return "desktop";
  return "unknown";
};

export const isHandheld = (): boolean => {
  if (typeof window === "undefined") return false;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return coarse || /Android|iPhone|iPad|iPod|Mobile/i.test(ua());
};

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Async WebXR immersive-ar probe (Android Chrome / some headsets). */
export const supportsWebXRImmersiveAR = async (): Promise<boolean> => {
  try {
    const xr = (navigator as Navigator & { xr?: { isSessionSupported?: (m: string) => Promise<boolean> } }).xr;
    if (!xr?.isSessionSupported) return false;
    return await xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
};

export interface ArEnvironment {
  platform: Platform;
  secure: boolean;
  inApp: boolean;
  handheld: boolean;
  webxr: boolean;
  /** True when the device is a phone/tablet in a real browser on HTTPS. */
  arLikely: boolean;
}

/** One async snapshot of the environment for routing + analytics. */
export const probeArEnvironment = async (): Promise<ArEnvironment> => {
  const platform = getPlatform();
  const secure = isSecureContextSafe();
  const inApp = isInAppBrowser();
  const handheld = isHandheld();
  const webxr = await supportsWebXRImmersiveAR();
  // iOS Quick Look + Android Scene Viewer don't advertise via WebXR, so treat
  // any secure handheld non-in-app session as AR-likely; the component's
  // model-viewer canActivateAR check makes the final call.
  const arLikely = secure && handheld && !inApp && (platform === "ios" || platform === "android" || webxr);
  return { platform, secure, inApp, handheld, webxr, arLikely };
};
