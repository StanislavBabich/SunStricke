package server

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
	_ "modernc.org/sqlite"
)

type registerRequest struct {
	Login    string `json:"login"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type messageResponse struct {
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

type authResponse struct {
	Message    string  `json:"message"`
	Token      string  `json:"token,omitempty"`
	Username   string  `json:"username,omitempty"`
	Email      string  `json:"email,omitempty"`
	AvatarData string  `json:"avatarData,omitempty"`
	AvatarPosX float64 `json:"avatarPosX,omitempty"`
	AvatarPosY float64 `json:"avatarPosY,omitempty"`
}

type userResponse struct {
	Username   string  `json:"username"`
	Email      string  `json:"email"`
	AvatarData string  `json:"avatarData,omitempty"`
	AvatarPosX float64 `json:"avatarPosX,omitempty"`
	AvatarPosY float64 `json:"avatarPosY,omitempty"`
}

type profileUpdateRequest struct {
	Nickname    string  `json:"nickname"`
	Email       string  `json:"email"`
	NewPassword string  `json:"newPassword"`
	AvatarData  string  `json:"avatarData"`
	AvatarPosX  float64 `json:"avatarPosX"`
	AvatarPosY  float64 `json:"avatarPosY"`
}

type app struct {
	db          *sql.DB
	usePostgres bool
}

func (a *app) q(query string) string {
	if !a.usePostgres {
		return query
	}
	n := 0
	var b strings.Builder
	for i := 0; i < len(query); i++ {
		if query[i] == '?' {
			n++
			b.WriteByte('$')
			b.WriteString(strconv.Itoa(n))
			continue
		}
		b.WriteByte(query[i])
	}
	return b.String()
}

func (a *app) exec(query string, args ...any) (sql.Result, error) {
	return a.db.Exec(a.q(query), args...)
}

func (a *app) queryRow(query string, args ...any) *sql.Row {
	return a.db.QueryRow(a.q(query), args...)
}

func ListenAndServe() error {
	handler, err := NewHandler()
	if err != nil {
		return err
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("SunStrike API started on :%s", port)
	return http.ListenAndServe(":"+port, handler)
}

var (
	handlerOnce sync.Once
	cachedMux   http.Handler
	cachedErr   error
)

func NewHandler() (http.Handler, error) {
	handlerOnce.Do(func() {
		db, usePostgres, err := initDB()
		if err != nil {
			cachedErr = err
			return
		}
		api := &app{db: db, usePostgres: usePostgres}
		mux := http.NewServeMux()
		mux.HandleFunc("/api/health", api.handleHealth)
		mux.HandleFunc("/api/register", api.handleRegister)
		mux.HandleFunc("/api/login", api.handleLogin)
		mux.HandleFunc("/api/logout", api.handleLogout)
		mux.HandleFunc("/api/me", api.handleMe)
		mux.HandleFunc("/api/profile", api.handleProfileUpdate)
		cachedMux = corsMiddleware(mux)
	})
	return cachedMux, cachedErr
}

func ServeHTTP(w http.ResponseWriter, r *http.Request) {
	handler, err := NewHandler()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(messageResponse{Error: err.Error()})
		return
	}

	if r.URL.Path != "/api" && !strings.HasPrefix(r.URL.Path, "/api/") {
		clone := r.Clone(r.Context())
		if r.URL.Path == "/" {
			clone.URL.Path = "/api/health"
		} else {
			clone.URL.Path = "/api" + r.URL.Path
		}
		handler.ServeHTTP(w, clone)
		return
	}

	handler.ServeHTTP(w, r)
}

func postgresDSN(raw string) string {
	dsn := strings.ReplaceAll(raw, "channel_binding=require", "")
	dsn = strings.Trim(strings.ReplaceAll(dsn, "&&", "&"), "&?")
	extras := []string{"connect_timeout=8", "default_query_exec_mode=simple_protocol"}
	for _, extra := range extras {
		key := strings.SplitN(extra, "=", 2)[0]
		if strings.Contains(dsn, key+"=") {
			continue
		}
		if strings.Contains(dsn, "?") {
			dsn += "&" + extra
		} else {
			dsn += "?" + extra
		}
	}
	return dsn
}

func initDB() (*sql.DB, bool, error) {
	databaseURL := postgresDSN(os.Getenv("DATABASE_URL"))

	if os.Getenv("VERCEL") != "" && os.Getenv("DATABASE_URL") == "" {
		return nil, false, errors.New("DATABASE_URL is not set. Add the Neon pooled URL in Vercel Environment Variables")
	}

	if os.Getenv("DATABASE_URL") != "" {
		db, err := sql.Open("pgx", databaseURL)
		if err != nil {
			return nil, true, err
		}
		db.SetMaxOpenConns(4)
		db.SetMaxIdleConns(0)
		db.SetConnMaxLifetime(5 * time.Minute)
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		if err := db.PingContext(ctx); err != nil {
			return nil, true, err
		}
		if err := migratePostgres(db); err != nil {
			return nil, true, err
		}
		return db, true, nil
	}

	db, err := sql.Open("sqlite", "sunstrike.db")
	if err != nil {
		return nil, false, err
	}
	if err := migrateSQLite(db); err != nil {
		return nil, false, err
	}
	return db, false, nil
}

func migratePostgres(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			email TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			avatar_data TEXT NOT NULL DEFAULT '',
			avatar_pos_x DOUBLE PRECISION NOT NULL DEFAULT 50,
			avatar_pos_y DOUBLE PRECISION NOT NULL DEFAULT 50,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS sessions (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id),
			token TEXT NOT NULL UNIQUE,
			expires_at TIMESTAMPTZ NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
	`)
	return err
}

func migrateSQLite(db *sql.DB) error {
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT NOT NULL UNIQUE,
			email TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			avatar_data TEXT NOT NULL DEFAULT '',
			avatar_pos_x REAL NOT NULL DEFAULT 50,
			avatar_pos_y REAL NOT NULL DEFAULT 50,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);`); err != nil {
		return err
	}
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token TEXT NOT NULL UNIQUE,
			expires_at DATETIME NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		);`); err != nil {
		return err
	}
	if err := ensureUsersEmailColumn(db); err != nil {
		return err
	}
	return ensureUsersAvatarColumns(db)
}

func ensureUsersEmailColumn(db *sql.DB) error {
	rows, err := db.Query(`PRAGMA table_info(users);`)
	if err != nil {
		return err
	}
	defer rows.Close()

	hasEmail := false
	for rows.Next() {
		var (
			cid        int
			name       string
			colType    string
			notNull    int
			defaultV   sql.NullString
			primaryKey int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &defaultV, &primaryKey); err != nil {
			return err
		}
		if strings.EqualFold(name, "email") {
			hasEmail = true
			break
		}
	}

	if !hasEmail {
		if _, err := db.Exec(`ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''`); err != nil {
			return err
		}
		if _, err := db.Exec(`UPDATE users SET email = username WHERE email = ''`); err != nil {
			return err
		}
	}

	return rows.Err()
}

func ensureUsersAvatarColumns(db *sql.DB) error {
	rows, err := db.Query(`PRAGMA table_info(users);`)
	if err != nil {
		return err
	}
	defer rows.Close()

	columnMap := map[string]bool{}
	for rows.Next() {
		var (
			cid        int
			name       string
			colType    string
			notNull    int
			defaultV   sql.NullString
			primaryKey int
		)
		if err := rows.Scan(&cid, &name, &colType, &notNull, &defaultV, &primaryKey); err != nil {
			return err
		}
		columnMap[strings.ToLower(name)] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if !columnMap["avatar_data"] {
		if _, err := db.Exec(`ALTER TABLE users ADD COLUMN avatar_data TEXT NOT NULL DEFAULT ''`); err != nil {
			return err
		}
	}
	if !columnMap["avatar_pos_x"] {
		if _, err := db.Exec(`ALTER TABLE users ADD COLUMN avatar_pos_x REAL NOT NULL DEFAULT 50`); err != nil {
			return err
		}
	}
	if !columnMap["avatar_pos_y"] {
		if _, err := db.Exec(`ALTER TABLE users ADD COLUMN avatar_pos_y REAL NOT NULL DEFAULT 50`); err != nil {
			return err
		}
	}

	return nil
}

func (a *app) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, messageResponse{Error: "method not allowed"})
		return
	}
	writeJSON(w, http.StatusOK, messageResponse{Message: "SunStrike API is running"})
}

func (a *app) handleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, messageResponse{Error: "method not allowed"})
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, messageResponse{Error: "invalid request payload"})
		return
	}

	login, email, password, err := validateRegistration(req)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, messageResponse{Error: err.Error()})
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to process password"})
		return
	}

	var userID int64
	err = a.queryRow(
		`INSERT INTO users(username, email, password_hash) VALUES(?, ?, ?) RETURNING id`,
		login,
		email,
		string(passwordHash),
	).Scan(&userID)
	if err != nil {
		if isUniqueViolation(err) {
			writeJSON(w, http.StatusConflict, messageResponse{Error: "a user with this login already exists"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to create user"})
		return
	}

	token, err := a.createSession(userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to create session"})
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		Message:    "registration successful",
		Token:      token,
		Username:   login,
		Email:      email,
		AvatarData: "",
		AvatarPosX: 50,
		AvatarPosY: 50,
	})
}

func (a *app) handleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, messageResponse{Error: "method not allowed"})
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, messageResponse{Error: "invalid request payload"})
		return
	}

	email, password, err := validateLogin(req)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, messageResponse{Error: err.Error()})
		return
	}

	var (
		userID       int64
		username     string
		userEmail    string
		avatarData   string
		avatarPosX   float64
		avatarPosY   float64
		passwordHash string
	)

	err = a.queryRow(
		`SELECT id, username, email, avatar_data, avatar_pos_x, avatar_pos_y, password_hash FROM users WHERE email = ?`,
		email,
	).Scan(&userID, &username, &userEmail, &avatarData, &avatarPosX, &avatarPosY, &passwordHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusUnauthorized, messageResponse{Error: "invalid email or password"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to load user"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		writeJSON(w, http.StatusUnauthorized, messageResponse{Error: "invalid email or password"})
		return
	}

	token, err := a.createSession(userID)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to create session"})
		return
	}

	writeJSON(w, http.StatusOK, authResponse{
		Message:    "login successful",
		Token:      token,
		Username:   username,
		Email:      userEmail,
		AvatarData: avatarData,
		AvatarPosX: avatarPosX,
		AvatarPosY: avatarPosY,
	})
}

func (a *app) handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, messageResponse{Error: "method not allowed"})
		return
	}

	token := getBearerToken(r.Header.Get("Authorization"))
	if token == "" {
		writeJSON(w, http.StatusUnauthorized, messageResponse{Error: "missing token"})
		return
	}

	if _, err := a.exec(`DELETE FROM sessions WHERE token = ?`, token); err != nil {
		writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to logout"})
		return
	}

	writeJSON(w, http.StatusOK, messageResponse{Message: "logout successful"})
}

func (a *app) handleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, messageResponse{Error: "method not allowed"})
		return
	}

	token := getBearerToken(r.Header.Get("Authorization"))
	if token == "" {
		writeJSON(w, http.StatusUnauthorized, messageResponse{Error: "missing token"})
		return
	}

	var (
		username   string
		email      string
		avatarData string
		avatarPosX float64
		avatarPosY float64
	)
	err := a.queryRow(`
		SELECT u.username, u.email, u.avatar_data, u.avatar_pos_x, u.avatar_pos_y
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token = ? AND s.expires_at > ?`,
		token,
		time.Now().UTC(),
	).Scan(&username, &email, &avatarData, &avatarPosX, &avatarPosY)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusUnauthorized, messageResponse{Error: "invalid or expired session"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to check session"})
		return
	}

	writeJSON(w, http.StatusOK, userResponse{
		Username:   username,
		Email:      email,
		AvatarData: avatarData,
		AvatarPosX: avatarPosX,
		AvatarPosY: avatarPosY,
	})
}

func (a *app) handleProfileUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, messageResponse{Error: "method not allowed"})
		return
	}

	token := getBearerToken(r.Header.Get("Authorization"))
	if token == "" {
		writeJSON(w, http.StatusUnauthorized, messageResponse{Error: "missing token"})
		return
	}

	userID, err := a.getUserIDByToken(token)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeJSON(w, http.StatusUnauthorized, messageResponse{Error: "invalid or expired session"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to check session"})
		return
	}

	var req profileUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, messageResponse{Error: "invalid request payload"})
		return
	}

	nickname := strings.TrimSpace(req.Nickname)
	email := strings.TrimSpace(req.Email)
	if nickname == "" || email == "" {
		writeJSON(w, http.StatusBadRequest, messageResponse{Error: "nickname and email are required"})
		return
	}
	if len(nickname) < 3 {
		writeJSON(w, http.StatusBadRequest, messageResponse{Error: "nickname must be at least 3 characters"})
		return
	}
	if !strings.Contains(email, "@") || len(email) < 5 {
		writeJSON(w, http.StatusBadRequest, messageResponse{Error: "please enter a valid email"})
		return
	}
	if req.NewPassword != "" && len(strings.TrimSpace(req.NewPassword)) < 6 {
		writeJSON(w, http.StatusBadRequest, messageResponse{Error: "password must be at least 6 characters"})
		return
	}

	avatarX := req.AvatarPosX
	avatarY := req.AvatarPosY
	if avatarX < 0 {
		avatarX = 0
	}
	if avatarX > 100 {
		avatarX = 100
	}
	if avatarY < 0 {
		avatarY = 0
	}
	if avatarY > 100 {
		avatarY = 100
	}

	var existingID int64
	err = a.queryRow(`SELECT id FROM users WHERE username = ? AND id != ?`, nickname, userID).Scan(&existingID)
	if err == nil {
		writeJSON(w, http.StatusConflict, messageResponse{Error: "a user with this nickname already exists"})
		return
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to validate nickname"})
		return
	}

	if req.NewPassword != "" {
		passwordHash, hashErr := bcrypt.GenerateFromPassword([]byte(strings.TrimSpace(req.NewPassword)), bcrypt.DefaultCost)
		if hashErr != nil {
			writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to process password"})
			return
		}
		if _, err := a.exec(
			`UPDATE users SET username = ?, email = ?, avatar_data = ?, avatar_pos_x = ?, avatar_pos_y = ?, password_hash = ? WHERE id = ?`,
			nickname, email, req.AvatarData, avatarX, avatarY, string(passwordHash), userID,
		); err != nil {
			writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to update profile"})
			return
		}
	} else {
		if _, err := a.exec(
			`UPDATE users SET username = ?, email = ?, avatar_data = ?, avatar_pos_x = ?, avatar_pos_y = ? WHERE id = ?`,
			nickname, email, req.AvatarData, avatarX, avatarY, userID,
		); err != nil {
			writeJSON(w, http.StatusInternalServerError, messageResponse{Error: "failed to update profile"})
			return
		}
	}

	writeJSON(w, http.StatusOK, userResponse{
		Username:   nickname,
		Email:      email,
		AvatarData: req.AvatarData,
		AvatarPosX: avatarX,
		AvatarPosY: avatarY,
	})
}

func (a *app) getUserIDByToken(token string) (int64, error) {
	var userID int64
	err := a.queryRow(
		`SELECT user_id FROM sessions WHERE token = ? AND expires_at > ?`,
		token,
		time.Now().UTC(),
	).Scan(&userID)
	return userID, err
}

func validateRegistration(req registerRequest) (string, string, string, error) {
	login := strings.TrimSpace(req.Login)
	email := strings.TrimSpace(req.Email)
	password := strings.TrimSpace(req.Password)

	if login == "" || email == "" || password == "" {
		return "", "", "", errors.New("login, email and password are required")
	}
	if len(login) < 3 {
		return "", "", "", errors.New("login must be at least 3 characters")
	}
	if !strings.Contains(email, "@") || len(email) < 5 {
		return "", "", "", errors.New("please enter a valid email")
	}
	if len(password) < 6 {
		return "", "", "", errors.New("password must be at least 6 characters")
	}

	return login, email, password, nil
}

func validateLogin(req loginRequest) (string, string, error) {
	email := strings.TrimSpace(req.Email)
	password := strings.TrimSpace(req.Password)

	if email == "" || password == "" {
		return "", "", errors.New("email and password are required")
	}
	if !strings.Contains(email, "@") || len(email) < 5 {
		return "", "", errors.New("please enter a valid email")
	}
	return email, password, nil
}

func (a *app) createSession(userID int64) (string, error) {
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}

	token := hex.EncodeToString(tokenBytes)
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	if _, err := a.exec(`INSERT INTO sessions(user_id, token, expires_at) VALUES(?, ?, ?)`, userID, token, expiresAt); err != nil {
		return "", err
	}

	_, _ = a.exec(`DELETE FROM sessions WHERE expires_at <= ?`, time.Now().UTC())
	return token, nil
}

func getBearerToken(authHeader string) string {
	if authHeader == "" {
		return ""
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}

func isUniqueViolation(err error) bool {
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "unique") || strings.Contains(msg, "duplicate")
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func isAllowedOrigin(origin string) bool {
	if origin == "" {
		return true
	}
	extra := strings.Split(os.Getenv("FRONTEND_ORIGIN"), ",")
	for _, value := range extra {
		if strings.TrimSpace(value) == origin {
			return true
		}
	}
	return origin == "http://localhost:5173" || strings.HasSuffix(origin, ".vercel.app")
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if isAllowedOrigin(origin) {
			if origin == "" {
				origin = "http://localhost:5173"
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Vary", "Origin")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
