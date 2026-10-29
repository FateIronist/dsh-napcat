# NapCat 接口：账号·登录·系统

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

## 本组接口一览（23 个）

| 接口 | 功能 |
|---|---|
| get_clientkey | 取ClientKey |
| get_cookies | 取Cookies |
| get_credentials | 取网页凭据 |
| get_csrf_token | 取CSRF Token |
| get_login_info | 登录号信息 |
| get_status | 运行状态 |
| get_version_info | NapCat 版本信息 |
| set_diy_online_status | 设自定义在线状态 |
| set_input_status | 好友输入状态 |
| set_online_status | 设在线状态 |
| set_qq_avatar | 改头像 |
| set_qq_profile | 改资料 |
| set_restart | 重启NapCat |
| set_self_longnick | 改签名 |
| 0.1 调用方式 |  |
| 0.2 响应信封（所有接口统一） |  |
| 0.3 agent 自纠错技巧 |  |
| _get_model_show |  |
| _set_model_show |  |
| bot_exit |  |
| can_send_record |  |
| clean_cache |  |
| nc_get_user_status |  |

## 接口详情

### get_clientkey
**获取ClientKey** — 获取当前登录帐号的ClientKey
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Object({
  clientkey: Type.Optional(Type.String({ description: '客户端Key' })),
}, { description: '获取ClientKey结果' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
{
 "clientkey": "abcdef123456"
}
```

源文件: `extends/GetClientkey.ts`

---

### get_cookies
**获取 Cookies** — 获取指定域名的 Cookies
标签: 用户接口

**payload schema**（源码原文）:
```ts
Type.Object({
  domain: Type.String({ description: '需要获取 cookies 的域名' }),
})
```

**返回 schema**:
```ts
Type.Object({
  cookies: Type.String({ description: 'Cookies' }),
  bkn: Type.String({ description: 'CSRF Token' }),
})
```

**请求示例**:
```json
{
 "domain": "qun.qq.com"
}
```

**响应示例**:
```json
{
 "cookies": "uin=o123456789; skey=@abc12345;",
 "bkn": "123456789"
}
```

源文件: `user/GetCookies.ts`

---

### get_credentials
**获取登录凭证** — 获取登录凭证
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({
  domain: Type.String({ description: '需要获取 cookies 的域名' }),
})
```

**返回 schema**:
```ts
Type.Object({
  cookies: Type.String({ description: 'Cookies' }),
  token: Type.Number({ description: 'CSRF Token' }),
})
```

**请求示例**:
```json
{
 "domain": "qun.qq.com"
}
```

**响应示例**:
```json
{
 "cookies": "uin=o123456789; skey=@abc12345;",
 "token": 123456789
}
```

源文件: `system/GetCredentials.ts`

---

### get_csrf_token
**获取 CSRF Token** — 获取 CSRF Token
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Object({
  token: Type.Number({ description: 'CSRF Token' }),
})
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
{
 "token": 123456789
}
```

源文件: `system/GetCSRF.ts`

---

### get_login_info
**获取登录号信息** — 获取当前登录帐号的信息
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Object({
  birthday_year: Type.Optional(Type.Number({ description: '出生年份' })),
  birthday_month: Type.Optional(Type.Number({ description: '出生月份' })),
  birthday_day: Type.Optional(Type.Number({ description: '出生日期' })),
  phone_num: Type.Optional(Type.String({ description: '手机号' })),
  email: Type.Optional(Type.String({ description: '邮箱' })),
  category_id: Type.Optional(Type.Number({ description: '分组ID' })),
  user_id: Type.Number({ description: 'QQ号' }),
  nickname: Type.String({ description: '昵称' }),
  remark: Type.Optional(Type.String({ description: '备注' })),
  sex: Type.Optional(Type.String({ description: '性别' })),
  level: Type.Optional(Type.Number({ description: '等级' })),
  age: Type.Optional(Type.Number({ description: '年龄' })),
  qid: Type.Optional(Type.String({ description: 'QID' })),
  login_days: Type.Optional(Type.Number({ description: '登录天数' })),
  categoryName: Type.Optional(Type.String({ description: '分组名称' })),
  categoryId: Type.Optional(Type.Number({ description: '分组ID' })),
}, { $id: 'OB11User', description: 'OneBot 11 用户信息' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
{
 "user_id": 123456789,
 "nickname": "机器人"
}
```

源文件: `system/GetLoginInfo.ts`

---

### get_status
**获取运行状态** — 获取运行状态
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Object({
  online: Type.Boolean({ description: '是否在线' }),
  good: Type.Boolean({ description: '状态是否良好' }),
  stat: Type.Unknown({ description: '统计信息' }),
})
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
{
 "online": true,
 "good": true,
 "stat": {}
}
```

源文件: `system/GetStatus.ts`

---

### get_version_info
**获取版本信息** — 获取版本信息
标签: 系统接口

无参数。

**返回 schema**:
```ts
Type.Object({
  app_name: Type.String({ description: '应用名称' }),
  protocol_version: Type.String({ description: '协议版本' }),
  app_version: Type.String({ description: '应用版本' }),
}, { description: '版本信息' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
{
 "app_name": "NapCat.Onebot",
 "protocol_version": "v11",
 "app_version": "1.0.0"
}
```

源文件: `system/GetVersionInfo.ts`

---

### set_diy_online_status
**设置自定义在线状态** — 设置自定义在线状态
标签: 用户扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  face_id: Type.Union([Type.Number(), Type.String()], { description: '图标ID' }), // 参考 face_config.json 的 QSid
  face_type: Type.Union([Type.Number(), Type.String()], { default: '1', description: '图标类型' }),
  wording: Type.String({ default: ' ', description: '状态文字内容' }),
})
```

**返回 schema**:
```ts
Type.String({ description: '错误信息（如果有）' })
```

**请求示例**:
```json
{
 "face_id": "123",
 "face_type": "1",
 "wording": "自定义状态"
}
```

**响应示例**:
```json
""
```

源文件: `extends/SetDiyOnlineStatus.ts`

---

### set_input_status
**设置输入状态**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: 'QQ号' }),
  event_type: Type.Number({ description: '事件类型' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '设置结果' })
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "event_type": 1
}
```

源文件: `extends/SetInputStatus.ts`

---

### set_online_status
**设置在线状态**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  status: Type.Union([Type.Number(), Type.String()], { description: '在线状态' }),
  ext_status: Type.Union([Type.Number(), Type.String()], { description: '扩展状态' }),
  battery_status: Type.Union([Type.Number(), Type.String()], { description: '电量状态' }),
})
```

**返回 schema**:
```ts
Type.Null({ description: '设置结果' })
```

**请求示例**:
```json
{
 "status": 11,
 "ext_status": 0,
 "battery_status": 100
}
```

源文件: `extends/SetOnlineStatus.ts`

---

### set_qq_avatar
**设置QQ头像** — 修改当前账号的QQ头像
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  file: Type.String({ description: '图片路径、URL或Base64' }),
})
```

**返回 schema**:
```ts
Type.Null({ description: '设置结果' })
```

**请求示例**:
```json
{
 "file": "base64://..."
}
```

源文件: `extends/SetQQAvatar.ts`

---

### set_qq_profile
**设置QQ资料** — 修改当前账号的昵称、个性签名等资料
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  nickname: Type.String({ description: '昵称' }),
  personal_note: Type.Optional(Type.String({ description: '个性签名' })),
  sex: Type.Optional(Type.Union([Type.Number(), Type.String()], { description: '性别 (0: 未知, 1: 男, 2: 女)' })), // 传Sex值？建议传0
})
```

**返回 schema**:
```ts
Type.Any({ description: '设置结果' })
```

**请求示例**:
```json
{
 "nickname": "新昵称",
 "personal_note": "个性签名"
}
```

**响应示例**:
```json
{}
```

源文件: `go-cqhttp/SetQQProfile.ts`

---

### set_restart
**重启服务** — 重启服务
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Null()
```

**请求示例**:
```json
{}
```

源文件: `system/SetRestart.ts`

---

### set_self_longnick
**设置个性签名** — 修改当前登录帐号的个性签名
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  longNick: Type.String({ description: '签名内容' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '设置结果' })
```

**请求示例**:
```json
{
 "longNick": "个性签名"
}
```

源文件: `extends/SetLongNick.ts`

---

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

### _get_model_show
**获取机型显示** — 获取当前账号可用的设备机型显示名称列表
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  model: Type.Optional(Type.String({ description: '模型名称' })),
})
```

**返回 schema**:
```ts
Type.Array(Type.Object({
  variants: Type.Object({
    model_show: Type.String({ description: '显示名称' }),
    need_pay: Type.Boolean({ description: '是否需要付费' }),
  }),
}), { description: '机型显示列表' })
```

**请求示例**:
```json
{
 "model": "iPhone 13"
}
```

**响应示例**:
```json
{
 "variants": []
}
```

源文件: `go-cqhttp/GoCQHTTPGetModelShow.ts`

---

### _set_model_show
**设置机型** — 设置当前账号的设备机型名称
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Null()
```

**请求示例**:
```json
{
 "model": "iPhone 13",
 "model_show": "iPhone 13"
}
```

**响应示例**:
```json
{}
```

源文件: `go-cqhttp/GoCQHTTPSetModelShow.ts`

---

### bot_exit
**退出登录**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Object({})
```

**请求示例**:
```json
{}
```

源文件: `extends/BotExit.ts`

---

### can_send_record
**是否可以发送语音** — 检查是否可以发送语音
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Object({
  yes: Type.Boolean({ description: '是否可以发送' }),
})
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
{
 "yes": true
}
```

源文件: `system/CanSendRecord.ts`

---

### clean_cache
**清理缓存** — 清理缓存
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Null()
```

**请求示例**:
```json
{}
```

源文件: `system/CleanCache.ts`

---

### nc_get_user_status
**获取用户在线状态**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: 'QQ号' }),
})
```

**返回 schema**:
```ts
Type.Object({
  status: Type.Number({ description: '在线状态' }),
  ext_status: Type.Number({ description: '扩展状态' }),
}, { description: '用户状态' })
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
 "status": 10,
 "ext_status": 0
}
```

源文件: `extends/GetUserStatus.ts`

---

> 本文件未涵盖的接口/规则以 napcat-api-source.md（全量）与 INDEX.md（检索表）为准，勿凭猜测构造参数。
