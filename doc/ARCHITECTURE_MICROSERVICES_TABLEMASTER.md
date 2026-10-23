# TÀI LIỆU THIẾT KẾ KIẾN TRÚC VI DỊCH VỤ (MICROSERVICES ARCHITECTURE)
# HỆ THỐNG: TABLEMASTER – REAL-TIME FLOOR PLAN & SMART TABLE RESERVATION PLATFORM

> **Mô hình triển khai:** Single-Tenant Bespoke (Gia công phần mềm độc quyền theo đơn đặt hàng của 01 Nhà hàng ẩm thực cao cấp).  
> **Tiêu chuẩn thiết kế:** Domain-Driven Design (DDD), Event-Driven Architecture (EDA), Database-per-Service.  
> **Ngăn xếp công nghệ (Tech Stack):**
> * **Service Discovery & Gateway:** Netflix Eureka Server 2.x, Spring Cloud Gateway (Reactive / WebFlux).
> * **Backend Core:** Java 17 / 21, Spring Boot 3.x, Spring Cloud 2023.x (OpenFeign, Resilience4j, Spring Cloud LoadBalancer).
> * **Event Streaming & Message Broker:** Apache Kafka (Confluent / Strimzi), Kafka Topics, Consumer Groups, DLQ.
> * **In-Memory & Distributed Locking:** Redis Cluster (Redisson Distributed Lock, Key-Value Caching, Token Blacklist).
> * **Persistence Layer:** PostgreSQL 16+ (Database-per-Service, JSONB layout indices, Flyway migration).
> * **Security & Identity:** Spring Security 6, JWT (RSA256 Asymmetric, Access + Refresh Tokens, Gateway Authentication Offloading).
> * **Frontend:** React 18+ (Vite), Tailwind CSS, Framer Motion (Table Box Grid UI), STOMP Client over SockJS / WebSocket.
> * **Observability & DevOps:** Docker Compose / Kubernetes (K8s), Prometheus, Grafana, OpenTelemetry / Micrometer Tracing, Zipkin.

---

## MỤC LỤC
1. [TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC THIẾT KẾ](#1-tổng-quan-kiến-trúc--nguyên-tắc-thiết-kế)
2. [BẢN ĐỒ RANH GIỚI DỊCH VỤ (BOUNDED CONTEXTS & SERVICES MAP)](#2-bản-đồ-ranh-giới-dịch-vụ-bounded-contexts--services-map)
3. [SƠ ĐỒ KIẾN TRÚC TỔNG THỂ (HIGH-LEVEL ARCHITECTURE DIAGRAM)](#3-sơ-đồ-kiến-trúc-tổng-thể-high-level-architecture-diagram)
4. [THIẾT KẾ SERVICE DISCOVERY (NETFLIX EUREKA) & DYNAMIC ROUTING VỚI SPRING CLOUD GATEWAY](#4-thiết-kế-service-discovery-netflix-eureka--dynamic-routing-với-spring-cloud-gateway)
5. [CHI TIẾT CÁC VI DỊCH VỤ (MICROSERVICES SPECIFICATION)](#5-chi-tiết-các-vi-dịch-vụ-microservices-specification)
6. [EVENT-DRIVEN ARCHITECTURE VỚI APACHE KAFKA & SAGA PATTERN](#6-event-driven-architecture-với-apache-kafka--saga-pattern)
7. [CHIẾN LƯỢC CONCURRENCY, DISTRIBUTED LOCK & CACHING VỚI REDIS](#7-chiến-lược-concurrency-distributed-lock--caching-với-redis)
8. [DATABASE-PER-SERVICE & CƠ CHẾ TRANSACTIONAL OUTBOX](#8-database-per-service--cơ-chế-transactional-outbox)
9. [KIẾN TRÚC BẢO MẬT: GATEWAY OFFLOADING & JWT RBAC](#9-kiến-trúc-bảo-mật-gateway-offloading--jwt-rbac)
10. [KIẾN TRÚC FRONTEND REACT & REAL-TIME INTERACTION](#10-kiến-trúc-frontend-react--real-time-interaction)
11. [OBSERVABILITY, RESILIENCE & CI/CD DOCKER STACK](#11-observability-resilience--cicd-docker-stack)
12. [BỘ CÂU HỎI BẢO VỆ ĐỒ ÁN VỀ MICROSERVICES, EUREKA & GATEWAY](#12-bộ-câu-hỏi-bảo-vệ-đồ-án-về-microservices-eureka--gateway)

---

## 1. TỔNG QUAN KIẾN TRÚC & NGUYÊN TẮC THIẾT KẾ

### 1.1. Mục tiêu Kỹ thuật (Architectural Drivers)
* **Dynamic Scalability & Zero Hardcoded IP:** Các dịch vụ con (instances) có thể tăng/giảm linh hoạt tùy theo tải mà API Gateway và các dịch vụ khác không cần cấu hình lại địa chỉ IP/Port nhờ **Netflix Eureka Service Discovery**.
* **High Concurrency & Zero Double-Booking:** Ngăn chặn tuyệt đối tình trạng 2 khách cùng đặt 1 bàn tại cùng 1 tích tắc (mili-giây), xử lý ít nhất **1.000 TPS** trong các đợt cao điểm nhờ **Redis Redlock**.
* **Low Latency Real-time Sync:** Mọi thay đổi trạng thái bàn (`AVAILABLE` $\rightarrow$ `HOLDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `OCCUPIED`) phải được lan truyền tới tất cả các client đang mở sơ đồ quán trong vòng **dưới 300ms** qua WebSocket STOMP.
* **Fault Isolation & Graceful Degradation:** Tách biệt hoàn toàn luồng nghiệp vụ. Nếu một dịch vụ gặp sự cố, hệ thống tự động cách ly bằng Resilience4j Circuit Breaker.

### 1.2. Các Nguyên tắc Thiết kế Cốt lõi
1. **API Gateway As Single Point of Entry:** Tất cả yêu cầu từ Web Client, Mobile/Tablet App đều đi qua Spring Cloud Gateway. Gateway thực hiện Routing động qua Eureka, Rate Limiting với Redis, và Xác thực JWT tập trung.
2. **Dynamic Service Registration:** Mọi Microservice khi khởi động đều tự động đăng ký với Eureka Server kèm kiểm tra sức khỏe (Health check) định kỳ.
3. **Database-per-Service:** Tuyệt đối không cho phép Service A truy cập trực tiếp vào DB của Service B. Mọi trao đổi dữ liệu xuyên biên giới đều thông qua REST (OpenFeign qua Eureka) hoặc Kafka Event.
4. **Event-Driven Core & Saga Pattern:** Sử dụng Apache Kafka làm xương sống truyền thông tin bất đồng bộ. Áp dụng Orchestration Saga để đảm bảo tính nhất quán dữ liệu phân tán giữa Booking và Payment.

---

## 2. BẢN ĐỒ RANH GIỚI DỊCH VỤ (BOUNDED CONTEXTS & SERVICES MAP)

```
+-------------------------------------------------------------------------------------------------------+
|                                    TABLEMASTER MICROSERVICES ECOSYSTEM                                |
+-------------------------------------------------------------------------------------------------------+
| 1. SERVICE DISCOVERY         : Netflix Eureka Server (Port: 8761)                                      |
|    - Trung tâm đăng ký & phát hiện dịch vụ động, Heartbeat monitoring, Service Registry Cache        |
+-------------------------------------------------------------------------------------------------------+
| 2. API GATEWAY               : Spring Cloud Gateway (Port: 8080)                                       |
|    - Dynamic Routing qua Eureka (lb://), Redis Rate Limiting, JWT Validation Offloading, CORS        |
+-------------------------------------------------------------------------------------------------------+
| 3. AUTH & IDENTITY SERVICE   : Spring Boot (Port: 8081) - DB: `tablemaster_auth`                       |
|    - Cấp phát RSA JWT Tokens, Quản lý tài khoản, Phân quyền RBAC (Customer, Host, Owner, Admin)       |
+-------------------------------------------------------------------------------------------------------+
| 4. RESTAURANT & FLOOR SERVICE: Spring Boot (Port: 8082) - DB: `tablemaster_restaurant`                 |
|    - Quản lý nhà hàng, Khung giờ (Time Slots), Quản lý Thẻ Box Bàn & Phân khu Tầng, Thực đơn món ăn   |
+-------------------------------------------------------------------------------------------------------+
| 5. BOOKING & LOCK SERVICE    : Spring Boot (Port: 8083) - DB: `tablemaster_booking`                   |
|    - Redis Redlock Concurrency Engine, Giữ bàn 5 phút, Saga Orchestrator, Quản lý trạng thái bàn     |
+-------------------------------------------------------------------------------------------------------+
| 6. PAYMENT & INVOICE SERVICE : Spring Boot (Port: 8084) - DB: `tablemaster_payment`                   |
|    - Sinh mã VietQR động, Webhook Ngân hàng (PayOS/Casso), Đối soát HMAC-SHA256, Hoàn tiền tự động   |
+-------------------------------------------------------------------------------------------------------+
| 7. NOTIFICATION & REALTIME   : Spring Boot (Port: 8085) - DB: `tablemaster_notification`              |
|    - WebSocket STOMP Broker cho Frontend Client, Gửi Mail xác nhận kèm QR Ticket, SMS / Zalo ZNS      |
+-------------------------------------------------------------------------------------------------------+
| 8. ANALYTICS & AUDIT SERVICE : Spring Boot (Port: 8086) - DB: `tablemaster_analytics`                |
|    - Kafka Event Sourcing, Tính toán chỉ số RevPASH, Tỷ lệ No-Show, Phân tích khu vực bàn đắt khách    |
+-------------------------------------------------------------------------------------------------------+
```

---

## 3. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ (HIGH-LEVEL ARCHITECTURE DIAGRAM)

```
                  +------------------------------------------------------+
                  |   CLIENT TIER (React SPA - Dashboard & Table Box)    |
                  |  - Customer Web App      - Host Tablet POS Screen    |
                  |  - Mobile Waitstaff App  - Admin Analytics Studio    |
                  +--------------------------+---------------------------+
                                             |
                                [HTTPS / REST]  [WSS / WebSocket]
                                             |              |
                                             v              v
                  +-----------------------------------------+------------+
                  |         SPRING CLOUD API GATEWAY (Port: 8080)        |
                  |  - Rate Limiting (Redis Bucket4j)                    |
                  |  - JWT Signature Verification & Claims Injection     |
                  |  - Dynamic Route via Eureka (lb://SERVICE-NAME)      |
                  |  - Circuit Breaker (Resilience4j)                    |
                  +--------------------------+---------------------------+
                                             |
                         [Service Discovery Query: "Where is Service X?"]
                                             |
                                             v
                      +---------------------------------------------+
                      |     NETFLIX EUREKA SERVER (Port: 8761)      |
                      |          (Central Service Registry)         |
                      |  - Heartbeat / Lease Renewal (30s)          |
                      |  - Self-Preservation Mode Protection        |
                      +----------------------+----------------------+
                                             ^
               [Register & Send Heartbeats]  |  [Register & Send Heartbeats]
         +-----------------------------------+-----------------------------------+
         |                                   |                                   |
         v                                   v                                   v
+--------------------------+       +--------------------------+       +--------------------------+
|   AUTH & USER SERVICE    |       | RESTAURANT & FLOOR SVC   |       |  BOOKING & LOCK SERVICE  |
|      (Port: 8081)        |       |      (Port: 8082)        |       |      (Port: 8083)        |
| DB: tablemaster_auth     |       | DB: tablemaster_rest     |       | DB: tablemaster_booking  |
+--------------------------+       +--------------------------+       +------------+-------------+
                                                 ^                                 |
                                                 |=== OpenFeign (lb://) <==========| (Get Table Info)
                                                 v                                 |
                                   +--------------------------+                    |
                                   |  PAYMENT & INVOICE SVC   |<=== Saga Events ===+
                                   |      (Port: 8084)        |
                                   | DB: tablemaster_payment  |
                                   +-------------+------------+
                                                 |
                                    [Publish / Consume Events]
                                                 v
                  ===========================================================
                  |               APACHE KAFKA CLUSTER (EVENT BUS)          |
                  | Topics: table.events | booking.events | payment.events  |
                  ===========================================================
                                    |                      |
                                    v                      v
                      +--------------------------+   +--------------------------+
                      | NOTIFICATION & REALTIME  |   | ANALYTICS & AUDIT SERVICE|
                      |      (Port: 8085)        |   |      (Port: 8086)        |
                      | - WebSocket STOMP Server |   | - Heatmap Aggregator     |
                      | - Mail / SMS Worker      |   | - RevPASH Calculation    |
                      +--------------------------+   +--------------------------+
```

---

## 4. THIẾT KẾ SERVICE DISCOVERY (NETFLIX EUREKA) & DYNAMIC ROUTING VỚI SPRING CLOUD GATEWAY

### 4.1. Nguyên lý Hoạt động của Netflix Eureka trong Hệ thống
1. **Service Registration (Tự động đăng ký):** Khi bất kỳ dịch vụ nào (`AUTH-SERVICE`, `BOOKING-SERVICE`, v.v.) khởi động, nó tự động gửi một HTTP REST request lên Eureka Server kèm metadata: IP, Port, tên định danh (`spring.application.name`), và URL kiểm tra sức khỏe (`/actuator/health`).
2. **Heartbeat & Lease Renewal (Duy trì phiên):** Cứ mỗi **30 giây**, Eureka Client gửi heartbeat lên server. Nếu sau **90 giây** (3 lần liên tiếp) Eureka Server không nhận được tín hiệu, nó coi instance đó đã chết và loại bỏ khỏi danh sách điều hướng.
3. **Self-Preservation Mode (Cơ chế tự bảo tồn):** Nếu xảy ra sự cố mạng đột ngột (network partition) khiến Eureka Server mất kết nối với >15% số client cùng lúc, Eureka sẽ tự động kích hoạt chế độ tự bảo vệ: **Không xóa bỏ các instance khỏi registry** để tránh tình trạng loại bỏ oan các dịch vụ vẫn đang hoạt động tốt.
4. **Client-Side Caching & Load Balancing:** API Gateway và các dịch vụ khác sử dụng Eureka Client để tải và lưu bản sao cục bộ (local cache) của Registry. Khi Gateway cần gọi `lb://BOOKING-SERVICE`, thư viện **Spring Cloud LoadBalancer** sẽ tự động chọn một instance khả dụng theo thuật toán **Round-Robin** hoặc **Weighted Response Time**.

---

### 4.2. Triển khai Service Discovery (`discovery-service` - Eureka Server)

#### Cấu hình Maven/Gradle Dependencies:
```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>
```

#### Code Khởi tạo Eureka Server:
```java
package com.tablemaster.discovery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer // Kích hoạt tính năng Service Registry
public class DiscoveryServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryServiceApplication.class, args);
    }
}
```

#### File cấu hình `application.yml` cho Eureka Server:
```yaml
server:
  port: 8761

spring:
  application:
    name: discovery-service

eureka:
  instance:
    hostname: localhost
  client:
    # Vì đây là Server trung tâm, không cần tự đăng ký chính nó vào registry
    register-with-eureka: false
    fetch-registry: false
    service-url:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
  server:
    enable-self-preservation: true # Bật tự bảo vệ trong môi trường production
    eviction-interval-timer-in-ms: 10000 # Quét dọn các instance chết mỗi 10 giây
```

---

### 4.3. Cấu hình Dynamic Routing trên Spring Cloud Gateway

Spring Cloud Gateway sử dụng Eureka để định tuyến bằng tiền tố `lb://` (Load Balanced), loại bỏ hoàn toàn việc hardcode IP hay Port:

```yaml
server:
  port: 8080

spring:
  application:
    name: api-gateway
  data:
    redis:
      host: localhost
      port: 6379
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true # Tự động phát hiện routes theo tên application
          lower-case-service-id: true
      routes:
        # 1. AUTH SERVICE ROUTE
        - id: auth-service-route
          uri: lb://AUTH-SERVICE
          predicates:
            - Path=/api/v1/auth/**
          filters:
            - StripPrefix=0

        # 2. RESTAURANT & FLOOR PLAN ROUTE
        - id: restaurant-service-route
          uri: lb://RESTAURANT-SERVICE
          predicates:
            - Path=/api/v1/restaurants/**, /api/v1/floor-plans/**, /api/v1/tables/**, /api/v1/time-slots/**
          filters:
            - StripPrefix=0

        # 3. BOOKING SERVICE ROUTE (Áp dụng Circuit Breaker & Redis Rate Limiter)
        - id: booking-service-route
          uri: lb://BOOKING-SERVICE
          predicates:
            - Path=/api/v1/bookings/**
          filters:
            - name: CircuitBreaker
              args:
                name: bookingCircuitBreaker
                fallbackUri: forward:/fallback/booking
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 20
                redis-rate-limiter.burstCapacity: 40
                key-resolver: "#{@userKeyResolver}"

        # 4. PAYMENT SERVICE ROUTE
        - id: payment-service-route
          uri: lb://PAYMENT-SERVICE
          predicates:
            - Path=/api/v1/payments/**, /api/v1/webhooks/**

        # 5. NOTIFICATION & WEBSOCKET STOMP RELAY
        - id: notification-service-route
          uri: lb:ws://NOTIFICATION-SERVICE
          predicates:
            - Path=/ws/**

        # 6. ANALYTICS SERVICE ROUTE
        - id: analytics-service-route
          uri: lb://ANALYTICS-SERVICE
          predicates:
            - Path=/api/v1/analytics/**

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
    fetch-registry: true
    register-with-eureka: true
```

---

### 4.4. Custom Gateway Global Filter: JWT Authentication Offloading

Global Filter trên Gateway chặn mọi request, xác thực chữ ký số RSA public key, kiểm tra Blacklist token trong Redis và tiêm thông tin danh tính vào header chuyển tiếp:

```java
package com.tablemaster.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.security.PublicKey;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationGlobalFilter implements GlobalFilter, Ordered {

    private final PublicKey rsaPublicKey; // Khóa công khai RSA để xác minh chữ ký
    private final ReactiveStringRedisTemplate redisTemplate;

    // Danh sách các endpoint công khai không cần kiểm tra JWT
    private static final List<String> PUBLIC_ENDPOINTS = List.of(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/webhooks/vietqr",
            "/ws"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // 1. Bỏ qua các endpoint công khai
        if (PUBLIC_ENDPOINTS.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        // 2. Kiểm tra Header Authorization
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);

        // 3. Kiểm tra xem Token có nằm trong danh sách thu hồi (Blacklist) của Redis không
        return redisTemplate.hasKey("blacklist:" + token)
                .flatMap(isBlacklisted -> {
                    if (Boolean.TRUE.equals(isBlacklisted)) {
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete();
                    }

                    try {
                        // 4. Giải mã Claims bằng Public Key mà không cần gọi network tới Auth Service
                        Claims claims = Jwts.parserBuilder()
                                .setSigningKey(rsaPublicKey)
                                .build()
                                .parseClaimsJws(token)
                                .getBody();

                        String userId = claims.getSubject();
                        String roles = claims.get("roles", String.class);
                        String email = claims.get("email", String.class);
                        String traceId = UUID.randomUUID().toString();

                        // 5. Tiêm thông tin danh tính người dùng vào Header gửi tiếp cho các Microservices
                        ServerHttpRequest mutatedRequest = request.mutate()
                                .header("X-User-Id", userId)
                                .header("X-User-Roles", roles)
                                .header("X-User-Email", email)
                                .header("X-Trace-Id", traceId)
                                .build();

                        return chain.filter(exchange.mutate().request(mutatedRequest).build());

                    } catch (Exception e) {
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete();
                    }
                });
    }

    @Override
    public int getOrder() {
        return -1; // Ưu tiên chạy đầu tiên trong chuỗi filter
    }
}
```

---

### 4.5. Giao tiếp Nội bộ giữa các Microservices bằng OpenFeign qua Eureka

Khi `Booking Service` cần lấy thông tin cấu hình bàn ăn và khung giờ từ `Restaurant Service`, nó không gọi IP cụ thể mà dùng **Spring Cloud OpenFeign** kết hợp định danh Eureka:

```java
package com.tablemaster.booking.client;

import com.tablemaster.booking.dto.TableInfoDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

// Tự động tìm kiếm các instances của RESTAURANT-SERVICE từ Eureka Server
@FeignClient(name = "RESTAURANT-SERVICE", path = "/api/v1/tables")
public interface RestaurantClient {

    @GetMapping("/{id}")
    TableInfoDto getTableDetails(@PathVariable("id") String tableId);
}
```

---

## 5. CHI TIẾT CÁC VI DỊCH VỤ (MICROSERVICES SPECIFICATION)

### 5.1. Auth & Identity Service (Port: 8081)
* **Trách nhiệm:** Đăng ký, đăng nhập tài khoản khách hàng, lễ tân (Host), chủ nhà hàng (Owner).
* **Cơ chế Token:**
  * **Access Token:** Ký thuật toán Asymmetric RSA256 (Private Key giữ tại Auth Service, Public Key cung cấp cho API Gateway xác thực mà không cần gọi network). TTL: 15 phút.
  * **Refresh Token:** Lưu trữ trong Redis có TTL: 7 ngày, kèm tính năng Refresh Token Rotation để phòng chống đánh cắp session.

### 5.2. Restaurant & Floor Plan Service (Port: 8082)
* **Trách nhiệm:** Quản lý dữ liệu nhà hàng, chi nhánh, menu món đặt trước, sơ đồ mặt bằng 2D JSONB.
* **Cấu trúc JSONB Mặt bằng (`floor_plans.layout_metadata`):**
```json
{
  "canvas": { "width": 1600, "height": 900, "gridSize": 20, "theme": "dark" },
  "obstacles": [
    { "type": "WALL", "points": [100, 50, 800, 50], "strokeWidth": 6 },
    { "type": "WINDOW", "points": [800, 50, 1400, 50], "label": "View Phố đi bộ" },
    { "type": "DOOR", "x": 50, "y": 450, "width": 80, "label": "Lối vào chính" },
    { "type": "COUNTER", "x": 200, "y": 500, "width": 250, "height": 90, "label": "Quầy Bar & Pha Chế" }
  ],
  "zones": [
    { "zoneId": "VIP", "name": "Khu vực VIP Ngoài trời", "color": "#f59e0b" },
    { "zoneId": "STANDARD", "name": "Sảnh Trung Tâm", "color": "#10b981" }
  ]
}
```

### 5.3. Booking & Lock Service (Port: 8083 - Trọng tâm Xử lý Tranh chấp)
* **Trách nhiệm:**
  * Giữ bàn tạm thời (5 phút) sử dụng Redis Redlock.
  * Điều phối chu trình đặt bàn (State Machine: `HOLDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `SEATED` $\rightarrow$ `CLEANING` $\rightarrow$ `AVAILABLE`).
  * Đóng vai trò là **Saga Orchestrator** trong chu trình thanh toán cọc.

### 5.4. Payment & Invoice Service (Port: 8084)
* **Trách nhiệm:** Sinh mã VietQR chuẩn EMVCo động, lắng nghe Webhook ngân hàng với chữ ký HMAC-SHA256, bắn event vào Kafka topic `payment.events`.

### 5.5. Notification & Real-time Service (Port: 8085)
* **Trách nhiệm:** Duy trì kết nối WebSocket STOMP với các Web Client và Tablet Lễ tân, tiêu thụ Kafka events để broadcast trạng thái bàn theo thời gian thực `/topic/restaurant/{id}/floor-map`.

### 5.6. Analytics & Audit Service (Port: 8086)
* **Trách nhiệm:** Tiêu thụ sự kiện từ Kafka để tính toán chỉ số **RevPASH**, tỷ lệ **No-Show**, và ma trận nhiệt **Heatmap** các vị trí bàn đắt khách nhất.

---

## 6. EVENT-DRIVEN ARCHITECTURE VỚI APACHE KAFKA & SAGA PATTERN

### 6.1. Thiết kế Hệ thống Kafka Topics & Phân vùng (Partitioning)

Mỗi topic sử dụng khóa phân vùng (**Partition Key**) là `restaurant_id`. Điều này đảm bảo tất cả sự kiện liên quan đến cùng một nhà hàng luôn được xử lý theo **thứ tự thời gian tuyệt đối (FIFO)** trên cùng một Partition.

| Topic Name | Key | Event Types | Consumers |
| :--- | :--- | :--- | :--- |
| `table.events` | `restaurantId` | `TableHeld`, `TableReleased`, `TableSeated`, `TableCleaned` | `NotificationService`, `AnalyticsService` |
| `booking.events` | `bookingId` | `BookingCreated`, `BookingConfirmed`, `BookingCancelled`, `BookingExpired` | `PaymentService`, `NotificationService`, `AnalyticsService` |
| `payment.events` | `bookingId` | `PaymentCreated`, `PaymentSuccess`, `PaymentFailed`, `PaymentRefunded` | `BookingService`, `NotificationService` |

---

### 6.2. Luồng Đặt cọc Đa dịch vụ bằng Saga Pattern (Orchestration-based Saga)

```
[Customer]
    | (1) POST /api/v1/bookings/hold (tableId, date, slot)
    v
[API Gateway] --(Lookup Eureka)--> [Booking Service] (Saga Orchestrator)
                                        |-- (2) Redis Redlock acquire lock(tableId) -> OK
                                        |-- (3) Tạo Booking HOLDING (5 phút)
                                        |-- (4) Publish: TableHeldEvent -> Kafka (table.events)
                                        |-- (5) OpenFeign gọi Payment Service: Sinh VietQR cọc
                                        v
                            [Kafka: table.events]
                                        |--> [Notification Service] --> WebSocket Push -> Toàn bộ Client đổi bàn sang VÀNG
                                        v
[Customer Quét VietQR & Chuyển khoản]
    |
    v (Webhook Callback kèm chữ ký HMAC)
[Payment Service]
    |-- (6) Verify HMAC & số tiền cọc
    |-- (7) Cập nhật Payment Status = SUCCESS
    |-- (8) Publish: PaymentSuccessEvent -> Kafka (payment.events)
    v
[Booking Service] (Saga Orchestrator lắng nghe Kafka)
    |-- (9) Nhận PaymentSuccessEvent
    |-- (10) Chuyển Booking Status = CONFIRMED
    |-- (11) Xóa Redis TTL tạm, ghi nhận bàn CONFIRMED vào PostgreSQL
    |-- (12) Publish: BookingConfirmedEvent -> Kafka (booking.events)
    v
[Kafka: booking.events]
    |--> [Notification Service]
            |--> WebSocket Push -> Mọi client thấy bàn đổi sang ĐỎ
            |--> Gửi Email + SMS kèm mã QR Token Check-in cho khách
```

#### Kịch bản Bù trừ khi Quá hạn 5 phút (Compensating Transaction)
Nếu sau 300 giây khách hàng không thanh toán:
1. **Time-out Event:** Redis Key Expiration Listener kích hoạt sự kiện `BookingHoldExpiredEvent`.
2. **Saga Orchestrator (`Booking Service`)** thực thi hành động bù trừ:
   * Chuyển trạng thái Booking sang `CANCELLED_TIMEOUT`.
   * Giải phóng bản ghi giữ chỗ của bàn trong PostgreSQL.
   * Publish sự kiện `TableReleasedEvent` lên Kafka topic `table.events`.
3. **`Payment Service`** nhận sự kiện $\rightarrow$ Hủy mã VietQR.
4. **`Notification Service`** nhận sự kiện $\rightarrow$ Broadcast WebSocket chuyển trạng thái bàn về `AVAILABLE` (Xanh lá).

---

## 7. CHIẾN LƯỢC CONCURRENCY, DISTRIBUTED LOCK & CACHING VỚI REDIS

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class DistributedReservationService {

    private final RedissonClient redissonClient;
    private final BookingRepository bookingRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public BookingResponse holdTableWithDistributedLock(HoldTableRequest request, String userId) {
        // Khóa định danh phân tán duy nhất: lock:table:{id}:{yyyyMMdd}:{slotId}
        String lockKey = String.format("lock:table:%s:%s:%s",
                request.getTableId(),
                request.getBookingDate(),
                request.getTimeSlotId());

        RLock lock = redissonClient.getLock(lockKey);

        try {
            // Chờ tối đa 300ms để lấy khóa, tự nhả sau 4000ms nếu node sập đột ngột
            boolean acquired = lock.tryLock(300, 4000, TimeUnit.MILLISECONDS);
            if (!acquired) {
                throw new TableAlreadyLockedException("Bàn đang được thao tác bởi khách hàng khác, vui lòng chọn lại!");
            }

            // 1. Kiểm tra trạng thái thực tế từ Read-cache hoặc DB
            if (isTableOccupiedOrHolding(request)) {
                throw new TableUnavailableException("Bàn đã được giữ hoặc đã đặt kín!");
            }

            // 2. Tạo bản ghi Booking HOLDING trong PostgreSQL
            Booking booking = Booking.builder()
                    .userId(UUID.fromString(userId))
                    .restaurantId(request.getRestaurantId())
                    .tableId(request.getTableId())
                    .bookingDate(request.getBookingDate())
                    .timeSlotId(request.getTimeSlotId())
                    .status(BookingStatus.HOLDING)
                    .expiresAt(Instant.now().plusSeconds(300))
                    .build();
            bookingRepository.save(booking);

            // 3. Đặt trạng thái HOLDING vào Redis Cache với TTL đúng 300s
            String stateKey = String.format("state:table:%s:%s:%s",
                    request.getTableId(), request.getBookingDate(), request.getTimeSlotId());
            RBucket<String> bucket = redissonClient.getBucket(stateKey);
            bucket.set("HOLDING", Duration.ofSeconds(300));

            // 4. Bắn sự kiện lên Kafka để đồng bộ toàn bộ hệ thống
            TableHeldEvent event = new TableHeldEvent(
                    booking.getId(), request.getRestaurantId(), request.getTableId(), booking.getExpiresAt());
            kafkaTemplate.send("table.events", request.getRestaurantId().toString(), event);

            return BookingResponse.from(booking);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new SystemBusyException("Quá trình đặt bàn bị gián đoạn do hệ thống quá tải");
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock(); // Luôn giải phóng lock để thread khác tiếp tục
            }
        }
    }
}
```

---

## 8. DATABASE-PER-SERVICE & CƠ CHẾ TRANSACTIONAL OUTBOX

### 8.1. Phân chia Cơ sở Dữ liệu Độc lập

```
[PostgreSQL Database Instance Cluster]
  ├── Database: tablemaster_auth        (Quản lý Users, Roles, Refresh Tokens)
  ├── Database: tablemaster_restaurant  (Quản lý Restaurants, Floor Plans JSONB, Tables, Slots)
  ├── Database: tablemaster_booking     (Quản lý Bookings, Booking_Tables, Outbox Table)
  ├── Database: tablemaster_payment     (Quản lý Transactions, Webhook Logs, Refunds)
  ├── Database: tablemaster_analytics   (Quản lý Daily Stats, Turnover, RevPASH Aggregate)
```

### 8.2. Giải quyết Bài toán Dual-Write bằng Transactional Outbox Pattern

```sql
-- BẢNG TRANSACTIONAL OUTBOX TẠI BOOKING SERVICE
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL, -- "BOOKING", "TABLE"
    aggregate_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(50) NOT NULL,    -- "TableHeldEvent", "BookingConfirmedEvent"
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at);
```

---

## 9. KIẾN TRÚC BẢO MẬT: GATEWAY OFFLOADING & JWT RBAC

### Ma trận Phân quyền (RBAC Permission Matrix)

| Endpoint | Quyền hạn yêu cầu | Mô tả nghiệp vụ |
| :--- | :--- | :--- |
| `POST /api/v1/floor-plans` | `ROLE_OWNER`, `ROLE_ADMIN` | Dựng sơ đồ mặt bằng và xuất bản |
| `POST /api/v1/bookings/hold` | `ROLE_CUSTOMER`, `ROLE_HOST` | Giữ bàn 5 phút để thanh toán cọc |
| `POST /api/v1/checkin/qr` | `ROLE_HOST`, `ROLE_OWNER` | Lễ tân quét mã QR Check-in khách vào bàn |
| `POST /api/v1/tables/{id}/status` | `ROLE_HOST`, `ROLE_OWNER` | Chuyển trạng thái bàn 1 chạm trên Tablet |
| `GET /api/v1/analytics/revpash` | `ROLE_OWNER`, `ROLE_ADMIN` | Xem báo cáo doanh thu & tỷ lệ lấp đầy |

---

## 10. KIẾN TRÚC FRONTEND REACT & REAL-TIME INTERACTION

### 10.1. Cấu trúc Component Quản lý Thẻ Box Bàn & Đặt Bàn Trực Tuyến

```
App.jsx
 └── Layout.jsx
      ├── TopNavbar.jsx (Hiển thị đồng hồ đếm ngược, Profile)
      ├── BookingPage.jsx (Luồng Khách hàng Đặt Bàn theo Thông tin)
      │    ├── BookingTimeAndPartyStep.jsx (Chọn Ngày, Khung ca, Giờ đến, Số khách)
      │    ├── ZoneSelectorStep.jsx (Chọn Khu vực: Ban công, Quầy Bar, VIP, Cửa kính)
      │    ├── PreOrderDishesStep.jsx (Chọn món ăn đặc biệt đặt trước)
      │    └── VietQRDepositModal.jsx (Popup quét mã QR VietQR kèm Countdown 05:00)
      │
      └── HostTabletPage.jsx (Màn hình Lễ tân & Quản lý Thẻ Box Bàn)
           ├── ShiftMetricsBar.jsx (Đếm bàn trống, bàn có khách, bàn đã cọc, bàn dọn)
           ├── TableBoxGrid.jsx (Lưới Thẻ Box Bàn phân chia theo Tầng/Khu vực)
           │    └── TableBoxCard.jsx (Mã bàn, Sức chứa, Màu trạng thái, Thao tác 1 chạm)
           ├── TableMergeModal.jsx (Chọn và Gộp nhiều Thẻ Box bàn cho đoàn đông)
           ├── TableTransferModal.jsx (Chuyển đổi khách sang bàn khác)
           └── QRScanCheckinModal.jsx (Quét camera mã vé check-in đón khách)
```

---

## 11. OBSERVABILITY, RESILIENCE & CI/CD DOCKER STACK

### Cấu hình Docker Compose Môi trường Cục bộ

```yaml
version: '3.8'

services:
  # 1. SERVICE DISCOVERY: NETFLIX EUREKA SERVER
  discovery-service:
    build: ./discovery-service
    ports:
      - "8761:8761"
    environment:
      - SPRING_PROFILES_ACTIVE=docker

  # 2. MESSAGE BROKER: KAFKA & ZOOKEEPER
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  # 3. IN-MEMORY CACHE & LOCK: REDIS
  redis:
    image: redis:7.2-alpine
    ports:
      - "6379:6379"
    command: ["redis-server", "--appendonly", "yes"]

  # 4. API GATEWAY
  api-gateway:
    build: ./api-gateway
    depends_on:
      - discovery-service
      - redis
    ports:
      - "8080:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=docker
      - EUREKA_CLIENT_SERVICEURL_DEFAULTZONE=http://discovery-service:8761/eureka/
      - SPRING_DATA_REDIS_HOST=redis

  # 5. POSTGRESQL MULTI-DATABASE CONTAINER
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: rootpassword
    volumes:
      - ./init-multiple-dbs.sh:/docker-entrypoint-initdb.d/init-multiple-dbs.sh
```

---

## 12. BỘ CÂU HỎI BẢO VỆ ĐỒ ÁN VỀ MICROSERVICES, EUREKA & GATEWAY

#### Câu hỏi 1: *"Vai trò thực sự của Netflix Eureka trong hệ thống là gì? Nếu không dùng Eureka mà hardcode URL trong API Gateway thì có được không?"*
* **Trả lời chuẩn chuyên gia:**
  * Nếu hardcode URL, mỗi lần một dịch vụ mở rộng (Scale up thêm 2–3 instances để chịu tải) hoặc thay đổi địa chỉ IP/Port khi redeploy, ta phải chỉnh sửa lại cấu hình của Gateway và khởi động lại toàn bộ hệ sinh thái $\rightarrow$ Gây gián đoạn dịch vụ (Downtime).
  * **Eureka đóng vai trò là Danh bạ Dịch vụ động (Dynamic Registry):** Các instance tự động đăng ký và gửi nhịp tim (Heartbeat 30s). API Gateway chỉ cần dùng tiền tố `lb://BOOKING-SERVICE`, thư viện Spring Cloud LoadBalancer sẽ tự động phân phối tải cân bằng giữa các instances khả dụng.

#### Câu hỏi 2: *"Nếu Eureka Server bị sập đột ngột (Crash), API Gateway và các Microservices có tiếp tục hoạt động được không?"*
* **Trả lời chuẩn chuyên gia:**
  * **Hệ thống vẫn tiếp tục hoạt động bình thường trong một khoảng thời gian nhờ cơ chế Client-Side Caching của Eureka Client.**
  * API Gateway và các services định kỳ (mặc định 30s) đều tải và lưu một bản sao cục bộ (local registry cache). Khi Eureka Server sập, Gateway vẫn sử dụng bản cache này để điều hướng request tới các instances đã biết. Chỉ khi có instance mới khởi động hoặc instance cũ đổi IP thì thông tin mới không được cập nhật kịp thời.

#### Câu hỏi 3: *"Tại sao phải đặt JWT Validation trên Spring Cloud Gateway thay vì để từng Microservice tự kiểm tra?"*
* **Trả lời chuẩn chuyên gia:**
  * **Mô hình Gateway Offloading (Xác thực tập trung):**
    1. **Bảo mật:** Chặn đứng các request giả mạo, token hết hạn ngay tại cửa ngõ trước khi chúng kịp chạm tới hạ tầng mạng nội bộ.
    2. **Tối ưu hiệu năng:** Các service con không phải tốn tài nguyên CPU để giải mã chữ ký RSA hay truy vấn Redis kiểm tra Blacklist; chúng chỉ việc nhận các header đã được Gateway xác thực sạch sẽ (`X-User-Id`, `X-User-Roles`).
    3. **DRY (Don't Repeat Yourself):** Không cần duplicate mã nguồn cấu hình Security Filter Chain trên tất cả 6 microservices.
