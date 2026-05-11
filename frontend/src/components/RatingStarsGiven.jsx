import { STAR_PATH_D } from "../lib/starSvgPath";

/**
 * @param {{ rating: number, size?: number, className?: string, slotCount?: number }} props
 * По умолчанию — только закрашенные звёзды (1…rating).
 * С `slotCount={5}` — фиксированная полоса из 5 звёзд (лишние контуры приглушены), текст рядом выравнивается.
 */
export default function RatingStarsGiven({ rating, size = 18, className = "", slotCount }) {
  const r = Math.min(5, Math.max(1, Math.round(Number(rating)) || 1));
  const slots =
    slotCount != null ? Math.min(5, Math.max(1, Math.round(Number(slotCount)) || 5)) : null;

  if (slots == null) {
    return (
      <span className={`rating-stars-given ${className}`.trim()} aria-hidden="true">
        {Array.from({ length: r }, (_, i) => (
          <svg
            key={i}
            className="rating-stars-given__svg"
            viewBox="0 0 24 24"
            width={size}
            height={size}
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d={STAR_PATH_D} className="rating-stars-given__path" />
          </svg>
        ))}
      </span>
    );
  }

  return (
    <span className={`rating-stars-given rating-stars-given--rail ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: slots }, (_, i) => (
        <svg
          key={i}
          className="rating-stars-given__svg"
          viewBox="0 0 24 24"
          width={size}
          height={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d={STAR_PATH_D}
            className={
              i < r ? "rating-stars-given__path" : "rating-stars-given__path rating-stars-given__path--dim"
            }
          />
        </svg>
      ))}
    </span>
  );
}
