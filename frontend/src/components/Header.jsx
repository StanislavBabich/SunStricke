import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "../data/i18n";

export default function Header({
  isAuthorized,
  username,
  isCheckingSession,
  languageCode,
  translations,
  onLanguageChange,
  onOpenRegister,
  onOpenLogin,
  onLogout,
  onOpenProfile
}) {
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!langRef.current || langRef.current.contains(event.target)) {
        return;
      }
      setIsLangOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedLanguage = LANGUAGES.find((lang) => lang.code === languageCode) || LANGUAGES[0];

  const handleLanguageSelect = (nextLanguageCode) => {
    onLanguageChange(nextLanguageCode);
    setIsLangOpen(false);
  };

  return (
    <header className="header">
      <div className="header__inner">
        <div className="language-switcher" ref={langRef}>
          <button
            className="language-switcher__button"
            type="button"
            onClick={() => setIsLangOpen((prev) => !prev)}
            aria-label={translations.header.languageAria}
          >
            <img src={selectedLanguage.flag} alt={selectedLanguage.name} />
            <span>{selectedLanguage.headerLabel}</span>
          </button>
          {isLangOpen && (
            <div className="language-switcher__menu">
              {LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  className="language-switcher__option"
                  onClick={() => handleLanguageSelect(language.code)}
                >
                  <img src={language.flag} alt={language.name} />
                  <span>{language.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <a className="brand" href="/">
          <img className="brand__logo" src="/assets/logo.svg" alt="SunStrike logo" />
          <span className="brand__name">SunStrike</span>
        </a>

        <div className="header__auth-group">
          {isCheckingSession && <span className="header__user">{translations.header.checkingSession}</span>}
          {isAuthorized ? (
            <>
              <button
                className="auth-toggle auth-toggle--icon"
                type="button"
                onClick={onLogout}
                aria-label={translations.header.logoutButton}
              >
                <img src="/assets/auth-logout.svg" alt={translations.header.logoutButton} />
              </button>
              <span className="header__user">
                {translations.header.loggedInAs} {username}
              </span>
              <button
                className="auth-toggle auth-toggle--icon"
                type="button"
                onClick={onOpenProfile}
                aria-label={translations.header.profileButton}
              >
                <img src="/assets/auth-profile.svg" alt={translations.header.profileButton} />
              </button>
            </>
          ) : (
            <>
              <button
                className="auth-toggle auth-toggle--icon"
                type="button"
                onClick={onOpenLogin}
                aria-label={translations.header.loginButton}
              >
                <img src="/assets/auth-login.svg" alt={translations.header.loginButton} />
              </button>
              <button
                className="auth-toggle"
                type="button"
                onClick={onOpenRegister}
                aria-label={translations.header.registerButton}
              >
                {translations.header.registerButton}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
