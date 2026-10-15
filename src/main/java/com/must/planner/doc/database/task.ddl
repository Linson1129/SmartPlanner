CREATE TABLE event (
                       id           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
                       user_id      BIGINT       NOT NULL                COMMENT '归属用户 -> user.id。逻辑外键，不建物理约束，便于日后拆库与归档',

                       title        VARCHAR(200) NOT NULL                COMMENT '标题。日程与待办共用，长度按单行展示上限收紧',
                       description  TEXT         NULL                    COMMENT '备注正文，允许为空',

    -- ---------------- 时间轴 ----------------
                       start_time   DATETIME     NULL                    COMMENT '开始时间。NULL 即表示这是待办而非日程（见表头约定）；全天日程此处存当日 00:00:00',
                       end_time     DATETIME     NULL                    COMMENT '结束时间。日程语义下行应有值；待办一般为 NULL；全天日程存当日 23:59:59',
                       due_time     DATETIME     NULL                    COMMENT '截止时间。主要用于待办（start_time 为 NULL 的行）；日程行也可填以表达最后期限',
                       is_all_day   TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '是否全天：1=全天（此时应配 start_time=00:00:00 且 end_time=23:59:59），0=指定时段',

    -- ---------------- 生命周期 ----------------
                       status       ENUM('PENDING','DONE','CANCELLED') NOT NULL DEFAULT 'PENDING'
               COMMENT '状态：PENDING=未完成，DONE=已完成，CANCELLED=已取消。MyBatis 必须以枚举 name 存取（EnumTypeHandler），禁止存 ordinal，否则将来插入中间值会导致全表静默错位',
                       priority     TINYINT      NOT NULL DEFAULT 0      COMMENT '优先级：0=无，数值越大越优先。本期不约束取值范围，待 UI 定稿后归一化',
                       completed_at DATETIME     NULL                    COMMENT '实际完成时刻。冗余于 status=DONE，用于事后统计提前/延后完成，避免反推不准',

    -- ---------------- 审计与软删除 ----------------
                       created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                           COMMENT '创建时间',
                       updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
               COMMENT '更新时间，MySQL 自动维护',
                       deleted_at   DATETIME     NULL                    COMMENT '软删除标记：NULL=有效。所有业务查询须统一追加 deleted_at IS NULL',

                       PRIMARY KEY (id),
                       KEY idx_user_time       (user_id, start_time, end_time) COMMENT '日/周/月视图主查询：按「用户 + 时间窗」取日程',
                       KEY idx_user_status_due (user_id, status, due_time)     COMMENT '「没做完的事」聚合：未完成项按截止时间排序过滤'
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT = '日程与待办主表：start_time 为 NULL 即为待办';
