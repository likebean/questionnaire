package com.lx.questionnaire.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "cas")
public class CasProperties {
    /** CAS 服务端根 URL，如 https://cas.example.edu */
    private String serverUrl = "https://cas.example.edu";
    /** 登录路径，如 /cas/login */
    private String loginPath = "/cas/login";
    /** 登出路径 */
    private String logoutPath = "/cas/logout";
    /** 本系统回调 URL（CAS 校验 ticket 时用），如 http://localhost:3000/api/auth/cas/callback */
    private String serviceCallbackUrl;
    /** 回调成功后重定向到的前端地址，如 http://localhost:3000 */
    private String frontendRedirectUrl = "http://localhost:3000";
}
