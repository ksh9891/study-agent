package com.example.demo.service;

import org.springframework.stereotype.Service;

@Service
public class GreetingService {

    private final String message;

    public GreetingService() {
        this.message = "Hello, World!";
    }

    public GreetingService(String message) {
        this.message = message;
    }

    public String greet(String name) {
        return message + " " + name;
    }
}
