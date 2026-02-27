package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("preset_option_item")
public class PresetOptionItem {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long groupId;
    private Integer sortOrder;
    private String label;
    private Boolean allowFill;
    private String description;
    private Boolean descriptionOpenInPopup;
    private String imageUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

