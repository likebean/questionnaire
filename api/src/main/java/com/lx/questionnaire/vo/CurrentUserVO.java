package com.lx.questionnaire.vo;

import lombok.Data;

import java.util.List;

@Data
public class CurrentUserVO {
    private String id;
    private String nickname;
    private String email;
    private String phone;
    private String identityType;
    private Long departmentId;
    private List<String> roleCodes;
}
