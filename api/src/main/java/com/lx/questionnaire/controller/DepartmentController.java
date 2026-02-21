package com.lx.questionnaire.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.common.PaginatedResponse;
import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.entity.Department;
import com.lx.questionnaire.service.DepartmentService;
import com.lx.questionnaire.service.UserService;
import com.lx.questionnaire.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 院系管理（校管）：列表、全部、详情、新增、编辑、删除。
 */
@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private static final String ROLE_SCHOOL_ADMIN = "SCHOOL_ADMIN";

    private final DepartmentService departmentService;
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
    public Result<PaginatedResponse<Department>> query(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        requireSchoolAdmin();
        Page<Department> pageResult = departmentService.queryDepartments(keyword, page, pageSize);
        return Result.ok(PaginatedResponse.from(pageResult));
    }

    @GetMapping("/all")
    public Result<List<Department>> listAll() {
        requireSchoolAdmin();
        return Result.ok(departmentService.listAll());
    }

    @GetMapping("/{id}")
    public Result<Department> getById(@PathVariable Long id) {
        requireSchoolAdmin();
        return Result.ok(departmentService.getById(id));
    }

    @PostMapping
    public Result<Department> create(@RequestBody Department department) {
        requireSchoolAdmin();
        return Result.ok(departmentService.create(department));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody Department department) {
        requireSchoolAdmin();
        departmentService.update(id, department);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        requireSchoolAdmin();
        departmentService.delete(id);
        return Result.ok();
    }
}
