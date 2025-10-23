package kiro.attendance.dao;

import java.util.List;
import java.util.Optional;
import kiro.attendance.entity.CorrectionRequest;
import kiro.attendance.entity.CorrectionStatus;

/**
 * 修正申請データアクセスオブジェクト
 */
public interface CorrectionRequestDao {

    /**
     * IDで修正申請を取得
     */
    Optional<CorrectionRequest> findById(Long id);

    /**
     * 承認待ちの修正申請一覧を取得
     */
    List<CorrectionRequest> findPendingRequests();

    /**
     * 従業員IDで修正申請一覧を取得
     */
    List<CorrectionRequest> findByEmployeeId(Long employeeId);

    /**
     * ステータスで修正申請一覧を取得
     */
    List<CorrectionRequest> findByStatus(CorrectionStatus status);

    /**
     * 修正申請を挿入
     */
    CorrectionRequest insert(CorrectionRequest request);

    /**
     * 修正申請を更新
     */
    CorrectionRequest update(CorrectionRequest request);

    /**
     * 修正申請を削除
     */
    void delete(Long id);
}
