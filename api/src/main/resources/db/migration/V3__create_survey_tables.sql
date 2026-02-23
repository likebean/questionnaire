-- 问卷第一步：问卷、题目、答卷、答卷项（设计详稿 1.2–1.6）

-- 问卷表（含设置字段）
CREATE TABLE IF NOT EXISTS survey (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    title VARCHAR(200) NOT NULL COMMENT '问卷标题',
    description TEXT COMMENT '问卷说明/前言',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/COLLECTING/PAUSED/ENDED',
    creator_id VARCHAR(50) NOT NULL COMMENT '创建者 user id',
    limit_once_per_user TINYINT(1) NOT NULL DEFAULT 1 COMMENT '每人限填一次 1=是 0=否',
    allow_anonymous TINYINT(1) NOT NULL DEFAULT 0 COMMENT '允许匿名 1=是 0=否',
    start_time DATETIME DEFAULT NULL COMMENT '开始时间',
    end_time DATETIME DEFAULT NULL COMMENT '结束时间',
    thank_you_text TEXT COMMENT '提交成功后感谢语',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_survey_creator (creator_id),
    KEY idx_survey_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='问卷表';

-- 题目表（题型配置存 config JSON）
CREATE TABLE IF NOT EXISTS survey_question (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    survey_id BIGINT NOT NULL COMMENT '问卷 id',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '题目顺序',
    type VARCHAR(30) NOT NULL COMMENT 'SINGLE_CHOICE/MULTIPLE_CHOICE/SHORT_TEXT/LONG_TEXT/SCALE',
    title VARCHAR(500) NOT NULL COMMENT '题目标题',
    description VARCHAR(1000) DEFAULT NULL COMMENT '题目说明',
    required TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否必填',
    config JSON DEFAULT NULL COMMENT '题型配置 options/minChoices/placeholder/scaleMin 等',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_sq_survey (survey_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='题目表';

-- 答卷表
CREATE TABLE IF NOT EXISTS response (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    survey_id BIGINT NOT NULL COMMENT '问卷 id',
    user_id VARCHAR(50) DEFAULT NULL COMMENT '填写人 user id，匿名为 NULL',
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    duration_seconds INT DEFAULT NULL COMMENT '用时秒',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_response_survey (survey_id),
    KEY idx_response_user (user_id),
    KEY idx_response_survey_user (survey_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答卷表';

-- 答卷项表（每题一条）
CREATE TABLE IF NOT EXISTS response_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    response_id BIGINT NOT NULL COMMENT '答卷 id',
    question_id BIGINT NOT NULL COMMENT '题目 id',
    value_type VARCHAR(20) NOT NULL COMMENT 'OPTION/TEXT/SCALE',
    option_index INT DEFAULT NULL COMMENT '单选/量表：选项下标',
    option_indices VARCHAR(200) DEFAULT NULL COMMENT '多选：下标数组 JSON 如 [0,2]',
    text_value TEXT DEFAULT NULL COMMENT '填空/其他填空',
    scale_value INT DEFAULT NULL COMMENT '量表题分值',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_ri_response (response_id),
    KEY idx_ri_question (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='答卷项表';
