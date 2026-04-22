import { useEffect, useState } from "react";
import { loginUser, registerUser } from "../api";

const CLOSE_ANIMATION_MS = 240;

export default function RegisterModal({
  isOpen,
  initialMode,
  onClose,
  onAuthSuccess,
  translations
}) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [formState, setFormState] = useState({
    nickname: "",
    email: "",
    password: "",
    repeatPassword: ""
  });
  const [mode, setMode] = useState("register");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return undefined;
    }
    if (!shouldRender) return undefined;

    setIsClosing(true);
    const closeTimer = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
    }, CLOSE_ANIMATION_MS);
    return () => clearTimeout(closeTimer);
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || "register");
      setError("");
    }
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const serviceButtons = [
    { id: "google", label: translations.modal.serviceButtons.google, icon: "/assets/auth-google.svg" },
    { id: "facebook", label: translations.modal.serviceButtons.facebook, icon: "/assets/auth-facebook.svg" },
    { id: "vk", label: translations.modal.serviceButtons.vk, icon: "/assets/auth-vk.svg" },
    { id: "telegram", label: translations.modal.serviceButtons.telegram, icon: "/assets/auth-telegram.svg" }
  ];

  const handleStubClick = () => {
    setError(translations.modal.stubButtonMessage);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formState.password || !formState.email || (mode === "register" && !formState.nickname)) {
      setError(translations.modal.fillAllFields);
      return;
    }

    if (mode === "register" && formState.password !== formState.repeatPassword) {
      setError(translations.modal.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "register") {
        const data = await registerUser(formState.nickname, formState.email, formState.password);
        onAuthSuccess({
          ...data,
          email: data.email || formState.email,
          username: data.username || formState.nickname
        });
      } else {
        const data = await loginUser(formState.email, formState.password);
        onAuthSuccess({
          ...data,
          email: data.email || formState.email
        });
      }
      setFormState({ nickname: "", email: "", password: "", repeatPassword: "" });
      setError("");
      onClose();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isClosing ? "is-closing" : ""}`} role="presentation" onClick={onClose}>
      <section
        className={`modal ${isClosing ? "is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal__close" type="button" onClick={onClose} aria-label="Close">
          <img src="/assets/auth-close.svg" alt="" />
        </button>
        <h2>{mode === "register" ? translations.modal.titleRegister : translations.modal.titleLogin}</h2>
        <p className="modal-subtitle">
          {mode === "register"
            ? translations.modal.subtitleRegister
            : translations.modal.subtitleLogin}
        </p>

        <div className="service-buttons">
          {serviceButtons.map((service) => (
            <button
              key={service.id}
              type="button"
              className="service-btn"
              onClick={handleStubClick}
            >
              <img src={service.icon} alt={service.label} />
              <span>{service.label}</span>
            </button>
          ))}
        </div>

        <form className="manual-form" onSubmit={handleSubmit} autoComplete={mode === "login" ? "on" : "off"}>
          {mode === "register" && (
            <input
              type="text"
              name="nickname"
              placeholder={translations.modal.nicknamePlaceholder}
              value={formState.nickname}
              autoComplete="off"
              onChange={handleChange}
            />
          )}
          <input
            type="email"
            name="email"
            placeholder={translations.modal.emailPlaceholder}
            value={formState.email}
            autoComplete={mode === "login" ? "email" : "off"}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder={translations.modal.passwordPlaceholder}
            value={formState.password}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            onChange={handleChange}
          />
          {mode === "register" && (
            <input
              type="password"
              name="repeatPassword"
              placeholder={translations.modal.repeatPasswordPlaceholder}
              value={formState.repeatPassword}
              autoComplete="new-password"
              onChange={handleChange}
            />
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="manual-form__actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? translations.modal.submitLoading
                : mode === "register"
                  ? translations.modal.submitRegister
                  : translations.modal.submitLogin}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
