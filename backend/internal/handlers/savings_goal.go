package handlers

import (
	"context"
	"fmt"
	"net/http"
	"paomoney/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SavingsGoalHandler struct {
	db *pgxpool.Pool
}

func NewSavingsGoalHandler(db *pgxpool.Pool) *SavingsGoalHandler {
	return &SavingsGoalHandler{db: db}
}

// GET /api/v1/savings-goals
func (h *SavingsGoalHandler) List(c *gin.Context) {
	userID := c.GetString("user_id")

	rows, err := h.db.Query(context.Background(),
		`SELECT id, user_id, account_id, name, target_amount, current_amount, deadline, status, note, created_at, updated_at
		 FROM savings_goals WHERE user_id = $1 ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch savings goals"})
		return
	}
	defer rows.Close()

	goals := []models.SavingsGoal{}
	for rows.Next() {
		var g models.SavingsGoal
		if err := rows.Scan(&g.ID, &g.UserID, &g.AccountID, &g.Name, &g.TargetAmount,
			&g.CurrentAmount, &g.Deadline, &g.Status, &g.Note, &g.CreatedAt, &g.UpdatedAt); err != nil {
			continue
		}
		goals = append(goals, g)
	}

	c.JSON(http.StatusOK, goals)
}

// POST /api/v1/savings-goals
func (h *SavingsGoalHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.CreateSavingsGoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var deadline *time.Time
	if req.Deadline != nil {
		parsed, err := time.Parse("2006-01-02", *req.Deadline)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid deadline format, use YYYY-MM-DD"})
			return
		}
		deadline = &parsed
	}

	var g models.SavingsGoal
	err := h.db.QueryRow(context.Background(),
		`INSERT INTO savings_goals (user_id, account_id, name, target_amount, current_amount, deadline, note)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, user_id, account_id, name, target_amount, current_amount, deadline, status, note, created_at, updated_at`,
		userID, req.AccountID, req.Name, req.TargetAmount, req.CurrentAmount, deadline, req.Note,
	).Scan(&g.ID, &g.UserID, &g.AccountID, &g.Name, &g.TargetAmount,
		&g.CurrentAmount, &g.Deadline, &g.Status, &g.Note, &g.CreatedAt, &g.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create savings goal"})
		return
	}

	c.JSON(http.StatusCreated, g)
}

// GET /api/v1/savings-goals/:id
func (h *SavingsGoalHandler) Get(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var g models.SavingsGoal
	err := h.db.QueryRow(context.Background(),
		`SELECT id, user_id, account_id, name, target_amount, current_amount, deadline, status, note, created_at, updated_at
		 FROM savings_goals WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(&g.ID, &g.UserID, &g.AccountID, &g.Name, &g.TargetAmount,
		&g.CurrentAmount, &g.Deadline, &g.Status, &g.Note, &g.CreatedAt, &g.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "savings goal not found"})
		return
	}

	c.JSON(http.StatusOK, g)
}

// PUT /api/v1/savings-goals/:id
func (h *SavingsGoalHandler) Update(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var req models.UpdateSavingsGoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var deadline *time.Time
	if req.Deadline != nil {
		parsed, err := time.Parse("2006-01-02", *req.Deadline)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid deadline format, use YYYY-MM-DD"})
			return
		}
		deadline = &parsed
	}

	var g models.SavingsGoal
	err := h.db.QueryRow(context.Background(),
		`UPDATE savings_goals
		 SET name           = COALESCE($1, name),
		     target_amount  = COALESCE($2, target_amount),
		     current_amount = COALESCE($3, current_amount),
		     deadline       = COALESCE($4, deadline),
		     status         = COALESCE($5, status),
		     note           = COALESCE($6, note)
		 WHERE id = $7 AND user_id = $8
		 RETURNING id, user_id, account_id, name, target_amount, current_amount, deadline, status, note, created_at, updated_at`,
		req.Name, req.TargetAmount, req.CurrentAmount, deadline, req.Status, req.Note, id, userID,
	).Scan(&g.ID, &g.UserID, &g.AccountID, &g.Name, &g.TargetAmount,
		&g.CurrentAmount, &g.Deadline, &g.Status, &g.Note, &g.CreatedAt, &g.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "savings goal not found"})
		return
	}

	c.JSON(http.StatusOK, g)
}

// DELETE /api/v1/savings-goals/:id
func (h *SavingsGoalHandler) Delete(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	result, err := h.db.Exec(context.Background(),
		`DELETE FROM savings_goals WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	if err != nil || result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "savings goal not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "savings goal deleted"})
}

// POST /api/v1/savings-goals/:id/deposit
// ฝากเงินเข้าเป้าหมาย — สร้าง transaction + อัปเดต balance + อัปเดต current_amount
func (h *SavingsGoalHandler) Deposit(c *gin.Context) {
	userID := c.GetString("user_id")
	goalID := c.Param("id")

	var req struct {
		FromAccountID string  `json:"from_account_id" binding:"required"`
		Amount        float64 `json:"amount"          binding:"required,gt=0"`
		Note          *string `json:"note"`
		Date          *string `json:"date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := context.Background()

	// ดึงข้อมูลเป้าหมาย
	var g models.SavingsGoal
	err := h.db.QueryRow(ctx,
		`SELECT id, user_id, account_id, name, target_amount, current_amount, status
		 FROM savings_goals WHERE id = $1 AND user_id = $2`,
		goalID, userID,
	).Scan(&g.ID, &g.UserID, &g.AccountID, &g.Name, &g.TargetAmount, &g.CurrentAmount, &g.Status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "savings goal not found"})
		return
	}
	if g.Status == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "เป้าหมายนี้สำเร็จแล้ว"})
		return
	}

	// กำหนดวันที่
	txDate := time.Now()
	if req.Date != nil {
		if parsed, err := time.Parse("2006-01-02", *req.Date); err == nil {
			txDate = parsed
		}
	}

	// กำหนด note
	noteText := fmt.Sprintf("ออมเพื่อ: %s", g.Name)
	if req.Note != nil && *req.Note != "" {
		noteText = *req.Note
	}

	// เริ่ม DB transaction
	dbTx, err := h.db.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to begin transaction"})
		return
	}
	defer dbTx.Rollback(ctx)

	if g.AccountID != nil {
		// มีบัญชีเป้าหมาย → สร้าง transfer transaction
		_, err = dbTx.Exec(ctx,
			`INSERT INTO transactions (user_id, account_id, to_account_id, type, amount, name, note, transaction_date)
			 VALUES ($1, $2, $3, 'transfer', $4, $5, $6, $7)`,
			userID, req.FromAccountID, *g.AccountID, req.Amount, g.Name, noteText, txDate,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transaction"})
			return
		}
		// หักจากบัญชีต้นทาง
		_, err = dbTx.Exec(ctx,
			`UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND user_id = $3`,
			req.Amount, req.FromAccountID, userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update source balance"})
			return
		}
		// เพิ่มในบัญชีเป้าหมาย
		_, err = dbTx.Exec(ctx,
			`UPDATE accounts SET balance = balance + $1 WHERE id = $2 AND user_id = $3`,
			req.Amount, *g.AccountID, userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update goal balance"})
			return
		}
	} else {
		// ไม่มีบัญชีเป้าหมาย → บันทึกเป็น expense จากต้นทาง
		_, err = dbTx.Exec(ctx,
			`INSERT INTO transactions (user_id, account_id, type, amount, name, note, transaction_date)
			 VALUES ($1, $2, 'expense', $3, $4, $5, $6)`,
			userID, req.FromAccountID, req.Amount, g.Name, noteText, txDate,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transaction"})
			return
		}
		_, err = dbTx.Exec(ctx,
			`UPDATE accounts SET balance = balance - $1 WHERE id = $2 AND user_id = $3`,
			req.Amount, req.FromAccountID, userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update balance"})
			return
		}
	}

	// อัปเดต current_amount และ status
	newAmount := g.CurrentAmount + req.Amount
	newStatus := string(g.Status)
	if newAmount >= g.TargetAmount {
		newStatus = "completed"
	}

	var updated models.SavingsGoal
	err = dbTx.QueryRow(ctx,
		`UPDATE savings_goals
		 SET current_amount = $1, status = $2
		 WHERE id = $3 AND user_id = $4
		 RETURNING id, user_id, account_id, name, target_amount, current_amount, deadline, status, note, created_at, updated_at`,
		newAmount, newStatus, goalID, userID,
	).Scan(&updated.ID, &updated.UserID, &updated.AccountID, &updated.Name, &updated.TargetAmount,
		&updated.CurrentAmount, &updated.Deadline, &updated.Status, &updated.Note, &updated.CreatedAt, &updated.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update goal"})
		return
	}

	if err := dbTx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to commit"})
		return
	}

	c.JSON(http.StatusOK, updated)
}
