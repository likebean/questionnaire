-- 问卷表增加归属院系：创建时写入，不跟人走；null 表示无部门/仅本人可见
ALTER TABLE survey ADD COLUMN department_id BIGINT NULL COMMENT '问卷归属院系，创建时写入；null 表示无部门/仅本人可见' AFTER creator_id;

-- 历史数据按创建人当前部门回填（可选）
UPDATE survey s INNER JOIN user u ON s.creator_id = u.id SET s.department_id = u.department_id WHERE s.department_id IS NULL;
