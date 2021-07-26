/* eslint-disable security/detect-object-injection */

import { randomUUID } from 'crypto'
import path from 'path'
import test from 'ava'
import Mali from 'mali'
import grpc from '@grpc/grpc-js'
import loader from '@grpc/proto-loader'
import { promisify } from 'util'

import * as account_schemas from './fixtures/accounts.schema.js'

import { addSchemas } from './index.js'

const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
}

const file = path.join(path.resolve('.'), 'fixtures/test-service.proto')

const getRandomPort = (a = 1000, b = 65000) => {
  const lower = Math.ceil(Math.min(a, b))
  const upper = Math.floor(Math.max(a, b))
  return Math.floor(lower + Math.random() * (upper - lower + 1))
}

function promisifyAll(subscriber) {
  const to = {}
  for (const k in subscriber) {
    if (typeof subscriber[k] != 'function') continue
    to[k] = promisify(subscriber[k].bind(subscriber))
  }
  return to
}

const getClients = (port) => {
  const { Accounts, Organizations } = grpc.loadPackageDefinition(
    loader.loadSync(path.join('.', 'fixtures/test-service.proto'), options),
  )

  return {
    accounts: new Accounts(
      `0.0.0.0:${port}`,
      grpc.credentials.createInsecure(),
    ),
    organizations: new Organizations(
      `0.0.0.0:${port}`,
      grpc.credentials.createInsecure(),
    ),
  }
}

test('should change error code', async (t) => {
  const port = getRandomPort()
  const app = new Mali()
  app.addService(file, 'Accounts', options)
  app.addService(file, 'Organizations', options)
  app.use(
    addSchemas(
      app,
      { accounts: account_schemas },
      { errorCode: grpc.status.UNAVAILABLE },
    ),
  )
  app.use({
    Accounts: {
      findOne: (ctx) =>
        (ctx.res = { account_id: randomUUID(), name: 'hello ' }),
    },
    Organizations: {
      findOne: (ctx) =>
        (ctx.res = { organization_id: randomUUID(), name: 'hello ' }),
    },
  })
  await app.start(`0.0.0.0:${port}`)
  t.teardown(() => app.close())

  const clients = getClients(port)
  const accounts = promisifyAll(clients.accounts)
  try {
    await accounts.findOne({ account_id: 'hello' })
    throw new Error(`Invalid`)
  } catch (error) {
    t.not(error.message, 'Invalid')
    t.is(error.code, grpc.status.UNAVAILABLE)
    t.is(error.details, `data/account_id must match format "uuid"`)
  }
})

test('should throw error on invalid request', async (t) => {
  const port = getRandomPort()
  const app = new Mali()
  app.addService(file, 'Accounts', options)
  app.addService(file, 'Organizations', options)
  app.use(addSchemas(app, { accounts: account_schemas }))
  app.use({
    Accounts: {
      findOne: (ctx) =>
        (ctx.res = { account_id: randomUUID(), name: 'hello ' }),
    },
    Organizations: {
      findOne: (ctx) =>
        (ctx.res = { organization_id: randomUUID(), name: 'hello ' }),
    },
  })
  await app.start(`0.0.0.0:${port}`)
  t.teardown(() => app.close())

  const clients = getClients(port)
  const accounts = promisifyAll(clients.accounts)
  try {
    await accounts.findOne({ account_id: 'hello' })
    throw new Error(`Invalid`)
  } catch (error) {
    t.not(error.message, 'Invalid')
    t.is(error.code, grpc.status.FAILED_PRECONDITION)
    t.is(error.details, `data/account_id must match format "uuid"`)
  }
})

test('should not throw error on valid data', async (t) => {
  const port = getRandomPort()
  const app = new Mali()
  app.addService(file, 'Accounts', options)
  app.addService(file, 'Organizations', options)
  app.use(addSchemas(app, { accounts: account_schemas }))
  app.use({
    Accounts: {
      findOne: (ctx) =>
        (ctx.res = { account_id: randomUUID(), name: 'hello ' }),
    },
    Organizations: {
      findOne: (ctx) =>
        (ctx.res = { organization_id: randomUUID(), name: 'hello ' }),
    },
  })
  await app.start(`0.0.0.0:${port}`)
  t.teardown(() => app.close())

  const clients = getClients(port)
  const accounts = promisifyAll(clients.accounts)
  const response = await accounts.findOne({ account_id: randomUUID() })
  t.truthy(response)
})

test('should not throw error on missing schema', async (t) => {
  const port = getRandomPort()
  const app = new Mali()
  app.addService(file, 'Accounts', options)
  app.addService(file, 'Organizations', options)
  app.use(addSchemas(app, { accounts: account_schemas }))
  app.use({
    Accounts: {
      findOne: (ctx) =>
        (ctx.res = { account_id: randomUUID(), name: 'hello ' }),
    },
    Organizations: {
      findOne: (ctx) =>
        (ctx.res = { organization_id: randomUUID(), name: 'hello ' }),
    },
  })
  await app.start(`0.0.0.0:${port}`)
  t.teardown(() => app.close())

  const clients = getClients(port)
  const organizations = promisifyAll(clients.organizations)
  const response = await organizations.findOne({
    organization_id: randomUUID(),
  })
  t.truthy(response)
})

test('should not throw error on missing function in a schema', async (t) => {
  const port = getRandomPort()
  const app = new Mali()
  app.addService(file, 'Accounts', options)
  app.addService(file, 'Organizations', options)
  app.use(addSchemas(app, { accounts: account_schemas }))
  app.use({
    Accounts: {
      findOne: (ctx) => {
        ctx.res = { account_id: randomUUID(), name: 'hello' }
      },
      findAll: (ctx) => {
        ctx.res = { rows: [] }
      },
    },
    Organizations: {
      findOne: (ctx) => {
        ctx.res = { organization_id: randomUUID(), name: 'hello' }
      },
    },
  })
  await app.start(`0.0.0.0:${port}`)
  t.teardown(() => app.close())

  const clients = getClients(port)
  const accounts = promisifyAll(clients.accounts)
  const response = await accounts.findAll({})
  t.truthy(response.rows)
})
