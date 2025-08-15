const fs = require("fs").promises;
const path = require("path");

class FileCleanup {
  constructor(uploadDir = "uploads") {
    this.uploadDir = uploadDir;
  }

  async cleanupFile(filePath) {
    try {
      await fs.unlink(filePath);
      console.log(`Cleaned up file: ${filePath}`);
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error.message);
    }
  }

  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.uploadDir);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);
        const fileAge = now - stats.mtime.getTime();

        if (fileAge > maxAgeMs) {
          await this.cleanupFile(filePath);
        }
      }
    } catch (error) {
      console.error("Error during cleanup:", error.message);
    }
  }

  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log(`Created upload directory: ${this.uploadDir}`);
    }
  }
}

module.exports = FileCleanup;
