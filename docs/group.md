# NapCat 接口：群管理

> 2026-10-29 由 napcat-api-source.md（源码全量背书版）按功能组重构而来，接口详情无人工推测。
> 本文件自足：含通用调用约定与响应信封。检索全表见 INDEX.md；考古全量见 napcat-api-source.md。

## 0. 通用调用约定

### 0.1 调用方式

```
POST http://127.0.0.1:3000/<action_name>
Content-Type: application/json
Authorization: Bearer <token>     # napcat 配置了 token 时必带（也可 ?access_token= 挂query）
```

- body 为 JSON 对象，参数名蛇形命名（`group_id`、`user_id`、`message_id`）
- `user_id`/`group_id` 数字字符串皆可（官方 schema 多为 `Union[Number, String]`）
- 文件类参数统一支持三种引用：`file:///abs/path`、`http(s)://...`、`base64://...`（有的字段直接写本地绝对路径）

### 0.2 响应信封（所有接口统一）

```json
{
  "status": "ok",          // ok | async | failed
  "retcode": 0,            // 见下表
  "data": {},              // 业务数据，失败时通常为 null
  "wording": "",           // 失败原因人类可读描述（重试自纠错靠它）
  "echo": "req-1"          // 请求时的 echo 原样返回（WS 用，HTTP 可不带）
}
```

| retcode | 含义 |
|---|---|
| 0 | 成功 |
| 1 | 已提交异步处理（status=async） |
| 100 | 参数缺失/无效（wording 会提示缺什么） |
| 102 | 获取数据分片中（缓存拉取，重试即可） |
| 103 | action 不支持（版本不匹配常见） |
| 201 | 无权限/状态异常 |

### 0.3 agent 自纠错技巧

- 对参数拿不准的接口，先发 `{}` 请求：返回 retcode=100，`wording` 通常会指出必需参数名
- 错误时原样把 `wording`/`data` 带回给模型即可自纠

## 2. agent 调用守则

1. 先 `get_version_info` 确认版本；接口名对不上时以实测为准
2. 参数不确定先发 `{}`，按 retcode=100 的 `wording` 提示补参
3. 群/用户 ID 大部分接口数字字符串皆可；`message_id` 沿用事件上报/查询返回的值
4. 高危接口（`delete_friend`、`set_group_leave`、`set_group_kick*`、`delete_qzone_msg`、`send_packet`）调用前必须经用户确认
5. 发消息失败常见原因：消息段 JSON 格式错（§1）、频率限制、没带 token（retcode=201）

## 本组接口一览（46 个）

| 接口 | 功能 |
|---|---|
| delete_essence_msg | 删精华消息 |
| get_ai_characters | AI语音角色列表 |
| get_ai_record | 取AI语音 |
| get_essence_msg_list | 精华消息列表 |
| get_group_at_all_remain | 剩余@全员次数 |
| get_group_detail_info | 群详细信息 |
| get_group_honor_info | 群荣誉信息 |
| get_group_ignore_add_request | 忽略加群请求 |
| get_group_ignored_notifies | 已忽略通知 |
| get_group_info | 群信息 |
| get_group_info_ex | 群信息（扩展） |
| get_group_list | 群列表 |
| get_group_member_info | 群员信息 |
| get_group_member_list | 群员列表 |
| get_group_shut_list | 禁言列表 |
| get_group_signed_list | 打卡列表 |
| get_group_system_msg | 入群系统通知 |
| send_group_ai_record | 发群AI语音 |
| send_group_sign | 群打卡（发送） |
| set_essence_msg | 设精华消息 |
| set_group_add_option | 加群方式设置 |
| set_group_add_request | 加群审批 |
| set_group_admin | 设/撤管理员 |
| set_group_ban | 单人禁言 |
| set_group_card | 改群名片 |
| set_group_kick | 踢人 |
| set_group_kick_members | 批量踢人 |
| set_group_leave | 退群 |
| set_group_member_invite_policy | 邀入群策略 |
| set_group_name | 改群名 |
| set_group_new_member_history_visibility | 新人可见历史设置 |
| set_group_portrait | 改群头像 |
| set_group_remark | 改群备注 |
| set_group_robot_add_option | 群机器人设置 |
| set_group_search | 群搜索设置 |
| set_group_sign | 群打卡（设置） |
| set_group_special_title | 设专属头衔 |
| set_group_todo | 群待办 |
| set_group_whole_ban | 全员禁言 |
| _del_group_notice |  |
| _get_group_notice |  |
| _send_group_notice |  |
| cancel_group_album_media_like |  |
| cancel_group_todo |  |
| complete_group_todo |  |
| set_group_member_permissions |  |

## 接口详情

### delete_essence_msg
**移出精华消息** — 将一条消息从群精华消息列表中移出
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Optional(Type.Union([Type.Number(), Type.String()], { description: '消息ID' })),
  msg_seq: Type.Optional(Type.String({ description: '消息序号' })),
  msg_random: Type.Optional(Type.String({ description: '消息随机数' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 123456
}
```

源文件: `group/DelEssenceMsg.ts`

---

### get_ai_characters
**获取AI角色列表** — 获取群聊中的AI角色列表
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  chat_type: Type.Union([Type.Number(), Type.String()], { default: 1, description: '聊天类型' }),
})
```

**返回 schema**:
```ts
Type.Array(
  Type.Object({
    type: Type.String({ description: '角色类型' }),
    characters: Type.Array(
      Type.Object({
        character_id: Type.String({ description: '角色ID' }),
        character_name: Type.String({ description: '角色名称' }),
        preview_url: Type.String({ description: '预览URL' }),
      }),
      { description: '角色列表' }
    ),
  }),
  { description: 'AI角色列表' }
)
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

**响应示例**:
```json
[
 {
  "type": "string",
  "characters": [
   {
    "character_id": "id",
    "character_name": "name",
    "preview_url": "url"
   }
  ]
 }
]
```

源文件: `extends/GetAiCharacters.ts`

---

### get_ai_record
**获取 AI 语音** — 通过 AI 语音引擎获取指定文本的语音 URL
标签: AI扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  character: Type.String({ description: '角色ID' }),
  group_id: Type.String({ description: '群号' }),
  text: Type.String({ description: '语音文本内容' }),
})
```

**返回 schema**:
```ts
Type.String({ description: '语音URL' })
```

**请求示例**:
```json
{
 "character": "ai_char_1",
 "group_id": "123456",
 "text": "你好"
}
```

**响应示例**:
```json
"http://example.com/ai_voice.silk"
```

源文件: `group/GetAiRecord.ts`

---

### get_essence_msg_list
**获取群精华消息** — 获取指定群聊中的精华消息列表
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Array(Type.Object({
  msg_seq: Type.Number({ description: '消息序号' }),
  msg_random: Type.Number({ description: '消息随机数' }),
  sender_id: Type.Number({ description: '发送者QQ' }),
  sender_nick: Type.String({ description: '发送者昵称' }),
  operator_id: Type.Number({ description: '操作者QQ' }),
  operator_nick: Type.String({ description: '操作者昵称' }),
  message_id: Type.Number({ description: '消息ID' }),
  operator_time: Type.Number({ description: '操作时间' }),
  content: Type.Array(Type.Any(), { description: '消息内容' }),
}), { description: '精华消息列表' })
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

**响应示例**:
```json
[
 {
  "message_id": 123456,
  "sender_id": 123456,
  "sender_nick": "昵称",
  "operator_id": 123456,
  "operator_nick": "昵称",
  "operator_time": 1710000000,
  "content": "精华内容"
 }
]
```

源文件: `group/GetGroupEssence.ts`

---

### get_group_at_all_remain
**获取群艾特全体剩余次数** — 获取指定群聊中艾特全体成员的剩余次数
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Object({
  can_at_all: Type.Boolean({ description: '是否可以艾特全体' }),
  remain_at_all_count_for_group: Type.Number({ description: '群艾特全体剩余次数' }),
  remain_at_all_count_for_uin: Type.Number({ description: '个人艾特全体剩余次数' }),
}, { description: '群艾特全体剩余次数' })
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

**响应示例**:
```json
{
 "can_at_all": true,
 "remain_at_all_count_for_group": 10,
 "remain_at_all_count_for_self": 10
}
```

源文件: `go-cqhttp/GetGroupAtAllRemain.ts`

---

### get_group_detail_info
**获取群详细信息** — 获取群聊的详细信息，包括成员数、最大成员数等
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Object({
  group_id: Type.Number({ description: '群号' }),
  group_name: Type.String({ description: '群名称' }),
  member_count: Type.Number({ description: '成员数量' }),
  max_member_count: Type.Number({ description: '最大成员数量' }),
  group_all_shut: Type.Number({ description: '全员禁言状态' }),
  group_remark: Type.String({ description: '群备注' }),
}, { description: '群详细信息' })
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

**响应示例**:
```json
{
 "group_id": 123456,
 "group_name": "测试群",
 "member_count": 100,
 "max_member_count": 500
}
```

源文件: `group/GetGroupDetailInfo.ts`

---

### get_group_honor_info
**获取群荣誉信息** — 获取指定群聊的荣誉信息，如龙王等
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  type: Type.Optional(Type.Enum(WebHonorType, { description: '荣誉类型' })),
})
```

**返回 schema**:
```ts
Type.Object({
  group_id: Type.Number({ description: '群号' }),
  current_talkative: Type.Record(Type.String(), Type.Unknown(), { description: '当前龙王' }),
  talkative_list: Type.Array(Type.Unknown(), { description: '龙王列表' }),
  performer_list: Type.Array(Type.Unknown(), { description: '群聊之火列表' }),
  legend_list: Type.Array(Type.Unknown(), { description: '群聊炽热列表' }),
  emotion_list: Type.Array(Type.Unknown(), { description: '快乐源泉列表' }),
  strong_newbie_list: Type.Array(Type.Unknown(), { description: '冒尖小春笋列表' }),
}, { description: '群荣誉信息' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "type": "all"
}
```

**响应示例**:
```json
{
 "group_id": 123456,
 "current_talkative": {},
 "talkative_list": []
}
```

源文件: `go-cqhttp/GetGroupHonorInfo.ts`

---

### get_group_ignore_add_request
**获取群被忽略的加群请求**
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Array(
  Type.Object({
    request_id: Type.Number({ description: '请求ID' }),
    invitor_uin: Type.Number({ description: '邀请者QQ' }),
    invitor_nick: Type.Optional(Type.String({ description: '邀请者昵称' })),
    group_id: Type.Number({ description: '群号' }),
    message: Type.Optional(Type.String({ description: '验证信息' })),
    group_name: Type.Optional(Type.String({ description: '群名称' })),
    checked: Type.Boolean({ description: '是否已处理' }),
    actor: Type.Number({ description: '处理者QQ' }),
    requester_nick: Type.Optional(Type.String({ description: '请求者昵称' })),
  }),
  { description: '群通知列表' }
)
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
[
 {
  "request_id": 12345,
  "invitor_uin": 123456789,
  "invitor_nick": "邀请者",
  "group_id": 123456789,
  "message": "加群请求",
  "group_name": "群名称",
  "checked": false,
  "actor": 0,
  "requester_nick": "请求者"
 }
]
```

源文件: `extends/GetGroupAddRequest.ts`

---

### get_group_ignored_notifies
**获取群忽略通知** — 获取被忽略的入群申请和邀请通知
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({}, { description: '群忽略通知负载' })
```

**返回 schema**:
```ts
Type.Object({
  invited_requests: Type.Array(Type.Any(), { description: '邀请请求列表' }),
  InvitedRequest: Type.Array(Type.Any(), { description: '邀请请求列表' }),
  join_requests: Type.Array(Type.Any(), { description: '加入请求列表' }),
}, { description: '群忽略通知结果' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
{
 "invited_requests": [],
 "InvitedRequest": [],
 "join_requests": []
}
```

源文件: `group/GetGroupIgnoredNotifies.ts`

---

### get_group_info
**获取群信息** — 获取群聊的基本信息
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
OB11GroupSchema
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

**响应示例**:
```json
{
 "group_id": 123456,
 "group_name": "测试群",
 "member_count": 100,
 "max_member_count": 500
}
```

源文件: `group/GetGroupInfo.ts`

---

### get_group_info_ex
**获取群详细信息 (扩展)**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '群扩展信息' })
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

**响应示例**:
```json
{}
```

源文件: `extends/GetGroupInfoEx.ts`

---

### get_group_list
**获取群列表** — 获取当前帐号的群聊列表
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  no_cache: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否不使用缓存' })),
})
```

**返回 schema**:
```ts
Type.Array(OB11GroupSchema, { description: '群列表' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
[
 {
  "group_id": 123456,
  "group_name": "测试群",
  "member_count": 100,
  "max_member_count": 500
 }
]
```

源文件: `group/GetGroupList.ts`

---

### get_group_member_info
**获取群成员信息** — 获取群聊中指定成员的信息
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  user_id: Type.String({ description: 'QQ号' }),
  no_cache: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否不使用缓存' })),
})
```

**返回 schema**:
```ts
OB11GroupMemberSchema
```

**请求示例**:
```json
{
 "group_id": "123456",
 "user_id": "123456789"
}
```

**响应示例**:
```json
{
 "group_id": 123456,
 "user_id": 123456789,
 "nickname": "昵称",
 "card": "名片",
 "role": "member"
}
```

源文件: `group/GetGroupMemberInfo.ts`

---

### get_group_member_list
**获取群成员列表** — 获取群聊中的所有成员列表
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  no_cache: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否不使用缓存' })),
})
```

**返回 schema**:
```ts
Type.Array(Type.Any(), { description: '群成员列表' })
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

**响应示例**:
```json
[
 {
  "group_id": 123456,
  "user_id": 123456789,
  "nickname": "昵称",
  "card": "名片",
  "role": "member"
 }
]
```

源文件: `group/GetGroupMemberList.ts`

---

### get_group_shut_list
**获取群禁言列表**
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Array(Type.Any(), { description: '禁言成员列表' })
```

**请求示例**:
```json
{
 "group_id": "123456789"
}
```

**响应示例**:
```json
[
 {
  "user_id": 123456789,
  "nickname": "禁言用户",
  "shut_up_time": 1734567890
 }
]
```

源文件: `group/GetGroupShutList.ts`

---

### get_group_signed_list
**获取群组今日打卡列表**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.Union([Type.String(), Type.Number()], { description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Array(
  Type.Object({
    user_id: Type.Number({ description: '打卡者QQ' }),
    nick: Type.String({ description: '打卡者昵称' }),
    time: Type.Number({ description: '打卡时间' }),
    rank: Type.Number({ description: '打卡排名' }),
  }),
  { description: '群组今日打卡列表' }
)
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

**响应示例**:
```json
{}
```

源文件: `extends/GetGroupSignedList.ts`

---

### get_group_system_msg
**获取群系统消息** — 获取群系统消息
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({
  count: Type.Union([Type.Number(), Type.String()], { default: 50, description: '获取的消息数量' }),
})
```

**返回 schema**:
```ts
Type.Object({
  invited_requests: Type.Array(OB11NotifySchema, { description: '进群邀请列表' }),
  InvitedRequest: Type.Array(OB11NotifySchema, { description: '进群邀请列表 (兼容)' }),
  join_requests: Type.Array(OB11NotifySchema, { description: '进群申请列表' }),
})
```

**请求示例**:
```json
{
 "count": 50
}
```

**响应示例**:
```json
{
 "invited_requests": [],
 "InvitedRequest": [],
 "join_requests": []
}
```

源文件: `system/GetSystemMsg.ts`

---

### send_group_ai_record
**发送群 AI 语音** — 发送 AI 生成的语音到指定群聊
标签: AI扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  character: Type.String({ description: '角色ID' }),
  group_id: Type.String({ description: '群号' }),
  text: Type.String({ description: '语音文本内容' }),
})
```

**返回 schema**:
```ts
Type.Object({
  message_id: Type.Number({ description: '消息ID' }),
}, { description: '发送结果' })
```

**请求示例**:
```json
{
 "character": "ai_char_1",
 "group_id": "123456",
 "text": "你好"
}
```

**响应示例**:
```json
{}
```

源文件: `group/SendGroupAiRecord.ts`

---

### send_group_sign
**群打卡**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Void({ description: '打卡结果' })
```

**请求示例**:
```json
{
 "group_id": "123456789"
}
```

源文件: `extends/SetGroupSign.ts`

---

### set_essence_msg
**设置精华消息** — 将一条消息设置为群精华消息
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Union([Type.Number(), Type.String()], { description: '消息ID' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 123456
}
```

源文件: `group/SetEssenceMsg.ts`

---

### set_group_add_option
**设置群加群选项**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  add_type: Type.Number({ description: '加群方式' }),
  group_question: Type.Optional(Type.String({ description: '加群问题' })),
  group_answer: Type.Optional(Type.String({ description: '加群答案' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '返回结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "add_type": 1
}
```

源文件: `extends/SetGroupAddOption.ts`

---

### set_group_add_request
**处理加群请求** — 同意或拒绝加群请求或邀请
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  flag: Type.String({ description: '请求flag' }),
  approve: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否同意' })),
  reason: Type.Optional(Type.Union([Type.String({ default: ' ' }), Type.Null()], { description: '拒绝理由' })),
  count: Type.Optional(Type.Number({ default: 100, description: '搜索通知数量' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "flag": "flag_123",
 "sub_type": "add",
 "approve": true
}
```

源文件: `group/SetGroupAddRequest.ts`

---

### set_group_admin
**设置群管理员** — 设置或取消群聊中的管理员
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  user_id: Type.String({ description: '用户QQ' }),
  enable: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否设置为管理员' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "user_id": "123456789",
 "enable": true
}
```

源文件: `group/SetGroupAdmin.ts`

---

### set_group_ban
**群组禁言** — 禁言群聊中的指定成员
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  user_id: Type.String({ description: '用户QQ' }),
  duration: Type.Union([Type.Number(), Type.String()], { default: 0, description: '禁言时长(秒)' }),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "user_id": "123456789",
 "duration": 1800
}
```

源文件: `group/SetGroupBan.ts`

---

### set_group_card
**设置群名片** — 设置群聊中指定成员的群名片
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  user_id: Type.String({ description: '用户QQ' }),
  card: Type.Optional(Type.String({ description: '群名片' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "user_id": "123456789",
 "card": "新名片"
}
```

源文件: `group/SetGroupCard.ts`

---

### set_group_kick
**群组踢人** — 将指定成员踢出群聊
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  user_id: Type.String({ description: '用户QQ' }),
  reject_add_request: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否拒绝加群请求' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "user_id": "123456789",
 "reject_add_request": false
}
```

源文件: `group/SetGroupKick.ts`

---

### set_group_kick_members
**批量踢出群成员** — 从指定群聊中批量踢出多个成员
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  user_id: Type.Array(Type.String(), { description: 'QQ号列表' }),
  reject_add_request: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否拒绝加群请求' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '返回结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "user_id": [
  "123456789"
 ],
 "reject_add_request": false
}
```

源文件: `extends/SetGroupKickMembers.ts`

---

### set_group_leave
**退出群组** — 退出或解散指定群聊
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  is_dismiss: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否解散' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "is_dismiss": false
}
```

源文件: `group/SetGroupLeave.ts`

---

### set_group_member_invite_policy
**设置群成员邀请策略** — 设置是否允许群成员邀请好友进群，以及邀请是否需要管理员审核
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  policy: MemberInvitePolicySchema,
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "policy": "require_approval"
}
```

源文件: `group/SetGroupMemberInvitePolicy.ts`

---

### set_group_name
**设置群名称** — 修改指定群聊的名称
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  group_name: Type.String({ description: '群名称' }),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "group_name": "新群名"
}
```

源文件: `group/SetGroupName.ts`

---

### set_group_new_member_history_visibility
**设置新成员历史消息可见性** — 设置新入群成员默认是否可以查看最近聊天记录
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  visible: Type.Boolean({ description: '新成员默认可见最近聊天记录' }),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "visible": true
}
```

源文件: `group/SetGroupNewMemberHistoryVisibility.ts`

---

### set_group_portrait
**设置群头像** — 修改指定群聊的头像
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  file: Type.String({ description: '头像文件路径或 URL' }),
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Object({
  result: Type.Number(),
  errMsg: Type.String(),
}, { description: '设置结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "file": "base64://..."
}
```

**响应示例**:
```json
{
 "result": 0,
 "errMsg": ""
}
```

源文件: `go-cqhttp/SetGroupPortrait.ts`

---

### set_group_remark
**设置群备注** — 设置群备注
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  remark: Type.String({ description: '备注' }),
})
```

**返回 schema**:
```ts
Type.Null({ description: '返回结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "remark": "测试群备注"
}
```

源文件: `extends/SetGroupRemark.ts`

---

### set_group_robot_add_option
**设置群机器人加群选项**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  robot_member_switch: Type.Optional(Type.Number({ description: '机器人成员开关' })),
  robot_member_examine: Type.Optional(Type.Number({ description: '机器人成员审核' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '返回结果' })
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

源文件: `extends/SetGroupRobotAddOption.ts`

---

### set_group_search
**设置群搜索选项**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  no_code_finger_open: Type.Optional(Type.Number({ description: '未知' })),
  no_finger_open: Type.Optional(Type.Number({ description: '未知' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '返回结果' })
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

源文件: `extends/SetGroupSearch.ts`

---

### set_group_sign
**群打卡**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Void({ description: '打卡结果' })
```

**请求示例**:
```json
{
 "group_id": "123456789"
}
```

源文件: `extends/SetGroupSign.ts`

---

### set_group_special_title
**设置专属头衔** — 设置群聊中指定成员的专属头衔
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  user_id: Type.String({ description: 'QQ号' }),
  special_title: Type.String({ default: '', description: '专属头衔' }),
})
```

**返回 schema**:
```ts
Type.Void({ description: '设置结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "user_id": "123456789",
 "special_title": "头衔"
}
```

源文件: `extends/SetSpecialTitle.ts`

---

### set_group_todo
**设置群待办** — 将指定消息设置为群待办

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.Union([Type.String(), Type.Number()], { description: '群号' }),
  message_id: Type.Optional(Type.String({ description: '消息ID' })),
  message_seq: Type.Optional(Type.String({ description: '消息Seq (可选)' })),
})
```

**请求示例**:
```json
{
 "group_id": "123456",
 "message_id": "123456789"
}
```

**响应示例**:
```json
{}
```

源文件: `packet/SetGroupTodo.ts`

---

### set_group_whole_ban
**全员禁言** — 开启或关闭指定群聊的全员禁言
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  enable: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否开启全员禁言' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "enable": true
}
```

源文件: `group/SetGroupWholeBan.ts`

---

### _del_group_notice
**删除群公告** — 删除群聊中的公告
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  notice_id: Type.String({ description: '公告ID' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "notice_id": "notice_123"
}
```

源文件: `group/DelGroupNotice.ts`

---

### _get_group_notice
**获取群公告** — 获取指定群聊中的公告列表
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
})
```

**返回 schema**:
```ts
Type.Array(Type.Object({
  sender_id: Type.Number({ description: '发送者QQ' }),
  publish_time: Type.Number({ description: '发布时间' }),
  notice_id: Type.String({ description: '公告ID' }),
  message: Type.Object({
    text: Type.String({ description: '文本内容' }),
    image: Type.Array(Type.Any(), { description: '图片列表' }),
    images: Type.Array(Type.Any(), { description: '图片列表' }),
  }, { description: '公告内容' }),
  settings: Type.Optional(Type.Any({ description: '设置项' })),
  read_num: Type.Optional(Type.Number({ description: '阅读数' })),
  send_to_new_member: Type.Optional(Type.Boolean({ description: '是否为「发给新成员」公告' })),
  pinned: Type.Optional(Type.Boolean({ description: '是否置顶（仅「发给新成员」公告可读到）' })),
}), { description: '群公告列表' })
```

**请求示例**:
```json
{
 "group_id": "123456"
}
```

**响应示例**:
```json
[
 {
  "notice_id": "notice_123",
  "sender_id": 123456,
  "publish_time": 1710000000,
  "message": {
   "text": "公告内容",
   "image": []
  }
 }
]
```

源文件: `group/GetGroupNotice.ts`

---

### _send_group_notice
**发送群公告** — 在指定群聊中发布新的公告
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  content: Type.String({ description: '公告内容' }),
  image: Type.Optional(Type.String({ description: '公告图片路径或 URL' })),
  pinned: Type.Union([Type.Number(), Type.String()], { default: 0, description: '是否置顶 (0/1)' }),
  type: Type.Union([Type.Number(), Type.String()], { default: 1, description: '类型 (默认为 1)' }),
  confirm_required: Type.Union([Type.Number(), Type.String()], { default: 1, description: '是否需要确认 (0/1)' }),
  is_show_edit_card: Type.Union([Type.Number(), Type.String()], { default: 0, description: '是否显示修改群名片引导 (0/1)' }),
  tip_window_type: Type.Union([Type.Number(), Type.String()], { default: 0, description: '弹窗类型 (默认为 0)' }),
})
```

**返回 schema**:
```ts
Type.Null()
```

**请求示例**:
```json
{
 "group_id": "123456",
 "content": "公告内容",
 "image": "base64://..."
}
```

**响应示例**:
```json
{}
```

源文件: `go-cqhttp/SendGroupNotice.ts`

---

### cancel_group_album_media_like
**点赞群相册媒体**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  album_id: Type.String({ description: '相册ID' }),
  batch_id: Type.String({ description: 'batch_id' }),
  lloc: Type.Optional(Type.String({ description: 'lloc，若对整个上传操作则不填' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "album_id": "album_id_123",
 "batch_id": "112233",
 "lloc": "aabbcc12213123"
}
```

**响应示例**:
```json
{
 "result": {}
}
```

源文件: `extends/SetGroupAlbumMediaLike.ts`

---

### cancel_group_todo
**取消群待办** — 将指定消息对应的群待办取消

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.Union([Type.String(), Type.Number()], { description: '群号' }),
  message_id: Type.Optional(Type.String({ description: '消息ID' })),
  message_seq: Type.Optional(Type.String({ description: '消息Seq (可选)' })),
})
```

**请求示例**:
```json
{
 "group_id": "123456",
 "message_id": "123456789"
}
```

**响应示例**:
```json
{}
```

源文件: `packet/CancelGroupTodo.ts`

---

### complete_group_todo
**完成群待办** — 将指定消息对应的群待办标记为已完成

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.Union([Type.String(), Type.Number()], { description: '群号' }),
  message_id: Type.Optional(Type.String({ description: '消息ID' })),
  message_seq: Type.Optional(Type.String({ description: '消息Seq (可选)' })),
})
```

**请求示例**:
```json
{
 "group_id": "123456",
 "message_id": "123456789"
}
```

**响应示例**:
```json
{}
```

源文件: `packet/CompleteGroupTodo.ts`

---

### set_group_member_permissions
**设置群成员功能权限** — 设置群成员上传相册、发起临时会话和发起新群聊的权限；未传入的项目保持不变
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  allow_member_upload_album: Type.Optional(Type.Boolean({ description: '允许成员上传群相册' })),
  allow_member_temporary_session: Type.Optional(Type.Boolean({ description: '允许成员发起临时会话' })),
  allow_member_create_group: Type.Optional(Type.Boolean({ description: '允许成员发起新的群聊' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "allow_member_upload_album": true,
 "allow_member_temporary_session": true,
 "allow_member_create_group": true
}
```

源文件: `group/SetGroupMemberPermissions.ts`

---

> 本文件未涵盖的接口/规则以 napcat-api-source.md（全量）与 INDEX.md（检索表）为准，勿凭猜测构造参数。
