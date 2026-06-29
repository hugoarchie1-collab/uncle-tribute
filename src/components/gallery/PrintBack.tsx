// =============================================================================
// PrintBack — the BACK of the finished framed piece, shown in the Virtual
// Exhibition's "Front ⇄ Back" toggle so a buyer sees exactly what arrives: a
// real backing board behind the chosen frame, with the estate's Certificate of
// Authenticity label affixed (the same provenance the COA endpoint issues).
//
// Pure JSX/CSS — NO 3D regeneration. The edition number is a 0 / 0 PLACEHOLDER
// here (this is a presentation of the format, not a live-issued certificate);
// the real number + Certificate ID are minted per order by api/stripe-webhook.ts
// and surfaced on /auth. Kept deliberately dignified, on the cream COA register.
// =============================================================================

import type { Colourway, Painting } from "../../data/paintings";
import { AR_SIZES, AR_FRAMES, type ArSize, type ArFrame } from "../../lib/arAssets";
import { asset } from "../../lib/asset";

interface PrintBackProps {
  painting: Painting;
  colourway: Colourway;
  sizeId: ArSize["id"];
  frame: ArFrame["id"];
  className?: string;
}

export function PrintBack({ painting, colourway, sizeId, frame, className }: PrintBackProps) {
  const size = AR_SIZES.find((s) => s.id === sizeId) ?? AR_SIZES[0];
  const frameDef = AR_FRAMES.find((f) => f.id === frame) ?? AR_FRAMES[0];

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(120% 100% at 50% 0%, #15110d 0%, #0a0908 72%)",
      }}
    >
      {/* The frame, seen from behind (matches the chosen finish). */}
      <div
        className="absolute inset-[8%] rounded-[3px]"
        style={{
          background: `linear-gradient(135deg, ${frameDef.swatch} 0%, ${frameDef.swatch} 60%, rgba(0,0,0,0.45) 100%)`,
          boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(0,0,0,0.4)",
          padding: "3.5%",
        }}
      >
        {/* Kraft backing board with a faint grain + the brown-paper tape edges. */}
        <div
          className="relative h-full w-full overflow-hidden rounded-[2px]"
          style={{
            background:
              "repeating-linear-gradient(92deg, #b9a888 0px, #b6a384 2px, #beac8e 4px), linear-gradient(160deg, #c4b393 0%, #ab9876 100%)",
          }}
        >
          {/* gummed-paper tape border (the sealed back of a real framed print) */}
          <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 7px rgba(150,128,92,0.6)" }} />
          {/* D-ring + cord hint near the top */}
          <div className="absolute left-1/2 top-[10%] h-[2px] w-[34%] -translate-x-1/2 rounded-full" style={{ background: "rgba(60,48,32,0.55)" }} />
          <div className="absolute left-[24%] top-[10%] h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-1 ring-black/40" style={{ background: "#8a7757" }} />
          <div className="absolute right-[24%] top-[10%] h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-1 ring-black/40" style={{ background: "#8a7757" }} />

          {/* The Certificate of Authenticity label, affixed centre. */}
          <div
            className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-cream px-[6%] py-[6%] text-center"
            style={{ boxShadow: "0 10px 26px -8px rgba(0,0,0,0.45), 0 0 0 1px rgba(26,22,18,0.08)" }}
          >
            <img
              src={asset("/logo/logo-seal-v9-w256.png")}
              alt=""
              className="mx-auto mb-2 h-9 w-9 md:h-11 md:w-11"
              loading="lazy"
              decoding="async"
            />
            <p className="m-0 font-sans text-[8.5px] md:text-[10px] font-bold tracking-[0.04em] text-cream-ink-soft">
              Certificate of Authenticity
            </p>
            <p className="mx-auto mt-1.5 mb-0 max-w-[24ch] font-display text-cream-ink text-[12px] md:text-[15px] leading-[1.2]">
              {painting.title}
            </p>
            <p className="m-0 mt-0.5 font-sans text-[8px] md:text-[9.5px] tracking-[0.04em] text-cream-ink-soft">
              {colourway.name} · {size.label} ({size.cm} × {size.cm} cm) · {frameDef.label}
            </p>

            <div className="mx-auto my-2.5 h-px w-8 bg-cream-ink/20" />

            <div className="flex items-center justify-center gap-3">
              <img
                src={asset("/img/qr/qr-home-plain-v1.svg")}
                alt=""
                className="h-9 w-9 md:h-11 md:w-11 rounded-[2px]"
                loading="lazy"
                decoding="async"
              />
              <div className="text-left">
                <p className="m-0 font-sans text-[8px] md:text-[9px] tracking-[0.04em] text-cream-ink-soft">Edition</p>
                <p className="m-0 font-display text-cream-ink text-[12px] md:text-[15px] leading-none">No. 0 / 0</p>
                <p className="m-0 mt-1 font-sans text-[7.5px] md:text-[8.5px] tracking-[0.1em] text-cream-ink-soft">
                  MANDALA-···-······
                </p>
              </div>
            </div>

            <p className="m-0 mt-2.5 font-sans text-[7.5px] md:text-[9px] leading-[1.4] text-cream-ink-soft">
              Estate-stamped giclée · made to order · The Estate of Stephen Meakin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
