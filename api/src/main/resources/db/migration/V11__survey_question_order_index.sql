-- 避免按问卷查询题目时触发 filesort，降低 sort_buffer 内存压力
ALTER TABLE survey_question
    ADD INDEX idx_sq_survey_sort (survey_id, sort_order);
