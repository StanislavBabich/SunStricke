package handler

import (
	"net/http"

	"sunstrike/server"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	server.ServeHTTP(w, r)
}
