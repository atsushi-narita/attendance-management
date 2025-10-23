package kiro.attendance.handler;

import java.sql.Connection;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import kiro.attendance.auth.AuthenticatedUser;
import kiro.attendance.auth.CognitoAuthService;
import kiro.attendance.dao.AttendanceRecordDao;
import kiro.attendance.dao.EmployeeDao;
import kiro.attendance.dao.impl.AttendanceRecordDaoImpl;
import kiro.attendance.dao.impl.EmployeeDaoImpl;
import kiro.attendance.entity.AttendanceRecord;
import kiro.attendance.exception.AttendanceException;
import kiro.attendance.exception.ErrorCode;
import kiro.attendance.service.AttendanceService;
import kiro.attendance.util.DatabaseConnectionUtil;
import kiro.attendance.util.ResponseUtil;

/**
 * 打刻機能Lambda関数ハンドラー
 */
public class AttendanceHandler
        implements RequestHandler<APIGatewayProxyRequestEvent, APIGatewayProxyResponseEvent> {

    private final ObjectMapper objectMapper = new ObjectMapper();
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

            try (Connection connection = DatabaseConnectionUtil.getConnection()) {
                AttendanceRecordDao attendanceRecordDao = new AttendanceRecordDaoImpl(connection);
                EmployeeDao employeeDao = new EmployeeDaoImpl(connection);
                AttendanceService attendanceService =
                        new AttendanceService(attendanceRecordDao, employeeDao);

                switch (httpMethod) {
                    case "POST":
                        if (path.endsWith("/clock-in")) {
                            return handleClockIn(attendanceService, user);
                        } else if (path.endsWith("/clock-out")) {
                            return handleClockOut(attendanceService, user);
                        }
                        break;
                    case "GET":
                        if (path.endsWith("/status")) {
                            return handleGetStatus(attendanceService, user);
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
     * 出勤打刻処理
     */
    private APIGatewayProxyResponseEvent handleClockIn(AttendanceService attendanceService,
            AuthenticatedUser user) {
        try {
            AttendanceRecord record = attendanceService.clockIn(user.getEmployeeId());
            return ResponseUtil.createSuccessResponse(record);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "出勤打刻に失敗しました", e);
        }
    }

    /**
     * 退勤打刻処理
     */
    private APIGatewayProxyResponseEvent handleClockOut(AttendanceService attendanceService,
            AuthenticatedUser user) {
        try {
            AttendanceRecord record = attendanceService.clockOut(user.getEmployeeId());
            return ResponseUtil.createSuccessResponse(record);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "退勤打刻に失敗しました", e);
        }
    }

    /**
     * 打刻状態取得処理
     */
    private APIGatewayProxyResponseEvent handleGetStatus(AttendanceService attendanceService,
            AuthenticatedUser user) {
        try {
            AttendanceRecord record = attendanceService.getAttendanceStatus(user.getEmployeeId());
            return ResponseUtil.createSuccessResponse(record);
        } catch (Exception e) {
            throw new AttendanceException(ErrorCode.INTERNAL_SERVER_ERROR, "打刻状態の取得に失敗しました", e);
        }
    }
}
