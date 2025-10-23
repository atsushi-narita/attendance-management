package kiro.attendance.util;

import java.util.Map;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import kiro.attendance.exception.ErrorCode;

/**
 * APIレスポンス作成ユーティリティ
 */
public class ResponseUtil {

    private static final ObjectMapper objectMapper =
            new ObjectMapper().registerModule(new JavaTimeModule());

    private static final Map<String, String> CORS_HEADERS =
            Map.of("Content-Type", "application/json", "Access-Control-Allow-Origin", "*",
                    "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers", "Content-Type, Authorization");

    /**
     * 成功レスポンスを作成
     */
    public static APIGatewayProxyResponseEvent createSuccessResponse(Object data) {
        try {
            String body = objectMapper.writeValueAsString(Map.of("success", true, "data", data));

            return new APIGatewayProxyResponseEvent().withStatusCode(200).withHeaders(CORS_HEADERS)
                    .withBody(body);
        } catch (Exception e) {
            return createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR, "レスポンス作成に失敗しました");
        }
    }

    /**
     * エラーレスポンスを作成
     */
    public static APIGatewayProxyResponseEvent createErrorResponse(ErrorCode errorCode) {
        return createErrorResponse(errorCode, errorCode.getMessage());
    }

    /**
     * エラーレスポンスを作成
     */
    public static APIGatewayProxyResponseEvent createErrorResponse(ErrorCode errorCode,
            String message) {
        try {
            String body = objectMapper.writeValueAsString(Map.of("success", false, "error",
                    Map.of("code", errorCode.getCode(), "message", message)));

            return new APIGatewayProxyResponseEvent().withStatusCode(errorCode.getHttpStatus())
                    .withHeaders(CORS_HEADERS).withBody(body);
        } catch (Exception e) {
            // フォールバック
            return new APIGatewayProxyResponseEvent().withStatusCode(500).withHeaders(CORS_HEADERS)
                    .withBody(
                            "{\"success\":false,\"error\":{\"code\":\"SYS_001\",\"message\":\"内部サーバーエラー\"}}");
        }
    }
}
