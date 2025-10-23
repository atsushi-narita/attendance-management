package kiro.attendance.handler;

import java.sql.Connection;
import java.util.List;
import java.util.Map;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import kiro.attendance.auth.AuthenticatedUser;
import kiro.attendance.auth.CognitoAuthService;
import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.dao.CorrectionRequestDao;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.dao.impl.AttendanceRecordDaoImpl;
import kiro.attendance.dao.impl.CorrectionRequestDaoImpl;
import kiro.attendance.dao.impl.EmployeeDaoImpl;
import kiro.attendance.entity.CorrectionRequest;
import kiro.attendance.entity.CorrectionStatus;
import kiro.attendance.entity.UserRole;
import kiro.attendance.exception.AttendanceException;
import kiro.attendance.exception.ErrorCode;
import kiro.attendance.service.CorrectionService;
import kiro.attendance.util.DatabaseConnectionUtil;
import kiro.attendance.util.ResponseUtil;

/**
 * 修正申請Lambda関数ハンドラー
 */
public class CorrectionHandler
        implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    private final ObjectMapper objectMapper =
            new ObjectMapper().registerModule(new JavaTimeModule());
    private final CognitoAuthService authService =
            new CognitoAuthService(System.getenv("COGNITO_USER_POOL_ID"),
                    System.getenv("COGNITO_CLIENT_ID"), System.getenv("AWS_REGION"));

    @Override
    public APIGatewayProxyResponseEvent handleRequest(APIGatewayProxyRequestEvent input,
            Context context) {
        try {
            // 認証チェック
            AuthenticatedUser user = authService.authenticate(input);
            if (user == null) {
                return ResponseUtil.createErrorResponse(ErrorCode.UNAUTHORIZED);
            }

            // HTTPメソッドとパスによる処理分岐
            String httpMethod = input.getHttpMethod();
            String path = input.getPath();
            Map<String, String> pathParameters = input.getPathParameters();
            Map<String, String> queryParameters = input.getQueryStringParameters();

            try (Connection connection = DatabaseConnectionUtil.getConnection()) {
                CorrectionRequestDao correctionRequestDao =
                        new CorrectionRequestDaoImpl(connection);
                AttendanceRecordDao attendanceRecordDao = new AttendanceRecordDaoImpl(connection);
                EmployeeDao employeeDao = new EmployeeDaoImpl(connection);
                CorrectionService correctionService = new CorrectionService(correctionRequestDao,
                        attendanceRecordDao, employeeDao);

                switch (httpMethod) {
                    case "POST":
                        if (path.equals("/api/corrections")) {
                            return handleSubmitCorrectionRequest(correctionService, user,
                                    input.getBody());
                        }
                        break;
                    case "GET":
                        if (path.equals("/api/corrections")) {
                            return handleGetCorrectionRequests(correctionService, user,
                                    queryParameters);
                        }
                        break;
                    case "PUT":
                        if (path.matches("/api/corrections/\\d+/approve$")) {
                            Long requestId = Long.parseLong(pathParameters.get("id"));
                            return handleApproveCorrectionRequest(correctionService, user,
                                    requestId);
                        } else if (path.matches("/api/corrections/\\d+/reject$")) {
                            Long requestId = Long.parseLong(pathParameters.get("id"));
                            return handleRejectCorrectionRequest(correctionService, user, requestId,
                                    input.getBody());
                        }
                        break;
                }

                return ResponseUtil.createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR,
                        "不正なリクエストです");
            }

        } catch (AttendanceException e) {
            context.getLogger().log("AttendanceException: " + e.getMessage());
            return ResponseUtil.createErrorResponse(e.getErrorCode(), e.getMessage());
        } catch (Exception e) {
            context.getLogger().log("Unexpected error: " + e.getMessage());
            return ResponseUtil.createErrorResponse(ErrorCode.INTERNAL_SERVER_ERROR,
                    "予期しないエラーが発生しました");
        }
    }

    /**
     * 修正申請提出処理
     */
    private APIGatewayProxyResponseEvent handleSubmitCorrectionRequest(
            CorrectionService correctionService, AuthenticatedUser user, String requestBody) {
        try {
            CorrectionService.CorrectionRequestSubmission submission = objectMapper
                    .readValue(requestBody, CorrectionService.CorrectionRequestSubmission.class);

            // 従業員IDを認証ユーザーのIDに設定
            submission.setEmployeeId(user.getEmployeeId());

            CorrectionRequest request = correctionService.submitCorrectionRequest(submission);
            return ResponseUtil.createSuccessResponse(request);
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "修正申請の提出に失敗しました", e);
        }
    }

    /**
     * 修正申請一覧取得処理
     */
    private APIGatewayProxyResponseEvent handleGetCorrectionRequests(
            CorrectionService correctionService, AuthenticatedUser user,
            Map<String, String> queryParameters) {
        try {
            Long employeeId = null;
            CorrectionStatus status = null;

            // 管理者以外は自分の申請のみ取得可能
            if (!user.hasRole(UserRole.MANAGER) && !user.hasRole(UserRole.ADMIN)) {
                employeeId = user.getEmployeeId();
            } else {
                // 管理者の場合はクエリパラメータを確認
                if (queryParameters != null) {
                    if (queryParameters.containsKey("employeeId")) {
                        employeeId = Long.parseLong(queryParameters.get("employeeId"));
                    }
                    if (queryParameters.containsKey("status")) {
                        status = CorrectionStatus
                                .valueOf(queryParameters.get("status").toUpperCase());
                    }
                }
            }

            List<CorrectionRequest> requests =
                    correctionService.getCorrectionRequests(employeeId, status);
            return ResponseUtil.createSuccessResponse(requests);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "修正申請一覧の取得に失敗しました", e);
        }
    }

    /**
     * 修正申請承認処理
     */
    private APIGatewayProxyResponseEvent handleApproveCorrectionRequest(
            CorrectionService correctionService, AuthenticatedUser user, Long requestId) {

        // 管理者権限チェック
        if (!user.hasRole(UserRole.MANAGER) && !user.hasRole(UserRole.ADMIN)) {
            return ResponseUtil.createErrorResponse(ErrorCode.FORBIDDEN, "管理者権限が必要です");
        }

        try {
            CorrectionRequest request = correctionService.approveCorrectionRequest(requestId);
            return ResponseUtil.createSuccessResponse(request);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "修正申請の承認に失敗しました", e);
        }
    }

    /**
     * 修正申請却下処理
     */
    private APIGatewayProxyResponseEvent handleRejectCorrectionRequest(
            CorrectionService correctionService, AuthenticatedUser user, Long requestId,
            String requestBody) {

        // 管理者権限チェック
        if (!user.hasRole(UserRole.MANAGER) && !user.hasRole(UserRole.ADMIN)) {
            return ResponseUtil.createErrorResponse(ErrorCode.FORBIDDEN, "管理者権限が必要です");
        }

        try {
            String rejectionReason = null;
            if (requestBody != null && !requestBody.trim().isEmpty()) {
                CorrectionService.CorrectionRejectionRequest rejectionRequest = objectMapper
                        .readValue(requestBody, CorrectionService.CorrectionRejectionRequest.class);
                rejectionReason = rejectionRequest.getRejectionReason();
            }

            CorrectionRequest request =
                    correctionService.rejectCorrectionRequest(requestId, rejectionReason);
            return ResponseUtil.createSuccessResponse(request);
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "修正申請の却下に失敗しました", e);
        }
    }
}
