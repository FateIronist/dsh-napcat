# NapCat 接口：消息收发

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

## 1. 消息段格式（`message` 字段的构造规则）

`message` 接受两种形式：**纯文本字符串**（自动当 text 段）或**段数组**：

```json
[
  {"type": "text",  "data": {"text": "你好 "}},
  {"type": "at",    "data": {"qq": "123456"}},
  {"type": "image", "data": {"file": "https://example.com/a.jpg", "summary": "[图]"}}
]
```

| type | data 字段 | 说明 |
|---|---|---|
| text | `text` | 纯文本 |
| face | `id`，`text?` | QQ 表情（小黄脸） |
| image | `file`，`url?`，`summary?` | 图片；闪照走 `send_flash_msg` |
| record | `file`，`url?` | 语音 |
| video | `file`，`url?`，`thumb?` | 视频 |
| at | `qq` | @某人；`"all"`=@全体成员 |
| reply | `id` | 回复消息（`message_id`） |
| forward | `id` | 单条合并转发消息 |
| node | `id` 或 `user_id`+`nickname`+`content` | 合并转发的子节点 |
| json | `data` | JSON 卡片消息（字符串） |
| xml | `data` | XML 卡片消息（字符串） |
| music | `type`: `qq`/`163`/`dm`+`id`；或 `custom`+`url`+`audio`+`title` | 音乐分享 |
| share | `url`，`title`，`content?`，`image?` | 链接分享 |
| location | `lat`，`lon`，`title?`，`content?` | 位置 |
| contact | `type`: `qq`/`group`，`id` | 好友/群推荐卡片 |
| dice / rps / shake | 无 | 骰子/猜拳/窗口抖动 |
| markdown | `content` | NapCat 扩展 |
| keyboard | 自定义按钮结构 | NapCat 扩展 |

发送示例：

```json
// 给好友发图文
POST /send_private_msg
{"user_id": "123456789", "message": [
  {"type": "text", "data": {"text": "看这张图"}},
  {"type": "image", "data": {"file": "base64://iVBORw0..."}}
]}
```

## 2. agent 调用守则

1. 先 `get_version_info` 确认版本；接口名对不上时以实测为准
2. 参数不确定先发 `{}`，按 retcode=100 的 `wording` 提示补参
3. 群/用户 ID 大部分接口数字字符串皆可；`message_id` 沿用事件上报/查询返回的值
4. 高危接口（`delete_friend`、`set_group_leave`、`set_group_kick*`、`delete_qzone_msg`、`send_packet`）调用前必须经用户确认
5. 发消息失败常见原因：消息段 JSON 格式错（§1）、频率限制、没带 token（retcode=201）

## 本组接口一览（44 个）

| 接口 | 功能 |
|---|---|
| click_inline_keyboard_button | 点击消息内联键盘按钮 |
| delete_msg | 撤回消息 |
| forward_friend_single_msg | 好友单条转发 |
| forward_group_single_msg | 群单条转发 |
| get_emoji_likes | 消息表情回应列表 |
| get_forward_msg | 取合并转发内容 |
| get_friend_msg_history | 取好友聊天记录 |
| get_group_msg_history | 取群聊天记录 |
| get_group_share_link | 取群分享链接 |
| get_mini_app_ark | 取小程序Ark卡片 |
| get_msg | 取消息 |
| get_profile_like | 资料卡收赞查询 |
| get_recent_contact | 最近会话 |
| get_share_link | 取链接分享卡片 |
| mark_group_msg_as_read | 群消息标已读 |
| mark_msg_as_read | 标记消息已读 |
| mark_private_msg_as_read | 私聊标已读 |
| markdown | 发Markdown消息 |
| poke | 戳一戳 |
| send_ark_share | 发Ark分享卡片 |
| send_flash_msg | 发闪照 |
| send_forward_msg | 发合并转发 |
| send_group_ark_share | 发群Ark分享卡片 |
| send_group_forward_msg | 发群合并转发 |
| send_group_msg | 发群聊消息 |
| send_like | 点赞 |
| send_msg | 发消息（按类型路由） |
| send_packet | 底层协议包直发 |
| send_poke | 戳一戳 |
| send_private_forward_msg | 发私聊合并转发 |
| send_private_msg | 发私聊消息 |
| set_msg_emoji_like | 消息表情回应 |
| upload_forward_msg | 上传合并转发 |
| .handle_quick_operation |  |
| ArkShareGroup |  |
| ArkSharePeer |  |
| _mark_all_as_read |  |
| fetch_emoji_like |  |
| fetch_ptt_text |  |
| forward_qzone_public_feed |  |
| friend_poke |  |
| group_poke |  |
| set_qzone_public_comment_like |  |
| set_qzone_public_like |  |

## 接口详情

### click_inline_keyboard_button
**点击内联键盘按钮**
标签: 消息扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  bot_appid: Type.String({ description: '机器人AppID' }),
  button_id: Type.String({ default: '', description: '按钮ID' }),
  callback_data: Type.String({ default: '', description: '回调数据' }),
  msg_seq: Type.String({ default: '10086', description: '消息序列号' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '点击结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "bot_appid": "1234567890",
 "button_id": "btn_1",
 "callback_data": "",
 "msg_seq": "10086"
}
```

**响应示例**:
```json
{}
```

源文件: `extends/ClickInlineKeyboardButton.ts`

---

### delete_msg
**撤回消息** — 撤回已发送的消息
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Union([Type.Number(), Type.String()], { description: '消息ID' }),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 12345
}
```

源文件: `msg/DeleteMsg.ts`

---

### forward_friend_single_msg
**转发单条消息** — 转发单条消息
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Union([Type.Number(), Type.String()], { description: '消息ID' }),
  group_id: Type.Optional(Type.String({ description: '目标群号' })),
  user_id: Type.Optional(Type.String({ description: '目标用户QQ' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 12345,
 "group_id": "123456"
}
```

源文件: `msg/ForwardSingleMsg.ts`

---

### forward_group_single_msg
**转发单条消息** — 转发单条消息
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Union([Type.Number(), Type.String()], { description: '消息ID' }),
  group_id: Type.Optional(Type.String({ description: '目标群号' })),
  user_id: Type.Optional(Type.String({ description: '目标用户QQ' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 12345,
 "group_id": "123456"
}
```

源文件: `msg/ForwardSingleMsg.ts`

---

### get_emoji_likes
**获取消息表情点赞列表**
标签: 消息扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.Optional(Type.String({ description: '群号，短ID可不传' })),
  message_id: Type.String({ description: '消息ID，可以传递长ID或短ID' }),
  emoji_id: Type.String({ description: '表情ID' }),
  emoji_type: Type.Optional(Type.String({ description: '表情类型' })),
  count: Type.Number({ default: 0, description: '数量，0代表全部' }),
})
```

**返回 schema**:
```ts
Type.Object({
  emoji_like_list: Type.Array(
    Type.Object({
      user_id: Type.String({ description: '点击者QQ号' }),
      nick_name: Type.String({ description: '昵称?' }),
    }),
    { description: '表情回应列表' }
  ),
})
```

**请求示例**:
```json
{
 "message_id": "12345",
 "emoji_id": "123"
}
```

**响应示例**:
```json
{
 "emoji_like_list": [
  {
   "user_id": "654321",
   "nick_name": "测试用户"
  }
 ]
}
```

源文件: `extends/GetEmojiLikes.ts`

---

### get_forward_msg
**获取合并转发消息** — 获取合并转发消息的具体内容
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Optional(Type.String({ description: '消息ID' })),
  id: Type.Optional(Type.String({ description: '消息ID' })),
})
```

**返回 schema**:
```ts
Type.Object({
  messages: Type.Optional(Type.Array(Type.Unknown(), { description: '消息列表' })),
}, { description: '合并转发消息' })
```

**请求示例**:
```json
{
 "message_id": "123456"
}
```

**响应示例**:
```json
{
 "messages": []
}
```

源文件: `go-cqhttp/GetForwardMsg.ts`

---

### get_friend_msg_history
**获取好友历史消息** — 获取指定好友的历史聊天记录
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '用户QQ' }),
  message_seq: Type.Optional(Type.String({ description: '起始消息序号' })),
  count: Type.Number({ default: 20, description: '获取消息数量' }),
  reverse_order: Type.Boolean({ default: false, description: '是否反向排序' }),
  disable_get_url: Type.Boolean({ default: false, description: '是否禁用获取URL' }),
  parse_mult_msg: Type.Boolean({ default: true, description: '是否解析合并消息' }),
  quick_reply: Type.Boolean({ default: false, description: '是否快速回复' }),
  reverseOrder: Type.Boolean({ default: false, description: '是否反向排序(旧版本兼容)' }),
})
```

**返回 schema**:
```ts
Type.Object({
  messages: Type.Array(Type.Any(), { description: '消息列表' }),
}, { description: '好友历史消息' })
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "message_seq": 0,
 "count": 20
}
```

**响应示例**:
```json
{
 "messages": []
}
```

源文件: `go-cqhttp/GetFriendMsgHistory.ts`

---

### get_group_msg_history
**获取群历史消息** — 获取指定群聊的历史聊天记录
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  message_seq: Type.Optional(Type.String({ description: '起始消息序号' })),
  count: Type.Number({ default: 20, description: '获取消息数量' }),
  reverse_order: Type.Boolean({ default: false, description: '是否反向排序' }),
  disable_get_url: Type.Boolean({ default: false, description: '是否禁用获取URL' }),
  parse_mult_msg: Type.Boolean({ default: true, description: '是否解析合并消息' }),
  quick_reply: Type.Boolean({ default: false, description: '是否快速回复' }),
  reverseOrder: Type.Boolean({ default: false, description: '是否反向排序(旧版本兼容)' }),
})
```

**返回 schema**:
```ts
Type.Object({
  messages: Type.Array(Type.Any(), { description: '消息列表' }),
}, { description: '群历史消息' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "message_seq": 0,
 "count": 20
}
```

**响应示例**:
```json
{
 "messages": []
}
```

源文件: `go-cqhttp/GetGroupMsgHistory.ts`

---

### get_group_share_link
**获取群分享链接** — 通过 NTQQ 原生 getJoinGroupLink 获取群的 H5 分享/加群链接 (qm.qq.com/q/xxx 或 qun.qq.com/universal-share/share?...)
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.Union([Type.Number(), Type.String()], { description: '群号' }),
  need_short_url: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { default: true, description: '是否返回短链 (qm.qq.com/q/xxx)，false 返回完整 universal-share 链接' })),
  src_id: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 73, description: '分享来源 ID' })),
  additional_param: Type.Optional(Type.String({ default: '', description: '附加参数' })),
})
```

**返回 schema**:
```ts
Type.Object({
  url: Type.String({ description: '群分享链接' }),
}, { description: '群分享链接' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "need_short_url": true
}
```

**响应示例**:
```json
{
 "url": "https://qm.qq.com/q/xxxxxxxxxx"
}
```

源文件: `extends/GetGroupShareLink.ts`

---

### get_mini_app_ark
**获取小程序 Ark**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Union([
  Type.Object({
    type: Type.Union([Type.Literal('bili'), Type.Literal('weibo')], { description: '模板类型' }),
    title: Type.String({ description: '标题' }),
    desc: Type.String({ description: '描述' }),
    picUrl: Type.String({ description: '图片URL' }),
    jumpUrl: Type.String({ description: '跳转URL' }),
    webUrl: Type.Optional(Type.String({ description: '网页URL' })),
    rawArkData: Type.Optional(Type.Union([Type.String()], { description: '是否返回原始Ark数据' })),
  }),
  Type.Object({
    title: Type.String({ description: '标题' }),
    desc: Type.String({ description: '描述' }),
    picUrl: Type.String({ description: '图片URL' }),
    jumpUrl: Type.String({ description: '跳转URL' }),
    iconUrl: Type.String({ description: '图标URL' }),
    webUrl: Type.Optional(Type.String({ description: '网页URL' })),
    appId: Type.String({ description: '小程序AppID' }),
    scene: Type.String({ description: '场景ID' }),
    templateType: Type.String({ description: '模板类型' }),
    businessType: Type.String({ description: '业务类型' }),
    verType: Type.String({ description: '版本类型' }),
    shareType: Type.String({ description: '分享类型' }),
    versionId: Type.String({ description: '版本ID' }),
    sdkId: Type.String({ description: 'SDK ID' }),
    withShareTicket: Type.String({ description: '是否携带分享票据' }),
    rawArkData: Type.Optional(Type.String({ description: '是否返回原始Ark数据' })),
  }),
], { description: '小程序Ark参数' })
```

**返回 schema**:
```ts
Type.Object({
  data: Type.Any({ description: 'Ark数据' }),
}, { description: '获取小程序Ark结果' })
```

**请求示例**:
```json
{
 "type": "bili",
 "title": "测试标题",
 "desc": "测试描述",
 "picUrl": "http://example.com/pic.jpg",
 "jumpUrl": "http://example.com"
}
```

**响应示例**:
```json
{
 "data": {
  "ark": "ark_content"
 }
}
```

源文件: `extends/GetMiniAppArk.ts`

---

### get_msg
**获取消息** — 根据消息 ID 获取消息详细信息
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Union([Type.Number(), Type.String()], { description: '消息ID' }),
})
```

**返回 schema**:
```ts
Type.Object({
  time: Type.Number({ description: '发送时间' }),
  message_type: Type.String({ description: '消息类型' }),
  message_id: Type.Number({ description: '消息ID' }),
  real_id: Type.Number({ description: '真实ID' }),
  message_seq: Type.Number({ description: '消息序号' }),
  sender: Type.Any({ description: '发送者' }),
  message: Type.Any({ description: '消息内容' }),
  raw_message: Type.String({ description: '原始消息内容' }),
  font: Type.Number({ description: '字体' }),
  group_id: Type.Optional(Type.Union([Type.Number(), Type.String()], { description: '群号' })),
  user_id: Type.Union([Type.Number(), Type.String()], { description: '发送者QQ号' }),
  emoji_likes_list: Type.Optional(Type.Array(Type.Any(), { description: '表情回应列表' })),
}, { description: 'OneBot 11 消息' })
```

**请求示例**:
```json
{
 "_raw": "MsgActionsExamples.GetMsg.payload"
}
```

**响应示例**:
```json
{
 "_raw": "MsgActionsExamples.GetMsg.response"
}
```

源文件: `msg/GetMsg.ts`

---

### get_profile_like
**获取资料点赞**
标签: 用户扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.Optional(Type.String({ description: 'QQ号' })),
  start: Type.Union([Type.Number(), Type.String()], { default: 0, description: '起始位置' }),
  count: Type.Union([Type.Number(), Type.String()], { default: 10, description: '获取数量' }),
})
```

**返回 schema**:
```ts
Type.Object({
  uid: Type.String({ description: '用户UID' }),
  time: Type.String({ description: '时间' }),
  favoriteInfo: Type.Object({
    userInfos: Type.Array(Type.Any(), { description: '点赞用户信息' }),
    total_count: Type.Number({ description: '总点赞数' }),
    last_time: Type.Number({ description: '最后点赞时间' }),
    today_count: Type.Number({ description: '今日点赞数' }),
  }),
  voteInfo: Type.Object({
    total_count: Type.Number({ description: '总点赞数' }),
    new_count: Type.Number({ description: '新增点赞数' }),
    new_nearby_count: Type.Number({ description: '新增附近点赞数' }),
    last_visit_time: Type.Number({ description: '最后访问时间' }),
    userInfos: Type.Array(Type.Any(), { description: '点赞用户信息' }),
  }),
}, { description: '点赞详情' })
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "start": 0,
 "count": 10
}
```

**响应示例**:
```json
{
 "uid": "u_123",
 "time": "1734567890",
 "favoriteInfo": {
  "userInfos": [],
  "total_count": 10,
  "last_time": 1734567890,
  "today_count": 5
 },
 "voteInfo": {
  "total_count": 100,
  "new_count": 2,
  "new_nearby_count": 0,
  "last_visit_time": 1734567890,
  "userInfos": []
 }
}
```

源文件: `extends/GetProfileLike.ts`

---

### get_recent_contact
**获取最近会话** — 获取最近会话
标签: 用户接口

**payload schema**（源码原文）:
```ts
Type.Object({
  count: Type.Union([Type.Number(), Type.String()], { default: 10, description: '获取的数量' }),
})
```

**返回 schema**:
```ts
Type.Array(Type.Object({
  lastestMsg: Type.Any({ description: '最后一条消息' }),
  peerUin: Type.String({ description: '对象QQ' }),
  remark: Type.String({ description: '备注' }),
  msgTime: Type.String({ description: '消息时间' }),
  chatType: Type.Number({ description: '聊天类型' }),
  msgId: Type.String({ description: '消息ID' }),
  sendNickName: Type.String({ description: '发送者昵称' }),
  sendMemberName: Type.String({ description: '发送者群名片' }),
  peerName: Type.String({ description: '对象名称' }),
}), { description: '最近会话列表' })
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
  "peerUin": "123456",
  "peerName": "测试",
  "msgTime": "1734567890",
  "msgId": "12345",
  "lastestMsg": {}
 }
]
```

源文件: `user/GetRecentContact.ts`

---

### get_share_link
**获取文件分享链接**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  fileset_id: Type.String({ description: '文件集 ID' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '分享链接' })
```

**请求示例**:
```json
{
 "fileset_id": "set_123"
}
```

**响应示例**:
```json
"http://example.com/share"
```

源文件: `file/flash/GetShareLink.ts`

---

### mark_group_msg_as_read
**标记消息已读** — 标记指定渠道的消息为已读
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.Optional(Type.Union([Type.String(), Type.Number()], { description: '用户QQ' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  message_id: Type.Optional(Type.String({ description: '消息ID' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 12345
}
```

源文件: `msg/MarkMsgAsRead.ts`

---

### mark_msg_as_read
**标记消息已读** — 标记指定渠道的消息为已读
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.Optional(Type.Union([Type.String(), Type.Number()], { description: '用户QQ' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  message_id: Type.Optional(Type.String({ description: '消息ID' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 12345
}
```

源文件: `msg/MarkMsgAsRead.ts`

---

### mark_private_msg_as_read
**标记消息已读** — 标记指定渠道的消息为已读
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.Optional(Type.Union([Type.String(), Type.Number()], { description: '用户QQ' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  message_id: Type.Optional(Type.String({ description: '消息ID' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 12345
}
```

源文件: `msg/MarkMsgAsRead.ts`

---

### send_ark_share
**分享用户 (Ark)** — 获取用户推荐的 Ark 内容
标签: 消息扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.Optional(Type.String({ description: 'QQ号' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  phone_number: Type.String({ default: '', description: '手机号' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '分享结果' })
```

**请求示例**:
```json
{
 "user_id": "123456",
 "phone_number": ""
}
```

**响应示例**:
```json
{
 "ark": "..."
}
```

源文件: `extends/ShareContact.ts`

---

### send_flash_msg
**发送闪传消息**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  fileset_id: Type.String({ description: '文件集 ID' }),
  user_id: Type.Optional(Type.String({ description: '用户 QQ' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '发送结果' })
```

**请求示例**:
```json
{
 "fileset_id": "set_123",
 "user_id": "123456789"
}
```

**响应示例**:
```json
{
 "message_id": 123456
}
```

源文件: `file/flash/SendFlashMsg.ts`

---

### send_forward_msg
**发送合并转发消息** — 发送合并转发消息
标签: Go-CQHTTP

**参数（启发式提取）**: messages, message

**请求示例**:
```json
{
 "group_id": "123456789",
 "messages": []
}
```

**响应示例**:
```json
{
 "message_id": 123456
}
```

源文件: `go-cqhttp/SendForwardMsg.ts`

---

### send_group_ark_share
**分享用户 (Ark)** — 获取用户推荐的 Ark 内容
标签: 消息扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.Optional(Type.String({ description: 'QQ号' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  phone_number: Type.String({ default: '', description: '手机号' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '分享结果' })
```

**请求示例**:
```json
{
 "user_id": "123456",
 "phone_number": ""
}
```

**响应示例**:
```json
{
 "ark": "..."
}
```

源文件: `extends/ShareContact.ts`

---

### send_group_forward_msg
**发送合并转发消息** — 发送合并转发消息
标签: Go-CQHTTP

**参数（启发式提取）**: messages, message

**请求示例**:
```json
{
 "group_id": "123456789",
 "messages": []
}
```

**响应示例**:
```json
{
 "message_id": 123456
}
```

源文件: `go-cqhttp/SendForwardMsg.ts`

---

### send_group_msg
**发送群消息** — 发送群消息
标签: 群组接口

**payload schema**（源码原文）:
```ts
Type.Object({
  message_type: Type.Optional(Type.Union([Type.Literal('private'), Type.Literal('group')], { description: '消息类型 (private/group)' })),
  user_id: Type.Optional(Type.String({ description: '用户QQ' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  message: OB11MessageMixTypeSchema,
  auto_escape: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否作为纯文本发送' })),
  // 以下为扩展字段
  source: Type.Optional(Type.String({ description: '合并转发来源' })),
  news: Type.Optional(Type.Array(Type.Object({ text: Type.String() }), { description: '合并转发新闻' })),
  summary: Type.Optional(Type.String({ description: '合并转发摘要' })),
  prompt: Type.Optional(Type.String({ description: '合并转发提示' })),
  timeout: Type.Optional(Type.Number({ description: '自定义发送超时(毫秒)，覆盖自动计算值' })),
})
```

**请求示例**:
```json
{
 "group_id": "123456",
 "message": "hello"
}
```

**响应示例**:
```json
{
 "message_id": 123456
}
```

源文件: `group/SendGroupMsg.ts`

---

### send_like
**点赞** — 给指定用户点赞
标签: 用户接口

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '对方 QQ 号' }),
  times: Type.Union([Type.Number(), Type.String()], { default: 1, description: '点赞次数' }),
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
 "times": 10
}
```

**响应示例**:
```json
{}
```

源文件: `user/SendLike.ts`

---

### send_msg
**发送消息** — 发送私聊或群聊消息
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  message_type: Type.Optional(Type.Union([Type.Literal('private'), Type.Literal('group')], { description: '消息类型 (private/group)' })),
  user_id: Type.Optional(Type.String({ description: '用户QQ' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  message: OB11MessageMixTypeSchema,
  auto_escape: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否作为纯文本发送' })),
  // 以下为扩展字段
  source: Type.Optional(Type.String({ description: '合并转发来源' })),
  news: Type.Optional(Type.Array(Type.Object({ text: Type.String() }), { description: '合并转发新闻' })),
  summary: Type.Optional(Type.String({ description: '合并转发摘要' })),
  prompt: Type.Optional(Type.String({ description: '合并转发提示' })),
  timeout: Type.Optional(Type.Number({ description: '自定义发送超时(毫秒)，覆盖自动计算值' })),
})
```

**返回 schema**:
```ts
Type.Object({
  message_id: Type.Number({ description: '消息ID' }),
  res_id: Type.Optional(Type.String({ description: '转发消息的 res_id' })),
  forward_id: Type.Optional(Type.String({ description: '转发消息的 forward_id' })),
})
```

**请求示例**:
```json
{
 "_raw": "MsgActionsExamples.SendMsg.payload"
}
```

**响应示例**:
```json
{
 "_raw": "MsgActionsExamples.SendMsg.response"
}
```

源文件: `msg/SendMsg.ts`

---

### send_packet
**发送原始数据包**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  cmd: Type.String({ description: '命令字' }),
  data: Type.String({ description: '十六进制数据' }),
  rsp: Type.Union([Type.String(), Type.Boolean()], { default: true, description: '是否等待响应' }),
})
```

**返回 schema**:
```ts
Type.Union([Type.String({ description: '响应十六进制数据' }), Type.Undefined()], { description: '发包结果' })
```

**请求示例**:
```json
{
 "cmd": "Example.Cmd",
 "data": "123456",
 "rsp": true
}
```

**响应示例**:
```json
"123456"
```

源文件: `extends/SendPacket.ts`

---

### send_poke
**发送戳一戳** — 在群聊或私聊中发送戳一戳动作
标签: 核心接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.Optional(Type.String({ description: '群号' })),
  user_id: Type.String({ description: '用户QQ' }),
  target_id: Type.Optional(Type.String({ description: '目标QQ' })),
})
```

**返回 schema**:
```ts
Type.Null()
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

源文件: `packet/SendPoke.ts`

---

### send_private_forward_msg
**发送合并转发消息** — 发送合并转发消息
标签: Go-CQHTTP

**参数（启发式提取）**: messages, message

**请求示例**:
```json
{
 "group_id": "123456789",
 "messages": []
}
```

**响应示例**:
```json
{
 "message_id": 123456
}
```

源文件: `go-cqhttp/SendForwardMsg.ts`

---

### send_private_msg
**发送私聊消息** — 发送私聊消息
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  message_type: Type.Optional(Type.Union([Type.Literal('private'), Type.Literal('group')], { description: '消息类型 (private/group)' })),
  user_id: Type.Optional(Type.String({ description: '用户QQ' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  message: OB11MessageMixTypeSchema,
  auto_escape: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否作为纯文本发送' })),
  // 以下为扩展字段
  source: Type.Optional(Type.String({ description: '合并转发来源' })),
  news: Type.Optional(Type.Array(Type.Object({ text: Type.String() }), { description: '合并转发新闻' })),
  summary: Type.Optional(Type.String({ description: '合并转发摘要' })),
  prompt: Type.Optional(Type.String({ description: '合并转发提示' })),
  timeout: Type.Optional(Type.Number({ description: '自定义发送超时(毫秒)，覆盖自动计算值' })),
})
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "message": "hello"
}
```

**响应示例**:
```json
{
 "message_id": 123456
}
```

源文件: `msg/SendPrivateMsg.ts`

---

### set_msg_emoji_like
**设置消息表情点赞**
标签: 消息扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Union([Type.Number(), Type.String()], { description: '消息ID' }),
  emoji_id: Type.Union([Type.Number(), Type.String()], { description: '表情ID' }),
  set: Type.Optional(Type.Union([Type.Boolean(), Type.String()], { description: '是否设置' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 12345,
 "emoji_id": "123",
 "set": true
}
```

**响应示例**:
```json
{
 "result": true
}
```

源文件: `msg/SetMsgEmojiLike.ts`

---

### .handle_quick_operation
**处理快速操作** — 处理来自事件上报的快速操作请求
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  context: QuickActionEventSchema,
  operation: QuickActionSchema,
})
```

**返回 schema**:
```ts
Type.Null()
```

**请求示例**:
```json
{
 "context": {},
 "operation": {}
}
```

**响应示例**:
```json
{}
```

源文件: `go-cqhttp/QuickAction.ts`

---

### ArkShareGroup
**分享用户 (Ark)** — 获取用户推荐的 Ark 内容
标签: 消息扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.Optional(Type.String({ description: 'QQ号' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  phone_number: Type.String({ default: '', description: '手机号' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '分享结果' })
```

**请求示例**:
```json
{
 "user_id": "123456",
 "phone_number": ""
}
```

**响应示例**:
```json
{
 "ark": "..."
}
```

源文件: `extends/ShareContact.ts`

---

### ArkSharePeer
**分享用户 (Ark)** — 获取用户推荐的 Ark 内容
标签: 消息扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.Optional(Type.String({ description: 'QQ号' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  phone_number: Type.String({ default: '', description: '手机号' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '分享结果' })
```

**请求示例**:
```json
{
 "user_id": "123456",
 "phone_number": ""
}
```

**响应示例**:
```json
{
 "ark": "..."
}
```

源文件: `extends/ShareContact.ts`

---

### _mark_all_as_read
**标记消息已读** — 标记指定渠道的消息为已读
标签: 消息接口

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.Optional(Type.Union([Type.String(), Type.Number()], { description: '用户QQ' })),
  group_id: Type.Optional(Type.String({ description: '群号' })),
  message_id: Type.Optional(Type.String({ description: '消息ID' })),
})
```

**返回 schema**:
```ts
Type.Null({ description: '操作结果' })
```

**请求示例**:
```json
{
 "message_id": 12345
}
```

源文件: `msg/MarkMsgAsRead.ts`

---

### fetch_emoji_like
**获取表情点赞详情**
标签: 消息扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Union([Type.Number(), Type.String()], { description: '消息ID' }),
  emojiId: Type.Union([Type.Number(), Type.String()], { description: '表情ID' }),
  emojiType: Type.Union([Type.Number(), Type.String()], { description: '表情类型' }),
  count: Type.Union([Type.Number(), Type.String()], { default: 20, description: '获取数量' }),
  cookie: Type.String({ default: '', description: '分页Cookie' }),
})
```

**返回 schema**:
```ts
Type.Object({
  emojiLikesList: Type.Array(Type.Object({
    tinyId: Type.String({ description: 'TinyID' }),
    nickName: Type.String({ description: '昵称' }),
    headUrl: Type.String({ description: '头像URL' }),
  }), { description: '表情回应列表' }),
  cookie: Type.String({ description: '分页Cookie' }),
  isLastPage: Type.Boolean({ description: '是否最后一页' }),
  isFirstPage: Type.Boolean({ description: '是否第一页' }),
  result: Type.Number({ description: '结果状态码' }),
  errMsg: Type.String({ description: '错 误信息' }),
}, { description: '表情回应详情' })
```

**请求示例**:
```json
{
 "message_id": 12345,
 "emojiId": "123",
 "emojiType": 1,
 "count": 10,
 "cookie": ""
}
```

**响应示例**:
```json
{
 "emojiLikesList": [
  {
   "tinyId": "123456",
   "nickName": "测试用户",
   "headUrl": "http://example.com/avatar.png"
  }
 ],
 "cookie": "",
 "isLastPage": true,
 "isFirstPage": true,
 "result": 0,
 "errMsg": ""
}
```

源文件: `extends/FetchEmojiLike.ts`

---

### fetch_ptt_text
**获取语音转文字结果**
标签: 消息扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  message_id: Type.Union([Type.Number(), Type.String()], { description: '消息ID' }),
})
```

**返回 schema**:
```ts
Type.Object({ text: Type.String({ description: '得到的文本' }) })
```

**请求示例**:
```json
{
 "_raw": "MsgActionsExamples.FetchPttText.payload"
}
```

**响应示例**:
```json
{
 "_raw": "MsgActionsExamples.FetchPttText.response"
}
```

源文件: `msg/FetchPttText.ts`

---

### forward_qzone_public_feed
**转发空友爱看动态** — 将完整 feed 转发到自己的空间，可通过 reason 添加转发附言

**payload schema**（源码原文）:
```ts
Type.Object({
  feed: QzonePublicFeedSchema,
  reason: Type.Optional(Type.String({ default: '', description: '转发附言，默认空字符串；数字或布尔值会转为文本' })),
})
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample, reason: '分享一条动态' }"
}
```

源文件: `extends/qzone-public/ForwardQzonePublicFeed.ts`

---

### friend_poke
**发送戳一戳** — 在群聊或私聊中发送戳一戳动作
标签: 核心接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.Optional(Type.String({ description: '群号' })),
  user_id: Type.String({ description: '用户QQ' }),
  target_id: Type.Optional(Type.String({ description: '目标QQ' })),
})
```

**返回 schema**:
```ts
Type.Null()
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

源文件: `packet/SendPoke.ts`

---

### group_poke
**发送戳一戳** — 在群聊或私聊中发送戳一戳动作
标签: 核心接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.Optional(Type.String({ description: '群号' })),
  user_id: Type.String({ description: '用户QQ' }),
  target_id: Type.Optional(Type.String({ description: '目标QQ' })),
})
```

**返回 schema**:
```ts
Type.Null()
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

源文件: `packet/SendPoke.ts`

---

### set_qzone_public_comment_like
**设置空友爱看评论或回复赞** — 对完整 comment 点赞或取消点赞；传入完整 reply 时操作该回复，保留 comment/reply 的 like.id 等字段

**payload schema**（源码原文）:
```ts
Type.Object({
  feed: QzonePublicFeedSchema,
  comment: QzonePublicCommentSchema,
  reply: Type.Optional(QzonePublicReplySchema),
  enable: QzonePublicEnableSchema,
})
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample, comment: QzonePublicCommentExample, enable: true }"
}
```

源文件: `extends/qzone-public/SetQzonePublicCommentLike.ts`

---

### set_qzone_public_like
**设置空友爱看普通赞** — 对完整 feed 设置或取消普通点赞（like）；enable 默认 true，此操作与推分别处理

**payload schema**（源码原文）:
```ts
Type.Object({ feed: QzonePublicFeedSchema, enable: QzonePublicEnableSchema })
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample, enable: true }"
}
```

源文件: `extends/qzone-public/SetQzonePublicLike.ts`

---

## 仅清单（源码版未收录详情，待补）

| 接口 | 功能 |
|---|---|
| markdown | 发Markdown消息 |
| poke | 戳一戳 |
| upload_forward_msg | 上传合并转发 |

> 本文件未涵盖的接口/规则以 napcat-api-source.md（全量）与 INDEX.md（检索表）为准，勿凭猜测构造参数。
