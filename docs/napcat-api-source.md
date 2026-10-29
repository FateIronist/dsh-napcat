# NapCat QQ 接口文档（源码全量背书版）

> 生成方式：解析 NapCatQQ 官方仓库 `packages/napcat-onebot/action/`（commit `ba0a53d`，main 分支，2026-10-29 shallow clone）。
> 每个接口的参数 schema、请求/响应示例均直接来自源码 `PayloadSchema`/`payloadExample`，无人工推测。
> 部署容器版本可能与 main 有代差：接口名对不上时以 `get_version_info` + 实测为准。
> 配套速查清单：`napcat-api-reference.md`。重生成：`node /tmp/gen-napcat-doc.mjs <commit>`。

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


## 流式传输（6 个）

### clean_stream_temp_file
**清理流式传输临时文件**
标签: 流式传输扩展

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

**响应示例**:
```json
{
 "message": "success"
}
```

源文件: `stream/CleanStreamTempFile.ts`

---
### test_download_stream
**测试下载流**
标签: 流式传输扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  error: Type.Optional(Type.Boolean({ default: false, description: '是否触发测试错误' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '测试流数据' })
```

**请求示例**:
```json
{
 "url": "http://example.com/file"
}
```

**响应示例**:
```json
{
 "success": true
}
```

源文件: `stream/TestStreamDownload.ts`

---
### upload_file_stream
**上传文件流** — 以流式方式上传文件数据到机器人
标签: 流式接口

**payload schema**（源码原文）:
```ts
Type.Object({
  stream_id: Type.String({ description: '流 ID' }),
  chunk_data: Type.Optional(Type.String({ description: '分块数据 (Base64)' })),
  chunk_index: Type.Optional(Type.Number({ description: '分块索引' })),
  total_chunks: Type.Optional(Type.Number({ description: '总分块数' })),
  file_size: Type.Optional(Type.Number({ description: '文件总大小' })),
  expected_sha256: Type.Optional(Type.String({ description: '期望的 SHA256' })),
  is_complete: Type.Optional(Type.Boolean({ description: '是否完成' })),
  filename: Type.Optional(Type.String({ description: '文件名' })),
  reset: Type.Optional(Type.Boolean({ description: '是否重置' })),
  verify_only: Type.Optional(Type.Boolean({ description: '是否仅验证' })),
  file_retention: Type.Number({ default: 5 * 60 * 1000, description: '文件保留时间 (毫秒)' }), // 默认5分钟 回收 不设置或0为不回收
})
```

**返回 schema**:
```ts
Type.Any({ description: '上传结果 (流式)' })
```

**请求示例**:
```json
{
 "stream_id": "uuid-1234-5678",
 "chunk_data": "SGVsbG8gV29ybGQ=",
 "chunk_index": 0,
 "total_chunks": 1,
 "file_size": 11
}
```

**响应示例**:
```json
{
 "type": "stream",
 "stream_id": "uuid-1234-5678",
 "status": "chunk_received",
 "received_chunks": 1,
 "total_chunks": 1
}
```

源文件: `stream/UploadFileStream.ts`

---
### download_file_stream
**下载文件流** — 以流式方式从网络或本地下载文件
标签: 流式接口

**payload schema**（源码原文）:
```ts
Type.Object({
  file: Type.Optional(Type.String({ description: '文件路径或 URL' })),
  file_id: Type.Optional(Type.String({ description: '文件 ID' })),
  chunk_size: Type.Optional(Type.Number({ default: 64 * 1024, description: '分块大小 (字节)' })), // 默认64KB分块
})
```

**返回 schema**:
```ts
Type.Any({ description: '下载结果 (流式)' })
```

**请求示例**:
```json
{
 "file": "http://example.com/file.png"
}
```

**响应示例**:
```json
{
 "type": "stream",
 "data_type": "file_info",
 "file_name": "file.png",
 "file_size": 1024
}
```

源文件: `stream/DownloadFileStream.ts`

---
### download_file_record_stream
**下载语音文件流**
标签: 流式传输扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  file: Type.Optional(Type.String({ description: '文件路径或 URL' })),
  file_id: Type.Optional(Type.String({ description: '文件 ID' })),
  chunk_size: Type.Optional(Type.Number({ default: 64 * 1024, description: '分块大小 (字节)' })), // 默认64KB分块
  out_format: Type.Optional(Type.String({ description: '输出格式' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '下载结果 (流式)' })
```

**请求示例**:
```json
{
 "file": "record_file_id"
}
```

**响应示例**:
```json
{
 "file": "temp_record_path"
}
```

源文件: `stream/DownloadFileRecordStream.ts`

---
### download_file_image_stream
**下载图片文件流**
标签: 流式传输扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  file: Type.Optional(Type.String({ description: '文件路径或 URL' })),
  file_id: Type.Optional(Type.String({ description: '文件 ID' })),
  chunk_size: Type.Optional(Type.Number({ default: 64 * 1024, description: '分块大小 (字节)' })), // 默认64KB分块
})
```

**返回 schema**:
```ts
Type.Any({ description: '下载结果 (流式)' })
```

**请求示例**:
```json
{
 "file": "image_file_id"
}
```

**响应示例**:
```json
{
 "file": "temp_image_path"
}
```

源文件: `stream/DownloadFileImageStream.ts`

---

## NapCat 扩展（73 个）

### del_group_album_media
**删除群相册媒体**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  album_id: Type.String({ description: '相册ID' }),
  lloc: Type.String({ description: '媒体ID (lloc)' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '删除结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "album_id": "album_id_1",
 "lloc": "media_id_1"
}
```

**响应示例**:
```json
{
 "result": {}
}
```

源文件: `extends/DelGroupAlbumMedia.ts`

---
### set_group_album_media_like
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
### do_group_album_comment
**发表群相册评论** — lloc 与 batch_id 至少提供一项。传入 lloc 时评论单张图片；仅传 batch_id 时评论整个上传批次。
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  album_id: Type.String({ description: '相册 ID' }),
  lloc: Type.Optional(Type.String({ description: '图片 ID；不传或为空时评论整个上传批次，此时必须提供 batch_id' })),
  batch_id: Type.Optional(Type.String({ description: '上传批次 ID，可取自 get_group_album_media_list 返回的 batch.link_id 或 media[].batch_id' })),
  content: Type.String({ description: '评论内容' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '评论结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "album_id": "album_id_1",
 "batch_id": "2147483658",
 "content": "很有意思"
}
```

**响应示例**:
```json
{
 "result": {}
}
```

源文件: `extends/DoGroupAlbumComment.ts`

---
### get_group_album_media_list
**获取群相册媒体列表**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  album_id: Type.String({ description: '相册ID' }),
  attach_info: Type.Optional(Type.String({ default: '', description: '附加信息（用于分页）' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '相册媒体列表' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "album_id": "album_id_1"
}
```

**响应示例**:
```json
{
 "media_list": [
  {
   "media_id": "media_id_1",
   "url": "http://example.com/1.jpg"
  }
 ]
}
```

源文件: `extends/GetGroupAlbumMediaList.ts`

---
### upload_image_to_qun_album
**上传图片到群相册**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  album_id: Type.String({ description: '相册ID' }),
  album_name: Type.String({ description: '相册名称' }),
  file: Type.String({ description: '图片路径、URL或Base64' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '上传结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "album_id": "album_id_1",
 "album_name": "相册1",
 "file": "/path/to/image.jpg"
}
```

**响应示例**:
```json
{
 "result": null
}
```

源文件: `extends/UploadImageToQunAlbum.ts`

---
### upload_images_to_qun_album
**上传多张图片到群相册** — 一次上传多张图片，这些图片在群相册里显示为同一条上传
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  album_id: Type.String({ description: '相册ID' }),
  album_name: Type.String({ description: '相册名称' }),
  files: Type.Array(Type.String(), { description: '图片路径、URL或Base64 数组，一次上传多张' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '上传结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "album_id": "album_id_1",
 "album_name": "相册1",
 "files": [
  "/path/to/1.jpg",
  "/path/to/2.jpg"
 ]
}
```

**响应示例**:
```json
{
 "result": null
}
```

源文件: `extends/UploadImagesToQunAlbum.ts`

---
### upload_video_to_qun_album
**上传视频到群相册** — 上传视频到群相册，封面自动抽取首帧（失败时使用内置默认封面）
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  album_id: Type.String({ description: '相册ID' }),
  album_name: Type.String({ description: '相册名称' }),
  file: Type.String({ description: '视频路径、URL或Base64' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '上传结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "album_id": "album_id_1",
 "album_name": "相册1",
 "file": "/path/to/video.mp4"
}
```

**响应示例**:
```json
{
 "result": null
}
```

源文件: `extends/UploadVideoToQunAlbum.ts`

---
### get_qun_album_list
**获取群相册列表**
标签: 群组扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  attach_info: Type.Optional(Type.String({ default: '', description: '附加信息（用于分页，从上一次返回结果中获取）' })),
})
```

**返回 schema**:
```ts
Type.Object({
  album_list: Type.Array(Type.Any(), { description: '群相册列表' }),
  attach_info: Type.String({ description: '分页附加信息，传入下一次请求以获取更多数据' }),
  has_more: Type.Boolean({ description: '是否有更多数据' }),
}, { description: '群相册列表响应' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "attach_info": ""
}
```

**响应示例**:
```json
{
 "album_list": [
  {
   "album_id": "album_1",
   "album_name": "测试相册",
   "cover_url": "http://example.com/cover.jpg",
   "create_time": 1734567890
  }
 ],
 "attach_info": "",
 "has_more": false
}
```

源文件: `extends/GetQunAlbumList.ts`

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
### ocr_image
**图片 OCR 识别** — 识别图片中的文字内容(仅Windows端支持)
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  image: Type.String({ description: '图片路径、URL或Base64' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: 'OCR结果' })
```

**请求示例**:
```json
{
 "image": "image_id_123"
}
```

**响应示例**:
```json
{
 "texts": [
  {
   "text": "识别内容",
   "coordinates": []
  }
 ]
}
```

源文件: `extends/OCRImage.ts`

---
### .ocr_image
**图片 OCR 识别** — 识别图片中的文字内容(仅Windows端支持)
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  image: Type.String({ description: '图片路径、URL或Base64' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: 'OCR结果' })
```

**请求示例**:
```json
{
 "image": "image_id_123"
}
```

**响应示例**:
```json
{
 "texts": [
  {
   "text": "识别内容",
   "coordinates": []
  }
 ]
}
```

源文件: `extends/OCRImage.ts`

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
### get_robot_uin_range
**获取机器人 UIN 范围**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Array(Type.Any(), { description: '机器人Uin范围列表' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
[
 {
  "minUin": "12345678",
  "maxUin": "87654321"
 }
]
```

源文件: `extends/GetRobotUinRange.ts`

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
### translate_en2zh
**英文单词翻译** — 将英文单词列表翻译为中文
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  words: Type.Array(Type.String(), { description: '待翻译单词列表' }),
})
```

**返回 schema**:
```ts
Type.Object({
  words: Type.Array(Type.String(), { description: '翻译结果列表' }),
}, { description: '翻译结果' })
```

**请求示例**:
```json
{
 "words": [
  "hello"
 ]
}
```

**响应示例**:
```json
{
 "words": [
  "你好"
 ]
}
```

源文件: `extends/TranslateEnWordToZn.ts`

---
### create_collection
**创建收藏**
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  rawData: Type.String({ description: '原始数据' }),
  brief: Type.String({ description: '简要描述' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '创建结果' })
```

**请求示例**:
```json
{
 "rawData": "收藏内容",
 "brief": "收藏标题"
}
```

**响应示例**:
```json
{
 "result": 0,
 "errMsg": ""
}
```

源文件: `extends/CreateCollection.ts`

---
### get_collection_list
**获取收藏列表**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  category: Type.String({ description: '分类ID' }),
  count: Type.String({ default: '50', description: '获取数量' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '收藏列表' })
```

**请求示例**:
```json
{
 "category": "0",
 "count": "50"
}
```

**响应示例**:
```json
{
 "errCode": 0,
 "errMsg": "",
 "collectionSearchList": {
  "collectionItemList": [
   {
    "cid": "123456",
    "type": 8,
    "status": 1,
    "author": {
     "type": 2,
     "numId": "123456",
     "strId": "昵称",
     "groupId": "123456",
     "groupName": "群名",
     "uid": "123456"
    },
    "bid": 1,
    "category": 1,
    "createTime": "1769169157000",
    "collectTime": "1769413477691",
    "modifyTime": "1769413477691",
    "sequence": "1769413476735",
    "shareUrl": "",
    "customGroupId": 0,
    "securityBeat": false,
    "summary": {
     "textSummary": null,
     "linkSummary": null,
     "gallerySummary": null,
     "audioSummary": null,
     "videoSummary": null,
     "fileSummary": null,
     "locationSummary": null,
     "richMediaSummary": {
      "title": "",
      "subTitle": "",
      "brief": "text",
      "picList": [],
      "contentType": 1,
      "originalUri": "",
      "publisher": "",
      "richMediaVersion": 0
     }
    }
   }
  ],
  "hasMore": false,
  "bottomTimeStamp": "1769413477691"
 }
}
```

源文件: `extends/GetCollectionList.ts`

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
### fetch_custom_face
**获取自定义表情**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  count: Type.Union([Type.Number(), Type.String()], { default: 48, description: '获取数量' }),
})
```

**返回 schema**:
```ts
Type.Array(Type.String(), { description: '表情URL列表' })
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
 "http://example.com/face1.png"
]
```

源文件: `extends/FetchCustomFace.ts`

---
### fetch_custom_face_detail
**获取自定义表情详情**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  count: Type.Union([Type.Number(), Type.String()], { default: 48, description: '获取数量' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '自定义表情详情列表' })
```

**请求示例**:
```json
{
 "count": 10
}
```

源文件: `extends/CustomFace.ts`

---
### add_custom_face
**获取自定义表情详情**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  count: Type.Union([Type.Number(), Type.String()], { default: 48, description: '获取数量' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '自定义表情详情列表' })
```

**请求示例**:
```json
{
 "count": 10
}
```

源文件: `extends/CustomFace.ts`

---
### delete_custom_face
**获取自定义表情详情**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  count: Type.Union([Type.Number(), Type.String()], { default: 48, description: '获取数量' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '自定义表情详情列表' })
```

**请求示例**:
```json
{
 "count": 10
}
```

源文件: `extends/CustomFace.ts`

---
### set_custom_face_desc
**获取自定义表情详情**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  count: Type.Union([Type.Number(), Type.String()], { default: 48, description: '获取数量' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '自定义表情详情列表' })
```

**请求示例**:
```json
{
 "count": 10
}
```

源文件: `extends/CustomFace.ts`

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
### nc_get_rkey
**获取 RKey**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Array(Type.Any(), { description: 'Rkey列表' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
[
 {
  "key": "rkey_value",
  "expired": 1734567890
 }
]
```

源文件: `extends/GetRkey.ts`

---
### move_group_file
**移动群文件**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  file_id: Type.String({ description: '文件ID' }),
  current_parent_directory: Type.String({ description: '当前父目录' }),
  target_parent_directory: Type.String({ description: '目标父目录' }),
})
```

**返回 schema**:
```ts
Type.Object({
  ok: Type.Boolean({ description: '是否成功' }),
}, { description: '移动文件结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "file_id": "/file_id",
 "current_parent_directory": "/current_folder_id",
 "target_parent_directory": "/target_folder_id"
}
```

**响应示例**:
```json
{
 "ok": true
}
```

源文件: `extends/MoveGroupFile.ts`

---
### trans_group_file
**传输群文件**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  file_id: Type.String({ description: '文件ID' }),
})
```

**返回 schema**:
```ts
Type.Object({
  ok: Type.Boolean({ description: '是否成功' }),
}, { description: '转发文件结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "file_id": "/file_id"
}
```

**响应示例**:
```json
{
 "ok": true
}
```

源文件: `extends/TransGroupFile.ts`

---
### rename_group_file
**重命名群文件**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  file_id: Type.String({ description: '文件ID' }),
  current_parent_directory: Type.String({ description: '当前父目录' }),
  new_name: Type.String({ description: '新文件名' }),
})
```

**返回 schema**:
```ts
Type.Object({
  ok: Type.Boolean({ description: '是否成功' }),
}, { description: '重命名文件结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "file_id": "/file_id",
 "current_parent_directory": "/",
 "new_name": "new_name.jpg"
}
```

**响应示例**:
```json
{
 "ok": true
}
```

源文件: `extends/RenameGroupFile.ts`

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
### send_qzone_msg
**发表QQ空间说说** — 在QQ空间(Qzone)发表说说, 支持纯文字或带(多)图, 可设置查看权限
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  content: Type.String({ description: '说说正文' }),
  images: Type.Optional(Type.Array(Type.String(), { description: '图片数组, 支持 file:// http(s):// base64:// , 自动上传' })),
  ugc_right: Type.Optional(Type.Union([Type.Number(), Type.String()], { default: 1, description: '查看权限: 1所有人可见 4好友可见 16部分好友可见 64仅自己可见 128部分好友不可见' })),
  target_uins: Type.Optional(Type.Array(Type.Union([Type.Number(), Type.String()]), { description: 'ugc_right为16/128时, 权限作用的QQ号数组' })),
})
```

**返回 schema**:
```ts
Type.Object({
  tid: Type.String({ description: '说说Tid' }),
}, { description: '发说说结果' })
```

**请求示例**:
```json
{
 "content": "今天天气不错",
 "images": [],
 "ugc_right": 1,
 "target_uins": []
}
```

**响应示例**:
```json
{
 "tid": "1234567890abcdef1234567890"
}
```

源文件: `extends/SendQzoneMsg.ts`

---
### delete_qzone_msg
**删除QQ空间说说** — 删除QQ空间(Qzone)的一条说说, 按 tid 删除
标签: 扩展接口

**payload schema**（源码原文）:
```ts
Type.Object({
  tid: Type.String({ description: '说说 tid (来自 get_qzone_msg_list / send_qzone_msg)' }),
})
```

**返回 schema**:
```ts
Type.Null()
```

**请求示例**:
```json
{
 "tid": "1234567890abcdef1234567890"
}
```

源文件: `extends/DeleteQzoneMsg.ts`

---
### get_qzone_public_capabilities
**获取空友爱看接口能力** — 获取当前 QQ 版本和账号可用的空友爱看接口能力，不会执行写操作

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**请求示例**:
```json
{}
```

源文件: `extends/qzone-public/GetQzonePublicCapabilities.ts`

---
### get_qzone_public_feeds
**获取空友爱看动态** — 获取空友爱看动态列表；后续操作应直接传入 feeds 中的完整对象，翻页使用 next_cursor

**payload schema**（源码原文）:
```ts
Type.Object({
  cursor: Type.Optional(Type.String({ minLength: 1, maxLength: 65536, description: '上一页返回的非空 next_cursor，首次请求可省略；数字或布尔值会转为文本' })),
})
```

**返回 schema**:
```ts
Type.Object({
  feeds: Type.Array(QzonePublicObjectSchema, { description: '完整动态对象，可直接传给详情和互动接口' }),
  has_more: Type.Boolean({ description: '是否还有下一页' }),
  next_cursor: Type.Union([Type.String(), Type.Null()], { description: '下一页游标，没有下一页时为 null' }),
}, { additionalProperties: true, description: '动态列表分页结果，保留上游返回的额外字段' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
{
 "_raw": "{ feeds: [QzonePublicFeedExample], has_more: false, next_cursor: null }"
}
```

源文件: `extends/qzone-public/GetQzonePublicFeeds.ts`

---
### get_qzone_public_feed_detail
**获取空友爱看动态详情** — 传入列表中的完整 feed 对象获取详情；继续读取评论时，将详情返回的 attach_info 作为 cursor

**payload schema**（源码原文）:
```ts
Type.Object({ feed: QzonePublicFeedSchema })
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample }"
}
```

源文件: `extends/qzone-public/GetQzonePublicFeedDetail.ts`

---
### get_qzone_public_comments
**获取空友爱看评论** — 读取动态的后续评论；cursor 为必填非空字符串，使用动态详情或上一评论页的 attach_info，原始评论对象应完整保留

**payload schema**（源码原文）:
```ts
Type.Object({
  feed: QzonePublicFeedSchema,
  cursor: Type.String({ minLength: 1, description: '动态详情或上一评论页返回的非空 attach_info；数字或布尔值会转为文本' }),
})
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample, cursor: 'detail-attach-info' }"
}
```

源文件: `extends/qzone-public/GetQzonePublicComments.ts`

---
### get_qzone_public_replies
**获取空友爱看评论回复** — 传入完整动态及父评论读取回复分页；省略 cursor 时使用父评论中的 reply_attach_info

**payload schema**（源码原文）:
```ts
Type.Object({
  feed: QzonePublicFeedSchema,
  comment: QzonePublicCommentSchema,
  cursor: Type.Optional(Type.String({ default: '', description: '回复分页游标，默认为空字符串；空字符串时使用 comment.reply_attach_info；数字或布尔值会转为文本' })),
  page_size: Type.Optional(Type.Union([
    Type.Number({ minimum: 1 }), Type.String(),
  ], { default: 20, description: '每页回复数量，默认 20；有限数字或非空数值字符串，向零截断后应大于等于 1' })),
})
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample, comment: QzonePublicCommentExample, page_size: 20 }"
}
```

源文件: `extends/qzone-public/GetQzonePublicReplies.ts`

---
### set_qzone_public_upvote
**推或取消推空友爱看动态** — 对完整 feed 设置推或取消推（upvote）；enable 默认 true，此操作与普通点赞分别处理

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

源文件: `extends/qzone-public/SetQzonePublicUpvote.ts`

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
### set_qzone_public_follow
**蹲或取消蹲空友爱看作者** — 根据完整 feed 蹲或取消蹲动态作者；enable 默认 true，返回上游操作结果

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

源文件: `extends/qzone-public/SetQzonePublicFollow.ts`

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
### comment_qzone_public_feed
**评论空友爱看动态** — 对完整 feed 发表评论；content 接受非空文本或富文本对象数组，富文本字段原样保留

**payload schema**（源码原文）:
```ts
Type.Object({ feed: QzonePublicFeedSchema, content: QzonePublicContentSchema })
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample, content: '很有意思' }"
}
```

源文件: `extends/qzone-public/CommentQzonePublicFeed.ts`

---
### reply_qzone_public_feed
**回复空友爱看评论** — 传入完整 feed、父 comment 及非空 content 发表回复；需要回复已有回复时一并传入完整 reply

**payload schema**（源码原文）:
```ts
Type.Object({
  feed: QzonePublicFeedSchema,
  comment: QzonePublicCommentSchema,
  content: QzonePublicContentSchema,
  reply: Type.Optional(QzonePublicReplySchema),
})
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample, comment: QzonePublicCommentExample, content: '谢谢分享' }"
}
```

源文件: `extends/qzone-public/ReplyQzonePublicFeed.ts`

---
### delete_qzone_public_comment
**删除空友爱看评论** — 传入完整 feed 及 comment 删除评论，操作权限由上游校验

**payload schema**（源码原文）:
```ts
Type.Object({ feed: QzonePublicFeedSchema, comment: QzonePublicCommentSchema })
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample, comment: QzonePublicCommentExample }"
}
```

源文件: `extends/qzone-public/DeleteQzonePublicComment.ts`

---
### delete_qzone_public_reply
**删除空友爱看回复** — 传入完整 feed、父 comment 和目标 reply 删除回复，操作权限由上游校验

**payload schema**（源码原文）:
```ts
Type.Object({ feed: QzonePublicFeedSchema, comment: QzonePublicCommentSchema, reply: QzonePublicReplySchema })
```

**请求示例**:
```json
{
 "_raw": "{ feed: QzonePublicFeedExample, comment: QzonePublicCommentExample, reply: QzonePublicReplyExample }"
}
```

源文件: `extends/qzone-public/DeleteQzonePublicReply.ts`

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

## 底层包（9 个）

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
### get_rkey
**获取扩展 RKey**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Array(Type.Object({
  type: Type.String({ description: '类型 (private/group)' }),
  rkey: Type.String({ description: 'RKey' }),
  created_at: Type.Number({ description: '创建时间' }),
  ttl: Type.Number({ description: '有效期' }),
}), { description: 'RKey 列表' })
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
[
 {
  "type": "private",
  "rkey": "rkey_123",
  "created_at": 1734567890,
  "ttl": 3600
 }
]
```

源文件: `packet/GetRkeyEx.ts`

---
### get_rkey_server
**获取 RKey 服务器**
标签: 系统扩展

**payload schema**（源码原文）:
```ts
Type.Object({})
```

**返回 schema**:
```ts
Type.Object({
  private_rkey: Type.Optional(Type.String({ description: '私聊 RKey' })),
  group_rkey: Type.Optional(Type.String({ description: '群聊 RKey' })),
  expired_time: Type.Optional(Type.Number({ description: '过期时间' })),
  name: Type.String({ description: '名称' }),
})
```

**请求示例**:
```json
{}
```

**响应示例**:
```json
{
 "private_rkey": "&rkey=123456789",
 "group_rkey": "&rkey=123456789",
 "expired_time": 1694560000,
 "name": "NapCat 4"
}
```

源文件: `packet/GetRkeyServer.ts`

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
### nc_get_packet_status
**获取Packet状态** — 获取底层Packet服务的运行状态
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

源文件: `packet/GetPacketStatus.ts`

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

## 新接口（2 个）

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

## 群管理（26 个）

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

## 文件（19 个）

### get_private_file_url
**获取私聊文件URL** — 获取指定私聊文件的下载链接
标签: 文件接口

**payload schema**（源码原文）:
```ts
Type.Object({
  file_id: Type.String({ description: '文件ID' }),
})
```

**返回 schema**:
```ts
Type.Object({
  url: Type.Optional(Type.String({ description: '文件下载链接' })),
}, { description: '私聊文件URL信息' })
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "file_id": "file_id_123"
}
```

**响应示例**:
```json
{
 "url": "http://..."
}
```

源文件: `file/GetPrivateFileUrl.ts`

---
### get_record
**获取语音** — 获取指定语音文件的信息，并支持格式转换
标签: 文件接口

**payload schema**（源码原文）:
```ts
Type.Object({
  file: Type.Optional(Type.String({ description: '文件路径、URL或Base64' })),
  file_id: Type.Optional(Type.String({ description: '文件ID' })),
  out_format: Type.String({ description: '输出格式' }),
})
```

**请求示例**:
```json
{
 "file": "record_id_123",
 "out_format": "mp3"
}
```

**响应示例**:
```json
{
 "file": "/path/to/record",
 "url": "http://..."
}
```

源文件: `file/GetRecord.ts`

---
### get_image
**获取图片** — 获取指定图片的信息及路径
标签: 文件接口

**payload schema**（源码原文）:
```ts
Type.Object({
  file: Type.Optional(Type.String({ description: '文件路径、URL或Base64' })),
  file_id: Type.Optional(Type.String({ description: '文件ID' })),
})
```

**请求示例**:
```json
{
 "file": "image_id_123"
}
```

**响应示例**:
```json
{
 "file": "/path/to/image",
 "url": "http://..."
}
```

源文件: `file/GetImage.ts`

---
### get_group_file_url
**获取群文件URL** — 获取指定群文件的下载链接
标签: 文件接口

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  file_id: Type.String({ description: '文件ID' }),
})
```

**返回 schema**:
```ts
Type.Object({
  url: Type.Optional(Type.String({ description: '文件下载链接' })),
}, { description: '群文件URL信息' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "file_id": "file_id_123",
 "busid": 102
}
```

**响应示例**:
```json
{
 "url": "http://..."
}
```

源文件: `file/GetGroupFileUrl.ts`

---
### get_file
**获取文件** — 获取指定文件的详细信息及下载路径
标签: 文件接口

**payload schema**（源码原文）:
```ts
Type.Object({
  file: Type.Optional(Type.String({ description: '文件路径、URL或Base64' })),
  file_id: Type.Optional(Type.String({ description: '文件ID' })),
})
```

**返回 schema**:
```ts
Type.Object({
  file: Type.Optional(Type.String({ description: '本地路径' })),
  url: Type.Optional(Type.String({ description: '下载URL' })),
  file_size: Type.Optional(Type.String({ description: '文件大小' })),
  file_name: Type.Optional(Type.String({ description: '文件名' })),
  base64: Type.Optional(Type.String({ description: 'Base64编码' })),
}, { description: '文件信息' })
```

**请求示例**:
```json
{
 "file": "file_id_123"
}
```

**响应示例**:
```json
{
 "file": "/path/to/file",
 "url": "http://...",
 "file_size": 1024,
 "file_name": "test.jpg"
}
```

源文件: `file/GetFile.ts`

---
### create_flash_task
**创建闪传任务**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  files: Type.Union([
    Type.Array(Type.String()),
    Type.String(),
  ], { description: '文件列表或单个文件路径' }),
  name: Type.Optional(Type.String({ description: '任务名称' })),
  thumb_path: Type.Optional(Type.String({ description: '缩略图路径' })),
  validitySeconds: Type.Optional(Type.Number({ description: '文件集有效期（秒），可选 14 天 1209600 / 90 天 7776000 / 180 天 15552000，默认 1209600' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '任务创建结果' })
```

**请求示例**:
```json
{
 "_raw": "{\n    files: 'C:\\\\test.jpg',\n    name: 'test_task',\n    validitySeconds: DEFAULT_FLASH_VALIDITY_SECONDS,\n  }"
}
```

**响应示例**:
```json
{
 "task_id": "task_123"
}
```

源文件: `file/flash/CreateFlashTask.ts`

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
### download_fileset
**下载文件集**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  fileset_id: Type.String({ description: '文件集 ID' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '下载结果' })
```

**请求示例**:
```json
{
 "fileset_id": "set_123"
}
```

源文件: `file/flash/DownloadFileset.ts`

---
### get_fileset_info
**获取文件集信息**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  fileset_id: Type.String({ description: '文件集 ID' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '文件集信息' })
```

**请求示例**:
```json
{
 "fileset_id": "set_123"
}
```

**响应示例**:
```json
{
 "fileset_id": "set_123",
 "file_list": []
}
```

源文件: `file/flash/GetFilesetInfo.ts`

---
### get_flash_file_list
**获取闪传文件列表**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  fileset_id: Type.String({ description: '文件集 ID' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '文件列表' })
```

**请求示例**:
```json
{
 "fileset_id": "set_123"
}
```

**响应示例**:
```json
[
 {
  "file_name": "test.jpg",
  "size": 1024
 }
]
```

源文件: `file/flash/GetFlashFileList.ts`

---
### get_flash_file_url
**获取闪传文件链接**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  fileset_id: Type.String({ description: '文件集 ID' }),
  file_name: Type.Optional(Type.String({ description: '文件名' })),
  file_index: Type.Optional(Type.Number({ description: '文件索引' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '文件下载链接' })
```

**请求示例**:
```json
{
 "fileset_id": "set_123"
}
```

**响应示例**:
```json
{
 "url": "http://example.com/flash.jpg"
}
```

源文件: `file/flash/GetFlashFileUrl.ts`

---
### get_fileset_id
**获取文件集 ID**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  share_code: Type.String({ description: '分享码或分享链接' }),
})
```

**返回 schema**:
```ts
Type.Object({
    fileset_id: Type.String({ description: '文件集 ID' }),
  })
```

**请求示例**:
```json
{
 "share_code": "123456"
}
```

**响应示例**:
```json
{
 "fileset_id": "set_123"
}
```

源文件: `file/flash/GetFilesetIdByCode.ts`

---
### send_online_file
**发送在线文件**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '用户 QQ' }),
  file_path: Type.String({ description: '本地文件路径' }),
  file_name: Type.Optional(Type.String({ description: '文件名 (可选)' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '发送结果' })
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "file_path": "C:\\path\\to\\file.txt",
 "file_name": "test.txt"
}
```

源文件: `file/online/SendOnlineFile.ts`

---
### send_online_folder
**发送在线文件夹**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '用户 QQ' }),
  folder_path: Type.String({ description: '本地文件夹路径' }),
  folder_name: Type.Optional(Type.String({ description: '文件夹名称 (可选)' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '发送结果' })
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "folder_path": "C:\\path\\to\\folder"
}
```

源文件: `file/online/SendOnlineFolder.ts`

---
### get_online_file_msg
**获取在线文件消息**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '用户 QQ' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '在线文件消息列表' })
```

**请求示例**:
```json
{
 "user_id": "123456789"
}
```

**响应示例**:
```json
[]
```

源文件: `file/online/GetOnlineFileMessages.ts`

---
### receive_online_file
**接收在线文件**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '用户 QQ' }),
  msg_id: Type.String({ description: '消息 ID' }),
  element_id: Type.String({ description: '元素 ID' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '接收结果' })
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "msg_id": "123",
 "save_path": "C:\\save"
}
```

源文件: `file/online/ReceiveOnlineFile.ts`

---
### refuse_online_file
**拒绝在线文件**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '用户 QQ' }),
  msg_id: Type.String({ description: '消息 ID' }),
  element_id: Type.String({ description: '元素 ID' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '拒绝结果' })
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "msg_id": "123"
}
```

源文件: `file/online/RefuseOnlineFile.ts`

---
### cancel_online_file
**取消在线文件**
标签: 文件扩展

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '用户 QQ' }),
  msg_id: Type.String({ description: '消息 ID' }),
})
```

**返回 schema**:
```ts
Type.Any({ description: '取消结果' })
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "msg_id": "123"
}
```

源文件: `file/online/CancelOnlineFile.ts`

---

## 消息收发（12 个）

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

## go-cqhttp 兼容（27 个）

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
### get_online_clients
**获取在线客户端** — 获取当前登录账号的在线客户端列表
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({}, { description: '在线客户端负载' })
```

**返回 schema**:
```ts
Type.Array(Type.Any(), { description: '在线客户端列表' })
```

**请求示例**:
```json
{
 "no_cache": false
}
```

**响应示例**:
```json
[]
```

源文件: `go-cqhttp/GetOnlineClient.ts`

---
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
### upload_group_file
**上传群文件** — 上传资源路径或URL指定的文件到指定群聊的文件系统中
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  file: Type.String({ description: '资源路径或URL' }),
  name: Type.String({ description: '文件名' }),
  folder: Type.Optional(Type.String({ description: '父目录 ID' })),
  folder_id: Type.Optional(Type.String({ description: '父目录 ID (兼容性字段)' })), // 临时扩展
  upload_file: Type.Boolean({ default: true, description: '是否执行上传' }),
})
```

**返回 schema**:
```ts
Type.Object({
  file_id: Type.Union([Type.String(), Type.Null()], { description: '文件 ID' }),
})
```

**请求示例**:
```json
{
 "group_id": "123456",
 "file": "/path/to/file",
 "name": "test.txt"
}
```

**响应示例**:
```json
{
 "file_id": "file_uuid_123"
}
```

源文件: `go-cqhttp/UploadGroupFile.ts`

---
### delete_group_file
**删除群文件** — 在群文件系统中删除指定的文件
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  file_id: Type.String({ description: '文件ID' }),
  bus_id: Type.Optional(Type.Number({ minimum: 1, maximum: 0xFFFFFFFF, multipleOf: 1, description: '文件业务ID，默认使用文件列表中的 busid' })),
  busid: Type.Optional(Type.Number({ minimum: 1, maximum: 0xFFFFFFFF, multipleOf: 1, description: '文件业务ID，兼容 busid 字段' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '删除结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "file_id": "file_uuid_123",
 "bus_id": 104
}
```

**响应示例**:
```json
{}
```

源文件: `go-cqhttp/DeleteGroupFile.ts`

---
### create_group_file_folder
**创建群文件目录** — 在群文件系统中创建新的文件夹
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  // 兼容gocq 与name二选一
  folder_name: Type.Optional(Type.String({ description: '文件夹名称' })),
  // 兼容gocq 与folder_name二选一
  name: Type.Optional(Type.String({ description: '文件夹名称' })),
})
```

**返回 schema**:
```ts
Type.Object({
  result: Type.Any({ description: '操作结果' }),
  groupItem: Type.Any({ description: '群项信息' }),
}, { description: '创建文件夹结果' })
```

**请求示例**:
```json
{
 "group_id": "123456789",
 "folder_name": "新建文件夹"
}
```

**响应示例**:
```json
{
 "result": {},
 "groupItem": {}
}
```

源文件: `go-cqhttp/CreateGroupFileFolder.ts`

---
### delete_group_folder
**删除群文件目录** — 在群文件系统中删除指定的文件夹
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  folder_id: Type.Optional(Type.String({ description: '文件夹ID' })),
  folder: Type.Optional(Type.String({ description: '文件夹ID' })),
})
```

**返回 schema**:
```ts
Type.Any({ description: '删除结果' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "folder_id": "folder_uuid_123"
}
```

**响应示例**:
```json
{}
```

源文件: `go-cqhttp/DeleteGroupFileFolder.ts`

---
### get_group_file_system_info
**获取群文件系统信息** — 获取群聊文件系统的空间及状态信息
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
  file_count: Type.Number({ description: '文件总数' }),
  limit_count: Type.Number({ description: '文件上限' }),
  used_space: Type.Number({ description: '已使用空间' }),
  total_space: Type.Number({ description: '总空间' }),
}, { description: '群文件系统信息' })
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
 "file_count": 10,
 "limit_count": 10000,
 "used_space": 1024,
 "total_space": 10737418240
}
```

源文件: `go-cqhttp/GetGroupFileSystemInfo.ts`

---
### get_group_root_files
**获取群根目录文件列表** — 获取群文件根目录下的所有文件和文件夹
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  file_count: Type.Union([Type.Number(), Type.String()], { default: 50, description: '文件数量' }),
})
```

**返回 schema**:
```ts
Type.Object({
  files: Type.Array(Type.Any(), { description: '文件列表' }),
  folders: Type.Array(Type.Any(), { description: '文件夹列表' }),
}, { description: '群根目录文件列表' })
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
 "files": [],
 "folders": []
}
```

源文件: `go-cqhttp/GetGroupRootFiles.ts`

---
### get_group_files_by_folder
**获取群文件夹文件列表** — 获取指定群文件夹下的文件及子文件夹列表
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  group_id: Type.String({ description: '群号' }),
  folder_id: Type.Optional(Type.String({ description: '文件夹ID' })),
  folder: Type.Optional(Type.String({ description: '文件夹ID' })),
  file_count: Type.Union([Type.Number(), Type.String()], { default: 50, description: '文件数量' }),
})
```

**返回 schema**:
```ts
Type.Object({
  files: Type.Array(Type.Unknown(), { description: '文件列表' }),
  folders: Type.Array(Type.Unknown(), { description: '文件夹列表' }),
}, { description: '群文件夹文件列表' })
```

**请求示例**:
```json
{
 "group_id": "123456",
 "folder_id": "folder_id"
}
```

**响应示例**:
```json
{
 "files": [],
 "folders": []
}
```

源文件: `go-cqhttp/GetGroupFilesByFolder.ts`

---
### upload_private_file
**上传私聊文件** — 上传本地文件到指定私聊会话中
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  user_id: Type.String({ description: '用户 QQ' }),
  file: Type.String({ description: '资源路径或URL' }),
  name: Type.String({ description: '文件名' }),
  upload_file: Type.Boolean({ default: true, description: '是否执行上传' }),
})
```

**返回 schema**:
```ts
Type.Object({
  file_id: Type.Union([Type.String(), Type.Null()], { description: '文件 ID' }),
})
```

**请求示例**:
```json
{
 "user_id": "123456789",
 "file": "/path/to/file",
 "name": "test.txt"
}
```

**响应示例**:
```json
{
 "file_id": "file_uuid_123"
}
```

源文件: `go-cqhttp/UploadPrivateFile.ts`

---
### download_file
**下载文件** — 下载网络文件到本地临时目录
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  url: Type.Optional(Type.String({ description: '下载链接' })),
  base64: Type.Optional(Type.String({ description: 'base64数据' })),
  name: Type.Optional(Type.String({ description: '文件名' })),
  headers: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())], { description: '请求头' })),
})
```

**返回 schema**:
```ts
Type.Object({
  file: Type.String({ description: '文件路径' }),
}, { description: '下载结果' })
```

**请求示例**:
```json
{
 "url": "https://example.com/file.png",
 "thread_count": 1,
 "headers": "User-Agent: NapCat"
}
```

**响应示例**:
```json
{
 "file": "/path/to/downloaded/file"
}
```

源文件: `go-cqhttp/DownloadFile.ts`

---
### check_url_safely
**检查URL安全性** — 检查指定URL的安全等级
标签: Go-CQHTTP

**payload schema**（源码原文）:
```ts
Type.Object({
  url: Type.String({ description: '要检查的 URL' }),
})
```

**返回 schema**:
```ts
Type.Object({
  level: Type.Number({ description: '安全等级 (1: 安全, 2: 未知, 3: 危险)' }),
})
```

**请求示例**:
```json
{
 "url": "https://example.com"
}
```

**响应示例**:
```json
{
 "level": 1
}
```

源文件: `go-cqhttp/GoCQHTTPCheckUrlSafely.ts`

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

## 用户与好友（6 个）

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

## 系统与账号（10 个）

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
### can_send_image
**是否可以发送图片** — 检查是否可以发送图片
标签: 系统接口

**payload schema**（源码原文）:
```ts
Type.Object({})
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

源文件: `system/CanSendImage.ts`

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

## 频道（2 个）

### get_guild_list
**获取频道列表** — 获取当前帐号已加入的频道列表
标签: 频道接口

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

**响应示例**:
```json
[
 {
  "guild_id": "123456",
  "guild_name": "测试频道"
 }
]
```

源文件: `guild/GetGuildList.ts`

---
### get_guild_service_profile
**获取频道个人信息** — 获取当前帐号在频道中的个人资料
标签: 频道接口

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
 "guild_id": "123456"
}
```

**响应示例**:
```json
{
 "guild_id": "123456",
 "guild_name": "测试频道",
 "guild_display_id": "123"
}
```

源文件: `guild/GetGuildProfile.ts`

---

## 未找到源文件的动作

- GoCQHTTP_GetWordSlices → `.get_word_slices`
- Unknown → `unknown`
