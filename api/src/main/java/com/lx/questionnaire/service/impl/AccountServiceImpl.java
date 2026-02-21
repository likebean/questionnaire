package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.entity.Account;
import com.lx.questionnaire.mapper.AccountMapper;
import com.lx.questionnaire.service.AccountService;
import com.lx.questionnaire.service.UserService;
import com.lx.questionnaire.vo.CreateAccountVO;
import com.lx.questionnaire.vo.UpdateAccountVO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountMapper accountMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserService userService;

    @Override
    public Account getByLoginIdAndAuthSource(String loginId, String authSource) {
        LambdaQueryWrapper<Account> q = new LambdaQueryWrapper<>();
        q.eq(Account::getLoginId, loginId).eq(Account::getAuthSource, authSource);
        return accountMapper.selectOne(q);
    }

    @Override
    public List<Account> getAccountsByUserId(String userId) {
        LambdaQueryWrapper<Account> q = new LambdaQueryWrapper<>();
        q.eq(Account::getUserId, userId).orderByAsc(Account::getAuthSource).orderByAsc(Account::getLoginId);
        return accountMapper.selectList(q);
    }

    @Override
    public Page<Account> queryAccounts(String keyword, int page, int pageSize) {
        Page<Account> p = new Page<>(page, pageSize);
        LambdaQueryWrapper<Account> q = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            q.and(w -> w.like(Account::getLoginId, keyword).or().like(Account::getUserId, keyword));
        }
        q.orderByDesc(Account::getCreatedAt);
        return accountMapper.selectPage(p, q);
    }

    @Override
    public Account getById(Long id) {
        Account account = accountMapper.selectById(id);
        if (account == null) {
            throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
        }
        return account;
    }

    @Override
    public void createAccount(CreateAccountVO vo) {
        if (userService.getById(vo.getUserId()) == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        Account existing = getByLoginIdAndAuthSource(vo.getLoginId(), vo.getAuthSource());
        if (existing != null) {
            throw new BusinessException(new ErrorCode(2005, "该登录标识已存在") {});
        }
        Account account = new Account();
        account.setUserId(vo.getUserId());
        account.setLoginId(vo.getLoginId());
        account.setAuthSource(vo.getAuthSource());
        if ("local".equalsIgnoreCase(vo.getAuthSource())) {
            if (!StringUtils.hasText(vo.getPassword())) {
                throw new BusinessException(new ErrorCode(1001, "本地账号密码不能为空") {});
            }
            account.setPasswordHash(passwordEncoder.encode(vo.getPassword()));
        } else {
            account.setPasswordHash(null);
        }
        accountMapper.insert(account);
    }

    @Override
    public void updateAccount(Long id, UpdateAccountVO vo) {
        Account account = getById(id);
        if (StringUtils.hasText(vo.getLoginId())) {
            Account existing = getByLoginIdAndAuthSource(vo.getLoginId(), account.getAuthSource());
            if (existing != null && !existing.getId().equals(id)) {
                throw new BusinessException(new ErrorCode(2005, "该登录标识已存在") {});
            }
            account.setLoginId(vo.getLoginId().trim());
        }
        if ("local".equalsIgnoreCase(account.getAuthSource()) && StringUtils.hasText(vo.getPassword())) {
            account.setPasswordHash(passwordEncoder.encode(vo.getPassword()));
        }
        accountMapper.updateById(account);
    }

    @Override
    public void deleteAccount(Long id) {
        getById(id);
        accountMapper.deleteById(id);
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
