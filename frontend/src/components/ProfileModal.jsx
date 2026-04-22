import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "../api";

const CLOSE_ANIMATION_MS = 240;

const DEFAULT_PROFILE = {
  nickname: "",
  email: "",
  avatarData: "",
  avatarPosX: 50,
  avatarPosY: 50,
  newPassword: "",
  repeatPassword: ""
};

function normalizeProfile(profile) {
  return {
    nickname: profile?.nickname || "",
    email: profile?.email || "",
    avatarData: profile?.avatarData || "",
    avatarPosX: Number.isFinite(profile?.avatarPosX) ? profile.avatarPosX : 50,
    avatarPosY: Number.isFinite(profile?.avatarPosY) ? profile.avatarPosY : 50,
    newPassword: "",
    repeatPassword: ""
  };
}

function applyMask(template, digits, placeholder = "*") {
  let index = 0;
  return template.replace(new RegExp(`\\${placeholder}`, "g"), () => {
    const char = digits[index];
    index += 1;
    return char ?? placeholder;
  });
}

export default function ProfileModal({ isOpen, onClose, userProfile, onSaveProfile, onTopUpBalance, translations }) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const [profileDraft, setProfileDraft] = useState(DEFAULT_PROFILE);
  const [initialProfile, setInitialProfile] = useState(DEFAULT_PROFILE);
  const [editStartProfile, setEditStartProfile] = useState(DEFAULT_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [topUpForm, setTopUpForm] = useState({
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvc: "",
    amount: ""
  });
  const fileInputRef = useRef(null);
  const dragStateRef = useRef(null);

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
    if (!isOpen) return;
    const normalized = normalizeProfile(userProfile);
    setInitialProfile(normalized);
    setProfileDraft(normalized);
    setEditStartProfile(normalized);
    setPasswordTouched(false);
    setActiveSection("profile");
    setTopUpForm({ cardNumber: "", cardName: "", cardExpiry: "", cardCvc: "", amount: "" });
    setError("");
  }, [isOpen, userProfile]);

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

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!dragStateRef.current) return;
      event.preventDefault();
      const { startX, startY, startPosX, startPosY, rect } = dragStateRef.current;
      const deltaX = ((event.clientX - startX) / rect.width) * 100;
      const deltaY = ((event.clientY - startY) / rect.height) * 100;
      const nextX = Math.max(0, Math.min(100, startPosX - deltaX));
      const nextY = Math.max(0, Math.min(100, startPosY + deltaY));
      setProfileDraft((prev) => ({ ...prev, avatarPosX: nextX, avatarPosY: nextY }));
    };

    const handlePointerUp = () => {
      const dragState = dragStateRef.current;
      if (dragState?.element && dragState.pointerId !== undefined) {
        if (dragState.element.hasPointerCapture?.(dragState.pointerId)) {
          dragState.element.releasePointerCapture(dragState.pointerId);
        }
      }
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, []);

  if (!shouldRender) return null;
  const isEditing = activeSection === "edit";
  const isBalanceMode = activeSection === "balance";

  const hasBaseChanges =
    profileDraft.nickname.trim() !== initialProfile.nickname.trim() ||
    profileDraft.email.trim() !== initialProfile.email.trim() ||
    profileDraft.avatarData !== initialProfile.avatarData ||
    Math.abs(profileDraft.avatarPosX - initialProfile.avatarPosX) > 0.001 ||
    Math.abs(profileDraft.avatarPosY - initialProfile.avatarPosY) > 0.001;

  const hasPasswordInput = profileDraft.newPassword !== "" || profileDraft.repeatPassword !== "";
  const passwordConfirmed =
    profileDraft.newPassword !== "" && profileDraft.newPassword === profileDraft.repeatPassword;
  const hasAnyChange = hasBaseChanges || (passwordTouched && hasPasswordInput);

  const canSave =
    !isSaving &&
    profileDraft.nickname.trim() !== "" &&
    hasAnyChange &&
    (!passwordTouched || passwordConfirmed);

  const handleStartEdit = async () => {
    const nextFromUser = normalizeProfile({
      nickname: userProfile?.nickname || profileDraft.nickname,
      email: userProfile?.email || profileDraft.email,
      avatarData: profileDraft.avatarData,
      avatarPosX: profileDraft.avatarPosX,
      avatarPosY: profileDraft.avatarPosY
    });

    setEditStartProfile(nextFromUser);
    setPasswordTouched(false);
    setProfileDraft({ ...nextFromUser, newPassword: "", repeatPassword: "" });
    setActiveSection("edit");
    if (nextFromUser.email.trim() !== "") return;
    try {
      const user = await getCurrentUser();
      const fetchedEmail = user?.email || "";
      if (!fetchedEmail) return;
      setInitialProfile((prev) => ({ ...prev, email: fetchedEmail }));
      setEditStartProfile((prev) => ({ ...prev, email: fetchedEmail }));
      setProfileDraft((prev) => ({ ...prev, email: fetchedEmail }));
    } catch {
      // keep current draft if request fails
    }
  };

  const handleOpenProfileView = () => {
    setProfileDraft({ ...editStartProfile, newPassword: "", repeatPassword: "" });
    setPasswordTouched(false);
    setTopUpForm({ cardNumber: "", cardName: "", cardExpiry: "", cardCvc: "", amount: "" });
    setError("");
    setActiveSection("profile");
  };

  const handleOpenTopUp = () => {
    setActiveSection("balance");
    setError("");
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;
    if (name === "newPassword" || name === "repeatPassword") {
      setPasswordTouched(true);
    }
    setProfileDraft((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleAvatarSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      setProfileDraft((prev) => ({ ...prev, avatarData: value, avatarPosX: 50, avatarPosY: 50 }));
      setError("");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setProfileDraft((prev) => ({
      ...prev,
      avatarData: "",
      avatarPosX: 50,
      avatarPosY: 50
    }));
    setError("");
  };

  const handleAvatarPointerDown = (event) => {
    if (!isEditing || !profileDraft.avatarData) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startPosX: profileDraft.avatarPosX,
      startPosY: profileDraft.avatarPosY,
      rect,
      pointerId: event.pointerId,
      element: event.currentTarget
    };
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError("");
    try {
      const updated = await onSaveProfile({
        nickname: profileDraft.nickname.trim(),
        email: profileDraft.email.trim() || initialProfile.email.trim(),
        newPassword: profileDraft.newPassword.trim(),
        avatarData: profileDraft.avatarData || "",
        avatarPosX: profileDraft.avatarPosX,
        avatarPosY: profileDraft.avatarPosY
      });
      const normalized = normalizeProfile({
        nickname: updated?.nickname ?? profileDraft.nickname,
        email: updated?.email ?? profileDraft.email,
        avatarData: updated?.avatarData ?? profileDraft.avatarData,
        avatarPosX: updated?.avatarPosX ?? profileDraft.avatarPosX,
        avatarPosY: updated?.avatarPosY ?? profileDraft.avatarPosY
      });
      setInitialProfile(normalized);
      setEditStartProfile(normalized);
      setProfileDraft(normalized);
      setPasswordTouched(false);
      setActiveSection("profile");
    } catch (saveError) {
      setError(saveError.message || "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileDraft({ ...editStartProfile, newPassword: "", repeatPassword: "" });
    setPasswordTouched(false);
    setError("");
    setActiveSection("profile");
  };

  const handleTopUpChange = (fieldName, rawValue) => {
    setTopUpForm((prev) => {
      if (fieldName === "cardNumber") {
        return { ...prev, cardNumber: rawValue.replace(/\D/g, "").slice(0, 16) };
      }
      if (fieldName === "cardName") {
        return { ...prev, cardName: rawValue.toUpperCase().replace(/[^A-ZА-ЯЁ\s]/g, "") };
      }
      if (fieldName === "cardExpiry") {
        return { ...prev, cardExpiry: rawValue.replace(/\D/g, "").slice(0, 4) };
      }
      if (fieldName === "cardCvc") {
        return { ...prev, cardCvc: rawValue.replace(/\D/g, "").slice(0, 3) };
      }
      return { ...prev, amount: rawValue.replace(/\D/g, "") };
    });
  };

  const handleTopUpCancel = () => {
    setTopUpForm({ cardNumber: "", cardName: "", cardExpiry: "", cardCvc: "", amount: "" });
  };

  const handleTopUpSubmit = () => {
    if (!isTopUpReady) return;
    const amountValue = Number.parseInt(topUpForm.amount, 10);
    onTopUpBalance?.(amountValue);
    setTopUpForm({ cardNumber: "", cardName: "", cardExpiry: "", cardCvc: "", amount: "" });
    setActiveSection("profile");
  };

  const avatarStyle = profileDraft.avatarData
    ? {
        backgroundImage: `url("${profileDraft.avatarData}")`,
        backgroundPosition: `${profileDraft.avatarPosX}% ${profileDraft.avatarPosY}%`
      }
    : undefined;
  const currentBalance = Number.isFinite(userProfile?.balance) ? userProfile.balance : 0;
  const cardNumberMasked = applyMask("**** **** **** ****", topUpForm.cardNumber);
  const cardExpiryMasked = applyMask("** / **", topUpForm.cardExpiry);
  const cardCvcMasked = applyMask("***", topUpForm.cardCvc);
  const isTopUpReady =
    topUpForm.cardNumber.length === 16 &&
    topUpForm.cardName.trim() !== "" &&
    topUpForm.cardExpiry.length === 4 &&
    topUpForm.cardCvc.length === 3 &&
    topUpForm.amount.length > 0;

  const profileMenuButtons = [
    { key: "profile", label: translations.modal.profile.profileTab, onClick: handleOpenProfileView },
    { key: "edit", label: translations.modal.profile.action1, onClick: handleStartEdit },
    { key: "balance", label: translations.modal.profile.topUpBalance, onClick: handleOpenTopUp },
    { key: "history", label: translations.modal.profile.action2 },
    { key: "support", label: translations.modal.profile.action3 },
    { key: "reviews", label: translations.modal.profile.reviews }
  ];

  return (
    <div className={`modal-overlay ${isClosing ? "is-closing" : ""}`} role="presentation" onClick={onClose}>
      <section
        className={`modal profile-modal ${isClosing ? "is-closing" : ""}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal__close" type="button" onClick={onClose} aria-label="Close">
          <img src="/assets/auth-close.svg" alt="" />
        </button>
        <h2>{translations.modal.profile.title}</h2>

        <div className="profile-modal__body" style={{ "--profile-menu-count": profileMenuButtons.length }}>
          <div className="profile-modal__right">
            {profileMenuButtons.map((item) => (
              <button key={item.key} type="button" onClick={item.onClick}>
                {item.label}
              </button>
            ))}
          </div>

          <div className={`profile-modal__left ${isEditing ? "is-editing" : "is-view"}`}>
            <button
              type="button"
              className={`profile-modal__avatar-placeholder ${profileDraft.avatarData ? "has-image" : ""} ${isEditing ? "is-editing" : ""}`}
              onPointerDown={handleAvatarPointerDown}
              onClick={() => isEditing && fileInputRef.current?.click()}
              style={avatarStyle}
            />
            {isEditing && (
              <div className="profile-modal__avatar-tools">
                <p className="profile-modal__hint">{translations.modal.profile.uploadHint}</p>
                <button
                  type="button"
                  className="profile-modal__avatar-delete"
                  onClick={handleRemoveAvatar}
                  disabled={!profileDraft.avatarData}
                  aria-label={translations.modal.profile.deleteAvatar}
                >
                  <img src="/assets/auth-delete.svg" alt="" />
                </button>
              </div>
            )}
            <p className="profile-modal__nickname">{profileDraft.nickname || "-"}</p>
            <p className="profile-modal__email">{profileDraft.email || "-"}</p>
            <p className="profile-modal__balance">
              {translations.modal.profile.balanceLabel} ${currentBalance}
            </p>
            {isEditing && (
              <div className="profile-modal__left-form">
                <input
                  type="text"
                  name="nickname"
                  placeholder={translations.modal.profile.nicknameField}
                  value={profileDraft.nickname}
                  autoComplete="off"
                  onChange={handleDraftChange}
                />
                <input
                  type="email"
                  name="email"
                  placeholder={translations.modal.profile.emailField}
                  value={profileDraft.email}
                  autoComplete="off"
                  onChange={handleDraftChange}
                />
                <input
                  type="password"
                  name="newPassword"
                  placeholder={translations.modal.profile.passwordField}
                  value={profileDraft.newPassword}
                  autoComplete="new-password"
                  onChange={handleDraftChange}
                />
                <input
                  type="password"
                  name="repeatPassword"
                  placeholder={translations.modal.profile.repeatPasswordField}
                  value={profileDraft.repeatPassword}
                  autoComplete="new-password"
                  onChange={handleDraftChange}
                />
                <div className="profile-modal__actions">
                  <button type="button" onClick={handleSave} disabled={!canSave}>
                    {translations.modal.profile.save}
                  </button>
                  <button type="button" onClick={handleCancel}>
                    {translations.modal.profile.cancel}
                  </button>
                </div>
              </div>
            )}
            {isBalanceMode && (
              <div className="profile-modal__left-form">
                <p className="profile-modal__topup-warning">{translations.modal.profile.topUpWarning}</p>
                <input
                  type="text"
                  value={cardNumberMasked}
                  onChange={(event) => handleTopUpChange("cardNumber", event.target.value)}
                  inputMode="numeric"
                  placeholder={translations.modal.profile.cardNumberLabel}
                  aria-label={translations.modal.profile.cardNumberLabel}
                />
                <input
                  type="text"
                  value={topUpForm.cardName}
                  onChange={(event) => handleTopUpChange("cardName", event.target.value)}
                  placeholder={translations.modal.profile.cardNameLabel}
                  aria-label={translations.modal.profile.cardNameLabel}
                />
                <input
                  type="text"
                  value={cardExpiryMasked}
                  onChange={(event) => handleTopUpChange("cardExpiry", event.target.value)}
                  inputMode="numeric"
                  placeholder={translations.modal.profile.cardExpiryLabel}
                  aria-label={translations.modal.profile.cardExpiryLabel}
                />
                <input
                  type="text"
                  value={cardCvcMasked}
                  onChange={(event) => handleTopUpChange("cardCvc", event.target.value)}
                  inputMode="numeric"
                  placeholder={translations.modal.profile.cardCvcLabel}
                  aria-label={translations.modal.profile.cardCvcLabel}
                />
                <p className="profile-modal__amount-label">{translations.modal.profile.amountLabel}</p>
                <input
                  type="text"
                  value={topUpForm.amount}
                  onChange={(event) => handleTopUpChange("amount", event.target.value)}
                  inputMode="numeric"
                  aria-label={translations.modal.profile.amountLabel}
                />
                <div className="profile-modal__actions">
                  <button type="button" onClick={handleTopUpSubmit} disabled={!isTopUpReady}>
                    {translations.modal.profile.pay}
                  </button>
                  <button type="button" onClick={handleTopUpCancel}>
                    {translations.modal.profile.cancel}
                  </button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              className="profile-modal__file-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarSelect}
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
      </section>
    </div>
  );
}
