package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lx.questionnaire.entity.Account;
import com.lx.questionnaire.mapper.AccountMapper;
import com.lx.questionnaire.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountMapper accountMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public Account getByLoginIdAndAuthSource(String loginId, String authSource) {
        LambdaQueryWrapper<Account> q = new LambdaQueryWrapper<>();
        q.eq(Account::getLoginId, loginId).eq(Account::getAuthSource, authSource);
        return accountMapper.selectOne(q);
    }

    @Override
    public boolean verifyPassword(String loginId, String rawPassword) {
        Account account = getByLoginIdAndAuthSource(loginId, "local");
        if (account == null) {
            return false;
        }
        return passwordEncoder.matches(rawPassword, account.getPasswordHash());
    }
}
