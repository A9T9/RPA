// End-to-end ownership regression: real bridge, two synthetic extension
// sockets, and stdio MCP. No browser UI or user settings are touched.
const assert = require('node:assert/strict')
const {spawn} = require('node:child_process')
const {randomUUID} = require('node:crypto')
const net = require('node:net')
const path = require('node:path')
const WS = require('ws')
const sleep = ms => new Promise(r => setTimeout(r, ms))
const until = async fn => {
  const end = Date.now() + 15000
  while (Date.now() < end) { const v=fn(); if (v) return v; await sleep(10) }
  throw Error('routing test timed out')
}

;(async () => {
  const reservation = net.createServer()
  await new Promise(r => reservation.listen(0, '127.0.0.1', r))
  const port = reservation.address().port
  await new Promise(r => reservation.close(r))
  const token = randomUUID()
  const child = spawn(process.execPath, [path.join(__dirname,'uivision-mcp-bridge.js'),'--port',String(port)], {
    windowsHide:true, env:{...process.env,UIVISION_MCP_TOKEN:token}, stdio:['pipe','pipe','pipe']
  })
  const sockets=[], replies=new Map()
  let output='', diagnostics='', seq=0
  child.stderr.on('data',d=>{diagnostics+=d})
  child.stdout.on('data',d=>{
    output+=d
    let end
    while ((end=output.indexOf('\n'))>=0) {
      const line=output.slice(0,end);output=output.slice(end+1)
      const msg=JSON.parse(line);replies.set(msg.id,msg)
    }
  })
  const send = (method,params,id=++seq) => {child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');return id}
  const response = async id => {const m=await until(()=>replies.get(id));assert.ok(!m.error,JSON.stringify(m.error));return m.result}
  const call = (name,args={}) => send('tools/call',{name,arguments:args})
  const connect = async () => {
    const ws=new WS(`ws://127.0.0.1:${port}`,{headers:{'User-Agent':'Chrome routing regression'}}), messages=[]
    sockets.push(ws);ws.on('message',data=>messages.push(JSON.parse(data)))
    await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)})
    ws.send(JSON.stringify({type:'hello',token,version:'test'}))
    const hello=await until(()=>messages.find(m=>m.type==='hello_ok'))
    return {ws,messages,label:hello.label}
  }
  try {
    await until(()=>diagnostics.includes('WebSocket server listening'))
    await response(send('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'Routing test',version:'1'}}))
    const a=await connect(), b=await connect()
    await response(call('select_browser',{target:a.label}))
    const cancelled=call('run_macro',{script:'test'})
    const first=await until(()=>a.messages.find(m=>m.type==='tool_call'))
    // JSON-RPC notifications omit the request id field.
    child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/cancelled',params:{requestId:cancelled}})+'\n')
    await until(()=>a.messages.find(m=>m.type==='cancel'&&m.id===first.id))
    assert.equal(b.messages.filter(m=>m.type==='cancel').length,0)

    const owned=call('run_macro',{script:'test'})
    const second=await until(()=>a.messages.filter(m=>m.type==='tool_call')[1])
    b.ws.send(JSON.stringify({type:'tool_result',id:second.id,text:'spoof'}))
    await sleep(80);assert.equal(replies.has(owned),false)
    b.ws.close();await sleep(80);assert.equal(replies.has(owned),false)
    a.ws.send(JSON.stringify({type:'tool_result',id:second.id,text:'owner result'}))
    assert.match(JSON.stringify(await response(owned)),/owner result/)

    const c=await connect()
    const disconnected=call('run_macro',{script:'test'})
    await until(()=>a.messages.filter(m=>m.type==='tool_call')[2])
    a.ws.close()
    assert.match(JSON.stringify(await response(disconnected)),/disconnected/)
    assert.equal(c.messages.filter(m=>m.type==='cancel').length,0)
    console.log('MCP routing: pinned-owner cancellation, spoofed result rejection, unrelated disconnect and owner disconnect passed')
  } finally {
    sockets.forEach(s=>s.terminate());child.kill()
  }
})().catch(e=>{console.error(e);process.exitCode=1})
