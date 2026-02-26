-- 防重复扩展：按 IP、按同一设备限填
ALTER TABLE survey
    ADD COLUMN limit_by_ip INT NOT NULL DEFAULT 0 COMMENT '每 IP 限填次数，0=不限制',
    ADD COLUMN limit_by_device INT NOT NULL DEFAULT 0 COMMENT '每设备限填次数，0=不限制';

ALTER TABLE response
    ADD COLUMN submitted_ip VARCHAR(64) DEFAULT NULL COMMENT '提交时 IP',
    ADD COLUMN device_id VARCHAR(64) DEFAULT NULL COMMENT '设备标识（前端传入）';

CREATE INDEX idx_response_survey_ip ON response(survey_id, submitted_ip);
CREATE INDEX idx_response_survey_device ON response(survey_id, device_id);
