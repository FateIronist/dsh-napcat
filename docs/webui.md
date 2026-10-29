# NapCat WebUI 管理接口（6099，`/webui/api`）

> 与 OneBot 动作接口（3000）完全独立的一套管理面。本文件接口未做源码级参数背书，以容器实测为准；token 在容器日志或 `/opt/napcat/config/webui.json`。
> 对外入口走 nginx 子路径反代（`/napcat` → 6099），OneBot 3000 未对外暴露（仅绑 127.0.0.1）。

## 认证/登录

| /auth/login | WebUI登录 |
| /passkey/generate-registration-options 等5个 | Passkey注册/验证全套 |
| /CaptchaLogin | 验证码登录 |
| /PasswordLogin | 密码登录 |
| /NewDeviceLogin | 新设备登录 |
| /QQLogin + /GetQQLoginQrcode + /CheckLoginStatus | QQ扫码登录全流程 |
| /GetQuickLoginList(New) / SetQuickLogin(QQ) | 快捷登录管理 |
## 配置

| /GetConfig / /SetConfig / /UpdateConfig / /Config/Change | 配置读写/变更 |
| /ExportConfig / /ImportConfig | 配置导入导出 |
| /NapCatConfig / /WebUIConfig | NapCat/WebUI配置 |
| /Config/SSE | 配置变更实时推送 |
| /GetUinConfig / /SetUinConfig | 账号配置 |
## 运维

| /GetLog / /GetLogList / /GetLogRealTime | 日志查询/列表/实时流 |
| /terminal/create / /terminal/list | Web终端（可执行shell） |
| /GetQQLoginInfo | QQ登录信息 |

## 运维注意

- `/terminal/create` 等 Web 终端接口可执行 shell：对外暴露面必须收窄，agent 调用属高危操作需用户确认
- 部署详情见记忆 `beijing-ecs-napcat-deploy`（北京 ECS，ecs-beijing）
