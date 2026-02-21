package com.lx.questionnaire.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.common.PaginatedResponse;
import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.entity.Account;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.service.AccountService;
import com.lx.questionnaire.service.UserService;
import com.lx.questionnaire.util.SecurityUtils;
import com.lx.questionnaire.vo.CreateAccountVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 账号管理（校管）：列表、详情、按用户查账号、创建、删除。
 */
@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private static final String ROLE_SCHOOL_ADMIN = "SCHOOL_ADMIN";

    private final AccountService accountService;
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
    public Result<PaginatedResponse<Account>> queryAccounts(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        requireSchoolAdmin();
        Page<Account> pageResult = accountService.queryAccounts(keyword, page, pageSize);
        return Result.ok(PaginatedResponse.from(pageResult));
    }

    @GetMapping("/{id}")
    public Result<Account> getAccountById(@PathVariable Long id) {
        requireSchoolAdmin();
        return Result.ok(accountService.getById(id));
    }

    @GetMapping("/user/{userId}")
    public Result<List<Account>> getAccountsByUserId(@PathVariable String userId) {
        requireSchoolAdmin();
        return Result.ok(accountService.getAccountsByUserId(userId));
    }

    @PostMapping
    public Result<Void> createAccount(@Valid @RequestBody CreateAccountVO vo) {
        requireSchoolAdmin();
        accountService.createAccount(vo);
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteAccount(@PathVariable Long id) {
        requireSchoolAdmin();
        accountService.deleteAccount(id);
        return Result.ok();
    }
}
