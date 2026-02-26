-- 答卷表增加 status：DRAFT=草稿（实时保存），SUBMITTED=已提交；草稿时 submitted_at 可为 NULL
ALTER TABLE response ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' COMMENT 'DRAFT=草稿 SUBMITTED=已提交' AFTER device_id;
ALTER TABLE response MODIFY submitted_at TIMESTAMP NULL DEFAULT NULL COMMENT '提交时间，草稿为 NULL';
