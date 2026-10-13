package com.tablemaster.analytics;

import com.tablemaster.analytics.service.AnalyticsDataSeederService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@EnableDiscoveryClient
public class AnalyticsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AnalyticsServiceApplication.class, args);
    }

    @Bean
    public CommandLineRunner initData(AnalyticsDataSeederService seederService) {
        return args -> {
            try {
                seederService.seedMockDataIfEmpty();
            } catch (Exception e) {
                // If DB is still initializing or unavailable, gracefully continue
                System.err.println("Seeder skipped or database not ready: " + e.getMessage());
            }
        };
    }
}
