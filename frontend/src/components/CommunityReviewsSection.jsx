import { useEffect, useState } from "react";
import { formatLightingKm2 } from "../lib/lightingZone";
import { getReviewerAvatarForDisplay } from "../lib/localUserLedger";
import HistoryMapThumb from "./HistoryMapThumb";
import RatingStarsAverage from "./RatingStarsAverage";
import RatingStarsGiven from "./RatingStarsGiven";

const PAGE_SIZE = 5;

/**
 * @param {{
 *   reviews: Array<{ id: string, nickname: string, rating: number, text: string, at: number, centerLat: number, centerLng: number, radiusMeters: number, areaKm2: number | null, hours: number }>,
 *   viewerProfile: { nickname?: string, avatarData?: string, avatarPosX?: number, avatarPosY?: number },
 *   translations: { communityReviews: { title: string, empty: string, showAll?: string, averageRatingAria?: string }, locationExplorer: Record<string, string> },
 *   languageCode: string
 * }} props
 */
export default function CommunityReviewsSection({ reviews, viewerProfile, translations, languageCode }) {
  const cr = translations.communityReviews ?? {
    title: "Reviews",
    empty: "",
    showAll: "Show more",
    averageRatingAria: "Average user rating {score} out of 5"
  };
  const le = translations.locationExplorer ?? {};
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const len = reviews.length;
    setVisibleCount(len <= PAGE_SIZE ? len : PAGE_SIZE);
  }, [reviews.length]);

  const total = reviews.length;
  const count = Math.min(visibleCount, total);
  const displayed = reviews.slice(0, count);
  const hasMore = count < total;
  const sumRatings = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0);
  const averageRating = total > 0 ? Math.min(5, Math.max(0, sumRatings / total)) : 0;
  const averageFormatted = averageRating.toLocaleString(languageCode, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  const averageAria = (cr.averageRatingAria ?? "Average user rating {score} out of 5").replace(
    "{score}",
    averageFormatted
  );

  return (
    <section className="community-reviews" aria-labelledby="community-reviews-heading">
      <div className="community-reviews__inner">
        <div className="community-reviews__head">
          <h2 id="community-reviews-heading" className="community-reviews__title">
            {cr.title}
          </h2>
          {total > 0 ? (
            <div className="community-reviews__avg" role="img" aria-label={averageAria}>
              <RatingStarsAverage value={averageRating} size={22} />
              <span className="community-reviews__avg-score" aria-hidden="true">
                {averageFormatted}/5
              </span>
            </div>
          ) : null}
        </div>
        {total === 0 ? (
          <p className="community-reviews__empty">{cr.empty}</p>
        ) : (
          <>
            <ul className="community-reviews__list">
              {displayed.map((rev) => {
              const mapOk =
                Number.isFinite(rev.centerLat) &&
                Number.isFinite(rev.centerLng) &&
                Number.isFinite(rev.radiusMeters) &&
                rev.radiusMeters > 0;
              const areaLabel =
                rev.areaKm2 != null && Number.isFinite(rev.areaKm2)
                  ? `${formatLightingKm2(rev.areaKm2, languageCode)} ${le.lightingAreaUnit ?? "km²"}`
                  : "—";
              const av = getReviewerAvatarForDisplay(rev.nickname, viewerProfile);
              const avatarStyle =
                av.hasImage && av.avatarData
                  ? {
                      backgroundImage: `url("${av.avatarData}")`,
                      backgroundPosition: `${av.avatarPosX}% ${av.avatarPosY}%`
                    }
                  : undefined;
              return (
                <li key={rev.id} className="community-reviews__row">
                  <div className="community-reviews__map-wrap">
                    {mapOk ? (
                      <HistoryMapThumb
                        centerLat={rev.centerLat}
                        centerLng={rev.centerLng}
                        radiusMeters={rev.radiusMeters}
                        languageCode={languageCode}
                      />
                    ) : (
                      <div className="community-reviews__map-fallback" aria-hidden="true" />
                    )}
                  </div>
                  <div className="community-reviews__body">
                    <div
                      className={`community-reviews__avatar${av.hasImage ? " has-image" : ""}`}
                      style={avatarStyle}
                      aria-hidden="true"
                    />
                    <p className="community-reviews__nickname">{rev.nickname?.trim() || "—"}</p>
                    <div className="community-reviews__stars-wrap">
                      <RatingStarsGiven rating={rev.rating} size={20} />
                    </div>
                    {rev.text?.trim() ? <p className="community-reviews__text">{rev.text.trim()}</p> : null}
                    <p className="community-reviews__meta">
                      <span className="community-reviews__meta-label">{le.lightingAreaLabel ?? "—"}:</span>{" "}
                      <span className="community-reviews__meta-value">{areaLabel}</span>
                      <span className="community-reviews__meta-sep" aria-hidden="true">
                        {" "}
                        ·{" "}
                      </span>
                      <span className="community-reviews__meta-label">{le.lightingTimeLabel ?? "—"}:</span>{" "}
                      <span className="community-reviews__meta-value">
                        {rev.hours} {le.lightingTimeHoursSuffix ?? ""}
                      </span>
                    </p>
                  </div>
                </li>
              );
              })}
            </ul>
            {hasMore ? (
              <div className="community-reviews__more-wrap">
                <button
                  type="button"
                  className="community-reviews__more-btn"
                  onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, total))}
                >
                  {cr.showAll}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
