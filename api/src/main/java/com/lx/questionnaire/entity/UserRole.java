package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_role")
public class UserRole {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String userId;
    private Long roleId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String creator;
    private String updator;
}
