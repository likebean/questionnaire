package com.lx.questionnaire.service;

/**
 * 使用 CAS Ticket 向 CAS 服务端校验并获取用户标识（login_id，如学号/工号）。
 */
public interface CasValidateService {

    /**
     * 使用 ticket 向 CAS 校验，成功则返回用户唯一标识（login_id）。
     *
     * @param ticket CAS 回调带来的 ticket
     * @return login_id，校验失败返回 null
     */
    String validateTicketAndGetLoginId(String ticket);
}
