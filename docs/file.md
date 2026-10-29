# NapCat 接口：文件

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
| create_flash_task | 建闪传任务 |
| create_group_file_folder | 建群文件夹 |
| delete_group_file | 删群文件 |
| delete_group_folder | 删群文件夹 |
| download_file | 下载文件 |
| download_file_image_stream | 流式下载图片 |
| download_file_record_stream | 流式下载语音 |
| download_file_stream | 流式下载 |
| download_fileset | 下载文件集 |
| get_file | 取文件 |
| get_fileset_id | 取文件集ID |
| get_fileset_info | 取文件集信息 |
| get_flash_file_list | 闪传文件列表 |
| get_flash_file_url | 闪传文件链接 |
| get_group_file_system_info | 群文件系统信息 |
| get_group_file_url | 群文件下载链接 |
| get_group_files_by_folder | 按文件夹取群文件 |
| get_group_root_files | 群根目录文件 |
| get_image | 取图片 |
| get_online_file_msg | 在线文件消息 |
| get_private_file_url | 私聊文件下载链接 |
| get_record | 取语音 |
| move_group_file | 移动群文件 |
| send_online_file | 在线发送文件 |
| send_online_folder | 在线发送文件夹 |
| upload_file_stream | 流式上传 |
| upload_group_file | 上传群文件 |
| upload_private_file | 上传私聊文件 |
| .ocr_image |  |
| can_send_image |  |
| cancel_online_file |  |
| clean_stream_temp_file |  |
| ocr_image |  |
| receive_online_file |  |
| refuse_online_file |  |
| rename_group_file |  |
| test_download_stream |  |
| trans_group_file |  |

## 接口详情

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

> 本文件未涵盖的接口/规则以 napcat-api-source.md（全量）与 INDEX.md（检索表）为准，勿凭猜测构造参数。
