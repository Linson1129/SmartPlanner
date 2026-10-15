package com.must.planner.domain;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.util.Date;
import lombok.Data;

/**
 * 日程与待办主表：start_time 为 NULL 即为待办
 * @TableName event
 */
@TableName(value ="event")
@Data
public class Event {
    /**
     * 主键
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 归属用户 -> user.id。逻辑外键，不建物理约束，便于日后拆库与归档
     */
    private Long user_id;

    /**
     * 标题。日程与待办共用，长度按单行展示上限收紧
     */
    private String title;

    /**
     * 备注正文，允许为空
     */
    private String description;

    /**
     * 开始时间。NULL 即表示这是待办而非日程（见表头约定）；全天日程此处存当日 00:00:00
     */
    private Date start_time;

    /**
     * 结束时间。日程语义下行应有值；待办一般为 NULL；全天日程存当日 23:59:59
     */
    private Date end_time;

    /**
     * 截止时间。主要用于待办（start_time 为 NULL 的行）；日程行也可填以表达最后期限
     */
    private Date due_time;

    /**
     * 是否全天：1=全天（此时应配 start_time=00:00:00 且 end_time=23:59:59），0=指定时段
     */
    private Integer is_all_day;

    /**
     * 状态：PENDING=未完成，DONE=已完成，CANCELLED=已取消。MyBatis 必须以枚举 name 存取（EnumTypeHandler），禁止存 ordinal，否则将来插入中间值会导致全表静默错位
     */
    private Object status;

    /**
     * 优先级：0=无，数值越大越优先。本期不约束取值范围，待 UI 定稿后归一化
     */
    private Integer priority;

    /**
     * 实际完成时刻。冗余于 status=DONE，用于事后统计提前/延后完成，避免反推不准
     */
    private Date completed_at;

    /**
     * 创建时间
     */
    private Date created_at;

    /**
     * 更新时间，MySQL 自动维护
     */
    private Date updated_at;

    /**
     * 软删除标记：NULL=有效。所有业务查询须统一追加 deleted_at IS NULL
     */
    private Date deleted_at;

    @Override
    public boolean equals(Object that) {
        if (this == that) {
            return true;
        }
        if (that == null) {
            return false;
        }
        if (getClass() != that.getClass()) {
            return false;
        }
        Event other = (Event) that;
        return (this.getId() == null ? other.getId() == null : this.getId().equals(other.getId()))
            && (this.getUser_id() == null ? other.getUser_id() == null : this.getUser_id().equals(other.getUser_id()))
            && (this.getTitle() == null ? other.getTitle() == null : this.getTitle().equals(other.getTitle()))
            && (this.getDescription() == null ? other.getDescription() == null : this.getDescription().equals(other.getDescription()))
            && (this.getStart_time() == null ? other.getStart_time() == null : this.getStart_time().equals(other.getStart_time()))
            && (this.getEnd_time() == null ? other.getEnd_time() == null : this.getEnd_time().equals(other.getEnd_time()))
            && (this.getDue_time() == null ? other.getDue_time() == null : this.getDue_time().equals(other.getDue_time()))
            && (this.getIs_all_day() == null ? other.getIs_all_day() == null : this.getIs_all_day().equals(other.getIs_all_day()))
            && (this.getStatus() == null ? other.getStatus() == null : this.getStatus().equals(other.getStatus()))
            && (this.getPriority() == null ? other.getPriority() == null : this.getPriority().equals(other.getPriority()))
            && (this.getCompleted_at() == null ? other.getCompleted_at() == null : this.getCompleted_at().equals(other.getCompleted_at()))
            && (this.getCreated_at() == null ? other.getCreated_at() == null : this.getCreated_at().equals(other.getCreated_at()))
            && (this.getUpdated_at() == null ? other.getUpdated_at() == null : this.getUpdated_at().equals(other.getUpdated_at()))
            && (this.getDeleted_at() == null ? other.getDeleted_at() == null : this.getDeleted_at().equals(other.getDeleted_at()));
    }

    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((getId() == null) ? 0 : getId().hashCode());
        result = prime * result + ((getUser_id() == null) ? 0 : getUser_id().hashCode());
        result = prime * result + ((getTitle() == null) ? 0 : getTitle().hashCode());
        result = prime * result + ((getDescription() == null) ? 0 : getDescription().hashCode());
        result = prime * result + ((getStart_time() == null) ? 0 : getStart_time().hashCode());
        result = prime * result + ((getEnd_time() == null) ? 0 : getEnd_time().hashCode());
        result = prime * result + ((getDue_time() == null) ? 0 : getDue_time().hashCode());
        result = prime * result + ((getIs_all_day() == null) ? 0 : getIs_all_day().hashCode());
        result = prime * result + ((getStatus() == null) ? 0 : getStatus().hashCode());
        result = prime * result + ((getPriority() == null) ? 0 : getPriority().hashCode());
        result = prime * result + ((getCompleted_at() == null) ? 0 : getCompleted_at().hashCode());
        result = prime * result + ((getCreated_at() == null) ? 0 : getCreated_at().hashCode());
        result = prime * result + ((getUpdated_at() == null) ? 0 : getUpdated_at().hashCode());
        result = prime * result + ((getDeleted_at() == null) ? 0 : getDeleted_at().hashCode());
        return result;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append(getClass().getSimpleName());
        sb.append(" [");
        sb.append("Hash = ").append(hashCode());
        sb.append(", id=").append(id);
        sb.append(", user_id=").append(user_id);
        sb.append(", title=").append(title);
        sb.append(", description=").append(description);
        sb.append(", start_time=").append(start_time);
        sb.append(", end_time=").append(end_time);
        sb.append(", due_time=").append(due_time);
        sb.append(", is_all_day=").append(is_all_day);
        sb.append(", status=").append(status);
        sb.append(", priority=").append(priority);
        sb.append(", completed_at=").append(completed_at);
        sb.append(", created_at=").append(created_at);
        sb.append(", updated_at=").append(updated_at);
        sb.append(", deleted_at=").append(deleted_at);
        sb.append("]");
        return sb.toString();
    }
}