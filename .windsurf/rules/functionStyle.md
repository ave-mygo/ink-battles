---
trigger: manual
---

1.项目应该使用RSC的方式从服务器端传递数据
2.部分无法实现的用本地api实现（如流式请求）
3.将纯服务器端函数放到`src/lib/utils-server.ts`当中
4.数据库使用必须通过`src/lib/db.ts`统一调度