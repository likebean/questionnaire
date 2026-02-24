package com.lx.questionnaire.dto;

import lombok.Data;

@Data
public class ResponseDetailItemVO {
    private Long questionId;
    private String questionTitle;
    private String type;
    private String answerText; // 展示用：选项文案或填空内容或量表分值
}
