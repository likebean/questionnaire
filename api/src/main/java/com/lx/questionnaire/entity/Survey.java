package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("survey")
public class Survey {
    @TableId(type = IdType.INPUT)
    private String id;
    private String title;
    private String description;
    private String status; // DRAFT, COLLECTING, PAUSED, ENDED
    private String creatorId;
    /** 问卷归属院系，创建时写入、不跟人走；null 表示无部门/仅本人可见 */
    private Long departmentId;
    private Boolean limitOncePerUser;
    private Boolean allowAnonymous;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String thankYouText;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
