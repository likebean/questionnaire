package com.lx.questionnaire.security;

import com.lx.questionnaire.entity.Account;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.service.AccountService;
import com.lx.questionnaire.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LocalAccountUserDetailsService implements UserDetailsService {

    private static final String AUTH_SOURCE_LOCAL = "local";

    private final AccountService accountService;
    private final UserService userService;

    @Override
    public CurrentUserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Account account = accountService.getByLoginIdAndAuthSource(username, AUTH_SOURCE_LOCAL);
        if (account == null) {
            throw new UsernameNotFoundException("Local account not found: " + username);
        }
        User user = userService.getById(account.getUserId());
        if (user == null) {
            throw new UsernameNotFoundException("User not found for account: " + username);
        }
        return new CurrentUserDetails(user.getId(), account.getPasswordHash());
    }
}
