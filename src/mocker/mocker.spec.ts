#!/usr/bin/env ts-node

import test  from 'tstest'
import sinon from 'sinon'

import { PuppetMock } from '../'

import { Mocker } from './mocker'
import { SimpleBehavior } from './behavior'
import {
  EventScanPayload,
  ScanStatus,
  EventLoginPayload,
  EventMessagePayload,
  MessagePayload,
  MessageType,
}                         from 'wechaty-puppet'

class MockerTest extends Mocker {
}

function createFixture () {
  const mocker = new Mocker()
  const puppet = new PuppetMock({ mocker })

  const [ user, mike, mary ] = mocker.createContacts(3)
  const room = mocker.createRoom({
    memberIdList: [
      mike.id,
      mary.id,
      user.id,
    ],
  })

  return {
    mary,
    mike,
    mocker,
    puppet,
    room,
    user,
  }
}

test('Mocker restart without problem', async t => {
  const mocker = new MockerTest()
  mocker.use(SimpleBehavior())
  mocker.puppet = {
    emit: (..._: any[]) => {},
  } as any

  try {
    for (let i = 0; i < 3; i++) {
      await mocker.start()
      await mocker.stop()
      t.pass('start/stop-ed at #' + i)
    }
    t.pass('Mocker() start/restart successed.')
  } catch (e) {
    t.fail(e)
  }
})

test('Mocker.scan()', async t => {
  const {
    mocker,
    puppet,
  }         = createFixture()

  const QR_CODE = 'https://github.com/wechaty'
  const EXPECTED_PAYLOAD: EventScanPayload = {
    qrcode: QR_CODE,
    status: ScanStatus.Waiting,
  }

  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()
  puppet.on('scan', spy)

  await puppet.start()
  mocker.scan(QR_CODE, ScanStatus.Waiting)

  t.ok(spy.calledOnce, 'should received the scan event')
  t.ok(spy.calledWith(EXPECTED_PAYLOAD), 'should received expected QR CODE')

  await puppet.stop()
})

test('Mocker.login()', async t => {
  const {
    user,
    mocker,
    puppet,
  }         = createFixture()

  const EXPECTED_PAYLOAD: EventLoginPayload = {
    contactId: user.id,
  }

  const sandbox = sinon.createSandbox()
  const spy = sandbox.spy()
  puppet.on('login', spy)

  await puppet.start()
  mocker.login(user)

  t.ok(spy.calledOnce, 'should received the login event')
  t.ok(spy.calledWith(EXPECTED_PAYLOAD), 'should received expected login payload')

  await puppet.stop()
})

test('MockContact.say().to(contact)', async t => {
  const {
    user,
    mary,
    puppet,
  }         = createFixture()

  const TEXT = 'Hello, contact!'

  const future = new Promise<EventMessagePayload>(resolve => puppet.once('message', resolve))

  await puppet.start()
  user.say(TEXT).to(mary)

  const { messageId } = await future

  const EXPECTED_PAYLOAD: MessagePayload = {
    fromId    : user.id,
    id        : messageId,
    text      : TEXT,
    timestamp : Date.now(),
    toId      : mary.id,
    type      : MessageType.Text,
  }

  const payload = await puppet.messagePayload(messageId)

  EXPECTED_PAYLOAD.timestamp = payload.timestamp

  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should received the expected contact message payload')

  await puppet.stop()
})

test('MockContact.say().to(room)', async t => {
  const {
    user,
    room,
    puppet,
  }         = createFixture()

  const TEXT = 'Hello, room!'

  const future = new Promise<EventMessagePayload>(resolve => puppet.once('message', resolve))

  await puppet.start()
  user.say(TEXT).to(room)

  const { messageId } = await future

  const EXPECTED_PAYLOAD: MessagePayload = {
    fromId    : user.id,
    id        : messageId,
    roomId    : room.id,
    text      : TEXT,
    timestamp : Date.now(),
    type      : MessageType.Text,
  }

  const payload = await puppet.messagePayload(messageId)

  EXPECTED_PAYLOAD.timestamp = payload.timestamp

  t.deepEqual(payload, EXPECTED_PAYLOAD, 'should received the expected room message payload')

  await puppet.stop()
})