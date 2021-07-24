export const findOne = {
  type: 'object',
  properties: {
    account_id: { type: 'string', format: 'uuid' },
  },
  required: ['account_id'],
}
