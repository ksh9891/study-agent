package com.example;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;

@Component
public class CacheWarmer {
    @PostConstruct
    public void warm() {
        // load caches at startup
    }

    @PreDestroy
    public void flush() {
        // flush caches at shutdown
    }
}
