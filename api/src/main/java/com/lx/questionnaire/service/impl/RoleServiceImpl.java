package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.entity.Role;
import com.lx.questionnaire.entity.RolePermission;
import com.lx.questionnaire.entity.UserRole;
import com.lx.questionnaire.mapper.RoleMapper;
import com.lx.questionnaire.mapper.RolePermissionMapper;
import com.lx.questionnaire.mapper.UserRoleMapper;
import com.lx.questionnaire.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleMapper roleMapper;
    private final RolePermissionMapper rolePermissionMapper;
    private final UserRoleMapper userRoleMapper;

    @Override
    public Page<Role> queryRoles(String keyword, int page, int pageSize) {
        Page<Role> p = new Page<>(page, pageSize);
        LambdaQueryWrapper<Role> q = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            q.and(w -> w.like(Role::getCode, keyword).or().like(Role::getName, keyword));
        }
        q.orderByAsc(Role::getSort).orderByAsc(Role::getId);
        return roleMapper.selectPage(p, q);
    }

    @Override
    public Role getById(Long id) {
        Role role = roleMapper.selectById(id);
        if (role == null) {
            throw new BusinessException(new ErrorCode(2006, "角色不存在") {});
        }
        return role;
    }

    @Override
    public Role create(Role role) {
        LambdaQueryWrapper<Role> q = new LambdaQueryWrapper<>();
        q.eq(Role::getCode, role.getCode());
        if (roleMapper.selectCount(q) > 0) {
            throw new BusinessException(new ErrorCode(2007, "角色编码已存在") {});
        }
        roleMapper.insert(role);
        return role;
    }

    @Override
    public void update(Long id, Role role) {
        getById(id);
        role.setId(id);
        roleMapper.updateById(role);
    }

    @Override
    public void delete(Long id) {
        getById(id);
        long count = userRoleMapper.selectCount(new LambdaQueryWrapper<UserRole>().eq(UserRole::getRoleId, id));
        if (count > 0) {
            throw new BusinessException(new ErrorCode(2008, "该角色下尚有用户，无法删除") {});
        }
        rolePermissionMapper.delete(new LambdaQueryWrapper<RolePermission>().eq(RolePermission::getRoleId, id));
        roleMapper.deleteById(id);
    }

    @Override
    public List<Long> getPermissionIdsByRoleId(Long roleId) {
        List<RolePermission> list = rolePermissionMapper.selectList(
                new LambdaQueryWrapper<RolePermission>().eq(RolePermission::getRoleId, roleId));
        return list.stream().map(RolePermission::getPermissionId).toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void assignPermissions(Long roleId, List<Long> permissionIds) {
        getById(roleId);
        rolePermissionMapper.delete(new LambdaQueryWrapper<RolePermission>().eq(RolePermission::getRoleId, roleId));
        if (permissionIds != null && !permissionIds.isEmpty()) {
            for (Long permissionId : permissionIds) {
                RolePermission rp = new RolePermission();
                rp.setRoleId(roleId);
                rp.setPermissionId(permissionId);
                rolePermissionMapper.insert(rp);
            }
        }
    }
}
