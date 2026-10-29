# NapCat 接口：好友与用户

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

## 本组接口一览（9 个）

| 接口 | 功能 |
|---|---|
| delete_friend | 删好友 |
| get_doubt_friends_add_request | 可疑加好友请求 |
| get_friend_list | 好友列表 |
| get_friends_with_category | 分组好友列表 |
| get_stranger_info | 陌生人信息 |
| get_unidirectional_friend_list | 单向好友列表 |
| set_doubt_friends_add_request | 处理可疑请求 |
| set_friend_add_request | 处理加好友请求 |
| set_friend_remark | 改好友备注 |

## 接口详情

### delete_friend
**删除好友** — 从好友列表中删除指定用户
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  friend_id: Type.Optional(Type.Union([Type.String(), Type.Number()], { description: '好友 QQ 号' })),
  user_id: Type.Optional(Type.Union([Type.String(), Type.Number()], { description: '用户 QQ 号' })),
  temp_block: Type.Optional(Type.Boolean({ description: '是否加入黑名单' })),
  temp_both_del: Type.Optional(Type.Boolean({ description: '是否双向删除' })),
})
```

**返回 schema**:
```ts
Type.Any()
```

**请求示例**:
```json
{
 "user_id": "123456789"
}
```

**响应示例**:
```json
{}
```

源文件: `go-cqhttp/GoCQHTTPDeleteFriend.ts`

---

### get_doubt_friends_add_request
**获取可疑好友申请** — 获取系统的可疑好友申请列表
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({
  count: Type.Number({ default: 50, description: '获取数量' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '可疑好友申请列表' })
```

**请求示例**:
```json
{
 "count": 10
}
```

**响应示例**:
```json
[
 {
  "user_id": 123456789,
  "nickname": "昵称",
  "age": 20,
  "sex": "male",
  "reason": "申请理由",
  "flag": "flag_123"
 }
]
```

源文件: `new/GetDoubtFriendsAddRequest.ts`

---

### get_friend_list
**获取好友列表** — 获取当前帐号的好友列表
标签: 用户接口

**payload schema**（源码原文）:
```ts
Type.Object({
  no_cache: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否不使用缓存' })),
})
```

**返回 schema**:
```ts
Type.Array(OB11UserSchema, { description: '好友列表' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
[
 {
  "user_id": 123456789,
  "nickname": "昵称",
  "remark": "备注"
 }
]
```

源文件: `user/GetFriendList.ts`

---

### get_friends_with_category
**获取带分组的好友列表**
标签: 用户扩展

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Array(
  Type.Object({
    categoryId: Type.Number({ description: '分组ID' }),
    categoryName: Type.String({ description: '分组名称' }),
    categoryMbCount: Type.Number({ description: '分组内好友数量' }),
    buddyList: Type.Array(OB11UserSchema, { description: '好友列表' }),
  }),
  { description: '带分组的好友列表' }
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
  "categoryId": 1,
  "categoryName": "我的好友",
  "categoryMbCount": 1,
  "buddyList": []
 }
]
```

源文件: `extends/GetFriendWithCategory.ts`

---

### get_stranger_info
**获取陌生人信息** — 获取指定非好友用户的信息
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '用户QQ' }),
  no_cache: Type.Union([Type.Boolean(), Type.String()], { default: false, description: '是否不使用缓存' }),
})
```

**返回 schema**:
```ts
Type.Object({
  user_id: Type.Number({ description: '用户QQ' }),
  uid: Type.String({ description: 'UID' }),
  nickname: Type.String({ description: '昵称' }),
  age: Type.Number({ description: '年龄' }),
  qid: Type.String({ description: 'QID' }),
  qqLevel: Type.Number({ description: 'QQ等级' }),
  sex: Type.String({ description: '性别' }),
  long_nick: Type.String({ description: '个性签名' }),
  reg_time: Type.Number({ description: '注册时间' }),
  is_vip: Type.Boolean({ description: '是否VIP' }),
  is_years_vip: Type.Boolean({ description: '是否年费VIP' }),
  vip_level: Type.Number({ description: 'VIP等级' }),
  remark: Type.String({ description: '备注' }),
  status: Type.Number({ description: '状态' }),
  login_days: Type.Number({ description: '登录天数' }),
}, { description: '陌生人信息' })
```

**请求示例**:
```json
{
 "user_id": "123456789"
}
```

**响应示例**:
```json
{
 "user_id": 123456789,
 "nickname": "昵称",
 "sex": "unknown"
}
```

源文件: `go-cqhttp/GetStrangerInfo.ts`

---

### get_unidirectional_friend_list
**获取单向好友列表**
标签: 用户扩展

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Array(
  Type.Object({
    uin: Type.Number({ description: 'QQ号' }),
    uid: Type.String({ description: '用户UID' }),
    nick_name: Type.String({ description: '昵称' }),
    age: Type.Number({ description: '年龄' }),
    source: Type.String({ description: '来源' }),
  }),
  { description: '单向好友列表' }
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
  "uin": 123456789,
  "uid": "u_123",
  "nick_name": "单向好友",
  "age": 20,
  "source": "来源"
 }
]
```

源文件: `extends/GetUnidirectionalFriendList.ts`

---

### set_doubt_friends_add_request
**处理可疑好友申请** — 同意或拒绝系统的可疑好友申请
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({
  flag: Type.String({ description: '请求 flag' }),
  // 注意强制String 非isNumeric 不遵守则不符合设计
  approve: Type.Boolean({ default: true, description: '是否同意 (强制为 true)' }),
  // 该字段没有语义 仅做保留 强制为True
})
```

**返回 schema**:
```ts
Type.Any()
```

**请求示例**:
```json
{
 "flag": "12345",
 "approve": true
}
```

源文件: `new/SetDoubtFriendsAddRequest.ts`

---

### set_friend_add_request
**处理加好友请求** — 同意或拒绝加好友请求
标签: 用户接口

**payload schema**（源码原文）:
```ts
Type.Object({
  flag: Type.String({ description: '加好友请求的 flag (需从上报中获取)' }),
  approve: Type.Optional(Type.Union([Type.String(), Type.Boolean()], { description: '是否同意请求' })),
  remark: Type.Optional(Type.String({ description: '添加后的好友备注' })),
})
```

**返回 schema**:
```ts
Type.Null()
```

**请求示例**:
```json
{
 "flag": "flag_12345",
 "approve": true,
 "remark": "新朋友"
}
```

**响应示例**:
```json
{}
```

源文件: `user/SetFriendAddRequest.ts`

---

### set_friend_remark
**设置好友备注** — 设置好友备注
标签: 用户接口

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '对方 QQ 号' }),
  remark: Type.String({ description: '备注内容' }),
})
```

**返回 schema**:
```ts
Type.Null()
```

**请求示例**:
```json
{
 "user_id": "123456",
 "remark": "测试备注"
}
```

源文件: `user/SetFriendRemark.ts`

---

> 本文件未涵盖的接口/规则以 napcat-api-source.md（全量）与 INDEX.md（检索表）为准，勿凭猜测构造参数。
