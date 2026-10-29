# NapCat QQ 接口全量清单

> 来源：北京 ECS（ecs-beijing）napcat 容器内 `/app/napcat/napcat.mjs` 实际提取（2026-10-29），约 160 个 OneBot 动作 + WebUI 管理接口。
> 部署详情见记忆 `beijing-ecs-napcat-deploy`：对外入口 `https://io.fateironist.top/napcat`，OneBot 3000 端口预留（仅绑 127.0.0.1）。

## 一、OneBot 11 动作接口（3000 端口，HTTP/WS）

### 1. 账号/登录

| 接口 | 功能 |
|---|---|
| get_login_info | 登录号信息 |
| get_status | 运行状态 |
| get_version_info | NapCat 版本信息 |
| set_qq_avatar | 改头像 |
| set_qq_profile | 改资料 |
| set_self_longnick | 改签名 |
| set_online_status | 设在线状态 |
| set_diy_online_status | 设自定义在线状态 |
| get_cookies | 取Cookies |
| get_csrf_token | 取CSRF Token |
| get_credentials | 取网页凭据 |
| get_clientkey | 取ClientKey |
| set_restart | 重启NapCat |
| set_input_status | 好友输入状态 |

### 2. 消息收发

| 接口 | 功能 |
|---|---|
| send_private_msg | 发私聊消息 |
| send_group_msg | 发群聊消息 |
| send_msg | 发消息（按类型路由） |
| get_msg | 取消息 |
| get_forward_msg | 取合并转发内容 |
| get_friend_msg_history | 取好友聊天记录 |
| get_group_msg_history | 取群聊天记录 |
| get_recent_contact | 最近会话 |
| delete_msg | 撤回消息 |
| mark_msg_as_read | 标记消息已读 |
| mark_group_msg_as_read | 群消息标已读 |
| mark_private_msg_as_read | 私聊标已读 |
| send_forward_msg | 发合并转发 |
| send_group_forward_msg | 发群合并转发 |
| send_private_forward_msg | 发私聊合并转发 |
| upload_forward_msg | 上传合并转发 |
| forward_friend_single_msg | 好友单条转发 |
| forward_group_single_msg | 群单条转发 |
| send_flash_msg | 发闪照 |
| send_poke / poke | 戳一戳 |
| send_like | 点赞 |
| set_msg_emoji_like | 消息表情回应 |
| get_emoji_likes | 消息表情回应列表 |
| get_profile_like | 资料卡收赞查询 |
| send_ark_share | 发Ark分享卡片 |
| send_group_ark_share | 发群Ark分享卡片 |
| get_mini_app_ark | 取小程序Ark卡片 |
| get_share_link | 取链接分享卡片 |
| get_group_share_link | 取群分享链接 |
| markdown | 发Markdown消息 |
| click_inline_keyboard_button | 点击消息内联键盘按钮 |
| send_packet | 底层协议包直发 |

### 3. 好友

| 接口 | 功能 |
|---|---|
| get_friend_list | 好友列表 |
| get_friends_with_category | 分组好友列表 |
| get_unidirectional_friend_list | 单向好友列表 |
| get_stranger_info | 陌生人信息 |
| set_friend_add_request | 处理加好友请求 |
| get_doubt_friends_add_request | 可疑加好友请求 |
| set_doubt_friends_add_request | 处理可疑请求 |
| delete_friend | 删好友 |
| set_friend_remark | 改好友备注 |

### 4. 群管理

| 接口 | 功能 |
|---|---|
| get_group_list | 群列表 |
| get_group_info | 群信息 |
| get_group_info_ex | 群信息（扩展） |
| get_group_detail_info | 群详细信息 |
| get_group_member_list | 群员列表 |
| get_group_member_info | 群员信息 |
| set_group_name | 改群名 |
| set_group_card | 改群名片 |
| set_group_admin | 设/撤管理员 |
| set_group_special_title | 设专属头衔 |
| set_group_ban | 单人禁言 |
| set_group_whole_ban | 全员禁言 |
| set_group_kick | 踢人 |
| set_group_kick_members | 批量踢人 |
| set_group_leave | 退群 |
| set_group_portrait | 改群头像 |
| set_group_remark | 改群备注 |
| set_group_add_request | 加群审批 |
| set_group_add_option | 加群方式设置 |
| set_group_member_invite_policy | 邀入群策略 |
| set_group_search | 群搜索设置 |
| set_group_robot_add_option | 群机器人设置 |
| set_group_new_member_history_visibility | 新人可见历史设置 |
| set_group_todo | 群待办 |
| set_group_sign | 群打卡（设置） |
| send_group_sign | 群打卡（发送） |
| get_group_signed_list | 打卡列表 |
| set_essence_msg | 设精华消息 |
| delete_essence_msg | 删精华消息 |
| get_essence_msg_list | 精华消息列表 |
| get_group_at_all_remain | 剩余@全员次数 |
| get_group_shut_list | 禁言列表 |
| get_group_honor_info | 群荣誉信息 |
| get_group_system_msg | 入群系统通知 |
| get_group_ignored_notifies | 已忽略通知 |
| get_group_ignore_add_request | 忽略加群请求 |
| send_group_ai_record | 发群AI语音 |
| get_ai_characters | AI语音角色列表 |
| get_ai_record | 取AI语音 |

### 5. 文件

| 接口 | 功能 |
|---|---|
| upload_group_file | 上传群文件 |
| upload_private_file | 上传私聊文件 |
| send_online_file | 在线发送文件 |
| send_online_folder | 在线发送文件夹 |
| get_group_file_system_info | 群文件系统信息 |
| get_group_root_files | 群根目录文件 |
| get_group_files_by_folder | 按文件夹取群文件 |
| get_group_file_url | 群文件下载链接 |
| get_private_file_url | 私聊文件下载链接 |
| create_group_file_folder | 建群文件夹 |
| delete_group_file | 删群文件 |
| delete_group_folder | 删群文件夹 |
| move_group_file | 移动群文件 |
| get_file | 取文件 |
| get_image | 取图片 |
| get_record | 取语音 |
| download_file | 下载文件 |
| upload_file_stream | 流式上传 |
| download_file_stream | 流式下载 |
| download_file_image_stream | 流式下载图片 |
| download_file_record_stream | 流式下载语音 |
| create_flash_task | 建闪传任务 |
| get_flash_file_list | 闪传文件列表 |
| get_flash_file_url | 闪传文件链接 |
| get_online_file_msg | 在线文件消息 |
| get_fileset_id | 取文件集ID |
| get_fileset_info | 取文件集信息 |
| download_fileset | 下载文件集 |

### 6. 媒体/其他

| 接口 | 功能 |
|---|---|
| upload_image_to_qun_album | 传图到群相册 |
| upload_images_to_qun_album | 批量传图到群相册 |
| upload_video_to_qun_album | 传视频到群相册 |
| get_qun_album_list | 群相册列表 |
| get_group_album_media_list | 相册媒体列表 |
| del_group_album_media | 删相册媒体 |
| set_group_album_media_like | 相册点赞 |
| get_collection_list | 收藏列表 |
| create_collection | 创建收藏 |
| send_qzone_msg | QQ空间发帖 |
| delete_qzone_msg | 删QQ空间帖 |
| add_custom_face | 添加自定义表情 |
| delete_custom_face | 删自定义表情 |
| set_custom_face_desc | 改自定义表情描述 |
| get_rkey | 取图片rkey |
| get_rkey_server | 取rkey服务器信息 |
| check_url_safely | URL安全检测 |
| get_robot_uin_range | 机器人号段 |
| get_online_clients | 在线客户端 |
| get_guild_list | 频道列表 |
| get_guild_service_profile | 频道服务资料 |

## 二、WebUI 管理接口（6099，`/webui/api`）

### 认证/登录

| 接口 | 功能 |
|---|---|
| /auth/login | WebUI登录 |
| /passkey/generate-registration-options 等5个 | Passkey注册/验证全套 |
| /CaptchaLogin | 验证码登录 |
| /PasswordLogin | 密码登录 |
| /NewDeviceLogin | 新设备登录 |
| /QQLogin + /GetQQLoginQrcode + /CheckLoginStatus | QQ扫码登录全流程 |
| /GetQuickLoginList(New) / SetQuickLogin(QQ) | 快捷登录管理 |

### 配置

| 接口 | 功能 |
|---|---|
| /GetConfig / /SetConfig / /UpdateConfig / /Config/Change | 配置读写/变更 |
| /ExportConfig / /ImportConfig | 配置导入导出 |
| /NapCatConfig / /WebUIConfig | NapCat/WebUI配置 |
| /Config/SSE | 配置变更实时推送 |
| /GetUinConfig / /SetUinConfig | 账号配置 |

### 运维

| 接口 | 功能 |
|---|---|
| /GetLog / /GetLogList / /GetLogRealTime | 日志查询/列表/实时流 |
| /terminal/create / /terminal/list | Web终端（可执行shell） |
| /GetQQLoginInfo | QQ登录信息 |

## 三、配套事件上报（WS 被动推送，非请求接口）

- 消息事件：私聊/群聊消息
- 通知事件：戳一戳、禁言、撤回、精华、群打卡、成员变动等
- 请求事件：加好友、加群请求
- 元事件：心跳、生命周期

## 使用提示

- 3000 端口当初部署时预留的就是这套 OB11 接口：接 NoneBot/astrbot 等 OneBot 客户端，或直接 HTTP POST 动作名调用
- 对外入口走 nginx 子路径反代（`/napcat` → 6099 WebUI），OneBot 3000 未对外暴露，接入需 ssh 隧道或自行加反代
- WebUI token 在容器日志或 `/opt/napcat/config/webui.json`
