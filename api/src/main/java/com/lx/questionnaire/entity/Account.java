package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("account")
public class Account {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String userId;
    private String loginId;
    private String authSource;
    private String passwordHash;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String creator;
    private String updator;
}
