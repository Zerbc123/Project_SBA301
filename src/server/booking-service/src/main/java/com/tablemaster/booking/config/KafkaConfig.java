package com.tablemaster.booking.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    public static final String TOPIC_BOOKING_CREATED = "booking.created";
    public static final String TOPIC_BOOKING_CONFIRMED = "booking.confirmed";
    public static final String TOPIC_BOOKING_SEATED = "booking.seated";
    public static final String TOPIC_BOOKING_COMPLETED = "booking.completed";
    public static final String TOPIC_BOOKING_CANCELLED = "booking.cancelled";
    public static final String TOPIC_BOOKING_EXPIRED = "booking.expired";
    public static final String TOPIC_TABLE_UPDATED = "booking.table.updated";
    public static final String TOPIC_PAYMENT_SUCCESS = "payment.success";

    @Bean
    public NewTopic bookingCreatedTopic() {
        return TopicBuilder.name(TOPIC_BOOKING_CREATED).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic bookingConfirmedTopic() {
        return TopicBuilder.name(TOPIC_BOOKING_CONFIRMED).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic bookingSeatedTopic() {
        return TopicBuilder.name(TOPIC_BOOKING_SEATED).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic bookingCompletedTopic() {
        return TopicBuilder.name(TOPIC_BOOKING_COMPLETED).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic bookingCancelledTopic() {
        return TopicBuilder.name(TOPIC_BOOKING_CANCELLED).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic bookingExpiredTopic() {
        return TopicBuilder.name(TOPIC_BOOKING_EXPIRED).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic tableUpdatedTopic() {
        return TopicBuilder.name(TOPIC_TABLE_UPDATED).partitions(3).replicas(1).build();
    }
}
