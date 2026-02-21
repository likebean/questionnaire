-- 种子数据：角色、权限、角色-权限关联
-- 角色
INSERT INTO role (code, name, description, sort) VALUES
('SCHOOL_ADMIN', '校管', '校级管理员', 1),
('DEPT_ADMIN', '院系管理员', '院系管理员', 2),
('USER', '普通用户', '普通用户', 3);

-- 权限（resource_type, action, data_scope）
INSERT INTO permission (name, resource_type, action, data_scope, description) VALUES
('查看问卷(全校)', 'survey', 'view', 'SCHOOL', ''),
('查看问卷(本院系)', 'survey', 'view', 'DEPARTMENT', ''),
('查看问卷(本人)', 'survey', 'view', 'SELF', ''),
('创建问卷', 'survey', 'create', 'SELF', ''),
('编辑问卷', 'survey', 'edit', 'SELF', ''),
('发布/结束问卷', 'survey', 'publish', 'SELF', ''),
('查看答卷(全校)', 'response', 'view', 'SCHOOL', ''),
('查看答卷(本院系)', 'response', 'view', 'DEPARTMENT', ''),
('查看答卷(本人)', 'response', 'view', 'SELF', ''),
('导出答卷(本人)', 'response', 'export', 'SELF', ''),
('导出答卷(本院系)', 'response', 'export', 'DEPARTMENT', ''),
('查看院系(全校)', 'dept', 'view', 'SCHOOL', ''),
('查看院系(本院系)', 'dept', 'view', 'DEPARTMENT', ''),
('管理院系', 'dept', 'manage', 'SCHOOL', ''),
('查看角色', 'role', 'view', 'SCHOOL', ''),
('管理角色', 'role', 'manage', 'SCHOOL', ''),
('查看用户(全校)', 'user', 'view', 'SCHOOL', ''),
('查看用户(本院系)', 'user', 'view', 'DEPARTMENT', ''),
('管理用户', 'user', 'manage', 'SCHOOL', '');

-- 校管：全部权限（取 SCHOOL 范围及 manage）
INSERT INTO role_permission (role_id, permission_id)
SELECT 1, id FROM permission;

-- 院系管理员：本院系查看、本人创建/编辑/发布、本院系导出、本院系院系/用户查看
INSERT INTO role_permission (role_id, permission_id)
SELECT 2, id FROM permission WHERE (resource_type, action, data_scope) IN
(('survey','view','DEPARTMENT'),('survey','create','SELF'),('survey','edit','SELF'),('survey','publish','SELF'),
('response','view','DEPARTMENT'),('response','export','DEPARTMENT'),('response','export','SELF'),
('dept','view','DEPARTMENT'),('user','view','DEPARTMENT'));

-- 普通用户：SELF 范围
INSERT INTO role_permission (role_id, permission_id)
SELECT 3, id FROM permission WHERE data_scope = 'SELF';
