# SunStrike

Landing page and real authentication flow for SunStrike.

## Stack

- Frontend: React + Vite
- Backend: Go (`net/http`)
- Database: SQLite

## Start services separately

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backand
go mod tidy
go run ./cmd/api
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8080`.
