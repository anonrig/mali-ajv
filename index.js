import grpc from '@grpc/grpc-js'
import Ajv from 'ajv'
import uuidPlugin from '@socketkit/ajv-uuid'

const ajv = new Ajv({ removeAdditional: true })
uuidPlugin(ajv)
export default ajv

/**
 * @function addSchemas
 * @description Adds JSON schemas to Mali instance
 * @param {import('mali')} app Mali Instance
 * @param {object} schemas Schema function declerations
 * @param {object} options Ajv Mali Options
 * @param {import('@grpc/grpc-js/build/src/constants').Status} options.errorCode gRPC error code
 * @returns {Function} callback function
 */
export function addSchemas(
  app,
  schemas = {},
  options = { errorCode: grpc.status.FAILED_PRECONDITION },
) {
  const compiled = new Map()

  for (const [service_name, functions] of Object.entries(schemas)) {
    if (!compiled.has(service_name)) {
      compiled.set(service_name, new Map())
    }

    for (const [function_name, function_self] of Object.entries(functions)) {
      compiled.get(service_name).set(function_name, ajv.compile(function_self))
    }
  }

  return function (context, next) {
    const service_name = context.service.toLowerCase()
    const function_name = context.name

    const service = compiled.get(service_name)

    // Service does not exist
    if (!service) {
      return next()
    }

    const schema = service.get(function_name)

    // Service schema does not include the given function
    if (!schema) {
      return next()
    }

    if (!schema(context.request.req)) {
      const error = new Error(ajv.errorsText(schema.errors))
      // @ts-ignore
      error.code = options.errorCode
      throw error
    }

    return next()
  }
}
