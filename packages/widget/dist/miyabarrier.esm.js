/*! Miyabarrier v0.3.0 | MIT License | https://github.com/dronehonpo-byte/miyabarrier */
var ot=(e,n,t)=>e<n?n:e>t?t:e,$=e=>ot(e,0,1),it=e=>typeof e=="number"&&Number.isFinite(e),w=(e,n=3)=>{let t=10**n;return Math.round(e*t)/t},ee=e=>e.length===0?0:e.reduce((n,t)=>n+t,0)/e.length,st=e=>{if(e.length<2)return 0;let n=ee(e),t=e.reduce((r,o)=>r+(o-n)**2,0)/(e.length-1);return Math.sqrt(t)},z=e=>{let n=ee(e);return n===0?0:st(e)/Math.abs(n)},ae=e=>{var r,o,s;if(e.length===0)return 0;let n=[...e].sort((i,l)=>i-l),t=Math.floor(n.length/2);return n.length%2===1?(r=n[t])!=null?r:0:(((o=n[t-1])!=null?o:0)+((s=n[t])!=null?s:0))/2},le=e=>{var t,r;let n=[];for(let o=1;o<e.length;o+=1)n.push(((t=e[o])!=null?t:0)-((r=e[o-1])!=null?r:0));return n},P=(e,n)=>n<=0?0:$((n-e)/n),N=(e,n,t=1)=>t<=n?e>n?1:0:$((e-n)/(t-n)),ce=(e,n=1)=>{var o;if(e.length===0)return 0;let t=new Map;for(let s of e){let i=Math.round(s/n);t.set(i,((o=t.get(i))!=null?o:0)+1)}let r=0;for(let s of t.values())s>r&&(r=s);return r/e.length},H=e=>e.normalize("NFKC").toLowerCase().replace(/[\t ]+/g," "),te=(e,n)=>{if(n.length===0)return 0;let t=0,r=e.indexOf(n);for(;r!==-1;)t+=1,r=e.indexOf(n,r+n.length);return t},ve=e=>e.split(/(?<=[。！？!?])|(?<=\.)(?=\s|$)|\n+/g).map(n=>n.trim()).filter(n=>n.length>0),at=/[぀-ヿ㐀-䶿一-鿿]/,xe=e=>at.test(e),ke=e=>{var n;return((n=e.match(/\b(?:https?:\/\/|www\.)[^\s<>"'）)]{3,}/gi))!=null?n:[]).length},v=(e,n,t)=>{let r=e==null?void 0:e[n];return it(r)?r:t},D=(e,n,t)=>{let r=e==null?void 0:e[n];return Array.isArray(r)&&r.every(o=>typeof o=="string")?r:[...t]};var q=(e,n,t,r)=>Math.hypot(t-e,r-n),lt=e=>{let n=0;for(let t=1;t<e.length;t+=1){let r=e[t-1],o=e[t];!r||!o||(n+=q(r.x,r.y,o.x,o.y))}return n},ct=e=>{let n=[];for(let t=1;t<e.length-1;t+=1){let r=e[t-1],o=e[t],s=e[t+1];if(!r||!o||!s)continue;let i=q(r.x,r.y,s.x,s.y);if(i===0)continue;let l=Math.abs((s.x-r.x)*(r.y-o.y)-(r.x-o.x)*(s.y-r.y));n.push(l/i)}return n},dt=e=>{let n=[];for(let t=1;t<e.length;t+=1){let r=e[t-1],o=e[t];!r||!o||n.push(q(r.x,r.y,o.x,o.y))}return n},mt=e=>{let n=[];for(let t=1;t<e.length;t+=1){let r=e[t-1],o=e[t];if(!r||!o)continue;let s=o.t-r.t;s<=0||n.push(q(r.x,r.y,o.x,o.y)/s)}return n},we=(e,n)=>{var k,L,C;if(!e)return{layer:"behavior",applicable:!1,signals:[],metrics:{},skipped:"行動の計測値がない"};let t=n==null?void 0:n.tuning,r=v(t,"instantSubmitMs",1500),o=v(t,"fastSubmitMs",5e3),s=v(t,"staleFormMs",72e5),i=v(t,"maxPlausibleCharsPerMinute",1200),l=v(t,"minMouseSamples",3),p=v(t,"pastedCharsThreshold",120),m=[],a=Math.max(0,e.submittedAt-e.renderedAt),d=e.pastes.reduce((_,M)=>_+M.length,0),h=(k=e.touchEventCount)!=null?k:0,u=e.keys.map(_=>_.t).sort((_,M)=>_-M);a<r?m.push({code:"behavior.instantSubmit",intensity:P(a,r),detail:`表示から送信まで ${a}ms`}):a<o?m.push({code:"behavior.fastSubmit",intensity:P(a,o),detail:`表示から送信まで ${a}ms`}):a>s&&m.push({code:"behavior.staleForm",intensity:$((a-s)/s),detail:`表示から送信まで ${Math.round(a/6e4)} 分`}),e.pointer.length<l&&h===0&&m.push({code:"behavior.noMouseActivity",intensity:P(e.pointer.length,l),detail:`ポインタ観測 ${e.pointer.length} 件 / タッチ ${h} 件`}),e.focus.length===0&&m.push({code:"behavior.noFocusEvents"}),e.typedChars>0&&u.length===0&&d===0&&m.push({code:"behavior.noKeystrokes"});let g=Math.max(0,e.typedChars-d),y=u.length>=2?((L=u[u.length-1])!=null?L:0)-((C=u[0])!=null?C:0):0,x=null;return u.length>=5&&y>=200&&(x=g/(y/6e4),x>i&&m.push({code:"behavior.impossibleTypingSpeed",intensity:N(x,i,i*3),detail:`${Math.round(x)} 文字/分`})),d>=p&&m.push({code:"behavior.pastedBody",intensity:N(d,p,p*4),detail:`貼り付け ${d} 文字`}),{layer:"behavior",applicable:!0,signals:m,metrics:{elapsedMs:a,pointerSamples:e.pointer.length,touchEventCount:h,keyCount:u.length,focusCount:e.focus.length,typedChars:e.typedChars,pastedChars:d,charsPerMinute:x===null?null:w(x,1)}}},Se=(e,n)=>{if(!e)return{layer:"mimicry",applicable:!1,signals:[],metrics:{},skipped:"行動の計測値がない"};let t=n==null?void 0:n.tuning,r=v(t,"minMouseSamples",12),o=v(t,"minKeyIntervals",8),s=v(t,"minFieldTransitions",3),i=v(t,"mouseSpeedCvFloor",.18),l=v(t,"keyIntervalCvFloor",.22),p=v(t,"fieldTransitionCvFloor",.12),m=v(t,"straightnessCeiling",.985),a=v(t,"quantizedRatioCeiling",.6),d=v(t,"jitterFloorPx",.75),h=[],u={},g=[...e.pointer].sort((c,b)=>c.t-b.t),y=g.length>=r;if(y){let c=mt(g),b=z(c);u.pointerSpeedCv=w(b),c.length>=3&&b<i&&h.push({code:"mimicry.uniformMouseSpeed",intensity:P(b,i),detail:`速度の変動係数 ${w(b)}`});let E=g[0],O=g[g.length-1],A=lt(g),T=E&&O&&A>0?q(E.x,E.y,O.x,O.y)/A:0;u.straightness=w(T),A>0&&T>m&&h.push({code:"mimicry.straightMousePath",intensity:N(T,m),detail:`直線度 ${w(T)}`});let I=dt(g).filter(X=>X>0),F=ce(I,1);u.stepModeRatio=w(F),I.length>=5&&F>a&&h.push({code:"mimicry.quantizedMouseSteps",intensity:N(F,a),detail:`同一移動量の比率 ${w(F)}`});let W=ae(ct(g));u.jitterPx=w(W),W<d&&h.push({code:"mimicry.noJitter",intensity:P(W,d),detail:`局所的な揺れの中央値 ${w(W)}px`})}let x=e.keys.map(c=>c.t).sort((c,b)=>c-b),k=le(x).filter(c=>c>=0),L=k.length>=o;if(L){let c=z(k);u.keyIntervalCv=w(c),u.keyIntervalMedianMs=w(ae(k),1),c<l&&h.push({code:"mimicry.uniformKeyIntervals",intensity:P(c,l),detail:`打鍵間隔の変動係数 ${w(c)}`});let b=ce(k,5);u.keyIntervalModeRatio=w(b),b>a&&h.push({code:"mimicry.quantizedKeyIntervals",intensity:N(b,a),detail:`同一打鍵間隔の比率 ${w(b)}`})}let C=e.focus.map(c=>c.t).sort((c,b)=>c-b),_=le(C).filter(c=>c>=0),M=_.length>=s;if(M){let c=z(_);u.fieldTransitionCv=w(c),c<p&&h.push({code:"mimicry.uniformFieldTransitions",intensity:P(c,p),detail:`欄移動間隔の変動係数 ${w(c)}`})}let S=y||L||M;return{layer:"mimicry",applicable:S,signals:h,metrics:{...u,pointerSamples:g.length,keyIntervals:k.length,fieldTransitions:_.length},...S?{}:{skipped:"統計判定に足るサンプル数がない"}}};var Le=(e,n)=>{var a,d,h;if(!e||!e.present)return{layer:"checkbox",applicable:!1,signals:[],metrics:{},skipped:e?"チェックボックス UI が無効":"チェックボックスの計測値がない"};let t=n==null?void 0:n.tuning,r=v(t,"instantCheckMs",250),o=v(t,"minPointerTrail",2),s=v(t,"maxToggles",6),i=[],l=e.checked&&typeof e.checkedAt=="number"?e.checkedAt-e.renderedAt:null,p=(a=e.toggleCount)!=null?a:e.checked?1:0,m=(d=e.pointerSamplesBeforeCheck)!=null?d:0;return e.checked?(e.trustedClick===!1&&i.push({code:"checkbox.programmaticCheck"}),l!==null&&l<r&&i.push({code:"checkbox.instantCheck",intensity:P(Math.max(l,0),r),detail:`表示から ${Math.max(l,0)}ms でチェック`}),m<o&&i.push({code:"checkbox.noPointerTrail",intensity:P(m,o),detail:`チェック前のポインタ／タッチ観測 ${m} 件`})):i.push({code:"checkbox.unchecked"}),p>s&&i.push({code:"checkbox.excessiveToggles",detail:`切り替え ${p} 回`}),{layer:"checkbox",applicable:!0,signals:i,metrics:{checked:e.checked,elapsedToCheckMs:l,trustedClick:(h=e.trustedClick)!=null?h:null,pointerSamplesBeforeCheck:m,toggleCount:p}}};var de=/(株式会社|合同会社|有限会社|一般社団法人|合資会社|\bco\.,?\s?ltd\b|\binc\b)/,pt=/(と申します|と言います|担当(?:者)?(?:です|でございます)|営業部|マーケティング部)/,ut=[/〒\s*\d{3}[-ー－]?\d{4}/,/(?:tel|電話)[:：]?\s*0\d/,/(?:fax)[:：]?\s*0\d/,/(?:e-?mail|メール)[:：]/,/0\d{1,3}[-(]\d{2,4}[-)]\d{3,4}/,/https?:\/\//,/(?:所在地|住所|事業内容|会社概要)[:：]/],bt=/^\s*(?:[・･◆●○■□*\-–—]|\d{1,2}[.)、]|[①-⑳])\s*\S/,Me=(e,n)=>{var l,p,m;let t=H(e),r=((p=(l=n.allowlist)==null?void 0:l.terms)!=null?p:[]).map(a=>H(a)).filter(a=>a.length>0&&t.includes(a)),o=[],s={},i=0;for(let a of n.categories){let d=0,h=()=>a.score>0?d>=a.cap:d<=a.cap;for(let u of a.terms){if(h())break;let g=H(u),y=te(t,g);if(y===0)continue;let x=r.filter(k=>k.includes(g)).reduce((k,L)=>k+te(t,L),0);y<=x||(d+=a.score,o.push({categoryId:a.id,label:a.label,term:u,kind:"term",score:a.score}))}for(let u of(m=a.patterns)!=null?m:[]){if(h())break;let g;try{g=new RegExp(u,"gi")}catch{continue}g.test(t)&&(d+=a.score,o.push({categoryId:a.id,label:a.label,term:u,kind:"pattern",score:a.score}))}if(d!==0){let u=a.score>0?Math.min(d,a.cap):Math.max(d,a.cap);s[a.id]=u,i+=u}}return{score:w(i,2),matches:o,perCategory:s}},G=(e,n,t)=>{var C,_;if(!e||!t)return{layer:"content",applicable:!1,signals:[],metrics:{},skipped:"本文またはパターン定義がない"};let r=n==null?void 0:n.tuning,o=v(r,"minChars",24),s=v(r,"ngScoreSaturation",12),i=v(r,"freeUrlAllowance",1),l=v(r,"urlSaturation",4),p=v(r,"companyIntroHeadChars",120),m=(C=e.text)!=null?C:"",a=m.trim();if(a.length<o)return{layer:"content",applicable:!1,signals:[],metrics:{chars:a.length},skipped:`本文が短すぎる (${a.length} 文字 < ${o})`};let d=[],h=Me(m,t);if(h.score>0){let M=h.matches.filter(S=>S.score>0).slice(0,6).map(S=>S.term);d.push({code:"content.ngWords",intensity:$(h.score/s),detail:`営業スコア ${h.score} / 検出語: ${M.join("、")}`})}let u=ke(m);u>i&&d.push({code:"content.urlSpam",intensity:N(u,i,l),detail:`URL ${u} 件`});let g=a.slice(0,p),y=(_=e.senderName)!=null?_:"";(de.test(g)&&pt.test(g)||de.test(y))&&d.push({code:"content.companyIntroOpening",detail:de.test(y)?"氏名欄に法人格":"冒頭に法人格つきの自己紹介"});let x=a.slice(-260),k=ut.filter(M=>M.test(x)).length;k>=3&&d.push({code:"content.signatureBlock",intensity:$(k/4),detail:`署名要素 ${k} 種`}),e.formLanguage==="ja"&&!xe(m)&&d.push({code:"content.noJapaneseOnJapaneseForm"});let L=Object.entries(h.perCategory).map(([M,S])=>`${M}:${S}`).join(", ");return{layer:"content",applicable:!0,signals:d,metrics:{chars:a.length,ngScore:h.score,ngMatchCount:h.matches.length,ngCategories:L,urls:u,signatureHits:k}}},ht=["いただければ","いただけますと","させていただき","ご検討いただ","幸いです","存じます","何卒","よろしくお願い申し上げます","つきましては"],gt=["！！","。。","、、","www","笑","すみません","ちょっと"],ft=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,yt=e=>{var r,o;if(e.length<2)return 1;let n=ee(e);if(n===0)return 1;let t=0;for(let s=1;s<e.length;s+=1)t+=Math.abs(((r=e[s])!=null?r:0)-((o=e[s-1])!=null?o:0));return t/(e.length-1)/n},V=(e,n)=>{var M;if(!e)return{layer:"aiText",applicable:!1,signals:[],metrics:{},skipped:"本文がない"};let t=n==null?void 0:n.tuning,r=v(t,"minChars",80),o=v(t,"minSentences",4),s=v(t,"sentenceLengthCvFloor",.32),i=v(t,"politePhraseDensityCeiling",.012),l=v(t,"burstinessFloor",.35),p=D(t,"politePhrases",ht),m=D(t,"humanNoiseMarkers",gt),a=((M=e.text)!=null?M:"").trim(),d=ve(a);if(a.length<r||d.length<o)return{layer:"aiText",applicable:!1,signals:[],metrics:{chars:a.length,sentences:d.length},skipped:`統計判定に足る長さがない (${a.length} 文字 / ${d.length} 文)`};let h=[],u=H(a),g=d.map(S=>S.length),y=w(z(g));y<s&&h.push({code:"ai.uniformSentenceLength",intensity:P(y,s),detail:`文長の変動係数 ${y}`});let x=p.reduce((S,c)=>S+te(u,H(c)),0),k=x/a.length;k>i&&h.push({code:"ai.politeTemplateDensity",intensity:N(k,i,i*3),detail:`定型丁寧表現 ${x} 箇所 / ${a.length} 文字`});let L=w(yt(g));L<l&&h.push({code:"ai.lowBurstiness",intensity:P(L,l),detail:`文長の揺らぎ ${L}`});let C=a.split(/\n/).filter(S=>bt.test(S)).length;C>=3&&h.push({code:"ai.structuredListing",intensity:$((C-2)/4),detail:`箇条書き ${C} 行`});let _=m.filter(S=>u.includes(H(S))).length;return _===0&&!ft.test(a)&&a.length>=200&&h.push({code:"ai.noTypos",intensity:.6}),{layer:"aiText",applicable:!0,signals:h,metrics:{chars:a.length,sentences:d.length,sentenceLengthCv:y,burstiness:L,politeHits:x,politeDensity:w(k,4),listLines:C,noiseHits:_}}};var vt=["headlesschrome","headless"],xt=["puppeteer","playwright","selenium","phantomjs","electron/","webdriver"],kt=["bot","crawler","spider","python-requests","curl/","wget/","axios/","okhttp","scrapy","http-client"],wt=/(android|iphone|ipad|ipod|mobile|windows phone)/,me=(e,n)=>{var r,o;if(n.length>4||/[^a-z]/.test(n))return e.includes(n);let t=e.indexOf(n);for(;t!==-1;){let s=(r=e[t-1])!=null?r:"",i=(o=e[t+n.length])!=null?o:"";if(!/[a-z]/.test(s)&&!/[a-z]/.test(i))return!0;t=e.indexOf(n,t+1)}return!1},_e=(e,n)=>{var u,g,y,x,k,L,C,_,M,S,c,b,E,O,A,T;if(!e)return{layer:"environment",applicable:!1,signals:[],metrics:{},skipped:"実行環境の計測値がない"};let t=n==null?void 0:n.tuning,r=D(t,"headlessMarkers",vt),o=D(t,"automationMarkers",xt),s=D(t,"botUserAgentMarkers",kt),i=[],l=((u=e.userAgent)!=null?u:"").toLowerCase(),p=wt.test(l),m=((g=e.maxTouchPoints)!=null?g:0)>0;e.webdriver===!0&&i.push({code:"env.webdriver"});let a=r.find(I=>me(l,I));a&&i.push({code:"env.headlessUserAgent",detail:a});let d=o.find(I=>me(l,I));d&&i.push({code:"env.automationUserAgent",detail:d});let h=s.find(I=>me(l,I));return h&&i.push({code:"env.botUserAgent",detail:h}),e.isChromium===!0&&!m&&e.pluginCount===0&&i.push({code:"env.noPlugins"}),e.isChromium===!0&&e.hasChromeObject===!1&&i.push({code:"env.chromeObjectMissing"}),Array.isArray(e.languages)&&e.languages.length===0&&i.push({code:"env.noLanguages"}),typeof e.innerWidth=="number"&&typeof e.innerHeight=="number"&&typeof e.screenWidth=="number"&&typeof e.screenHeight=="number"&&e.innerWidth>0&&e.innerWidth===e.screenWidth&&e.innerHeight===e.screenHeight&&i.push({code:"env.viewportEqualsScreen",detail:`${e.innerWidth}x${e.innerHeight}`}),(e.outerWidth===0||e.outerHeight===0)&&i.push({code:"env.zeroOuterWindow"}),p&&e.maxTouchPoints===0&&i.push({code:"env.touchInconsistency",detail:"モバイル UA なのに maxTouchPoints が 0"}),typeof e.hardwareConcurrency=="number"&&(e.hardwareConcurrency===0?i.push({code:"env.suspiciousHardwareConcurrency",detail:"0 コア"}):e.hardwareConcurrency>64&&i.push({code:"env.suspiciousHardwareConcurrency",intensity:.5,detail:`${e.hardwareConcurrency} コア`})),e.notificationPermission==="denied"&&e.permissionsQueryState==="prompt"&&i.push({code:"env.permissionsInconsistency"}),{layer:"environment",applicable:!0,signals:i,metrics:{userAgent:(x=(y=e.userAgent)==null?void 0:y.slice(0,180))!=null?x:"",webdriver:(k=e.webdriver)!=null?k:null,pluginCount:(L=e.pluginCount)!=null?L:null,languageCount:(_=(C=e.languages)==null?void 0:C.length)!=null?_:null,isChromium:(M=e.isChromium)!=null?M:null,hasChromeObject:(S=e.hasChromeObject)!=null?S:null,viewport:typeof e.innerWidth=="number"?`${e.innerWidth}x${(c=e.innerHeight)!=null?c:0}`:null,screen:typeof e.screenWidth=="number"?`${e.screenWidth}x${(b=e.screenHeight)!=null?b:0}`:null,outer:typeof e.outerWidth=="number"?`${e.outerWidth}x${(E=e.outerHeight)!=null?E:0}`:null,devicePixelRatio:(O=e.devicePixelRatio)!=null?O:null,hardwareConcurrency:(A=e.hardwareConcurrency)!=null?A:null,maxTouchPoints:(T=e.maxTouchPoints)!=null?T:null}}};var Ce=e=>{var o,s,i,l,p,m;if(!e)return{layer:"honeypot",applicable:!1,signals:[],metrics:{},skipped:"ハニーポットの計測値がない"};let n=[],t=e.fields.filter(a=>a.value.trim().length>0),r=((o=e.decoys)!=null?o:[]).filter(a=>a.checked);return t.length>0&&n.push({code:"honeypot.filled",detail:`隠しフィールドに入力あり: ${t.map(a=>a.name).join(", ")}`}),r.length>0&&n.push({code:"honeypot.decoyChecked",detail:`おとりチェックボックスがオン: ${r.map(a=>a.name).join(", ")}`}),typeof e.expectedFieldCount=="number"&&e.fields.length<e.expectedFieldCount&&n.push({code:"honeypot.fieldMissing",detail:`注入 ${e.expectedFieldCount} 件に対し送信時 ${e.fields.length} 件`}),e.token&&(e.token.present?e.token.valid||n.push({code:"honeypot.tokenTampered"}):n.push({code:"honeypot.tokenMissing"})),{layer:"honeypot",applicable:!0,signals:n,metrics:{fieldCount:e.fields.length,filledCount:t.length,decoyCount:((s=e.decoys)!=null?s:[]).length,checkedDecoyCount:r.length,tokenPresent:(l=(i=e.token)==null?void 0:i.present)!=null?l:null,tokenValid:(m=(p=e.token)==null?void 0:p.valid)!=null?m:null}}};var B={$schema:"./ng-words.schema.json",version:1,updated:"2026-08-19",locale:["ja","en"],notes:["categories[].score は『1語ヒットするごとに加算される点数』。マイナス値を書くと減点(=正当な問い合わせらしさ)として働く。","categories[].cap は、そのカテゴリ単体で加算できる点数の上限(マイナスカテゴリでは下限)。1カテゴリに語を大量に並べても暴走しないための安全弁。","terms は部分一致。比較前に小文字化・全角英数の半角化・空白の正規化を行うので、リストは小文字・半角で書く。","patterns は JavaScript 正規表現のソース文字列(フラグは gi 固定)。1つのパターンがマッチしたら1ヒットとして score を加算する。","allowlist.terms に含まれる語が本文にあると、その語に内包される NG ワードのヒットを1件ずつ打ち消す(誤検知の抑制)。","追記の作法: 既存カテゴリへは score/cap を変えずに terms を1語ずつ追加する。新カテゴリは id を kebab-case、score は絶対値 1〜4 に収めるのが目安。"],categories:[{id:"cold-open",label:"面識のない相手への定型的な前置き",score:3,cap:9,terms:["突然のご連絡","突然のメール","初めてご連絡","はじめてご連絡","初めてメール","ご担当者様","ご担当者さま","担当者様","web担当者様","採用ご担当者様","貴社","御社","ホームページを拝見","サイトを拝見","hpを拝見","問い合わせフォームより失礼","フォームより失礼","お問い合わせフォームから失礼"],patterns:["(株式会社|合同会社|有限会社)[^\\s、。,.]{1,14}の[^\\s、。,.]{1,12}と申します","^[\\s\\S]{0,60}(と申します|と言います)[\\s\\S]{0,120}(ご提案|ご案内|ご紹介)"]},{id:"sales-offer",label:"提案・紹介の申し出",score:3,cap:9,terms:["ご提案","提案させて","ご案内させて","ご紹介させて","ご紹介したく","ご案内したく","弊社サービス","当社サービス","弊社では","当社では","弊社商品","お役立ていただける","お力添えできる","お手伝いできる","導入のご検討","営業支援","販路拡大","代理店募集","業務提携","アライアンス"]},{id:"benefit-claim",label:"効果・成果の売り込み",score:2,cap:8,terms:["課題解決","課題を解決","お悩みを解決","売上向上","売上アップ","売上が伸び","コスト削減","コストカット","業務効率化","生産性向上","工数削減","集客力","集客につながる","成約率","問い合わせ数を増","リード獲得","新規開拓","劇的に改善","大幅に改善","劇的に向上","利益率が改善"]},{id:"proof-authority",label:"実績・権威づけ",score:2,cap:6,terms:["導入実績","導入企業","実績多数","導入社数","導入事例","事例集","上場企業","大手企業様","大手企業を中心に","業界no.1","シェアno.1","顧客満足度no.1","特許取得","テレビで紹介","メディア掲載"]},{id:"cta-meeting",label:"商談・面談への誘導",score:3,cap:9,terms:["無料相談","無料でご相談","無料トライアル","無料デモ","無料診断","無料分析","無料でお試し","資料をお送り","資料送付","お打ち合わせ","打ち合わせのお時間","オンライン面談","web会議","zoomにて","お電話にて","30分ほど","30分だけ","15分ほど","日程調整","ご都合のよい","ご都合の良い","ご都合のつく","候補日","面談のご依頼","ご挨拶の機会"]},{id:"price-bait",label:"価格・期間限定の煽り",score:2,cap:6,terms:["初期費用0円","初期費用無料","初期費用ゼロ","成果報酬","完全成果報酬","業界最安","特別価格","特別条件","キャンペーン中","今だけ","期間限定","限定5社","限定10社","枠が埋まり","残りわずか"]},{id:"web-marketing",label:"Web制作・広告・SEO系の売り込み",score:3,cap:9,terms:["seo対策","seo施策","検索順位","上位表示","被リンク","外部リンク対策","meo対策","リスティング広告","web広告運用","広告運用代行","ホームページ制作","hp制作","サイトリニューアル","lp制作","ランディングページ制作","instagram運用代行","sns運用代行","youtube運用","アクセス解析","maツール","crm導入","生成aiの導入支援","dx推進支援"]},{id:"recruit-hr",label:"人材・採用系の売り込み",score:3,cap:6,terms:["人材紹介","人材派遣","採用支援","採用代行","求人広告のご案内","エンジニアのご紹介","即戦力人材","オフショア開発","ニアショア","常駐可能","業務委託でのご協力","フリーランス人材"]},{id:"finance-legal",label:"資金・節税・コスト削減系の売り込み",score:3,cap:6,terms:["資金調達","ファクタリング","つなぎ融資","助成金","補助金申請","補助金の採択","節税対策","保険の見直し","電気代の削減","通信費の削減","オフィス移転のご相談"]},{id:"mass-mail-boilerplate",label:"一斉送信の痕跡（配信停止文・免責文）",score:4,cap:8,terms:["配信停止","配信の停止","心当たりのない場合","心当たりがない場合","お心当たりのない","ご不要でしたら","不要な場合はご返信","今後のご案内を希望されない","重複してお送り","本メールは営業目的","掲載情報をもとに","公開情報をもとに","ホームページに掲載されている情報","unsubscribe","opt out","opt-out"]},{id:"signature-block",label:"署名ブロック（会社情報の列挙）",score:2,cap:6,terms:["tel:","fax:","e-mail:","所在地:","事業内容:","営業部","マーケティング部","事業開発部"],patterns:["〒\\s*\\d{3}[-ー－]?\\d{4}","0\\d{1,3}[-(]\\d{2,4}[-)]\\d{3,4}"]},{id:"english-outreach",label:"英語のコールドアプローチ定型句",score:3,cap:12,terms:["dear sir","dear madam","to whom it may concern","i hope this email finds you well","i hope you are doing well","hope this message finds you","we specialize in","we specialise in","we are a leading","increase your sales","boost your traffic","grow your business","first page of google","rank higher on google","backlinks","guest post","link building","seo services","web design services","outsourcing partner","dedicated developers","let me know if you are interested","book a call","schedule a quick call","15-minute call","no obligation","free quote","free audit"]},{id:"legit-inquiry",label:"正当な問い合わせらしさ（減点）",score:-3,cap:-12,terms:["見積","納期","在庫","購入したい","購入を検討","注文","発注","予約","キャンセル","返品","交換","修理","故障","不具合","エラーが出","動作しない","ログインできない","パスワードを忘れ","領収書","請求書の","支払い方法","料金について知りたい","使い方がわからない","使い方を教えて","取材のご依頼","求人に応募","応募したい","採用に応募","体験してみたい","見学","空き状況"]}],allowlist:{notes:"ここに書かれた語が本文にあると、その語に内包される NG ワードのヒットを1件打ち消す。『貴社』『無料相談』などで誤検知しやすいケースに使う。",terms:["貴社製品を購入","御社の製品を購入","貴社の求人","御社の求人","無料相談の予約","資料送付いただいた件","先日ご提案いただいた"]}},j={$schema:"./weights.schema.json",version:1,updated:"2026-08-19",notes:["各レイヤーは『シグナル(code)』を出力し、scoring がここに書かれた points を引いて加算する。","シグナルは 0〜1 の intensity を持つことができ、加点は points * intensity になる(既定は 1)。","レイヤーのスコア = clamp(シグナル加点の合計 / saturation, 0, 1)。saturation はそのレイヤーが満点になる点数。","レイヤーは group に属する。group スコア = Σ(レイヤースコア * weight) / Σ(判定できたレイヤーの weight)。テレメトリが取れず判定不能なレイヤーは母数から外れるので、モバイルでポインタ軌跡が取れないだけでスコアが動くことはない。","weight はグループ内での相対的な重み。グループごとに合計 1.0 になるように書く。","layers[].evidenceOnly を true にすると、そのレイヤーは加点があるときだけ母数に入る。ハニーポットは『引っかかれば決定的な証拠、無反応なら何の情報でもない』ため true にしている。","総合スコア = combine で決める。noisy-or では 1 - Π(1 - groupスコア * groupの weight)。『bot らしさ』と『営業らしさ』は独立した疑いなので、どちらか一方だけでもしきい値に到達できるようにするための既定値。weighted-mean にすると groups[].weight による加重平均になる。","hardBlock に挙げた code が1つでも立つと、他のスコアに関係なく block になる。","points に未登録の code は 0 点として扱われ、result.warnings に列挙される(タイポ検知用)。","チューニングの目安: まず thresholds を動かし、次に layers[].weight、最後に個別の points を触る。"],thresholds:{review:.4,block:.62},hardBlock:["honeypot.filled","honeypot.decoyChecked"],layers:{honeypot:{label:"Layer 1 ハニーポット",group:"automation",weight:.12,evidenceOnly:!0,saturation:4,points:{"honeypot.filled":4,"honeypot.decoyChecked":4,"honeypot.fieldMissing":2,"honeypot.tokenMissing":2,"honeypot.tokenTampered":3}},behavior:{label:"Layer 2 行動解析",group:"automation",weight:.28,saturation:6,points:{"behavior.instantSubmit":4,"behavior.fastSubmit":2.5,"behavior.noMouseActivity":2,"behavior.noFocusEvents":2,"behavior.impossibleTypingSpeed":3,"behavior.noKeystrokes":2.5,"behavior.pastedBody":1.5,"behavior.staleForm":1},tuning:{instantSubmitMs:1500,fastSubmitMs:5e3,staleFormMs:72e5,maxPlausibleCharsPerMinute:1200,minMouseSamples:3,pastedCharsThreshold:120}},environment:{label:"Layer 2.5 自動化ブラウザの痕跡",group:"automation",weight:.22,saturation:6,points:{"env.webdriver":4,"env.headlessUserAgent":4,"env.automationUserAgent":3,"env.botUserAgent":3,"env.noPlugins":1.5,"env.chromeObjectMissing":2,"env.noLanguages":2,"env.viewportEqualsScreen":1.5,"env.zeroOuterWindow":1.5,"env.touchInconsistency":1.5,"env.suspiciousHardwareConcurrency":1,"env.permissionsInconsistency":1.5},tuning:{headlessMarkers:["headlesschrome","headless"],automationMarkers:["puppeteer","playwright","selenium","phantomjs","webdriver"],botUserAgentMarkers:["bot","crawler","spider","python-requests","curl/","wget/","axios/","okhttp","scrapy","http-client"]}},mimicry:{label:"Layer 2.6 『不自然な自然さ』検知",group:"automation",weight:.26,saturation:5,points:{"mimicry.uniformMouseSpeed":2,"mimicry.straightMousePath":2,"mimicry.quantizedMouseSteps":2,"mimicry.uniformKeyIntervals":2.5,"mimicry.quantizedKeyIntervals":2,"mimicry.uniformFieldTransitions":1.5,"mimicry.noJitter":1.5},tuning:{minMouseSamples:12,minKeyIntervals:8,minFieldTransitions:3,mouseSpeedCvFloor:.18,keyIntervalCvFloor:.22,fieldTransitionCvFloor:.12,straightnessCeiling:.985,quantizedRatioCeiling:.6,jitterFloorPx:.75}},checkbox:{label:"Layer 3 チェックボックス認証",group:"automation",weight:.12,saturation:4,points:{"checkbox.unchecked":3,"checkbox.programmaticCheck":4,"checkbox.instantCheck":2,"checkbox.noPointerTrail":1.5,"checkbox.excessiveToggles":1},tuning:{instantCheckMs:250,minPointerTrail:1,maxToggles:6}},content:{label:"Layer 4 営業文面判定",group:"sales",weight:.75,saturation:6,points:{"content.ngWords":4,"content.urlSpam":2,"content.companyIntroOpening":2,"content.signatureBlock":1.5,"content.noJapaneseOnJapaneseForm":1},tuning:{minChars:24,ngScoreSaturation:12,freeUrlAllowance:1,urlSaturation:4,companyIntroHeadChars:120}},aiText:{label:"Layer 6 AI生成文っぽさ判定",group:"sales",weight:.25,saturation:5,points:{"ai.uniformSentenceLength":2,"ai.politeTemplateDensity":2,"ai.lowBurstiness":1.5,"ai.structuredListing":1,"ai.noTypos":1},tuning:{minChars:80,minSentences:4,sentenceLengthCvFloor:.32,politePhraseDensityCeiling:.012,burstinessFloor:.35,humanNoiseMarkers:["！！","。。","、、","www","笑","すみません","ごめん","ちょっと","とりあえず","よろしくです","！？","?!"],politePhrases:["いただければ","いただけますと","いただけますでしょうか","させていただき","させていただければ","ご検討いただ","幸いです","幸甚","存じます","お忙しいところ","お忙しい中","何卒","よろしくお願い申し上げます","ご確認のほど","恐れ入りますが","誠に","つきましては","なお、","また、","さらに、"]}}},combine:"noisy-or",groups:{automation:{label:"自動化・bot の疑い",weight:1},sales:{label:"営業・勧誘目的の疑い",weight:1}}};var Ee={"honeypot.filled":"人間には見えない隠しフィールドに入力があった","honeypot.decoyChecked":"人間なら触らないおとりのチェックボックスがオンになっていた","honeypot.fieldMissing":"注入した隠しフィールドが削除されていた","honeypot.tokenMissing":"フォームに埋め込んだトークンが欠落していた","honeypot.tokenTampered":"フォームに埋め込んだトークンが改ざんされていた","behavior.instantSubmit":"表示から送信までが短すぎる","behavior.fastSubmit":"入力にかけた時間が不自然に短い","behavior.noMouseActivity":"マウス／タッチの操作がまったく観測されなかった","behavior.noFocusEvents":"入力欄へのフォーカス操作が観測されなかった","behavior.impossibleTypingSpeed":"人間には出せない速度で文字が入力された","behavior.noKeystrokes":"キー入力なしで本文が埋まっていた","behavior.pastedBody":"本文がまとめて貼り付けられた","behavior.staleForm":"フォームを開いたまま長時間放置されていた","env.webdriver":"ブラウザ自動化フラグ (navigator.webdriver) が立っている","env.headlessUserAgent":"ヘッドレスブラウザの User-Agent","env.automationUserAgent":"自動化ツールの User-Agent","env.botUserAgent":"クローラー／HTTP クライアントの User-Agent","env.noPlugins":"プラグインが 1 つも存在しない","env.chromeObjectMissing":"Chromium 系なのに window.chrome が存在しない","env.noLanguages":"言語設定が空","env.viewportEqualsScreen":"ビューポートと画面解像度が完全に一致している","env.zeroOuterWindow":"ウィンドウの外形サイズが 0","env.touchInconsistency":"タッチ対応の申告と実際の操作が矛盾している","env.suspiciousHardwareConcurrency":"CPU コア数の申告が不自然","env.permissionsInconsistency":"通知許可の状態に矛盾がある","mimicry.uniformMouseSpeed":"マウス速度のばらつきが小さすぎる","mimicry.straightMousePath":"マウス軌跡が直線的すぎる","mimicry.quantizedMouseSteps":"マウスの移動量が等間隔に量子化されている","mimicry.uniformKeyIntervals":"キー入力間隔が一定すぎる","mimicry.quantizedKeyIntervals":"キー入力間隔が特定の値に張り付いている","mimicry.uniformFieldTransitions":"入力欄の移動間隔が一定すぎる","mimicry.noJitter":"ポインタの微細な揺れがない","checkbox.unchecked":"確認チェックボックスがオンになっていない","checkbox.programmaticCheck":"チェックがスクリプトから操作された","checkbox.instantCheck":"表示直後にチェックされた","checkbox.noPointerTrail":"チェック前のポインタ操作が観測されなかった","checkbox.excessiveToggles":"チェックの切り替え回数が異常に多い","content.ngWords":"営業文面に典型的な表現が含まれている","content.urlSpam":"本文に含まれる URL が多い","content.companyIntroOpening":"冒頭が法人格つきの自己紹介で始まっている","content.signatureBlock":"会社情報を並べた署名ブロックがある","content.noJapaneseOnJapaneseForm":"日本語フォームに日本語がまったく含まれていない","ai.uniformSentenceLength":"文の長さが均質すぎる","ai.politeTemplateDensity":"定型的な丁寧表現の密度が高い","ai.lowBurstiness":"文章のリズムに揺らぎがない","ai.structuredListing":"箇条書き中心の整った構成になっている","ai.noTypos":"口語的な崩れや打ち間違いがまったくない"},sn=Object.keys(Ee),Ae=e=>{var n;return(n=Ee[e])!=null?n:e};var St={honeypot:"Layer 1 ハニーポット",behavior:"Layer 2 行動解析",environment:"Layer 2.5 自動化ブラウザの痕跡",mimicry:"Layer 2.6 不自然な自然さ",checkbox:"Layer 3 チェックボックス認証",content:"Layer 4 営業文面判定",aiText:"Layer 6 AI生成文っぽさ"},Lt={automation:"自動化・bot の疑い",sales:"営業・勧誘目的の疑い"},Mt=["automation","sales"],Te=(e,n,t=!1)=>t||e>=n.block?"block":e>=n.review?"review":"pass",Y=(e,n)=>{var g,y,x,k,L,C,_,M,S;let t=[],r=new Set((g=n.hardBlock)!=null?g:[]),o=[],s=new Map,i=!1;for(let c of e){let b=n.layers[c.layer];b||t.push(`weights.json に layers.${c.layer} の定義がありません`);let E=(y=b==null?void 0:b.points)!=null?y:{},O=(x=b==null?void 0:b.saturation)!=null?x:1,A=(k=b==null?void 0:b.weight)!=null?k:0,T=(L=b==null?void 0:b.group)!=null?L:"automation",I=c.signals.map(R=>{var ye;let Q=$((ye=R.intensity)!=null?ye:1),Z=E[R.code];return Z===void 0&&t.push(`weights.json に layers.${c.layer}.points["${R.code}"] がありません`),r.has(R.code)&&(i=!0),{code:R.code,intensity:w(Q),points:w((Z!=null?Z:0)*Q),label:Ae(R.code),...R.detail?{detail:R.detail}:{}}}),F=I.reduce((R,Q)=>R+Q.points,0),W=$(F/O),X=c.applicable&&A>0&&((b==null?void 0:b.evidenceOnly)!==!0||F>0);if(X){let R=(C=s.get(T))!=null?C:{weighted:0,weight:0};R.weighted+=W*A,R.weight+=A,s.set(T,R)}o.push({layer:c.layer,label:(M=(_=b==null?void 0:b.label)!=null?_:St[c.layer])!=null?M:c.layer,group:T,weight:A,applicable:c.applicable,counted:X,score:w(W),points:w(F),saturation:O,signals:I,metrics:c.metrics,...c.skipped?{skipped:c.skipped}:{}})}let p=[...new Set([...Mt,...o.map(c=>c.group)])].map(c=>{var O,A,T,I;let b=s.get(c),E=(O=n.groups)==null?void 0:O[c];return{group:c,label:(T=(A=E==null?void 0:E.label)!=null?A:Lt[c])!=null?T:c,weight:(I=E==null?void 0:E.weight)!=null?I:1,score:b&&b.weight>0?w(b.weighted/b.weight):0,applicable:!!(b&&b.weight>0)}}),m=p.filter(c=>c.applicable),a=0;if(m.length>0)if(((S=n.combine)!=null?S:"noisy-or")==="weighted-mean"){let c=m.reduce((b,E)=>b+E.weight,0);a=c>0?m.reduce((b,E)=>b+E.score*E.weight,0)/c:0}else a=1-m.reduce((c,b)=>c*(1-$(b.score*b.weight)),1);a=w($(a));let d=Te(a,n.thresholds,i),h=o.filter(c=>c.applicable).flatMap(c=>c.signals).filter(c=>c.points>0||r.has(c.code)),u=[...h.filter(c=>r.has(c.code)),...h.filter(c=>!r.has(c.code)).sort((c,b)=>b.points-c.points)].slice(0,6).map(c=>c.detail?`${c.label}（${c.detail}）`:c.label);return{score:a,groups:p,verdict:d,hardBlocked:i,thresholds:n.thresholds,layers:o,reasons:u,warnings:[...new Set(t)]}};var Re=(e,n={})=>{var s,i;let t=(s=n.weights)!=null?s:j,r=(i=n.ngWords)!=null?i:B,o=[Ce(e.honeypot),we(e.behavior,t.layers.behavior),_e(e.environment,t.layers.environment),Se(e.behavior,t.layers.mimicry),Le(e.checkbox,t.layers.checkbox),G(e.content,t.layers.content,r),V(e.content,t.layers.aiText)];return Y(o,t)},Ie=e=>typeof e=="object"&&e!==null&&!Array.isArray(e),pe=(e,n)=>{let t=(r,o)=>{if(!Ie(o))return o===void 0?r:o;let s=Ie(r)?{...r}:{};for(let[i,l]of Object.entries(o))s[i]=t(s[i],l);return s};return t(e,n)},ue=(e,n)=>{var r,o,s,i,l,p,m,a;if(!n)return e;let t=new Map(e.categories.map(d=>[d.id,{...d}]));for(let d of(r=n.categories)!=null?r:[]){let h=t.get(d.id);if(!h){t.set(d.id,d);continue}t.set(d.id,{...h,...d,terms:[...new Set([...h.terms,...(o=d.terms)!=null?o:[]])],patterns:[...new Set([...(s=h.patterns)!=null?s:[],...(i=d.patterns)!=null?i:[]])]})}return{...e,...n,categories:[...t.values()],allowlist:{...e.allowlist,...n.allowlist,terms:[...new Set([...(p=(l=e.allowlist)==null?void 0:l.terms)!=null?p:[],...(a=(m=n.allowlist)==null?void 0:m.terms)!=null?a:[]])]}}};var _t=["position:absolute !important","left:-9999px !important","top:auto !important","width:1px !important","height:1px !important","overflow:hidden !important","opacity:0 !important","pointer-events:none !important"].join(";"),Pe=e=>{let n=2166136261;for(let t=0;t<e.length;t+=1)n^=e.charCodeAt(t),n=Math.imul(n,16777619)>>>0;return n.toString(36)},$e=(e,n={})=>{var u;let t=e.ownerDocument,r=(u=n.prefix)!=null?u:"mb",o=Date.now(),s=`${Math.random().toString(36).slice(2)}${o.toString(36)}`,i=t.createElement("div");i.setAttribute("aria-hidden","true"),i.setAttribute("data-miyabarrier","honeypot"),i.setAttribute("style",_t);let l=[`${r}_website`,`${r}_company_url`],p=`${r}_sales_optin`,m=`${r}_t`;for(let g of l){let y=t.createElement("input");y.type="text",y.name=g,y.tabIndex=-1,y.autocomplete="off",y.setAttribute("aria-hidden","true");let x=t.createElement("label");x.textContent=g.includes("url")?"Company URL":"Website",x.setAttribute("aria-hidden","true"),i.append(x,y)}let a;if(n.decoy!==!1){a=t.createElement("input"),a.type="checkbox",a.name=p,a.tabIndex=-1,a.setAttribute("aria-hidden","true");let g=t.createElement("label");g.textContent="営業目的の連絡を希望します",g.setAttribute("aria-hidden","true"),i.append(a,g)}let d=t.createElement("input");return d.type="hidden",d.name=m,d.setAttribute("aria-hidden","true"),d.value=`${o}.${Pe(`${o}${s}`)}`,i.append(d),e.append(i),{names:[...l,...a?[p]:[]],state(){var M;let g=l.map(S=>{var b;let c=i.querySelector(`input[name="${S}"]`);return{name:S,value:(b=c==null?void 0:c.value)!=null?b:""}}),y=l.filter(S=>i.querySelector(`input[name="${S}"]`)).length,x=i.querySelector(`input[name="${m}"]`),k=(M=x==null?void 0:x.value)!=null?M:"",[L,C]=k.split("."),_=!!L&&C===Pe(`${L}${s}`)&&Number(L)===o;return{fields:g,decoys:a?[{name:p,checked:a.checked}]:[],expectedFieldCount:y===0?l.length:y,token:{present:k.length>0,valid:_}}},destroy(){i.remove()}}},Ct=/(name|氏名|お名前|担当|company|会社|法人|organization)/i,Et=new Set(["password","hidden","submit","button","reset","file","image","checkbox","radio","range","color"]),At=new Set(["email","tel","url","number","date","time","datetime-local"]),Oe=e=>{var s,i;let n=[],t="",r=0,o=e.querySelectorAll("input, textarea");for(let l of o){if(l.closest("[data-miyabarrier]")||l instanceof HTMLInputElement&&Et.has(l.type))continue;let p=(s=l.value)!=null?s:"";if(p.length===0)continue;r+=p.length;let m=l instanceof HTMLInputElement?l.type:"textarea",a=`${l.name} ${l.id} ${(i=l.getAttribute("placeholder"))!=null?i:""}`;!t&&Ct.test(a)&&(t=p),!At.has(m)&&n.push(p)}return{text:n.join(`
`),senderName:t,typedChars:r}},Ne=(e,n)=>n?[...e.querySelectorAll(n)]:[...e.querySelectorAll("form")].filter(t=>{if(t.getAttribute("data-miyabarrier")==="off"||t.querySelector('input[type="password"]'))return!1;let r=t.querySelector("textarea")!==null,o=t.querySelectorAll('input[type="text"], input[type="email"], input:not([type])').length>=2;return r||o});var Tt=e=>e.length===1||e==="Backspace"||e==="Enter"||e==="Process"||e==="Unidentified",U=(e,n,t)=>{e.push(n),e.length>t&&e.shift()},Fe=e=>e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement||e instanceof HTMLSelectElement,ne=e=>e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement?e.name||e.id||e.type:e instanceof HTMLSelectElement?e.name||e.id||"select":"unknown",re=class{constructor(n,t=n.ownerDocument){this.form=n;this.doc=t;this.renderedAt=Date.now();this.pointer=[];this.keys=[];this.focus=[];this.pastes=[];this.touchEventCount=0;this.lastPointerSampleAt=0;this.lastKeyAt=0;this.lastPasteAt=0;this.fieldLengths=new Map;this.detachers=[];this.attach(),this.probePermissions()}on(n,t,r){let o=r,s={passive:!0,capture:!0};n.addEventListener(t,o,s),this.detachers.push(()=>n.removeEventListener(t,o,s))}attach(){this.on(this.doc,"pointermove",n=>{let t=Date.now();t-this.lastPointerSampleAt<40||(this.lastPointerSampleAt=t,U(this.pointer,{x:n.clientX,y:n.clientY,t},400))}),this.on(this.doc,"pointerdown",n=>{U(this.pointer,{x:n.clientX,y:n.clientY,t:Date.now()},400)}),this.on(this.doc,"touchstart",()=>{this.touchEventCount+=1}),this.on(this.form,"keydown",n=>{Tt(n.key)&&(this.lastKeyAt=Date.now(),U(this.keys,{t:this.lastKeyAt,field:ne(n.target)},600))}),this.on(this.form,"input",n=>{var l,p,m;let t=n.target;if(!Fe(t)||t instanceof HTMLSelectElement)return;let r=ne(t),o=(p=(l=t.value)==null?void 0:l.length)!=null?p:0,s=o-((m=this.fieldLengths.get(r))!=null?m:0);this.fieldLengths.set(r,o);let i=Date.now();s>=20?i-this.lastPasteAt>50&&U(this.pastes,{field:r,t:i,length:s},100):i-this.lastKeyAt>50&&U(this.keys,{t:i,field:r},600)}),this.on(this.form,"focusin",n=>{let t=n.target;Fe(t)&&U(this.focus,{field:ne(t),t:Date.now()},100)}),this.on(this.form,"paste",n=>{var r,o;let t=(o=(r=n.clipboardData)==null?void 0:r.getData("text"))!=null?o:"";this.lastPasteAt=Date.now(),U(this.pastes,{field:ne(n.target),t:this.lastPasteAt,length:t.length},100)})}probePermissions(){var n,t;try{let r=(t=(n=this.doc.defaultView)==null?void 0:n.navigator)==null?void 0:t.permissions;r==null||r.query({name:"notifications"}).then(o=>{this.permissionsQueryState=o.state}).catch(()=>{})}catch{}}pointerSampleCount(){return this.pointer.length+this.touchEventCount}behavior(n,t=Date.now()){return{renderedAt:this.renderedAt,submittedAt:t,pointer:[...this.pointer],keys:[...this.keys],focus:[...this.focus],pastes:[...this.pastes],typedChars:n,touchEventCount:this.touchEventCount}}environment(){var n;return Rt((n=this.doc.defaultView)!=null?n:void 0,this.permissionsQueryState)}destroy(){for(let n of this.detachers)n();this.detachers.length=0}},It=/(chrome|chromium|crios|edg\/|opr\/)/i,Rt=(e,n)=>{var p,m,a,d;let t=e!=null?e:typeof window=="undefined"?void 0:window,r=t==null?void 0:t.navigator,o=(p=r==null?void 0:r.userAgent)!=null?p:"",s;try{s=(m=r==null?void 0:r.plugins)==null?void 0:m.length}catch{s=void 0}let i;try{i=t&&"Notification"in t?t.Notification.permission:void 0}catch{i=void 0}let l={userAgent:o,webdriver:(r==null?void 0:r.webdriver)===!0,isChromium:It.test(o),hasChromeObject:t?"chrome"in t:void 0,languages:r!=null&&r.languages?[...r.languages]:r!=null&&r.language?[r.language]:[],screenWidth:(a=t==null?void 0:t.screen)==null?void 0:a.width,screenHeight:(d=t==null?void 0:t.screen)==null?void 0:d.height,innerWidth:t==null?void 0:t.innerWidth,innerHeight:t==null?void 0:t.innerHeight,outerWidth:t==null?void 0:t.outerWidth,outerHeight:t==null?void 0:t.outerHeight,devicePixelRatio:t==null?void 0:t.devicePixelRatio,hardwareConcurrency:r==null?void 0:r.hardwareConcurrency,maxTouchPoints:r==null?void 0:r.maxTouchPoints};return s!==void 0&&(l.pluginCount=s),i!==void 0&&(l.notificationPermission=i),n!==void 0&&(l.permissionsQueryState=n),l};var oe="miyabarrier:log",be=()=>{try{let e=localStorage.getItem(oe),n=e?JSON.parse(e):[];return Array.isArray(n)?n:[]}catch{return[]}},We=(e,n)=>{try{let t=[...be(),e].slice(-Math.max(1,n));localStorage.setItem(oe,JSON.stringify(t))}catch{}},He=()=>{try{localStorage.removeItem(oe)}catch{}};var Pt={strokeWidth:.8,rings:14,offset:16,radius:33,innerRadius:12,flatten:.64,tilt:116,drift:11},De={rings:5,strokeWidth:2.2,innerRadius:16,drift:6},$t=(e,n)=>{let t=[],r=e*Math.PI/180;for(let o=0;o<n.rings;o+=1){let s=n.rings===1?1:o/(n.rings-1),i=n.innerRadius+(n.radius-n.innerRadius)*s,l=i*n.flatten,p=n.offset+(1-s)*n.drift,m=Math.cos(r)*p,a=Math.sin(r)*p,d=e+n.tilt,h=(.45+.55*(1-s*.55)).toFixed(3);t.push(`<ellipse cx="${m.toFixed(2)}" cy="${a.toFixed(2)}" rx="${i.toFixed(2)}" ry="${l.toFixed(2)}" transform="rotate(${d.toFixed(1)} ${m.toFixed(2)} ${a.toFixed(2)})" opacity="${h}"/>`)}return t.join("")},ie=(e={})=>{var l;let n={...Pt,...e},t=(l=e.idPrefix)!=null?l:"mb-logo",r=e.monochrome?"currentColor":`url(#${t}-grad)`,o=e.monochrome?"currentColor":`url(#${t}-core)`,s=Array.from({length:3},(p,m)=>$t(m*(360/3)-96,n)).join("");return`<svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">${e.monochrome?"":`<defs>
<linearGradient id="${t}-grad" x1="-38" y1="-42" x2="34" y2="44" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="var(--mb-brand-400, #5b8df0)"/>
<stop offset="0.5" stop-color="var(--mb-brand-600, #2a5bd7)"/>
<stop offset="1" stop-color="var(--mb-brand-700, #1e46ad)"/>
</linearGradient>
<radialGradient id="${t}-core" cx="0.5" cy="0.5" r="0.5">
<stop offset="0" stop-color="var(--mb-brand-700, #1e46ad)"/>
<stop offset="1" stop-color="var(--mb-brand-600, #2a5bd7)" stop-opacity="0"/>
</radialGradient></defs>`}<g stroke="${r}" stroke-width="${n.strokeWidth}">${s}</g><ellipse cx="-2" cy="1" rx="12" ry="10" fill="${o}" opacity="${e.monochrome?.5:.85}"/></svg>`};var Be=`
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
  --mb-mono: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Mono', Menlo, Consolas, monospace;`,Ue=`
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
`;var Cn=`
:root {${Be}}
@media (prefers-color-scheme: dark) {
  :root {${Ue}}
}
`,ze=e=>`
${e} {${Be}}
@media (prefers-color-scheme: dark) {
  ${e} {${Ue}}
}
`;var je="miyabarrier-style",Ot="https://github.com/dronehonpo-byte/miyabarrier",Nt=`
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

/* ---------- バッジ ---------- */

.mb-badge {
  display: inline-flex;
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
`,Ke=e=>{if(e.getElementById(je))return;let n=e.createElement("style");n.id=je,n.textContent=ze(".mb-root")+Nt,e.head.append(n)},f=(e,n,t,r)=>{let o=e.createElement(n);return t&&(o.className=t),r!==void 0&&(o.textContent=r),o},he=(e,n)=>{let t=f(e,"span");return t.innerHTML=ie({...De,idPrefix:n}),t},qe=(e,n,t)=>{let r=f(e,"div","mb-root mb-guard"),o=f(e,"label","mb-guard__check"),s=f(e,"input","mb-guard__box");s.type="checkbox",s.name=t,s.id=`${t}-${Math.random().toString(36).slice(2,8)}`,o.htmlFor=s.id,o.append(s,f(e,"span","mb-guard__label",n));let i=f(e,"span","mb-guard__brand");return i.title="Miyabarrier が送信内容を端末内で検証します（外部送信なし）",i.append(he(e,"guard"),f(e,"span",void 0,"Miyabarrier")),r.append(o,i),{wrapper:r,input:s}},Ge=(e,n)=>{let t=f(e,"a",`mb-root mb-badge${n?" mb-badge--floating":""}`);return t.href=Ot,t.target="_blank",t.rel="noopener noreferrer",t.append(he(e,n?"badge-float":"badge")),t.append(f(e,"span",void 0,"Miyabarrier で保護されています")),t},Ft={automation:"自動化・bot",sales:"営業・勧誘の文面"},Wt={honeypot:"L1 ハニーポット",behavior:"L2 行動",environment:"L2.5 環境",mimicry:"L2.6 揺らぎ",checkbox:"L3 チェック",content:"L4 文面",aiText:"L6 AI文"},Ve=(e,n,t,r,o)=>{let s=f(e,"div",`mb-meter${t===null?" mb-meter--muted":""}`),i=f(e,"span","mb-meter__name",n);o&&(i.title=o);let l=f(e,"div","mb-meter__track"),p=f(e,"div",`mb-meter__fill${r==="brand"?"":` mb-meter__fill--${r}`}`);return p.style.width=`${Math.round((t!=null?t:0)*100)}%`,l.append(p),s.append(i,l,f(e,"span","mb-meter__value",t===null?"—":t.toFixed(2))),s},Ye=(e,n)=>e>=n.block?"block":e>=n.review?"review":"pass",Je=(e,n)=>{var d,h;let{result:t}=n,r=t.verdict==="block"?"block":"review",o=f(e,"div",`mb-root mb-panel mb-panel--${r}`);o.setAttribute("role","alert"),o.setAttribute("aria-live","assertive");let s=f(e,"div","mb-panel__head"),i=f(e,"div","mb-panel__icon");i.append(he(e,"panel"));let l=f(e,"div","mb-panel__heading");l.append(f(e,"p","mb-panel__title",t.verdict==="block"?"送信をブロックしました":"送信内容の確認をお願いします"),f(e,"p","mb-panel__message",n.message));let p=f(e,"div","mb-panel__score");p.append(f(e,"b",void 0,t.score.toFixed(2)),f(e,"span",void 0,"score")),p.title=`ブロックのしきい値 ${t.thresholds.block.toFixed(2)} / 確認 ${t.thresholds.review.toFixed(2)}`,s.append(i,l,p),o.append(s);let m=f(e,"div","mb-panel__groups");for(let u of t.groups)m.append(Ve(e,(d=Ft[u.group])!=null?d:u.label,u.applicable?u.score:null,u.applicable?Ye(u.score,t.thresholds):"pass",u.applicable?void 0:"判定に必要な情報が足りないため対象外"));if(o.append(m),t.reasons.length>0){let u=f(e,"ul","mb-panel__reasons");for(let g of t.reasons.slice(0,3))u.append(f(e,"li",void 0,g));o.append(u)}let a=f(e,"div","mb-panel__actions");if(n.onOverride){let u=f(e,"button","mb-btn mb-btn--primary",(h=n.overrideLabel)!=null?h:"それでも送信する");u.type="button",u.addEventListener("click",n.onOverride),a.append(u)}if(n.onDismiss){let u=f(e,"button","mb-btn","閉じる");u.type="button",u.addEventListener("click",n.onDismiss),a.append(u)}return a.childElementCount>0&&o.append(a),n.debug&&o.append(Dt(e,t)),o},Ht=e=>e.skipped?`${e.label} — 判定対象外: ${e.skipped}`:e.counted?`${e.label} — ${e.points} / ${e.saturation} 点 · グループ内の重み ${e.weight}`:`${e.label} — 加点がないため集計対象外（沈黙は証拠として扱わない）`,Dt=(e,n)=>{var s,i;let t=f(e,"details","mb-panel__debug"),r=f(e,"summary");r.append(e.createTextNode("レイヤー別の内訳を見る")),t.append(r);let o=f(e,"div","mb-debug");for(let l of n.layers){let p=f(e,"div","mb-debug__row");if(p.append(Ve(e,(s=Wt[l.layer])!=null?s:l.label,l.counted?l.score:null,l.counted?Ye(l.score,n.thresholds):"pass",Ht(l))),l.signals.length>0){let m=f(e,"div","mb-debug__signals");for(let a of l.signals){let d=f(e,"span","mb-debug__chip",(i=a.code.split(".")[1])!=null?i:a.code);d.title=`${a.label}（+${a.points}）${a.detail?` — ${a.detail}`:""}`,m.append(d)}p.append(m)}o.append(p)}return o.append(f(e,"p","mb-debug__note",`総合 ${n.score.toFixed(2)} ／ ブロックは ${n.thresholds.block.toFixed(2)} 以上・確認は ${n.thresholds.review.toFixed(2)} 以上${n.hardBlocked?" ／ ハニーポット検知による即時ブロック":""}`)),n.warnings.length>0&&o.append(f(e,"p","mb-debug__note",`設定の警告: ${n.warnings.join(" / ")}`)),t.append(o),t};var Bt="0.3.0",Xe={mode:"block",checkbox:!0,checkboxLabel:"営業・勧誘目的の送信ではありません",honeypot:!0,badge:"inline",blockMessage:"営業・勧誘目的の送信、または自動送信の可能性が高いと判定したため送信をブロックしました。お心当たりのない場合は、内容を見直して再度お試しください。",reviewMessage:"営業・勧誘目的の可能性がある内容が含まれています。お問い合わせ内容であれば、そのまま送信してください。",formLanguage:"ja",debug:!1,log:!0,logLimit:200,autoInit:!0},Qe=typeof document=="undefined"?null:document.currentScript,K=(e,n)=>e===void 0?n:e!=="false"&&e!=="0"&&e!=="off",ge=e=>{if(e===void 0)return;let n=Number(e);return Number.isFinite(n)?n:void 0},Ze=e=>{if(!e)return{};let n=e.dataset,t={};(n.mode==="block"||n.mode==="warn"||n.mode==="report")&&(t.mode=n.mode),n.selector&&(t.selector=n.selector),n.checkbox!==void 0&&(t.checkbox=K(n.checkbox,!0)),n.checkboxLabel&&(t.checkboxLabel=n.checkboxLabel),n.honeypot!==void 0&&(t.honeypot=K(n.honeypot,!0)),n.badge!==void 0&&(t.badge=n.badge==="floating"?"floating":K(n.badge,!0)?"inline":!1),n.blockMessage&&(t.blockMessage=n.blockMessage),n.reviewMessage&&(t.reviewMessage=n.reviewMessage),(n.formLanguage==="ja"||n.formLanguage==="en"||n.formLanguage==="auto")&&(t.formLanguage=n.formLanguage),n.debug!==void 0&&(t.debug=K(n.debug,!1)),n.log!==void 0&&(t.log=K(n.log,!0)),n.autoInit!==void 0&&(t.autoInit=K(n.autoInit,!0));let r=ge(n.logLimit);r!==void 0&&(t.logLimit=r);let o=ge(n.reviewThreshold),s=ge(n.blockThreshold);return(o!==void 0||s!==void 0)&&(t.thresholds={...o!==void 0?{review:o}:{},...s!==void 0?{block:s}:{}}),t},et=()=>{let e=globalThis.MIYABARRIER_CONFIG;return e&&typeof e=="object"?e:{}},se=(...e)=>e.reduce((n,t)=>({...n,...t}),{...Xe}),tt=e=>{let n=j;return e.weights&&(n=pe(n,e.weights)),e.thresholds&&(n=pe(n,{thresholds:{...n.thresholds,...e.thresholds}})),n},fe=class{constructor(n,t={}){this.form=n;this.checkedAt=null;this.pointerSamplesBeforeCheck=0;this.toggleCount=0;this.allowNextSubmit=!1;this.cleanups=[];this.options=se(t),this.weights=tt(this.options),this.ngWords=ue(B,this.options.ngWords),this.telemetry=new re(n);let r=n.ownerDocument;Ke(r),this.options.honeypot&&(this.honeypot=$e(n)),this.options.checkbox&&this.mountCheckbox(r),this.options.badge&&this.mountBadge(r);let o=s=>this.handleSubmit(s);n.addEventListener("submit",o,!0),this.cleanups.push(()=>n.removeEventListener("submit",o,!0)),n.setAttribute("data-miyabarrier-protected","true")}insertBeforeSubmit(n){let t=this.form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');t!=null&&t.parentElement?t.parentElement.insertBefore(n,t):this.form.append(n)}mountCheckbox(n){let{wrapper:t,input:r}=qe(n,this.options.checkboxLabel,"mb_confirm");this.checkboxInput=r,r.addEventListener("click",o=>{this.toggleCount+=1,this.trustedClick=o.isTrusted,r.checked?(this.checkedAt=Date.now(),this.pointerSamplesBeforeCheck=this.telemetry.pointerSampleCount()):this.checkedAt=null}),this.insertBeforeSubmit(t),this.cleanups.push(()=>t.remove())}mountBadge(n){let t=Ge(n,this.options.badge==="floating");if(this.options.badge==="floating")if(!n.querySelector(".mb-badge-floating"))n.body.append(t);else return;else this.form.append(t);this.cleanups.push(()=>t.remove())}analyze(){var t,r,o;let n=Oe(this.form);return Re({honeypot:(t=this.honeypot)==null?void 0:t.state(),behavior:this.telemetry.behavior(n.typedChars),environment:this.telemetry.environment(),checkbox:{present:!!this.checkboxInput,checked:(o=(r=this.checkboxInput)==null?void 0:r.checked)!=null?o:!1,renderedAt:this.telemetry.renderedAt,checkedAt:this.checkedAt,trustedClick:this.trustedClick,pointerSamplesBeforeCheck:this.pointerSamplesBeforeCheck,toggleCount:this.toggleCount},content:{text:n.text,senderName:n.senderName,formLanguage:this.options.formLanguage}},{weights:this.weights,ngWords:this.ngWords})}showPanel(n,t){var o,s;(o=this.panel)==null||o.remove();let r=Je(this.form.ownerDocument,{message:n.verdict==="block"?this.options.blockMessage:this.options.reviewMessage,result:n,debug:this.options.debug,...t?{onOverride:()=>{var i;(i=this.panel)==null||i.remove(),this.panel=void 0,this.submitAnyway()}}:{},onDismiss:()=>{var i;(i=this.panel)==null||i.remove(),this.panel=void 0}});this.panel=r,this.insertBeforeSubmit(r),(s=r.scrollIntoView)==null||s.call(r,{behavior:"smooth",block:"nearest"})}submitAnyway(){this.allowNextSubmit=!0,typeof this.form.requestSubmit=="function"?this.form.requestSubmit():this.form.submit()}handleSubmit(n){var i,l,p;if(this.allowNextSubmit){this.allowNextSubmit=!1;return}let t=this.analyze();this.lastResult=t,this.options.log&&We({t:new Date().toISOString(),verdict:t.verdict,score:t.score,hard:t.hardBlocked,reasons:t.reasons,form:this.form.id||this.form.name||"form",path:typeof location=="undefined"?"":location.pathname},this.options.logLimit);let o=((l=(i=this.options).onVerdict)==null?void 0:l.call(i,t,{form:this.form}))===!1;if(this.options.debug&&console.warn("[miyabarrier]",t.verdict,t.score,t.reasons,t),this.options.mode==="report"||o||t.verdict==="pass"){(p=this.panel)==null||p.remove(),this.panel=void 0;return}let s=this.options.mode==="warn"||t.verdict==="review";n.preventDefault(),n.stopImmediatePropagation(),this.showPanel(t,s)}destroy(){var n,t;for(let r of this.cleanups)r();this.cleanups.length=0,(n=this.honeypot)==null||n.destroy(),this.telemetry.destroy(),(t=this.panel)==null||t.remove(),this.form.removeAttribute("data-miyabarrier-protected")}},J=new Map,nt=(e,n={})=>{let t=typeof e=="string"?document.querySelector(e):e;if(!(t instanceof HTMLFormElement))return;let r=J.get(t);if(r)return r;let o=new fe(t,n);return J.set(t,o),o},rt=(e={})=>{let n=se(et(),Ze(Qe),e);return Ne(document,n.selector).map(t=>nt(t,n)).filter(t=>t!==void 0)},Ut=(e,n={})=>{let t=se(n),r=tt(t),o=ue(B,t.ngWords),s={text:e,formLanguage:t.formLanguage};return Y([G(s,r.layers.content,o),V(s,r.layers.aiText)],r)},zt=()=>be(),jt=()=>He(),Kt=()=>{for(let e of J.values())e.destroy();J.clear()},qt={version:Bt,protect:nt,protectAll:rt,analyzeText:Ut,getLog:zt,clearLog:jt,destroyAll:Kt,defaultOptions:Xe,defaultWeights:j,markSvg:ie,defaultNgWords:B,instances:J};if(typeof window!="undefined"){window.Miyabarrier=qt;let e=()=>{se(et(),Ze(Qe)).autoInit!==!1&&rt()};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",e,{once:!0}):e()}export{oe as LOG_STORAGE_KEY,fe as ProtectedForm,Bt as VERSION,Ut as analyzeText,qt as api,jt as clearLog,Xe as defaultOptions,Kt as destroyAll,zt as getLog,nt as protect,rt as protectAll};
