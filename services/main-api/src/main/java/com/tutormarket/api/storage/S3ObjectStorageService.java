package com.tutormarket.api.storage;

import com.tutormarket.api.config.AppProperties;
import com.tutormarket.api.common.DomainException;
import org.springframework.http.HttpStatus;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;

@Service
@Profile("!local")
public class S3ObjectStorageService implements ObjectStorageService {

    private final S3Client s3Client;
    private final String bucket;

    public S3ObjectStorageService(S3Client s3Client, AppProperties appProperties) {
        this.s3Client = s3Client;
        this.bucket = appProperties.storage().bucket();
        ensureBucketExists();
    }

    @Override
    public void putObject(String objectKey, MultipartFile file) {
        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket)
                            .key(objectKey)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromBytes(file.getBytes())
            );
        } catch (IOException | S3Exception exception) {
            throw new DomainException(HttpStatus.BAD_GATEWAY, "Failed to upload file to object storage");
        }
    }

    @Override
    public void deleteObject(String objectKey) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build());
    }

    private void ensureBucketExists() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (NoSuchBucketException exception) {
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception exception) {
            if (exception.statusCode() == 404) {
                s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            }
        }
    }
}
