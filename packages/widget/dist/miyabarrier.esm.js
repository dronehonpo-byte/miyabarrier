/*! Miyabarrier v0.5.0 | MIT License | https://github.com/dronehonpo-byte/miyabarrier */
var bt=(e,t,n)=>e<t?t:e>n?n:e,P=e=>bt(e,0,1),ht=e=>typeof e=="number"&&Number.isFinite(e),w=(e,t=3)=>{let n=10**t;return Math.round(e*n)/n},ee=e=>e.length===0?0:e.reduce((t,n)=>t+n,0)/e.length,gt=e=>{if(e.length<2)return 0;let t=ee(e),n=e.reduce((r,o)=>r+(o-t)**2,0)/(e.length-1);return Math.sqrt(n)},j=e=>{let t=ee(e);return t===0?0:gt(e)/Math.abs(t)},le=e=>{var r,o,a;if(e.length===0)return 0;let t=[...e].sort((i,l)=>i-l),n=Math.floor(t.length/2);return t.length%2===1?(r=t[n])!=null?r:0:(((o=t[n-1])!=null?o:0)+((a=t[n])!=null?a:0))/2},ce=e=>{var n,r;let t=[];for(let o=1;o<e.length;o+=1)t.push(((n=e[o])!=null?n:0)-((r=e[o-1])!=null?r:0));return t},O=(e,t)=>t<=0?0:P((t-e)/t),N=(e,t,n=1)=>n<=t?e>t?1:0:P((e-t)/(n-t)),de=(e,t=1)=>{var o;if(e.length===0)return 0;let n=new Map;for(let a of e){let i=Math.round(a/t);n.set(i,((o=n.get(i))!=null?o:0)+1)}let r=0;for(let a of n.values())a>r&&(r=a);return r/e.length},H=e=>e.normalize("NFKC").toLowerCase().replace(/[\t ]+/g," "),te=(e,t)=>{if(t.length===0)return 0;let n=0,r=e.indexOf(t);for(;r!==-1;)n+=1,r=e.indexOf(t,r+t.length);return n},Se=e=>e.split(/(?<=[。！？!?])|(?<=\.)(?=\s|$)|\n+/g).map(t=>t.trim()).filter(t=>t.length>0),ft=/[぀-ヿ㐀-䶿一-鿿]/,_e=e=>ft.test(e),Ce=e=>{var t;return((t=e.match(/\b(?:https?:\/\/|www\.)[^\s<>"'）)]{3,}/gi))!=null?t:[]).length},v=(e,t,n)=>{let r=e==null?void 0:e[t];return ht(r)?r:n},D=(e,t,n)=>{let r=e==null?void 0:e[t];return Array.isArray(r)&&r.every(o=>typeof o=="string")?r:[...n]};var q=(e,t,n,r)=>Math.hypot(n-e,r-t),yt=e=>{let t=0;for(let n=1;n<e.length;n+=1){let r=e[n-1],o=e[n];!r||!o||(t+=q(r.x,r.y,o.x,o.y))}return t},vt=e=>{let t=[];for(let n=1;n<e.length-1;n+=1){let r=e[n-1],o=e[n],a=e[n+1];if(!r||!o||!a)continue;let i=q(r.x,r.y,a.x,a.y);if(i===0)continue;let l=Math.abs((a.x-r.x)*(r.y-o.y)-(r.x-o.x)*(a.y-r.y));t.push(l/i)}return t},xt=e=>{let t=[];for(let n=1;n<e.length;n+=1){let r=e[n-1],o=e[n];!r||!o||t.push(q(r.x,r.y,o.x,o.y))}return t},kt=e=>{let t=[];for(let n=1;n<e.length;n+=1){let r=e[n-1],o=e[n];if(!r||!o)continue;let a=o.t-r.t;a<=0||t.push(q(r.x,r.y,o.x,o.y)/a)}return t},Me=(e,t)=>{var k,_,L;if(!e)return{layer:"behavior",applicable:!1,signals:[],metrics:{},skipped:"行動の計測値がない"};let n=t==null?void 0:t.tuning,r=v(n,"instantSubmitMs",1500),o=v(n,"fastSubmitMs",5e3),a=v(n,"staleFormMs",72e5),i=v(n,"maxPlausibleCharsPerMinute",1200),l=v(n,"minMouseSamples",3),u=v(n,"pastedCharsThreshold",120),d=[],s=Math.max(0,e.submittedAt-e.renderedAt),m=e.pastes.reduce((M,C)=>M+C.length,0),h=(k=e.touchEventCount)!=null?k:0,p=e.keys.map(M=>M.t).sort((M,C)=>M-C);s<r?d.push({code:"behavior.instantSubmit",intensity:O(s,r),detail:`表示から送信まで ${s}ms`}):s<o?d.push({code:"behavior.fastSubmit",intensity:O(s,o),detail:`表示から送信まで ${s}ms`}):s>a&&d.push({code:"behavior.staleForm",intensity:P((s-a)/a),detail:`表示から送信まで ${Math.round(s/6e4)} 分`}),e.pointer.length<l&&h===0&&d.push({code:"behavior.noMouseActivity",intensity:O(e.pointer.length,l),detail:`ポインタ観測 ${e.pointer.length} 件 / タッチ ${h} 件`}),e.focus.length===0&&d.push({code:"behavior.noFocusEvents"}),e.typedChars>0&&p.length===0&&m===0&&d.push({code:"behavior.noKeystrokes"});let f=Math.max(0,e.typedChars-m),y=p.length>=2?((_=p[p.length-1])!=null?_:0)-((L=p[0])!=null?L:0):0,x=null;return p.length>=5&&y>=200&&(x=f/(y/6e4),x>i&&d.push({code:"behavior.impossibleTypingSpeed",intensity:N(x,i,i*3),detail:`${Math.round(x)} 文字/分`})),m>=u&&d.push({code:"behavior.pastedBody",intensity:N(m,u,u*4),detail:`貼り付け ${m} 文字`}),{layer:"behavior",applicable:!0,signals:d,metrics:{elapsedMs:s,pointerSamples:e.pointer.length,touchEventCount:h,keyCount:p.length,focusCount:e.focus.length,typedChars:e.typedChars,pastedChars:m,charsPerMinute:x===null?null:w(x,1)}}},Le=(e,t)=>{if(!e)return{layer:"mimicry",applicable:!1,signals:[],metrics:{},skipped:"行動の計測値がない"};let n=t==null?void 0:t.tuning,r=v(n,"minMouseSamples",12),o=v(n,"minKeyIntervals",8),a=v(n,"minFieldTransitions",3),i=v(n,"mouseSpeedCvFloor",.18),l=v(n,"keyIntervalCvFloor",.22),u=v(n,"fieldTransitionCvFloor",.12),d=v(n,"straightnessCeiling",.985),s=v(n,"quantizedRatioCeiling",.6),m=v(n,"jitterFloorPx",.75),h=[],p={},f=[...e.pointer].sort((c,b)=>c.t-b.t),y=f.length>=r;if(y){let c=kt(f),b=j(c);p.pointerSpeedCv=w(b),c.length>=3&&b<i&&h.push({code:"mimicry.uniformMouseSpeed",intensity:O(b,i),detail:`速度の変動係数 ${w(b)}`});let E=f[0],$=f[f.length-1],A=yt(f),T=E&&$&&A>0?q(E.x,E.y,$.x,$.y)/A:0;p.straightness=w(T),A>0&&T>d&&h.push({code:"mimicry.straightMousePath",intensity:N(T,d),detail:`直線度 ${w(T)}`});let I=xt(f).filter(X=>X>0),F=de(I,1);p.stepModeRatio=w(F),I.length>=5&&F>s&&h.push({code:"mimicry.quantizedMouseSteps",intensity:N(F,s),detail:`同一移動量の比率 ${w(F)}`});let W=le(vt(f));p.jitterPx=w(W),W<m&&h.push({code:"mimicry.noJitter",intensity:O(W,m),detail:`局所的な揺れの中央値 ${w(W)}px`})}let x=e.keys.map(c=>c.t).sort((c,b)=>c-b),k=ce(x).filter(c=>c>=0),_=k.length>=o;if(_){let c=j(k);p.keyIntervalCv=w(c),p.keyIntervalMedianMs=w(le(k),1),c<l&&h.push({code:"mimicry.uniformKeyIntervals",intensity:O(c,l),detail:`打鍵間隔の変動係数 ${w(c)}`});let b=de(k,5);p.keyIntervalModeRatio=w(b),b>s&&h.push({code:"mimicry.quantizedKeyIntervals",intensity:N(b,s),detail:`同一打鍵間隔の比率 ${w(b)}`})}let L=e.focus.map(c=>c.t).sort((c,b)=>c-b),M=ce(L).filter(c=>c>=0),C=M.length>=a;if(C){let c=j(M);p.fieldTransitionCv=w(c),c<u&&h.push({code:"mimicry.uniformFieldTransitions",intensity:O(c,u),detail:`欄移動間隔の変動係数 ${w(c)}`})}let S=y||_||C;return{layer:"mimicry",applicable:S,signals:h,metrics:{...p,pointerSamples:f.length,keyIntervals:k.length,fieldTransitions:M.length},...S?{}:{skipped:"統計判定に足るサンプル数がない"}}};var Ee=(e,t)=>{var s,m,h;if(!e||!e.present)return{layer:"checkbox",applicable:!1,signals:[],metrics:{},skipped:e?"チェックボックス UI が無効":"チェックボックスの計測値がない"};let n=t==null?void 0:t.tuning,r=v(n,"instantCheckMs",250),o=v(n,"minPointerTrail",2),a=v(n,"maxToggles",6),i=[],l=e.checked&&typeof e.checkedAt=="number"?e.checkedAt-e.renderedAt:null,u=(s=e.toggleCount)!=null?s:e.checked?1:0,d=(m=e.pointerSamplesBeforeCheck)!=null?m:0;return e.checked?(e.trustedClick===!1&&i.push({code:"checkbox.programmaticCheck"}),l!==null&&l<r&&i.push({code:"checkbox.instantCheck",intensity:O(Math.max(l,0),r),detail:`表示から ${Math.max(l,0)}ms でチェック`}),d<o&&i.push({code:"checkbox.noPointerTrail",intensity:O(d,o),detail:`チェック前のポインタ／タッチ観測 ${d} 件`})):i.push({code:"checkbox.unchecked"}),u>a&&i.push({code:"checkbox.excessiveToggles",detail:`切り替え ${u} 回`}),{layer:"checkbox",applicable:!0,signals:i,metrics:{checked:e.checked,elapsedToCheckMs:l,trustedClick:(h=e.trustedClick)!=null?h:null,pointerSamplesBeforeCheck:d,toggleCount:u}}};var me=/(株式会社|合同会社|有限会社|一般社団法人|合資会社|\bco\.,?\s?ltd\b|\binc\b)/,wt=/(と申します|と言います|担当(?:者)?(?:です|でございます)|営業部|マーケティング部)/,St=[/〒\s*\d{3}[-ー－]?\d{4}/,/(?:tel|電話)[:：]?\s*0\d/,/(?:fax)[:：]?\s*0\d/,/(?:e-?mail|メール)[:：]/,/0\d{1,3}[-(]\d{2,4}[-)]\d{3,4}/,/https?:\/\//,/(?:所在地|住所|事業内容|会社概要)[:：]/],_t=/^\s*(?:[・･◆●○■□*\-–—]|\d{1,2}[.)、]|[①-⑳])\s*\S/,Ae=(e,t)=>{var l,u,d;let n=H(e),r=((u=(l=t.allowlist)==null?void 0:l.terms)!=null?u:[]).map(s=>H(s)).filter(s=>s.length>0&&n.includes(s)),o=[],a={},i=0;for(let s of t.categories){let m=0,h=()=>s.score>0?m>=s.cap:m<=s.cap;for(let p of s.terms){if(h())break;let f=H(p),y=te(n,f);if(y===0)continue;let x=r.filter(k=>k.includes(f)).reduce((k,_)=>k+te(n,_),0);y<=x||(m+=s.score,o.push({categoryId:s.id,label:s.label,term:p,kind:"term",score:s.score}))}for(let p of(d=s.patterns)!=null?d:[]){if(h())break;let f;try{f=new RegExp(p,"gi")}catch{continue}f.test(n)&&(m+=s.score,o.push({categoryId:s.id,label:s.label,term:p,kind:"pattern",score:s.score}))}if(m!==0){let p=s.score>0?Math.min(m,s.cap):Math.max(m,s.cap);a[s.id]=p,i+=p}}return{score:w(i,2),matches:o,perCategory:a}},G=(e,t,n)=>{var L,M;if(!e||!n)return{layer:"content",applicable:!1,signals:[],metrics:{},skipped:"本文またはパターン定義がない"};let r=t==null?void 0:t.tuning,o=v(r,"minChars",24),a=v(r,"ngScoreSaturation",12),i=v(r,"freeUrlAllowance",1),l=v(r,"urlSaturation",4),u=v(r,"companyIntroHeadChars",120),d=(L=e.text)!=null?L:"",s=d.trim();if(s.length<o)return{layer:"content",applicable:!1,signals:[],metrics:{chars:s.length},skipped:`本文が短すぎる (${s.length} 文字 < ${o})`};let m=[],h=Ae(d,n);if(h.score>0){let C=h.matches.filter(S=>S.score>0).slice(0,6).map(S=>S.term);m.push({code:"content.ngWords",intensity:P(h.score/a),detail:`営業スコア ${h.score} / 検出語: ${C.join("、")}`})}let p=Ce(d);p>i&&m.push({code:"content.urlSpam",intensity:N(p,i,l),detail:`URL ${p} 件`});let f=s.slice(0,u),y=(M=e.senderName)!=null?M:"";(me.test(f)&&wt.test(f)||me.test(y))&&m.push({code:"content.companyIntroOpening",detail:me.test(y)?"氏名欄に法人格":"冒頭に法人格つきの自己紹介"});let x=s.slice(-260),k=St.filter(C=>C.test(x)).length;k>=3&&m.push({code:"content.signatureBlock",intensity:P(k/4),detail:`署名要素 ${k} 種`}),e.formLanguage==="ja"&&!_e(d)&&m.push({code:"content.noJapaneseOnJapaneseForm"});let _=Object.entries(h.perCategory).map(([C,S])=>`${C}:${S}`).join(", ");return{layer:"content",applicable:!0,signals:m,metrics:{chars:s.length,ngScore:h.score,ngMatchCount:h.matches.length,ngCategories:_,urls:p,signatureHits:k}}},Ct=["いただければ","いただけますと","させていただき","ご検討いただ","幸いです","存じます","何卒","よろしくお願い申し上げます","つきましては"],Mt=["！！","。。","、、","www","笑","すみません","ちょっと"],Lt=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,Et=e=>{var r,o;if(e.length<2)return 1;let t=ee(e);if(t===0)return 1;let n=0;for(let a=1;a<e.length;a+=1)n+=Math.abs(((r=e[a])!=null?r:0)-((o=e[a-1])!=null?o:0));return n/(e.length-1)/t},V=(e,t)=>{var C;if(!e)return{layer:"aiText",applicable:!1,signals:[],metrics:{},skipped:"本文がない"};let n=t==null?void 0:t.tuning,r=v(n,"minChars",80),o=v(n,"minSentences",4),a=v(n,"sentenceLengthCvFloor",.32),i=v(n,"politePhraseDensityCeiling",.012),l=v(n,"burstinessFloor",.35),u=D(n,"politePhrases",Ct),d=D(n,"humanNoiseMarkers",Mt),s=((C=e.text)!=null?C:"").trim(),m=Se(s);if(s.length<r||m.length<o)return{layer:"aiText",applicable:!1,signals:[],metrics:{chars:s.length,sentences:m.length},skipped:`統計判定に足る長さがない (${s.length} 文字 / ${m.length} 文)`};let h=[],p=H(s),f=m.map(S=>S.length),y=w(j(f));y<a&&h.push({code:"ai.uniformSentenceLength",intensity:O(y,a),detail:`文長の変動係数 ${y}`});let x=u.reduce((S,c)=>S+te(p,H(c)),0),k=x/s.length;k>i&&h.push({code:"ai.politeTemplateDensity",intensity:N(k,i,i*3),detail:`定型丁寧表現 ${x} 箇所 / ${s.length} 文字`});let _=w(Et(f));_<l&&h.push({code:"ai.lowBurstiness",intensity:O(_,l),detail:`文長の揺らぎ ${_}`});let L=s.split(/\n/).filter(S=>_t.test(S)).length;L>=3&&h.push({code:"ai.structuredListing",intensity:P((L-2)/4),detail:`箇条書き ${L} 行`});let M=d.filter(S=>p.includes(H(S))).length;return M===0&&!Lt.test(s)&&s.length>=200&&h.push({code:"ai.noTypos",intensity:.6}),{layer:"aiText",applicable:!0,signals:h,metrics:{chars:s.length,sentences:m.length,sentenceLengthCv:y,burstiness:_,politeHits:x,politeDensity:w(k,4),listLines:L,noiseHits:M}}};var At=["headlesschrome","headless"],Tt=["puppeteer","playwright","selenium","phantomjs","electron/","webdriver"],It=["bot","crawler","spider","python-requests","curl/","wget/","axios/","okhttp","scrapy","http-client"],Rt=/(android|iphone|ipad|ipod|mobile|windows phone)/,ue=(e,t)=>{var r,o;if(t.length>4||/[^a-z]/.test(t))return e.includes(t);let n=e.indexOf(t);for(;n!==-1;){let a=(r=e[n-1])!=null?r:"",i=(o=e[n+t.length])!=null?o:"";if(!/[a-z]/.test(a)&&!/[a-z]/.test(i))return!0;n=e.indexOf(t,n+1)}return!1},Te=(e,t)=>{var p,f,y,x,k,_,L,M,C,S,c,b,E,$,A,T;if(!e)return{layer:"environment",applicable:!1,signals:[],metrics:{},skipped:"実行環境の計測値がない"};let n=t==null?void 0:t.tuning,r=D(n,"headlessMarkers",At),o=D(n,"automationMarkers",Tt),a=D(n,"botUserAgentMarkers",It),i=[],l=((p=e.userAgent)!=null?p:"").toLowerCase(),u=Rt.test(l),d=((f=e.maxTouchPoints)!=null?f:0)>0;e.webdriver===!0&&i.push({code:"env.webdriver"});let s=r.find(I=>ue(l,I));s&&i.push({code:"env.headlessUserAgent",detail:s});let m=o.find(I=>ue(l,I));m&&i.push({code:"env.automationUserAgent",detail:m});let h=a.find(I=>ue(l,I));return h&&i.push({code:"env.botUserAgent",detail:h}),e.isChromium===!0&&!d&&e.pluginCount===0&&i.push({code:"env.noPlugins"}),e.isChromium===!0&&e.hasChromeObject===!1&&i.push({code:"env.chromeObjectMissing"}),Array.isArray(e.languages)&&e.languages.length===0&&i.push({code:"env.noLanguages"}),typeof e.innerWidth=="number"&&typeof e.innerHeight=="number"&&typeof e.screenWidth=="number"&&typeof e.screenHeight=="number"&&e.innerWidth>0&&e.innerWidth===e.screenWidth&&e.innerHeight===e.screenHeight&&i.push({code:"env.viewportEqualsScreen",detail:`${e.innerWidth}x${e.innerHeight}`}),(e.outerWidth===0||e.outerHeight===0)&&i.push({code:"env.zeroOuterWindow"}),u&&e.maxTouchPoints===0&&i.push({code:"env.touchInconsistency",detail:"モバイル UA なのに maxTouchPoints が 0"}),typeof e.hardwareConcurrency=="number"&&(e.hardwareConcurrency===0?i.push({code:"env.suspiciousHardwareConcurrency",detail:"0 コア"}):e.hardwareConcurrency>64&&i.push({code:"env.suspiciousHardwareConcurrency",intensity:.5,detail:`${e.hardwareConcurrency} コア`})),e.notificationPermission==="denied"&&e.permissionsQueryState==="prompt"&&i.push({code:"env.permissionsInconsistency"}),{layer:"environment",applicable:!0,signals:i,metrics:{userAgent:(x=(y=e.userAgent)==null?void 0:y.slice(0,180))!=null?x:"",webdriver:(k=e.webdriver)!=null?k:null,pluginCount:(_=e.pluginCount)!=null?_:null,languageCount:(M=(L=e.languages)==null?void 0:L.length)!=null?M:null,isChromium:(C=e.isChromium)!=null?C:null,hasChromeObject:(S=e.hasChromeObject)!=null?S:null,viewport:typeof e.innerWidth=="number"?`${e.innerWidth}x${(c=e.innerHeight)!=null?c:0}`:null,screen:typeof e.screenWidth=="number"?`${e.screenWidth}x${(b=e.screenHeight)!=null?b:0}`:null,outer:typeof e.outerWidth=="number"?`${e.outerWidth}x${(E=e.outerHeight)!=null?E:0}`:null,devicePixelRatio:($=e.devicePixelRatio)!=null?$:null,hardwareConcurrency:(A=e.hardwareConcurrency)!=null?A:null,maxTouchPoints:(T=e.maxTouchPoints)!=null?T:null}}};var Ie=e=>{var o,a,i,l,u,d;if(!e)return{layer:"honeypot",applicable:!1,signals:[],metrics:{},skipped:"ハニーポットの計測値がない"};let t=[],n=e.fields.filter(s=>s.value.trim().length>0),r=((o=e.decoys)!=null?o:[]).filter(s=>s.checked);return n.length>0&&t.push({code:"honeypot.filled",detail:`隠しフィールドに入力あり: ${n.map(s=>s.name).join(", ")}`}),r.length>0&&t.push({code:"honeypot.decoyChecked",detail:`おとりチェックボックスがオン: ${r.map(s=>s.name).join(", ")}`}),typeof e.expectedFieldCount=="number"&&e.fields.length<e.expectedFieldCount&&t.push({code:"honeypot.fieldMissing",detail:`注入 ${e.expectedFieldCount} 件に対し送信時 ${e.fields.length} 件`}),e.token&&(e.token.present?e.token.valid||t.push({code:"honeypot.tokenTampered"}):t.push({code:"honeypot.tokenMissing"})),{layer:"honeypot",applicable:!0,signals:t,metrics:{fieldCount:e.fields.length,filledCount:n.length,decoyCount:((a=e.decoys)!=null?a:[]).length,checkedDecoyCount:r.length,tokenPresent:(l=(i=e.token)==null?void 0:i.present)!=null?l:null,tokenValid:(d=(u=e.token)==null?void 0:u.valid)!=null?d:null}}};var B={$schema:"./ng-words.schema.json",version:1,updated:"2026-08-19",locale:["ja","en"],notes:["categories[].score は『1語ヒットするごとに加算される点数』。マイナス値を書くと減点(=正当な問い合わせらしさ)として働く。","categories[].cap は、そのカテゴリ単体で加算できる点数の上限(マイナスカテゴリでは下限)。1カテゴリに語を大量に並べても暴走しないための安全弁。","terms は部分一致。比較前に小文字化・全角英数の半角化・空白の正規化を行うので、リストは小文字・半角で書く。","patterns は JavaScript 正規表現のソース文字列(フラグは gi 固定)。1つのパターンがマッチしたら1ヒットとして score を加算する。","allowlist.terms に含まれる語が本文にあると、その語に内包される NG ワードのヒットを1件ずつ打ち消す(誤検知の抑制)。","追記の作法: 既存カテゴリへは score/cap を変えずに terms を1語ずつ追加する。新カテゴリは id を kebab-case、score は絶対値 1〜4 に収めるのが目安。"],categories:[{id:"cold-open",label:"面識のない相手への定型的な前置き",score:3,cap:9,terms:["突然のご連絡","突然のメール","初めてご連絡","はじめてご連絡","初めてメール","ご担当者様","ご担当者さま","担当者様","web担当者様","採用ご担当者様","貴社","御社","ホームページを拝見","サイトを拝見","hpを拝見","問い合わせフォームより失礼","フォームより失礼","お問い合わせフォームから失礼"],patterns:["(株式会社|合同会社|有限会社)[^\\s、。,.]{1,14}の[^\\s、。,.]{1,12}と申します","^[\\s\\S]{0,60}(と申します|と言います)[\\s\\S]{0,120}(ご提案|ご案内|ご紹介)"]},{id:"sales-offer",label:"提案・紹介の申し出",score:3,cap:9,terms:["ご提案","提案させて","ご案内させて","ご紹介させて","ご紹介したく","ご案内したく","弊社サービス","当社サービス","弊社では","当社では","弊社商品","お役立ていただける","お力添えできる","お手伝いできる","導入のご検討","営業支援","販路拡大","代理店募集","業務提携","アライアンス"]},{id:"benefit-claim",label:"効果・成果の売り込み",score:2,cap:8,terms:["課題解決","課題を解決","お悩みを解決","売上向上","売上アップ","売上が伸び","コスト削減","コストカット","業務効率化","生産性向上","工数削減","集客力","集客につながる","成約率","問い合わせ数を増","リード獲得","新規開拓","劇的に改善","大幅に改善","劇的に向上","利益率が改善"]},{id:"proof-authority",label:"実績・権威づけ",score:2,cap:6,terms:["導入実績","導入企業","実績多数","導入社数","導入事例","事例集","上場企業","大手企業様","大手企業を中心に","業界no.1","シェアno.1","顧客満足度no.1","特許取得","テレビで紹介","メディア掲載"]},{id:"cta-meeting",label:"商談・面談への誘導",score:3,cap:9,terms:["無料相談","無料でご相談","無料トライアル","無料デモ","無料診断","無料分析","無料でお試し","資料をお送り","資料送付","お打ち合わせ","打ち合わせのお時間","オンライン面談","web会議","zoomにて","お電話にて","30分ほど","30分だけ","15分ほど","日程調整","ご都合のよい","ご都合の良い","ご都合のつく","候補日","面談のご依頼","ご挨拶の機会"]},{id:"price-bait",label:"価格・期間限定の煽り",score:2,cap:6,terms:["初期費用0円","初期費用無料","初期費用ゼロ","成果報酬","完全成果報酬","業界最安","特別価格","特別条件","キャンペーン中","今だけ","期間限定","限定5社","限定10社","枠が埋まり","残りわずか"]},{id:"web-marketing",label:"Web制作・広告・SEO系の売り込み",score:3,cap:9,terms:["seo対策","seo施策","検索順位","上位表示","被リンク","外部リンク対策","meo対策","リスティング広告","web広告運用","広告運用代行","ホームページ制作","hp制作","サイトリニューアル","lp制作","ランディングページ制作","instagram運用代行","sns運用代行","youtube運用","アクセス解析","maツール","crm導入","生成aiの導入支援","dx推進支援"]},{id:"recruit-hr",label:"人材・採用系の売り込み",score:3,cap:6,terms:["人材紹介","人材派遣","採用支援","採用代行","求人広告のご案内","エンジニアのご紹介","即戦力人材","オフショア開発","ニアショア","常駐可能","業務委託でのご協力","フリーランス人材"]},{id:"finance-legal",label:"資金・節税・コスト削減系の売り込み",score:3,cap:6,terms:["資金調達","ファクタリング","つなぎ融資","助成金","補助金申請","補助金の採択","節税対策","保険の見直し","電気代の削減","通信費の削減","オフィス移転のご相談"]},{id:"mass-mail-boilerplate",label:"一斉送信の痕跡（配信停止文・免責文）",score:4,cap:8,terms:["配信停止","配信の停止","心当たりのない場合","心当たりがない場合","お心当たりのない","ご不要でしたら","不要な場合はご返信","今後のご案内を希望されない","重複してお送り","本メールは営業目的","掲載情報をもとに","公開情報をもとに","ホームページに掲載されている情報","unsubscribe","opt out","opt-out"]},{id:"signature-block",label:"署名ブロック（会社情報の列挙）",score:2,cap:6,terms:["tel:","fax:","e-mail:","所在地:","事業内容:","営業部","マーケティング部","事業開発部"],patterns:["〒\\s*\\d{3}[-ー－]?\\d{4}","0\\d{1,3}[-(]\\d{2,4}[-)]\\d{3,4}"]},{id:"english-outreach",label:"英語のコールドアプローチ定型句",score:3,cap:12,terms:["dear sir","dear madam","to whom it may concern","i hope this email finds you well","i hope you are doing well","hope this message finds you","we specialize in","we specialise in","we are a leading","increase your sales","boost your traffic","grow your business","first page of google","rank higher on google","backlinks","guest post","link building","seo services","web design services","outsourcing partner","dedicated developers","let me know if you are interested","book a call","schedule a quick call","15-minute call","no obligation","free quote","free audit"]},{id:"legit-inquiry",label:"正当な問い合わせらしさ（減点）",score:-3,cap:-12,terms:["見積","納期","在庫","購入したい","購入を検討","注文","発注","予約","キャンセル","返品","交換","修理","故障","不具合","エラーが出","動作しない","ログインできない","パスワードを忘れ","領収書","請求書の","支払い方法","料金について知りたい","使い方がわからない","使い方を教えて","取材のご依頼","求人に応募","応募したい","採用に応募","体験してみたい","見学","空き状況"]}],allowlist:{notes:"ここに書かれた語が本文にあると、その語に内包される NG ワードのヒットを1件打ち消す。『貴社』『無料相談』などで誤検知しやすいケースに使う。",terms:["貴社製品を購入","御社の製品を購入","貴社の求人","御社の求人","無料相談の予約","資料送付いただいた件","先日ご提案いただいた"]}},z={$schema:"./weights.schema.json",version:1,updated:"2026-08-19",notes:["各レイヤーは『シグナル(code)』を出力し、scoring がここに書かれた points を引いて加算する。","シグナルは 0〜1 の intensity を持つことができ、加点は points * intensity になる(既定は 1)。","レイヤーのスコア = clamp(シグナル加点の合計 / saturation, 0, 1)。saturation はそのレイヤーが満点になる点数。","レイヤーは group に属する。group スコア = Σ(レイヤースコア * weight) / Σ(判定できたレイヤーの weight)。テレメトリが取れず判定不能なレイヤーは母数から外れるので、モバイルでポインタ軌跡が取れないだけでスコアが動くことはない。","weight はグループ内での相対的な重み。グループごとに合計 1.0 になるように書く。","layers[].evidenceOnly を true にすると、そのレイヤーは加点があるときだけ母数に入る。ハニーポットは『引っかかれば決定的な証拠、無反応なら何の情報でもない』ため true にしている。","総合スコア = combine で決める。noisy-or では 1 - Π(1 - groupスコア * groupの weight)。『bot らしさ』と『営業らしさ』は独立した疑いなので、どちらか一方だけでもしきい値に到達できるようにするための既定値。weighted-mean にすると groups[].weight による加重平均になる。","hardBlock に挙げた code が1つでも立つと、他のスコアに関係なく block になる。","points に未登録の code は 0 点として扱われ、result.warnings に列挙される(タイポ検知用)。","チューニングの目安: まず thresholds を動かし、次に layers[].weight、最後に個別の points を触る。"],thresholds:{review:.4,block:.62},hardBlock:["honeypot.filled","honeypot.decoyChecked"],layers:{honeypot:{label:"Layer 1 ハニーポット",group:"automation",weight:.12,evidenceOnly:!0,saturation:4,points:{"honeypot.filled":4,"honeypot.decoyChecked":4,"honeypot.fieldMissing":2,"honeypot.tokenMissing":2,"honeypot.tokenTampered":3}},behavior:{label:"Layer 2 行動解析",group:"automation",weight:.28,saturation:6,points:{"behavior.instantSubmit":4,"behavior.fastSubmit":2.5,"behavior.noMouseActivity":2,"behavior.noFocusEvents":2,"behavior.impossibleTypingSpeed":3,"behavior.noKeystrokes":2.5,"behavior.pastedBody":1.5,"behavior.staleForm":1},tuning:{instantSubmitMs:1500,fastSubmitMs:5e3,staleFormMs:72e5,maxPlausibleCharsPerMinute:1200,minMouseSamples:3,pastedCharsThreshold:120}},environment:{label:"Layer 2.5 自動化ブラウザの痕跡",group:"automation",weight:.22,saturation:6,points:{"env.webdriver":4,"env.headlessUserAgent":4,"env.automationUserAgent":3,"env.botUserAgent":3,"env.noPlugins":1.5,"env.chromeObjectMissing":2,"env.noLanguages":2,"env.viewportEqualsScreen":1.5,"env.zeroOuterWindow":1.5,"env.touchInconsistency":1.5,"env.suspiciousHardwareConcurrency":1,"env.permissionsInconsistency":1.5},tuning:{headlessMarkers:["headlesschrome","headless"],automationMarkers:["puppeteer","playwright","selenium","phantomjs","webdriver"],botUserAgentMarkers:["bot","crawler","spider","python-requests","curl/","wget/","axios/","okhttp","scrapy","http-client"]}},mimicry:{label:"Layer 2.6 『不自然な自然さ』検知",group:"automation",weight:.26,saturation:5,points:{"mimicry.uniformMouseSpeed":2,"mimicry.straightMousePath":2,"mimicry.quantizedMouseSteps":2,"mimicry.uniformKeyIntervals":2.5,"mimicry.quantizedKeyIntervals":2,"mimicry.uniformFieldTransitions":1.5,"mimicry.noJitter":1.5},tuning:{minMouseSamples:12,minKeyIntervals:8,minFieldTransitions:3,mouseSpeedCvFloor:.18,keyIntervalCvFloor:.22,fieldTransitionCvFloor:.12,straightnessCeiling:.985,quantizedRatioCeiling:.6,jitterFloorPx:.75}},checkbox:{label:"Layer 3 チェックボックス認証",group:"automation",weight:.12,saturation:4,points:{"checkbox.unchecked":3,"checkbox.programmaticCheck":4,"checkbox.instantCheck":2,"checkbox.noPointerTrail":1.5,"checkbox.excessiveToggles":1},tuning:{instantCheckMs:250,minPointerTrail:1,maxToggles:6}},content:{label:"Layer 4 営業文面判定",group:"sales",weight:.75,saturation:6,points:{"content.ngWords":4,"content.urlSpam":2,"content.companyIntroOpening":2,"content.signatureBlock":1.5,"content.noJapaneseOnJapaneseForm":1},tuning:{minChars:24,ngScoreSaturation:12,freeUrlAllowance:1,urlSaturation:4,companyIntroHeadChars:120}},aiText:{label:"Layer 6 AI生成文っぽさ判定",group:"sales",weight:.25,saturation:5,points:{"ai.uniformSentenceLength":2,"ai.politeTemplateDensity":2,"ai.lowBurstiness":1.5,"ai.structuredListing":1,"ai.noTypos":1},tuning:{minChars:80,minSentences:4,sentenceLengthCvFloor:.32,politePhraseDensityCeiling:.012,burstinessFloor:.35,humanNoiseMarkers:["！！","。。","、、","www","笑","すみません","ごめん","ちょっと","とりあえず","よろしくです","！？","?!"],politePhrases:["いただければ","いただけますと","いただけますでしょうか","させていただき","させていただければ","ご検討いただ","幸いです","幸甚","存じます","お忙しいところ","お忙しい中","何卒","よろしくお願い申し上げます","ご確認のほど","恐れ入りますが","誠に","つきましては","なお、","また、","さらに、"]}}},combine:"noisy-or",groups:{automation:{label:"自動化・bot の疑い",weight:1},sales:{label:"営業・勧誘目的の疑い",weight:1}}};var Re={"honeypot.filled":"人間には見えない隠しフィールドに入力があった","honeypot.decoyChecked":"人間なら触らないおとりのチェックボックスがオンになっていた","honeypot.fieldMissing":"注入した隠しフィールドが削除されていた","honeypot.tokenMissing":"フォームに埋め込んだトークンが欠落していた","honeypot.tokenTampered":"フォームに埋め込んだトークンが改ざんされていた","behavior.instantSubmit":"表示から送信までが短すぎる","behavior.fastSubmit":"入力にかけた時間が不自然に短い","behavior.noMouseActivity":"マウス／タッチの操作がまったく観測されなかった","behavior.noFocusEvents":"入力欄へのフォーカス操作が観測されなかった","behavior.impossibleTypingSpeed":"人間には出せない速度で文字が入力された","behavior.noKeystrokes":"キー入力なしで本文が埋まっていた","behavior.pastedBody":"本文がまとめて貼り付けられた","behavior.staleForm":"フォームを開いたまま長時間放置されていた","env.webdriver":"ブラウザ自動化フラグ (navigator.webdriver) が立っている","env.headlessUserAgent":"ヘッドレスブラウザの User-Agent","env.automationUserAgent":"自動化ツールの User-Agent","env.botUserAgent":"クローラー／HTTP クライアントの User-Agent","env.noPlugins":"プラグインが 1 つも存在しない","env.chromeObjectMissing":"Chromium 系なのに window.chrome が存在しない","env.noLanguages":"言語設定が空","env.viewportEqualsScreen":"ビューポートと画面解像度が完全に一致している","env.zeroOuterWindow":"ウィンドウの外形サイズが 0","env.touchInconsistency":"タッチ対応の申告と実際の操作が矛盾している","env.suspiciousHardwareConcurrency":"CPU コア数の申告が不自然","env.permissionsInconsistency":"通知許可の状態に矛盾がある","mimicry.uniformMouseSpeed":"マウス速度のばらつきが小さすぎる","mimicry.straightMousePath":"マウス軌跡が直線的すぎる","mimicry.quantizedMouseSteps":"マウスの移動量が等間隔に量子化されている","mimicry.uniformKeyIntervals":"キー入力間隔が一定すぎる","mimicry.quantizedKeyIntervals":"キー入力間隔が特定の値に張り付いている","mimicry.uniformFieldTransitions":"入力欄の移動間隔が一定すぎる","mimicry.noJitter":"ポインタの微細な揺れがない","checkbox.unchecked":"確認チェックボックスがオンになっていない","checkbox.programmaticCheck":"チェックがスクリプトから操作された","checkbox.instantCheck":"表示直後にチェックされた","checkbox.noPointerTrail":"チェック前のポインタ操作が観測されなかった","checkbox.excessiveToggles":"チェックの切り替え回数が異常に多い","content.ngWords":"営業文面に典型的な表現が含まれている","content.urlSpam":"本文に含まれる URL が多い","content.companyIntroOpening":"冒頭が法人格つきの自己紹介で始まっている","content.signatureBlock":"会社情報を並べた署名ブロックがある","content.noJapaneseOnJapaneseForm":"日本語フォームに日本語がまったく含まれていない","ai.uniformSentenceLength":"文の長さが均質すぎる","ai.politeTemplateDensity":"定型的な丁寧表現の密度が高い","ai.lowBurstiness":"文章のリズムに揺らぎがない","ai.structuredListing":"箇条書き中心の整った構成になっている","ai.noTypos":"口語的な崩れや打ち間違いがまったくない"},vn=Object.keys(Re),Oe=e=>{var t;return(t=Re[e])!=null?t:e};var Ot={honeypot:"Layer 1 ハニーポット",behavior:"Layer 2 行動解析",environment:"Layer 2.5 自動化ブラウザの痕跡",mimicry:"Layer 2.6 不自然な自然さ",checkbox:"Layer 3 チェックボックス認証",content:"Layer 4 営業文面判定",aiText:"Layer 6 AI生成文っぽさ"},Pt={automation:"自動化・bot の疑い",sales:"営業・勧誘目的の疑い"},$t=["automation","sales"],Pe=(e,t,n=!1)=>n||e>=t.block?"block":e>=t.review?"review":"pass",J=(e,t)=>{var f,y,x,k,_,L,M,C,S;let n=[],r=new Set((f=t.hardBlock)!=null?f:[]),o=[],a=new Map,i=!1;for(let c of e){let b=t.layers[c.layer];b||n.push(`weights.json に layers.${c.layer} の定義がありません`);let E=(y=b==null?void 0:b.points)!=null?y:{},$=(x=b==null?void 0:b.saturation)!=null?x:1,A=(k=b==null?void 0:b.weight)!=null?k:0,T=(_=b==null?void 0:b.group)!=null?_:"automation",I=c.signals.map(R=>{var we;let Q=P((we=R.intensity)!=null?we:1),Z=E[R.code];return Z===void 0&&n.push(`weights.json に layers.${c.layer}.points["${R.code}"] がありません`),r.has(R.code)&&(i=!0),{code:R.code,intensity:w(Q),points:w((Z!=null?Z:0)*Q),label:Oe(R.code),...R.detail?{detail:R.detail}:{}}}),F=I.reduce((R,Q)=>R+Q.points,0),W=P(F/$),X=c.applicable&&A>0&&((b==null?void 0:b.evidenceOnly)!==!0||F>0);if(X){let R=(L=a.get(T))!=null?L:{weighted:0,weight:0};R.weighted+=W*A,R.weight+=A,a.set(T,R)}o.push({layer:c.layer,label:(C=(M=b==null?void 0:b.label)!=null?M:Ot[c.layer])!=null?C:c.layer,group:T,weight:A,applicable:c.applicable,counted:X,score:w(W),points:w(F),saturation:$,signals:I,metrics:c.metrics,...c.skipped?{skipped:c.skipped}:{}})}let u=[...new Set([...$t,...o.map(c=>c.group)])].map(c=>{var $,A,T,I;let b=a.get(c),E=($=t.groups)==null?void 0:$[c];return{group:c,label:(T=(A=E==null?void 0:E.label)!=null?A:Pt[c])!=null?T:c,weight:(I=E==null?void 0:E.weight)!=null?I:1,score:b&&b.weight>0?w(b.weighted/b.weight):0,applicable:!!(b&&b.weight>0)}}),d=u.filter(c=>c.applicable),s=0;if(d.length>0)if(((S=t.combine)!=null?S:"noisy-or")==="weighted-mean"){let c=d.reduce((b,E)=>b+E.weight,0);s=c>0?d.reduce((b,E)=>b+E.score*E.weight,0)/c:0}else s=1-d.reduce((c,b)=>c*(1-P(b.score*b.weight)),1);s=w(P(s));let m=Pe(s,t.thresholds,i),h=o.filter(c=>c.applicable).flatMap(c=>c.signals).filter(c=>c.points>0||r.has(c.code)),p=[...h.filter(c=>r.has(c.code)),...h.filter(c=>!r.has(c.code)).sort((c,b)=>b.points-c.points)].slice(0,6).map(c=>c.detail?`${c.label}（${c.detail}）`:c.label);return{score:s,groups:u,verdict:m,hardBlocked:i,thresholds:t.thresholds,layers:o,reasons:p,warnings:[...new Set(n)]}};var Ne=(e,t={})=>{var a,i;let n=(a=t.weights)!=null?a:z,r=(i=t.ngWords)!=null?i:B,o=[Ie(e.honeypot),Me(e.behavior,n.layers.behavior),Te(e.environment,n.layers.environment),Le(e.behavior,n.layers.mimicry),Ee(e.checkbox,n.layers.checkbox),G(e.content,n.layers.content,r),V(e.content,n.layers.aiText)];return J(o,n)},$e=e=>typeof e=="object"&&e!==null&&!Array.isArray(e),pe=(e,t)=>{let n=(r,o)=>{if(!$e(o))return o===void 0?r:o;let a=$e(r)?{...r}:{};for(let[i,l]of Object.entries(o))a[i]=n(a[i],l);return a};return n(e,t)},be=(e,t)=>{var r,o,a,i,l,u,d,s;if(!t)return e;let n=new Map(e.categories.map(m=>[m.id,{...m}]));for(let m of(r=t.categories)!=null?r:[]){let h=n.get(m.id);if(!h){n.set(m.id,m);continue}n.set(m.id,{...h,...m,terms:[...new Set([...h.terms,...(o=m.terms)!=null?o:[]])],patterns:[...new Set([...(a=h.patterns)!=null?a:[],...(i=m.patterns)!=null?i:[]])]})}return{...e,...t,categories:[...n.values()],allowlist:{...e.allowlist,...t.allowlist,terms:[...new Set([...(u=(l=e.allowlist)==null?void 0:l.terms)!=null?u:[],...(s=(d=t.allowlist)==null?void 0:d.terms)!=null?s:[]])]}}};var Nt=["position:absolute !important","left:-9999px !important","top:auto !important","width:1px !important","height:1px !important","overflow:hidden !important","opacity:0 !important","pointer-events:none !important"].join(";"),Fe=e=>{let t=2166136261;for(let n=0;n<e.length;n+=1)t^=e.charCodeAt(n),t=Math.imul(t,16777619)>>>0;return t.toString(36)},We=(e,t={})=>{var p;let n=e.ownerDocument,r=(p=t.prefix)!=null?p:"mb",o=Date.now(),a=`${Math.random().toString(36).slice(2)}${o.toString(36)}`,i=n.createElement("div");i.setAttribute("aria-hidden","true"),i.setAttribute("data-miyabarrier","honeypot"),i.setAttribute("style",Nt);let l=[`${r}_website`,`${r}_company_url`],u=`${r}_sales_optin`,d=`${r}_t`;for(let f of l){let y=n.createElement("input");y.type="text",y.name=f,y.tabIndex=-1,y.autocomplete="off",y.setAttribute("aria-hidden","true");let x=n.createElement("label");x.textContent=f.includes("url")?"Company URL":"Website",x.setAttribute("aria-hidden","true"),i.append(x,y)}let s;if(t.decoy!==!1){s=n.createElement("input"),s.type="checkbox",s.name=u,s.tabIndex=-1,s.setAttribute("aria-hidden","true");let f=n.createElement("label");f.textContent="営業目的の連絡を希望します",f.setAttribute("aria-hidden","true"),i.append(s,f)}let m=n.createElement("input");return m.type="hidden",m.name=d,m.setAttribute("aria-hidden","true"),m.value=`${o}.${Fe(`${o}${a}`)}`,i.append(m),e.append(i),{names:[...l,...s?[u]:[]],state(){var C;let f=l.map(S=>{var b;let c=i.querySelector(`input[name="${S}"]`);return{name:S,value:(b=c==null?void 0:c.value)!=null?b:""}}),y=l.filter(S=>i.querySelector(`input[name="${S}"]`)).length,x=i.querySelector(`input[name="${d}"]`),k=(C=x==null?void 0:x.value)!=null?C:"",[_,L]=k.split("."),M=!!_&&L===Fe(`${_}${a}`)&&Number(_)===o;return{fields:f,decoys:s?[{name:u,checked:s.checked}]:[],expectedFieldCount:y===0?l.length:y,token:{present:k.length>0,valid:M}}},destroy(){i.remove()}}},Ft=/(name|氏名|お名前|担当|company|会社|法人|organization)/i,Wt=new Set(["password","hidden","submit","button","reset","file","image","checkbox","radio","range","color"]),Ht=new Set(["email","tel","url","number","date","time","datetime-local"]),he=e=>{var i,l;let t=[],n="",r="",o=0,a=e.querySelectorAll("input, textarea");for(let u of a){if(u.closest("[data-miyabarrier]")||u instanceof HTMLInputElement&&Wt.has(u.type))continue;let d=(i=u.value)!=null?i:"";if(d.length===0)continue;o+=d.length;let s=u instanceof HTMLInputElement?u.type:"textarea",m=`${u.name} ${u.id} ${(l=u.getAttribute("placeholder"))!=null?l:""}`;!n&&Ft.test(m)&&(n=d),!r&&(s==="email"||/mail/i.test(m))&&(r=d.trim()),!Ht.has(s)&&t.push(d)}return{text:t.join(`
`),senderName:n,email:r,typedChars:o}},He=(e,t)=>t?[...e.querySelectorAll(t)]:[...e.querySelectorAll("form")].filter(n=>{if(n.getAttribute("data-miyabarrier")==="off"||n.querySelector('input[type="password"]'))return!1;let r=n.querySelector("textarea")!==null,o=n.querySelectorAll('input[type="text"], input[type="email"], input:not([type])').length>=2;return r||o});var Dt=e=>e.length===1||e==="Backspace"||e==="Enter"||e==="Process"||e==="Unidentified",U=(e,t,n)=>{e.push(t),e.length>n&&e.shift()},De=e=>e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement,ne=e=>e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement?e.name||e.id||e.type:e instanceof HTMLSelectElement?e.name||e.id||"select":"unknown",re=class{constructor(t,n=t.ownerDocument){this.form=t;this.doc=n;this.renderedAt=Date.now();this.pointer=[];this.keys=[];this.focus=[];this.pastes=[];this.touchEventCount=0;this.lastPointerSampleAt=0;this.lastKeyAt=0;this.lastPasteAt=0;this.fieldLengths=new Map;this.detachers=[];this.attach(),this.probePermissions()}on(t,n,r){let o=r,a={passive:!0,capture:!0};t.addEventListener(n,o,a),this.detachers.push(()=>t.removeEventListener(n,o,a))}attach(){this.on(this.doc,"pointermove",t=>{let n=Date.now();n-this.lastPointerSampleAt<40||(this.lastPointerSampleAt=n,U(this.pointer,{x:t.clientX,y:t.clientY,t:n},400))}),this.on(this.doc,"pointerdown",t=>{U(this.pointer,{x:t.clientX,y:t.clientY,t:Date.now()},400)}),this.on(this.doc,"touchstart",()=>{this.touchEventCount+=1}),this.on(this.form,"keydown",t=>{Dt(t.key)&&(this.lastKeyAt=Date.now(),U(this.keys,{t:this.lastKeyAt,field:ne(t.target)},600))}),this.on(this.form,"input",t=>{var l,u,d;let n=t.target;if(!De(n)||n instanceof HTMLSelectElement)return;let r=ne(n),o=(u=(l=n.value)==null?void 0:l.length)!=null?u:0,a=o-((d=this.fieldLengths.get(r))!=null?d:0);this.fieldLengths.set(r,o);let i=Date.now();a>=20?i-this.lastPasteAt>50&&U(this.pastes,{field:r,t:i,length:a},100):i-this.lastKeyAt>50&&U(this.keys,{t:i,field:r},600)}),this.on(this.form,"focusin",t=>{let n=t.target;De(n)&&U(this.focus,{field:ne(n),t:Date.now()},100)}),this.on(this.form,"paste",t=>{var r,o;let n=(o=(r=t.clipboardData)==null?void 0:r.getData("text"))!=null?o:"";this.lastPasteAt=Date.now(),U(this.pastes,{field:ne(t.target),t:this.lastPasteAt,length:n.length},100)})}probePermissions(){var t,n;try{let r=(n=(t=this.doc.defaultView)==null?void 0:t.navigator)==null?void 0:n.permissions;r==null||r.query({name:"notifications"}).then(o=>{this.permissionsQueryState=o.state}).catch(()=>{})}catch{}}pointerSampleCount(){return this.pointer.length+this.touchEventCount}behavior(t,n=Date.now()){return{renderedAt:this.renderedAt,submittedAt:n,pointer:[...this.pointer],keys:[...this.keys],focus:[...this.focus],pastes:[...this.pastes],typedChars:t,touchEventCount:this.touchEventCount}}environment(){var t;return Ut((t=this.doc.defaultView)!=null?t:void 0,this.permissionsQueryState)}destroy(){for(let t of this.detachers)t();this.detachers.length=0}},Bt=/(chrome|chromium|crios|edg\/|opr\/)/i,Ut=(e,t)=>{var u,d,s,m;let n=e!=null?e:typeof window=="undefined"?void 0:window,r=n==null?void 0:n.navigator,o=(u=r==null?void 0:r.userAgent)!=null?u:"",a;try{a=(d=r==null?void 0:r.plugins)==null?void 0:d.length}catch{a=void 0}let i;try{i=n&&"Notification"in n?n.Notification.permission:void 0}catch{i=void 0}let l={userAgent:o,webdriver:(r==null?void 0:r.webdriver)===!0,isChromium:Bt.test(o),hasChromeObject:n?"chrome"in n:void 0,languages:r!=null&&r.languages?[...r.languages]:r!=null&&r.language?[r.language]:[],screenWidth:(s=n==null?void 0:n.screen)==null?void 0:s.width,screenHeight:(m=n==null?void 0:n.screen)==null?void 0:m.height,innerWidth:n==null?void 0:n.innerWidth,innerHeight:n==null?void 0:n.innerHeight,outerWidth:n==null?void 0:n.outerWidth,outerHeight:n==null?void 0:n.outerHeight,devicePixelRatio:n==null?void 0:n.devicePixelRatio,hardwareConcurrency:r==null?void 0:r.hardwareConcurrency,maxTouchPoints:r==null?void 0:r.maxTouchPoints};return a!==void 0&&(l.pluginCount=a),i!==void 0&&(l.notificationPermission=i),t!==void 0&&(l.permissionsQueryState=t),l};var oe="miyabarrier:log",ge=()=>{try{let e=localStorage.getItem(oe),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}},Be=(e,t)=>{try{let n=[...ge(),e].slice(-Math.max(1,t));localStorage.setItem(oe,JSON.stringify(n))}catch{}},Ue=()=>{try{localStorage.removeItem(oe)}catch{}};var fe="miyabarrier:counter",ze={enabled:!1,minSalesScore:.6,subject:"ご連絡ありがとうございます（{{site}} より）",body:`{{name}} 様

お問い合わせフォームよりご連絡いただきありがとうございます。
いただいた内容は営業・勧誘のご案内と判断したため、恐れ入りますが対応いたしかねます。

せっかくのご縁ですので、こちらからもご案内をお送りいたします。
（ここに自社のサービス紹介を書いてください）

{{site}}
`,showOnScreen:!0,queueLimit:50},jt=/^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/,zt=e=>e.length<=254&&jt.test(e.trim()),Ke=(e,t)=>e.enabled?t.verdict==="pass"?{ok:!1,reason:"通過した送信"}:t.salesApplicable?t.salesScore<e.minSalesScore?{ok:!1,reason:`営業らしさ ${t.salesScore.toFixed(2)} がしきい値未満`}:zt(t.email)?{ok:!0}:{ok:!1,reason:"有効なメールアドレスがない"}:{ok:!1,reason:"文面が判定対象外（短すぎるなど）"}:{ok:!1,reason:"無効"},je=(e,t)=>e.replace(/\{\{\s*(\w+)\s*\}\}/g,(n,r)=>{switch(r){case"name":return t.name||"ご担当者";case"email":return t.email;case"score":return t.score.toFixed(2);case"salesScore":return t.salesScore.toFixed(2);case"reasons":return t.reasons.join(`
`);case"site":return t.site;case"path":return t.path;case"date":return t.at.slice(0,10);default:return""}}),qe=(e,t)=>({to:t.email.trim(),subject:je(e.subject,t).replace(/\s+/g," ").trim(),body:je(e.body,t),context:t}),ye=()=>{try{let e=localStorage.getItem(fe),t=e?JSON.parse(e):[];return Array.isArray(t)?t:[]}catch{return[]}},Ge=(e,t)=>{try{let n=ye();if(n.some(o=>o.to.toLowerCase()===e.to.toLowerCase()))return"duplicate";let r=[...n,e].slice(-Math.max(1,t));return localStorage.setItem(fe,JSON.stringify(r)),"queued"}catch{return"failed"}};var Ve=()=>{try{localStorage.removeItem(fe)}catch{}},Je=e=>`mailto:${encodeURIComponent(e.to)}?subject=${encodeURIComponent(e.subject)}&body=${encodeURIComponent(e.body)}`;var Kt={strokeWidth:.8,rings:14,offset:16,radius:33,innerRadius:12,flatten:.64,tilt:116,drift:11},Ye={rings:5,strokeWidth:2.2,innerRadius:16,drift:6},qt=(e,t)=>{let n=[],r=e*Math.PI/180;for(let o=0;o<t.rings;o+=1){let a=t.rings===1?1:o/(t.rings-1),i=t.innerRadius+(t.radius-t.innerRadius)*a,l=i*t.flatten,u=t.offset+(1-a)*t.drift,d=Math.cos(r)*u,s=Math.sin(r)*u,m=e+t.tilt,h=(.45+.55*(1-a*.55)).toFixed(3);n.push(`<ellipse cx="${d.toFixed(2)}" cy="${s.toFixed(2)}" rx="${i.toFixed(2)}" ry="${l.toFixed(2)}" transform="rotate(${m.toFixed(1)} ${d.toFixed(2)} ${s.toFixed(2)})" opacity="${h}"/>`)}return n.join("")},ie=(e={})=>{var l;let t={...Kt,...e},n=(l=e.idPrefix)!=null?l:"mb-logo",r=e.monochrome?"currentColor":`url(#${n}-grad)`,o=e.monochrome?"currentColor":`url(#${n}-core)`,a=Array.from({length:3},(u,d)=>qt(d*(360/3)-96,t)).join("");return`<svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">${e.monochrome?"":`<defs>
<linearGradient id="${n}-grad" x1="-38" y1="-42" x2="34" y2="44" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="var(--mb-brand-400, #5b8df0)"/>
<stop offset="0.5" stop-color="var(--mb-brand-600, #2a5bd7)"/>
<stop offset="1" stop-color="var(--mb-brand-700, #1e46ad)"/>
</linearGradient>
<radialGradient id="${n}-core" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" stop-color="var(--mb-brand-700, #1e46ad)"/>
<stop offset="1" stop-color="var(--mb-brand-600, #2a5bd7)" stop-opacity="0"/>
</radialGradient></defs>`}<g stroke="${r}" stroke-width="${t.strokeWidth}">${a}</g><ellipse cx="-2" cy="1" rx="12" ry="10" fill="${o}" opacity="${e.monochrome?.5:.85}"/></svg>`};var Xe=`
  color-scheme: light dark;

  /* Miyabee ブルー */
  --mb-brand-050: #eef3fe;
  --mb-brand-100: #dbe6fc;
  --mb-brand-200: #bcd0f8;
  --mb-brand-400: #5b8df0;
  --mb-brand-500: #3b72e8;
  --mb-brand-600: #2a5bd7;
  --mb-brand-700: #1e46ad;
  --mb-brand-800: #17357f;

  /* 面と線（わずかに青を含ませて、無彩色のグレーにしない） */
  --mb-canvas: #f6f8fc;
  --mb-surface: #ffffff;
  --mb-surface-2: #fbfcfe;
  --mb-surface-inset: #f2f5fa;
  --mb-line: #e3e8f1;
  --mb-line-strong: #cfd7e6;

  /* 文字 */
  --mb-ink-900: #0c1220;
  --mb-ink-700: #26314a;
  --mb-ink-500: #5b6780;
  --mb-ink-400: #7c879c;
  --mb-ink-300: #a3adbf;

  /* 判定の意味色。彩度を抑え、面ではなく点・細い帯で使う */
  --mb-block: #c0413a;
  --mb-block-soft: #fdf2f1;
  --mb-block-line: #f0cfcc;
  --mb-review: #9a6a12;
  --mb-review-soft: #fdf6e9;
  --mb-review-line: #ecdcba;
  --mb-pass: #1f7a5c;
  --mb-pass-soft: #eff8f4;
  --mb-pass-line: #c6e5d8;

  /* 高さ（影は極薄に留め、境界線で構造を作る） */
  --mb-shadow-sm: 0 1px 2px rgba(12, 18, 32, 0.04);
  --mb-shadow-md: 0 4px 16px -4px rgba(12, 18, 32, 0.1), 0 1px 2px rgba(12, 18, 32, 0.04);
  --mb-shadow-lg: 0 18px 48px -12px rgba(12, 18, 32, 0.22), 0 2px 6px rgba(12, 18, 32, 0.06);
  --mb-ring: 0 0 0 3px rgba(42, 91, 215, 0.16);

  /* 角丸・間隔 */
  --mb-r-sm: 6px;
  --mb-r-md: 10px;
  --mb-r-lg: 14px;
  --mb-r-full: 999px;

  /* 書体 */
  --mb-font: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Hiragino Sans',
    'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic UI', sans-serif;
  --mb-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Mono', Menlo, Consolas, monospace;`,Qe=`
  --mb-brand-050: #101a2e;
  --mb-brand-100: #16233d;
  --mb-brand-200: #24365c;
  --mb-brand-400: #6f9bf5;
  --mb-brand-500: #5b8df0;
  --mb-brand-600: #7aa6f7;
  --mb-brand-700: #9dbdfa;
  --mb-brand-800: #c3d6fc;

  --mb-canvas: #080b12;
  --mb-surface: #0f141f;
  --mb-surface-2: #131926;
  --mb-surface-inset: #161d2c;
  --mb-line: #212a3b;
  --mb-line-strong: #2f3a4f;

  --mb-ink-900: #eef1f6;
  --mb-ink-700: #ccd3e0;
  --mb-ink-500: #93a0b6;
  --mb-ink-400: #7a8699;
  --mb-ink-300: #5d6878;

  --mb-block: #f18a82;
  --mb-block-soft: #24161a;
  --mb-block-line: #4a2a28;
  --mb-review: #e0b45c;
  --mb-review-soft: #231c10;
  --mb-review-line: #453a1e;
  --mb-pass: #62c69f;
  --mb-pass-soft: #10201b;
  --mb-pass-line: #23453a;

  --mb-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --mb-shadow-md: 0 4px 16px -4px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4);
  --mb-shadow-lg: 0 18px 48px -12px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.5);
  --mb-ring: 0 0 0 3px rgba(122, 166, 247, 0.22);
`;var Bn=`
:root {${Xe}}
@media (prefers-color-scheme: dark) {
  :root {${Qe}}
}
`,Ze=e=>`
${e} {${Xe}}
@media (prefers-color-scheme: dark) {
  ${e} {${Qe}}
}
`;var et="miyabarrier-style",Gt="https://github.com/dronehonpo-byte/miyabarrier",Vt=`
.mb-root {
  font-family: var(--mb-font);
  font-size: 14px;
  line-height: 1.7;
  color: var(--mb-ink-900);
  text-align: left;
  letter-spacing: normal;
  font-feature-settings: 'palt' 1;
  box-sizing: border-box;
}
.mb-root *, .mb-root *::before, .mb-root *::after { box-sizing: border-box; }
.mb-root svg { display: block; }

/* ---------- Layer 3: 確認チェックボックス ---------- */

.mb-guard {
  display: flex;
  align-items: center;
  gap: 0.7em;
  margin: 0.9em 0;
  padding: 0.8em 0.95em;
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-md);
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow-sm);
}
.mb-guard__check {
  display: flex;
  align-items: center;
  gap: 0.6em;
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  cursor: pointer;
  font-size: 0.95em;
  color: var(--mb-ink-900);
}
.mb-guard__box {
  appearance: none;
  -webkit-appearance: none;
  flex: 0 0 auto;
  width: 1.15em;
  height: 1.15em;
  margin: 0;
  border: 1.5px solid var(--mb-line-strong);
  border-radius: 4px;
  background: var(--mb-surface);
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.mb-guard__box:hover { border-color: var(--mb-brand-400); }
.mb-guard__box:checked {
  border-color: var(--mb-brand-600);
  background-color: var(--mb-brand-600);
  /* チェックマークは data URI で描く（外部リソースを増やさない） */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 6.4l2.2 2.2 4.8-5' fill='none' stroke='%23fff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-size: 100% 100%;
}
.mb-guard__box:focus-visible { outline: none; box-shadow: var(--mb-ring); }
.mb-guard__brand {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.35em;
  font-size: 0.72em;
  letter-spacing: 0.02em;
  color: var(--mb-ink-400);
  white-space: nowrap;
}
.mb-guard__brand svg { width: 1.35em; height: 1.35em; }

/* 送信できたとき / 止めたときに、この行の見た目でも状態を伝える */
.mb-guard--verified { border-color: var(--mb-pass-line); background: var(--mb-pass-soft); }
.mb-guard--flagged { border-color: var(--mb-review-line); background: var(--mb-review-soft); }
.mb-guard--blocked { border-color: var(--mb-block-line); background: var(--mb-block-soft); }
.mb-guard__state {
  flex: 0 0 auto;
  display: none;
  align-items: center;
  gap: 0.3em;
  font-size: 0.78em;
  font-weight: 560;
  white-space: nowrap;
}
.mb-guard--verified .mb-guard__state,
.mb-guard--flagged .mb-guard__state,
.mb-guard--blocked .mb-guard__state { display: flex; }
.mb-guard--verified .mb-guard__state { color: var(--mb-pass); }
.mb-guard--flagged .mb-guard__state { color: var(--mb-review); }
.mb-guard--blocked .mb-guard__state { color: var(--mb-block); }
/* 状態が出たらブランド表記は引っ込める（横幅を食い合わないように） */
.mb-guard--verified .mb-guard__brand span,
.mb-guard--flagged .mb-guard__brand span,
.mb-guard--blocked .mb-guard__brand span { display: none; }
.mb-guard__state svg { width: 1.1em; height: 1.1em; }

/* ---------- バッジ ---------- */

/* 送信ボタンと同じ行に並ばないよう、通常のバッジは行を独立させる */
.mb-badge {
  display: flex;
  width: -moz-fit-content;
  width: fit-content;
  align-items: center;
  gap: 0.4em;
  margin: 0.6em 0;
  font-size: 0.75em;
  color: var(--mb-ink-400);
  text-decoration: none;
  letter-spacing: 0.01em;
}
.mb-badge:hover { color: var(--mb-brand-600); text-decoration: none; }
.mb-badge svg { width: 1.25em; height: 1.25em; }
.mb-badge--floating {
  display: inline-flex;
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 2147483000;
  margin: 0;
  padding: 0.45em 0.8em;
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-full);
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow-md);
}

/* ---------- 判定パネル ---------- */

.mb-panel {
  position: relative;
  margin: 1em 0;
  border: 1px solid var(--mb-line);
  border-radius: var(--mb-r-lg);
  background: var(--mb-surface);
  box-shadow: var(--mb-shadow-md);
  overflow: hidden;
}
/* 意味色は左端の帯だけ（面で塗らない） */
.mb-panel::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
}
.mb-panel--block::before { background: var(--mb-block); }
.mb-panel--review::before { background: var(--mb-review); }

.mb-panel__head {
  display: flex;
  align-items: flex-start;
  gap: 0.75em;
  padding: 1em 1.1em 0.85em 1.2em;
}
.mb-panel__icon {
  flex: 0 0 auto;
  width: 2em;
  height: 2em;
  display: grid;
  place-items: center;
  border-radius: var(--mb-r-sm);
  border: 1px solid var(--mb-line);
  background: var(--mb-surface-2);
}
.mb-panel__icon svg { width: 1.35em; height: 1.35em; }
.mb-panel__heading { flex: 1 1 auto; min-width: 0; }
.mb-panel__title {
  margin: 0;
  font-size: 0.95em;
  font-weight: 620;
  letter-spacing: -0.01em;
  line-height: 1.5;
}
.mb-panel--block .mb-panel__title { color: var(--mb-block); }
.mb-panel--review .mb-panel__title { color: var(--mb-review); }
.mb-panel__message {
  margin: 0.2em 0 0;
  font-size: 0.86em;
  color: var(--mb-ink-500);
  line-height: 1.65;
}
.mb-panel__score {
  flex: 0 0 auto;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.mb-panel__score b {
  display: block;
  font-size: 1.2em;
  font-weight: 620;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.mb-panel__score span {
  font-size: 0.68em;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mb-ink-400);
}

/* 疑いの内訳（自動化 / 営業文面） */
.mb-panel__groups {
  display: grid;
  gap: 0.5em;
  padding: 0 1.1em 0.9em 1.2em;
}
.mb-meter {
  display: grid;
  grid-template-columns: 7.5em 1fr 2.4em;
  align-items: center;
  gap: 0.6em;
  font-size: 0.8em;
}
.mb-meter__name {
  color: var(--mb-ink-500);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mb-meter__track {
  height: 5px;
  border-radius: var(--mb-r-full);
  background: var(--mb-surface-inset);
  overflow: hidden;
}
.mb-meter__fill {
  height: 100%;
  border-radius: var(--mb-r-full);
  background: var(--mb-brand-500);
}
.mb-meter__fill--block { background: var(--mb-block); }
.mb-meter__fill--review { background: var(--mb-review); }
.mb-meter__fill--pass { background: var(--mb-pass); }
.mb-meter__value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--mb-ink-700);
}
.mb-meter--muted .mb-meter__value { color: var(--mb-ink-300); }

/* 理由 */
.mb-panel__reasons {
  margin: 0;
  padding: 0.85em 1.1em 0.9em 1.2em;
  list-style: none;
  border-top: 1px solid var(--mb-line);
  background: var(--mb-surface-2);
}
.mb-panel__reasons li {
  display: flex;
  gap: 0.55em;
  font-size: 0.84em;
  color: var(--mb-ink-700);
  line-height: 1.6;
}
.mb-panel__reasons li + li { margin-top: 0.35em; }
.mb-panel__reasons li::before {
  content: '';
  flex: 0 0 auto;
  width: 5px;
  height: 5px;
  margin-top: 0.62em;
  border-radius: 50%;
  background: var(--mb-ink-300);
}
.mb-panel--block .mb-panel__reasons li:first-child::before { background: var(--mb-block); }

/* お返しの営業（相手にその場で読ませる文面） */
.mb-counter {
  border-top: 1px solid var(--mb-line);
  padding: 0.9em 1.1em 1em 1.2em;
  background: var(--mb-brand-050);
}
.mb-counter__head {
  display: flex;
  align-items: center;
  gap: 0.45em;
  font-size: 0.8em;
  font-weight: 600;
  color: var(--mb-brand-800);
  margin-bottom: 0.45em;
}
.mb-counter__head svg { width: 1.1em; height: 1.1em; }
.mb-counter__subject {
  font-size: 0.84em;
  font-weight: 560;
  color: var(--mb-ink-900);
  margin: 0 0 0.3em;
}
.mb-counter__body {
  margin: 0;
  font-family: inherit;
  font-size: 0.82em;
  line-height: 1.75;
  color: var(--mb-ink-700);
  white-space: pre-wrap;
  max-height: 11em;
  overflow-y: auto;
}
.mb-counter__note {
  margin: 0.5em 0 0;
  font-size: 0.74em;
  color: var(--mb-ink-400);
}

/* 操作 */
.mb-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  padding: 0.85em 1.1em 1em 1.2em;
  border-top: 1px solid var(--mb-line);
}
.mb-btn {
  font: inherit;
  font-size: 0.84em;
  font-weight: 520;
  padding: 0.45em 0.9em;
  border-radius: var(--mb-r-sm);
  border: 1px solid var(--mb-line-strong);
  background: var(--mb-surface);
  color: var(--mb-ink-700);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.mb-btn:hover { border-color: var(--mb-brand-400); color: var(--mb-brand-700); }
.mb-btn:focus-visible { outline: none; box-shadow: var(--mb-ring); }
.mb-btn--primary {
  background: var(--mb-brand-600);
  border-color: var(--mb-brand-600);
  color: #fff;
}
.mb-btn--primary:hover {
  background: var(--mb-brand-700);
  border-color: var(--mb-brand-700);
  color: #fff;
}

/* 内訳（data-debug="true" のとき） */
.mb-panel__debug {
  border-top: 1px solid var(--mb-line);
  font-size: 0.82em;
}
.mb-panel__debug > summary {
  padding: 0.7em 1.1em 0.7em 1.2em;
  cursor: pointer;
  color: var(--mb-ink-500);
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.4em;
}
.mb-panel__debug > summary::-webkit-details-marker { display: none; }
.mb-panel__debug > summary::before {
  content: '';
  width: 0;
  height: 0;
  border-left: 4px solid currentColor;
  border-top: 3.5px solid transparent;
  border-bottom: 3.5px solid transparent;
  transition: transform 0.15s;
}
.mb-panel__debug[open] > summary::before { transform: rotate(90deg); }
.mb-panel__debug > summary:hover { color: var(--mb-ink-900); }
.mb-debug {
  display: grid;
  gap: 0.55em;
  padding: 0 1.1em 1em 1.2em;
}
.mb-debug__row { display: grid; gap: 0.3em; }
.mb-debug__signals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25em;
  padding-left: 8.1em;
}
.mb-debug__chip {
  font-family: var(--mb-mono);
  font-size: 0.82em;
  padding: 0.05em 0.4em;
  border-radius: 4px;
  background: var(--mb-surface-inset);
  border: 1px solid var(--mb-line);
  color: var(--mb-ink-500);
}
.mb-debug__note {
  padding-top: 0.4em;
  font-size: 0.9em;
  color: var(--mb-ink-400);
  line-height: 1.6;
}

.mb-sr {
  position: absolute !important;
  width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .mb-root * { transition: none !important; }
}
`,tt=e=>{if(e.getElementById(et))return;let t=e.createElement("style");t.id=et,t.textContent=Ze(".mb-root")+Vt,e.head.append(t)},g=(e,t,n,r)=>{let o=e.createElement(t);return n&&(o.className=n),r!==void 0&&(o.textContent=r),o},se=(e,t)=>{let n=g(e,"span");return n.innerHTML=ie({...Ye,idPrefix:t}),n},nt=(e,t,n)=>{let r=g(e,"div","mb-root mb-guard"),o=g(e,"label","mb-guard__check"),a=g(e,"input","mb-guard__box");a.type="checkbox",a.name=n,a.id=`${n}-${Math.random().toString(36).slice(2,8)}`,o.htmlFor=a.id,o.append(a,g(e,"span","mb-guard__label",t));let i=g(e,"span","mb-guard__state");i.setAttribute("aria-live","polite");let l=g(e,"span","mb-guard__brand");return l.title="Miyabarrier が送信内容を端末内で検証します（外部送信なし）",l.append(se(e,"guard"),g(e,"span",void 0,"Miyabarrier")),r.append(o,i,l),{wrapper:r,input:a}},Jt={verified:"確認しました",review:"確認が必要です",blocked:"送信を止めました"},ve=(e,t)=>{if(!e)return;e.classList.remove("mb-guard--verified","mb-guard--flagged","mb-guard--blocked");let n=e.querySelector(".mb-guard__state");if(n){if(t==="idle"){n.textContent="";return}e.classList.add(t==="verified"?"mb-guard--verified":t==="review"?"mb-guard--flagged":"mb-guard--blocked"),n.textContent=Jt[t]}},rt=(e,t)=>{let n=g(e,"a",`mb-root mb-badge${t?" mb-badge--floating":""}`);return n.href=Gt,n.target="_blank",n.rel="noopener noreferrer",n.append(se(e,t?"badge-float":"badge")),n.append(g(e,"span",void 0,"Miyabarrier で保護されています")),n},Yt={automation:"自動化・bot",sales:"営業・勧誘の文面"},Xt={honeypot:"L1 ハニーポット",behavior:"L2 行動",environment:"L2.5 環境",mimicry:"L2.6 揺らぎ",checkbox:"L3 チェック",content:"L4 文面",aiText:"L6 AI文"},ot=(e,t,n,r,o)=>{let a=g(e,"div",`mb-meter${n===null?" mb-meter--muted":""}`),i=g(e,"span","mb-meter__name",t);o&&(i.title=o);let l=g(e,"div","mb-meter__track"),u=g(e,"div",`mb-meter__fill${r==="brand"?"":` mb-meter__fill--${r}`}`);return u.style.width=`${Math.round((n!=null?n:0)*100)}%`,l.append(u),a.append(i,l,g(e,"span","mb-meter__value",n===null?"—":n.toFixed(2))),a},it=(e,t)=>e>=t.block?"block":e>=t.review?"review":"pass",st=(e,t)=>{var m,h;let{result:n}=t,r=n.verdict==="block"?"block":"review",o=g(e,"div",`mb-root mb-panel mb-panel--${r}`);o.setAttribute("role","alert"),o.setAttribute("aria-live","assertive");let a=g(e,"div","mb-panel__head"),i=g(e,"div","mb-panel__icon");i.append(se(e,"panel"));let l=g(e,"div","mb-panel__heading");l.append(g(e,"p","mb-panel__title",n.verdict==="block"?"送信をブロックしました":"送信内容の確認をお願いします"),g(e,"p","mb-panel__message",t.message));let u=g(e,"div","mb-panel__score");u.append(g(e,"b",void 0,n.score.toFixed(2)),g(e,"span",void 0,"score")),u.title=`ブロックのしきい値 ${n.thresholds.block.toFixed(2)} / 確認 ${n.thresholds.review.toFixed(2)}`,a.append(i,l,u),o.append(a);let d=g(e,"div","mb-panel__groups");for(let p of n.groups)d.append(ot(e,(m=Yt[p.group])!=null?m:p.label,p.applicable?p.score:null,p.applicable?it(p.score,n.thresholds):"pass",p.applicable?void 0:"判定に必要な情報が足りないため対象外"));if(o.append(d),n.reasons.length>0){let p=g(e,"ul","mb-panel__reasons");for(let f of n.reasons.slice(0,3))p.append(g(e,"li",void 0,f));o.append(p)}if(t.counter){let p=g(e,"div","mb-counter"),f=g(e,"div","mb-counter__head");f.append(se(e,"counter"),g(e,"span",void 0,"こちらからのご案内")),p.append(f,g(e,"p","mb-counter__subject",t.counter.subject),g(e,"p","mb-counter__body",t.counter.body),g(e,"p","mb-counter__note",`${t.counter.to} 宛の返信文を控えました。`)),o.append(p)}let s=g(e,"div","mb-panel__actions");if(t.onOverride){let p=g(e,"button","mb-btn mb-btn--primary",(h=t.overrideLabel)!=null?h:"それでも送信する");p.type="button",p.addEventListener("click",t.onOverride),s.append(p)}if(t.onDismiss){let p=g(e,"button","mb-btn","閉じる");p.type="button",p.addEventListener("click",t.onDismiss),s.append(p)}return s.childElementCount>0&&o.append(s),t.debug&&o.append(Zt(e,n)),o},Qt=e=>e.skipped?`${e.label} — 判定対象外: ${e.skipped}`:e.counted?`${e.label} — ${e.points} / ${e.saturation} 点 · グループ内の重み ${e.weight}`:`${e.label} — 加点がないため集計対象外（沈黙は証拠として扱わない）`,Zt=(e,t)=>{var a,i;let n=g(e,"details","mb-panel__debug"),r=g(e,"summary");r.append(e.createTextNode("レイヤー別の内訳を見る")),n.append(r);let o=g(e,"div","mb-debug");for(let l of t.layers){let u=g(e,"div","mb-debug__row");if(u.append(ot(e,(a=Xt[l.layer])!=null?a:l.label,l.counted?l.score:null,l.counted?it(l.score,t.thresholds):"pass",Qt(l))),l.signals.length>0){let d=g(e,"div","mb-debug__signals");for(let s of l.signals){let m=g(e,"span","mb-debug__chip",(i=s.code.split(".")[1])!=null?i:s.code);m.title=`${s.label}（+${s.points}）${s.detail?` — ${s.detail}`:""}`,d.append(m)}u.append(d)}o.append(u)}return o.append(g(e,"p","mb-debug__note",`総合 ${t.score.toFixed(2)} ／ ブロックは ${t.thresholds.block.toFixed(2)} 以上・確認は ${t.thresholds.review.toFixed(2)} 以上${t.hardBlocked?" ／ ハニーポット検知による即時ブロック":""}`)),t.warnings.length>0&&o.append(g(e,"p","mb-debug__note",`設定の警告: ${t.warnings.join(" / ")}`)),n.append(o),n};var en="0.5.0",at={mode:"block",checkbox:!0,checkboxLabel:"営業・勧誘目的の送信ではありません",honeypot:!0,badge:"inline",blockMessage:"営業・勧誘目的の送信、または自動送信の可能性が高いと判定したため送信をブロックしました。お心当たりのない場合は、内容を見直して再度お試しください。",reviewMessage:"営業・勧誘目的の可能性がある内容が含まれています。お問い合わせ内容であれば、そのまま送信してください。",formLanguage:"ja",debug:!1,log:!0,logLimit:200,autoInit:!0,counter:ze},lt=typeof document=="undefined"?null:document.currentScript,K=(e,t)=>e===void 0?t:e!=="false"&&e!=="0"&&e!=="off",xe=e=>{if(e===void 0)return;let t=Number(e);return Number.isFinite(t)?t:void 0},ct=e=>{if(!e)return{};let t=e.dataset,n={};(t.mode==="block"||t.mode==="warn"||t.mode==="report")&&(n.mode=t.mode),t.selector&&(n.selector=t.selector),t.checkbox!==void 0&&(n.checkbox=K(t.checkbox,!0)),t.checkboxLabel&&(n.checkboxLabel=t.checkboxLabel),t.honeypot!==void 0&&(n.honeypot=K(t.honeypot,!0)),t.badge!==void 0&&(n.badge=t.badge==="floating"?"floating":K(t.badge,!0)?"inline":!1),t.blockMessage&&(n.blockMessage=t.blockMessage),t.reviewMessage&&(n.reviewMessage=t.reviewMessage),(t.formLanguage==="ja"||t.formLanguage==="en"||t.formLanguage==="auto")&&(n.formLanguage=t.formLanguage),t.debug!==void 0&&(n.debug=K(t.debug,!1)),t.log!==void 0&&(n.log=K(t.log,!0)),t.autoInit!==void 0&&(n.autoInit=K(t.autoInit,!0));let r=xe(t.logLimit);r!==void 0&&(n.logLimit=r);let o=xe(t.reviewThreshold),a=xe(t.blockThreshold);return(o!==void 0||a!==void 0)&&(n.thresholds={...o!==void 0?{review:o}:{},...a!==void 0?{block:a}:{}}),n},dt=()=>{let e=globalThis.MIYABARRIER_CONFIG;return e&&typeof e=="object"?e:{}},ae=(...e)=>e.reduce((t,n)=>({...t,...n}),{...at}),mt=e=>{let t=z;return e.weights&&(t=pe(t,e.weights)),e.thresholds&&(t=pe(t,{thresholds:{...t.thresholds,...e.thresholds}})),t},ke=class{constructor(t,n={}){this.form=t;this.checkedAt=null;this.pointerSamplesBeforeCheck=0;this.toggleCount=0;this.allowNextSubmit=!1;this.cleanups=[];this.options=ae(n),this.weights=mt(this.options),this.ngWords=be(B,this.options.ngWords),this.telemetry=new re(t);let r=t.ownerDocument;tt(r),this.options.honeypot&&(this.honeypot=We(t)),this.options.checkbox&&this.mountCheckbox(r),this.options.badge&&this.mountBadge(r);let o=()=>this.clearVerdictUi();t.addEventListener("input",o,{passive:!0}),this.cleanups.push(()=>t.removeEventListener("input",o));let a=i=>this.handleSubmit(i);t.addEventListener("submit",a,!0),this.cleanups.push(()=>t.removeEventListener("submit",a,!0)),t.setAttribute("data-miyabarrier-protected","true")}insertBeforeSubmit(t){let n=this.form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');n!=null&&n.parentElement?n.parentElement.insertBefore(t,n):this.form.append(t)}mountCheckbox(t){let{wrapper:n,input:r}=nt(t,this.options.checkboxLabel,"mb_confirm");this.checkboxInput=r,this.checkboxRow=n,r.addEventListener("click",o=>{this.toggleCount+=1,this.trustedClick=o.isTrusted,r.checked?(this.checkedAt=Date.now(),this.pointerSamplesBeforeCheck=this.telemetry.pointerSampleCount()):this.checkedAt=null}),this.insertBeforeSubmit(n),this.cleanups.push(()=>n.remove())}mountBadge(t){let n=rt(t,this.options.badge==="floating");if(this.options.badge==="floating")if(!t.querySelector(".mb-badge-floating"))t.body.append(n);else return;else this.form.append(n);this.cleanups.push(()=>n.remove())}analyze(){var n,r,o;let t=he(this.form);return Ne({honeypot:(n=this.honeypot)==null?void 0:n.state(),behavior:this.telemetry.behavior(t.typedChars),environment:this.telemetry.environment(),checkbox:{present:!!this.checkboxInput,checked:(o=(r=this.checkboxInput)==null?void 0:r.checked)!=null?o:!1,renderedAt:this.telemetry.renderedAt,checkedAt:this.checkedAt,trustedClick:this.trustedClick,pointerSamplesBeforeCheck:this.pointerSamplesBeforeCheck,toggleCount:this.toggleCount},content:{text:t.text,senderName:t.senderName,formLanguage:this.options.formLanguage}},{weights:this.weights,ngWords:this.ngWords})}buildCounter(t){var u,d,s,m,h;let n=this.options.counter,r=t.groups.find(p=>p.group==="sales"),o=he(this.form),a=Ke(n,{verdict:t.verdict,salesApplicable:(u=r==null?void 0:r.applicable)!=null?u:!1,salesScore:(d=r==null?void 0:r.score)!=null?d:0,email:o.email});if(!a.ok){this.options.debug&&n.enabled&&console.warn("[miyabarrier] お返しの営業は作りませんでした:",a.reason);return}let i=qe(n,{email:o.email,name:o.senderName,score:t.score,salesScore:(s=r==null?void 0:r.score)!=null?s:0,reasons:t.reasons.slice(0,3),site:typeof location=="undefined"?"":location.hostname,path:typeof location=="undefined"?"":location.pathname,at:new Date().toISOString()}),l=Ge(i,n.queueLimit);return this.options.debug&&console.warn("[miyabarrier] お返しの営業を送信箱に積みました:",l,i.to),(h=(m=this.options).onCounter)==null||h.call(m,i,{form:this.form}),i}clearVerdictUi(){var t;(t=this.panel)==null||t.remove(),this.panel=void 0,ve(this.checkboxRow,"idle")}showPanel(t,n,r){var a,i;(a=this.panel)==null||a.remove();let o=st(this.form.ownerDocument,{message:t.verdict==="block"?this.options.blockMessage:this.options.reviewMessage,result:t,debug:this.options.debug,...r&&this.options.counter.showOnScreen?{counter:r}:{},...n?{onOverride:()=>{var l;(l=this.panel)==null||l.remove(),this.panel=void 0,this.submitAnyway()}}:{},onDismiss:()=>{var l;(l=this.panel)==null||l.remove(),this.panel=void 0}});this.panel=o,this.insertBeforeSubmit(o),(i=o.scrollIntoView)==null||i.call(o,{behavior:"smooth",block:"nearest"})}submitAnyway(){this.allowNextSubmit=!0,typeof this.form.requestSubmit=="function"?this.form.requestSubmit():this.form.submit()}handleSubmit(t){var l,u,d;if(this.allowNextSubmit){this.allowNextSubmit=!1;return}let n=this.analyze();this.lastResult=n,this.options.log&&Be({t:new Date().toISOString(),verdict:n.verdict,score:n.score,hard:n.hardBlocked,reasons:n.reasons,form:this.form.id||this.form.name||"form",path:typeof location=="undefined"?"":location.pathname},this.options.logLimit);let o=((u=(l=this.options).onVerdict)==null?void 0:u.call(l,n,{form:this.form}))===!1;this.options.debug&&console.warn("[miyabarrier]",n.verdict,n.score,n.reasons,n);let a=this.buildCounter(n);if(ve(this.checkboxRow,n.verdict==="pass"?"verified":n.verdict==="review"?"review":"blocked"),this.options.mode==="report"||o||n.verdict==="pass"){(d=this.panel)==null||d.remove(),this.panel=void 0;return}let i=this.options.mode==="warn"||n.verdict==="review";t.preventDefault(),t.stopImmediatePropagation(),this.showPanel(n,i,a)}destroy(){var t,n;for(let r of this.cleanups)r();this.cleanups.length=0,(t=this.honeypot)==null||t.destroy(),this.telemetry.destroy(),(n=this.panel)==null||n.remove(),this.form.removeAttribute("data-miyabarrier-protected")}},Y=new Map,ut=(e,t={})=>{let n=typeof e=="string"?document.querySelector(e):e;if(!(n instanceof HTMLFormElement))return;let r=Y.get(n);if(r)return r;let o=new ke(n,t);return Y.set(n,o),o},pt=(e={})=>{let t=ae(dt(),ct(lt),e);return He(document,t.selector).map(n=>ut(n,t)).filter(n=>n!==void 0)},tn=(e,t={})=>{let n=ae(t),r=mt(n),o=be(B,n.ngWords),a={text:e,formLanguage:n.formLanguage};return J([G(a,r.layers.content,o),V(a,r.layers.aiText)],r)},nn=()=>ge(),rn=()=>Ue(),on=()=>{for(let e of Y.values())e.destroy();Y.clear()},sn={version:en,protect:ut,protectAll:pt,analyzeText:tn,getLog:nn,clearLog:rn,getCounterQueue:ye,clearCounterQueue:Ve,counterMailtoUrl:Je,destroyAll:on,defaultOptions:at,defaultWeights:z,markSvg:ie,defaultNgWords:B,instances:Y};if(typeof window!="undefined"){window.Miyabarrier=sn;let e=()=>{ae(dt(),ct(lt)).autoInit!==!1&&pt()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",e,{once:!0}):e()}export{oe as LOG_STORAGE_KEY,ke as ProtectedForm,en as VERSION,tn as analyzeText,sn as api,rn as clearLog,at as defaultOptions,on as destroyAll,nn as getLog,ut as protect,pt as protectAll};
