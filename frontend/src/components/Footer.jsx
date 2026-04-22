const footerButtons = [
  "/assets/footer-1.svg",
  "/assets/footer-2.svg",
  "/assets/footer-3.svg",
  "/assets/footer-4.svg",
  "/assets/footer-5.svg"
];

export default function Footer({ translations, footerRef, isFooterVisible, isFooterIntroActive }) {
  const footerStateClass = isFooterIntroActive
    ? "footer--intro"
    : isFooterVisible
      ? "footer--visible"
      : "footer--hidden";

  return (
    <footer ref={footerRef} className={`footer ${footerStateClass}`}>
      <div className="footer__inner">
        <div>
          <p>{translations.footer.copyright}</p>
          <p>{translations.footer.founded}</p>
        </div>
        <div className="footer__social">
          <p className="footer__follow">{translations.footer.follow}</p>
          <div className="footer__buttons">
            {footerButtons.map((iconPath, index) => (
              <button
                key={iconPath}
                type="button"
                aria-label={`${translations.footer.buttonAriaPrefix} ${index + 1}`}
              >
                <img src={iconPath} alt="" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
