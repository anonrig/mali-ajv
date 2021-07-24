# Ajv validation for Mali.js gRPC microservices

This package adds **opinionated** [Ajv](https://ajv.js.org) input validation support for [Mali.js](https://mali.js.org) gRPC microservices.

## Install

```bash
npm i --save mali-ajv
```

## Setup

```javascript
import Mali from 'mali'
import { addSchemas } from 'mali-ajv'
import * as accounts from './endpoints/accounts.schema.js'
import * as memberships from './endpoints/memberships.schema.js'

const app = new Mali()
app.use(addSchemas(app, { accounts, memberships }))
app.addService(file, 'Memberships', {})
app.addService(file, 'Accounts', {})
app.use('Accounts', { findOne: (ctx) => (ctx.res = 'hello world' ) })
```

## Usage

Example request:

```json
{
  "identity_id": "45670d4a-1185-4e5a-bd3",
  "name": ""
}
```

Throws the following error:

```json
{
  "error": "9 FAILED_PRECONDITION: data.identity_id should match format \"uuid\""
}
```
