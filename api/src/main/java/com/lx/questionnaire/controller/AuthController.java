package com.lx.questionnaire.controller;

import com.lx.questionnaire.common.Result;
import com.lx.questionnaire.config.CasProperties;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.security.CurrentUserDetails;
import com.lx.questionnaire.service.AuthService;
import com.lx.questionnaire.service.CasValidateService;
import com.lx.questionnaire.service.UserService;
import com.lx.questionnaire.vo.CurrentUserVO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final AuthService authService;
    private final CasValidateService casValidateService;
    private final CasProperties casProperties;

    @GetMapping("/me")
    public Result<CurrentUserVO> getCurrentUser() {
        String userId = getCurrentUserId();
        if (userId == null) {
            return Result.fail(401, "未登录");
        }
        User user = userService.getById(userId);
        if (user == null) {
            return Result.fail(404, "用户不存在");
        }
        List<String> roleCodes = userService.getRoleCodesByUserId(userId);
        CurrentUserVO vo = new CurrentUserVO();
        vo.setId(user.getId());
        vo.setNickname(user.getNickname());
        vo.setEmail(user.getEmail());
        vo.setPhone(user.getPhone());
        vo.setIdentityType(user.getIdentityType());
        vo.setDepartmentId(user.getDepartmentId());
        vo.setRoleCodes(roleCodes);
        return Result.ok(vo);
    }

    /**
     * 跳转 CAS 登录页。前端「统一身份登录」链接到此地址。
     */
    @GetMapping("/cas/login")
    public void casLogin(HttpServletResponse response) throws IOException {
        String service = casProperties.getServiceCallbackUrl();
        if (service == null || service.isBlank()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "CAS not configured");
            return;
        }
        String redirect = casProperties.getServerUrl().replaceAll("/$", "")
                + casProperties.getLoginPath()
                + "?service=" + URLEncoder.encode(service, StandardCharsets.UTF_8);
        response.sendRedirect(redirect);
    }

    /**
     * CAS 回调：用 ticket 换 login_id，查/建 user，写入会话并重定向到前端。
     */
    @GetMapping("/cas/callback")
    public void casCallback(
            @RequestParam(value = "ticket", required = false) String ticket,
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        String loginId = casValidateService.validateTicketAndGetLoginId(ticket);
        if (loginId == null) {
            log.warn("CAS validate failed, ticket present: {}", ticket != null);
            redirectToFrontendWithError(response, "CAS 认证失败");
            return;
        }
        User user = authService.findOrCreateUserByCasLoginId(loginId);
        CurrentUserDetails details = new CurrentUserDetails(user.getId(), "");
        org.springframework.security.authentication.UsernamePasswordAuthenticationToken token =
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                        details, null, details.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(token);
        request.getSession(true);
        String redirectUrl = casProperties.getFrontendRedirectUrl();
        if (redirectUrl == null || redirectUrl.isBlank()) {
            redirectUrl = "http://localhost:3000";
        }
        response.sendRedirect(redirectUrl);
    }

    private void redirectToFrontendWithError(HttpServletResponse response, String message) throws IOException {
        String base = casProperties.getFrontendRedirectUrl();
        if (base == null) base = "http://localhost:3000";
        String url = base + "/auth/login?error=" + URLEncoder.encode(message, StandardCharsets.UTF_8);
        response.sendRedirect(url);
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof CurrentUserDetails)) {
            return null;
        }
        return ((CurrentUserDetails) auth.getPrincipal()).getUsername();
    }
}
