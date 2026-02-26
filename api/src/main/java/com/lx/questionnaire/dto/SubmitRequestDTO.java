package com.lx.questionnaire.dto;

import lombok.Data;

import java.util.List;

@Data
public class SubmitRequestDTO {
    private List<SubmitItemDTO> items;
    private Integer durationSeconds;
    /** 设备标识，用于同一设备限填 */
    private String deviceId;
}
