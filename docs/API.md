# API 参考

基础地址：`http://127.0.0.1:8080`。前端通过 `NEXT_PUBLIC_API_BASE_URL` 直连该地址，由 Java CORS 授权；没有 Next.js 代理。

所有时间均为本地墙钟 ISO 字符串，例如 `2026-11-05T14:00:00`，不带时区偏移。

## 枚举

| 名称 | 值 |
| --- | --- |
| `type` | `NORMAL` / `IMPORTANT` / `CASUAL` / `CONTAINER` / `GOAL` |
| `priority` | `HIGH` / `MEDIUM` / `LOW` |
| `status` | `PLANNED` / `IN_PROGRESS` / `DONE` / `CANCELLED` |
| `holidayMode` | `OFF` / `SOFT` / `AVOID` |
| `holidayRegion` | `CN` / `MO` |

## 事件

### `GET /api/events?from=...&to=...`

返回与 `[from, to)` 相交的事件（包括开始时间早于 `from` 的跨天事件、`endAt=null` 的进行中目标）。参数可省略，默认最近 30 天到未来 60 天。

```json
[
  {
    "id": 2,
    "title": "团队周会",
    "notes": "同步本周进度",
    "type": "IMPORTANT",
    "priority": "HIGH",
    "status": "PLANNED",
    "startAt": "2026-11-05T10:00:00",
    "endAt": "2026-11-05T11:00:00",
    "dueAt": null,
    "parentId": null,
    "parentTitle": null,
    "location": "线上",
    "goalCompleted": false,
    "weatherSensitive": false,
    "lookaheadDays": 0,
    "completedAt": null,
    "createdAt": "2026-11-05T09:55:28",
    "updatedAt": "2026-11-05T09:55:28"
  }
]
```

### `POST /api/events`

请求：

```json
{
  "title": "和导师讨论选题",
  "notes": "带三份备选题目",
  "type": "NORMAL",
  "priority": "HIGH",
  "startAt": "2026-11-05T10:30:00",
  "endAt": "2026-11-05T11:30:00",
  "dueAt": null,
  "parentId": null,
  "location": "导师办公室",
  "weatherSensitive": false,
  "lookaheadDays": 0
}
```

约束：

- `GOAL` 的 `endAt` 必须为 `null`，且不能设置 `parentId`；
- 其它类型必须有 `endAt` 且晚于 `startAt`；
- `CONTAINER` 不能设置 `parentId`，也不支持嵌套；
- `parentId` 只能指向一个顶层 `CONTAINER`；
- `title` 必填，最长 200；`notes` 最长 4000；`location` 最长 200。

响应 `201`：

```json
{
  "event": { "id": 20, "title": "和导师讨论选题", "...": "..." },
  "analysis": {
    "engineAvailable": true,
    "engineMessage": null,
    "conflicts": [
      {
        "eventId": 2,
        "title": "团队周会",
        "type": "IMPORTANT",
        "startAt": "2026-11-05T10:00:00",
        "endAt": "2026-11-05T11:00:00",
        "overlapMinutes": 30
      }
    ],
    "holidayWarnings": [],
    "deadlineWarning": null,
    "suggestions": [
      {
        "id": "shift-later",
        "strategy": "SHIFT_LATER",
        "label": "整体后移 35 分钟",
        "reason": "保持时长不变，从 10:30 改到 11月5日 11:05，避开与《团队周会》的重叠。",
        "impact": "LOW",
        "changes": [
          {
            "eventId": 20,
            "title": "和导师讨论选题",
            "startAt": "2026-11-05T11:05:00",
            "endAt": "2026-11-05T12:05:00",
            "previousStartAt": "2026-11-05T10:30:00",
            "previousEndAt": "2026-11-05T11:30:00"
          }
        ]
      }
    ],
    "generatedAt": "2026-11-05T10:20:00"
  }
}
```

`analysis.engineAvailable=false` 时，`engineMessage` 说明原因，事件仍然保存成功。

### `PUT /api/events/{id}`

请求体与创建一致。响应仍是 `{event, analysis}`。

### `PATCH /api/events/{id}/complete`

- 普通 / 重要 / 随意 / 容器：`status=DONE`、记录 `completedAt`；
- `GOAL`：`status=DONE`、`goalCompleted=true`、`endAt=now`、**`type` 变为 `CONTAINER`**。

响应为单个事件对象。

### `DELETE /api/events/{id}`

```json
{ "id": 20, "detachedChildren": 0 }
```

如果删除的是容器，`detachedChildren` 是保留下来并转为独立事件的子事件数量。

## 应用排期建议

### `POST /api/schedule/apply`

只应该传入用户在弹窗中确认的那个 suggestion 的 changes。

```json
{
  "anchorEventId": 20,
  "changes": [
    {
      "eventId": 20,
      "startAt": "2026-11-05T11:05:00",
      "endAt": "2026-11-05T12:05:00"
    }
  ]
}
```

响应：

```json
{
  "events": [ { "id": 20, "...": "..." } ],
  "analysis": { "conflicts": [], "suggestions": [], "...": "..." }
}
```

已完成 / 已取消的事件不能通过此接口调整；进行中的目标也不能通过此接口设置结束时间。

## 概览与 DDL

### `GET /api/overview?date=2026-11-05`

```json
{
  "now": "2026-11-05T10:20:00",
  "date": "2026-11-05",
  "expectedFinishAt": "2026-11-05T22:00:00",
  "urgentDdl": {
    "event": { "id": 5, "title": "提交需求分析报告", "...": "..." },
    "minutesLeft": 670,
    "withinExpected": true
  },
  "nextDdl": { "...": "..." },
  "todayCount": 7,
  "todayMinutes": 320,
  "activeGoals": 1,
  "completedToday": 1,
  "holiday": null
}
```

- `urgentDdl`：最近的、`dueAt <= expectedFinishAt` 的 DDL；
- `nextDdl`：最近的 DDL（无论是否在预期收工前），前端在 `urgentDdl=null` 时作为后备；
- 统计只计算顶层事件，避免容器与子事件重复计数。

## 用户偏好

### `GET /api/profile`

```json
{
  "displayName": "JinHeng",
  "expectedFinishTime": "22:00",
  "expectedFinishAt": "2026-11-05T22:00:00",
  "holidayMode": "SOFT",
  "holidayRegion": "MO",
  "weatherProvince": "MACAU",
  "idleThresholdSeconds": 90,
  "demoSeeded": true
}
```

### `PUT /api/profile`

```json
{
  "displayName": "JinHeng",
  "expectedFinishTime": "22:00",
  "holidayMode": "SOFT",
  "holidayRegion": "MO",
  "weatherProvince": "MACAU",
  "idleThresholdSeconds": 90
}
```

`weatherProvince` 使用省级代码，例如 `BEIJING`、`GUANGDONG`、`MACAU`；`idleThresholdSeconds` 范围 20–600；`expectedFinishTime` 格式 `HH:mm`。

## 节假日

### `GET /api/holidays?year=2026`

```json
{
  "year": 2026,
  "region": "MO",
  "available": true,
  "holidays": [
    { "date": "2026-12-25", "name": "圣诞节", "kind": "PUBLIC_HOLIDAY", "region": "MO" },
    { "date": "2026-10-19", "name": "重阳节补假", "kind": "WORKDAY", "region": "MO" }
  ]
}
```

- 地区来自当前 profile；查询参数 `year` 默认当前年；
- 引擎不可用时返回 `available=false` 和空数组，不影响日程 API。

## 活跃状态与提醒

### `POST /api/presence/heartbeat`

```json
{
  "sessionId": "tab-4b2a...",
  "active": true,
  "visible": true
}
```

响应：

```json
{
  "active": true,
  "serverTime": "2026-11-05T10:20:01",
  "reminders": [
    {
      "id": "5:DDL:DDL:2026-11-05T21:30:SOFT",
      "eventId": 5,
      "kind": "DDL",
      "strength": "SOFT",
      "title": "提交需求分析报告",
      "message": "到达了你设定的截止时间。",
      "triggerAt": "2026-11-05T21:30:00",
      "eventType": "NORMAL",
      "startAt": "2026-11-05T18:00:00",
      "endAt": "2026-11-05T19:00:00",
      "dueAt": "2026-11-05T21:30:00"
    }
  ],
  "suppressedStrong": 0
}
```

- `active` 是所有标签页的聚合状态；
- 服务端会记录投递强度，重复心跳不会重复返回同一条提醒；
- 见 `docs/ARCHITECTURE.md` 的状态机。

## 系统

### `GET /api/system/status`

```json
{
  "api": "ok",
  "engineAvailable": true,
  "engineMessage": null,
  "serverTime": "2026-11-05T10:20:00",
  "calendarYear": 2026
}
```

### `GET /actuator/health`

Spring Boot Actuator 健康检查，返回 `{"status":"UP"}`。

## 错误

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `VALIDATION_FAILED` | Bean Validation，如标题为空 |
| 400 | `BAD_REQUEST` | 业务校验，如结束时间早于开始时间 |
| 400 | `INVALID_JSON` | 请求体不可解析 |
| 404 | `NOT_FOUND` | 事件不存在 |
| 409 | `CONFLICT` | 乐观锁冲突 |
| 500 | `INTERNAL_ERROR` | 未预期异常 |

```json
{
  "code": "BAD_REQUEST",
  "message": "结束时间必须晚于开始时间",
  "fields": {},
  "timestamp": "2026-11-05T10:20:00"
}
```


## 天气

### `GET /api/weather?from=2026-11-06&to=2026-11-20&province=BEIJING`

查询从今天起最多 15 天的省级预报；`from` / `to` 为可选 ISO 日期，默认今天到 +6 天；`province` 为可选省级代码，默认 `MACAU`，支持 34 个省级行政区。Java 缓存 30 分钟，Python 适配 Open-Meteo。

```json
{
  "available": true,
  "city": "北京",
  "latitude": 39.9042,
  "longitude": 116.4074,
  "timezone": "Asia/Shanghai",
  "days": [
    {
      "date": "2026-11-06",
      "code": 51,
      "condition": "小毛毛雨",
      "tempMax": 28.8,
      "tempMin": 23.5,
      "precipitationProbability": 73.0,
      "windSpeedMax": 18.9,
      "rainy": true,
      "snowy": false,
      "stormy": false
    }
  ],
  "message": null,
  "fetchedAt": "2026-11-06T02:44:44"
}
```

外部服务失败时返回 `available=false` 和 `message`，HTTP 仍为 200。

## 一句话解析

### `POST /api/nlp/parse`

```json
{ "text": "后天晚上8点在图书馆复习2小时" }
```

响应（字段与事件表单对齐）：

```json
{
  "title": "复习",
  "startAt": "2026-11-08T20:00:00",
  "endAt": "2026-11-08T22:00:00",
  "type": "NORMAL",
  "priority": "MEDIUM",
  "location": "图书馆",
  "notes": "后天晚上8点在图书馆复习2小时",
  "confidence": 0.98,
  "matches": ["后天", "晚上8点", "2小时", "在图书馆"]
}
```

只返回草稿，不写入数据库；确认后由前端调用事件创建接口。

## 拖拽改期

### `PATCH /api/events/{id}/move`

```json
{ "startAt": "2026-11-06T05:00:00", "endAt": "2026-11-06T06:00:00" }
```

返回与创建/更新相同的 `{ event, analysis }`，因此仍会走冲突检测和用户确认流程。
