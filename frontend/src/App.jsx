import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import RegisterModal from "./components/RegisterModal";
import ProfileModal from "./components/ProfileModal";
import InfoSection from "./components/InfoSection";
import LocationExplorer from "./components/LocationExplorer";
import Footer from "./components/Footer";
import { getInfoBlocks } from "./data/blocks";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, TRANSLATIONS } from "./data/i18n";
import { forceLogoutLocal, getCurrentUser, logoutUser, updateProfile } from "./api";
import { circleRadiusMFromAreaKm2 } from "./lib/lightingZone";
import { prependCommunityReview, readCommunityReviews } from "./lib/communityReviews";
import { mergeLedgerIntoProfile, syncUserLedger } from "./lib/localUserLedger";
import CommunityReviewsSection from "./components/CommunityReviewsSection";

const USER_PROFILE_STORAGE_KEY = "sunstrike_user_profile";
const EMPTY_PROFILE = {
  nickname: "",
  email: "",
  avatarData: "",
  avatarPosX: 50,
  avatarPosY: 50,
  balance: 0,
  reviews: [],
  applications: []
};

function normalizeStoredReviews(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === "object")
    .map((r, idx) => {
      const rating = Math.min(5, Math.max(1, Math.round(Number(r.rating)) || 1));
      const base = {
        id: typeof r.id === "string" && r.id ? r.id : `r_${idx}_${Number(r.at) || Date.now()}`,
        rating,
        text: typeof r.text === "string" ? r.text : "",
        at: Number.isFinite(r.at) ? r.at : Date.now()
      };
      const hasGeo =
        Number.isFinite(r.centerLat) &&
        Number.isFinite(r.centerLng) &&
        Number.isFinite(r.radiusMeters) &&
        r.radiusMeters > 0;
      if (!hasGeo) return base;
      return {
        ...base,
        centerLat: r.centerLat,
        centerLng: r.centerLng,
        radiusMeters: r.radiusMeters,
        areaKm2: Number.isFinite(r.areaKm2) && r.areaKm2 > 0 ? r.areaKm2 : null,
        hours: Math.min(168, Math.max(1, Math.round(Number(r.hours)) || 1))
      };
    })
    .sort((a, b) => b.at - a.at);
}

function normalizeStoredApplications(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a === "object")
    .map((a, idx) => {
      const areaKm2 = Number.isFinite(a.areaKm2) && a.areaKm2 > 0 ? a.areaKm2 : 1;
      const radiusFromArea = circleRadiusMFromAreaKm2(areaKm2);
      const radiusMeters =
        Number.isFinite(a.radiusMeters) && a.radiusMeters > 0 ? a.radiusMeters : radiusFromArea;
      return {
        id: typeof a.id === "string" && a.id ? a.id : `a_${idx}_${Number(a.at) || Date.now()}`,
        at: Number.isFinite(a.at) ? a.at : Date.now(),
        address: typeof a.address === "string" ? a.address.slice(0, 500) : "",
        areaKm2,
        hours: Math.min(168, Math.max(1, Math.round(Number(a.hours)) || 1)),
        amountUsd: Math.round(Number.isFinite(a.amountUsd) ? a.amountUsd : 0),
        centerLat: Number.isFinite(a.centerLat) ? a.centerLat : 0,
        centerLng: Number.isFinite(a.centerLng) ? a.centerLng : 0,
        radiusMeters
      };
    })
    .sort((a, b) => b.at - a.at);
}

function readStoredProfile() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      nickname: parsed?.nickname || "",
      email: parsed?.email || "",
      avatarData: parsed?.avatarData || "",
      avatarPosX: Number.isFinite(parsed?.avatarPosX) ? parsed.avatarPosX : 50,
      avatarPosY: Number.isFinite(parsed?.avatarPosY) ? parsed.avatarPosY : 50,
      balance: Number.isFinite(parsed?.balance) ? parsed.balance : 0,
      reviews: normalizeStoredReviews(parsed?.reviews),
      applications: normalizeStoredApplications(parsed?.applications)
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

function persistProfile(profile) {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function persistUserProfile(profile) {
  persistProfile(profile);
  syncUserLedger(profile.nickname, {
    balance: profile.balance,
    reviews: profile.reviews,
    applications: profile.applications,
    avatarData: typeof profile.avatarData === "string" ? profile.avatarData : "",
    avatarPosX: Number.isFinite(profile.avatarPosX) ? profile.avatarPosX : 50,
    avatarPosY: Number.isFinite(profile.avatarPosY) ? profile.avatarPosY : 50
  });
}

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userProfile, setUserProfile] = useState(EMPTY_PROFILE);
  const [communityReviews, setCommunityReviews] = useState(() => readCommunityReviews());
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("register");
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANGUAGE);
  const [visibleBlocks, setVisibleBlocks] = useState({});
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [isFooterIntroActive, setIsFooterIntroActive] = useState(true);
  const blockRefs = useRef([]);
  const footerRef = useRef(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedProfile = readStoredProfile();
        const user = await getCurrentUser();
        let normalized = {
          nickname: user.username || storedProfile.nickname || "",
          email: user.email || storedProfile.email || "",
          avatarData: user.avatarData || storedProfile.avatarData || "",
          avatarPosX: Number.isFinite(user.avatarPosX) ? user.avatarPosX : storedProfile.avatarPosX || 50,
          avatarPosY: Number.isFinite(user.avatarPosY) ? user.avatarPosY : storedProfile.avatarPosY || 50,
          balance: Number.isFinite(storedProfile.balance) ? storedProfile.balance : 0,
          reviews: normalizeStoredReviews(storedProfile.reviews),
          applications: normalizeStoredApplications(storedProfile.applications)
        };
        normalized = mergeLedgerIntoProfile(normalized.nickname, normalized);
        normalized = {
          ...normalized,
          reviews: normalizeStoredReviews(normalized.reviews),
          applications: normalizeStoredApplications(normalized.applications)
        };
        setIsAuthorized(true);
        setUserProfile(normalized);
        persistUserProfile(normalized);
      } catch {
        forceLogoutLocal();
        setIsAuthorized(false);
        setUserProfile(EMPTY_PROFILE);
        localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && TRANSLATIONS[savedLanguage]) {
      setLanguageCode(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = languageCode;
  }, [languageCode]);

  useEffect(() => {
    if (isAuthorized && !isCheckingSession) {
      setCommunityReviews(readCommunityReviews());
    }
  }, [isAuthorized, isCheckingSession]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFooterIntroActive(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target.dataset.observe === "block" && entry.isIntersecting) {
            const index = Number(entry.target.dataset.index);
            setVisibleBlocks((prev) => {
              if (prev[index]) return prev;
              return { ...prev, [index]: true };
            });
            observer.unobserve(entry.target);
          }

          if (entry.target.dataset.observe === "footer" && entry.isIntersecting) {
            setIsFooterVisible(true);
          }
        });
      },
      {
        threshold: 0.25
      }
    );

    blockRefs.current.forEach((blockRef, index) => {
      if (!blockRef) return;
      blockRef.dataset.observe = "block";
      blockRef.dataset.index = String(index);
      observer.observe(blockRef);
    });

    if (footerRef.current) {
      footerRef.current.dataset.observe = "footer";
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, [languageCode]);

  const handleOpenRegister = () => {
    setAuthModalMode("register");
    setIsRegisterOpen(true);
  };

  const handleOpenLogin = () => {
    setAuthModalMode("login");
    setIsRegisterOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      forceLogoutLocal();
    }
    if (userProfile.nickname?.trim()) {
      syncUserLedger(userProfile.nickname, {
        balance: Number.isFinite(userProfile.balance) ? userProfile.balance : 0,
        reviews: normalizeStoredReviews(userProfile.reviews),
        applications: normalizeStoredApplications(userProfile.applications),
        avatarData: typeof userProfile.avatarData === "string" ? userProfile.avatarData : "",
        avatarPosX: Number.isFinite(userProfile.avatarPosX) ? userProfile.avatarPosX : 50,
        avatarPosY: Number.isFinite(userProfile.avatarPosY) ? userProfile.avatarPosY : 50
      });
    }
    setIsAuthorized(false);
    setUserProfile(EMPTY_PROFILE);
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    setIsProfileOpen(false);
  };

  const handleAuthSuccess = (authData) => {
    const storedProfile = readStoredProfile();
    let normalized = {
      nickname: authData.username || storedProfile.nickname || "",
      email: authData.email || storedProfile.email || "",
      avatarData: authData.avatarData || storedProfile.avatarData || "",
      avatarPosX: Number.isFinite(authData.avatarPosX) ? authData.avatarPosX : storedProfile.avatarPosX || 50,
      avatarPosY: Number.isFinite(authData.avatarPosY) ? authData.avatarPosY : storedProfile.avatarPosY || 50,
      balance: Number.isFinite(storedProfile.balance) ? storedProfile.balance : 0,
      reviews: normalizeStoredReviews(storedProfile.reviews),
      applications: normalizeStoredApplications(storedProfile.applications)
    };
    normalized = mergeLedgerIntoProfile(normalized.nickname, normalized);
    normalized = {
      ...normalized,
      reviews: normalizeStoredReviews(normalized.reviews),
      applications: normalizeStoredApplications(normalized.applications)
    };
    setIsAuthorized(true);
    setUserProfile(normalized);
    persistUserProfile(normalized);
  };

  const handleProfileSave = async (payload) => {
    const updated = await updateProfile(payload);
    const normalized = {
      nickname: updated.username || "",
      email: updated.email || "",
      avatarData: updated.avatarData || "",
      avatarPosX: Number.isFinite(updated.avatarPosX) ? updated.avatarPosX : 50,
      avatarPosY: Number.isFinite(updated.avatarPosY) ? updated.avatarPosY : 50,
      balance: Number.isFinite(userProfile.balance) ? userProfile.balance : 0,
      reviews: normalizeStoredReviews(userProfile.reviews),
      applications: normalizeStoredApplications(userProfile.applications)
    };
    setUserProfile(normalized);
    persistUserProfile(normalized);
    return normalized;
  };

  const handleTopUpBalance = (amount) => {
    setUserProfile((prev) => {
      const next = {
        ...prev,
        balance: (Number.isFinite(prev.balance) ? prev.balance : 0) + amount
      };
      persistUserProfile(next);
      return next;
    });
  };

  const handleLightingPayment = ({
    amountUsd,
    address,
    areaKm2,
    hours,
    centerLat,
    centerLng,
    radiusMeters
  }) => {
    const due = Math.round(Number.isFinite(amountUsd) ? amountUsd : 0);
    if (due <= 0) return;
    setUserProfile((prev) => {
      const bal = Number.isFinite(prev.balance) ? prev.balance : 0;
      if (bal < due) return prev;
      const entry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        at: Date.now(),
        address: typeof address === "string" ? address.slice(0, 500) : "",
        areaKm2: Number.isFinite(areaKm2) && areaKm2 > 0 ? areaKm2 : 1,
        hours: Math.min(168, Math.max(1, Math.round(Number(hours)) || 1)),
        amountUsd: due,
        centerLat: Number.isFinite(centerLat) ? centerLat : 0,
        centerLng: Number.isFinite(centerLng) ? centerLng : 0,
        radiusMeters: Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : circleRadiusMFromAreaKm2(1)
      };
      const apps = normalizeStoredApplications(prev.applications);
      const next = {
        ...prev,
        balance: bal - due,
        applications: [entry, ...apps]
      };
      persistUserProfile(next);
      return next;
    });
  };

  const handleAddLightingReview = ({ rating, text, lighting }) => {
    const r = Math.min(5, Math.max(1, Math.round(Number(rating)) || 0));
    if (r < 1) return;
    const safeText = typeof text === "string" ? text.slice(0, 2000) : "";
    const Lctx = lighting && typeof lighting === "object" ? lighting : null;
    const hasGeo =
      Lctx &&
      Number.isFinite(Lctx.centerLat) &&
      Number.isFinite(Lctx.centerLng) &&
      Number.isFinite(Lctx.radiusMeters) &&
      Lctx.radiusMeters > 0;
    const nickname = userProfile.nickname?.trim() || "—";
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const at = Date.now();

    setUserProfile((prev) => {
      const entry = {
        id,
        rating: r,
        text: safeText,
        at,
        ...(hasGeo
          ? {
              centerLat: Lctx.centerLat,
              centerLng: Lctx.centerLng,
              radiusMeters: Lctx.radiusMeters,
              areaKm2: Number.isFinite(Lctx.areaKm2) && Lctx.areaKm2 > 0 ? Lctx.areaKm2 : null,
              hours: Math.min(168, Math.max(1, Math.round(Number(Lctx.hours)) || 1))
            }
          : {})
      };
      const prevReviews = normalizeStoredReviews(prev.reviews);
      const next = { ...prev, reviews: [entry, ...prevReviews] };
      persistUserProfile(next);
      return next;
    });

    setCommunityReviews(
      prependCommunityReview({
        id: `${id}_pub`,
        at,
        nickname,
        rating: r,
        text: safeText,
        centerLat: hasGeo ? Lctx.centerLat : NaN,
        centerLng: hasGeo ? Lctx.centerLng : NaN,
        radiusMeters: hasGeo ? Lctx.radiusMeters : NaN,
        areaKm2: hasGeo && Number.isFinite(Lctx.areaKm2) && Lctx.areaKm2 > 0 ? Lctx.areaKm2 : null,
        hours: hasGeo ? Math.min(168, Math.max(1, Math.round(Number(Lctx.hours)) || 1)) : 1
      })
    );
  };

  const handleLanguageChange = (nextLanguageCode) => {
    setLanguageCode(nextLanguageCode);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguageCode);
  };

  const translations = TRANSLATIONS[languageCode] || TRANSLATIONS[DEFAULT_LANGUAGE];
  const infoBlocks = getInfoBlocks(languageCode);

  return (
    <div className="app">
      <Header
        isAuthorized={isAuthorized}
        username={userProfile.nickname}
        isCheckingSession={isCheckingSession}
        languageCode={languageCode}
        translations={translations}
        onLanguageChange={handleLanguageChange}
        onOpenRegister={handleOpenRegister}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
      />
      <main className="content">
        {isAuthorized && !isCheckingSession && (
          <LocationExplorer
            translations={translations.locationExplorer}
            languageCode={languageCode}
            userBalance={Number.isFinite(userProfile.balance) ? userProfile.balance : 0}
            onLightingPayment={handleLightingPayment}
            onLightingReviewSubmit={handleAddLightingReview}
          />
        )}
        {infoBlocks.map((block, index) => (
          <InfoSection
            key={block.title}
            block={block}
            reverse={index % 2 === 1}
            sectionRef={(element) => {
              blockRefs.current[index] = element;
            }}
            direction={index % 2 === 0 ? "right" : "left"}
            isVisible={Boolean(visibleBlocks[index])}
          />
        ))}
        {isAuthorized && !isCheckingSession && (
          <CommunityReviewsSection
            reviews={communityReviews}
            viewerProfile={userProfile}
            translations={translations}
            languageCode={languageCode}
          />
        )}
      </main>
      <Footer
        translations={translations}
        footerRef={footerRef}
        isFooterVisible={isFooterVisible}
        isFooterIntroActive={isFooterIntroActive}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        initialMode={authModalMode}
        onClose={() => setIsRegisterOpen(false)}
        translations={translations}
        onAuthSuccess={handleAuthSuccess}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userProfile={userProfile}
        userReviews={normalizeStoredReviews(userProfile.reviews)}
        userApplications={normalizeStoredApplications(userProfile.applications)}
        languageCode={languageCode}
        onSaveProfile={handleProfileSave}
        onTopUpBalance={handleTopUpBalance}
        translations={translations}
      />
    </div>
  );
}
