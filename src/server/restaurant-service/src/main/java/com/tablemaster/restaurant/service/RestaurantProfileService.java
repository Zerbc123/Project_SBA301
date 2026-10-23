package com.tablemaster.restaurant.service;

import com.tablemaster.restaurant.dto.RestaurantProfileDto;
import com.tablemaster.restaurant.entity.RestaurantProfile;
import com.tablemaster.restaurant.exception.ErrorCode;
import com.tablemaster.restaurant.exception.ResourceNotFoundException;
import com.tablemaster.restaurant.repository.RestaurantProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RestaurantProfileService {

    private final RestaurantProfileRepository profileRepository;

    @Transactional(readOnly = true)
    public RestaurantProfileDto getProfile() {
        RestaurantProfile profile = profileRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.RESTAURANT_PROFILE_NOT_FOUND));
        return mapToDto(profile);
    }

    @Transactional(readOnly = true)
    public RestaurantProfileDto getProfileById(UUID id) {
        RestaurantProfile profile = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.RESTAURANT_NOT_FOUND));
        return mapToDto(profile);
    }

    @Transactional
    public RestaurantProfileDto updateProfile(UUID id, RestaurantProfileDto dto) {
        RestaurantProfile profile = (id != null)
                ? profileRepository.findById(id).orElseGet(() -> profileRepository.findFirstByOrderByIdAsc().orElse(new RestaurantProfile()))
                : profileRepository.findFirstByOrderByIdAsc().orElse(new RestaurantProfile());

        profile.setName(dto.getName());
        profile.setHotline(dto.getHotline());
        profile.setEmail(dto.getEmail());
        profile.setAddress(dto.getAddress());
        profile.setDescription(dto.getDescription());
        if (dto.getCoverImageUrl() != null) {
            profile.setCoverImageUrl(dto.getCoverImageUrl());
        }
        profile.setOpeningTime(dto.getOpeningTime());
        profile.setClosingTime(dto.getClosingTime());
        if (dto.getIsActive() != null) {
            profile.setIsActive(dto.getIsActive());
        }
        profile.setBankBin(dto.getBankBin());
        profile.setBankName(dto.getBankName());
        profile.setBankAccountNo(dto.getBankAccountNo());
        profile.setBankAccountHolder(dto.getBankAccountHolder());
        profile.setDefaultDepositAmount(dto.getDefaultDepositAmount());
        profile.setCancellationGraceHours(dto.getCancellationGraceHours());
        profile.setHoldTimeoutSeconds(dto.getHoldTimeoutSeconds());

        RestaurantProfile saved = profileRepository.save(profile);
        return mapToDto(saved);
    }

    private RestaurantProfileDto mapToDto(RestaurantProfile entity) {
        return RestaurantProfileDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .hotline(entity.getHotline())
                .email(entity.getEmail())
                .address(entity.getAddress())
                .description(entity.getDescription())
                .coverImageUrl(entity.getCoverImageUrl())
                .openingTime(entity.getOpeningTime())
                .closingTime(entity.getClosingTime())
                .isActive(entity.getIsActive())
                .bankBin(entity.getBankBin())
                .bankName(entity.getBankName())
                .bankAccountNo(entity.getBankAccountNo())
                .bankAccountHolder(entity.getBankAccountHolder())
                .defaultDepositAmount(entity.getDefaultDepositAmount())
                .cancellationGraceHours(entity.getCancellationGraceHours())
                .holdTimeoutSeconds(entity.getHoldTimeoutSeconds())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
