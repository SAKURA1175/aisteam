package com.tutormarket.api.storage;

import org.springframework.web.multipart.MultipartFile;

public interface ObjectStorageService {

    void putObject(String objectKey, MultipartFile file);

    void deleteObject(String objectKey);
}
