package models

import "time"

type Category struct {
	ID        string          `json:"id"`
	UserID    *string         `json:"user_id"`
	Name      string          `json:"name"`
	Type      TransactionType `json:"type"`
	Icon      *string         `json:"icon"`
	CreatedAt time.Time       `json:"created_at"`
}

type CreateCategoryRequest struct {
	Name string          `json:"name" binding:"required,max=100"`
	Type TransactionType `json:"type" binding:"required,oneof=income expense"`
	Icon *string         `json:"icon"`
}

type UpdateCategoryRequest struct {
	Name *string  `json:"name"`
	Icon *string  `json:"icon"`
}
