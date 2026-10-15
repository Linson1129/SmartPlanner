CREATE TABLE user (
                      id         BIGINT      NOT NULL AUTO_INCREMENT COMMENT '主键',
                      username   VARCHAR(64) NOT NULL                COMMENT '全局唯一标识。登录接入后即为登录账号，现阶段仅用于区分数据归属',
                      nickname   VARCHAR(64) NULL                    COMMENT '展示用昵称，可空',
                      timezone   VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai'
                          COMMENT '用户时区。本期统一 Asia/Shanghai，仅作为记录，尚未参与任何时间计算；将来做跨时区时以此为回填依据',
                      created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
                          COMMENT '创建时间（Asia/Shanghai 墙钟）',
                      updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
             COMMENT '更新时间，由 MySQL 自动维护，无需业务层赋值',
                      PRIMARY KEY (id),
                      UNIQUE KEY uk_username (username) COMMENT '账号唯一'
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COMMENT = '用户表：数据归属主体';
