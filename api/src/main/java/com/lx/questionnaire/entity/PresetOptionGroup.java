package com.lx.questionnaire.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("preset_option_group")
public class PresetOptionGroup {
    @TableId(type = IdType.AUTO)
    private Long id;
    /** 分类：常用/性别/学历/... */
    private String category;
    /** 预定义组名称（按钮文案） */
    private String name;
    /** 排序 */
    private Integer sort;
    /** 是否启用 */
    private Boolean enabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

