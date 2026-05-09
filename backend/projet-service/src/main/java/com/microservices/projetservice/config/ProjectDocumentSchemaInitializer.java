package com.microservices.projetservice.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectDocumentSchemaInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    @Override
    public void run(ApplicationArguments args) {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            String productName = metaData.getDatabaseProductName();
            String product = productName == null ? "" : productName.trim().toLowerCase();

            if (product.contains("mysql")) {
                jdbcTemplate.execute("ALTER TABLE project_documents MODIFY COLUMN file_url LONGTEXT");
                log.info("Schema check: ensured project_documents.file_url is LONGTEXT");
                return;
            }

            if (product.contains("h2")) {
                jdbcTemplate.execute("ALTER TABLE project_documents ALTER COLUMN file_url CLOB");
                log.info("Schema check: ensured project_documents.file_url is CLOB");
            }
        } catch (Exception ex) {
            // Non-fatal: keep startup resilient when table is absent or permission is restricted.
            log.debug("Schema check skipped for project_documents.file_url: {}", ex.getMessage());
        }
    }
}

