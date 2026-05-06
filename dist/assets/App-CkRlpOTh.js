import{r as p,j as i}from"./index-xmEVfmZE.js";import{i as R,l as He}from"./event-BQZ5yVA6.js";const Zt="/assets/logo-B0pO82Vb.png",as=()=>{};var St={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const en=function(n){const e=[];let t=0;for(let s=0;s<n.length;s++){let r=n.charCodeAt(s);r<128?e[t++]=r:r<2048?(e[t++]=r>>6|192,e[t++]=r&63|128):(r&64512)===55296&&s+1<n.length&&(n.charCodeAt(s+1)&64512)===56320?(r=65536+((r&1023)<<10)+(n.charCodeAt(++s)&1023),e[t++]=r>>18|240,e[t++]=r>>12&63|128,e[t++]=r>>6&63|128,e[t++]=r&63|128):(e[t++]=r>>12|224,e[t++]=r>>6&63|128,e[t++]=r&63|128)}return e},os=function(n){const e=[];let t=0,s=0;for(;t<n.length;){const r=n[t++];if(r<128)e[s++]=String.fromCharCode(r);else if(r>191&&r<224){const a=n[t++];e[s++]=String.fromCharCode((r&31)<<6|a&63)}else if(r>239&&r<365){const a=n[t++],o=n[t++],c=n[t++],l=((r&7)<<18|(a&63)<<12|(o&63)<<6|c&63)-65536;e[s++]=String.fromCharCode(55296+(l>>10)),e[s++]=String.fromCharCode(56320+(l&1023))}else{const a=n[t++],o=n[t++];e[s++]=String.fromCharCode((r&15)<<12|(a&63)<<6|o&63)}}return e.join("")},tn={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,s=[];for(let r=0;r<n.length;r+=3){const a=n[r],o=r+1<n.length,c=o?n[r+1]:0,l=r+2<n.length,d=l?n[r+2]:0,f=a>>2,g=(a&3)<<4|c>>4;let y=(c&15)<<2|d>>6,v=d&63;l||(v=64,o||(y=64)),s.push(t[f],t[g],t[y],t[v])}return s.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(en(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):os(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,s=[];for(let r=0;r<n.length;){const a=t[n.charAt(r++)],c=r<n.length?t[n.charAt(r)]:0;++r;const d=r<n.length?t[n.charAt(r)]:64;++r;const g=r<n.length?t[n.charAt(r)]:64;if(++r,a==null||c==null||d==null||g==null)throw new cs;const y=a<<2|c>>4;if(s.push(y),d!==64){const v=c<<4&240|d>>2;if(s.push(v),g!==64){const C=d<<6&192|g;s.push(C)}}}return s},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class cs extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const ls=function(n){const e=en(n);return tn.encodeByteArray(e,!0)},nn=function(n){return ls(n).replace(/\./g,"")},sn=function(n){try{return tn.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ds(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const hs=()=>ds().__FIREBASE_DEFAULTS__,us=()=>{if(typeof process>"u"||typeof St>"u")return;const n=St.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},fs=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&sn(n[1]);return e&&JSON.parse(e)},st=()=>{try{return as()||hs()||us()||fs()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},ps=n=>{var e,t;return(t=(e=st())==null?void 0:e.emulatorHosts)==null?void 0:t[n]},rn=()=>{var n;return(n=st())==null?void 0:n.config},an=n=>{var e;return(e=st())==null?void 0:e[`_${n}`]};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gs{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,s)=>{t?this.reject(t):this.resolve(s),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,s))}}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function E(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function ms(){return typeof window<"u"&&!!(window.cordova||window.phonegap||window.PhoneGap)&&/ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(E())}function ys(){return typeof navigator<"u"&&navigator.userAgent==="Cloudflare-Workers"}function _s(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function vs(){return typeof navigator=="object"&&navigator.product==="ReactNative"}function bs(){const n=E();return n.indexOf("MSIE ")>=0||n.indexOf("Trident/")>=0}function Is(){try{return typeof indexedDB=="object"}catch{return!1}}function ws(){return new Promise((n,e)=>{try{let t=!0;const s="validate-browser-context-for-indexeddb-analytics-module",r=self.indexedDB.open(s);r.onsuccess=()=>{r.result.close(),t||self.indexedDB.deleteDatabase(s),n(!0)},r.onupgradeneeded=()=>{t=!1},r.onerror=()=>{var a;e(((a=r.error)==null?void 0:a.message)||"")}}catch(t){e(t)}})}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Es="FirebaseError";class z extends Error{constructor(e,t,s){super(t),this.code=e,this.customData=s,this.name=Es,Object.setPrototypeOf(this,z.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,pe.prototype.create)}}class pe{constructor(e,t,s){this.service=e,this.serviceName=t,this.errors=s}create(e,...t){const s=t[0]||{},r=`${this.service}/${e}`,a=this.errors[e],o=a?Ss(a,s):"Error",c=`${this.serviceName}: ${o} (${r}).`;return new z(r,c,s)}}function Ss(n,e){return n.replace(Ts,(t,s)=>{const r=e[s];return r!=null?String(r):`<${s}?>`})}const Ts=/\{\$([^}]+)}/g;function xs(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}function ne(n,e){if(n===e)return!0;const t=Object.keys(n),s=Object.keys(e);for(const r of t){if(!s.includes(r))return!1;const a=n[r],o=e[r];if(Tt(a)&&Tt(o)){if(!ne(a,o))return!1}else if(a!==o)return!1}for(const r of s)if(!t.includes(r))return!1;return!0}function Tt(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ge(n){const e=[];for(const[t,s]of Object.entries(n))Array.isArray(s)?s.forEach(r=>{e.push(encodeURIComponent(t)+"="+encodeURIComponent(r))}):e.push(encodeURIComponent(t)+"="+encodeURIComponent(s));return e.length?"&"+e.join("&"):""}function ks(n,e){const t=new Ns(n,e);return t.subscribe.bind(t)}class Ns{constructor(e,t){this.observers=[],this.unsubscribes=[],this.observerCount=0,this.task=Promise.resolve(),this.finalized=!1,this.onNoObservers=t,this.task.then(()=>{e(this)}).catch(s=>{this.error(s)})}next(e){this.forEachObserver(t=>{t.next(e)})}error(e){this.forEachObserver(t=>{t.error(e)}),this.close(e)}complete(){this.forEachObserver(e=>{e.complete()}),this.close()}subscribe(e,t,s){let r;if(e===void 0&&t===void 0&&s===void 0)throw new Error("Missing Observer.");Cs(e,["next","error","complete"])?r=e:r={next:e,error:t,complete:s},r.next===void 0&&(r.next=$e),r.error===void 0&&(r.error=$e),r.complete===void 0&&(r.complete=$e);const a=this.unsubscribeOne.bind(this,this.observers.length);return this.finalized&&this.task.then(()=>{try{this.finalError?r.error(this.finalError):r.complete()}catch{}}),this.observers.push(r),a}unsubscribeOne(e){this.observers===void 0||this.observers[e]===void 0||(delete this.observers[e],this.observerCount-=1,this.observerCount===0&&this.onNoObservers!==void 0&&this.onNoObservers(this))}forEachObserver(e){if(!this.finalized)for(let t=0;t<this.observers.length;t++)this.sendOne(t,e)}sendOne(e,t){this.task.then(()=>{if(this.observers!==void 0&&this.observers[e]!==void 0)try{t(this.observers[e])}catch(s){typeof console<"u"&&console.error&&console.error(s)}})}close(e){this.finalized||(this.finalized=!0,e!==void 0&&(this.finalError=e),this.task.then(()=>{this.observers=void 0,this.onNoObservers=void 0}))}}function Cs(n,e){if(typeof n!="object"||n===null)return!1;for(const t of e)if(t in n&&typeof n[t]=="function")return!0;return!1}function $e(){}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function G(n){return n&&n._delegate?n._delegate:n}/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function rt(n){try{return(n.startsWith("http://")||n.startsWith("https://")?new URL(n).hostname:n).endsWith(".cloudworkstations.dev")}catch{return!1}}async function As(n){return(await fetch(n,{credentials:"include"})).ok}class se{constructor(e,t,s){this.name=e,this.instanceFactory=t,this.type=s,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const K="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Rs{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const s=new gs;if(this.instancesDeferred.set(t,s),this.isInitialized(t)||this.shouldAutoInitialize())try{const r=this.getOrInitializeService({instanceIdentifier:t});r&&s.resolve(r)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){const t=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),s=(e==null?void 0:e.optional)??!1;if(this.isInitialized(t)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:t})}catch(r){if(s)return null;throw r}else{if(s)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(Os(e))try{this.getOrInitializeService({instanceIdentifier:K})}catch{}for(const[t,s]of this.instancesDeferred.entries()){const r=this.normalizeInstanceIdentifier(t);try{const a=this.getOrInitializeService({instanceIdentifier:r});s.resolve(a)}catch{}}}}clearInstance(e=K){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=K){return this.instances.has(e)}getOptions(e=K){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,s=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(s))throw Error(`${this.name}(${s}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const r=this.getOrInitializeService({instanceIdentifier:s,options:t});for(const[a,o]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(a);s===c&&o.resolve(r)}return r}onInit(e,t){const s=this.normalizeInstanceIdentifier(t),r=this.onInitCallbacks.get(s)??new Set;r.add(e),this.onInitCallbacks.set(s,r);const a=this.instances.get(s);return a&&e(a,s),()=>{r.delete(e)}}invokeOnInitCallbacks(e,t){const s=this.onInitCallbacks.get(t);if(s)for(const r of s)try{r(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let s=this.instances.get(e);if(!s&&this.component&&(s=this.component.instanceFactory(this.container,{instanceIdentifier:Ps(e),options:t}),this.instances.set(e,s),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(s,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,s)}catch{}return s||null}normalizeInstanceIdentifier(e=K){return this.component?this.component.multipleInstances?e:K:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Ps(n){return n===K?void 0:n}function Os(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class js{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new Rs(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var m;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(m||(m={}));const Ds={debug:m.DEBUG,verbose:m.VERBOSE,info:m.INFO,warn:m.WARN,error:m.ERROR,silent:m.SILENT},Ls=m.INFO,Ms={[m.DEBUG]:"log",[m.VERBOSE]:"log",[m.INFO]:"info",[m.WARN]:"warn",[m.ERROR]:"error"},Us=(n,e,...t)=>{if(e<n.logLevel)return;const s=new Date().toISOString(),r=Ms[e];if(r)console[r](`[${s}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class on{constructor(e){this.name=e,this._logLevel=Ls,this._logHandler=Us,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in m))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Ds[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,m.DEBUG,...e),this._logHandler(this,m.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,m.VERBOSE,...e),this._logHandler(this,m.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,m.INFO,...e),this._logHandler(this,m.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,m.WARN,...e),this._logHandler(this,m.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,m.ERROR,...e),this._logHandler(this,m.ERROR,...e)}}const Bs=(n,e)=>e.some(t=>n instanceof t);let xt,kt;function Fs(){return xt||(xt=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Hs(){return kt||(kt=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const cn=new WeakMap,Je=new WeakMap,ln=new WeakMap,Ve=new WeakMap,it=new WeakMap;function $s(n){const e=new Promise((t,s)=>{const r=()=>{n.removeEventListener("success",a),n.removeEventListener("error",o)},a=()=>{t(V(n.result)),r()},o=()=>{s(n.error),r()};n.addEventListener("success",a),n.addEventListener("error",o)});return e.then(t=>{t instanceof IDBCursor&&cn.set(t,n)}).catch(()=>{}),it.set(e,n),e}function Vs(n){if(Je.has(n))return;const e=new Promise((t,s)=>{const r=()=>{n.removeEventListener("complete",a),n.removeEventListener("error",o),n.removeEventListener("abort",o)},a=()=>{t(),r()},o=()=>{s(n.error||new DOMException("AbortError","AbortError")),r()};n.addEventListener("complete",a),n.addEventListener("error",o),n.addEventListener("abort",o)});Je.set(n,e)}let Ye={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return Je.get(n);if(e==="objectStoreNames")return n.objectStoreNames||ln.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return V(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function Ws(n){Ye=n(Ye)}function zs(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const s=n.call(We(this),e,...t);return ln.set(s,e.sort?e.sort():[e]),V(s)}:Hs().includes(n)?function(...e){return n.apply(We(this),e),V(cn.get(this))}:function(...e){return V(n.apply(We(this),e))}}function Gs(n){return typeof n=="function"?zs(n):(n instanceof IDBTransaction&&Vs(n),Bs(n,Fs())?new Proxy(n,Ye):n)}function V(n){if(n instanceof IDBRequest)return $s(n);if(Ve.has(n))return Ve.get(n);const e=Gs(n);return e!==n&&(Ve.set(n,e),it.set(e,n)),e}const We=n=>it.get(n);function qs(n,e,{blocked:t,upgrade:s,blocking:r,terminated:a}={}){const o=indexedDB.open(n,e),c=V(o);return s&&o.addEventListener("upgradeneeded",l=>{s(V(o.result),l.oldVersion,l.newVersion,V(o.transaction),l)}),t&&o.addEventListener("blocked",l=>t(l.oldVersion,l.newVersion,l)),c.then(l=>{a&&l.addEventListener("close",()=>a()),r&&l.addEventListener("versionchange",d=>r(d.oldVersion,d.newVersion,d))}).catch(()=>{}),c}const Ks=["get","getKey","getAll","getAllKeys","count"],Js=["put","add","delete","clear"],ze=new Map;function Nt(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(ze.get(e))return ze.get(e);const t=e.replace(/FromIndex$/,""),s=e!==t,r=Js.includes(t);if(!(t in(s?IDBIndex:IDBObjectStore).prototype)||!(r||Ks.includes(t)))return;const a=async function(o,...c){const l=this.transaction(o,r?"readwrite":"readonly");let d=l.store;return s&&(d=d.index(c.shift())),(await Promise.all([d[t](...c),r&&l.done]))[0]};return ze.set(e,a),a}Ws(n=>({...n,get:(e,t,s)=>Nt(e,t)||n.get(e,t,s),has:(e,t)=>!!Nt(e,t)||n.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ys{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(Xs(t)){const s=t.getImmediate();return`${s.library}/${s.version}`}else return null}).filter(t=>t).join(" ")}}function Xs(n){const e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Xe="@firebase/app",Ct="0.14.11";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const L=new on("@firebase/app"),Qs="@firebase/app-compat",Zs="@firebase/analytics-compat",er="@firebase/analytics",tr="@firebase/app-check-compat",nr="@firebase/app-check",sr="@firebase/auth",rr="@firebase/auth-compat",ir="@firebase/database",ar="@firebase/data-connect",or="@firebase/database-compat",cr="@firebase/functions",lr="@firebase/functions-compat",dr="@firebase/installations",hr="@firebase/installations-compat",ur="@firebase/messaging",fr="@firebase/messaging-compat",pr="@firebase/performance",gr="@firebase/performance-compat",mr="@firebase/remote-config",yr="@firebase/remote-config-compat",_r="@firebase/storage",vr="@firebase/storage-compat",br="@firebase/firestore",Ir="@firebase/ai",wr="@firebase/firestore-compat",Er="firebase",Sr="12.12.0";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Qe="[DEFAULT]",Tr={[Xe]:"fire-core",[Qs]:"fire-core-compat",[er]:"fire-analytics",[Zs]:"fire-analytics-compat",[nr]:"fire-app-check",[tr]:"fire-app-check-compat",[sr]:"fire-auth",[rr]:"fire-auth-compat",[ir]:"fire-rtdb",[ar]:"fire-data-connect",[or]:"fire-rtdb-compat",[cr]:"fire-fn",[lr]:"fire-fn-compat",[dr]:"fire-iid",[hr]:"fire-iid-compat",[ur]:"fire-fcm",[fr]:"fire-fcm-compat",[pr]:"fire-perf",[gr]:"fire-perf-compat",[mr]:"fire-rc",[yr]:"fire-rc-compat",[_r]:"fire-gcs",[vr]:"fire-gcs-compat",[br]:"fire-fst",[wr]:"fire-fst-compat",[Ir]:"fire-vertex","fire-js":"fire-js",[Er]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ke=new Map,xr=new Map,Ze=new Map;function At(n,e){try{n.container.addComponent(e)}catch(t){L.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function he(n){const e=n.name;if(Ze.has(e))return L.debug(`There were multiple attempts to register component ${e}.`),!1;Ze.set(e,n);for(const t of ke.values())At(t,n);for(const t of xr.values())At(t,n);return!0}function dn(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}function P(n){return n==null?!1:n.settings!==void 0}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kr={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},W=new pe("app","Firebase",kr);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nr{constructor(e,t,s){this._isDeleted=!1,this._options={...e},this._config={...t},this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=s,this.container.addComponent(new se("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw W.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const me=Sr;function hn(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const s={name:Qe,automaticDataCollectionEnabled:!0,...e},r=s.name;if(typeof r!="string"||!r)throw W.create("bad-app-name",{appName:String(r)});if(t||(t=rn()),!t)throw W.create("no-options");const a=ke.get(r);if(a){if(ne(t,a.options)&&ne(s,a.config))return a;throw W.create("duplicate-app",{appName:r})}const o=new js(r);for(const l of Ze.values())o.addComponent(l);const c=new Nr(t,s,o);return ke.set(r,c),c}function Cr(n=Qe){const e=ke.get(n);if(!e&&n===Qe&&rn())return hn();if(!e)throw W.create("no-app",{appName:n});return e}function Q(n,e,t){let s=Tr[n]??n;t&&(s+=`-${t}`);const r=s.match(/\s|\//),a=e.match(/\s|\//);if(r||a){const o=[`Unable to register library "${s}" with version "${e}":`];r&&o.push(`library name "${s}" contains illegal characters (whitespace or "/")`),r&&a&&o.push("and"),a&&o.push(`version name "${e}" contains illegal characters (whitespace or "/")`),L.warn(o.join(" "));return}he(new se(`${s}-version`,()=>({library:s,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ar="firebase-heartbeat-database",Rr=1,ue="firebase-heartbeat-store";let Ge=null;function un(){return Ge||(Ge=qs(Ar,Rr,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(ue)}catch(t){console.warn(t)}}}}).catch(n=>{throw W.create("idb-open",{originalErrorMessage:n.message})})),Ge}async function Pr(n){try{const t=(await un()).transaction(ue),s=await t.objectStore(ue).get(fn(n));return await t.done,s}catch(e){if(e instanceof z)L.warn(e.message);else{const t=W.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});L.warn(t.message)}}}async function Rt(n,e){try{const s=(await un()).transaction(ue,"readwrite");await s.objectStore(ue).put(e,fn(n)),await s.done}catch(t){if(t instanceof z)L.warn(t.message);else{const s=W.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});L.warn(s.message)}}}function fn(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Or=1024,jr=30;class Dr{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new Mr(t),this._heartbeatsCachePromise=this._storage.read().then(s=>(this._heartbeatsCache=s,s))}async triggerHeartbeat(){var e,t;try{const r=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),a=Pt();if(((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)==null?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===a||this._heartbeatsCache.heartbeats.some(o=>o.date===a))return;if(this._heartbeatsCache.heartbeats.push({date:a,agent:r}),this._heartbeatsCache.heartbeats.length>jr){const o=Ur(this._heartbeatsCache.heartbeats);this._heartbeatsCache.heartbeats.splice(o,1)}return this._storage.overwrite(this._heartbeatsCache)}catch(s){L.warn(s)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)==null?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=Pt(),{heartbeatsToSend:s,unsentEntries:r}=Lr(this._heartbeatsCache.heartbeats),a=nn(JSON.stringify({version:2,heartbeats:s}));return this._heartbeatsCache.lastSentHeartbeatDate=t,r.length>0?(this._heartbeatsCache.heartbeats=r,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),a}catch(t){return L.warn(t),""}}}function Pt(){return new Date().toISOString().substring(0,10)}function Lr(n,e=Or){const t=[];let s=n.slice();for(const r of n){const a=t.find(o=>o.agent===r.agent);if(a){if(a.dates.push(r.date),Ot(t)>e){a.dates.pop();break}}else if(t.push({agent:r.agent,dates:[r.date]}),Ot(t)>e){t.pop();break}s=s.slice(1)}return{heartbeatsToSend:t,unsentEntries:s}}class Mr{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return Is()?ws().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await Pr(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){if(await this._canUseIndexedDBPromise){const s=await this.read();return Rt(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){if(await this._canUseIndexedDBPromise){const s=await this.read();return Rt(this.app,{lastSentHeartbeatDate:e.lastSentHeartbeatDate??s.lastSentHeartbeatDate,heartbeats:[...s.heartbeats,...e.heartbeats]})}else return}}function Ot(n){return nn(JSON.stringify({version:2,heartbeats:n})).length}function Ur(n){if(n.length===0)return-1;let e=0,t=n[0].date;for(let s=1;s<n.length;s++)n[s].date<t&&(t=n[s].date,e=s);return e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Br(n){he(new se("platform-logger",e=>new Ys(e),"PRIVATE")),he(new se("heartbeat",e=>new Dr(e),"PRIVATE")),Q(Xe,Ct,n),Q(Xe,Ct,"esm2020"),Q("fire-js","")}Br("");function pn(){return{"dependent-sdk-initialized-before-auth":"Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK."}}const Fr=pn,gn=new pe("auth","Firebase",pn());/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ne=new on("@firebase/auth");function Hr(n,...e){Ne.logLevel<=m.WARN&&Ne.warn(`Auth (${me}): ${n}`,...e)}function Ee(n,...e){Ne.logLevel<=m.ERROR&&Ne.error(`Auth (${me}): ${n}`,...e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function M(n,...e){throw at(n,...e)}function x(n,...e){return at(n,...e)}function mn(n,e,t){const s={...Fr(),[e]:t};return new pe("auth","Firebase",s).create(e,{appName:n.name})}function J(n){return mn(n,"operation-not-supported-in-this-environment","Operations that alter the current user are not supported in conjunction with FirebaseServerApp")}function at(n,...e){if(typeof n!="string"){const t=e[0],s=[...e.slice(1)];return s[0]&&(s[0].appName=n.name),n._errorFactory.create(t,...s)}return gn.create(n,...e)}function h(n,e,...t){if(!n)throw at(e,...t)}function j(n){const e="INTERNAL ASSERTION FAILED: "+n;throw Ee(e),new Error(e)}function U(n,e){n||j(e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function et(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.href)||""}function $r(){return jt()==="http:"||jt()==="https:"}function jt(){var n;return typeof self<"u"&&((n=self.location)==null?void 0:n.protocol)||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vr(){return typeof navigator<"u"&&navigator&&"onLine"in navigator&&typeof navigator.onLine=="boolean"&&($r()||_s()||"connection"in navigator)?navigator.onLine:!0}function Wr(){if(typeof navigator>"u")return null;const n=navigator;return n.languages&&n.languages[0]||n.language||null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ye{constructor(e,t){this.shortDelay=e,this.longDelay=t,U(t>e,"Short delay should be less than long delay!"),this.isMobile=ms()||vs()}get(){return Vr()?this.isMobile?this.longDelay:this.shortDelay:Math.min(5e3,this.shortDelay)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ot(n,e){U(n.emulator,"Emulator should always be set here");const{url:t}=n.emulator;return e?`${t}${e.startsWith("/")?e.slice(1):e}`:t}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yn{static initialize(e,t,s){this.fetchImpl=e,t&&(this.headersImpl=t),s&&(this.responseImpl=s)}static fetch(){if(this.fetchImpl)return this.fetchImpl;if(typeof self<"u"&&"fetch"in self)return self.fetch;if(typeof globalThis<"u"&&globalThis.fetch)return globalThis.fetch;if(typeof fetch<"u")return fetch;j("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static headers(){if(this.headersImpl)return this.headersImpl;if(typeof self<"u"&&"Headers"in self)return self.Headers;if(typeof globalThis<"u"&&globalThis.Headers)return globalThis.Headers;if(typeof Headers<"u")return Headers;j("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}static response(){if(this.responseImpl)return this.responseImpl;if(typeof self<"u"&&"Response"in self)return self.Response;if(typeof globalThis<"u"&&globalThis.Response)return globalThis.Response;if(typeof Response<"u")return Response;j("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const zr={CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_PASSWORD:"wrong-password",MISSING_PASSWORD:"missing-password",INVALID_LOGIN_CREDENTIALS:"invalid-credential",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_REQ_TYPE:"internal-error",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",PASSWORD_DOES_NOT_MEET_REQUIREMENTS:"password-does-not-meet-requirements",INVALID_CODE:"invalid-verification-code",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_SESSION_INFO:"missing-verification-id",SESSION_EXPIRED:"code-expired",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",ADMIN_ONLY_OPERATION:"admin-restricted-operation",INVALID_MFA_PENDING_CREDENTIAL:"invalid-multi-factor-session",MFA_ENROLLMENT_NOT_FOUND:"multi-factor-info-not-found",MISSING_MFA_ENROLLMENT_ID:"missing-multi-factor-info",MISSING_MFA_PENDING_CREDENTIAL:"missing-multi-factor-session",SECOND_FACTOR_EXISTS:"second-factor-already-in-use",SECOND_FACTOR_LIMIT_EXCEEDED:"maximum-second-factor-count-exceeded",BLOCKING_FUNCTION_ERROR_RESPONSE:"internal-error",RECAPTCHA_NOT_ENABLED:"recaptcha-not-enabled",MISSING_RECAPTCHA_TOKEN:"missing-recaptcha-token",INVALID_RECAPTCHA_TOKEN:"invalid-recaptcha-token",INVALID_RECAPTCHA_ACTION:"invalid-recaptcha-action",MISSING_CLIENT_TYPE:"missing-client-type",MISSING_RECAPTCHA_VERSION:"missing-recaptcha-version",INVALID_RECAPTCHA_VERSION:"invalid-recaptcha-version",INVALID_REQ_TYPE:"invalid-req-type"};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gr=["/v1/accounts:signInWithCustomToken","/v1/accounts:signInWithEmailLink","/v1/accounts:signInWithIdp","/v1/accounts:signInWithPassword","/v1/accounts:signInWithPhoneNumber","/v1/token"],qr=new ye(3e4,6e4);function ct(n,e){return n.tenantId&&!e.tenantId?{...e,tenantId:n.tenantId}:e}async function ie(n,e,t,s,r={}){return _n(n,r,async()=>{let a={},o={};s&&(e==="GET"?o=s:a={body:JSON.stringify(s)});const c=ge({key:n.config.apiKey,...o}).slice(1),l=await n._getAdditionalHeaders();l["Content-Type"]="application/json",n.languageCode&&(l["X-Firebase-Locale"]=n.languageCode);const d={method:e,headers:l,...a};return ys()||(d.referrerPolicy="no-referrer"),n.emulatorConfig&&rt(n.emulatorConfig.host)&&(d.credentials="include"),yn.fetch()(await vn(n,n.config.apiHost,t,c),d)})}async function _n(n,e,t){n._canInitEmulator=!1;const s={...zr,...e};try{const r=new Jr(n),a=await Promise.race([t(),r.promise]);r.clearNetworkTimeout();const o=await a.json();if("needConfirmation"in o)throw we(n,"account-exists-with-different-credential",o);if(a.ok&&!("errorMessage"in o))return o;{const c=a.ok?o.errorMessage:o.error.message,[l,d]=c.split(" : ");if(l==="FEDERATED_USER_ID_ALREADY_LINKED")throw we(n,"credential-already-in-use",o);if(l==="EMAIL_EXISTS")throw we(n,"email-already-in-use",o);if(l==="USER_DISABLED")throw we(n,"user-disabled",o);const f=s[l]||l.toLowerCase().replace(/[_\s]+/g,"-");if(d)throw mn(n,f,d);M(n,f)}}catch(r){if(r instanceof z)throw r;M(n,"network-request-failed",{message:String(r)})}}async function Kr(n,e,t,s,r={}){const a=await ie(n,e,t,s,r);return"mfaPendingCredential"in a&&M(n,"multi-factor-auth-required",{_serverResponse:a}),a}async function vn(n,e,t,s){const r=`${e}${t}?${s}`,a=n,o=a.config.emulator?ot(n.config,r):`${n.config.apiScheme}://${r}`;return Gr.includes(t)&&(await a._persistenceManagerAvailable,a._getPersistenceType()==="COOKIE")?a._getPersistence()._getFinalTarget(o).toString():o}class Jr{clearNetworkTimeout(){clearTimeout(this.timer)}constructor(e){this.auth=e,this.timer=null,this.promise=new Promise((t,s)=>{this.timer=setTimeout(()=>s(x(this.auth,"network-request-failed")),qr.get())})}}function we(n,e,t){const s={appName:n.name};t.email&&(s.email=t.email),t.phoneNumber&&(s.phoneNumber=t.phoneNumber);const r=x(n,e,s);return r.customData._tokenResponse=t,r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Yr(n,e){return ie(n,"POST","/v1/accounts:delete",e)}async function Ce(n,e){return ie(n,"POST","/v1/accounts:lookup",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function de(n){if(n)try{const e=new Date(Number(n));if(!isNaN(e.getTime()))return e.toUTCString()}catch{}}async function Xr(n,e=!1){const t=G(n),s=await t.getIdToken(e),r=lt(s);h(r&&r.exp&&r.auth_time&&r.iat,t.auth,"internal-error");const a=typeof r.firebase=="object"?r.firebase:void 0,o=a==null?void 0:a.sign_in_provider;return{claims:r,token:s,authTime:de(qe(r.auth_time)),issuedAtTime:de(qe(r.iat)),expirationTime:de(qe(r.exp)),signInProvider:o||null,signInSecondFactor:(a==null?void 0:a.sign_in_second_factor)||null}}function qe(n){return Number(n)*1e3}function lt(n){const[e,t,s]=n.split(".");if(e===void 0||t===void 0||s===void 0)return Ee("JWT malformed, contained fewer than 3 sections"),null;try{const r=sn(t);return r?JSON.parse(r):(Ee("Failed to decode base64 JWT payload"),null)}catch(r){return Ee("Caught error parsing JWT payload as JSON",r==null?void 0:r.toString()),null}}function Dt(n){const e=lt(n);return h(e,"internal-error"),h(typeof e.exp<"u","internal-error"),h(typeof e.iat<"u","internal-error"),Number(e.exp)-Number(e.iat)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function fe(n,e,t=!1){if(t)return e;try{return await e}catch(s){throw s instanceof z&&Qr(s)&&n.auth.currentUser===n&&await n.auth.signOut(),s}}function Qr({code:n}){return n==="auth/user-disabled"||n==="auth/user-token-expired"}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zr{constructor(e){this.user=e,this.isRunning=!1,this.timerId=null,this.errorBackoff=3e4}_start(){this.isRunning||(this.isRunning=!0,this.schedule())}_stop(){this.isRunning&&(this.isRunning=!1,this.timerId!==null&&clearTimeout(this.timerId))}getInterval(e){if(e){const t=this.errorBackoff;return this.errorBackoff=Math.min(this.errorBackoff*2,96e4),t}else{this.errorBackoff=3e4;const s=(this.user.stsTokenManager.expirationTime??0)-Date.now()-3e5;return Math.max(0,s)}}schedule(e=!1){if(!this.isRunning)return;const t=this.getInterval(e);this.timerId=setTimeout(async()=>{await this.iteration()},t)}async iteration(){try{await this.user.getIdToken(!0)}catch(e){(e==null?void 0:e.code)==="auth/network-request-failed"&&this.schedule(!0);return}this.schedule()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tt{constructor(e,t){this.createdAt=e,this.lastLoginAt=t,this._initializeTime()}_initializeTime(){this.lastSignInTime=de(this.lastLoginAt),this.creationTime=de(this.createdAt)}_copy(e){this.createdAt=e.createdAt,this.lastLoginAt=e.lastLoginAt,this._initializeTime()}toJSON(){return{createdAt:this.createdAt,lastLoginAt:this.lastLoginAt}}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Ae(n){var g;const e=n.auth,t=await n.getIdToken(),s=await fe(n,Ce(e,{idToken:t}));h(s==null?void 0:s.users.length,e,"internal-error");const r=s.users[0];n._notifyReloadListener(r);const a=(g=r.providerUserInfo)!=null&&g.length?bn(r.providerUserInfo):[],o=ti(n.providerData,a),c=n.isAnonymous,l=!(n.email&&r.passwordHash)&&!(o!=null&&o.length),d=c?l:!1,f={uid:r.localId,displayName:r.displayName||null,photoURL:r.photoUrl||null,email:r.email||null,emailVerified:r.emailVerified||!1,phoneNumber:r.phoneNumber||null,tenantId:r.tenantId||null,providerData:o,metadata:new tt(r.createdAt,r.lastLoginAt),isAnonymous:d};Object.assign(n,f)}async function ei(n){const e=G(n);await Ae(e),await e.auth._persistUserIfCurrent(e),e.auth._notifyListenersIfCurrent(e)}function ti(n,e){return[...n.filter(s=>!e.some(r=>r.providerId===s.providerId)),...e]}function bn(n){return n.map(({providerId:e,...t})=>({providerId:e,uid:t.rawId||"",displayName:t.displayName||null,email:t.email||null,phoneNumber:t.phoneNumber||null,photoURL:t.photoUrl||null}))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ni(n,e){const t=await _n(n,{},async()=>{const s=ge({grant_type:"refresh_token",refresh_token:e}).slice(1),{tokenApiHost:r,apiKey:a}=n.config,o=await vn(n,r,"/v1/token",`key=${a}`),c=await n._getAdditionalHeaders();c["Content-Type"]="application/x-www-form-urlencoded";const l={method:"POST",headers:c,body:s};return n.emulatorConfig&&rt(n.emulatorConfig.host)&&(l.credentials="include"),yn.fetch()(o,l)});return{accessToken:t.access_token,expiresIn:t.expires_in,refreshToken:t.refresh_token}}async function si(n,e){return ie(n,"POST","/v2/accounts:revokeToken",ct(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Z{constructor(){this.refreshToken=null,this.accessToken=null,this.expirationTime=null}get isExpired(){return!this.expirationTime||Date.now()>this.expirationTime-3e4}updateFromServerResponse(e){h(e.idToken,"internal-error"),h(typeof e.idToken<"u","internal-error"),h(typeof e.refreshToken<"u","internal-error");const t="expiresIn"in e&&typeof e.expiresIn<"u"?Number(e.expiresIn):Dt(e.idToken);this.updateTokensAndExpiration(e.idToken,e.refreshToken,t)}updateFromIdToken(e){h(e.length!==0,"internal-error");const t=Dt(e);this.updateTokensAndExpiration(e,null,t)}async getToken(e,t=!1){return!t&&this.accessToken&&!this.isExpired?this.accessToken:(h(this.refreshToken,e,"user-token-expired"),this.refreshToken?(await this.refresh(e,this.refreshToken),this.accessToken):null)}clearRefreshToken(){this.refreshToken=null}async refresh(e,t){const{accessToken:s,refreshToken:r,expiresIn:a}=await ni(e,t);this.updateTokensAndExpiration(s,r,Number(a))}updateTokensAndExpiration(e,t,s){this.refreshToken=t||null,this.accessToken=e||null,this.expirationTime=Date.now()+s*1e3}static fromJSON(e,t){const{refreshToken:s,accessToken:r,expirationTime:a}=t,o=new Z;return s&&(h(typeof s=="string","internal-error",{appName:e}),o.refreshToken=s),r&&(h(typeof r=="string","internal-error",{appName:e}),o.accessToken=r),a&&(h(typeof a=="number","internal-error",{appName:e}),o.expirationTime=a),o}toJSON(){return{refreshToken:this.refreshToken,accessToken:this.accessToken,expirationTime:this.expirationTime}}_assign(e){this.accessToken=e.accessToken,this.refreshToken=e.refreshToken,this.expirationTime=e.expirationTime}_clone(){return Object.assign(new Z,this.toJSON())}_performRefresh(){return j("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function B(n,e){h(typeof n=="string"||typeof n>"u","internal-error",{appName:e})}class T{constructor({uid:e,auth:t,stsTokenManager:s,...r}){this.providerId="firebase",this.proactiveRefresh=new Zr(this),this.reloadUserInfo=null,this.reloadListener=null,this.uid=e,this.auth=t,this.stsTokenManager=s,this.accessToken=s.accessToken,this.displayName=r.displayName||null,this.email=r.email||null,this.emailVerified=r.emailVerified||!1,this.phoneNumber=r.phoneNumber||null,this.photoURL=r.photoURL||null,this.isAnonymous=r.isAnonymous||!1,this.tenantId=r.tenantId||null,this.providerData=r.providerData?[...r.providerData]:[],this.metadata=new tt(r.createdAt||void 0,r.lastLoginAt||void 0)}async getIdToken(e){const t=await fe(this,this.stsTokenManager.getToken(this.auth,e));return h(t,this.auth,"internal-error"),this.accessToken!==t&&(this.accessToken=t,await this.auth._persistUserIfCurrent(this),this.auth._notifyListenersIfCurrent(this)),t}getIdTokenResult(e){return Xr(this,e)}reload(){return ei(this)}_assign(e){this!==e&&(h(this.uid===e.uid,this.auth,"internal-error"),this.displayName=e.displayName,this.photoURL=e.photoURL,this.email=e.email,this.emailVerified=e.emailVerified,this.phoneNumber=e.phoneNumber,this.isAnonymous=e.isAnonymous,this.tenantId=e.tenantId,this.providerData=e.providerData.map(t=>({...t})),this.metadata._copy(e.metadata),this.stsTokenManager._assign(e.stsTokenManager))}_clone(e){const t=new T({...this,auth:e,stsTokenManager:this.stsTokenManager._clone()});return t.metadata._copy(this.metadata),t}_onReload(e){h(!this.reloadListener,this.auth,"internal-error"),this.reloadListener=e,this.reloadUserInfo&&(this._notifyReloadListener(this.reloadUserInfo),this.reloadUserInfo=null)}_notifyReloadListener(e){this.reloadListener?this.reloadListener(e):this.reloadUserInfo=e}_startProactiveRefresh(){this.proactiveRefresh._start()}_stopProactiveRefresh(){this.proactiveRefresh._stop()}async _updateTokensIfNecessary(e,t=!1){let s=!1;e.idToken&&e.idToken!==this.stsTokenManager.accessToken&&(this.stsTokenManager.updateFromServerResponse(e),s=!0),t&&await Ae(this),await this.auth._persistUserIfCurrent(this),s&&this.auth._notifyListenersIfCurrent(this)}async delete(){if(P(this.auth.app))return Promise.reject(J(this.auth));const e=await this.getIdToken();return await fe(this,Yr(this.auth,{idToken:e})),this.stsTokenManager.clearRefreshToken(),this.auth.signOut()}toJSON(){return{uid:this.uid,email:this.email||void 0,emailVerified:this.emailVerified,displayName:this.displayName||void 0,isAnonymous:this.isAnonymous,photoURL:this.photoURL||void 0,phoneNumber:this.phoneNumber||void 0,tenantId:this.tenantId||void 0,providerData:this.providerData.map(e=>({...e})),stsTokenManager:this.stsTokenManager.toJSON(),_redirectEventId:this._redirectEventId,...this.metadata.toJSON(),apiKey:this.auth.config.apiKey,appName:this.auth.name}}get refreshToken(){return this.stsTokenManager.refreshToken||""}static _fromJSON(e,t){const s=t.displayName??void 0,r=t.email??void 0,a=t.phoneNumber??void 0,o=t.photoURL??void 0,c=t.tenantId??void 0,l=t._redirectEventId??void 0,d=t.createdAt??void 0,f=t.lastLoginAt??void 0,{uid:g,emailVerified:y,isAnonymous:v,providerData:C,stsTokenManager:ae}=t;h(g&&ae,e,"internal-error");const q=Z.fromJSON(this.name,ae);h(typeof g=="string",e,"internal-error"),B(s,e.name),B(r,e.name),h(typeof y=="boolean",e,"internal-error"),h(typeof v=="boolean",e,"internal-error"),B(a,e.name),B(o,e.name),B(c,e.name),B(l,e.name),B(d,e.name),B(f,e.name);const oe=new T({uid:g,auth:e,email:r,emailVerified:y,displayName:s,isAnonymous:v,photoURL:o,phoneNumber:a,tenantId:c,stsTokenManager:q,createdAt:d,lastLoginAt:f});return C&&Array.isArray(C)&&(oe.providerData=C.map(b=>({...b}))),l&&(oe._redirectEventId=l),oe}static async _fromIdTokenResponse(e,t,s=!1){const r=new Z;r.updateFromServerResponse(t);const a=new T({uid:t.localId,auth:e,stsTokenManager:r,isAnonymous:s});return await Ae(a),a}static async _fromGetAccountInfoResponse(e,t,s){const r=t.users[0];h(r.localId!==void 0,"internal-error");const a=r.providerUserInfo!==void 0?bn(r.providerUserInfo):[],o=!(r.email&&r.passwordHash)&&!(a!=null&&a.length),c=new Z;c.updateFromIdToken(s);const l=new T({uid:r.localId,auth:e,stsTokenManager:c,isAnonymous:o}),d={uid:r.localId,displayName:r.displayName||null,photoURL:r.photoUrl||null,email:r.email||null,emailVerified:r.emailVerified||!1,phoneNumber:r.phoneNumber||null,tenantId:r.tenantId||null,providerData:a,metadata:new tt(r.createdAt,r.lastLoginAt),isAnonymous:!(r.email&&r.passwordHash)&&!(a!=null&&a.length)};return Object.assign(l,d),l}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lt=new Map;function D(n){U(n instanceof Function,"Expected a class definition");let e=Lt.get(n);return e?(U(e instanceof n,"Instance stored in cache mismatched with class"),e):(e=new n,Lt.set(n,e),e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class In{constructor(){this.type="NONE",this.storage={}}async _isAvailable(){return!0}async _set(e,t){this.storage[e]=t}async _get(e){const t=this.storage[e];return t===void 0?null:t}async _remove(e){delete this.storage[e]}_addListener(e,t){}_removeListener(e,t){}}In.type="NONE";const Mt=In;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Se(n,e,t){return`firebase:${n}:${e}:${t}`}class ee{constructor(e,t,s){this.persistence=e,this.auth=t,this.userKey=s;const{config:r,name:a}=this.auth;this.fullUserKey=Se(this.userKey,r.apiKey,a),this.fullPersistenceKey=Se("persistence",r.apiKey,a),this.boundEventHandler=t._onStorageEvent.bind(t),this.persistence._addListener(this.fullUserKey,this.boundEventHandler)}setCurrentUser(e){return this.persistence._set(this.fullUserKey,e.toJSON())}async getCurrentUser(){const e=await this.persistence._get(this.fullUserKey);if(!e)return null;if(typeof e=="string"){const t=await Ce(this.auth,{idToken:e}).catch(()=>{});return t?T._fromGetAccountInfoResponse(this.auth,t,e):null}return T._fromJSON(this.auth,e)}removeCurrentUser(){return this.persistence._remove(this.fullUserKey)}savePersistenceForRedirect(){return this.persistence._set(this.fullPersistenceKey,this.persistence.type)}async setPersistence(e){if(this.persistence===e)return;const t=await this.getCurrentUser();if(await this.removeCurrentUser(),this.persistence=e,t)return this.setCurrentUser(t)}delete(){this.persistence._removeListener(this.fullUserKey,this.boundEventHandler)}static async create(e,t,s="authUser"){if(!t.length)return new ee(D(Mt),e,s);const r=(await Promise.all(t.map(async d=>{if(await d._isAvailable())return d}))).filter(d=>d);let a=r[0]||D(Mt);const o=Se(s,e.config.apiKey,e.name);let c=null;for(const d of t)try{const f=await d._get(o);if(f){let g;if(typeof f=="string"){const y=await Ce(e,{idToken:f}).catch(()=>{});if(!y)break;g=await T._fromGetAccountInfoResponse(e,y,f)}else g=T._fromJSON(e,f);d!==a&&(c=g),a=d;break}}catch{}const l=r.filter(d=>d._shouldAllowMigration);return!a._shouldAllowMigration||!l.length?new ee(a,e,s):(a=l[0],c&&await a._set(o,c.toJSON()),await Promise.all(t.map(async d=>{if(d!==a)try{await d._remove(o)}catch{}})),new ee(a,e,s))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ut(n){const e=n.toLowerCase();if(e.includes("opera/")||e.includes("opr/")||e.includes("opios/"))return"Opera";if(Tn(e))return"IEMobile";if(e.includes("msie")||e.includes("trident/"))return"IE";if(e.includes("edge/"))return"Edge";if(wn(e))return"Firefox";if(e.includes("silk/"))return"Silk";if(kn(e))return"Blackberry";if(Nn(e))return"Webos";if(En(e))return"Safari";if((e.includes("chrome/")||Sn(e))&&!e.includes("edge/"))return"Chrome";if(xn(e))return"Android";{const t=/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/,s=n.match(t);if((s==null?void 0:s.length)===2)return s[1]}return"Other"}function wn(n=E()){return/firefox\//i.test(n)}function En(n=E()){const e=n.toLowerCase();return e.includes("safari/")&&!e.includes("chrome/")&&!e.includes("crios/")&&!e.includes("android")}function Sn(n=E()){return/crios\//i.test(n)}function Tn(n=E()){return/iemobile/i.test(n)}function xn(n=E()){return/android/i.test(n)}function kn(n=E()){return/blackberry/i.test(n)}function Nn(n=E()){return/webos/i.test(n)}function dt(n=E()){return/iphone|ipad|ipod/i.test(n)||/macintosh/i.test(n)&&/mobile/i.test(n)}function ri(n=E()){var e;return dt(n)&&!!((e=window.navigator)!=null&&e.standalone)}function ii(){return bs()&&document.documentMode===10}function Cn(n=E()){return dt(n)||xn(n)||Nn(n)||kn(n)||/windows phone/i.test(n)||Tn(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function An(n,e=[]){let t;switch(n){case"Browser":t=Ut(E());break;case"Worker":t=`${Ut(E())}-${n}`;break;default:t=n}const s=e.length?e.join(","):"FirebaseCore-web";return`${t}/JsCore/${me}/${s}`}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ai{constructor(e){this.auth=e,this.queue=[]}pushCallback(e,t){const s=a=>new Promise((o,c)=>{try{const l=e(a);o(l)}catch(l){c(l)}});s.onAbort=t,this.queue.push(s);const r=this.queue.length-1;return()=>{this.queue[r]=()=>Promise.resolve()}}async runMiddleware(e){if(this.auth.currentUser===e)return;const t=[];try{for(const s of this.queue)await s(e),s.onAbort&&t.push(s.onAbort)}catch(s){t.reverse();for(const r of t)try{r()}catch{}throw this.auth._errorFactory.create("login-blocked",{originalMessage:s==null?void 0:s.message})}}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function oi(n,e={}){return ie(n,"GET","/v2/passwordPolicy",ct(n,e))}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ci=6;class li{constructor(e){var s;const t=e.customStrengthOptions;this.customStrengthOptions={},this.customStrengthOptions.minPasswordLength=t.minPasswordLength??ci,t.maxPasswordLength&&(this.customStrengthOptions.maxPasswordLength=t.maxPasswordLength),t.containsLowercaseCharacter!==void 0&&(this.customStrengthOptions.containsLowercaseLetter=t.containsLowercaseCharacter),t.containsUppercaseCharacter!==void 0&&(this.customStrengthOptions.containsUppercaseLetter=t.containsUppercaseCharacter),t.containsNumericCharacter!==void 0&&(this.customStrengthOptions.containsNumericCharacter=t.containsNumericCharacter),t.containsNonAlphanumericCharacter!==void 0&&(this.customStrengthOptions.containsNonAlphanumericCharacter=t.containsNonAlphanumericCharacter),this.enforcementState=e.enforcementState,this.enforcementState==="ENFORCEMENT_STATE_UNSPECIFIED"&&(this.enforcementState="OFF"),this.allowedNonAlphanumericCharacters=((s=e.allowedNonAlphanumericCharacters)==null?void 0:s.join(""))??"",this.forceUpgradeOnSignin=e.forceUpgradeOnSignin??!1,this.schemaVersion=e.schemaVersion}validatePassword(e){const t={isValid:!0,passwordPolicy:this};return this.validatePasswordLengthOptions(e,t),this.validatePasswordCharacterOptions(e,t),t.isValid&&(t.isValid=t.meetsMinPasswordLength??!0),t.isValid&&(t.isValid=t.meetsMaxPasswordLength??!0),t.isValid&&(t.isValid=t.containsLowercaseLetter??!0),t.isValid&&(t.isValid=t.containsUppercaseLetter??!0),t.isValid&&(t.isValid=t.containsNumericCharacter??!0),t.isValid&&(t.isValid=t.containsNonAlphanumericCharacter??!0),t}validatePasswordLengthOptions(e,t){const s=this.customStrengthOptions.minPasswordLength,r=this.customStrengthOptions.maxPasswordLength;s&&(t.meetsMinPasswordLength=e.length>=s),r&&(t.meetsMaxPasswordLength=e.length<=r)}validatePasswordCharacterOptions(e,t){this.updatePasswordCharacterOptionsStatuses(t,!1,!1,!1,!1);let s;for(let r=0;r<e.length;r++)s=e.charAt(r),this.updatePasswordCharacterOptionsStatuses(t,s>="a"&&s<="z",s>="A"&&s<="Z",s>="0"&&s<="9",this.allowedNonAlphanumericCharacters.includes(s))}updatePasswordCharacterOptionsStatuses(e,t,s,r,a){this.customStrengthOptions.containsLowercaseLetter&&(e.containsLowercaseLetter||(e.containsLowercaseLetter=t)),this.customStrengthOptions.containsUppercaseLetter&&(e.containsUppercaseLetter||(e.containsUppercaseLetter=s)),this.customStrengthOptions.containsNumericCharacter&&(e.containsNumericCharacter||(e.containsNumericCharacter=r)),this.customStrengthOptions.containsNonAlphanumericCharacter&&(e.containsNonAlphanumericCharacter||(e.containsNonAlphanumericCharacter=a))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class di{constructor(e,t,s,r){this.app=e,this.heartbeatServiceProvider=t,this.appCheckServiceProvider=s,this.config=r,this.currentUser=null,this.emulatorConfig=null,this.operations=Promise.resolve(),this.authStateSubscription=new Bt(this),this.idTokenSubscription=new Bt(this),this.beforeStateQueue=new ai(this),this.redirectUser=null,this.isProactiveRefreshEnabled=!1,this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION=1,this._canInitEmulator=!0,this._isInitialized=!1,this._deleted=!1,this._initializationPromise=null,this._popupRedirectResolver=null,this._errorFactory=gn,this._agentRecaptchaConfig=null,this._tenantRecaptchaConfigs={},this._projectPasswordPolicy=null,this._tenantPasswordPolicies={},this._resolvePersistenceManagerAvailable=void 0,this.lastNotifiedUid=void 0,this.languageCode=null,this.tenantId=null,this.settings={appVerificationDisabledForTesting:!1},this.frameworks=[],this.name=e.name,this.clientVersion=r.sdkClientVersion,this._persistenceManagerAvailable=new Promise(a=>this._resolvePersistenceManagerAvailable=a)}_initializeWithPersistence(e,t){return t&&(this._popupRedirectResolver=D(t)),this._initializationPromise=this.queue(async()=>{var s,r,a;if(!this._deleted&&(this.persistenceManager=await ee.create(this,e),(s=this._resolvePersistenceManagerAvailable)==null||s.call(this),!this._deleted)){if((r=this._popupRedirectResolver)!=null&&r._shouldInitProactively)try{await this._popupRedirectResolver._initialize(this)}catch{}await this.initializeCurrentUser(t),this.lastNotifiedUid=((a=this.currentUser)==null?void 0:a.uid)||null,!this._deleted&&(this._isInitialized=!0)}}),this._initializationPromise}async _onStorageEvent(){if(this._deleted)return;const e=await this.assertedPersistence.getCurrentUser();if(!(!this.currentUser&&!e)){if(this.currentUser&&e&&this.currentUser.uid===e.uid){this._currentUser._assign(e),await this.currentUser.getIdToken();return}await this._updateCurrentUser(e,!0)}}async initializeCurrentUserFromIdToken(e){try{const t=await Ce(this,{idToken:e}),s=await T._fromGetAccountInfoResponse(this,t,e);await this.directlySetCurrentUser(s)}catch(t){console.warn("FirebaseServerApp could not login user with provided authIdToken: ",t),await this.directlySetCurrentUser(null)}}async initializeCurrentUser(e){var a;if(P(this.app)){const o=this.app.settings.authIdToken;return o?new Promise(c=>{setTimeout(()=>this.initializeCurrentUserFromIdToken(o).then(c,c))}):this.directlySetCurrentUser(null)}const t=await this.assertedPersistence.getCurrentUser();let s=t,r=!1;if(e&&this.config.authDomain){await this.getOrInitRedirectPersistenceManager();const o=(a=this.redirectUser)==null?void 0:a._redirectEventId,c=s==null?void 0:s._redirectEventId,l=await this.tryRedirectSignIn(e);(!o||o===c)&&(l!=null&&l.user)&&(s=l.user,r=!0)}if(!s)return this.directlySetCurrentUser(null);if(!s._redirectEventId){if(r)try{await this.beforeStateQueue.runMiddleware(s)}catch(o){s=t,this._popupRedirectResolver._overrideRedirectResult(this,()=>Promise.reject(o))}return s?this.reloadAndSetCurrentUserOrClear(s):this.directlySetCurrentUser(null)}return h(this._popupRedirectResolver,this,"argument-error"),await this.getOrInitRedirectPersistenceManager(),this.redirectUser&&this.redirectUser._redirectEventId===s._redirectEventId?this.directlySetCurrentUser(s):this.reloadAndSetCurrentUserOrClear(s)}async tryRedirectSignIn(e){let t=null;try{t=await this._popupRedirectResolver._completeRedirectFn(this,e,!0)}catch{await this._setRedirectUser(null)}return t}async reloadAndSetCurrentUserOrClear(e){try{await Ae(e)}catch(t){if((t==null?void 0:t.code)!=="auth/network-request-failed")return this.directlySetCurrentUser(null)}return this.directlySetCurrentUser(e)}useDeviceLanguage(){this.languageCode=Wr()}async _delete(){this._deleted=!0}async updateCurrentUser(e){if(P(this.app))return Promise.reject(J(this));const t=e?G(e):null;return t&&h(t.auth.config.apiKey===this.config.apiKey,this,"invalid-user-token"),this._updateCurrentUser(t&&t._clone(this))}async _updateCurrentUser(e,t=!1){if(!this._deleted)return e&&h(this.tenantId===e.tenantId,this,"tenant-id-mismatch"),t||await this.beforeStateQueue.runMiddleware(e),this.queue(async()=>{await this.directlySetCurrentUser(e),this.notifyAuthListeners()})}async signOut(){return P(this.app)?Promise.reject(J(this)):(await this.beforeStateQueue.runMiddleware(null),(this.redirectPersistenceManager||this._popupRedirectResolver)&&await this._setRedirectUser(null),this._updateCurrentUser(null,!0))}setPersistence(e){return P(this.app)?Promise.reject(J(this)):this.queue(async()=>{await this.assertedPersistence.setPersistence(D(e))})}_getRecaptchaConfig(){return this.tenantId==null?this._agentRecaptchaConfig:this._tenantRecaptchaConfigs[this.tenantId]}async validatePassword(e){this._getPasswordPolicyInternal()||await this._updatePasswordPolicy();const t=this._getPasswordPolicyInternal();return t.schemaVersion!==this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION?Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version",{})):t.validatePassword(e)}_getPasswordPolicyInternal(){return this.tenantId===null?this._projectPasswordPolicy:this._tenantPasswordPolicies[this.tenantId]}async _updatePasswordPolicy(){const e=await oi(this),t=new li(e);this.tenantId===null?this._projectPasswordPolicy=t:this._tenantPasswordPolicies[this.tenantId]=t}_getPersistenceType(){return this.assertedPersistence.persistence.type}_getPersistence(){return this.assertedPersistence.persistence}_updateErrorMap(e){this._errorFactory=new pe("auth","Firebase",e())}onAuthStateChanged(e,t,s){return this.registerStateListener(this.authStateSubscription,e,t,s)}beforeAuthStateChanged(e,t){return this.beforeStateQueue.pushCallback(e,t)}onIdTokenChanged(e,t,s){return this.registerStateListener(this.idTokenSubscription,e,t,s)}authStateReady(){return new Promise((e,t)=>{if(this.currentUser)e();else{const s=this.onAuthStateChanged(()=>{s(),e()},t)}})}async revokeAccessToken(e){if(this.currentUser){const t=await this.currentUser.getIdToken(),s={providerId:"apple.com",tokenType:"ACCESS_TOKEN",token:e,idToken:t};this.tenantId!=null&&(s.tenantId=this.tenantId),await si(this,s)}}toJSON(){var e;return{apiKey:this.config.apiKey,authDomain:this.config.authDomain,appName:this.name,currentUser:(e=this._currentUser)==null?void 0:e.toJSON()}}async _setRedirectUser(e,t){const s=await this.getOrInitRedirectPersistenceManager(t);return e===null?s.removeCurrentUser():s.setCurrentUser(e)}async getOrInitRedirectPersistenceManager(e){if(!this.redirectPersistenceManager){const t=e&&D(e)||this._popupRedirectResolver;h(t,this,"argument-error"),this.redirectPersistenceManager=await ee.create(this,[D(t._redirectPersistence)],"redirectUser"),this.redirectUser=await this.redirectPersistenceManager.getCurrentUser()}return this.redirectPersistenceManager}async _redirectUserForId(e){var t,s;return this._isInitialized&&await this.queue(async()=>{}),((t=this._currentUser)==null?void 0:t._redirectEventId)===e?this._currentUser:((s=this.redirectUser)==null?void 0:s._redirectEventId)===e?this.redirectUser:null}async _persistUserIfCurrent(e){if(e===this.currentUser)return this.queue(async()=>this.directlySetCurrentUser(e))}_notifyListenersIfCurrent(e){e===this.currentUser&&this.notifyAuthListeners()}_key(){return`${this.config.authDomain}:${this.config.apiKey}:${this.name}`}_startProactiveRefresh(){this.isProactiveRefreshEnabled=!0,this.currentUser&&this._currentUser._startProactiveRefresh()}_stopProactiveRefresh(){this.isProactiveRefreshEnabled=!1,this.currentUser&&this._currentUser._stopProactiveRefresh()}get _currentUser(){return this.currentUser}notifyAuthListeners(){var t;if(!this._isInitialized)return;this.idTokenSubscription.next(this.currentUser);const e=((t=this.currentUser)==null?void 0:t.uid)??null;this.lastNotifiedUid!==e&&(this.lastNotifiedUid=e,this.authStateSubscription.next(this.currentUser))}registerStateListener(e,t,s,r){if(this._deleted)return()=>{};const a=typeof t=="function"?t:t.next.bind(t);let o=!1;const c=this._isInitialized?Promise.resolve():this._initializationPromise;if(h(c,this,"internal-error"),c.then(()=>{o||a(this.currentUser)}),typeof t=="function"){const l=e.addObserver(t,s,r);return()=>{o=!0,l()}}else{const l=e.addObserver(t);return()=>{o=!0,l()}}}async directlySetCurrentUser(e){this.currentUser&&this.currentUser!==e&&this._currentUser._stopProactiveRefresh(),e&&this.isProactiveRefreshEnabled&&e._startProactiveRefresh(),this.currentUser=e,e?await this.assertedPersistence.setCurrentUser(e):await this.assertedPersistence.removeCurrentUser()}queue(e){return this.operations=this.operations.then(e,e),this.operations}get assertedPersistence(){return h(this.persistenceManager,this,"internal-error"),this.persistenceManager}_logFramework(e){!e||this.frameworks.includes(e)||(this.frameworks.push(e),this.frameworks.sort(),this.clientVersion=An(this.config.clientPlatform,this._getFrameworks()))}_getFrameworks(){return this.frameworks}async _getAdditionalHeaders(){var r;const e={"X-Client-Version":this.clientVersion};this.app.options.appId&&(e["X-Firebase-gmpid"]=this.app.options.appId);const t=await((r=this.heartbeatServiceProvider.getImmediate({optional:!0}))==null?void 0:r.getHeartbeatsHeader());t&&(e["X-Firebase-Client"]=t);const s=await this._getAppCheckToken();return s&&(e["X-Firebase-AppCheck"]=s),e}async _getAppCheckToken(){var t;if(P(this.app)&&this.app.settings.appCheckToken)return this.app.settings.appCheckToken;const e=await((t=this.appCheckServiceProvider.getImmediate({optional:!0}))==null?void 0:t.getToken());return e!=null&&e.error&&Hr(`Error while retrieving App Check token: ${e.error}`),e==null?void 0:e.token}}function je(n){return G(n)}class Bt{constructor(e){this.auth=e,this.observer=null,this.addObserver=ks(t=>this.observer=t)}get next(){return h(this.observer,this.auth,"internal-error"),this.observer.next.bind(this.observer)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ht={async loadJS(){throw new Error("Unable to load external scripts")},recaptchaV2Script:"",recaptchaEnterpriseScript:"",gapiScript:""};function hi(n){ht=n}function ui(n){return ht.loadJS(n)}function fi(){return ht.gapiScript}function pi(n){return`__${n}${Math.floor(Math.random()*1e6)}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function gi(n,e){const t=dn(n,"auth");if(t.isInitialized()){const r=t.getImmediate(),a=t.getOptions();if(ne(a,e??{}))return r;M(r,"already-initialized")}return t.initialize({options:e})}function mi(n,e){const t=(e==null?void 0:e.persistence)||[],s=(Array.isArray(t)?t:[t]).map(D);e!=null&&e.errorMap&&n._updateErrorMap(e.errorMap),n._initializeWithPersistence(s,e==null?void 0:e.popupRedirectResolver)}function yi(n,e,t){const s=je(n);h(/^https?:\/\//.test(e),s,"invalid-emulator-scheme");const r=!1,a=Rn(e),{host:o,port:c}=_i(e),l=c===null?"":`:${c}`,d={url:`${a}//${o}${l}/`},f=Object.freeze({host:o,port:c,protocol:a.replace(":",""),options:Object.freeze({disableWarnings:r})});if(!s._canInitEmulator){h(s.config.emulator&&s.emulatorConfig,s,"emulator-config-failed"),h(ne(d,s.config.emulator)&&ne(f,s.emulatorConfig),s,"emulator-config-failed");return}s.config.emulator=d,s.emulatorConfig=f,s.settings.appVerificationDisabledForTesting=!0,rt(o)?As(`${a}//${o}${l}`):vi()}function Rn(n){const e=n.indexOf(":");return e<0?"":n.substr(0,e+1)}function _i(n){const e=Rn(n),t=/(\/\/)?([^?#/]+)/.exec(n.substr(e.length));if(!t)return{host:"",port:null};const s=t[2].split("@").pop()||"",r=/^(\[[^\]]+\])(:|$)/.exec(s);if(r){const a=r[1];return{host:a,port:Ft(s.substr(a.length+1))}}else{const[a,o]=s.split(":");return{host:a,port:Ft(o)}}}function Ft(n){if(!n)return null;const e=Number(n);return isNaN(e)?null:e}function vi(){function n(){const e=document.createElement("p"),t=e.style;e.innerText="Running in emulator mode. Do not use with production credentials.",t.position="fixed",t.width="100%",t.backgroundColor="#ffffff",t.border=".1em solid #000000",t.color="#b50000",t.bottom="0px",t.left="0px",t.margin="0px",t.zIndex="10000",t.textAlign="center",e.classList.add("firebase-emulator-warning"),document.body.appendChild(e)}typeof console<"u"&&typeof console.info=="function"&&console.info("WARNING: You are using the Auth Emulator, which is intended for local testing only.  Do not use with production credentials."),typeof window<"u"&&typeof document<"u"&&(document.readyState==="loading"?window.addEventListener("DOMContentLoaded",n):n())}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pn{constructor(e,t){this.providerId=e,this.signInMethod=t}toJSON(){return j("not implemented")}_getIdTokenResponse(e){return j("not implemented")}_linkToIdToken(e,t){return j("not implemented")}_getReauthenticationResolver(e){return j("not implemented")}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function te(n,e){return Kr(n,"POST","/v1/accounts:signInWithIdp",ct(n,e))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bi="http://localhost";class Y extends Pn{constructor(){super(...arguments),this.pendingToken=null}static _fromParams(e){const t=new Y(e.providerId,e.signInMethod);return e.idToken||e.accessToken?(e.idToken&&(t.idToken=e.idToken),e.accessToken&&(t.accessToken=e.accessToken),e.nonce&&!e.pendingToken&&(t.nonce=e.nonce),e.pendingToken&&(t.pendingToken=e.pendingToken)):e.oauthToken&&e.oauthTokenSecret?(t.accessToken=e.oauthToken,t.secret=e.oauthTokenSecret):M("argument-error"),t}toJSON(){return{idToken:this.idToken,accessToken:this.accessToken,secret:this.secret,nonce:this.nonce,pendingToken:this.pendingToken,providerId:this.providerId,signInMethod:this.signInMethod}}static fromJSON(e){const t=typeof e=="string"?JSON.parse(e):e,{providerId:s,signInMethod:r,...a}=t;if(!s||!r)return null;const o=new Y(s,r);return o.idToken=a.idToken||void 0,o.accessToken=a.accessToken||void 0,o.secret=a.secret,o.nonce=a.nonce,o.pendingToken=a.pendingToken||null,o}_getIdTokenResponse(e){const t=this.buildRequest();return te(e,t)}_linkToIdToken(e,t){const s=this.buildRequest();return s.idToken=t,te(e,s)}_getReauthenticationResolver(e){const t=this.buildRequest();return t.autoCreate=!1,te(e,t)}buildRequest(){const e={requestUri:bi,returnSecureToken:!0};if(this.pendingToken)e.pendingToken=this.pendingToken;else{const t={};this.idToken&&(t.id_token=this.idToken),this.accessToken&&(t.access_token=this.accessToken),this.secret&&(t.oauth_token_secret=this.secret),t.providerId=this.providerId,this.nonce&&!this.pendingToken&&(t.nonce=this.nonce),e.postBody=ge(t)}return e}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class On{constructor(e){this.providerId=e,this.defaultLanguageCode=null,this.customParameters={}}setDefaultLanguage(e){this.defaultLanguageCode=e}setCustomParameters(e){return this.customParameters=e,this}getCustomParameters(){return this.customParameters}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _e extends On{constructor(){super(...arguments),this.scopes=[]}addScope(e){return this.scopes.includes(e)||this.scopes.push(e),this}getScopes(){return[...this.scopes]}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class F extends _e{constructor(){super("facebook.com")}static credential(e){return Y._fromParams({providerId:F.PROVIDER_ID,signInMethod:F.FACEBOOK_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return F.credentialFromTaggedObject(e)}static credentialFromError(e){return F.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return F.credential(e.oauthAccessToken)}catch{return null}}}F.FACEBOOK_SIGN_IN_METHOD="facebook.com";F.PROVIDER_ID="facebook.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class O extends _e{constructor(){super("google.com"),this.addScope("profile")}static credential(e,t){return Y._fromParams({providerId:O.PROVIDER_ID,signInMethod:O.GOOGLE_SIGN_IN_METHOD,idToken:e,accessToken:t})}static credentialFromResult(e){return O.credentialFromTaggedObject(e)}static credentialFromError(e){return O.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthIdToken:t,oauthAccessToken:s}=e;if(!t&&!s)return null;try{return O.credential(t,s)}catch{return null}}}O.GOOGLE_SIGN_IN_METHOD="google.com";O.PROVIDER_ID="google.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class H extends _e{constructor(){super("github.com")}static credential(e){return Y._fromParams({providerId:H.PROVIDER_ID,signInMethod:H.GITHUB_SIGN_IN_METHOD,accessToken:e})}static credentialFromResult(e){return H.credentialFromTaggedObject(e)}static credentialFromError(e){return H.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e||!("oauthAccessToken"in e)||!e.oauthAccessToken)return null;try{return H.credential(e.oauthAccessToken)}catch{return null}}}H.GITHUB_SIGN_IN_METHOD="github.com";H.PROVIDER_ID="github.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $ extends _e{constructor(){super("twitter.com")}static credential(e,t){return Y._fromParams({providerId:$.PROVIDER_ID,signInMethod:$.TWITTER_SIGN_IN_METHOD,oauthToken:e,oauthTokenSecret:t})}static credentialFromResult(e){return $.credentialFromTaggedObject(e)}static credentialFromError(e){return $.credentialFromTaggedObject(e.customData||{})}static credentialFromTaggedObject({_tokenResponse:e}){if(!e)return null;const{oauthAccessToken:t,oauthTokenSecret:s}=e;if(!t||!s)return null;try{return $.credential(t,s)}catch{return null}}}$.TWITTER_SIGN_IN_METHOD="twitter.com";$.PROVIDER_ID="twitter.com";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class re{constructor(e){this.user=e.user,this.providerId=e.providerId,this._tokenResponse=e._tokenResponse,this.operationType=e.operationType}static async _fromIdTokenResponse(e,t,s,r=!1){const a=await T._fromIdTokenResponse(e,s,r),o=Ht(s);return new re({user:a,providerId:o,_tokenResponse:s,operationType:t})}static async _forOperation(e,t,s){await e._updateTokensIfNecessary(s,!0);const r=Ht(s);return new re({user:e,providerId:r,_tokenResponse:s,operationType:t})}}function Ht(n){return n.providerId?n.providerId:"phoneNumber"in n?"phone":null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Re extends z{constructor(e,t,s,r){super(t.code,t.message),this.operationType=s,this.user=r,Object.setPrototypeOf(this,Re.prototype),this.customData={appName:e.name,tenantId:e.tenantId??void 0,_serverResponse:t.customData._serverResponse,operationType:s}}static _fromErrorAndOperation(e,t,s,r){return new Re(e,t,s,r)}}function jn(n,e,t,s){return(e==="reauthenticate"?t._getReauthenticationResolver(n):t._getIdTokenResponse(n)).catch(a=>{throw a.code==="auth/multi-factor-auth-required"?Re._fromErrorAndOperation(n,a,e,s):a})}async function Ii(n,e,t=!1){const s=await fe(n,e._linkToIdToken(n.auth,await n.getIdToken()),t);return re._forOperation(n,"link",s)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function wi(n,e,t=!1){const{auth:s}=n;if(P(s.app))return Promise.reject(J(s));const r="reauthenticate";try{const a=await fe(n,jn(s,r,e,n),t);h(a.idToken,s,"internal-error");const o=lt(a.idToken);h(o,s,"internal-error");const{sub:c}=o;return h(n.uid===c,s,"user-mismatch"),re._forOperation(n,r,a)}catch(a){throw(a==null?void 0:a.code)==="auth/user-not-found"&&M(s,"user-mismatch"),a}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Dn(n,e,t=!1){if(P(n.app))return Promise.reject(J(n));const s="signIn",r=await jn(n,s,e),a=await re._fromIdTokenResponse(n,s,r);return t||await n._updateCurrentUser(a.user),a}async function Ei(n,e){return Dn(je(n),e)}function Si(n,e,t,s){return G(n).onIdTokenChanged(e,t,s)}function Ti(n,e,t){return G(n).beforeAuthStateChanged(e,t)}function xi(n,e,t,s){return G(n).onAuthStateChanged(e,t,s)}function ki(n){return G(n).signOut()}const Pe="__sak";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ln{constructor(e,t){this.storageRetriever=e,this.type=t}_isAvailable(){try{return this.storage?(this.storage.setItem(Pe,"1"),this.storage.removeItem(Pe),Promise.resolve(!0)):Promise.resolve(!1)}catch{return Promise.resolve(!1)}}_set(e,t){return this.storage.setItem(e,JSON.stringify(t)),Promise.resolve()}_get(e){const t=this.storage.getItem(e);return Promise.resolve(t?JSON.parse(t):null)}_remove(e){return this.storage.removeItem(e),Promise.resolve()}get storage(){return this.storageRetriever()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ni=1e3,Ci=10;class Mn extends Ln{constructor(){super(()=>window.localStorage,"LOCAL"),this.boundEventHandler=(e,t)=>this.onStorageEvent(e,t),this.listeners={},this.localCache={},this.pollTimer=null,this.fallbackToPolling=Cn(),this._shouldAllowMigration=!0}forAllChangedKeys(e){for(const t of Object.keys(this.listeners)){const s=this.storage.getItem(t),r=this.localCache[t];s!==r&&e(t,r,s)}}onStorageEvent(e,t=!1){if(!e.key){this.forAllChangedKeys((o,c,l)=>{this.notifyListeners(o,l)});return}const s=e.key;t?this.detachListener():this.stopPolling();const r=()=>{const o=this.storage.getItem(s);!t&&this.localCache[s]===o||this.notifyListeners(s,o)},a=this.storage.getItem(s);ii()&&a!==e.newValue&&e.newValue!==e.oldValue?setTimeout(r,Ci):r()}notifyListeners(e,t){this.localCache[e]=t;const s=this.listeners[e];if(s)for(const r of Array.from(s))r(t&&JSON.parse(t))}startPolling(){this.stopPolling(),this.pollTimer=setInterval(()=>{this.forAllChangedKeys((e,t,s)=>{this.onStorageEvent(new StorageEvent("storage",{key:e,oldValue:t,newValue:s}),!0)})},Ni)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}attachListener(){window.addEventListener("storage",this.boundEventHandler)}detachListener(){window.removeEventListener("storage",this.boundEventHandler)}_addListener(e,t){Object.keys(this.listeners).length===0&&(this.fallbackToPolling?this.startPolling():this.attachListener()),this.listeners[e]||(this.listeners[e]=new Set,this.localCache[e]=this.storage.getItem(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&(this.detachListener(),this.stopPolling())}async _set(e,t){await super._set(e,t),this.localCache[e]=JSON.stringify(t)}async _get(e){const t=await super._get(e);return this.localCache[e]=JSON.stringify(t),t}async _remove(e){await super._remove(e),delete this.localCache[e]}}Mn.type="LOCAL";const Ai=Mn;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Un extends Ln{constructor(){super(()=>window.sessionStorage,"SESSION")}_addListener(e,t){}_removeListener(e,t){}}Un.type="SESSION";const Bn=Un;/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ri(n){return Promise.all(n.map(async e=>{try{return{fulfilled:!0,value:await e}}catch(t){return{fulfilled:!1,reason:t}}}))}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class De{constructor(e){this.eventTarget=e,this.handlersMap={},this.boundEventHandler=this.handleEvent.bind(this)}static _getInstance(e){const t=this.receivers.find(r=>r.isListeningto(e));if(t)return t;const s=new De(e);return this.receivers.push(s),s}isListeningto(e){return this.eventTarget===e}async handleEvent(e){const t=e,{eventId:s,eventType:r,data:a}=t.data,o=this.handlersMap[r];if(!(o!=null&&o.size))return;t.ports[0].postMessage({status:"ack",eventId:s,eventType:r});const c=Array.from(o).map(async d=>d(t.origin,a)),l=await Ri(c);t.ports[0].postMessage({status:"done",eventId:s,eventType:r,response:l})}_subscribe(e,t){Object.keys(this.handlersMap).length===0&&this.eventTarget.addEventListener("message",this.boundEventHandler),this.handlersMap[e]||(this.handlersMap[e]=new Set),this.handlersMap[e].add(t)}_unsubscribe(e,t){this.handlersMap[e]&&t&&this.handlersMap[e].delete(t),(!t||this.handlersMap[e].size===0)&&delete this.handlersMap[e],Object.keys(this.handlersMap).length===0&&this.eventTarget.removeEventListener("message",this.boundEventHandler)}}De.receivers=[];/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ut(n="",e=10){let t="";for(let s=0;s<e;s++)t+=Math.floor(Math.random()*10);return n+t}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pi{constructor(e){this.target=e,this.handlers=new Set}removeMessageHandler(e){e.messageChannel&&(e.messageChannel.port1.removeEventListener("message",e.onMessage),e.messageChannel.port1.close()),this.handlers.delete(e)}async _send(e,t,s=50){const r=typeof MessageChannel<"u"?new MessageChannel:null;if(!r)throw new Error("connection_unavailable");let a,o;return new Promise((c,l)=>{const d=ut("",20);r.port1.start();const f=setTimeout(()=>{l(new Error("unsupported_event"))},s);o={messageChannel:r,onMessage(g){const y=g;if(y.data.eventId===d)switch(y.data.status){case"ack":clearTimeout(f),a=setTimeout(()=>{l(new Error("timeout"))},3e3);break;case"done":clearTimeout(a),c(y.data.response);break;default:clearTimeout(f),clearTimeout(a),l(new Error("invalid_response"));break}}},this.handlers.add(o),r.port1.addEventListener("message",o.onMessage),this.target.postMessage({eventType:e,eventId:d,data:t},[r.port2])}).finally(()=>{o&&this.removeMessageHandler(o)})}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function k(){return window}function Oi(n){k().location.href=n}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Fn(){return typeof k().WorkerGlobalScope<"u"&&typeof k().importScripts=="function"}async function ji(){if(!(navigator!=null&&navigator.serviceWorker))return null;try{return(await navigator.serviceWorker.ready).active}catch{return null}}function Di(){var n;return((n=navigator==null?void 0:navigator.serviceWorker)==null?void 0:n.controller)||null}function Li(){return Fn()?self:null}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Hn="firebaseLocalStorageDb",Mi=1,Oe="firebaseLocalStorage",$n="fbase_key";class ve{constructor(e){this.request=e}toPromise(){return new Promise((e,t)=>{this.request.addEventListener("success",()=>{e(this.request.result)}),this.request.addEventListener("error",()=>{t(this.request.error)})})}}function Le(n,e){return n.transaction([Oe],e?"readwrite":"readonly").objectStore(Oe)}function Ui(){const n=indexedDB.deleteDatabase(Hn);return new ve(n).toPromise()}function nt(){const n=indexedDB.open(Hn,Mi);return new Promise((e,t)=>{n.addEventListener("error",()=>{t(n.error)}),n.addEventListener("upgradeneeded",()=>{const s=n.result;try{s.createObjectStore(Oe,{keyPath:$n})}catch(r){t(r)}}),n.addEventListener("success",async()=>{const s=n.result;s.objectStoreNames.contains(Oe)?e(s):(s.close(),await Ui(),e(await nt()))})})}async function $t(n,e,t){const s=Le(n,!0).put({[$n]:e,value:t});return new ve(s).toPromise()}async function Bi(n,e){const t=Le(n,!1).get(e),s=await new ve(t).toPromise();return s===void 0?null:s.value}function Vt(n,e){const t=Le(n,!0).delete(e);return new ve(t).toPromise()}const Fi=800,Hi=3;class Vn{constructor(){this.type="LOCAL",this._shouldAllowMigration=!0,this.listeners={},this.localCache={},this.pollTimer=null,this.pendingWrites=0,this.receiver=null,this.sender=null,this.serviceWorkerReceiverAvailable=!1,this.activeServiceWorker=null,this._workerInitializationPromise=this.initializeServiceWorkerMessaging().then(()=>{},()=>{})}async _openDb(){return this.db?this.db:(this.db=await nt(),this.db)}async _withRetries(e){let t=0;for(;;)try{const s=await this._openDb();return await e(s)}catch(s){if(t++>Hi)throw s;this.db&&(this.db.close(),this.db=void 0)}}async initializeServiceWorkerMessaging(){return Fn()?this.initializeReceiver():this.initializeSender()}async initializeReceiver(){this.receiver=De._getInstance(Li()),this.receiver._subscribe("keyChanged",async(e,t)=>({keyProcessed:(await this._poll()).includes(t.key)})),this.receiver._subscribe("ping",async(e,t)=>["keyChanged"])}async initializeSender(){var t,s;if(this.activeServiceWorker=await ji(),!this.activeServiceWorker)return;this.sender=new Pi(this.activeServiceWorker);const e=await this.sender._send("ping",{},800);e&&(t=e[0])!=null&&t.fulfilled&&(s=e[0])!=null&&s.value.includes("keyChanged")&&(this.serviceWorkerReceiverAvailable=!0)}async notifyServiceWorker(e){if(!(!this.sender||!this.activeServiceWorker||Di()!==this.activeServiceWorker))try{await this.sender._send("keyChanged",{key:e},this.serviceWorkerReceiverAvailable?800:50)}catch{}}async _isAvailable(){try{if(!indexedDB)return!1;const e=await nt();return await $t(e,Pe,"1"),await Vt(e,Pe),!0}catch{}return!1}async _withPendingWrite(e){this.pendingWrites++;try{await e()}finally{this.pendingWrites--}}async _set(e,t){return this._withPendingWrite(async()=>(await this._withRetries(s=>$t(s,e,t)),this.localCache[e]=t,this.notifyServiceWorker(e)))}async _get(e){const t=await this._withRetries(s=>Bi(s,e));return this.localCache[e]=t,t}async _remove(e){return this._withPendingWrite(async()=>(await this._withRetries(t=>Vt(t,e)),delete this.localCache[e],this.notifyServiceWorker(e)))}async _poll(){const e=await this._withRetries(r=>{const a=Le(r,!1).getAll();return new ve(a).toPromise()});if(!e)return[];if(this.pendingWrites!==0)return[];const t=[],s=new Set;if(e.length!==0)for(const{fbase_key:r,value:a}of e)s.add(r),JSON.stringify(this.localCache[r])!==JSON.stringify(a)&&(this.notifyListeners(r,a),t.push(r));for(const r of Object.keys(this.localCache))this.localCache[r]&&!s.has(r)&&(this.notifyListeners(r,null),t.push(r));return t}notifyListeners(e,t){this.localCache[e]=t;const s=this.listeners[e];if(s)for(const r of Array.from(s))r(t)}startPolling(){this.stopPolling(),this.pollTimer=setInterval(async()=>this._poll(),Fi)}stopPolling(){this.pollTimer&&(clearInterval(this.pollTimer),this.pollTimer=null)}_addListener(e,t){Object.keys(this.listeners).length===0&&this.startPolling(),this.listeners[e]||(this.listeners[e]=new Set,this._get(e)),this.listeners[e].add(t)}_removeListener(e,t){this.listeners[e]&&(this.listeners[e].delete(t),this.listeners[e].size===0&&delete this.listeners[e]),Object.keys(this.listeners).length===0&&this.stopPolling()}}Vn.type="LOCAL";const $i=Vn;new ye(3e4,6e4);/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Vi(n,e){return e?D(e):(h(n._popupRedirectResolver,n,"argument-error"),n._popupRedirectResolver)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ft extends Pn{constructor(e){super("custom","custom"),this.params=e}_getIdTokenResponse(e){return te(e,this._buildIdpRequest())}_linkToIdToken(e,t){return te(e,this._buildIdpRequest(t))}_getReauthenticationResolver(e){return te(e,this._buildIdpRequest())}_buildIdpRequest(e){const t={requestUri:this.params.requestUri,sessionId:this.params.sessionId,postBody:this.params.postBody,tenantId:this.params.tenantId,pendingToken:this.params.pendingToken,returnSecureToken:!0,returnIdpCredential:!0};return e&&(t.idToken=e),t}}function Wi(n){return Dn(n.auth,new ft(n),n.bypassAuthState)}function zi(n){const{auth:e,user:t}=n;return h(t,e,"internal-error"),wi(t,new ft(n),n.bypassAuthState)}async function Gi(n){const{auth:e,user:t}=n;return h(t,e,"internal-error"),Ii(t,new ft(n),n.bypassAuthState)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wn{constructor(e,t,s,r,a=!1){this.auth=e,this.resolver=s,this.user=r,this.bypassAuthState=a,this.pendingPromise=null,this.eventManager=null,this.filter=Array.isArray(t)?t:[t]}execute(){return new Promise(async(e,t)=>{this.pendingPromise={resolve:e,reject:t};try{this.eventManager=await this.resolver._initialize(this.auth),await this.onExecution(),this.eventManager.registerConsumer(this)}catch(s){this.reject(s)}})}async onAuthEvent(e){const{urlResponse:t,sessionId:s,postBody:r,tenantId:a,error:o,type:c}=e;if(o){this.reject(o);return}const l={auth:this.auth,requestUri:t,sessionId:s,tenantId:a||void 0,postBody:r||void 0,user:this.user,bypassAuthState:this.bypassAuthState};try{this.resolve(await this.getIdpTask(c)(l))}catch(d){this.reject(d)}}onError(e){this.reject(e)}getIdpTask(e){switch(e){case"signInViaPopup":case"signInViaRedirect":return Wi;case"linkViaPopup":case"linkViaRedirect":return Gi;case"reauthViaPopup":case"reauthViaRedirect":return zi;default:M(this.auth,"internal-error")}}resolve(e){U(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.resolve(e),this.unregisterAndCleanUp()}reject(e){U(this.pendingPromise,"Pending promise was never set"),this.pendingPromise.reject(e),this.unregisterAndCleanUp()}unregisterAndCleanUp(){this.eventManager&&this.eventManager.unregisterConsumer(this),this.pendingPromise=null,this.cleanUp()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qi=new ye(2e3,1e4);class X extends Wn{constructor(e,t,s,r,a){super(e,t,r,a),this.provider=s,this.authWindow=null,this.pollId=null,X.currentPopupAction&&X.currentPopupAction.cancel(),X.currentPopupAction=this}async executeNotNull(){const e=await this.execute();return h(e,this.auth,"internal-error"),e}async onExecution(){U(this.filter.length===1,"Popup operations only handle one event");const e=ut();this.authWindow=await this.resolver._openPopup(this.auth,this.provider,this.filter[0],e),this.authWindow.associatedEvent=e,this.resolver._originValidation(this.auth).catch(t=>{this.reject(t)}),this.resolver._isIframeWebStorageSupported(this.auth,t=>{t||this.reject(x(this.auth,"web-storage-unsupported"))}),this.pollUserCancellation()}get eventId(){var e;return((e=this.authWindow)==null?void 0:e.associatedEvent)||null}cancel(){this.reject(x(this.auth,"cancelled-popup-request"))}cleanUp(){this.authWindow&&this.authWindow.close(),this.pollId&&window.clearTimeout(this.pollId),this.authWindow=null,this.pollId=null,X.currentPopupAction=null}pollUserCancellation(){const e=()=>{var t,s;if((s=(t=this.authWindow)==null?void 0:t.window)!=null&&s.closed){this.pollId=window.setTimeout(()=>{this.pollId=null,this.reject(x(this.auth,"popup-closed-by-user"))},8e3);return}this.pollId=window.setTimeout(e,qi.get())};e()}}X.currentPopupAction=null;/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ki="pendingRedirect",Te=new Map;class Ji extends Wn{constructor(e,t,s=!1){super(e,["signInViaRedirect","linkViaRedirect","reauthViaRedirect","unknown"],t,void 0,s),this.eventId=null}async execute(){let e=Te.get(this.auth._key());if(!e){try{const s=await Yi(this.resolver,this.auth)?await super.execute():null;e=()=>Promise.resolve(s)}catch(t){e=()=>Promise.reject(t)}Te.set(this.auth._key(),e)}return this.bypassAuthState||Te.set(this.auth._key(),()=>Promise.resolve(null)),e()}async onAuthEvent(e){if(e.type==="signInViaRedirect")return super.onAuthEvent(e);if(e.type==="unknown"){this.resolve(null);return}if(e.eventId){const t=await this.auth._redirectUserForId(e.eventId);if(t)return this.user=t,super.onAuthEvent(e);this.resolve(null)}}async onExecution(){}cleanUp(){}}async function Yi(n,e){const t=Zi(e),s=Qi(n);if(!await s._isAvailable())return!1;const r=await s._get(t)==="true";return await s._remove(t),r}function Xi(n,e){Te.set(n._key(),e)}function Qi(n){return D(n._redirectPersistence)}function Zi(n){return Se(Ki,n.config.apiKey,n.name)}async function ea(n,e,t=!1){if(P(n.app))return Promise.reject(J(n));const s=je(n),r=Vi(s,e),o=await new Ji(s,r,t).execute();return o&&!t&&(delete o.user._redirectEventId,await s._persistUserIfCurrent(o.user),await s._setRedirectUser(null,e)),o}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ta=10*60*1e3;class na{constructor(e){this.auth=e,this.cachedEventUids=new Set,this.consumers=new Set,this.queuedRedirectEvent=null,this.hasHandledPotentialRedirect=!1,this.lastProcessedEventTime=Date.now()}registerConsumer(e){this.consumers.add(e),this.queuedRedirectEvent&&this.isEventForConsumer(this.queuedRedirectEvent,e)&&(this.sendToConsumer(this.queuedRedirectEvent,e),this.saveEventToCache(this.queuedRedirectEvent),this.queuedRedirectEvent=null)}unregisterConsumer(e){this.consumers.delete(e)}onEvent(e){if(this.hasEventBeenHandled(e))return!1;let t=!1;return this.consumers.forEach(s=>{this.isEventForConsumer(e,s)&&(t=!0,this.sendToConsumer(e,s),this.saveEventToCache(e))}),this.hasHandledPotentialRedirect||!sa(e)||(this.hasHandledPotentialRedirect=!0,t||(this.queuedRedirectEvent=e,t=!0)),t}sendToConsumer(e,t){var s;if(e.error&&!zn(e)){const r=((s=e.error.code)==null?void 0:s.split("auth/")[1])||"internal-error";t.onError(x(this.auth,r))}else t.onAuthEvent(e)}isEventForConsumer(e,t){const s=t.eventId===null||!!e.eventId&&e.eventId===t.eventId;return t.filter.includes(e.type)&&s}hasEventBeenHandled(e){return Date.now()-this.lastProcessedEventTime>=ta&&this.cachedEventUids.clear(),this.cachedEventUids.has(Wt(e))}saveEventToCache(e){this.cachedEventUids.add(Wt(e)),this.lastProcessedEventTime=Date.now()}}function Wt(n){return[n.type,n.eventId,n.sessionId,n.tenantId].filter(e=>e).join("-")}function zn({type:n,error:e}){return n==="unknown"&&(e==null?void 0:e.code)==="auth/no-auth-event"}function sa(n){switch(n.type){case"signInViaRedirect":case"linkViaRedirect":case"reauthViaRedirect":return!0;case"unknown":return zn(n);default:return!1}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ra(n,e={}){return ie(n,"GET","/v1/projects",e)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ia=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,aa=/^https?/;async function oa(n){if(n.config.emulator)return;const{authorizedDomains:e}=await ra(n);for(const t of e)try{if(ca(t))return}catch{}M(n,"unauthorized-domain")}function ca(n){const e=et(),{protocol:t,hostname:s}=new URL(e);if(n.startsWith("chrome-extension://")){const o=new URL(n);return o.hostname===""&&s===""?t==="chrome-extension:"&&n.replace("chrome-extension://","")===e.replace("chrome-extension://",""):t==="chrome-extension:"&&o.hostname===s}if(!aa.test(t))return!1;if(ia.test(n))return s===n;const r=n.replace(/\./g,"\\.");return new RegExp("^(.+\\."+r+"|"+r+")$","i").test(s)}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const la=new ye(3e4,6e4);function zt(){const n=k().___jsl;if(n!=null&&n.H){for(const e of Object.keys(n.H))if(n.H[e].r=n.H[e].r||[],n.H[e].L=n.H[e].L||[],n.H[e].r=[...n.H[e].L],n.CP)for(let t=0;t<n.CP.length;t++)n.CP[t]=null}}function da(n){return new Promise((e,t)=>{var r,a,o;function s(){zt(),gapi.load("gapi.iframes",{callback:()=>{e(gapi.iframes.getContext())},ontimeout:()=>{zt(),t(x(n,"network-request-failed"))},timeout:la.get()})}if((a=(r=k().gapi)==null?void 0:r.iframes)!=null&&a.Iframe)e(gapi.iframes.getContext());else if((o=k().gapi)!=null&&o.load)s();else{const c=pi("iframefcb");return k()[c]=()=>{gapi.load?s():t(x(n,"network-request-failed"))},ui(`${fi()}?onload=${c}`).catch(l=>t(l))}}).catch(e=>{throw xe=null,e})}let xe=null;function ha(n){return xe=xe||da(n),xe}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ua=new ye(5e3,15e3),fa="__/auth/iframe",pa="emulator/auth/iframe",ga={style:{position:"absolute",top:"-100px",width:"1px",height:"1px"},"aria-hidden":"true",tabindex:"-1"},ma=new Map([["identitytoolkit.googleapis.com","p"],["staging-identitytoolkit.sandbox.googleapis.com","s"],["test-identitytoolkit.sandbox.googleapis.com","t"]]);function ya(n){const e=n.config;h(e.authDomain,n,"auth-domain-config-required");const t=e.emulator?ot(e,pa):`https://${n.config.authDomain}/${fa}`,s={apiKey:e.apiKey,appName:n.name,v:me},r=ma.get(n.config.apiHost);r&&(s.eid=r);const a=n._getFrameworks();return a.length&&(s.fw=a.join(",")),`${t}?${ge(s).slice(1)}`}async function _a(n){const e=await ha(n),t=k().gapi;return h(t,n,"internal-error"),e.open({where:document.body,url:ya(n),messageHandlersFilter:t.iframes.CROSS_ORIGIN_IFRAMES_FILTER,attributes:ga,dontclear:!0},s=>new Promise(async(r,a)=>{await s.restyle({setHideOnLeave:!1});const o=x(n,"network-request-failed"),c=k().setTimeout(()=>{a(o)},ua.get());function l(){k().clearTimeout(c),r(s)}s.ping(l).then(l,()=>{a(o)})}))}/**
 * @license
 * Copyright 2020 Google LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const va={location:"yes",resizable:"yes",statusbar:"yes",toolbar:"no"},ba=500,Ia=600,wa="_blank",Ea="http://localhost";class Gt{constructor(e){this.window=e,this.associatedEvent=null}close(){if(this.window)try{this.window.close()}catch{}}}function Sa(n,e,t,s=ba,r=Ia){const a=Math.max((window.screen.availHeight-r)/2,0).toString(),o=Math.max((window.screen.availWidth-s)/2,0).toString();let c="";const l={...va,width:s.toString(),height:r.toString(),top:a,left:o},d=E().toLowerCase();t&&(c=Sn(d)?wa:t),wn(d)&&(e=e||Ea,l.scrollbars="yes");const f=Object.entries(l).reduce((y,[v,C])=>`${y}${v}=${C},`,"");if(ri(d)&&c!=="_self")return Ta(e||"",c),new Gt(null);const g=window.open(e||"",c,f);h(g,n,"popup-blocked");try{g.focus()}catch{}return new Gt(g)}function Ta(n,e){const t=document.createElement("a");t.href=n,t.target=e;const s=document.createEvent("MouseEvent");s.initMouseEvent("click",!0,!0,window,1,0,0,0,0,!1,!1,!1,!1,1,null),t.dispatchEvent(s)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const xa="__/auth/handler",ka="emulator/auth/handler",Na=encodeURIComponent("fac");async function qt(n,e,t,s,r,a){h(n.config.authDomain,n,"auth-domain-config-required"),h(n.config.apiKey,n,"invalid-api-key");const o={apiKey:n.config.apiKey,appName:n.name,authType:t,redirectUrl:s,v:me,eventId:r};if(e instanceof On){e.setDefaultLanguage(n.languageCode),o.providerId=e.providerId||"",xs(e.getCustomParameters())||(o.customParameters=JSON.stringify(e.getCustomParameters()));for(const[f,g]of Object.entries({}))o[f]=g}if(e instanceof _e){const f=e.getScopes().filter(g=>g!=="");f.length>0&&(o.scopes=f.join(","))}n.tenantId&&(o.tid=n.tenantId);const c=o;for(const f of Object.keys(c))c[f]===void 0&&delete c[f];const l=await n._getAppCheckToken(),d=l?`#${Na}=${encodeURIComponent(l)}`:"";return`${Ca(n)}?${ge(c).slice(1)}${d}`}function Ca({config:n}){return n.emulator?ot(n,ka):`https://${n.authDomain}/${xa}`}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ke="webStorageSupport";class Aa{constructor(){this.eventManagers={},this.iframes={},this.originValidationPromises={},this._redirectPersistence=Bn,this._completeRedirectFn=ea,this._overrideRedirectResult=Xi}async _openPopup(e,t,s,r){var o;U((o=this.eventManagers[e._key()])==null?void 0:o.manager,"_initialize() not called before _openPopup()");const a=await qt(e,t,s,et(),r);return Sa(e,a,ut())}async _openRedirect(e,t,s,r){await this._originValidation(e);const a=await qt(e,t,s,et(),r);return Oi(a),new Promise(()=>{})}_initialize(e){const t=e._key();if(this.eventManagers[t]){const{manager:r,promise:a}=this.eventManagers[t];return r?Promise.resolve(r):(U(a,"If manager is not set, promise should be"),a)}const s=this.initAndGetManager(e);return this.eventManagers[t]={promise:s},s.catch(()=>{delete this.eventManagers[t]}),s}async initAndGetManager(e){const t=await _a(e),s=new na(e);return t.register("authEvent",r=>(h(r==null?void 0:r.authEvent,e,"invalid-auth-event"),{status:s.onEvent(r.authEvent)?"ACK":"ERROR"}),gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER),this.eventManagers[e._key()]={manager:s},this.iframes[e._key()]=t,s}_isIframeWebStorageSupported(e,t){this.iframes[e._key()].send(Ke,{type:Ke},r=>{var o;const a=(o=r==null?void 0:r[0])==null?void 0:o[Ke];a!==void 0&&t(!!a),M(e,"internal-error")},gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER)}_originValidation(e){const t=e._key();return this.originValidationPromises[t]||(this.originValidationPromises[t]=oa(e)),this.originValidationPromises[t]}get _shouldInitProactively(){return Cn()||En()||dt()}}const Ra=Aa;var Kt="@firebase/auth",Jt="1.13.0";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pa{constructor(e){this.auth=e,this.internalListeners=new Map}getUid(){var e;return this.assertAuthConfigured(),((e=this.auth.currentUser)==null?void 0:e.uid)||null}async getToken(e){return this.assertAuthConfigured(),await this.auth._initializationPromise,this.auth.currentUser?{accessToken:await this.auth.currentUser.getIdToken(e)}:null}addAuthTokenListener(e){if(this.assertAuthConfigured(),this.internalListeners.has(e))return;const t=this.auth.onIdTokenChanged(s=>{e((s==null?void 0:s.stsTokenManager.accessToken)||null)});this.internalListeners.set(e,t),this.updateProactiveRefresh()}removeAuthTokenListener(e){this.assertAuthConfigured();const t=this.internalListeners.get(e);t&&(this.internalListeners.delete(e),t(),this.updateProactiveRefresh())}assertAuthConfigured(){h(this.auth._initializationPromise,"dependent-sdk-initialized-before-auth")}updateProactiveRefresh(){this.internalListeners.size>0?this.auth._startProactiveRefresh():this.auth._stopProactiveRefresh()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Oa(n){switch(n){case"Node":return"node";case"ReactNative":return"rn";case"Worker":return"webworker";case"Cordova":return"cordova";case"WebExtension":return"web-extension";default:return}}function ja(n){he(new se("auth",(e,{options:t})=>{const s=e.getProvider("app").getImmediate(),r=e.getProvider("heartbeat"),a=e.getProvider("app-check-internal"),{apiKey:o,authDomain:c}=s.options;h(o&&!o.includes(":"),"invalid-api-key",{appName:s.name});const l={apiKey:o,authDomain:c,clientPlatform:n,apiHost:"identitytoolkit.googleapis.com",tokenApiHost:"securetoken.googleapis.com",apiScheme:"https",sdkClientVersion:An(n)},d=new di(s,r,a,l);return mi(d,t),d},"PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback((e,t,s)=>{e.getProvider("auth-internal").initialize()})),he(new se("auth-internal",e=>{const t=je(e.getProvider("auth").getImmediate());return(s=>new Pa(s))(t)},"PRIVATE").setInstantiationMode("EXPLICIT")),Q(Kt,Jt,Oa(n)),Q(Kt,Jt,"esm2020")}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Da=5*60,La=an("authIdTokenMaxAge")||Da;let Yt=null;const Ma=n=>async e=>{const t=e&&await e.getIdTokenResult(),s=t&&(new Date().getTime()-Date.parse(t.issuedAtTime))/1e3;if(s&&s>La)return;const r=t==null?void 0:t.token;Yt!==r&&(Yt=r,await fetch(n,{method:r?"POST":"DELETE",headers:r?{Authorization:`Bearer ${r}`}:{}}))};function Ua(n=Cr()){const e=dn(n,"auth");if(e.isInitialized())return e.getImmediate();const t=gi(n,{popupRedirectResolver:Ra,persistence:[$i,Ai,Bn]}),s=an("authTokenSyncURL");if(s&&typeof isSecureContext=="boolean"&&isSecureContext){const a=new URL(s,location.origin);if(location.origin===a.origin){const o=Ma(a.toString());Ti(t,o,()=>o(t.currentUser)),Si(t,c=>o(c))}}const r=ps("auth");return r&&yi(t,`http://${r}`),t}function Ba(){var n;return((n=document.getElementsByTagName("head"))==null?void 0:n[0])??document}hi({loadJS(n){return new Promise((e,t)=>{const s=document.createElement("script");s.setAttribute("src",n),s.onload=e,s.onerror=r=>{const a=x("internal-error");a.customData=r,t(a)},s.type="text/javascript",s.charset="UTF-8",Ba().appendChild(s)})},gapiScript:"https://apis.google.com/js/api.js",recaptchaV2Script:"https://www.google.com/recaptcha/api.js",recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="});ja("Browser");var Fa="firebase",Ha="12.12.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Q(Fa,Ha,"app");const $a={apiKey:"AIzaSyDtd8HzaXVaoqQVq8NduG8POvCSg5BI7sE",authDomain:"whisprly-77f97.firebaseapp.com",projectId:"whisprly-77f97",storageBucket:"whisprly-77f97.firebasestorage.app",messagingSenderId:"992047396894",appId:"1:992047396894:web:44f343b2e93d2915dc160f"},Va=hn($a),pt=Ua(Va);async function Wa(){const n=await R("start_google_oauth");if(!n.idToken&&!n.accessToken)throw new Error("No tokens returned from OAuth flow");const e=O.credential(null,n.accessToken);await Ei(pt,e)}async function za(){await ki(pt)}function Ga(n){return xi(pt,n)}function qa(){return i.jsxs("svg",{width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",children:[i.jsx("path",{d:"M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57C21.36 18.34 22.56 15.52 22.56 12.25z",fill:"#4285F4"}),i.jsx("path",{d:"M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",fill:"#34A853"}),i.jsx("path",{d:"M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z",fill:"#FBBC05"}),i.jsx("path",{d:"M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",fill:"#EA4335"})]})}function Ka({onSignIn:n}){const[e,t]=p.useState(!1),[s,r]=p.useState(null);async function a(){t(!0),r(null);try{await Wa()}catch(o){console.error("Sign-in error:",o),r(typeof o=="string"?o:(o==null?void 0:o.message)??"Sign-in failed. Check your internet connection."),t(!1)}}return i.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"var(--bg-base)",padding:"40px 32px",position:"relative",overflow:"hidden"},children:[i.jsx("div",{style:{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:480,height:480,borderRadius:"50%",background:"radial-gradient(circle, rgba(232,128,58,0.07) 0%, transparent 70%)",filter:"blur(60px)",pointerEvents:"none"}}),i.jsxs("div",{style:{position:"relative",width:"100%",maxWidth:360,background:"var(--bg-card)",border:"1px solid var(--border-bright)",borderRadius:"var(--radius-lg)",padding:"40px 36px",display:"flex",flexDirection:"column",alignItems:"center",gap:24,boxShadow:"0 8px 48px rgba(0,0,0,0.24)"},children:[i.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:14},children:[i.jsx("img",{src:Zt,alt:"Whisprly",style:{width:56,height:56,objectFit:"contain"}}),i.jsxs("div",{style:{textAlign:"center"},children:[i.jsx("h1",{style:{fontFamily:"var(--font-display)",fontWeight:700,fontSize:24,color:"var(--text-0)",letterSpacing:"-0.03em",lineHeight:1.2},children:"Welcome to Whisprly"}),i.jsx("p",{style:{fontSize:14,color:"var(--text-2)",marginTop:6,lineHeight:1.5},children:"Sign in to sync your transcripts across sessions"})]})]}),i.jsx("div",{style:{width:"100%",height:1,background:"var(--border)"}}),i.jsxs("button",{onClick:a,style:{width:"100%",padding:"13px 20px",borderRadius:"var(--radius-sm)",border:"1px solid var(--border-bright)",cursor:"pointer",background:"var(--bg-surface)",color:"var(--text-0)",fontFamily:"var(--font-display)",fontWeight:600,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"background var(--transition), border-color var(--transition)"},onMouseEnter:o=>{o.currentTarget.style.background="var(--bg-card-hover)",o.currentTarget.style.borderColor="var(--cyan)"},onMouseLeave:o=>{o.currentTarget.style.background="var(--bg-surface)",o.currentTarget.style.borderColor="var(--border-bright)"},children:[i.jsx(qa,{}),e?"Opening browser…":"Continue with Google"]}),s&&i.jsx("p",{style:{fontSize:12,color:"var(--red)",textAlign:"center",lineHeight:1.5},children:s}),i.jsx("p",{style:{fontSize:11,color:"var(--text-3)",textAlign:"center",lineHeight:1.6},children:"By signing in you agree to our Terms of Service and Privacy Policy."})]})]})}const Ja=[{code:"auto",label:"Auto-detect"},{code:"en",label:"English"},{code:"es",label:"Spanish"},{code:"fr",label:"French"},{code:"de",label:"German"},{code:"it",label:"Italian"},{code:"pt",label:"Portuguese"},{code:"ru",label:"Russian"},{code:"ja",label:"Japanese"},{code:"zh",label:"Chinese"},{code:"hi",label:"Hindi"},{code:"ar",label:"Arabic"}],Ya=36,Xt=[3,6,10,16,22,28,24,18,13,7,4,9,16,23,28,26,20,14,8,5,10,18,25,28,22,16,10,6,4,8,14,22,27,24,18,11],N={width:15,height:15,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeLinejoin:"round"};function Xa(){return i.jsx("svg",{...N,children:i.jsx("path",{d:"M1.5 7L8 2l6.5 5V14.5H10.5V10H5.5v4.5H1.5V7z"})})}function Qa(){return i.jsxs("svg",{...N,children:[i.jsx("path",{d:"M3 3A1.5 1.5 0 0 1 4.5 1.5H13.5v12H4.5A1.5 1.5 0 0 1 3 12V3z"}),i.jsx("path",{d:"M3 12A1.5 1.5 0 0 0 4.5 13.5H13.5"}),i.jsx("line",{x1:"6.5",y1:"5",x2:"10.5",y2:"5"}),i.jsx("line",{x1:"6.5",y1:"7.5",x2:"10.5",y2:"7.5"})]})}function Za(){return i.jsxs("svg",{...N,children:[i.jsx("polyline",{points:"5.5,4.5 2,8 5.5,11.5"}),i.jsx("polyline",{points:"10.5,4.5 14,8 10.5,11.5"}),i.jsx("line",{x1:"9.5",y1:"2",x2:"6.5",y2:"14"})]})}function eo(){return i.jsx("svg",{...N,children:i.jsx("path",{d:"M8 1.5l1.7 3.5 3.8.55-2.75 2.65.65 3.8L8 10.3l-3.4 1.7.65-3.8L2.5 5.55l3.8-.55L8 1.5z"})})}function to(){return i.jsxs("svg",{...N,children:[i.jsx("rect",{x:"2.5",y:"1.5",width:"11",height:"13",rx:"1.5"}),i.jsx("line",{x1:"5.5",y1:"5.5",x2:"10.5",y2:"5.5"}),i.jsx("line",{x1:"5.5",y1:"8.5",x2:"10.5",y2:"8.5"}),i.jsx("line",{x1:"5.5",y1:"11.5",x2:"8.5",y2:"11.5"})]})}function no(){return i.jsxs("svg",{...N,children:[i.jsx("circle",{cx:"8",cy:"8",r:"2.5"}),i.jsx("path",{d:"M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.45 3.45l.85.85M11.7 11.7l.85.85M3.45 12.55l.85-.85M11.7 4.3l.85-.85"})]})}function so(){return i.jsxs("svg",{...N,children:[i.jsx("circle",{cx:"8",cy:"8",r:"6.5"}),i.jsx("path",{d:"M6.2 6.2a1.9 1.9 0 1 1 1.9 1.9V9"}),i.jsx("circle",{cx:"8",cy:"11.5",r:"0.65",fill:"currentColor",stroke:"none"})]})}function ro(){return i.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",children:[i.jsx("rect",{x:"6",y:"6",width:"8.5",height:"8.5",rx:"1.5"}),i.jsx("path",{d:"M3.5 10H2.5A1.5 1.5 0 0 1 1 8.5v-7A1.5 1.5 0 0 1 2.5 0h7A1.5 1.5 0 0 1 11 1.5v1"})]})}function io(){return i.jsx("svg",{width:"12",height:"12",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round",children:i.jsx("polyline",{points:"2.5,8 6.5,12 13.5,4"})})}function ao(){return i.jsxs("svg",{width:"12",height:"12",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",children:[i.jsx("polyline",{points:"2,4 14,4"}),i.jsx("path",{d:"M5.5 4V2.5h5V4"}),i.jsx("path",{d:"M3.5 4l1 9.5h7l1-9.5"}),i.jsx("line",{x1:"6.5",y1:"7",x2:"6.5",y2:"11"}),i.jsx("line",{x1:"9.5",y1:"7",x2:"9.5",y2:"11"})]})}function oo(){return i.jsxs("svg",{width:"15",height:"15",viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:"1.6",strokeLinecap:"round",strokeLinejoin:"round",children:[i.jsx("path",{d:"M6 2H2.5A1.5 1.5 0 0 0 1 3.5v9A1.5 1.5 0 0 0 2.5 14H6"}),i.jsx("polyline",{points:"10.5,11 14,8 10.5,5"}),i.jsx("line",{x1:"14",y1:"8",x2:"6",y2:"8"})]})}function co(){return i.jsxs("svg",{...N,children:[i.jsx("path",{d:"M13.5 13.5H2.5l1.5-1.5V7.5A4 4 0 0 1 12 7.5V12l1.5 1.5z"}),i.jsx("path",{d:"M6.2 13.5a1.9 1.9 0 0 0 3.6 0"})]})}function lo(){return i.jsxs("svg",{...N,children:[i.jsx("circle",{cx:"8",cy:"8",r:"3.2"}),i.jsx("line",{x1:"8",y1:"1",x2:"8",y2:"2.5"}),i.jsx("line",{x1:"8",y1:"13.5",x2:"8",y2:"15"}),i.jsx("line",{x1:"1",y1:"8",x2:"2.5",y2:"8"}),i.jsx("line",{x1:"13.5",y1:"8",x2:"15",y2:"8"}),i.jsx("line",{x1:"3.05",y1:"3.05",x2:"4.1",y2:"4.1"}),i.jsx("line",{x1:"11.9",y1:"11.9",x2:"12.95",y2:"12.95"}),i.jsx("line",{x1:"3.05",y1:"12.95",x2:"4.1",y2:"11.9"}),i.jsx("line",{x1:"11.9",y1:"4.1",x2:"12.95",y2:"3.05"})]})}function ho(){return i.jsx("svg",{...N,children:i.jsx("path",{d:"M13.5 10A6 6 0 0 1 6 2.5a6.5 6.5 0 1 0 7.5 7.5z"})})}function uo(){const n=new Date().getHours();return n<12?"Good morning ☀️":n<17?"Good afternoon 👋":"Good evening 🌙"}const fo=p.memo(function({status:e}){return i.jsx("div",{className:`mini-wave mini-wave--${e}`,children:Array.from({length:Ya}).map((t,s)=>i.jsx("span",{className:"mini-bar",style:{"--base-h":`${Xt[s%Xt.length]}px`,animationDelay:`${(s*.035).toFixed(3)}s`}},s))})});function po(n){return new Date(n).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function Qt(n){return n>=1e3?`${(n/1e3).toFixed(1)}k`:String(n)}function go(n){const e={};for(const t of n){const s=new Date(t.timestamp),r=new Date,a=new Date(r);a.setDate(r.getDate()-1);let o;s.toDateString()===r.toDateString()?o="TODAY":s.toDateString()===a.toDateString()?o="YESTERDAY":o=s.toLocaleDateString([],{month:"long",day:"numeric"}).toUpperCase(),(e[o]??(e[o]=[])).push(t)}return e}function mo(n){return n.reduce((e,t)=>e+t.text.split(/\s+/).filter(Boolean).length,0)}function yo(n){return new Set(n.map(e=>new Date(e.timestamp).toDateString())).size}const _o=[{id:"home",Icon:Xa,label:"Home"},{id:"dictionary",Icon:Qa,label:"Dictionary"},{id:"snippets",Icon:Za,label:"Snippets"},{id:"style",Icon:eo,label:"Style"},{id:"notes",Icon:to,label:"Notes"}];function Io(){var vt,bt,It,wt,Et;const[n,e]=p.useState("idle"),[t,s]=p.useState(""),[r,a]=p.useState([]),[o,c]=p.useState({groqApiKey:"",pythonCmd:"python",language:"auto"}),[l,d]=p.useState(!1),[f,g]=p.useState("prose"),[y,v]=p.useState("home"),[C,ae]=p.useState(null),[q,oe]=p.useState(!1),[b,Gn]=p.useState(null),[qn,Kn]=p.useState(!1),[Jn,gt]=p.useState(""),[Me,be]=p.useState(null),[A,mt]=p.useState(null),[Yn,yt]=p.useState(!1),[Xn,Qn]=p.useState("");p.useEffect(()=>{const u=He("status",w=>{e(w.payload.status),s(w.payload.message??"")}),_=He("setup_progress",w=>{const S=w.payload;S.stage==="done"?(Qn(S.message),mt(null),yt(!0),ce.current&&clearTimeout(ce.current),ce.current=setTimeout(()=>yt(!1),4e3)):mt(S)}),I=Ga(w=>{(async()=>{try{if(Gn(w),w){const S=await R("get_settings").catch(()=>null);S&&c(S);const le=await R("get_transcript_log").catch(()=>[]);a(le)}else a([]),c({groqApiKey:"",pythonCmd:"python",language:"auto"})}catch(S){console.error("Auth change handler failed:",S)}finally{Kn(!0)}})()});return()=>{u.then(w=>w()),_.then(w=>w()),I(),ce.current&&clearTimeout(ce.current)}},[]),p.useEffect(()=>{if(!b)return;const u=He("transcript",_=>{const I=_.payload;a(w=>[I,...w].slice(0,200))});return()=>{u.then(_=>_())}},[b]),p.useEffect(()=>{R("get_output_mode").then(u=>g(u)).catch(console.error)},[]);const Zn=p.useCallback(async()=>{await R("save_settings",{groqApiKey:o.groqApiKey,pythonCmd:o.pythonCmd,language:o.language}),d(!0),setTimeout(()=>d(!1),2e3)},[o]),es=p.useCallback((u,_)=>{navigator.clipboard.writeText(u).then(()=>{ae(_),setTimeout(()=>ae(null),1500)}).catch(()=>{})},[]),ts=p.useCallback(u=>{u&&(a(_=>_.filter(I=>I.id!==u)),R("delete_transcript",{id:u}).catch(console.error))},[]),ns=p.useCallback(async()=>{a([]),be(null),gt(""),await R("clear_all_db_transcripts").catch(console.error)},[]),Ue=p.useRef(0),Be=p.useRef(null),ce=p.useRef(null),ss=p.useCallback(u=>{if(gt(u),Be.current&&clearTimeout(Be.current),u.trim()===""){be(null);return}Be.current=setTimeout(async()=>{const _=++Ue.current;try{const I=await R("search_transcripts",{query:u});_===Ue.current&&be(I)}catch{_===Ue.current&&be([])}},200)},[]),_t=mo(r),Ie=yo(r),Fe=Me??r,rs=go(Fe);return qn?b?i.jsxs("div",{className:`app${q?" light-mode":""}${A?" has-setup-bar":""}`,children:[i.jsxs("aside",{className:"sidebar",children:[i.jsxs("div",{className:"sidebar-top",children:[i.jsx("div",{className:"brand",children:i.jsx("span",{className:"brand-name",children:"Whisprly"})}),i.jsx("nav",{className:"nav",children:_o.map(({id:u,Icon:_,label:I})=>i.jsxs("button",{"aria-label":I,className:`nav-item${y===u?" nav-item--active":""}`,onClick:()=>v(u),"aria-current":y===u?"page":void 0,children:[i.jsx(_,{}),i.jsx("span",{className:"nav-label",children:I})]},u))})]}),i.jsxs("div",{className:"sidebar-bottom",children:[i.jsxs("button",{className:"sidebar-util","aria-label":"Settings",onClick:()=>v("settings"),children:[i.jsx(no,{}),i.jsx("span",{className:"nav-label",children:"Settings"})]}),i.jsxs("button",{className:"sidebar-util","aria-label":"Help",onClick:()=>v("help"),children:[i.jsx(so,{}),i.jsx("span",{className:"nav-label",children:"Help"})]}),i.jsxs("button",{className:"sidebar-user",onClick:()=>v("profile"),children:[i.jsx("div",{className:"user-avatar",children:b.photoURL?i.jsx("img",{src:b.photoURL,className:"avatar-photo",alt:""}):((bt=(vt=b.displayName)==null?void 0:vt[0])==null?void 0:bt.toUpperCase())??"S"}),i.jsxs("div",{className:"user-info",children:[i.jsx("p",{className:"user-name",children:b.displayName??"User"}),i.jsx("p",{className:"user-plan",children:b.email??""})]})]})]})]}),i.jsx("main",{className:"content",children:i.jsx("div",{className:"content-page",children:y==="settings"?i.jsxs("div",{className:"settings-page",children:[i.jsxs("div",{className:"page-header",children:[i.jsx("h1",{className:"page-title",children:"Settings"}),i.jsx("button",{className:"close-btn",onClick:()=>v("home"),"aria-label":"Close settings",children:"✕"})]}),i.jsxs("div",{className:"settings-form",children:[i.jsxs("div",{className:"settings-section",children:[i.jsx("p",{className:"settings-section-title",children:"Cloud Transcription"}),i.jsxs("div",{className:"field-group",children:[i.jsx("label",{className:"field-label",children:"Groq API Key"}),i.jsx("input",{type:"password",className:"field-input",value:o.groqApiKey,onChange:u=>c(_=>({..._,groqApiKey:u.target.value})),placeholder:"gsk_..."}),i.jsx("span",{className:"field-hint",children:"Fast cloud transcription via Groq Whisper"})]}),i.jsxs("div",{className:"field-group",children:[i.jsx("label",{className:"field-label",htmlFor:"lang-select",children:"Transcription Language"}),i.jsx("select",{id:"lang-select",className:"field-select",value:o.language??"auto",onChange:u=>c(_=>({..._,language:u.target.value})),children:Ja.map(u=>i.jsx("option",{value:u.code,children:u.label},u.code))}),i.jsx("span",{className:"field-hint",children:"Override Whisper language detection"})]})]}),i.jsxs("div",{className:"settings-section",children:[i.jsx("p",{className:"settings-section-title",children:"Output Mode"}),i.jsxs("div",{className:"field-group",children:[i.jsx("label",{className:"field-label",children:"Polish style"}),i.jsx("div",{className:"mode-selector",children:["prose","email","code"].map(u=>i.jsx("button",{className:`mode-btn${f===u?" mode-btn--active":""}`,onClick:()=>{g(u),R("set_output_mode",{mode:u}).catch(console.error)},children:u.charAt(0).toUpperCase()+u.slice(1)},u))}),i.jsx("span",{className:"field-hint",children:"Applied to every transcript after Whisper"})]})]}),i.jsxs("div",{className:"settings-section",children:[i.jsx("p",{className:"settings-section-title",children:"Local Fallback"}),i.jsxs("div",{className:"field-group",children:[i.jsx("label",{className:"field-label",children:"Python command"}),i.jsx("input",{type:"text",className:"field-input",value:o.pythonCmd,onChange:u=>c(_=>({..._,pythonCmd:u.target.value})),placeholder:"python"}),i.jsx("span",{className:"field-hint",children:"Used when Groq key is absent or fails"})]})]}),i.jsx("button",{className:"save-btn",onClick:Zn,children:l?"Saved ✓":"Save settings"})]})]}):y==="profile"?i.jsxs("div",{className:"profile-page",children:[i.jsxs("div",{className:"page-header",children:[i.jsx("h1",{className:"page-title",children:"Profile"}),i.jsx("button",{className:"close-btn",onClick:()=>v("home"),"aria-label":"Close profile",children:"✕"})]}),i.jsxs("div",{className:"profile-body",children:[i.jsx("div",{className:"profile-avatar-lg",children:b.photoURL?i.jsx("img",{src:b.photoURL,className:"profile-photo",alt:""}):i.jsx("img",{src:Zt,className:"profile-logo-img",alt:""})}),i.jsx("h2",{className:"profile-name",children:b.displayName??"User"}),i.jsx("p",{className:"profile-email",children:b.email??""}),i.jsxs("div",{className:"profile-stats-row",children:[i.jsxs("div",{className:"profile-stat",children:[i.jsx("span",{className:"profile-stat-value",children:Ie}),i.jsxs("span",{className:"profile-stat-label",children:[Ie===1?"day":"days"," active"]})]}),i.jsxs("div",{className:"profile-stat",children:[i.jsx("span",{className:"profile-stat-value",children:Qt(_t)}),i.jsx("span",{className:"profile-stat-label",children:"words dictated"})]}),i.jsxs("div",{className:"profile-stat",children:[i.jsx("span",{className:"profile-stat-value",children:r.length}),i.jsx("span",{className:"profile-stat-label",children:"recordings"})]})]}),i.jsx("div",{className:"profile-actions",children:i.jsxs("button",{className:"logout-btn",onClick:()=>za().catch(console.error),children:[i.jsx(oo,{}),"Sign out"]})})]})]}):y==="help"?i.jsxs("div",{className:"help-page",children:[i.jsxs("div",{className:"page-header",children:[i.jsx("h1",{className:"page-title",children:"Help"}),i.jsx("button",{className:"close-btn",onClick:()=>v("home"),"aria-label":"Close help",children:"✕"})]}),i.jsxs("div",{className:"help-body",children:[i.jsxs("div",{className:"help-section",children:[i.jsx("div",{className:"help-step-num",children:"1"}),i.jsxs("div",{className:"help-step-content",children:[i.jsx("h3",{className:"help-step-title",children:"Start dictating"}),i.jsxs("p",{className:"help-step-desc",children:["Hold ",i.jsx("kbd",{children:"Ctrl"})," + ",i.jsx("kbd",{children:"Win"})," and speak. Release both keys when you're done."]})]})]}),i.jsxs("div",{className:"help-section",children:[i.jsx("div",{className:"help-step-num",children:"2"}),i.jsxs("div",{className:"help-step-content",children:[i.jsx("h3",{className:"help-step-title",children:"Text is typed automatically"}),i.jsx("p",{className:"help-step-desc",children:"After you release, Whisprly transcribes your speech and types it into whatever app or text field was focused before you pressed the hotkey."})]})]}),i.jsxs("div",{className:"help-section",children:[i.jsx("div",{className:"help-step-num",children:"3"}),i.jsxs("div",{className:"help-step-content",children:[i.jsx("h3",{className:"help-step-title",children:"Your history is saved here"}),i.jsx("p",{className:"help-step-desc",children:"Every transcription appears in the Home feed. Click any entry to copy it. Hover to reveal the delete button."})]})]}),i.jsxs("div",{className:"help-section",children:[i.jsx("div",{className:"help-step-num",children:"4"}),i.jsxs("div",{className:"help-step-content",children:[i.jsx("h3",{className:"help-step-title",children:"Works best with a Groq key"}),i.jsxs("p",{className:"help-step-desc",children:["Groq gives you fast, accurate cloud transcription. Go to ",i.jsx("strong",{children:"Settings"})," and paste your free API key from console.groq.com."]})]})]}),i.jsxs("div",{className:"help-section",children:[i.jsx("div",{className:"help-step-num",children:"5"}),i.jsxs("div",{className:"help-step-content",children:[i.jsx("h3",{className:"help-step-title",children:"Tips"}),i.jsxs("p",{className:"help-step-desc",children:["— Click any transcript to copy it to clipboard",i.jsx("br",{}),"— Works in any app: Word, Chrome, VS Code, Slack",i.jsx("br",{}),"— The floating pill shows recording / transcribing status",i.jsx("br",{}),"— Click the pill to cancel a recording"]})]})]})]})]}):i.jsxs(i.Fragment,{children:[i.jsxs("div",{className:"content-header",children:[i.jsxs("div",{className:"header-row",children:[i.jsxs("div",{children:[i.jsx("p",{className:"header-greeting",children:uo()}),i.jsx("h1",{className:"welcome",children:`Welcome back, ${((It=b.displayName)==null?void 0:It.split(" ")[0])??"there"}`})]}),i.jsxs("div",{className:"header-actions",children:[i.jsx("button",{className:"header-action-btn","aria-label":"Notifications",children:i.jsx(co,{})}),i.jsx("button",{className:"header-action-btn","aria-label":q?"Switch to dark mode":"Switch to light mode",onClick:()=>oe(u=>!u),children:q?i.jsx(ho,{}):i.jsx(lo,{})}),i.jsx("div",{className:"header-avatar-btn",title:"View profile",style:{cursor:"pointer",overflow:"hidden"},onClick:()=>v("profile"),children:b.photoURL?i.jsx("img",{src:b.photoURL,style:{width:"100%",height:"100%",objectFit:"cover"},alt:""}):((Et=(wt=b.displayName)==null?void 0:wt[0])==null?void 0:Et.toUpperCase())??"S"})]})]}),i.jsxs("p",{className:"subtitle",children:["Hold ",i.jsx("kbd",{children:"Ctrl"})," + ",i.jsx("kbd",{children:"Win"})," to dictate"]})]}),i.jsxs("div",{className:"stats-row",children:[i.jsxs("div",{className:"stat-card",children:[i.jsx("span",{className:"stat-value stat-value--cyan",children:Ie}),i.jsxs("span",{className:"stat-label",children:[Ie===1?"day":"days"," active"]})]}),i.jsxs("div",{className:"stat-card",children:[i.jsx("span",{className:"stat-value stat-value--green",children:Qt(_t)}),i.jsx("span",{className:"stat-label",children:"words dictated"})]}),i.jsxs("div",{className:"stat-card",children:[i.jsx("span",{className:`status-ring status-ring--${n}`}),i.jsx("span",{className:"stat-label stat-status",children:t||(n==="idle"?"Ready":n==="recording"?"Recording…":"Transcribing…")})]})]}),n!=="idle"&&i.jsxs("div",{className:`wave-pill wave-pill--${n}`,children:[i.jsx(fo,{status:n}),i.jsx("span",{className:"wave-pill-label",children:n==="recording"?"Listening…":"Transcribing…"})]}),i.jsxs("div",{className:"feed",children:[i.jsx("input",{className:"search-input",type:"search",placeholder:"Search transcripts…",value:Jn,onChange:u=>ss(u.target.value)}),Fe.length>0&&Me===null&&i.jsx("div",{className:"feed-header",children:i.jsx("button",{className:"clear-all-btn",onClick:ns,children:"Clear all"})}),Fe.length===0?Me!==null?i.jsxs("div",{className:"empty",children:[i.jsx("p",{className:"empty-title",children:"No results"}),i.jsx("p",{className:"empty-sub",children:"Try a different search term"})]}):i.jsxs("div",{className:"empty",children:[i.jsx("div",{className:"empty-icon",children:i.jsxs("svg",{width:"30",height:"30",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.3",strokeLinecap:"round",strokeLinejoin:"round",children:[i.jsx("rect",{x:"9",y:"2",width:"6",height:"12",rx:"3"}),i.jsx("path",{d:"M5 10a7 7 0 0 0 14 0"}),i.jsx("line",{x1:"12",y1:"19",x2:"12",y2:"22"}),i.jsx("line",{x1:"8",y1:"22",x2:"16",y2:"22"})]})}),i.jsx("p",{className:"empty-title",children:"No recordings yet"}),i.jsx("p",{className:"empty-sub",children:"Press your hotkey and start speaking"}),i.jsxs("div",{className:"empty-kbd-row",children:[i.jsx("kbd",{children:"Ctrl"}),i.jsx("span",{className:"empty-kbd-sep",children:"+"}),i.jsx("kbd",{children:"Win"})]})]}):Object.entries(rs).map(([u,_])=>i.jsxs("div",{className:"date-group",children:[i.jsx("div",{className:"date-label",children:u}),_.map((I,w)=>{const S=`${I.timestamp}-${w}`,le=C===S;return i.jsxs("div",{className:`entry${le?" entry--copied":""}`,style:{"--entry-index":Math.min(w,5)},onClick:()=>es(I.text,S),title:"Click to copy",children:[i.jsxs("div",{className:"entry-header",children:[i.jsx("div",{className:"entry-time",children:po(I.timestamp)}),i.jsxs("div",{className:"entry-actions",children:[i.jsx("span",{className:`entry-copy${le?" entry-copy--done":""}`,"aria-hidden":"true",children:le?i.jsx(io,{}):i.jsx(ro,{})}),i.jsx("span",{className:"entry-delete","aria-label":"Delete",onClick:is=>{is.stopPropagation(),ts(I.id)},children:i.jsx(ao,{})})]})]}),i.jsx("p",{className:"entry-text",children:I.text}),I.mode&&i.jsx("div",{className:"entry-footer",children:i.jsx("span",{className:"mode-badge",children:I.mode})})]},S)})]},u))]})]})},y)}),A&&i.jsxs("div",{className:`setup-bar${A.stage==="error"?" setup-bar--error":""}`,children:[i.jsx("span",{className:"setup-bar__icon",children:A.stage==="error"?"✕":"⬇"}),i.jsx("span",{className:"setup-bar__message",children:A.message}),A.stage!=="error"&&i.jsx("div",{className:"setup-bar__track",children:i.jsx("div",{className:"setup-bar__fill",style:{width:`${A.percent}%`}})}),A.stage!=="error"&&i.jsxs("span",{className:"setup-bar__percent",children:[A.percent,"%"]})]}),Yn&&i.jsxs("div",{className:"setup-toast",children:["✓ ",Xn]})]}):i.jsx("div",{className:`app${q?" light-mode":""}`,children:i.jsx(Ka,{onSignIn:()=>{}})}):i.jsx("div",{className:`app${q?" light-mode":""}`,style:{alignItems:"center",justifyContent:"center"},children:i.jsx("div",{style:{width:24,height:24,borderRadius:"50%",border:"2px solid var(--border-bright)",borderTopColor:"var(--cyan)",animation:"spin 0.7s linear infinite"}})})}export{Io as default};
