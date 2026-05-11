import { useId } from "react";
import { STAR_PATH_D } from "../lib/starSvgPath";

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

/**
 * Средняя оценка 0…5: закраска слева направо по доле на каждой звезде.
 * Пустые звёзды справа не показываются (только ceil(avg) слотов, максимум 5).
 */
export default function RatingStarsAverage({ value, size = 22, className = "" }) {
  const safe = Math.min(5, Math.max(0, Number(value) || 0));
  const slots = safe <= 0 ? 0 : Math.min(5, Math.max(1, Math.ceil(safe)));
  const uid = useId().replace(/:/g, "");

  return (
    <span className={`rating-stars-avg ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: slots }, (_, i) => {
        const frac = clamp01(safe - i);
        const clipId = `rsavg_${uid}_${i}`;
        const w = 24 * frac;
        return (
          <span key={i} className="rating-stars-avg__slot">
            <svg
              className="rating-stars-avg__svg"
              viewBox="0 0 24 24"
              width={size}
              height={size}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect x="0" y="0" width={w} height="24" />
                </clipPath>
              </defs>
              <path d={STAR_PATH_D} className="rating-stars-avg__path rating-stars-avg__path--empty" />
              <path d={STAR_PATH_D} className="rating-stars-avg__path rating-stars-avg__path--fill" clipPath={`url(#${clipId})`} />
            </svg>
          </span>
        );
      })}
    </span>
  );
}
