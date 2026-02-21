package com.lx.questionnaire.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.entity.Account;
import com.lx.questionnaire.vo.CreateAccountVO;

import java.util.List;

public interface AccountService {

    Account getByLoginIdAndAuthSource(String loginId, String authSource);

    /** 按用户 ID 查询其下所有账号 */
    List<Account> getAccountsByUserId(String userId);

    /** 分页查询账号（关键词匹配 login_id 或 user_id） */
    Page<Account> queryAccounts(String keyword, int page, int pageSize);

    Account getById(Long id);

    void createAccount(CreateAccountVO vo);

    void deleteAccount(Long id);

    /** 仅用于本地账号：按 loginId 查 auth_source=local 的账号并校验密码。 */
    boolean verifyPassword(String loginId, String rawPassword);
}
