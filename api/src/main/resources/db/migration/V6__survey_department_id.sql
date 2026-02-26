-- 问卷表增加归属院系：创建时写入，不跟人走；null 表示无部门/仅本人可见
-- 幂等：列已存在则跳过（兼容重复执行或测试环境）
DELIMITER //
DROP PROCEDURE IF EXISTS add_survey_department_id_if_not_exists//
CREATE PROCEDURE add_survey_department_id_if_not_exists()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'survey' AND COLUMN_NAME = 'department_id'
  ) THEN
    ALTER TABLE survey ADD COLUMN department_id BIGINT NULL COMMENT '问卷归属院系，创建时写入；null 表示无部门/仅本人可见' AFTER creator_id;
  END IF;
END//
DELIMITER ;
CALL add_survey_department_id_if_not_exists();
DROP PROCEDURE IF EXISTS add_survey_department_id_if_not_exists;

-- 历史数据按创建人当前部门回填（可选）
UPDATE survey s INNER JOIN user u ON s.creator_id = u.id SET s.department_id = u.department_id WHERE s.department_id IS NULL;
