-- 预定义选项库：分组 + 选项明细（用于问卷编辑时快速插入）

CREATE TABLE IF NOT EXISTS preset_option_group (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    category VARCHAR(50) NOT NULL COMMENT '分类，如 常用/性别/学历',
    name VARCHAR(100) NOT NULL COMMENT '预定义组名称（按钮文案）',
    sort INT DEFAULT 0 COMMENT '排序',
    enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_pog_category (category),
    KEY idx_pog_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预定义选项分组';

CREATE TABLE IF NOT EXISTS preset_option_item (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    group_id BIGINT NOT NULL COMMENT '分组 id',
    sort_order INT DEFAULT 0 COMMENT '组内排序',
    label VARCHAR(200) NOT NULL COMMENT '选项文案',
    allow_fill TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否允许填空',
    description TEXT DEFAULT NULL COMMENT '选项说明（文字或链接）',
    description_open_in_popup TINYINT(1) NOT NULL DEFAULT 0 COMMENT '说明链接是否弹窗打开',
    image_url VARCHAR(500) DEFAULT NULL COMMENT '图片外链',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_poi_group (group_id),
    CONSTRAINT fk_poi_group FOREIGN KEY (group_id) REFERENCES preset_option_group(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预定义选项明细';

