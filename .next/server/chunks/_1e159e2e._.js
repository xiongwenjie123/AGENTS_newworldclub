module.exports=[18775,e=>e.a(async(t,a)=>{try{var n=e.i(78091),i=e.i(79832),r=e.i(1269),s=e.i(18370),o=e.i(26277),l=e.i(18830),d=e.i(51681),u=e.i(30459),c=e.i(87819),p=t([l]);[l]=p.then?(await p)():p;let f=n.z.object({missionId:n.z.string().optional(),fleetId:n.z.string().optional(),phase:n.z.string().optional(),agentName:n.z.string().default("Cargo Agent 02"),instruction:n.z.string().optional(),stream:n.z.boolean().optional()}),w={intel_analysis:"靶源情报搜集、用户洞察与竞品扫描",positioning:"机会定位、价值主张与边界界定",prototype_build:"原型方案、任务拆解与实现路径",trial_voyage:"试航验收、反馈归类与迭代清单",maiden_voyage:"首航发布、传播计划与公测承接",archive_retrospect:"归档复盘与创新航迹总结"};async function m(e){let t;try{t=await (0,i.requireUser)()}catch(e){return new Response(JSON.stringify({code:401,message:"未登录"}),{status:401})}let a=f.safeParse(await e.json());if(!a.success)return new Response(JSON.stringify({code:400,message:a.error.issues[0]?.message}),{status:400});let n={...a.data},p=(0,l.forwardHeadersFrom)(e);if(!n.missionId){let e=await (0,r.db)(),t=await e.select({missionId:s.mission.missionId,missionName:s.mission.missionName,currentPhase:s.mission.currentPhase}).from(s.mission).orderBy((0,o.desc)(s.mission.createdAt)).limit(1);n.missionId=t[0]?.missionId??""}let m=await (0,u.getMissionDetail)(n.missionId),I=n.phase||m?.currentPhase||(m?.missionStatus==="archived"?"archive_retrospect":"intel_analysis"),y=d.MISSION_PHASES.find(e=>e.id===I),R=y?.name??I;n.phase=I;let v=n.instruction||`请为【${R}】阶段生成结构化协作草稿。`;n.instruction=v;let C=n.agentName??"Cargo Agent 02";n.agentName=C;let _=n.missionId??"";n.missionId=_;let E=!1!==n.stream,N=m?.fleets[0],b=N?.seats.filter(e=>"human"===e.assignType).length??0,S=N?.seats.filter(e=>"agent"===e.assignType).length??0,x=w[I]??"阶段产出",A=await (0,c.loadTemplateFilled)("bridge_agent_system",{agentName:C,missionName:m?.missionName??"",phaseName:R,humanSeats:String(b),agentSeats:String(S),phaseHint:x})??`你是新大陆俱乐部「${C}」舰载智能，负责为 Mission「${m?.missionName??""}」的【${R}】阶段产出草稿。
当前舰队：真人 ${b} 席，Agent 补位 ${S} 席。
你的产出必须是草稿（agent_generated），不能自动封板，最终必须由人类确认。
请围绕：${x}，结合需求给出结构化、可执行的内容（Markdown），控制在 400 字以内，语言专业且符合星际协作语境。`,P=Date.now();if(!E){let e="",a="",i=!1;try{if(!(e=await (0,l.llmInvoke)([{role:"system",content:A},{role:"user",content:v}],{forwardHeaders:p})).trim())throw Error("empty");a=(await g({missionId:_,fleetId:n.fleetId??null,phase:I,agentName:C,instruction:v},t.userId,e,Date.now()-P,A,!1)).outputId}catch{i=!0,e=h(I,R,v,C),a=(await g({missionId:_,fleetId:n.fleetId??null,phase:I,agentName:C,instruction:v},t.userId,e,Date.now()-P,A,!0)).outputId}return new Response(JSON.stringify({code:0,data:{content:e,outputId:a,degraded:i,humanConfirmed:!1}}),{headers:{"Content-Type":"application/json"}})}let T=new TextEncoder,O=new ReadableStream({async start(e){let a=t=>e.enqueue(T.encode(`data: ${JSON.stringify(t)}

`)),i="",r=!1;try{for await(let e of(0,l.llmStream)([{role:"system",content:A},{role:"user",content:v}],{forwardHeaders:p}))i+=e,a({type:"token",content:e});if(!i.trim())throw Error("舰载智能返回为空")}catch{for(let e of(r=!0,(i=h(I,R,v,C)).match(/.{1,12}/g)??[i]))a({type:"token",content:e}),await new Promise(e=>setTimeout(e,18))}let s=await g({missionId:_,fleetId:n.fleetId??null,phase:I,agentName:C,instruction:v},t.userId,i,Date.now()-P,A,r);a({type:"done",outputId:s.outputId,callLogId:s.callLogId,humanConfirmed:!1,degraded:r}),a({type:"raw",data:"[DONE]"}),e.close()}});return new Response(O,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform",Connection:"keep-alive"}})}async function g(e,t,a,n,i,o=!1){let l=await (0,r.db)(),u=await l.insert(s.shipIntelligenceAgentCallLog).values({missionId:e.missionId,fleetId:e.fleetId,agentName:e.agentName,callTriggerUserId:t,userInstruction:e.instruction,agentInputPrompt:i,llmModelName:o?"local-template-fallback":"doubao-seed-2-0-lite",llmRawOutput:a,humanOperationType:o?"local_draft":null,tokenConsumedInput:i.length,tokenConsumedOutput:a.length,callCostTimeMs:n,isDemo:!1}).returning({callLogId:s.shipIntelligenceAgentCallLog.callLogId}),c=await l.insert(s.missionPhaseOutput).values({missionId:e.missionId,fleetId:e.fleetId,phaseName:e.phase,submitUserId:null,outputTitle:`[${e.agentName}] ${d.MISSION_PHASES.find(t=>t.id===e.phase)?.name??e.phase} 阶段草稿${o?"（本地模板）":""}`,outputContentText:a,phaseStatus:"agent_generated",agentCallLogId:u[0].callLogId}).returning({outputId:s.missionPhaseOutput.outputId});return{callLogId:u[0].callLogId,outputId:c[0].outputId}}function h(e,t,a,n){return({intel_analysis:`## 靶源情报 \xb7 阶段草稿（${n} 生成，待人工确认）

### 已识别需求
- 来自指令「${a||"阶段协作"}」的核心目标待明确
- 建议补充：目标用户、使用场景、成功标准

### 待侦察信号
1. 目标用户画像与高频痛点
2. 现有替代方案的边界
3. 可复用的内部资源

### 风险提示
- 情报来源需人工核验，避免未验证假设直接进入定位阶段

> 本草案由本地模板生成（舰载智能暂不可用），仅作结构参考，内容需人工补全与确认。`,positioning:`## 机会定位 \xb7 阶段草稿（${n} 生成，待人工确认）

### 一句话价值主张（待定）
「为 ___ 提供 ___，使其能够 ___」

### 差异化坐标
- 我们不做什么（边界）
- 我们必须做好什么（锚点）

### 21 席能力对齐建议
- 探索舱：验证需求真实性
- 建造舱：评估技术可行性
- 治理舱：明确协作规则

> 本草案由本地模板生成，需舰长与探索舱共同确认后封板。`,prototype_build:`## 原型建造 \xb7 阶段草稿（${n} 生成，待人工确认）

### 最小可行原型（MVP）清单
1. 核心链路闭环（主流程可走通）
2. 关键界面与交互骨架
3. 数据埋点与验证指标

### 分工建议（21 席）
- 引擎总师 / 机械造物师：技术方案
- 星辰锻铁匠 / 星脉布线工：实现落地
- 星坞守门人：用户体验走查

### 验收标准（建议）
- 主流程完成率、关键操作耗时、缺陷数

> 本草案由本地模板生成，待建造舱确认后排期。`,trial_voyage:`## 试航反馈 \xb7 阶段草稿（${n} 生成，待人工确认）

### 试航数据摘要
- 参与人数 / 完成率 / NPS（待填）

### 高频反馈归类
- 亮点：
- 阻塞点：
- 意外发现：

### 迭代决策建议
- 保留 / 调整 / 放弃 三栏
- 必须人工（守门人）确认的体验红线

> 本草案由本地模板生成，反馈结论需与真实试航数据核对。`,maiden_voyage:`## 首航发布 \xb7 阶段草稿（${n} 生成，待人工确认）

### 发布准备
- 公测范围、承接 SOP、应急预案

### 传播与渠道
- 飞梭传令官：渠道分发
- 流星神射手：增长实验

> 本草案由本地模板生成，发布节奏需舰长拍板。`,archive_retrospect:`## 归档复盘 \xb7 阶段草稿（${n} 生成，待人工确认）

### 目标达成度
- 预期 vs 实际（待填）

### 协作航迹
- 关键产出节点
- Agent 补位与人工接管记录
- 协作互评摘要

### 下一程建议
- 沉淀可复用资产
- 席位能力回填航行档案

> 本草案由本地模板生成，归档报告需治理者与舰长共同签署。`})[e]??`## ${t} \xb7 阶段草稿（${n} 生成，待人工确认）

围绕「${a||"阶段协作"}」的结构化草稿，需人工补全与确认。`}e.s(["POST",()=>m,"dynamic",0,"force-dynamic"]),a()}catch(e){a(e)}},!1),1520,e=>e.a(async(t,a)=>{try{var n=e.i(81360),i=e.i(83359),r=e.i(76814),s=e.i(88280),o=e.i(81470),l=e.i(96555),d=e.i(56415),u=e.i(53083),c=e.i(45711),p=e.i(99346),m=e.i(79573),g=e.i(40978),h=e.i(98895),f=e.i(36885),w=e.i(87278),I=e.i(93695);e.i(70908);var y=e.i(16122),R=e.i(18775),v=t([R]);[R]=v.then?(await v)():v;let E=new n.AppRouteRouteModule({definition:{kind:i.RouteKind.APP_ROUTE,page:"/api/bridge/agent/route",pathname:"/api/bridge/agent",filename:"route",bundlePath:""},distDir:".next",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/bridge/agent/route.ts",nextConfigOutput:"",userland:R}),{workAsyncStorage:N,workUnitAsyncStorage:b,serverHooks:S}=E;function C(){return(0,r.patchFetch)({workAsyncStorage:N,workUnitAsyncStorage:b})}async function _(e,t,a){E.isDev&&(0,s.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let n="/api/bridge/agent/route";n=n.replace(/\/index$/,"")||"/";let r=await E.prepare(e,t,{srcPage:n,multiZoneDraftMode:!1});if(!r)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:R,params:v,nextConfig:C,parsedUrl:_,isDraftMode:N,prerenderManifest:b,routerServerContext:S,isOnDemandRevalidate:x,revalidateOnlyGenerated:A,resolvedPathname:P,clientReferenceManifest:T,serverActionsManifest:O}=r,$=(0,d.normalizeAppPath)(n),H=!!(b.dynamicRoutes[$]||b.routes[P]),k=async()=>((null==S?void 0:S.render404)?await S.render404(e,t,_,!1):t.end("This page could not be found"),null);if(H&&!N){let e=!!b.routes[P],t=b.dynamicRoutes[$];if(t&&!1===t.fallback&&!e){if(C.experimental.adapterPath)return await k();throw new I.NoFallbackError}}let D=null;!H||E.isDev||N||(D=P,D="/index"===D?"/":D);let M=!0===E.isDev||!H,U=H&&!M;O&&T&&(0,l.setManifestsSingleton)({page:n,clientReferenceManifest:T,serverActionsManifest:O});let q=e.method||"GET",L=(0,o.getTracer)(),j=L.getActiveScopeSpan(),F={params:v,prerenderManifest:b,renderOpts:{experimental:{authInterrupts:!!C.experimental.authInterrupts},cacheComponents:!!C.cacheComponents,supportsDynamicResponse:M,incrementalCache:(0,s.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:C.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,a,n,i)=>E.onRequestError(e,t,n,i,S)},sharedContext:{buildId:R}},z=new u.NodeNextRequest(e),K=new u.NodeNextResponse(t),B=c.NextRequestAdapter.fromNodeNextRequest(z,(0,c.signalFromNodeResponse)(t));try{let r=async e=>E.handle(B,F).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let a=L.getRootSpanAttributes();if(!a)return;if(a.get("next.span_type")!==p.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${a.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let i=a.get("next.route");if(i){let t=`${q} ${i}`;e.setAttributes({"next.route":i,"http.route":i,"next.span_name":t}),e.updateName(t)}else e.updateName(`${q} ${n}`)}),l=!!(0,s.getRequestMeta)(e,"minimalMode"),d=async s=>{var o,d;let u=async({previousCacheEntry:i})=>{try{if(!l&&x&&A&&!i)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await r(s);e.fetchMetrics=F.renderOpts.fetchMetrics;let o=F.renderOpts.pendingWaitUntil;o&&a.waitUntil&&(a.waitUntil(o),o=void 0);let d=F.renderOpts.collectedTags;if(!H)return await (0,g.sendResponse)(z,K,n,F.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,h.toNodeOutgoingHttpHeaders)(n.headers);d&&(t[w.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let a=void 0!==F.renderOpts.collectedRevalidate&&!(F.renderOpts.collectedRevalidate>=w.INFINITE_CACHE)&&F.renderOpts.collectedRevalidate,i=void 0===F.renderOpts.collectedExpire||F.renderOpts.collectedExpire>=w.INFINITE_CACHE?void 0:F.renderOpts.collectedExpire;return{value:{kind:y.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:a,expire:i}}}}catch(t){throw(null==i?void 0:i.isStale)&&await E.onRequestError(e,t,{routerKind:"App Router",routePath:n,routeType:"route",revalidateReason:(0,m.getRevalidateReason)({isStaticGeneration:U,isOnDemandRevalidate:x})},!1,S),t}},c=await E.handleResponse({req:e,nextConfig:C,cacheKey:D,routeKind:i.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:b,isRoutePPREnabled:!1,isOnDemandRevalidate:x,revalidateOnlyGenerated:A,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:l});if(!H)return null;if((null==c||null==(o=c.value)?void 0:o.kind)!==y.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==c||null==(d=c.value)?void 0:d.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});l||t.setHeader("x-nextjs-cache",x?"REVALIDATED":c.isMiss?"MISS":c.isStale?"STALE":"HIT"),N&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let p=(0,h.fromNodeOutgoingHttpHeaders)(c.value.headers);return l&&H||p.delete(w.NEXT_CACHE_TAGS_HEADER),!c.cacheControl||t.getHeader("Cache-Control")||p.get("Cache-Control")||p.set("Cache-Control",(0,f.getCacheControlHeader)(c.cacheControl)),await (0,g.sendResponse)(z,K,new Response(c.value.body,{headers:p,status:c.value.status||200})),null};j?await d(j):await L.withPropagatedContext(e.headers,()=>L.trace(p.BaseServerSpan.handleRequest,{spanName:`${q} ${n}`,kind:o.SpanKind.SERVER,attributes:{"http.method":q,"http.target":e.url}},d))}catch(t){if(t instanceof I.NoFallbackError||await E.onRequestError(e,t,{routerKind:"App Router",routePath:$,routeType:"route",revalidateReason:(0,m.getRevalidateReason)({isStaticGeneration:U,isOnDemandRevalidate:x})},!1,S),H)throw t;return await (0,g.sendResponse)(z,K,new Response(null,{status:500})),null}}e.s(["handler",()=>_,"patchFetch",()=>C,"routeModule",()=>E,"serverHooks",()=>S,"workAsyncStorage",()=>N,"workUnitAsyncStorage",()=>b]),a()}catch(e){a(e)}},!1)];

//# sourceMappingURL=_1e159e2e._.js.map