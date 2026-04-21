package handlers

import (
	"context"
	"net/http"
	"paomoney/internal/models"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TransactionHandler struct {
	db *pgxpool.Pool
}

func NewTransactionHandler(db *pgxpool.Pool) *TransactionHandler {
	return &TransactionHandler{db: db}
}

// GET /api/v1/transactions
func (h *TransactionHandler) List(c *gin.Context) {
	userID := c.GetString("user_id")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	accountID := c.Query("account_id")
	txType := c.Query("type")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	query := `SELECT id, user_id, account_id, to_account_id, category_id, type, amount, note, transaction_date, created_at, updated_at
			  FROM transactions WHERE user_id = $1`
	args := []interface{}{userID}
	idx := 2

	if accountID != "" {
		query += " AND account_id = $" + strconv.Itoa(idx)
		args = append(args, accountID)
		idx++
	}
	if txType != "" {
		query += " AND type = $" + strconv.Itoa(idx)
		args = append(args, txType)
		idx++
	}
	if dateFrom != "" {
		query += " AND transaction_date >= $" + strconv.Itoa(idx)
		args = append(args, dateFrom)
		idx++
	}
	if dateTo != "" {
		query += " AND transaction_date <= $" + strconv.Itoa(idx)
		args = append(args, dateTo)
		idx++
	}

	query += " ORDER BY transaction_date DESC, created_at DESC"
	query += " LIMIT $" + strconv.Itoa(idx) + " OFFSET $" + strconv.Itoa(idx+1)
	args = append(args, limit, offset)

	rows, err := h.db.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch transactions"})
		return
	}
	defer rows.Close()

	transactions := []models.Transaction{}
	for rows.Next() {
		var t models.Transaction
		if err := rows.Scan(&t.ID, &t.UserID, &t.AccountID, &t.ToAccountID, &t.CategoryID,
			&t.Type, &t.Amount, &t.Note, &t.TransactionDate, &t.CreatedAt, &t.UpdatedAt); err != nil {
			continue
		}
		transactions = append(transactions, t)
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  transactions,
		"page":  page,
		"limit": limit,
	})
}

// POST /api/v1/transactions
func (h *TransactionHandler) Create(c *gin.Context) {
	userID := c.GetString("user_id")

	var req models.CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	txDate := time.Now()
	if req.TransactionDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.TransactionDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format, use YYYY-MM-DD"})
			return
		}
		txDate = parsed
	}

	var t models.Transaction
	err := h.db.QueryRow(context.Background(),
		`INSERT INTO transactions (user_id, account_id, to_account_id, category_id, type, amount, note, transaction_date)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, user_id, account_id, to_account_id, category_id, type, amount, note, transaction_date, created_at, updated_at`,
		userID, req.AccountID, req.ToAccountID, req.CategoryID, req.Type, req.Amount, req.Note, txDate,
	).Scan(&t.ID, &t.UserID, &t.AccountID, &t.ToAccountID, &t.CategoryID,
		&t.Type, &t.Amount, &t.Note, &t.TransactionDate, &t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create transaction"})
		return
	}

	c.JSON(http.StatusCreated, t)
}

// GET /api/v1/transactions/:id
func (h *TransactionHandler) Get(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var t models.Transaction
	err := h.db.QueryRow(context.Background(),
		`SELECT id, user_id, account_id, to_account_id, category_id, type, amount, note, transaction_date, created_at, updated_at
		 FROM transactions WHERE id = $1 AND user_id = $2`,
		id, userID,
	).Scan(&t.ID, &t.UserID, &t.AccountID, &t.ToAccountID, &t.CategoryID,
		&t.Type, &t.Amount, &t.Note, &t.TransactionDate, &t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
		return
	}

	c.JSON(http.StatusOK, t)
}

// PUT /api/v1/transactions/:id
func (h *TransactionHandler) Update(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	var req models.UpdateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var txDate *time.Time
	if req.TransactionDate != nil {
		parsed, err := time.Parse("2006-01-02", *req.TransactionDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format, use YYYY-MM-DD"})
			return
		}
		txDate = &parsed
	}

	var t models.Transaction
	err := h.db.QueryRow(context.Background(),
		`UPDATE transactions
		 SET category_id      = COALESCE($1, category_id),
		     amount           = COALESCE($2, amount),
		     note             = COALESCE($3, note),
		     transaction_date = COALESCE($4, transaction_date)
		 WHERE id = $5 AND user_id = $6
		 RETURNING id, user_id, account_id, to_account_id, category_id, type, amount, note, transaction_date, created_at, updated_at`,
		req.CategoryID, req.Amount, req.Note, txDate, id, userID,
	).Scan(&t.ID, &t.UserID, &t.AccountID, &t.ToAccountID, &t.CategoryID,
		&t.Type, &t.Amount, &t.Note, &t.TransactionDate, &t.CreatedAt, &t.UpdatedAt)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
		return
	}

	c.JSON(http.StatusOK, t)
}

// DELETE /api/v1/transactions/:id
func (h *TransactionHandler) Delete(c *gin.Context) {
	userID := c.GetString("user_id")
	id := c.Param("id")

	result, err := h.db.Exec(context.Background(),
		`DELETE FROM transactions WHERE id = $1 AND user_id = $2`,
		id, userID,
	)
	if err != nil || result.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "transaction deleted"})
}
