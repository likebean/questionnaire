package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("department")
public class Department {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String code;
    private String name;
    private Long parentId;
    private Integer level;
    private Integer sort;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
