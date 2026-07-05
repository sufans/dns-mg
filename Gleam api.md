基础地址

https://sld.0n.pub/api/v1/open



身份验证

每个请求都需要在 X-API-Key 请求头中携带你的 API 密钥（也支持 "Authorization: Bearer hl6\_..." 方式）。可在应用内的“API 密钥”页面创建密钥——完整密钥仅在创建后展示一次，请立即妥善保存。



X-API-Key: hl6\_xxxxxxxxxxxx



幂等性

写操作——释放子域名，以及创建、更新、删除 DNS 记录——需要携带 X-Idempotency-Key 请求头（任意唯一字符串，例如 UUID）。使用相同的键重试请求不会重复执行该操作。



X-Idempotency-Key: 3f29c1d0-6b8a-4e51-9c2a-1d7e5f6a0b3c



GET

/open/user/info

获取该 API 密钥所属用户的基本信息、积分余额与子域名数量。

请求示例



curl -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; https://sld.0n.pub/api/v1/open/user/info



响应示例



{

&#x20; "code": 0,

&#x20; "message": "ok",

&#x20; "data": {

&#x20;   "id": 1,

&#x20;   "email": "you@example.com",

&#x20;   "name": "Alice",

&#x20;   "role": "user",

&#x20;   "credits": 100,

&#x20;   "subdomain\_count": 3

&#x20; }

}



GET

/open/domains

获取你所在用户组可认领子域名的根域名列表。

请求示例



curl -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; https://sld.0n.pub/api/v1/open/domains



响应示例



{

&#x20; "code": 0,

&#x20; "message": "ok",

&#x20; "data": \[

&#x20;   {

&#x20;     "id": 1,

&#x20;     "name": "example.com",

&#x20;     "provider": "cloudflare",

&#x20;     "provider\_zone\_id": "023e105f4ecef8ad9ca31a8372d0c353",

&#x20;     "provider\_account\_id": 1,

&#x20;     "credit\_cost": 10,

&#x20;     "is\_active": true,

&#x20;     "description": "",

&#x20;     "migration\_state": "idle",

&#x20;     "migration\_read\_only": false,

&#x20;     "last\_migration\_task\_id": null,

&#x20;     "created\_at": "2026-01-01T00:00:00Z",

&#x20;     "updated\_at": "2026-01-01T00:00:00Z"

&#x20;   }

&#x20; ]

}



GET

/open/subdomains

获取该密钥所属用户名下的所有子域名。

请求示例



curl -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; https://sld.0n.pub/api/v1/open/subdomains



响应示例



{

&#x20; "code": 0,

&#x20; "message": "ok",

&#x20; "data": \[

&#x20;   {

&#x20;     "id": 42,

&#x20;     "domain\_id": 1,

&#x20;     "user\_id": 7,

&#x20;     "name": "myhost",

&#x20;     "fqdn": "myhost.example.com",

&#x20;     "claim\_cost": 10,

&#x20;     "status": "active",

&#x20;     "suspended\_reason": "",

&#x20;     "suspended\_at": null,

&#x20;     "dns\_records": \[],

&#x20;     "created\_at": "2026-01-01T00:00:00Z",

&#x20;     "updated\_at": "2026-01-01T00:00:00Z"

&#x20;   }

&#x20; ]

}



POST

/open/subdomains

在某个可用根域名下认领一个新的子域名。会消耗积分（数量见该根域名的 credit\_cost 字段）。

参数



domain\_id（请求体，必填）—— 根域名 id，来自 GET /open/domains

name（请求体，必填）—— 想要认领的子域名前缀，例如 "myhost"

请求示例



curl -X POST https://sld.0n.pub/api/v1/open/subdomains \\

&#x20; -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; -H "X-Idempotency-Key: $(uuidgen)" \\

&#x20; -H "Content-Type: application/json" \\

&#x20; -d '{"domain\_id": 1, "name": "myhost"}'



响应示例



// 201 Created

{

&#x20; "code": 0,

&#x20; "message": "created",

&#x20; "data": {

&#x20;   "id": 42,

&#x20;   "domain\_id": 1,

&#x20;   "user\_id": 7,

&#x20;   "name": "myhost",

&#x20;   "fqdn": "myhost.example.com",

&#x20;   "claim\_cost": 10,

&#x20;   "status": "active",

&#x20;   "created\_at": "2026-01-01T00:00:00Z",

&#x20;   "updated\_at": "2026-01-01T00:00:00Z"

&#x20; }

}



GET

/open/subdomains/:id

获取你名下某个子域名的详情（包含其 DNS 记录）。

参数



:id（路径参数）—— 子域名 id

请求示例



curl -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; https://sld.0n.pub/api/v1/open/subdomains/42



响应示例



{

&#x20; "code": 0,

&#x20; "message": "ok",

&#x20; "data": {

&#x20;   "id": 42,

&#x20;   "domain\_id": 1,

&#x20;   "user\_id": 7,

&#x20;   "name": "myhost",

&#x20;   "fqdn": "myhost.example.com",

&#x20;   "claim\_cost": 10,

&#x20;   "status": "active",

&#x20;   "domain": { "id": 1, "name": "example.com", "provider": "cloudflare", "..." : "..." },

&#x20;   "dns\_records": \[

&#x20;     { "id": 5, "type": "A", "content": "203.0.113.10", "proxied": true }

&#x20;   ],

&#x20;   "created\_at": "2026-01-01T00:00:00Z",

&#x20;   "updated\_at": "2026-01-01T00:00:00Z"

&#x20; }

}



DELETE

/open/subdomains/:id

需要 X-Idempotency-Key

释放（删除）你名下的某个子域名，同时删除其所有 DNS 记录。

参数



:id（路径参数）—— 子域名 id

请求示例



curl -X DELETE https://sld.0n.pub/api/v1/open/subdomains/42 \\

&#x20; -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; -H "X-Idempotency-Key: $(uuidgen)"



响应示例



{

&#x20; "code": 0,

&#x20; "message": "ok",

&#x20; "data": { "message": "subdomain released", "deleted\_dns\_count": 1 }

}



GET

/open/dns-records/:id

获取你名下某个子域名的 DNS 记录列表。

参数



:id（路径参数）—— 子域名 id（不是根域名 id）

请求示例



curl -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; https://sld.0n.pub/api/v1/open/dns-records/42



响应示例



{

&#x20; "code": 0,

&#x20; "message": "ok",

&#x20; "data": \[

&#x20;   {

&#x20;     "id": 5,

&#x20;     "subdomain\_id": 42,

&#x20;     "type": "A",

&#x20;     "name": "myhost.example.com",

&#x20;     "content": "203.0.113.10",

&#x20;     "ttl": 1,

&#x20;     "proxied": true,

&#x20;     "provider\_record\_id": "8f2e6d1c9b7a4e3f2d1c0b9a8f7e6d5c",

&#x20;     "status": "active",

&#x20;     "created\_at": "2026-01-01T00:00:00Z",

&#x20;     "updated\_at": "2026-01-01T00:00:00Z"

&#x20;   }

&#x20; ]

}



POST

/open/dns-records/:id

需要 X-Idempotency-Key

在你名下的某个子域名上创建 DNS 记录（A / AAAA / CNAME / TXT）。TTL 会根据该根域名所使用的 DNS 服务商自动选择，无需自行传入。

参数



:id（路径参数）—— 子域名 id

type（请求体，必填）—— A、AAAA、CNAME 或 TXT

content（请求体，必填）—— 记录值，例如 IP 地址

proxied（请求体，可选）—— 是否启用服务商代理（如 Cloudflare 小黄云），默认 false

请求示例



curl -X POST https://sld.0n.pub/api/v1/open/dns-records/42 \\

&#x20; -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; -H "X-Idempotency-Key: $(uuidgen)" \\

&#x20; -H "Content-Type: application/json" \\

&#x20; -d '{"type": "A", "content": "203.0.113.10", "proxied": true}'



响应示例



// 201 Created

{

&#x20; "code": 0,

&#x20; "message": "created",

&#x20; "data": {

&#x20;   "id": 5,

&#x20;   "subdomain\_id": 42,

&#x20;   "type": "A",

&#x20;   "name": "myhost.example.com",

&#x20;   "content": "203.0.113.10",

&#x20;   "ttl": 1,

&#x20;   "proxied": true,

&#x20;   "provider\_record\_id": "8f2e6d1c9b7a4e3f2d1c0b9a8f7e6d5c",

&#x20;   "status": "active",

&#x20;   "created\_at": "2026-01-01T00:00:00Z",

&#x20;   "updated\_at": "2026-01-01T00:00:00Z"

&#x20; }

}



PUT

/open/dns-records/:id/:recordId

需要 X-Idempotency-Key

更新某条 DNS 记录的内容和/或代理状态。记录创建后类型（type）不可更改。

参数



:id（路径参数）—— 子域名 id

:recordId（路径参数）—— DNS 记录 id

content（请求体，必填）

proxied（请求体，可选）

请求示例



curl -X PUT https://sld.0n.pub/api/v1/open/dns-records/42/5 \\

&#x20; -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; -H "X-Idempotency-Key: $(uuidgen)" \\

&#x20; -H "Content-Type: application/json" \\

&#x20; -d '{"content": "203.0.113.20", "proxied": true}'



响应示例



{

&#x20; "code": 0,

&#x20; "message": "ok",

&#x20; "data": {

&#x20;   "id": 5,

&#x20;   "subdomain\_id": 42,

&#x20;   "type": "A",

&#x20;   "name": "myhost.example.com",

&#x20;   "content": "203.0.113.20",

&#x20;   "ttl": 1,

&#x20;   "proxied": true,

&#x20;   "provider\_record\_id": "8f2e6d1c9b7a4e3f2d1c0b9a8f7e6d5c",

&#x20;   "status": "active",

&#x20;   "created\_at": "2026-01-01T00:00:00Z",

&#x20;   "updated\_at": "2026-01-01T00:00:00Z"

&#x20; }

}



DELETE

/open/dns-records/:id/:recordId

需要 X-Idempotency-Key

删除一条 DNS 记录。

参数



:id（路径参数）—— 子域名 id

:recordId（路径参数）—— DNS 记录 id

请求示例



curl -X DELETE https://sld.0n.pub/api/v1/open/dns-records/42/5 \\

&#x20; -H "X-API-Key: hl6\_xxxxxxxxxxxx" \\

&#x20; -H "X-Idempotency-Key: $(uuidgen)"



响应示例



{

&#x20; "code": 0,

&#x20; "message": "ok",

&#x20; "data": { "message": "record deleted" }

}

