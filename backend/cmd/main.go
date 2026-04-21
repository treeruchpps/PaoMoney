package main

import (
	"fmt"
	"log"
	"paomoney/internal/config"
	database "paomoney/internal/connectdb"
	"paomoney/internal/router"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	cfg := config.Load()

	db, err := database.NewPool(&cfg.DB)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("connected to database")

	r := router.Setup(db, cfg)

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("server running on %s", addr)

	if err := r.Run(addr); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
