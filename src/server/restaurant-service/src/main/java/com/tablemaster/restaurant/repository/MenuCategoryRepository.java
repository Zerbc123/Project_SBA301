package com.tablemaster.restaurant.repository;

import com.tablemaster.restaurant.entity.MenuCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MenuCategoryRepository extends JpaRepository<MenuCategory, UUID> {
    List<MenuCategory> findAllByOrderByDisplayOrderAsc();
    List<MenuCategory> findByIsActiveTrueOrderByDisplayOrderAsc();
}
