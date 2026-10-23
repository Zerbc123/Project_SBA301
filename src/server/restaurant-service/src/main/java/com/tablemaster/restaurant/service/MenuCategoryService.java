package com.tablemaster.restaurant.service;

import com.tablemaster.restaurant.dto.MenuCategoryDto;
import com.tablemaster.restaurant.dto.MenuItemDto;
import com.tablemaster.restaurant.entity.MenuCategory;
import com.tablemaster.restaurant.entity.MenuItem;
import com.tablemaster.restaurant.exception.BadRequestException;
import com.tablemaster.restaurant.exception.ErrorCode;
import com.tablemaster.restaurant.exception.ResourceNotFoundException;
import com.tablemaster.restaurant.repository.MenuCategoryRepository;
import com.tablemaster.restaurant.repository.MenuItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuCategoryService {

    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository itemRepository;

    @Transactional(readOnly = true)
    public List<MenuCategoryDto> getAllCategories(boolean activeOnly, boolean includeItems) {
        List<MenuCategory> categories = activeOnly
                ? categoryRepository.findByIsActiveTrueOrderByDisplayOrderAsc()
                : categoryRepository.findAllByOrderByDisplayOrderAsc();

        return categories.stream().map(cat -> {
            MenuCategoryDto dto = mapToDto(cat);
            if (includeItems) {
                List<MenuItem> items = activeOnly
                        ? itemRepository.findByCategoryIdAndIsActiveTrue(cat.getId())
                        : itemRepository.findByCategoryId(cat.getId());
                dto.setItems(items.stream().map(item -> mapItemToDto(item, cat.getName())).collect(Collectors.toList()));
            }
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MenuCategoryDto getCategoryById(UUID id, boolean includeItems) {
        MenuCategory cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CATEGORY_NOT_FOUND));

        MenuCategoryDto dto = mapToDto(cat);
        if (includeItems) {
            List<MenuItem> items = itemRepository.findByCategoryId(cat.getId());
            dto.setItems(items.stream().map(item -> mapItemToDto(item, cat.getName())).collect(Collectors.toList()));
        }
        return dto;
    }

    @Transactional
    public MenuCategoryDto createCategory(MenuCategoryDto dto) {
        MenuCategory category = MenuCategory.builder()
                .name(dto.getName())
                .displayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : 0)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        MenuCategory saved = categoryRepository.save(category);
        return mapToDto(saved);
    }

    @Transactional
    public MenuCategoryDto updateCategory(UUID id, MenuCategoryDto dto) {
        MenuCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CATEGORY_NOT_FOUND));

        category.setName(dto.getName());
        if (dto.getDisplayOrder() != null) category.setDisplayOrder(dto.getDisplayOrder());
        if (dto.getIsActive() != null) category.setIsActive(dto.getIsActive());

        MenuCategory saved = categoryRepository.save(category);
        return mapToDto(saved);
    }

    @Transactional
    public MenuCategoryDto toggleActive(UUID id) {
        MenuCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.CATEGORY_NOT_FOUND));
        category.setIsActive(!category.getIsActive());
        return mapToDto(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(UUID id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException(ErrorCode.CATEGORY_NOT_FOUND);
        }
        long itemCount = itemRepository.countByCategoryId(id);
        if (itemCount > 0) {
            throw new BadRequestException(ErrorCode.CATEGORY_HAS_ITEMS);
        }
        categoryRepository.deleteById(id);
    }

    private MenuCategoryDto mapToDto(MenuCategory entity) {
        return MenuCategoryDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .displayOrder(entity.getDisplayOrder())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private MenuItemDto mapItemToDto(MenuItem item, String categoryName) {
        return MenuItemDto.builder()
                .id(item.getId())
                .categoryId(item.getCategoryId())
                .categoryName(categoryName)
                .name(item.getName())
                .description(item.getDescription())
                .price(item.getPrice())
                .imageUrl(item.getImageUrl())
                .isPreorderAvailable(item.getIsPreorderAvailable())
                .isActive(item.getIsActive())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
