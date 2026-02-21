package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.entity.Permission;
import com.lx.questionnaire.mapper.PermissionMapper;
import com.lx.questionnaire.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionMapper permissionMapper;

    @Override
    public Page<Permission> queryPermissions(String keyword, String resourceType, int page, int pageSize) {
        Page<Permission> p = new Page<>(page, pageSize);
        LambdaQueryWrapper<Permission> q = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            q.and(w -> w.like(Permission::getName, keyword)
                    .or().like(Permission::getResourceType, keyword)
                    .or().like(Permission::getAction, keyword));
        }
        if (StringUtils.hasText(resourceType)) {
            q.eq(Permission::getResourceType, resourceType);
        }
        q.orderByAsc(Permission::getResourceType).orderByAsc(Permission::getAction).orderByAsc(Permission::getDataScope);
        return permissionMapper.selectPage(p, q);
    }

    @Override
    public Permission getById(Long id) {
        Permission p = permissionMapper.selectById(id);
        if (p == null) {
            throw new BusinessException(new ErrorCode(2009, "权限不存在") {});
        }
        return p;
    }

    @Override
    public List<Permission> listAll() {
        return permissionMapper.selectList(
                new LambdaQueryWrapper<Permission>()
                        .orderByAsc(Permission::getResourceType)
                        .orderByAsc(Permission::getAction)
                        .orderByAsc(Permission::getDataScope));
    }
}
