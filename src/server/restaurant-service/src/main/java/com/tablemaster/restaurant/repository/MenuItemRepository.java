package com.tablemaster.restaurant.repository;

import com.tablemaster.restaurant.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItem, UUID> {
    List<MenuItem> findByCategoryId(UUID categoryId);
    List<MenuItem> findByCategoryIdAndIsActiveTrue(UUID categoryId);
    List<MenuItem> findByIsActiveTrue();
    List<MenuItem> findByIsPreorderAvailableTrueAndIsActiveTrue();
    long countByCategoryId(UUID categoryId);
}
