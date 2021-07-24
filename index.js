import grpc from '@grpc/grpc-js'
import Ajv from 'ajv'
import uuid from '@socketkit/ajv-uuid'

const ajv = new Ajv({ removeAdditional: true })
uuid(ajv)
export default ajv

/**
 * @function addSchemas
 * @description Adds JSON schemas to Mali instance
 * @param {import('mali').Mali} mali Mali Instance
 * @param {object} schemas Schema function declerations
 * @returns {Function} callback function
 */
export function addSchemas(app, schemas = {}) {
  app.context.schemas = new Map(Object.entries(schemas))

  return async function (context, next) {
    const { req } = context.request
    const name = context.service.toLowerCase()
    const service_schemas = app.context.schemas.get(name)

    // Schema does not include the given service decleration
    if (!service_schemas) {
      return next()
    }

    const schema = service_schemas[context.name]

    // Service schema does not include the given function
    if (!schema) {
      return next()
    }

    const isValid = await ajv.validate(schema, req)

    if (!isValid) {
      const error = new Error(ajv.errorsText(ajv.errors))
      error.code = grpc.status.FAILED_PRECONDITION
      throw error
    }

    return next()
  }
}
