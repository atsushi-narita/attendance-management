package kiro.attendance.handler;

import java.sql.Connection;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import kiro.attendance.auth.AuthenticatedUser;
import kiro.attendance.auth.CognitoAuthService;
import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.dao.impl.AttendanceRecordDaoImpl;
import kiro.attendance.dao.impl.EmployeeDaoImpl;
import kiro.attendance.entity.AttendanceRecord;
import kiro.attendance.entity.UserRole;
import kiro.attendance.exception.AttendanceException;
import kiro.attendance.exception.ErrorCode;
import kiro.attendance.service.RecordService;
import kiro.attendance.util.DatabaseConnectionUtil;
import kiro.attendance.util.ResponseUtil;

/**
 * 勤務記録管理Lambda関数ハンドラー
 */
public class RecordHandler
        implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

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
                AttendanceRecordDao attendanceRecordDao = new AttendanceRecordDaoImpl(connection);
                EmployeeDao employeeDao = new EmployeeDaoImpl(connection);
                RecordService recordService = new RecordService(attendanceRecordDao, employeeDao);

                if ("GET".equals(httpMethod)) {
                    if (path.equals("/api/records")) {
                        return handleGetAllRecords(recordService, user, queryParameters);
                    } else if (path.matches("/api/records/\\d+$")) {
                        Long employeeId = Long.parseLong(pathParameters.get("employeeId"));
                        return handleGetEmployeeRecords(recordService, user, employeeId,
                                queryParameters);
                    } else if (path.matches("/api/records/\\d+/summary$")) {
                        Long employeeId = Long.parseLong(pathParameters.get("employeeId"));
                        return handleGetWorkingHoursSummary(recordService, user, employeeId,
                                queryParameters);
                    }
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
     * 勤務記録一覧取得処理（管理者用）
     */
    private APIGatewayProxyResponseEvent handleGetAllRecords(RecordService recordService,
            AuthenticatedUser user, Map<String, String> queryParameters) {

        // 管理者権限チェック
        if (!user.hasRole(UserRole.MANAGER) && !user.hasRole(UserRole.ADMIN)) {
            return ResponseUtil.createErrorResponse(ErrorCode.FORBIDDEN, "管理者権限が必要です");
        }

        try {
            YearMonth month = parseYearMonth(queryParameters);
            List<AttendanceRecord> records = recordService.getAllRecords(month);
            return ResponseUtil.createSuccessResponse(records);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "勤務記録一覧の取得に失敗しました", e);
        }
    }

    /**
     * 従業員別勤務記録取得処理
     */
    private APIGatewayProxyResponseEvent handleGetEmployeeRecords(RecordService recordService,
            AuthenticatedUser user, Long employeeId, Map<String, String> queryParameters) {

        // 権限チェック（自分の記録または管理者権限）
        if (!user.getEmployeeId().equals(employeeId) && !user.hasRole(UserRole.MANAGER)
                && !user.hasRole(UserRole.ADMIN)) {
            return ResponseUtil.createErrorResponse(ErrorCode.FORBIDDEN, "他の従業員の記録を参照する権限がありません");
        }

        try {
            YearMonth month = parseYearMonth(queryParameters);
            List<AttendanceRecord> records = recordService.getEmployeeRecords(employeeId, month);
            return ResponseUtil.createSuccessResponse(records);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "従業員勤務記録の取得に失敗しました", e);
        }
    }

    /**
     * 月別勤務時間サマリー取得処理
     */
    private APIGatewayProxyResponseEvent handleGetWorkingHoursSummary(RecordService recordService,
            AuthenticatedUser user, Long employeeId, Map<String, String> queryParameters) {

        // 権限チェック（自分の記録または管理者権限）
        if (!user.getEmployeeId().equals(employeeId) && !user.hasRole(UserRole.MANAGER)
                && !user.hasRole(UserRole.ADMIN)) {
            return ResponseUtil.createErrorResponse(ErrorCode.FORBIDDEN, "他の従業員の記録を参照する権限がありません");
        }

        try {
            YearMonth month = parseYearMonth(queryParameters);
            RecordService.WorkingHoursSummary summary =
                    recordService.getWorkingHoursSummary(employeeId, month);
            return ResponseUtil.createSuccessResponse(summary);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "勤務時間サマリーの取得に失敗しました", e);
        }
    }

    /**
     * クエリパラメータからYearMonthを解析
     */
    private YearMonth parseYearMonth(Map<String, String> queryParameters) {
        if (queryParameters == null || !queryParameters.containsKey("month")) {
            return null;
        }

        try {
            return YearMonth.parse(queryParameters.get("month"));
        } catch (DateTimeParseException e) {
            throw new AttendanceException(ErrorCode.INVALID_TIME_RANGE,
                    "無効な月形式です（YYYY-MM形式で指定してください）");
        }
    }
}
