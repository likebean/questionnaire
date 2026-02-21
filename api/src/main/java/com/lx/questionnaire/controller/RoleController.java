package com.lx.questionnaire.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.common.PaginatedResponse;
import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.entity.Role;
import com.lx.questionnaire.service.RoleService;
import com.lx.questionnaire.service.UserService;
import com.lx.questionnaire.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 角色管理（校管）：列表、详情、新增、编辑、删除、为角色分配权限。
 */
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private static final String ROLE_SCHOOL_ADMIN = "SCHOOL_ADMIN";

    private final RoleService roleService;
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
    public Result<PaginatedResponse<Role>> queryRoles(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        requireSchoolAdmin();
        Page<Role> pageResult = roleService.queryRoles(keyword, page, pageSize);
        return Result.ok(PaginatedResponse.from(pageResult));
    }

    @GetMapping("/{id}")
    public Result<Role> getById(@PathVariable Long id) {
        requireSchoolAdmin();
        return Result.ok(roleService.getById(id));
    }

    @PostMapping
    public Result<Role> create(@RequestBody Role role) {
        requireSchoolAdmin();
        return Result.ok(roleService.create(role));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Role role) {
        requireSchoolAdmin();
        roleService.update(id, role);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        requireSchoolAdmin();
        roleService.delete(id);
        return Result.ok();
    }

    @GetMapping("/{id}/permissions")
    public Result<List<Long>> getPermissionIds(@PathVariable Long id) {
        requireSchoolAdmin();
        return Result.ok(roleService.getPermissionIdsByRoleId(id));
    }

    @PutMapping("/{id}/permissions")
    public Result<Void> assignPermissions(@PathVariable Long id, @RequestBody List<Long> permissionIds) {
        requireSchoolAdmin();
        roleService.assignPermissions(id, permissionIds);
        return Result.ok();
    }
}
