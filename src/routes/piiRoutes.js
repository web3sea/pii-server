const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const PiiRedactionService = require("../services/piiRedactionService");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image (jpeg, jpg, png) and PDF files are allowed"));
    }
  },
});

// PII Redaction endpoint
router.post("/redact", upload.single("file"), async (req, res) => {
  try {
    const { text } = req.body;
    const file = req.file;

    // Validate input
    if (!text && !file) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Either text or file must be provided",
      });
    }

    const piiService = new PiiRedactionService();
    let result;

    if (file) {
      // Process uploaded file
      result = await piiService.redactFile(file.path);
    } else {
      // Process text input
      result = await piiService.redactText(text);
    }

    res.status(200).json({
      success: true,
      data: {
        originalText: result.originalText,
        redactedText: result.redactedText,
        redactedFields: result.redactedFields,
        confidence: result.confidence,
      },
    });
  } catch (error) {
    console.error("PII Redaction Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

// Text-only redaction endpoint
router.post("/redact-text", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Text is required",
      });
    }

    const piiService = new PiiRedactionService();
    const result = await piiService.redactText(text);

    res.status(200).json({
      success: true,
      data: {
        originalText: result.originalText,
        redactedText: result.redactedText,
        redactedFields: result.redactedFields,
        confidence: result.confidence,
      },
    });
  } catch (error) {
    console.error("Text Redaction Error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

module.exports = router;
