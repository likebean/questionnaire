package com.lx.questionnaire.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.PaginatedResponse;
import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.service.UserService;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 用户管理（校管）：列表、详情、创建、更新、删除。
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private static final String ROLE_SCHOOL_ADMIN = "SCHOOL_ADMIN";

    private final UserService userService;

    private void requireSchoolAdmin() {
        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        List<String> roleCodes = userService.getRoleCodesByUserId(userId);
        if (roleCodes == null || !roleCodes.contains(ROLE_SCHOOL_ADMIN)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    @GetMapping("/query")
    public Result<PaginatedResponse<User>> queryUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        requireSchoolAdmin();
        Page<User> pageResult = userService.queryUsers(keyword, departmentId, page, pageSize);
        return Result.ok(PaginatedResponse.from(pageResult));
    }

    @GetMapping("/{id}")
    public Result<User> getUserById(@PathVariable String id) {
        requireSchoolAdmin();
        User user = userService.getById(id);
        if (user == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return Result.ok(user);
    }

    @PostMapping
    public Result<Void> createUser(@RequestBody User user) {
        requireSchoolAdmin();
        userService.createUser(user);
        return Result.ok();
    }

    @PutMapping("/{id}")
    public Result<Void> updateUser(@PathVariable String id, @RequestBody User user) {
        requireSchoolAdmin();
        userService.updateUser(id, user);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteUser(@PathVariable String id) {
        requireSchoolAdmin();
        userService.deleteUser(id);
        return Result.ok();
    }

    @GetMapping("/{id}/roles")
    public Result<List<Long>> getUserRoleIds(@PathVariable String id) {
        requireSchoolAdmin();
        if (userService.getById(id) == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        return Result.ok(userService.getRoleIdsByUserId(id));
    }

    @PutMapping("/{id}/roles")
    public Result<Void> setUserRoles(@PathVariable String id, @RequestBody List<Long> roleIds) {
        requireSchoolAdmin();
        userService.setUserRoles(id, roleIds);
        return Result.ok();
    }
}
