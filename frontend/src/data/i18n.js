export const LANGUAGE_STORAGE_KEY = "sunstrike_language";

export const LANGUAGES = [
  { code: "ru", name: "Русский", headerLabel: "Язык", flag: "/assets/flag-ru.png" },
  { code: "de", name: "Deutsch", headerLabel: "Sprache", flag: "/assets/flag-de.jpg" },
  { code: "zh", name: "中文", headerLabel: "语言", flag: "/assets/flag-zh.png" },
  { code: "en", name: "English", headerLabel: "Language", flag: "/assets/flag-en.webp" },
  { code: "fr", name: "Francais", headerLabel: "Langue", flag: "/assets/flag-fr.jpeg" }
];

export const TRANSLATIONS = {
  ru: {
    header: {
      languageAria: "Выбор языка",
      loggedInAs: "Вы вошли как:",
      checkingSession: "Проверка сессии...",
      registerButton: "Регистрация",
      loginButton: "Войти",
      logoutButton: "Выйти",
      profileButton: "Профиль"
    },
    footer: {
      copyright: "® SunStrike, 2026. Все права защищены.",
      founded: "Компания основана в 1994 году.",
      follow: "Следите за нами тут",
      buttonAriaPrefix: "Футер-кнопка"
    },
    modal: {
      titleRegister: "Регистрация в SunStrike",
      titleLogin: "Вход в SunStrike",
      subtitleRegister: "Выберите удобный способ регистрации",
      subtitleLogin: "Введите данные существующего аккаунта",
      tabRegister: "Регистрация",
      tabLogin: "Вход",
      nicknamePlaceholder: "Никнейм",
      emailPlaceholder: "Почта",
      passwordPlaceholder: "Пароль",
      repeatPasswordPlaceholder: "Повтор пароля",
      fillAllFields: "Заполните все поля.",
      passwordMismatch: "Пароли не совпадают.",
      stubButtonMessage: "Эта кнопка пока является заглушкой.",
      submitLoading: "Отправка...",
      submitRegister: "Зарегистрироваться",
      submitLogin: "Войти",
      back: "Назад",
      serviceButtons: {
        google: "Авторизироваться с помощью Google",
        facebook: "Авторизироваться с помощью Facebook",
        vk: "Авторизироваться с помощью ВКонтакте",
        telegram: "Авторизироваться с помощью Telegram"
      },
      profile: {
        title: "Профиль пользователя",
        profileTab: "Профиль",
        nicknameLabel: "Никнейм",
        action1: "Редактировать профиль",
        action2: "История заявок",
        action3: "Служба поддержки",
        topUpBalance: "Пополнить баланс",
        close: "Закрыть",
        uploadHint: "Нажмите, чтобы выбрать изображение",
        nicknameField: "Никнейм",
        emailField: "Почта",
        passwordField: "Пароль",
        repeatPasswordField: "Повторить пароль",
        save: "Сохранить",
        cancel: "Отмена",
        reviews: "Ваши отзывы",
        deleteAvatar: "Удалить аватар",
        balanceLabel: "Ваш баланс:",
        topUpWarning:
          "Проэкт создан ради забавы! Убедительная просьба НЕ ВВОДИТЕ РЕАЛЬНЫЕ ДАННЫЕ ВАШЕЙ БАНКОВСКОЙ КАРТЫ!!!",
        cardNumberLabel: "Номер карты",
        cardNameLabel: "Имя с карты",
        cardExpiryLabel: "Срок карты",
        cardCvcLabel: "Код с оборота",
        amountLabel: "Сумма $:",
        pay: "Оплатить"
      }
    }
  },
  de: {
    header: {
      languageAria: "Sprache auswahlen",
      loggedInAs: "Angemeldet als:",
      checkingSession: "Sitzung wird gepruft...",
      registerButton: "Registrieren",
      loginButton: "Anmelden",
      logoutButton: "Abmelden",
      profileButton: "Profil"
    },
    footer: {
      copyright: "® SunStrike, 2026. Alle Rechte vorbehalten.",
      founded: "Unternehmen gegrundet im Jahr 1994.",
      follow: "Folgen Sie uns hier",
      buttonAriaPrefix: "Footer-Schaltflache"
    },
    modal: {
      titleRegister: "Registrierung bei SunStrike",
      titleLogin: "Anmeldung bei SunStrike",
      subtitleRegister: "Wahlen Sie eine bequeme Registrierungsart",
      subtitleLogin: "Geben Sie die Daten Ihres Kontos ein",
      tabRegister: "Registrierung",
      tabLogin: "Anmeldung",
      nicknamePlaceholder: "Spitzname",
      emailPlaceholder: "E-Mail",
      passwordPlaceholder: "Passwort",
      repeatPasswordPlaceholder: "Passwort wiederholen",
      fillAllFields: "Bitte alle Felder ausfullen.",
      passwordMismatch: "Passworter stimmen nicht uberein.",
      stubButtonMessage: "Diese Schaltflache ist derzeit ein Platzhalter.",
      submitLoading: "Senden...",
      submitRegister: "Registrieren",
      submitLogin: "Anmelden",
      back: "Zuruck",
      serviceButtons: {
        google: "Mit Google anmelden",
        facebook: "Mit Facebook anmelden",
        vk: "Mit VK anmelden",
        telegram: "Mit Telegram anmelden"
      },
      profile: {
        title: "Benutzerprofil",
        profileTab: "Profil",
        nicknameLabel: "Spitzname",
        action1: "Profil bearbeiten",
        action2: "Anfragenverlauf",
        action3: "Support",
        topUpBalance: "Guthaben aufladen",
        close: "Schliessen",
        uploadHint: "Klicken Sie, um ein Bild auszuwahlen",
        nicknameField: "Spitzname",
        emailField: "E-Mail",
        passwordField: "Passwort",
        repeatPasswordField: "Passwort wiederholen",
        save: "Speichern",
        cancel: "Abbrechen",
        reviews: "Ihre Bewertungen",
        deleteAvatar: "Avatar entfernen",
        balanceLabel: "Ihr Kontostand:",
        topUpWarning: "Dieses Projekt ist nur zum Spass! Bitte KEINE echten Kartendaten eingeben!!!",
        cardNumberLabel: "Kartennummer",
        cardNameLabel: "Name auf der Karte",
        cardExpiryLabel: "Gultig bis",
        cardCvcLabel: "CVC",
        amountLabel: "Betrag $:",
        pay: "Bezahlen"
      }
    }
  },
  zh: {
    header: {
      languageAria: "选择语言",
      loggedInAs: "您已登录为：",
      checkingSession: "正在检查会话...",
      registerButton: "注册",
      loginButton: "登录",
      logoutButton: "退出",
      profileButton: "个人资料"
    },
    footer: {
      copyright: "® SunStrike，2026。保留所有权利。",
      founded: "公司成立于 1994 年。",
      follow: "在这里关注我们",
      buttonAriaPrefix: "页脚按钮"
    },
    modal: {
      titleRegister: "注册 SunStrike",
      titleLogin: "登录 SunStrike",
      subtitleRegister: "请选择方便的注册方式",
      subtitleLogin: "请输入您已有账号的信息",
      tabRegister: "注册",
      tabLogin: "登录",
      nicknamePlaceholder: "昵称",
      emailPlaceholder: "电子邮箱",
      passwordPlaceholder: "密码",
      repeatPasswordPlaceholder: "重复密码",
      fillAllFields: "请填写所有字段。",
      passwordMismatch: "两次密码不一致。",
      stubButtonMessage: "该按钮目前为占位功能。",
      submitLoading: "提交中...",
      submitRegister: "注册",
      submitLogin: "登录",
      back: "返回",
      serviceButtons: {
        google: "使用 Google 登录",
        facebook: "使用 Facebook 登录",
        vk: "使用 VK 登录",
        telegram: "使用 Telegram 登录"
      },
      profile: {
        title: "用户资料",
        profileTab: "资料",
        nicknameLabel: "昵称",
        action1: "编辑资料",
        action2: "申请记录",
        action3: "客服支持",
        topUpBalance: "充值余额",
        close: "关闭",
        uploadHint: "点击选择图片",
        nicknameField: "昵称",
        emailField: "邮箱",
        passwordField: "密码",
        repeatPasswordField: "重复密码",
        save: "保存",
        cancel: "取消",
        reviews: "您的评价",
        deleteAvatar: "删除头像",
        balanceLabel: "您的余额：",
        topUpWarning: "本项目仅为娱乐！请不要输入真实银行卡信息！！！",
        cardNumberLabel: "卡号",
        cardNameLabel: "持卡人姓名",
        cardExpiryLabel: "有效期",
        cardCvcLabel: "安全码",
        amountLabel: "金额 $：",
        pay: "支付"
      }
    }
  },
  en: {
    header: {
      languageAria: "Choose language",
      loggedInAs: "Signed in as:",
      checkingSession: "Checking session...",
      registerButton: "Register",
      loginButton: "Sign in",
      logoutButton: "Sign out",
      profileButton: "Profile"
    },
    footer: {
      copyright: "® SunStrike, 2026. All rights reserved.",
      founded: "Company founded in 1994.",
      follow: "Follow us here",
      buttonAriaPrefix: "Footer button"
    },
    modal: {
      titleRegister: "Register in SunStrike",
      titleLogin: "Sign in to SunStrike",
      subtitleRegister: "Choose a convenient registration method",
      subtitleLogin: "Enter your existing account credentials",
      tabRegister: "Register",
      tabLogin: "Sign in",
      nicknamePlaceholder: "Nickname",
      emailPlaceholder: "Email",
      passwordPlaceholder: "Password",
      repeatPasswordPlaceholder: "Repeat password",
      fillAllFields: "Please fill in all fields.",
      passwordMismatch: "Passwords do not match.",
      stubButtonMessage: "This button is currently a placeholder.",
      submitLoading: "Submitting...",
      submitRegister: "Register",
      submitLogin: "Sign in",
      back: "Back",
      serviceButtons: {
        google: "Sign in with Google",
        facebook: "Sign in with Facebook",
        vk: "Sign in with VK",
        telegram: "Sign in with Telegram"
      },
      profile: {
        title: "User Profile",
        profileTab: "Profile",
        nicknameLabel: "Nickname",
        action1: "Edit profile",
        action2: "Request history",
        action3: "Support",
        topUpBalance: "Top up balance",
        close: "Close",
        uploadHint: "Click to choose an image",
        nicknameField: "Nickname",
        emailField: "Email",
        passwordField: "Password",
        repeatPasswordField: "Repeat password",
        save: "Save",
        cancel: "Cancel",
        reviews: "Your reviews",
        deleteAvatar: "Delete avatar",
        balanceLabel: "Your balance:",
        topUpWarning: "This project is made for fun! Please DO NOT ENTER real bank card data!!!",
        cardNumberLabel: "Card number",
        cardNameLabel: "Cardholder name",
        cardExpiryLabel: "Expiry",
        cardCvcLabel: "CVC",
        amountLabel: "Amount $:",
        pay: "Pay"
      }
    }
  },
  fr: {
    header: {
      languageAria: "Choisir la langue",
      loggedInAs: "Connecte en tant que :",
      checkingSession: "Verification de la session...",
      registerButton: "S'inscrire",
      loginButton: "Se connecter",
      logoutButton: "Se deconnecter",
      profileButton: "Profil"
    },
    footer: {
      copyright: "® SunStrike, 2026. Tous droits reserves.",
      founded: "Entreprise fondee en 1994.",
      follow: "Suivez-nous ici",
      buttonAriaPrefix: "Bouton du pied de page"
    },
    modal: {
      titleRegister: "Inscription a SunStrike",
      titleLogin: "Connexion a SunStrike",
      subtitleRegister: "Choisissez une methode d'inscription pratique",
      subtitleLogin: "Entrez les donnees de votre compte existant",
      tabRegister: "Inscription",
      tabLogin: "Connexion",
      nicknamePlaceholder: "Pseudo",
      emailPlaceholder: "E-mail",
      passwordPlaceholder: "Mot de passe",
      repeatPasswordPlaceholder: "Repeter le mot de passe",
      fillAllFields: "Veuillez remplir tous les champs.",
      passwordMismatch: "Les mots de passe ne correspondent pas.",
      stubButtonMessage: "Ce bouton est actuellement un espace reserve.",
      submitLoading: "Envoi...",
      submitRegister: "S'inscrire",
      submitLogin: "Se connecter",
      back: "Retour",
      serviceButtons: {
        google: "Se connecter avec Google",
        facebook: "Se connecter avec Facebook",
        vk: "Se connecter avec VK",
        telegram: "Se connecter avec Telegram"
      },
      profile: {
        title: "Profil utilisateur",
        profileTab: "Profil",
        nicknameLabel: "Pseudo",
        action1: "Modifier le profil",
        action2: "Historique des demandes",
        action3: "Support",
        topUpBalance: "Recharger le solde",
        close: "Fermer",
        uploadHint: "Cliquez pour choisir une image",
        nicknameField: "Pseudo",
        emailField: "E-mail",
        passwordField: "Mot de passe",
        repeatPasswordField: "Repeter le mot de passe",
        save: "Enregistrer",
        cancel: "Annuler",
        reviews: "Vos avis",
        deleteAvatar: "Supprimer l'avatar",
        balanceLabel: "Votre solde :",
        topUpWarning:
          "Ce projet est cree pour s'amuser ! Merci de NE PAS SAISIR vos vraies donnees bancaires !!!",
        cardNumberLabel: "Numero de carte",
        cardNameLabel: "Nom sur la carte",
        cardExpiryLabel: "Expiration",
        cardCvcLabel: "CVC",
        amountLabel: "Montant $ :",
        pay: "Payer"
      }
    }
  }
};
