const FileCleanup = require("../utils/fileCleanup");

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Clean up uploaded file if there was an error
  if (req.file) {
    const fileCleanup = new FileCleanup();
    fileCleanup.cleanupFile(req.file.path);
  }

  // Handle specific error types
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "File too large",
      message: "File size exceeds the maximum limit of 10MB",
    });
  }

  if (err.message && err.message.includes("Only image")) {
    return res.status(400).json({
      error: "Invalid file type",
      message: "Only image (jpeg, jpg, png) and PDF files are allowed",
    });
  }

  // Default error response
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
};

module.exports = errorHandler;
