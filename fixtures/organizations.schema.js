export const findOne = {
  type: 'object',
  properties: {
    organization_id: { type: 'string', format: 'uuid' },
  },
  required: ['organization_id'],
}
