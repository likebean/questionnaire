package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("permission")
public class Permission {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String resourceType;
    private String action;
    private String dataScope;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String creator;
    private String updator;
}
