package com.example;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    private final CacheWarmer cache;

    @Autowired
    public UserService(CacheWarmer cache) {
        this.cache = cache;
    }

    public UserService() {
        this.cache = null;
    }
}
