package com.tablemaster.payment.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    public static final String TOPIC_PAYMENT_SUCCESS = "payment.success";

    @Bean
    public NewTopic paymentSuccessTopic() {
        return TopicBuilder.name(TOPIC_PAYMENT_SUCCESS)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
