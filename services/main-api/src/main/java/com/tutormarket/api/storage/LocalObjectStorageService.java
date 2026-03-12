package com.tutormarket.api.storage;

import com.tutormarket.api.common.DomainException;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
@Profile("local")
public class LocalObjectStorageService implements ObjectStorageService {

    private final Path root = Path.of(".data", "object-storage");

    @Override
    public void putObject(String objectKey, MultipartFile file) {
        try {
            var target = root.resolve(objectKey).normalize();
            Files.createDirectories(target.getParent());
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new DomainException(HttpStatus.BAD_GATEWAY, "Failed to upload file to local storage");
        }
    }

    @Override
    public void deleteObject(String objectKey) {
        try {
            Files.deleteIfExists(root.resolve(objectKey).normalize());
        } catch (IOException exception) {
            throw new DomainException(HttpStatus.BAD_GATEWAY, "Failed to delete file from local storage");
        }
    }
}
