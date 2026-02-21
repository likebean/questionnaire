package com.lx.questionnaire.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.common.PaginatedResponse;
import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.entity.Permission;
import com.lx.questionnaire.service.PermissionService;
import com.lx.questionnaire.service.UserService;
import com.lx.questionnaire.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 权限管理（校管）：列表、详情、全部列表（供角色分配时使用）。
 */
@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private static final String ROLE_SCHOOL_ADMIN = "SCHOOL_ADMIN";

    private final PermissionService permissionService;
    private final UserService userService;

    private void requireSchoolAdmin() {
        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        List<String> roleCodes = userService.getRoleCodesByUserId(userId);
        if (roleCodes == null || !roleCodes.contains(ROLE_SCHOOL_ADMIN)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    @GetMapping("/query")
    public Result<PaginatedResponse<Permission>> queryPermissions(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String resourceType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        requireSchoolAdmin();
        Page<Permission> pageResult = permissionService.queryPermissions(keyword, resourceType, page, pageSize);
        return Result.ok(PaginatedResponse.from(pageResult));
    }

    @GetMapping("/all")
    public Result<List<Permission>> listAll() {
        requireSchoolAdmin();
        return Result.ok(permissionService.listAll());
    }

    @GetMapping("/{id}")
    public Result<Permission> getById(@PathVariable Long id) {
        requireSchoolAdmin();
        return Result.ok(permissionService.getById(id));
    }
}
