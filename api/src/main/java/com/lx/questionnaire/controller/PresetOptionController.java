package com.lx.questionnaire.controller;

import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.common.PaginatedResponse;
import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.dto.PresetOptionCategoryVO;
import com.lx.questionnaire.dto.PresetOptionGroupDetailVO;
import com.lx.questionnaire.dto.PresetOptionGroupUpsertDTO;
import com.lx.questionnaire.dto.PresetOptionGroupVO;
import com.lx.questionnaire.service.PresetOptionService;
import com.lx.questionnaire.service.UserService;
import com.lx.questionnaire.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 预定义选项库：系统管理端维护 + 问卷编辑端使用。
 */
@RestController
@RequestMapping("/api/preset-options")
@RequiredArgsConstructor
public class PresetOptionController {

    private static final String ROLE_SCHOOL_ADMIN = "SCHOOL_ADMIN";

    private final PresetOptionService presetOptionService;
    private final UserService userService;

    private String requireLogin() {
        String userId = SecurityUtils.getCurrentUserId();
        if (userId == null) throw new BusinessException(ErrorCode.UNAUTHORIZED);
        return userId;
    }

    private void requireSchoolAdmin() {
        String userId = requireLogin();
        List<String> roleCodes = userService.getRoleCodesByUserId(userId);
        if (roleCodes == null || !roleCodes.contains(ROLE_SCHOOL_ADMIN)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    /** 给问卷编辑端使用：按分类返回启用的预定义选项组（含明细） */
    @GetMapping("/tree")
    public Result<List<PresetOptionCategoryVO>> getEnabledTree() {
        requireLogin();
        return Result.ok(presetOptionService.getEnabledTree());
    }

    // ---------- 系统管理（校管） ----------

    @GetMapping("/query")
    public Result<PaginatedResponse<PresetOptionGroupVO>> query(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        requireSchoolAdmin();
        return Result.ok(presetOptionService.query(keyword, category, page, pageSize));
    }

    @GetMapping("/{id}")
    public Result<PresetOptionGroupDetailVO> getDetail(@PathVariable Long id) {
        requireSchoolAdmin();
        return Result.ok(presetOptionService.getDetail(id));
    }

    @PostMapping
    public Result<Long> create(@RequestBody PresetOptionGroupUpsertDTO dto) {
        requireSchoolAdmin();
        return Result.ok(presetOptionService.create(dto));
    }

    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @RequestBody PresetOptionGroupUpsertDTO dto) {
        requireSchoolAdmin();
        presetOptionService.update(id, dto);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        requireSchoolAdmin();
        presetOptionService.delete(id);
        return Result.ok();
    }
}

