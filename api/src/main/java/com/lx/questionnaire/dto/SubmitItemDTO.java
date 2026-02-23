package com.lx.questionnaire.dto;

import lombok.Data;

@Data
public class SubmitItemDTO {
    private Long questionId;
    private Integer optionIndex;   // 单选/量表
    private int[] optionIndices;   // 多选
    private String textValue;      // 填空/其他
    private Integer scaleValue;    // 量表
}
