package com.lx.questionnaire.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.entity.Permission;

import java.util.List;

public interface PermissionService {

    Page<Permission> queryPermissions(String keyword, String resourceType, int page, int pageSize);

    Permission getById(Long id);

    /** 全部权限列表（用于角色分配权限时下拉/多选） */
    List<Permission> listAll();

    void update(Long id, Permission permission);
}
