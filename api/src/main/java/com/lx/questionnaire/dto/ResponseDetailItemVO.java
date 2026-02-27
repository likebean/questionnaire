package com.lx.questionnaire.dto;

import lombok.Data;

@Data
public class ResponseDetailItemVO {
    private Long questionId;
    private String questionTitle;
    private String type;
    private String answerText; // 展示用：选项文案或填空内容或量表分值
    /** 原始值，供前端 SurveyJS 只读回填：单选/量表用 optionIndex，多选用 optionIndices，填空用 textValue */
    private Integer optionIndex;
    private java.util.List<Integer> optionIndices;
    private String textValue;
    private Integer scaleValue;
}
