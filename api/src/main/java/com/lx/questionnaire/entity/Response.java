package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("response")
public class Response {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String surveyId;
    @TableField(value = "user_id", insertStrategy = FieldStrategy.ALWAYS, updateStrategy = FieldStrategy.ALWAYS)
    private String userId;
    /** DRAFT=草稿（实时保存） SUBMITTED=已提交 */
    private String status;
    private LocalDateTime submittedAt;
    private Integer durationSeconds;
    private String submittedIp;
    private String deviceId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
