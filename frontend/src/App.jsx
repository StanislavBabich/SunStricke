import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import RegisterModal from "./components/RegisterModal";
import ProfileModal from "./components/ProfileModal";
import InfoSection from "./components/InfoSection";
import Footer from "./components/Footer";
import { getInfoBlocks } from "./data/blocks";
import { LANGUAGE_STORAGE_KEY, TRANSLATIONS } from "./data/i18n";
import { forceLogoutLocal, getCurrentUser, logoutUser, updateProfile } from "./api";

const USER_PROFILE_STORAGE_KEY = "sunstrike_user_profile";
const EMPTY_PROFILE = {
  nickname: "",
  email: "",
  avatarData: "",
  avatarPosX: 50,
  avatarPosY: 50,
  balance: 0
};

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
      balance: Number.isFinite(parsed?.balance) ? parsed.balance : 0
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

function persistProfile(profile) {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export default function App() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userProfile, setUserProfile] = useState(EMPTY_PROFILE);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("register");
  const [languageCode, setLanguageCode] = useState("ru");
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
        const normalized = {
          nickname: user.username || storedProfile.nickname || "",
          email: user.email || storedProfile.email || "",
          avatarData: user.avatarData || storedProfile.avatarData || "",
          avatarPosX: Number.isFinite(user.avatarPosX) ? user.avatarPosX : storedProfile.avatarPosX || 50,
          avatarPosY: Number.isFinite(user.avatarPosY) ? user.avatarPosY : storedProfile.avatarPosY || 50,
          balance: Number.isFinite(storedProfile.balance) ? storedProfile.balance : 0
        };
        setIsAuthorized(true);
        setUserProfile(normalized);
        persistProfile(normalized);
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
    setIsAuthorized(false);
    setUserProfile(EMPTY_PROFILE);
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    setIsProfileOpen(false);
  };

  const handleAuthSuccess = (authData) => {
    const storedProfile = readStoredProfile();
    const normalized = {
      nickname: authData.username || storedProfile.nickname || "",
      email: authData.email || storedProfile.email || "",
      avatarData: authData.avatarData || storedProfile.avatarData || "",
      avatarPosX: Number.isFinite(authData.avatarPosX) ? authData.avatarPosX : storedProfile.avatarPosX || 50,
      avatarPosY: Number.isFinite(authData.avatarPosY) ? authData.avatarPosY : storedProfile.avatarPosY || 50,
      balance: Number.isFinite(storedProfile.balance) ? storedProfile.balance : 0
    };
    setIsAuthorized(true);
    setUserProfile(normalized);
    persistProfile(normalized);
  };

  const handleProfileSave = async (payload) => {
    const updated = await updateProfile(payload);
    const normalized = {
      nickname: updated.username || "",
      email: updated.email || "",
      avatarData: updated.avatarData || "",
      avatarPosX: Number.isFinite(updated.avatarPosX) ? updated.avatarPosX : 50,
      avatarPosY: Number.isFinite(updated.avatarPosY) ? updated.avatarPosY : 50,
      balance: Number.isFinite(userProfile.balance) ? userProfile.balance : 0
    };
    setUserProfile(normalized);
    persistProfile(normalized);
    return normalized;
  };

  const handleTopUpBalance = (amount) => {
    setUserProfile((prev) => {
      const next = {
        ...prev,
        balance: (Number.isFinite(prev.balance) ? prev.balance : 0) + amount
      };
      persistProfile(next);
      return next;
    });
  };

  const handleLanguageChange = (nextLanguageCode) => {
    setLanguageCode(nextLanguageCode);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguageCode);
  };

  const translations = TRANSLATIONS[languageCode] || TRANSLATIONS.ru;
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
        onSaveProfile={handleProfileSave}
        onTopUpBalance={handleTopUpBalance}
        translations={translations}
      />
    </div>
  );
}
