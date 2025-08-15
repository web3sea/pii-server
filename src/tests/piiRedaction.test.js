const PiiRedactionService = require("../services/piiRedactionService");

describe("PII Redaction Service", () => {
  let piiService;

  beforeEach(() => {
    piiService = new PiiRedactionService();
  });

  describe("Text Redaction", () => {
    test("should redact property addresses", () => {
      const text = "Property located at 123 Main Street, New York, NY 10001";
      const result = piiService.redactText(text);

      expect(result.redactedText).toContain("[PROPERTY_ADDRESS]");
      expect(
        result.redactedFields.some((field) => field.type === "propertyAddress")
      ).toBe(true);
    });

    test("should redact account numbers", () => {
      const text = "Account Number: 1234567890";
      const result = piiService.redactText(text);

      expect(result.redactedText).toContain("[ACCOUNT_NUMBER]");
      expect(
        result.redactedFields.some((field) => field.type === "accountNumber")
      ).toBe(true);
    });

    test("should redact property names", () => {
      const text = "Sunset Gardens Property Management";
      const result = piiService.redactText(text);

      expect(result.redactedText).toContain("[PROPERTY_NAME]");
      expect(
        result.redactedFields.some((field) => field.type === "propertyName")
      ).toBe(true);
    });

    test("should redact phone numbers", () => {
      const text = "Contact us at (555) 123-4567";
      const result = piiService.redactText(text);

      expect(result.redactedText).toContain("[PHONE_NUMBER]");
      expect(
        result.redactedFields.some((field) => field.type === "phoneNumber")
      ).toBe(true);
    });

    test("should redact email addresses", () => {
      const text = "Email: john.doe@example.com";
      const result = piiService.redactText(text);

      expect(result.redactedText).toContain("[EMAIL_ADDRESS]");
      expect(
        result.redactedFields.some((field) => field.type === "email")
      ).toBe(true);
    });

    test("should handle multiple PII types in one text", () => {
      const text =
        "Property: Sunset Gardens at 123 Main Street. Account: 1234567890. Contact: (555) 123-4567";
      const result = piiService.redactText(text);

      expect(result.redactedText).toContain("[PROPERTY_NAME]");
      expect(result.redactedText).toContain("[PROPERTY_ADDRESS]");
      expect(result.redactedText).toContain("[ACCOUNT_NUMBER]");
      expect(result.redactedText).toContain("[PHONE_NUMBER]");
      expect(result.redactedFields.length).toBeGreaterThan(1);
    });

    test("should return confidence scores", () => {
      const text = "Account Number: 1234567890";
      const result = piiService.redactText(text);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.redactedFields.some((field) => field.confidence > 0)).toBe(
        true
      );
    });

    test("should handle text with no PII", () => {
      const text = "This is a regular text with no sensitive information.";
      const result = piiService.redactText(text);

      expect(result.redactedText).toBe(text);
      expect(result.redactedFields).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });

    test("should throw error for invalid input", () => {
      expect(() => piiService.redactText(null)).toThrow("Invalid text input");
      expect(() => piiService.redactText(undefined)).toThrow(
        "Invalid text input"
      );
      expect(() => piiService.redactText(123)).toThrow("Invalid text input");
    });
  });

  describe("PII Statistics", () => {
    test("should return correct PII statistics", () => {
      const text =
        "Property: Sunset Gardens at 123 Main Street. Account: 1234567890. Contact: (555) 123-4567";
      const stats = piiService.getPiiStatistics(text);

      expect(stats.propertyName).toBeGreaterThan(0);
      expect(stats.propertyAddress).toBeGreaterThan(0);
      expect(stats.accountNumber).toBeGreaterThan(0);
      expect(stats.phoneNumber).toBeGreaterThan(0);
    });

    test("should return zero counts for text with no PII", () => {
      const text = "This is a regular text with no sensitive information.";
      const stats = piiService.getPiiStatistics(text);

      Object.values(stats).forEach((count) => {
        expect(count).toBe(0);
      });
    });
  });
});
