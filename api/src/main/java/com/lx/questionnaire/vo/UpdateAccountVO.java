package com.lx.questionnaire.vo;

import lombok.Data;

/**
 * 更新账号（校管）：可改登录标识、本地账号可重置密码。
 */
@Data
public class UpdateAccountVO {

    /** 登录标识，不传则不修改 */
    private String loginId;

    /** 明文密码，仅 auth_source=local 时有效，不传则不修改 */
    private String password;
}
