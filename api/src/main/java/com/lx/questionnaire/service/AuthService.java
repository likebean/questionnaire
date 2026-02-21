package com.lx.questionnaire.service;

import com.lx.questionnaire.entity.User;

/**
 * CAS 首次登录时建 user + account(cas)，并分配默认角色。
 */
public interface AuthService {

    /**
     * 根据 CAS login_id 查找或创建用户。若 account(cas) 已存在则返回对应用户；否则创建 user、account(cas)、user_role(默认 USER)。
     */
    User findOrCreateUserByCasLoginId(String loginId);
}
