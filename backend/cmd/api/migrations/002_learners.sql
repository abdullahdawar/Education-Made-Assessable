CREATE TABLE IF NOT EXISTS v2_assessments (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  unit_id BIGINT NOT NULL,
  slot TINYINT NOT NULL,
  UNIQUE (unit_id, slot),
  CHECK (slot BETWEEN 1 AND 3),
  FOREIGN KEY (unit_id) REFERENCES v2_units(id)
);

CREATE TABLE IF NOT EXISTS v2_assessment_versions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assessment_id BIGINT NOT NULL,
  version INT NOT NULL,
  state VARCHAR(16) NOT NULL,
  definition JSON NOT NULL,
  fingerprint BINARY(32) NOT NULL,
  UNIQUE (assessment_id, version),
  CHECK (state IN ('draft', 'published', 'archived')),
  FOREIGN KEY (assessment_id) REFERENCES v2_assessments(id)
);

CREATE TABLE IF NOT EXISTS v2_learners (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token_digest BINARY(32) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_window BIGINT NOT NULL DEFAULT 0,
  request_count INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS v2_attempts (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  learner_id BIGINT NOT NULL,
  version_id BIGINT NOT NULL,
  assessment_id BIGINT NOT NULL,
  state VARCHAR(16) NOT NULL DEFAULT 'in_progress',
  responses JSON NOT NULL,
  started_at BIGINT NOT NULL,
  submitted_at BIGINT NULL,
  earned_marks INT NOT NULL DEFAULT 0,
  pending_marks INT NOT NULL DEFAULT 0,
  active_assessment BIGINT GENERATED ALWAYS AS (IF(state = 'in_progress', assessment_id, NULL)) STORED,
  UNIQUE (learner_id, active_assessment),
  INDEX (learner_id, assessment_id, state),
  CHECK (state IN ('in_progress', 'submitted', 'abandoned')),
  FOREIGN KEY (learner_id) REFERENCES v2_learners(id),
  FOREIGN KEY (version_id) REFERENCES v2_assessment_versions(id),
  FOREIGN KEY (assessment_id) REFERENCES v2_assessments(id)
);

CREATE TABLE IF NOT EXISTS v2_unit_unlocks (
  learner_id BIGINT NOT NULL,
  unit_id BIGINT NOT NULL,
  unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (learner_id, unit_id),
  FOREIGN KEY (learner_id) REFERENCES v2_learners(id),
  FOREIGN KEY (unit_id) REFERENCES v2_units(id)
);
