package com.lx.questionnaire.vo;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 创建账号（校管）：绑定到已有用户，local 需提供密码。
 */
@Data
public class CreateAccountVO {

    @NotBlank(message = "用户ID不能为空")
    private String userId;

    @NotBlank(message = "登录标识不能为空")
    private String loginId;

    @NotBlank(message = "认证来源不能为空")
    private String authSource;

    /** 明文密码，auth_source=local 时必填 */
    private String password;
}
