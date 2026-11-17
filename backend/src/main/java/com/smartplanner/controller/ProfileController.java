package com.smartplanner.controller;

import com.smartplanner.dto.ProfileDto;
import com.smartplanner.dto.ProfileUpdateRequest;
import com.smartplanner.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping
    public ProfileDto get() {
        return profileService.getDto();
    }

    @PutMapping
    public ProfileDto update(@Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.update(request);
    }
}
