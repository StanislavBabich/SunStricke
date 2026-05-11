import { useCallback, useEffect, useRef, useState } from "react";
import { STAR_PATH_D } from "../lib/starSvgPath";

const CLOSE_ANIMATION_MS = 220;
/** Длительность анимации + запас под stagger последней звезды */
const STAR_WOBBLE_MS = 760;

/**
 * @param {{ isOpen: boolean, onClose: () => void, onReviewSubmit?: (payload: { rating: number, text: string, lighting?: object | null }) => void, lightingContextRef?: import("react").MutableRefObject<object | null>, translations: Record<string, string> }} props
 */
export default function LightingReviewModal({
  isOpen,
  onClose,
  onReviewSubmit,
  lightingContextRef,
  translations
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [starWobble, setStarWobble] = useState(false);
  const [starWobbleUpTo, setStarWobbleUpTo] = useState(0);
  const wobbleTimerRef = useRef(null);

  const requestClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setHoverStar(0);
      setRating(0);
      setText("");
      setStarWobble(false);
      setStarWobbleUpTo(0);
      if (wobbleTimerRef.current) {
        clearTimeout(wobbleTimerRef.current);
        wobbleTimerRef.current = null;
      }
      return undefined;
    }
    if (!shouldRender) return undefined;

    setIsClosing(true);
    const timer = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!isOpen || !shouldRender) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, shouldRender, requestClose]);

  useEffect(() => {
    return () => {
      if (wobbleTimerRef.current) clearTimeout(wobbleTimerRef.current);
    };
  }, []);

  const handleStarClick = (i) => {
    setRating(i);
    setStarWobbleUpTo(i);
    if (wobbleTimerRef.current) clearTimeout(wobbleTimerRef.current);
    setStarWobble(false);
    requestAnimationFrame(() => {
      setStarWobble(true);
      wobbleTimerRef.current = setTimeout(() => {
        setStarWobble(false);
        wobbleTimerRef.current = null;
      }, STAR_WOBBLE_MS);
    });
  };

  if (!shouldRender) return null;

  const displayRating = hoverStar || rating;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (rating < 1) return;
    const lighting = lightingContextRef?.current ? { ...lightingContextRef.current } : null;
    onReviewSubmit?.({ rating, text: text.trim(), lighting });
    onClose?.();
  };

  return (
    <div
      className={`modal-overlay lighting-review-modal-overlay ${isClosing ? "is-closing" : ""}`}
      role="presentation"
      onClick={requestClose}
    >
      <section
        className={`modal lighting-review-modal ${isClosing ? "is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lighting-review-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal__close" type="button" onClick={requestClose} aria-label={translations.reviewCloseAria}>
          <img src="/assets/auth-close.svg" alt="" />
        </button>
        <h2 id="lighting-review-title" className="lighting-review-modal__title">
          {translations.reviewTitle}
        </h2>
        <div
          className="lighting-review-modal__stars"
          onMouseLeave={() => setHoverStar(0)}
          role="group"
          aria-label={translations.reviewStarsGroupAria}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              className={`lighting-review-modal__star-btn ${displayRating >= i ? "lighting-review-modal__star-btn--lit" : "lighting-review-modal__star-btn--dim"}${starWobble && i <= starWobbleUpTo && i <= rating ? " lighting-review-modal__star-btn--wobble" : ""}`.trim()}
              style={{ "--star-idx": String(i) }}
              onMouseEnter={() => setHoverStar(i)}
              onFocus={() => setHoverStar(i)}
              onBlur={() => setHoverStar(0)}
              onClick={() => handleStarClick(i)}
              aria-label={translations.reviewStarAria.replace("{n}", String(i))}
            >
              <svg
                className="lighting-review-modal__star-svg"
                viewBox="0 0 24 24"
                width={38}
                height={38}
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d={STAR_PATH_D} className="lighting-review-modal__star-path" />
              </svg>
            </button>
          ))}
        </div>
        <form className="lighting-review-modal__form" onSubmit={handleSubmit}>
          <textarea
            className="lighting-review-modal__textarea"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={translations.reviewPlaceholder}
            maxLength={2000}
            aria-label={translations.reviewPlaceholder}
          />
          <div className="lighting-review-modal__actions">
            <button type="submit" className="lighting-review-modal__submit" disabled={rating < 1}>
              {translations.reviewSend}
            </button>
            <button type="button" className="lighting-review-modal__cancel" onClick={requestClose}>
              {translations.reviewCancel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
