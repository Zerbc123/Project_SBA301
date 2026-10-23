package com.tablemaster.restaurant.repository;

import com.tablemaster.restaurant.entity.RestaurantProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RestaurantProfileRepository extends JpaRepository<RestaurantProfile, UUID> {
    Optional<RestaurantProfile> findFirstByOrderByIdAsc();
}
