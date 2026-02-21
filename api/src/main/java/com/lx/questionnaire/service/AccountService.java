package com.lx.questionnaire.service;

import com.lx.questionnaire.entity.Account;

public interface AccountService {

    Account getByLoginIdAndAuthSource(String loginId, String authSource);

    /** 仅用于本地账号：按 loginId 查 auth_source=local 的账号并校验密码。 */
    boolean verifyPassword(String loginId, String rawPassword);
}
