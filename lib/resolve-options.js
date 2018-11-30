const schema = {
  type: 'object',
  required: [
    'namespace'
  ],
  properties: {
    namespace: {
      type: 'string',
      required: true
    },
    flags: {
      oneOf: [
        {
          type: 'string',
          minLength: 1
        },
        {
          type: 'obejct',
          patternProperties: {
            '.+': {
              type: 'boolean'
            }
          },
          additionalProperties: true
        }
      ]
    },
    watch: {
      type: 'boolean'
    },
    filterFiles: {
      type: 'object',
      patternProperties: {
        '.+': {
          oneOf: [
            {
              type: 'array',
              items: {
                oneOf: [
                  {
                    type: 'string',
                    minLength: 1
                  },
                  {
                    instanceOf: 'RegExp'
                  }
                ]
              }
            },
            {
              type: 'string',
              minLength: 1
            },
            {
              instanceOf: 'RegExp'
            }
          ]
        }
      }
    }
  },
  additionalProperties: false
}

const validateOptions = require('schema-utils')
const { PLUGIN_NAME } = require('./constants')
const dependencyTree = require('dependency-tree')
const path = require('path')

module.exports = function resolveOptions (options) {
  validateOptions(schema, options, PLUGIN_NAME)
  if (options.watch) {
    if (!path.isAbsolute(options.watch)) {
      throw new Error('"watch" must be a absolute file path.')
    }
  } else {
    if (!options.flags) {
      throw new Error('"flags" must be a plain object including flags.')
    }
  }
  if (options.watch) {
    options.watchList = dependencyTree.toList({
      filename: options.flags
    })
  }
}
