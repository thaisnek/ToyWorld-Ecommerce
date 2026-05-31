package com.example.webtmdt;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class WebTmdtApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebTmdtApplication.class, args);
    }

}
