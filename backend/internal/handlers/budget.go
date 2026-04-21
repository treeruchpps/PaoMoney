package handlers

import (
	"context"
	"net/http"
	"paomoney/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type BudgetHandler struct {
	db *pgxpool.Pool
}

func NewBudgetHandler(db *pgxpool.Pool) *BudgetHandler {
	return &BudgetHandler{db: db}
}

// GET /api/v1/budgets
func (h *BudgetHandler) List(c *gin.Context) {
	userID := c.GetString("user_id")

	// คำนวณยอดใช้จ่ายจริงในช่วงเวลาของแต่ละงบประมาณ ด้วย lateral subquery
	rows, err := h.db.Query(context.Background(),
		`SELECT b.id, b.user_id, b.category_id, b.name, b.amount, b.period,
		        b.start_date, b.end_date, b.is_active, b.created_at, b.updated_at,
		        COALESCE((
		          SELECT SUM(t.amount)
		          FROM transactions t
		          WHERE t.user_id = b.user_id
		            AND t.type = 'expense'
		            AND (b.category_id IS NULL OR t.category_id = b.category_id)
		            AND t.transaction_date >= CASE b.period
		              WHEN 'monthly' THEN date_trunc('month', CURRENT_DATE)::date
		              WHEN 'weekly'  THEN date_trunc('week',  CURRENT_DATE)::date
		              WHEN 'yearly'  THEN date_trunc('year',  CURRENT_DATE)::date
		              ELSE b.start_date
		            END
		            AND t.transaction_date <= CASE b.period
		              WHEN 'monthly' THEN (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date
		              WHEN 'weekly'  THEN (date_trunc('week',  CURRENT_DATE) + interval '6 days')::date
		              WHEN 'yearly'  THEN (date_trunc('year',  CURRENT_DATE) + interval '1 year - 1 day')::date
		              ELSE COALESCE(b.end_date, CURRENT_DATE)
		            END
		        ), 0) AS spent
		 FROM budgets b
		 WHERE b.user_id = $1
		 ORDER BY b.created_at DESC`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch budgets"})
		return
	}
	defer rows.Close()

	budgets := []models.Budget{}
	for rows.Next() {
		var b models.Budget
		if err := rows.Scan(&b.ID, &b.UserID, &b.CategoryID, &b.Name, &b.Amount,
			&b.Period, &b.StartDate, &b.EndDate, &b.IsActive, &b.CreatedAt, &b.UpdatedAt,
			&b.Spent); err != nil {
			continue
		}
		budgets = append(budgets, b)
	}

	c.JSON(http.StatusOK, budgets)
}

// POST /api/v1/budgets
func (h *BudgetHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.CreateBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format, use YYYY-MM-DD"})
		return
	}

	var endDate *time.Time
	if req.EndDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format, use YYYY-MM-DD"})
			return
		}
		endDate = &parsed
	}

	var b models.Budget
	err = h.db.QueryRow(context.Background(),
		`INSERT INTO budgets (user_id, category_id, name, amount, period, start_date, end_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, user_id, category_id, name, amount, period, start_date, end_date, is_active, created_at, updated_at`,
		userID, req.CategoryID, req.Name, req.Amount, req.Period, startDate, endDate,
	).Scan(&b.ID, &b.UserID, &b.CategoryID, &b.Name, &b.Amount,
		&b.Period, &b.StartDate, &b.EndDate, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create budget"})
		return
	}

	c.JSON(http.StatusCreated, b)
}

// GET /api/v1/budgets/:id
func (h *BudgetHandler) Get(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var b models.Budget
	err := h.db.QueryRow(context.Background(),
		`SELECT id, user_id, category_id, name, amount, period, start_date, end_date, is_active, created_at, updated_at
		 FROM budgets WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(&b.ID, &b.UserID, &b.CategoryID, &b.Name, &b.Amount,
		&b.Period, &b.StartDate, &b.EndDate, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "budget not found"})
		return
	}

	c.JSON(http.StatusOK, b)
}

// PUT /api/v1/budgets/:id
func (h *BudgetHandler) Update(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var req models.UpdateBudgetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var endDate *time.Time
	if req.EndDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format, use YYYY-MM-DD"})
			return
		}
		endDate = &parsed
	}

	var b models.Budget
	err := h.db.QueryRow(context.Background(),
		`UPDATE budgets
		 SET name      = COALESCE($1, name),
		     amount    = COALESCE($2, amount),
		     period    = COALESCE($3, period),
		     end_date  = COALESCE($4, end_date),
		     is_active = COALESCE($5, is_active)
		 WHERE id = $6 AND user_id = $7
		 RETURNING id, user_id, category_id, name, amount, period, start_date, end_date, is_active, created_at, updated_at`,
		req.Name, req.Amount, req.Period, endDate, req.IsActive, id, userID,
	).Scan(&b.ID, &b.UserID, &b.CategoryID, &b.Name, &b.Amount,
		&b.Period, &b.StartDate, &b.EndDate, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "budget not found"})
		return
	}

	c.JSON(http.StatusOK, b)
}

// DELETE /api/v1/budgets/:id
func (h *BudgetHandler) Delete(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	result, err := h.db.Exec(context.Background(),
		`DELETE FROM budgets WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	if err != nil || result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "budget not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "budget deleted"})
}
