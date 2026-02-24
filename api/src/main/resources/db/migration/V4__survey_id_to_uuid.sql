-- 问卷 id 改为 VARCHAR(36) UUID，不考虑已有数据，先清空再改类型

-- 1. 清空问卷相关表（答卷项 → 答卷 → 题目 → 问卷）
TRUNCATE TABLE response_item;
TRUNCATE TABLE response;
TRUNCATE TABLE survey_question;
TRUNCATE TABLE survey;

-- 2. survey：先去掉自增再删主键，再把 id 改为 VARCHAR(36)
ALTER TABLE survey MODIFY id BIGINT NOT NULL COMMENT '主键';
ALTER TABLE survey DROP PRIMARY KEY;
ALTER TABLE survey MODIFY id VARCHAR(36) NOT NULL COMMENT '主键 UUID';
ALTER TABLE survey ADD PRIMARY KEY (id);

-- 3. survey_question：survey_id 改为 VARCHAR(36)
ALTER TABLE survey_question MODIFY survey_id VARCHAR(36) NOT NULL COMMENT '问卷 id';

-- 4. response：survey_id 改为 VARCHAR(36)
ALTER TABLE response MODIFY survey_id VARCHAR(36) NOT NULL COMMENT '问卷 id';
