package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("response_item")
public class ResponseItem {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long responseId;
    private Long questionId;
    private String valueType; // OPTION, TEXT, SCALE
    private Integer optionIndex;
    private String optionIndices; // JSON array for multiple choice
    private String textValue;
    private Integer scaleValue;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
