package com.lx.questionnaire.service;

import com.lx.questionnaire.entity.User;

import java.util.List;

public interface UserService {

    User getById(String id);

    List<String> getRoleCodesByUserId(String userId);

    User createUser(User user);
}
