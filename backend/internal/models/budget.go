package models

import "time"

type BudgetPeriod string

const (
	BudgetPeriodWeekly  BudgetPeriod = "weekly"
	BudgetPeriodMonthly BudgetPeriod = "monthly"
	BudgetPeriodYearly  BudgetPeriod = "yearly"
)

type Budget struct {
	ID         string       `json:"id"`
	UserID     string       `json:"user_id"`
	CategoryID *string      `json:"category_id"`
	Name       string       `json:"name"`
	Amount     float64      `json:"amount"`
	Period     BudgetPeriod `json:"period"`
	StartDate  time.Time    `json:"start_date"`
	EndDate    *time.Time   `json:"end_date"`
	IsActive   bool         `json:"is_active"`
	CreatedAt  time.Time    `json:"created_at"`
	UpdatedAt  time.Time    `json:"updated_at"`
}

type CreateBudgetRequest struct {
	CategoryID *string      `json:"category_id"`
	Name       string       `json:"name"       binding:"required,max=100"`
	Amount     float64      `json:"amount"     binding:"required,gt=0"`
	Period     BudgetPeriod `json:"period"     binding:"required,oneof=weekly monthly yearly"`
	StartDate  string       `json:"start_date" binding:"required"`
	EndDate    *string      `json:"end_date"`
}

type UpdateBudgetRequest struct {
	Name       *string       `json:"name"`
	Amount     *float64      `json:"amount"    binding:"omitempty,gt=0"`
	Period     *BudgetPeriod `json:"period"`
	EndDate    *string       `json:"end_date"`
	IsActive   *bool         `json:"is_active"`
}
