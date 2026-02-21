package com.lx.questionnaire.util;

import com.lx.questionnaire.security.CurrentUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 安全相关工具类（参考 ai-plugin）
 */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /**
     * 获取当前登录用户 ID（principal 为 CurrentUserDetails 时返回 userId，否则 null）
     */
    public static String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof CurrentUserDetails) {
            return ((CurrentUserDetails) principal).getUsername();
        }
        return null;
    }
}
