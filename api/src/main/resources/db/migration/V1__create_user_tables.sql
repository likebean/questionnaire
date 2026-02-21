-- 用户、账号、角色、权限、院系表（无 status/deleted，物理删除）
-- 与《用户与权限设计讨论》一致

-- 院系表
CREATE TABLE IF NOT EXISTS department (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    code VARCHAR(64) NOT NULL COMMENT '院系编码，唯一',
    name VARCHAR(128) NOT NULL COMMENT '名称',
    parent_id BIGINT DEFAULT NULL COMMENT '父院系 id，NULL 表示根',
    level INT DEFAULT NULL COMMENT '层级',
    sort INT DEFAULT 0 COMMENT '同级排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_department_code (code),
    KEY idx_department_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='院系表';

-- 用户表（人员，不存登录凭证）
CREATE TABLE IF NOT EXISTS `user` (
    id VARCHAR(50) NOT NULL COMMENT '主键',
    nickname VARCHAR(64) DEFAULT NULL COMMENT '昵称/姓名',
    email VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
    phone VARCHAR(32) DEFAULT NULL COMMENT '手机',
    identity_type VARCHAR(32) DEFAULT NULL COMMENT 'FACULTY/STUDENT/OTHER',
    department_id BIGINT DEFAULT NULL COMMENT '所属院系 id',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creator VARCHAR(50) DEFAULT NULL,
    updator VARCHAR(50) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_user_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 账号表（login_id + auth_source）
CREATE TABLE IF NOT EXISTS account (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    user_id VARCHAR(50) NOT NULL COMMENT '用户 id',
    login_id VARCHAR(100) NOT NULL COMMENT '登录标识',
    auth_source VARCHAR(20) NOT NULL COMMENT 'local/cas',
    password_hash VARCHAR(255) DEFAULT NULL COMMENT 'local 时必填',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creator VARCHAR(50) DEFAULT NULL,
    updator VARCHAR(50) DEFAULT NULL,
    UNIQUE KEY uk_login_id_auth_source (login_id, auth_source),
    KEY idx_account_user_id (user_id),
    KEY idx_account_auth_source (auth_source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='账号表';

-- 角色表
CREATE TABLE IF NOT EXISTS role (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    code VARCHAR(50) NOT NULL COMMENT '角色编码',
    name VARCHAR(100) NOT NULL COMMENT '显示名',
    description VARCHAR(500) DEFAULT NULL,
    sort INT DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creator VARCHAR(50) DEFAULT NULL,
    updator VARCHAR(50) DEFAULT NULL,
    UNIQUE KEY uk_role_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';

-- 权限表（resource_type + action + data_scope）
CREATE TABLE IF NOT EXISTS permission (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键',
    name VARCHAR(100) NOT NULL COMMENT '权限名称',
    resource_type VARCHAR(50) NOT NULL COMMENT '资源类型',
    action VARCHAR(50) NOT NULL COMMENT '操作',
    data_scope VARCHAR(20) NOT NULL COMMENT 'SCHOOL/DEPARTMENT/SELF',
    description VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creator VARCHAR(50) DEFAULT NULL,
    updator VARCHAR(50) DEFAULT NULL,
    UNIQUE KEY uk_permission_scope (resource_type, action, data_scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';

-- 角色-权限关联表
CREATE TABLE IF NOT EXISTS role_permission (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creator VARCHAR(50) DEFAULT NULL,
    updator VARCHAR(50) DEFAULT NULL,
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    KEY idx_rp_role (role_id),
    KEY idx_rp_permission (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';

-- 用户-角色关联表
CREATE TABLE IF NOT EXISTS user_role (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    role_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    creator VARCHAR(50) DEFAULT NULL,
    updator VARCHAR(50) DEFAULT NULL,
    UNIQUE KEY uk_user_role (user_id, role_id),
    KEY idx_ur_user (user_id),
    KEY idx_ur_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';
