# NapCat 接口文档索引

> 来源：北京 ECS napcat 容器（napcat.mjs commit `ba0a53d`）+ 源码全量背书版重构（2026-10-29）。OneBot 动作 3000 端口（HTTP/WS），WebUI 管理 6099 端口单独见 webui.md。

## 怎么用（给 agent）

- 目标接口在哪个组已知 → 直接读对应组文件，一次读全齐（含通用约定/信封/详情）
- 不确定接口名/在哪个组 → 本文件下方检索表按接口名或别名定位，再读所在组
- 构造 message 参数前必读 msg.md 的「消息段格式」；组文件未列的接口以 napcat-api-source.md 全量版为准

## 按场景选文件

| 要做什么 | 读哪个 |
|---|---|
| 发消息/撤回/戳一戳/表情回应/合并转发 | msg.md（含消息段格式） |
| 踢人/禁言/名片/头衔/群设置/精华/打卡/群公告 | group.md |
| 好友列表/加好友请求/备注/陌生人 | friend.md |
| 登录信息/在线状态/凭据/重启/版本 | account.md |
| 群文件/私聊文件/图片语音取回/闪传/流式 | file.md |
| 群相册/QQ空间/收藏/自定义表情/频道/rkey | media.md |
| WebUI 登录/配置/日志/Web终端（管理面） | webui.md |

## 全量检索表

| 接口 | 组文件 | 功能 |
|---|---|---|
| get_clientkey | account.md | 取ClientKey |
| get_cookies | account.md | 取Cookies |
| get_credentials | account.md | 取网页凭据 |
| get_csrf_token | account.md | 取CSRF Token |
| get_login_info | account.md | 登录号信息 |
| get_status | account.md | 运行状态 |
| get_version_info | account.md | NapCat 版本信息 |
| set_diy_online_status | account.md | 设自定义在线状态 |
| set_input_status | account.md | 好友输入状态 |
| set_online_status | account.md | 设在线状态 |
| set_qq_avatar | account.md | 改头像 |
| set_qq_profile | account.md | 改资料 |
| set_restart | account.md | 重启NapCat |
| set_self_longnick | account.md | 改签名 |
| 0.1 调用方式 | account.md |  |
| 0.2 响应信封（所有接口统一） | account.md |  |
| 0.3 agent 自纠错技巧 | account.md |  |
| _get_model_show | account.md |  |
| _set_model_show | account.md |  |
| bot_exit | account.md |  |
| can_send_record | account.md |  |
| clean_cache | account.md |  |
| nc_get_user_status | account.md |  |
| click_inline_keyboard_button | msg.md | 点击消息内联键盘按钮 |
| delete_msg | msg.md | 撤回消息 |
| forward_friend_single_msg | msg.md | 好友单条转发 |
| forward_group_single_msg | msg.md | 群单条转发 |
| get_emoji_likes | msg.md | 消息表情回应列表 |
| get_forward_msg | msg.md | 取合并转发内容 |
| get_friend_msg_history | msg.md | 取好友聊天记录 |
| get_group_msg_history | msg.md | 取群聊天记录 |
| get_group_share_link | msg.md | 取群分享链接 |
| get_mini_app_ark | msg.md | 取小程序Ark卡片 |
| get_msg | msg.md | 取消息 |
| get_profile_like | msg.md | 资料卡收赞查询 |
| get_recent_contact | msg.md | 最近会话 |
| get_share_link | msg.md | 取链接分享卡片 |
| mark_group_msg_as_read | msg.md | 群消息标已读 |
| mark_msg_as_read | msg.md | 标记消息已读 |
| mark_private_msg_as_read | msg.md | 私聊标已读 |
| markdown | msg.md | 发Markdown消息 |
| poke | msg.md | 戳一戳 |
| send_ark_share | msg.md | 发Ark分享卡片 |
| send_flash_msg | msg.md | 发闪照 |
| send_forward_msg | msg.md | 发合并转发 |
| send_group_ark_share | msg.md | 发群Ark分享卡片 |
| send_group_forward_msg | msg.md | 发群合并转发 |
| send_group_msg | msg.md | 发群聊消息 |
| send_like | msg.md | 点赞 |
| send_msg | msg.md | 发消息（按类型路由） |
| send_packet | msg.md | 底层协议包直发 |
| send_poke | msg.md | 戳一戳 |
| send_private_forward_msg | msg.md | 发私聊合并转发 |
| send_private_msg | msg.md | 发私聊消息 |
| set_msg_emoji_like | msg.md | 消息表情回应 |
| upload_forward_msg | msg.md | 上传合并转发 |
| .handle_quick_operation | msg.md |  |
| ArkShareGroup | msg.md |  |
| ArkSharePeer | msg.md |  |
| _mark_all_as_read | msg.md |  |
| fetch_emoji_like | msg.md |  |
| fetch_ptt_text | msg.md |  |
| forward_qzone_public_feed | msg.md |  |
| friend_poke | msg.md |  |
| group_poke | msg.md |  |
| set_qzone_public_comment_like | msg.md |  |
| set_qzone_public_like | msg.md |  |
| delete_friend | friend.md | 删好友 |
| get_doubt_friends_add_request | friend.md | 可疑加好友请求 |
| get_friend_list | friend.md | 好友列表 |
| get_friends_with_category | friend.md | 分组好友列表 |
| get_stranger_info | friend.md | 陌生人信息 |
| get_unidirectional_friend_list | friend.md | 单向好友列表 |
| set_doubt_friends_add_request | friend.md | 处理可疑请求 |
| set_friend_add_request | friend.md | 处理加好友请求 |
| set_friend_remark | friend.md | 改好友备注 |
| delete_essence_msg | group.md | 删精华消息 |
| get_ai_characters | group.md | AI语音角色列表 |
| get_ai_record | group.md | 取AI语音 |
| get_essence_msg_list | group.md | 精华消息列表 |
| get_group_at_all_remain | group.md | 剩余@全员次数 |
| get_group_detail_info | group.md | 群详细信息 |
| get_group_honor_info | group.md | 群荣誉信息 |
| get_group_ignore_add_request | group.md | 忽略加群请求 |
| get_group_ignored_notifies | group.md | 已忽略通知 |
| get_group_info | group.md | 群信息 |
| get_group_info_ex | group.md | 群信息（扩展） |
| get_group_list | group.md | 群列表 |
| get_group_member_info | group.md | 群员信息 |
| get_group_member_list | group.md | 群员列表 |
| get_group_shut_list | group.md | 禁言列表 |
| get_group_signed_list | group.md | 打卡列表 |
| get_group_system_msg | group.md | 入群系统通知 |
| send_group_ai_record | group.md | 发群AI语音 |
| send_group_sign | group.md | 群打卡（发送） |
| set_essence_msg | group.md | 设精华消息 |
| set_group_add_option | group.md | 加群方式设置 |
| set_group_add_request | group.md | 加群审批 |
| set_group_admin | group.md | 设/撤管理员 |
| set_group_ban | group.md | 单人禁言 |
| set_group_card | group.md | 改群名片 |
| set_group_kick | group.md | 踢人 |
| set_group_kick_members | group.md | 批量踢人 |
| set_group_leave | group.md | 退群 |
| set_group_member_invite_policy | group.md | 邀入群策略 |
| set_group_name | group.md | 改群名 |
| set_group_new_member_history_visibility | group.md | 新人可见历史设置 |
| set_group_portrait | group.md | 改群头像 |
| set_group_remark | group.md | 改群备注 |
| set_group_robot_add_option | group.md | 群机器人设置 |
| set_group_search | group.md | 群搜索设置 |
| set_group_sign | group.md | 群打卡（设置） |
| set_group_special_title | group.md | 设专属头衔 |
| set_group_todo | group.md | 群待办 |
| set_group_whole_ban | group.md | 全员禁言 |
| _del_group_notice | group.md |  |
| _get_group_notice | group.md |  |
| _send_group_notice | group.md |  |
| cancel_group_album_media_like | group.md |  |
| cancel_group_todo | group.md |  |
| complete_group_todo | group.md |  |
| set_group_member_permissions | group.md |  |
| create_flash_task | file.md | 建闪传任务 |
| create_group_file_folder | file.md | 建群文件夹 |
| delete_group_file | file.md | 删群文件 |
| delete_group_folder | file.md | 删群文件夹 |
| download_file | file.md | 下载文件 |
| download_file_image_stream | file.md | 流式下载图片 |
| download_file_record_stream | file.md | 流式下载语音 |
| download_file_stream | file.md | 流式下载 |
| download_fileset | file.md | 下载文件集 |
| get_file | file.md | 取文件 |
| get_fileset_id | file.md | 取文件集ID |
| get_fileset_info | file.md | 取文件集信息 |
| get_flash_file_list | file.md | 闪传文件列表 |
| get_flash_file_url | file.md | 闪传文件链接 |
| get_group_file_system_info | file.md | 群文件系统信息 |
| get_group_file_url | file.md | 群文件下载链接 |
| get_group_files_by_folder | file.md | 按文件夹取群文件 |
| get_group_root_files | file.md | 群根目录文件 |
| get_image | file.md | 取图片 |
| get_online_file_msg | file.md | 在线文件消息 |
| get_private_file_url | file.md | 私聊文件下载链接 |
| get_record | file.md | 取语音 |
| move_group_file | file.md | 移动群文件 |
| send_online_file | file.md | 在线发送文件 |
| send_online_folder | file.md | 在线发送文件夹 |
| upload_file_stream | file.md | 流式上传 |
| upload_group_file | file.md | 上传群文件 |
| upload_private_file | file.md | 上传私聊文件 |
| .ocr_image | file.md |  |
| can_send_image | file.md |  |
| cancel_online_file | file.md |  |
| clean_stream_temp_file | file.md |  |
| ocr_image | file.md |  |
| receive_online_file | file.md |  |
| refuse_online_file | file.md |  |
| rename_group_file | file.md |  |
| test_download_stream | file.md |  |
| trans_group_file | file.md |  |
| add_custom_face | media.md | 添加自定义表情 |
| check_url_safely | media.md | URL安全检测 |
| create_collection | media.md | 创建收藏 |
| del_group_album_media | media.md | 删相册媒体 |
| delete_custom_face | media.md | 删自定义表情 |
| delete_qzone_msg | media.md | 删QQ空间帖 |
| get_collection_list | media.md | 收藏列表 |
| get_group_album_media_list | media.md | 相册媒体列表 |
| get_guild_list | media.md | 频道列表 |
| get_guild_service_profile | media.md | 频道服务资料 |
| get_online_clients | media.md | 在线客户端 |
| get_qun_album_list | media.md | 群相册列表 |
| get_rkey | media.md | 取图片rkey |
| get_rkey_server | media.md | 取rkey服务器信息 |
| get_robot_uin_range | media.md | 机器人号段 |
| send_qzone_msg | media.md | QQ空间发帖 |
| set_custom_face_desc | media.md | 改自定义表情描述 |
| set_group_album_media_like | media.md | 相册点赞 |
| upload_image_to_qun_album | media.md | 传图到群相册 |
| upload_images_to_qun_album | media.md | 批量传图到群相册 |
| upload_video_to_qun_album | media.md | 传视频到群相册 |
| comment_qzone_public_feed | media.md |  |
| delete_qzone_public_comment | media.md |  |
| delete_qzone_public_reply | media.md |  |
| do_group_album_comment | media.md |  |
| fetch_custom_face | media.md |  |
| fetch_custom_face_detail | media.md |  |
| get_qzone_public_capabilities | media.md |  |
| get_qzone_public_comments | media.md |  |
| get_qzone_public_feed_detail | media.md |  |
| get_qzone_public_feeds | media.md |  |
| get_qzone_public_replies | media.md |  |
| nc_get_packet_status | media.md |  |
| nc_get_rkey | media.md |  |
| reply_qzone_public_feed | media.md |  |
| set_qzone_public_follow | media.md |  |
| set_qzone_public_upvote | media.md |  |
| translate_en2zh | media.md |  |

## 事件上报（WS 被动推送，非请求接口）

- 消息事件：私聊/群聊消息；通知事件：戳一戳、禁言、撤回、精华、群打卡、成员变动等
- 请求事件：加好友、加群请求；元事件：心跳、生命周期
