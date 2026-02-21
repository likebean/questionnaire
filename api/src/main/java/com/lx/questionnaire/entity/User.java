package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user")
public class User {
    @TableId
    private String id;
    private String nickname;
    private String email;
    private String phone;
    private String identityType;
    private Long departmentId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String creator;
    private String updator;
}
