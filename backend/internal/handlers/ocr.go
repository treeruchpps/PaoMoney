package handlers

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"

	"github.com/gin-gonic/gin"
)

type OCRHandler struct{}

func NewOCRHandler() *OCRHandler { return &OCRHandler{} }

// POST /api/v1/ocr?type=receipt
// POST /api/v1/ocr?type=bank_slip
// รับ multipart file จาก frontend แล้ว forward ไปยัง Python OCR service
func (h *OCRHandler) Scan(c *gin.Context) {
	docType := c.Query("type")
	if docType != "receipt" && docType != "bank_slip" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be 'receipt' or 'bank_slip'"})
		return
	}

	// รับไฟล์จาก frontend
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่พบไฟล์ (field name: file)"})
		return
	}

	src, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "เปิดไฟล์ไม่ได้"})
		return
	}
	defer src.Close()

	fileBytes, err := io.ReadAll(src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "อ่านไฟล์ไม่ได้"})
		return
	}

	// ดึง Content-Type จริงของไฟล์จาก frontend
	mimeType := fileHeader.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "image/jpeg"
	}

	// สร้าง multipart body สำหรับส่งต่อไปยัง Python พร้อม Content-Type ที่ถูกต้อง
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	mh := make(textproto.MIMEHeader)
	mh.Set("Content-Disposition", fmt.Sprintf(`form-data; name="file"; filename="%s"`, fileHeader.Filename))
	mh.Set("Content-Type", mimeType)
	part, err := writer.CreatePart(mh)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้าง multipart ไม่ได้"})
		return
	}
	part.Write(fileBytes)
	writer.Close()

	// ส่งไปยัง Python OCR service
	ocrURL := os.Getenv("OCR_SERVICE_URL")
	if ocrURL == "" {
		ocrURL = "http://localhost:8001"
	}

	req, err := http.NewRequest("POST", fmt.Sprintf("%s/process?type=%s", ocrURL, docType), &buf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้าง request ไม่ได้"})
		return
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("OCR service ไม่ตอบสนอง: %v", err)})
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	c.Data(resp.StatusCode, "application/json", body)
}
