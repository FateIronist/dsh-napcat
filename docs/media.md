# NapCat 接口：媒体·频道·空间·其他

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

## 本组接口一览（38 个）

| 接口 | 功能 |
|---|---|
| add_custom_face | 添加自定义表情 |
| check_url_safely | URL安全检测 |
| create_collection | 创建收藏 |
| del_group_album_media | 删相册媒体 |
| delete_custom_face | 删自定义表情 |
| delete_qzone_msg | 删QQ空间帖 |
| get_collection_list | 收藏列表 |
| get_group_album_media_list | 相册媒体列表 |
| get_guild_list | 频道列表 |
| get_guild_service_profile | 频道服务资料 |
| get_online_clients | 在线客户端 |
| get_qun_album_list | 群相册列表 |
| get_rkey | 取图片rkey |
| get_rkey_server | 取rkey服务器信息 |
| get_robot_uin_range | 机器人号段 |
| send_qzone_msg | QQ空间发帖 |
| set_custom_face_desc | 改自定义表情描述 |
| set_group_album_media_like | 相册点赞 |
| upload_image_to_qun_album | 传图到群相册 |
| upload_images_to_qun_album | 批量传图到群相册 |
| upload_video_to_qun_album | 传视频到群相册 |
| comment_qzone_public_feed |  |
| delete_qzone_public_comment |  |
| delete_qzone_public_reply |  |
| do_group_album_comment |  |
| fetch_custom_face |  |
| fetch_custom_face_detail |  |
| get_qzone_public_capabilities |  |
| get_qzone_public_comments |  |
| get_qzone_public_feed_detail |  |
| get_qzone_public_feeds |  |
| get_qzone_public_replies |  |
| nc_get_packet_status |  |
| nc_get_rkey |  |
| reply_qzone_public_feed |  |
| set_qzone_public_follow |  |
| set_qzone_public_upvote |  |
| translate_en2zh |  |

## 接口详情

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

> 本文件未涵盖的接口/规则以 napcat-api-source.md（全量）与 INDEX.md（检索表）为准，勿凭猜测构造参数。
