'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const net = require('node:net')
const path = require('node:path')
const { WebSocket } = require('ws')

test('MCP identity survives direct calls, late initialization and shared relays', { timeout: 30000 }, async (t) => {
  const listener = net.createServer()
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve))
  const port = listener.address().port
  await new Promise(resolve => listener.close(resolve))
  const token = 'client-identity-test-only'
  const children = []
  const sockets = []
  t.after(() => {
    for (const ws of sockets) ws.terminate()
    for (const child of children) child.kill()
  })

  function startBridge() {
    const child = spawn(process.execPath, [path.join(__dirname, 'uivision-mcp-bridge.js'), '--port', String(port), '--token', token], { windowsHide: true })
    children.push(child)
    child.stderr.resume()
    let buffer = ''
    let id = 0
    const pending = new Map()
    child.stdout.on('data', chunk => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        const msg = JSON.parse(line)
        const resolve = pending.get(msg.id)
        if (resolve) { pending.delete(msg.id); resolve(msg.result) }
      }
    })
    const rpc = (method, params) => new Promise(resolve => {
      const requestId = ++id
      pending.set(requestId, resolve)
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params })}\n`)
    })
    return {
      initialize: name => rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name, version: 'test' } }),
      call: name => rpc('tools/call', { name, arguments: {} })
    }
  }

  const owner = startBridge()
  await owner.initialize('Claude')
  async function connect(hello) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`)
    sockets.push(ws)
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject) })
    const ready = new Promise(resolve => ws.once('message', data => resolve(JSON.parse(data))))
    ws.send(JSON.stringify({ type: 'hello', token, ...hello }))
    assert.equal((await ready).type, 'hello_ok')
    return ws
  }
  const extension = await connect({ client: 'chrome', version: 'test' })
  extension.on('message', data => {
    const msg = JSON.parse(data)
    if (msg.type === 'tool_call') extension.send(JSON.stringify({ type: 'tool_result', id: msg.id, text: msg.clientName }))
  })
  const text = result => result.content.filter(c => c.type === 'text').map(c => c.text).join('\n')
  assert.equal(text(await owner.call('get_authoring_guide')), 'Claude')

  const relay = startBridge()
  // Force the relay handshake to happen before MCP initialize.
  for (let i = 0; ; i++) {
    const status = await relay.call('bridge_status')
    if (!status.isError) break
    assert.ok(i < 100, 'relay should connect')
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  await relay.initialize('Codex')
  assert.equal(text(await relay.call('get_authoring_guide')), 'Codex')
  assert.equal(text(await owner.call('get_authoring_guide')), 'Claude', 'relay must not rename owner')

  // An older relay with no identity must not inherit the owner name.
  const legacy = await connect({ relay: true, client: 'uivision-mcp-relay' })
  const answer = new Promise(resolve => legacy.once('message', data => resolve(JSON.parse(data))))
  legacy.send(JSON.stringify({ type: 'relay_call', id: 'legacy', name: 'get_authoring_guide', arguments: {} }))
  assert.equal(text(await answer), 'MCP client')

  // Other clients keep their declared names; malformed names keep the fallback.
  await owner.initialize('Example MCP Client')
  assert.equal(text(await owner.call('get_authoring_guide')), 'Example MCP Client')
  await owner.initialize({ invalid: true })
  assert.equal(text(await owner.call('get_authoring_guide')), 'Example MCP Client')
})
