CREATE TABLE IF NOT EXISTS discount_codes (
  id INT NOT NULL AUTO_INCREMENT,
  mobile VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  device_fingerprint TEXT NOT NULL,
  uuid VARCHAR(36) NOT NULL,
  code VARCHAR(10) NOT NULL,
  status ENUM('new', 'used', 'expired') NOT NULL DEFAULT 'new',
  issued_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  feedback_id INT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_discount_codes_code (code),
  UNIQUE KEY uq_discount_codes_mobile (mobile),
  KEY ix_discount_codes_uuid (uuid(36)),
  KEY ix_discount_codes_name_mobile (name, mobile),
  CONSTRAINT fk_discount_codes_feedback
    FOREIGN KEY (feedback_id) REFERENCES survey_responses (id)
);

-- Suggested backend endpoints (this Angular app calls them):
-- POST /api/bubble-hope/discount/session   { device_fingerprint } -> { uuid }
-- POST /api/bubble-hope/discount/issue     { mobile, name, device_fingerprint, uuid, feedback_id }
-- GET  /api/bubble-hope/discount/check?mobile=
-- POST /api/bubble-hope/discount/claim     { mobile, device_fingerprint, uuid }
-- GET  /api/bubble-hope/discount/codes?search=
-- PATCH /api/bubble-hope/discount/codes/{id} { status }
-- GET  /api/bubble-hope/discount/export
