-- 预置一批常用的预定义选项（仅在选项库为空时写入）

INSERT INTO preset_option_group (id, category, name, sort, enabled)
SELECT id, category, name, sort, enabled
FROM (
    SELECT 1  AS id, '常用' AS category, '满意度' AS name, 0 AS sort, 1 AS enabled
    UNION ALL SELECT 2, '性别', '性别', 0, 1
    UNION ALL SELECT 3, '学历', '学历', 0, 1
    UNION ALL SELECT 4, '是非', '是非', 0, 1
    UNION ALL SELECT 5, '月份', '月份', 0, 1
    UNION ALL SELECT 6, '数字', '1-10', 0, 1
) seed
WHERE NOT EXISTS (SELECT 1 FROM preset_option_group LIMIT 1);

INSERT INTO preset_option_item (group_id, sort_order, label, allow_fill, description_open_in_popup)
SELECT group_id, sort_order, label, allow_fill, description_open_in_popup
FROM (
    -- 满意度
    SELECT 1 AS group_id, 0 AS sort_order, '非常满意' AS label, 0 AS allow_fill, 0 AS description_open_in_popup
    UNION ALL SELECT 1, 1, '满意', 0, 0
    UNION ALL SELECT 1, 2, '一般', 0, 0
    UNION ALL SELECT 1, 3, '不满意', 0, 0
    UNION ALL SELECT 1, 4, '非常不满意', 0, 0

    -- 性别
    UNION ALL SELECT 2, 0, '男', 0, 0
    UNION ALL SELECT 2, 1, '女', 0, 0

    -- 学历
    UNION ALL SELECT 3, 0, '初中及以下', 0, 0
    UNION ALL SELECT 3, 1, '高中/中专', 0, 0
    UNION ALL SELECT 3, 2, '大专', 0, 0
    UNION ALL SELECT 3, 3, '本科', 0, 0
    UNION ALL SELECT 3, 4, '硕士', 0, 0
    UNION ALL SELECT 3, 5, '博士及以上', 0, 0

    -- 是非
    UNION ALL SELECT 4, 0, '是', 0, 0
    UNION ALL SELECT 4, 1, '否', 0, 0

    -- 月份
    UNION ALL SELECT 5, 0, '1月', 0, 0
    UNION ALL SELECT 5, 1, '2月', 0, 0
    UNION ALL SELECT 5, 2, '3月', 0, 0
    UNION ALL SELECT 5, 3, '4月', 0, 0
    UNION ALL SELECT 5, 4, '5月', 0, 0
    UNION ALL SELECT 5, 5, '6月', 0, 0
    UNION ALL SELECT 5, 6, '7月', 0, 0
    UNION ALL SELECT 5, 7, '8月', 0, 0
    UNION ALL SELECT 5, 8, '9月', 0, 0
    UNION ALL SELECT 5, 9, '10月', 0, 0
    UNION ALL SELECT 5, 10, '11月', 0, 0
    UNION ALL SELECT 5, 11, '12月', 0, 0

    -- 数字 1-10
    UNION ALL SELECT 6, 0, '1', 0, 0
    UNION ALL SELECT 6, 1, '2', 0, 0
    UNION ALL SELECT 6, 2, '3', 0, 0
    UNION ALL SELECT 6, 3, '4', 0, 0
    UNION ALL SELECT 6, 4, '5', 0, 0
    UNION ALL SELECT 6, 5, '6', 0, 0
    UNION ALL SELECT 6, 6, '7', 0, 0
    UNION ALL SELECT 6, 7, '8', 0, 0
    UNION ALL SELECT 6, 8, '9', 0, 0
    UNION ALL SELECT 6, 9, '10', 0, 0
) seed
WHERE NOT EXISTS (SELECT 1 FROM preset_option_item LIMIT 1);

