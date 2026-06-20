// =============================================================================
// model-viewer.d.ts — typed <model-viewer> intrinsic element for React 19
// -----------------------------------------------------------------------------
// @google/model-viewer registers a `<model-viewer>` custom element. React needs
// a JSX.IntrinsicElements entry to accept it without an `any`-cast at every use.
//
// REACT 19 NAMESPACE: @types/react 19 declares its JSX namespace INSIDE the
// `react` module (the file uses `export = React; export as namespace React`,
// with `namespace JSX { ... }` nested in it — verified against the installed
// @types/react@19.2.x). So the correct augmentation target is
// `declare module "react" { namespace JSX { interface IntrinsicElements {...} } }`,
// NOT the legacy global `JSX` namespace (React 18 and earlier). This is a
// side-effect (ambient) declaration module — no exports, picked up via tsconfig
// `include: ["src"]`.
// =============================================================================

import type { DetailedHTMLProps, HTMLAttributes, RefAttributes } from "react";

/** The subset of model-viewer attributes this site sets. Kebab-case mirrors the
 *  DOM attribute names model-viewer reads; boolean attrs accept the empty-string
 *  / presence form too. All optional — model-viewer has sane defaults. */
interface ModelViewerAttributes {
  /** glb / gltf source (the default, non-iOS path). */
  src?: string;
  /** USDZ source for iOS Quick Look. */
  "ios-src"?: string;
  alt?: string;
  /** Poster image shown before the model loads / while AR is unavailable. */
  poster?: string;
  /** Enable the AR affordance (boolean attribute). */
  ar?: boolean;
  /** Space-separated AR backends, e.g. "webxr scene-viewer quick-look". */
  "ar-modes"?: string;
  /** "auto" | "fixed" — "fixed" keeps the model at its authored real-world size. */
  "ar-scale"?: "auto" | "fixed";
  /** "floor" | "wall" — where Scene Viewer / WebXR anchors the model. A framed
   *  print belongs on the wall, not the floor. */
  "ar-placement"?: "floor" | "wall";
  /** Enable orbit / zoom user controls (boolean attribute). */
  "camera-controls"?: boolean;
  /** Initial camera orbit, e.g. "0deg 75deg 105%". */
  "camera-orbit"?: string;
  /** Ground shadow strength, 0..1. */
  "shadow-intensity"?: string | number;
  /** Lighting environment ("neutral", "legacy", or an .hdr URL). */
  "environment-image"?: string;
  /** Tone-mapping exposure. */
  exposure?: string | number;
  /** "auto" | "lazy" | "eager" — when to fetch the model. */
  loading?: "auto" | "lazy" | "eager";
  /** "auto" | "interaction" | "manual" — when to dismiss the poster. */
  reveal?: "auto" | "interaction" | "manual";
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & ModelViewerAttributes,
        HTMLElement
      > &
        RefAttributes<HTMLElement>;
    }
  }
}
