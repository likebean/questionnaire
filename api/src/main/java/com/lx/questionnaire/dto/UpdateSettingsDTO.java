package com.lx.questionnaire.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateSettingsDTO {
    private Boolean limitOncePerUser;
    private Boolean allowAnonymous;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String thankYouText;
    /** 每 IP 限填次数，0=不限制 */
    private Integer limitByIp;
    /** 每设备限填次数，0=不限制 */
    private Integer limitByDevice;
}
