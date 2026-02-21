package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lx.questionnaire.entity.Account;
import com.lx.questionnaire.entity.Role;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.entity.UserRole;
import com.lx.questionnaire.mapper.AccountMapper;
import com.lx.questionnaire.mapper.RoleMapper;
import com.lx.questionnaire.mapper.UserMapper;
import com.lx.questionnaire.mapper.UserRoleMapper;
import com.lx.questionnaire.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String AUTH_SOURCE_CAS = "cas";
    private static final String DEFAULT_ROLE_CODE = "USER";

    private final UserMapper userMapper;
    private final AccountMapper accountMapper;
    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public User findOrCreateUserByCasLoginId(String loginId) {
        Account account = accountMapper.selectOne(
                new LambdaQueryWrapper<Account>()
                        .eq(Account::getLoginId, loginId)
                        .eq(Account::getAuthSource, AUTH_SOURCE_CAS));
        if (account != null) {
            return userMapper.selectById(account.getUserId());
        }
        String userId = "u-" + UUID.randomUUID().toString().replace("-", "").substring(0, 24);
        User user = new User();
        user.setId(userId);
        user.setNickname(loginId);
        userMapper.insert(user);

        Account newAccount = new Account();
        newAccount.setUserId(userId);
        newAccount.setLoginId(loginId);
        newAccount.setAuthSource(AUTH_SOURCE_CAS);
        accountMapper.insert(newAccount);

        Role defaultRole = roleMapper.selectOne(
                new LambdaQueryWrapper<Role>().eq(Role::getCode, DEFAULT_ROLE_CODE));
        if (defaultRole != null) {
            UserRole ur = new UserRole();
            ur.setUserId(userId);
            ur.setRoleId(defaultRole.getId());
            userRoleMapper.insert(ur);
        }
        return user;
    }
}
