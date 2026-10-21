'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const bridge=fs.readFileSync(path.join(__dirname,'../assets/wallet2-bridge.js'),'utf8');
function run(enabled){const el={innerHTML:''};let calls=0;let renderCalls=0;const w={__Q079_WALLET2_ENABLED_BY_RELEASE:enabled,ProductionWallet2:{create(){calls++;return {state:{hasData:false,loading:false},render(){renderCalls++},refresh(){return Promise.resolve();}}}}};
const sandbox={window:w,document:{getElementById:()=>el},backendPost:()=>{},SESSION:{userId:'ADMIN1'},backendSession:()=> 'tok',backendDeviceId:()=> 'DEV-X',isAdmin1:()=>true,hasPermission:()=>true,crypto:{randomUUID:()=> 'test-id'},navigator:{onLine:true}};vm.runInNewContext(bridge,sandbox);if(w.__Q079_WALLET2_RENDER)w.__Q079_WALLET2_RENDER();return {w,calls,renderCalls,el};}
test('Bridge disabled by default has no side effects on original PWA',()=>{const a=run(undefined);assert.equal(a.calls,0);assert.equal(a.w.__Q079_WALLET2_RENDER,undefined)});
test('Bridge enabled attaches to same wallet DOM container',()=>{const a=run(true);assert.equal(a.calls,1);assert.equal(a.renderCalls,1)});
test('Bridge enabled with missing module fails closed instead of falling back',()=>{const el={innerHTML:''},w={__Q079_WALLET2_ENABLED_BY_RELEASE:true};vm.runInNewContext(bridge,{window:w,document:{getElementById:()=>el}});w.__Q079_WALLET2_RENDER();assert.match(el.innerHTML,/Старые финансовые данные заблокированы/)});
test('Bridge never mutates another screen',()=>{const a=run(true);assert.ok(!a.w.renderOrders&&!a.w.renderNom&&!a.w.renderGallery)});
