package com.lx.questionnaire.service.impl;

import com.lx.questionnaire.config.CasProperties;
import com.lx.questionnaire.service.CasValidateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * CAS 2.0 协议：GET /cas/serviceValidate?service=xxx&ticket=xxx 返回 XML，内含 &lt;cas:user&gt;login_id&lt;/cas:user&gt;
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CasValidateServiceImpl implements CasValidateService {

    private static final Pattern CAS_USER_PATTERN = Pattern.compile("<cas:user>([^<]+)</cas:user>");

    private final CasProperties casProperties;
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    public String validateTicketAndGetLoginId(String ticket) {
        if (ticket == null || ticket.isBlank()) {
            return null;
        }
        // 开发用：ticket=dev-xxx 直接当作 login_id（无需真实 CAS 服务）
        if (ticket.startsWith("dev-")) {
            return ticket.substring(4).trim();
        }
        String serviceUrl = casProperties.getServiceCallbackUrl();
        if (serviceUrl == null || serviceUrl.isBlank()) {
            log.warn("cas.service-callback-url not set, CAS validate skipped");
            return null;
        }
        String validateUrl = casProperties.getServerUrl().replaceAll("/$", "")
                + "/serviceValidate"
                + "?service=" + java.net.URLEncoder.encode(serviceUrl, StandardCharsets.UTF_8)
                + "&ticket=" + java.net.URLEncoder.encode(ticket, StandardCharsets.UTF_8);
        try {
            ResponseEntity<String> resp = restTemplate.getForEntity(URI.create(validateUrl), String.class);
            String body = resp.getBody();
            if (body == null) {
                return null;
            }
            if (body.contains("cas:authenticationFailure")) {
                log.warn("CAS authentication failure for ticket");
                return null;
            }
            Matcher m = CAS_USER_PATTERN.matcher(body);
            if (m.find()) {
                return m.group(1).trim();
            }
            return null;
        } catch (Exception e) {
            log.warn("CAS validate request failed: {}", e.getMessage());
            return null;
        }
    }
}
