package com.attendance.config;

import javax.sql.DataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

/**
 * Performance optimization configuration for Lambda functions
 */
@Configuration
public class PerformanceConfig {

    /**
     * Optimized DataSource configuration for Lambda cold start reduction
     */
    @Bean
    @Profile("!test")
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        // Database connection settings
        config.setJdbcUrl(System.getenv("DB_URL"));
        config.setUsername(System.getenv("DB_USERNAME"));
        config.setPassword(System.getenv("DB_PASSWORD"));
        config.setDriverClassName("org.postgresql.Driver");

        // Performance optimizations for Lambda
        config.setMinimumIdle(1); // Minimum connections for Lambda
        config.setMaximumPoolSize(5); // Limit connections for Lambda
        config.setConnectionTimeout(10000); // 10 seconds
        config.setIdleTimeout(300000); // 5 minutes
        config.setMaxLifetime(600000); // 10 minutes
        config.setLeakDetectionThreshold(60000); // 1 minute

        // Connection validation
        config.setConnectionTestQuery("SELECT 1");
        config.setValidationTimeout(5000);

        // Performance tuning
        config.addDataSourceProperty("cachePrepStmts", "true");
        config.addDataSourceProperty("prepStmtCacheSize", "250");
        config.addDataSourceProperty("prepStmtCacheSqlLimit", "2048");
        config.addDataSourceProperty("useServerPrepStmts", "true");
        config.addDataSourceProperty("useLocalSessionState", "true");
        config.addDataSourceProperty("rewriteBatchedStatements", "true");
        config.addDataSourceProperty("cacheResultSetMetadata", "true");
        config.addDataSourceProperty("cacheServerConfiguration", "true");
        config.addDataSourceProperty("elideSetAutoCommits", "true");
        config.addDataSourceProperty("maintainTimeStats", "false");

        return new HikariDataSource(config);
    }

    /**
     * Connection pool warming for Lambda cold start optimization
     */
    @Bean
    public ConnectionWarmer connectionWarmer(DataSource dataSource) {
        return new ConnectionWarmer(dataSource);
    }

    /**
     * Custom connection warmer to reduce cold start time
     */
    public static class ConnectionWarmer {
        private final DataSource dataSource;

        public ConnectionWarmer(DataSource dataSource) {
            this.dataSource = dataSource;
            warmConnections();
        }

        private void warmConnections() {
            try {
                // Pre-warm connection pool
                var connection = dataSource.getConnection();
                connection.prepareStatement("SELECT 1").execute();
                connection.close();
            } catch (Exception e) {
                // Log warning but don't fail startup
                System.err
                        .println("Warning: Failed to warm database connections: " + e.getMessage());
            }
        }
    }
}
