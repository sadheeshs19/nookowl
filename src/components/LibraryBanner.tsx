import Svg, { Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';

const COLS = ['#C2410C', '#2F6FB0', '#3E8E5B', '#B83A5B', '#E0A43A', '#6B4FA0', '#2E7F86', '#D9653B', '#45506B', '#8C5A3C'];

export const BANNER_W = 320;
export const BANNER_H = 196;
const SHELVES = [80, 132, 184]; // y of each plank top
const GAP = { from: 112, to: 208 }; // left open on the bottom shelf for the owl's nest

type Book = { x: number; y: number; w: number; h: number; c: string; flat?: boolean };

// Same books every time: a tiny seeded random.
function makeBooks() {
  let s = 11;
  const r = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const books: Book[] = [];
  SHELVES.forEach((plank, row) => {
    let x = 14;
    while (x < BANNER_W - 14) {
      if (row === 2 && x > GAP.from - 6 && x < GAP.to) {
        x = GAP.to;
        continue;
      }
      // Now and then, a little stack of books lying flat.
      if (r() < 0.12 && x + 26 < BANNER_W - 14 && !(row === 2 && x + 26 > GAP.from && x < GAP.to)) {
        const n = 2 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) {
          const w = 22 + r() * 6;
          books.push({ x: x + r() * 3, y: plank - (i + 1) * 6, w, h: 6, c: COLS[Math.floor(r() * COLS.length)], flat: true });
        }
        x += 30;
        continue;
      }
      const w = 7 + Math.floor(r() * 6);
      const h = 26 + Math.floor(r() * 14);
      books.push({ x, y: plank - h, w, h, c: COLS[Math.floor(r() * COLS.length)] });
      x += w + (r() < 0.15 ? 3 : 1);
    }
  });
  return books;
}
const BOOKS = makeBooks();

/** A cosy wall of bookshelves, used behind the owl on the welcome pop-up. */
export function LibraryBanner() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${BANNER_W} ${BANNER_H}`}
      preserveAspectRatio="xMidYMid slice"
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <Defs>
        <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1E1830" />
          <Stop offset="1" stopColor="#2C2342" />
        </LinearGradient>
        <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Wood frame and the dark back of the bookcase */}
      <Rect x={0} y={0} width={BANNER_W} height={BANNER_H} fill="#5A3519" />
      <Rect x={8} y={44} width={BANNER_W - 16} height={BANNER_H - 44} fill="url(#wall)" />
      <Rect x={0} y={0} width={BANNER_W} height={44} fill="#1E1830" />

      {BOOKS.map((b, i) =>
        b.flat ? (
          <Rect key={i} x={b.x} y={b.y} width={b.w} height={b.h - 0.6} rx={1} fill={b.c} />
        ) : (
          <G key={i}>
            <Rect x={b.x} y={b.y} width={b.w} height={b.h} rx={1.2} fill={b.c} />
            <Rect x={b.x + 1.2} y={b.y + 5} width={b.w - 2.4} height={1.6} fill="#FFFFFF" opacity={0.35} />
            <Rect x={b.x + 1.2} y={b.y + b.h - 8} width={b.w - 2.4} height={1.2} fill="#000000" opacity={0.2} />
          </G>
        ),
      )}

      {/* Shelf planks, each with a soft shadow underneath */}
      {SHELVES.map((y) => (
        <G key={y}>
          <Rect x={4} y={y} width={BANNER_W - 8} height={6} rx={1.5} fill="#8F5A2F" />
          <Rect x={4} y={y} width={BANNER_W - 8} height={1.5} fill="#B67A45" />
          <Rect x={8} y={y + 6} width={BANNER_W - 16} height={8} fill="url(#shade)" />
        </G>
      ))}
      {/* Side posts */}
      <Rect x={0} y={44} width={8} height={BANNER_H - 44} fill="#6E4220" />
      <Rect x={BANNER_W - 8} y={44} width={8} height={BANNER_H - 44} fill="#6E4220" />
    </Svg>
  );
}
