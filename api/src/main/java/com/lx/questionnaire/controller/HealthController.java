package com.lx.questionnaire.controller;

import com.lx.questionnaire.common.Result;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HealthController {

    @GetMapping("/health")
    public Result<HealthVO> health() {
        HealthVO vo = new HealthVO();
        vo.setStatus("UP");
        vo.setService("questionnaire-api");
        vo.setTimestamp(Instant.now().toString());
        return Result.ok(vo);
    }

    @Data
    public static class HealthVO {
        private String status;
        private String service;
        private String timestamp;
    }
}
