package kiro.attendance.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * データベース接続ユーティリティ
 */
public class DatabaseConnectionUtil {

    private static final String DB_URL = System.getenv("DB_URL");
    private static final String DB_USERNAME = System.getenv("DB_USERNAME");
    private static final String DB_PASSWORD = System.getenv("DB_PASSWORD");

    static {
        try {
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException e) {
            throw new RuntimeException("PostgreSQL driver not found", e);
        }
    }

    /**
     * データベース接続を取得
     */
    public static Connection getConnection() throws SQLException {
        if (DB_URL == null || DB_USERNAME == null || DB_PASSWORD == null) {
            throw new SQLException("Database connection parameters not configured");
        }

        return DriverManager.getConnection(DB_URL, DB_USERNAME, DB_PASSWORD);
    }
}
