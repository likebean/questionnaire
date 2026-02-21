package com.lx.questionnaire.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lx.questionnaire.entity.Account;
import com.lx.questionnaire.entity.Role;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.entity.UserRole;
import com.lx.questionnaire.mapper.AccountMapper;
import com.lx.questionnaire.mapper.RoleMapper;
import com.lx.questionnaire.mapper.UserMapper;
import com.lx.questionnaire.mapper.UserRoleMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 开发环境：若不存在本地账号则创建一条（login_id=admin, password=admin123），便于本地登录测试。
 */
@Slf4j
@Component
@Profile("default")
@RequiredArgsConstructor
public class DevUserInitializer implements ApplicationRunner {

    private static final String DEV_USER_ID = "dev-admin";
    private static final String DEV_LOGIN_ID = "admin";
    private static final String DEV_PASSWORD = "admin123";

    private final AccountMapper accountMapper;
    private final UserMapper userMapper;
    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        Account existing = accountMapper.selectOne(
                new LambdaQueryWrapper<Account>()
                        .eq(Account::getLoginId, DEV_LOGIN_ID)
                        .eq(Account::getAuthSource, "local"));
        if (existing != null) {
            return;
        }
        if (userMapper.selectById(DEV_USER_ID) == null) {
            User user = new User();
            user.setId(DEV_USER_ID);
            user.setNickname("开发管理员");
            userMapper.insert(user);
            log.info("Created dev user: {}", DEV_USER_ID);
        }
        Account account = new Account();
        account.setUserId(DEV_USER_ID);
        account.setLoginId(DEV_LOGIN_ID);
        account.setAuthSource("local");
        account.setPasswordHash(passwordEncoder.encode(DEV_PASSWORD));
        accountMapper.insert(account);
        Role userRole = roleMapper.selectOne(new LambdaQueryWrapper<Role>().eq(Role::getCode, "USER"));
        if (userRole != null) {
            Long cnt = userRoleMapper.selectCount(
                    new LambdaQueryWrapper<UserRole>()
                            .eq(UserRole::getUserId, DEV_USER_ID)
                            .eq(UserRole::getRoleId, userRole.getId()));
            if (cnt == 0) {
                UserRole ur = new UserRole();
                ur.setUserId(DEV_USER_ID);
                ur.setRoleId(userRole.getId());
                userRoleMapper.insert(ur);
            }
        }
        log.info("Created dev local account: {} / {}", DEV_LOGIN_ID, DEV_PASSWORD);
    }
}
