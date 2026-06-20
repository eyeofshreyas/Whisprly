# Logo SVG Design Spec
*Date: 2026-06-19*

---

## Goal

Create a vector SVG version of the existing WisperFlow logo — a 3D glass-like "W" whose silhouette flows as a sound waveform — that renders crisply at any size from 16×16 to 1024×1024.

## Decisions

- **Format:** SVG, icon-only (no wordmark)
- **Canvas:** 200×200 `viewBox`, transparent background
- **Style:** Faithful 3D — warm amber fill with specular highlight and chrome rim, matching existing PNG

## Color Tokens (from UI)

| Role | Value |
|---|---|
| Accent amber | `#E8803A` |
| Deep amber | `#C05E28` |
| Dark amber (shadow) | `#8B2E08` |
| Specular / chrome | `#FFF0D0` → transparent |
| Glow color | `#E8803A` at 55% opacity |

## Shape

The W is a single smooth bezier path — two humps and a center valley — approximating a sound waveform:

```
M 22,155
C 22,80  42,38  62,38
C 82,38  88,108 100,108
C 112,108 118,38 138,38
C 158,38  178,80 178,155
```

Rendered as `stroke-width="32"` with `stroke-linecap="round"`. The tube shape is defined by a `<mask>` wrapping this stroke, allowing gradient fills to be applied cleanly.

## Layers (bottom to top)

1. **Outer glow** — same path, `stroke-width="38"`, `#E8803A` at 22% opacity, `feGaussianBlur(10)` — ambient warmth behind the shape.
2. **Base amber** — vertical linear gradient: `#8B2E08` (bottom) → `#C05E28` (35%) → `#E8803A` (70%) → `#F09A5A` (top). Applied as a rect masked to the W shape.
3. **Side lighting** — horizontal linear gradient: left edge slightly brighter, right edge slightly darker — adds roundness.
4. **Specular highlight** — cream `#FFF0D0` fading to transparent over the top 80px — the lit surface of the tube.
5. **Chrome rim** — pure white fading to transparent over the top 25px — the sharp reflective edge.

## Output Files

| File | Use |
|---|---|
| `src/assets/logo.svg` | In-app header (replaces `logo.png` reference in `App.tsx`) |
| `public/favicon.svg` | Browser tab favicon |

## App.tsx change

Change `import logo from "./assets/logo.png"` → `import logo from "./assets/logo.svg"` so Vite serves the SVG directly.
