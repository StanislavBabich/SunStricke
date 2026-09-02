package main

import (
	"log"

	"sunstrike/server"
)

func main() {
	if err := server.ListenAndServe(); err != nil && err.Error() != "http: Server closed" {
		log.Fatalf("server failed: %v", err)
	}
}
