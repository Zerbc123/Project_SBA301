package com.tablemaster.restaurant.service;

import com.tablemaster.restaurant.dto.MenuItemDto;
import com.tablemaster.restaurant.entity.MenuCategory;
import com.tablemaster.restaurant.entity.MenuItem;
import com.tablemaster.restaurant.exception.ErrorCode;
import com.tablemaster.restaurant.exception.ResourceNotFoundException;
import com.tablemaster.restaurant.repository.MenuCategoryRepository;
import com.tablemaster.restaurant.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final MenuCategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<MenuItemDto> getAllMenuItems(UUID categoryId, Boolean activeOnly, Boolean preorderOnly) {
        List<MenuItem> items;
        if (categoryId != null) {
            items = Boolean.TRUE.equals(activeOnly)
                    ? menuItemRepository.findByCategoryIdAndIsActiveTrue(categoryId)
                    : menuItemRepository.findByCategoryId(categoryId);
        } else if (Boolean.TRUE.equals(preorderOnly)) {
            items = menuItemRepository.findByIsPreorderAvailableTrueAndIsActiveTrue();
        } else if (Boolean.TRUE.equals(activeOnly)) {
            items = menuItemRepository.findByIsActiveTrue();
        } else {
            items = menuItemRepository.findAll();
        }

        Map<UUID, String> categoryNames = categoryRepository.findAll().stream()
                .collect(Collectors.toMap(MenuCategory::getId, MenuCategory::getName));

        return items.stream()
                .map(item -> mapToDto(item, categoryNames.getOrDefault(item.getCategoryId(), "")))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MenuItemDto getMenuItemById(UUID id) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MENU_ITEM_NOT_FOUND));
        String catName = categoryRepository.findById(item.getCategoryId())
                .map(MenuCategory::getName).orElse("");
        return mapToDto(item, catName);
    }

    @Transactional
    public MenuItemDto createMenuItem(MenuItemDto dto) {
        MenuCategory category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CATEGORY_NOT_FOUND));

        MenuItem item = MenuItem.builder()
                .categoryId(dto.getCategoryId())
                .name(dto.getName())
                .description(dto.getDescription())
                .price(dto.getPrice())
                .imageUrl(dto.getImageUrl())
                .isPreorderAvailable(dto.getIsPreorderAvailable() != null ? dto.getIsPreorderAvailable() : true)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        MenuItem saved = menuItemRepository.save(item);
        return mapToDto(saved, category.getName());
    }

    @Transactional
    public MenuItemDto updateMenuItem(UUID id, MenuItemDto dto) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MENU_ITEM_NOT_FOUND));

        MenuCategory category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CATEGORY_NOT_FOUND));

        item.setCategoryId(dto.getCategoryId());
        item.setName(dto.getName());
        item.setDescription(dto.getDescription());
        item.setPrice(dto.getPrice());
        if (dto.getImageUrl() != null) item.setImageUrl(dto.getImageUrl());
        if (dto.getIsPreorderAvailable() != null) item.setIsPreorderAvailable(dto.getIsPreorderAvailable());
        if (dto.getIsActive() != null) item.setIsActive(dto.getIsActive());

        MenuItem saved = menuItemRepository.save(item);
        return mapToDto(saved, category.getName());
    }

    @Transactional
    public MenuItemDto toggleActive(UUID id) {
        MenuItem item = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MENU_ITEM_NOT_FOUND));
        item.setIsActive(!item.getIsActive());
        String catName = categoryRepository.findById(item.getCategoryId()).map(MenuCategory::getName).orElse("");
        return mapToDto(menuItemRepository.save(item), catName);
    }

    @Transactional
    public void deleteMenuItem(UUID id) {
        if (!menuItemRepository.existsById(id)) {
            throw new ResourceNotFoundException(ErrorCode.MENU_ITEM_NOT_FOUND);
        }
        menuItemRepository.deleteById(id);
    }

    private MenuItemDto mapToDto(MenuItem entity, String categoryName) {
        return MenuItemDto.builder()
                .id(entity.getId())
                .categoryId(entity.getCategoryId())
                .categoryName(categoryName)
                .name(entity.getName())
                .description(entity.getDescription())
                .price(entity.getPrice())
                .imageUrl(entity.getImageUrl())
                .isPreorderAvailable(entity.getIsPreorderAvailable())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
