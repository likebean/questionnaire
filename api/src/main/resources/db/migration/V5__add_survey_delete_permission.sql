-- 删除问卷权限（SELF），并分配给校管、普通用户
INSERT INTO permission (name, resource_type, action, data_scope, description) VALUES
('删除问卷', 'survey', 'delete', 'SELF', '');

INSERT INTO role_permission (role_id, permission_id)
SELECT 1, id FROM permission WHERE resource_type = 'survey' AND action = 'delete' AND data_scope = 'SELF';

INSERT INTO role_permission (role_id, permission_id)
SELECT 3, id FROM permission WHERE resource_type = 'survey' AND action = 'delete' AND data_scope = 'SELF';
