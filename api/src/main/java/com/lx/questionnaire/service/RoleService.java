package com.lx.questionnaire.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.entity.Role;

import java.util.List;

public interface RoleService {

    Page<Role> queryRoles(String keyword, int page, int pageSize);

    Role getById(Long id);

    Role create(Role role);

    void update(Long id, Role role);

    void delete(Long id);

    /** 获取角色已分配的权限 ID 列表 */
    List<Long> getPermissionIdsByRoleId(Long roleId);

    /** 为角色分配权限（覆盖原有） */
    void assignPermissions(Long roleId, List<Long> permissionIds);
}
