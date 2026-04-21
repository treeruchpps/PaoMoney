package config

import (
	"os"
	"time"
)

type Config struct {
	DB     DBConfig
	JWT    JWTConfig
	Server ServerConfig
}

type DBConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
}

type JWTConfig struct {
	Secret         string
	AccessExpires  time.Duration
	RefreshExpires time.Duration
}

type ServerConfig struct {
	Port string
}

func Load() *Config {
	accessExpires, _ := time.ParseDuration(getEnv("JWT_ACCESS_EXPIRES", "15m"))
	refreshExpires, _ := time.ParseDuration(getEnv("JWT_REFRESH_EXPIRES", "168h"))

	return &Config{
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			Name:     getEnv("DB_NAME", "paomoney"),
		},
		JWT: JWTConfig{
			Secret:         getEnv("JWT_SECRET", "secret"),
			AccessExpires:  accessExpires,
			RefreshExpires: refreshExpires,
		},
		Server: ServerConfig{
			Port: getEnv("SERVER_PORT", "8080"),
		},
	}
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
