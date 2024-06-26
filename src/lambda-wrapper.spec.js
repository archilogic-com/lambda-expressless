const { ApiGatewayHandler } = require('./lambda-wrapper')
const Router = require('router')

describe('Lambda Wrapper for payload v1.0', () => {
  const proxyRequest = {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/path',
    pathParameters: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {},
    resource: ''
  }

  it('should send json output properly', async () => {
    const router = Router()
    router.use((req, res) => {
      res.json({ a: 1 })
    })
    const lambdaHandler = ApiGatewayHandler(router)
    const proxyRequest = {
      body: '',
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/path',
      pathParameters: {},
      queryStringParameters: {},
      multiValueQueryStringParameters: {},
      stageVariables: {},
      requestContext: {},
      resource: ''
    }
    const result = await lambdaHandler(proxyRequest, {})

    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: '{"a":1}'
    })
  })

  it('should handle json body on a post request', async () => {
    const router = Router()
    router.use((req, res) => {
      res.json(JSON.parse(req.body))
    })
    const lambdaHandler = ApiGatewayHandler(router)

    const requestObject = JSON.stringify({ a: 1 })
    const proxyRequest = {
      body: requestObject,
      headers: {
        'Content-Type': 'application/json'
      },
      multiValueHeaders: {
        'Content-Type': ['application/json']
      },
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/path',
      pathParameters: {},
      queryStringParameters: {},
      multiValueQueryStringParameters: {},
      stageVariables: {},
      requestContext: {},
      resource: ''
    }

    const result = await lambdaHandler(proxyRequest, {})
    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: requestObject
    })
  })

  it('should run multiple middlewares', async () => {
    expect.assertions(1)
    const router = Router()
    router.use((req, res, next) => {
      req.fromFirstEndpoint = '1'
      next()
    })
    router.use((req, res) => {
      res.json({ b: req.fromFirstEndpoint })
    })
    const lambdaHandler = ApiGatewayHandler(router)

    const result = await lambdaHandler(proxyRequest, {})

    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ b: '1' })
    })
  })

  it('should handle errors', async () => {
    expect.assertions(1)

    const router = Router()
    router.use((req, res, next) => {
      throw Error('test')
    })
    router.use((err, req, res, next) => {
      expect(err).toEqual(Error('test'))
      next()
    })
    const lambdaHandler = ApiGatewayHandler(router)
    const out = await lambdaHandler(proxyRequest, {})
  })

  it('should handle next(error)', async () => {
    expect.assertions(1)

    const router = Router()
    router.use((req, res, next) => {
      next('test')
    })
    router.use((err, req, res, next) => {
      expect(err).toEqual('test')
      next()
    })
    const lambdaHandler = ApiGatewayHandler(router)
    await lambdaHandler(proxyRequest, {})
  })

  it('GET with path', async () => {
    expect.assertions(1)
    const router = Router()
    router.get('/*', (req, res, next) => {
      req.fromFirstEndpoint = 1
      next()
    })
    router.get('/path', (req, res) => {
      res.json({ a: req.fromFirstEndpoint, b: 2 })
    })

    const lambdaHandler = ApiGatewayHandler(router)
    const proxyRequest = {
      body: '',
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/path',
      pathParameters: {},
      queryStringParameters: {},
      multiValueQueryStringParameters: {},
      stageVariables: {},
      requestContext: {},
      resource: ''
    }

    const result = await lambdaHandler(proxyRequest, {})
    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: '{"a":1,"b":2}'
    })
  })

  it('POST matching only post handler', async () => {
    expect.assertions(1)
    const router = Router()
    router.get('/path', (req, res, next) => {
      req.foo = 1
      next()
    })

    router.post('/path', (req, res) => {
      res.json({ a: req.foo, b: 2 })
    })

    const lambdaHandler = ApiGatewayHandler(router)

    const result = await lambdaHandler(proxyRequest, {})
    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: '{"b":2}'
    })
  })

  it('Router cascade', async () => {
    expect.assertions(1)
    const subRouter = Router()

    subRouter.post('/path', (req, res) => {
      res.json({ b: 2 })
    })

    const router = Router()
    router.use('/testing', subRouter)

    const lambdaHandler = ApiGatewayHandler(router)

    let request = {}
    Object.assign(request, proxyRequest)
    request.path = '/testing/path'
    const result = await lambdaHandler(request, {})
    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: '{"b":2}'
    })
  })
})

describe('Lambda Wrapper for payload v2.0', () => {
  const requestObject = JSON.stringify({ a: 1 })
  const proxyRequest = {
    version: '2.0',
    body: requestObject,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': requestObject.length
    },
    multiValueHeaders: {
      'Content-Type': ['application/json'],
      'Content-Length': [requestObject.length]
    },
    httpMethod: 'POST',
    isBase64Encoded: false,
    rawPath: '/path',
    pathParameters: {},
    queryStringParameters: {},
    multiValueQueryStringParameters: {},
    stageVariables: {},
    requestContext: {
      http: {
        method: 'POST',
        path: '/my/path',
        protocol: 'HTTP/1.1',
        sourceIp: 'IP',
        userAgent: 'agent'
      }
    },
    resource: ''
  }

  it('should send json output properly', async () => {
    const router = Router()
    router.use((req, res) => {
      res.json({ a: 1 })
    })
    const lambdaHandler = ApiGatewayHandler(router)
    const result = await lambdaHandler(proxyRequest, {})

    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: '{"a":1}'
    })
  })

  it('should handle json body on a post request', async () => {
    const router = Router()
    router.use((req, res) => {
      res.json(JSON.parse(req.body))
    })
    const lambdaHandler = ApiGatewayHandler(router)

    const result = await lambdaHandler(proxyRequest, {})
    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: requestObject
    })
  })

  it('should run multiple middlewares', async () => {
    expect.assertions(1)
    const router = Router()
    router.use((req, res, next) => {
      req.fromFirstEndpoint = '1'
      next()
    })
    router.use((req, res) => {
      res.json({ b: req.fromFirstEndpoint })
    })
    const lambdaHandler = ApiGatewayHandler(router)

    const result = await lambdaHandler(proxyRequest, {})

    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ b: '1' })
    })
  })

  it('should handle errors', async () => {
    expect.assertions(1)

    const router = Router()
    router.use((req, res, next) => {
      throw Error('test')
    })
    router.use((err, req, res, next) => {
      expect(err).toEqual(Error('test'))
      next()
    })
    const lambdaHandler = ApiGatewayHandler(router)
    const out = await lambdaHandler(proxyRequest, {})
  })

  it('should handle next(error)', async () => {
    expect.assertions(1)

    const router = Router()
    router.use((req, res, next) => {
      next('test')
    })
    router.use((err, req, res, next) => {
      expect(err).toEqual('test')
      next()
    })
    const lambdaHandler = ApiGatewayHandler(router)
    await lambdaHandler(proxyRequest, {})
  })

  it('GET with path', async () => {
    expect.assertions(1)
    const router = Router()
    router.get('/*', (req, res, next) => {
      req.fromFirstEndpoint = 1
      next()
    })
    router.get('/path', (req, res) => {
      res.json({ a: req.fromFirstEndpoint, b: 2 })
    })

    const lambdaHandler = ApiGatewayHandler(router)
    const proxyRequest = {
      version: '2.0',
      body: '',
      headers: {},
      isBase64Encoded: false,
      rawPath: '/path',
      pathParameters: {},
      queryStringParameters: {},
      stageVariables: {},
      requestContext: {
        http: {
          method: 'GET',
          path: '/path',
          protocol: 'HTTP/1.1',
          sourceIp: 'IP',
          userAgent: 'agent'
        }
      },
      resource: ''
    }

    const result = await lambdaHandler(proxyRequest, {})
    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: '{"a":1,"b":2}'
    })
  })

  it('POST matching only post handler', async () => {
    expect.assertions(1)
    const router = Router()
    router.get('/path', (req, res, next) => {
      req.foo = 1
      next()
    })

    router.post('/path', (req, res) => {
      res.json({ a: req.foo, b: 2 })
    })

    const lambdaHandler = ApiGatewayHandler(router)

    const result = await lambdaHandler(proxyRequest, {})
    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: '{"b":2}'
    })
  })

  it('Router cascade', async () => {
    expect.assertions(1)
    const subRouter = Router()

    subRouter.post('/path', (req, res) => {
      res.json({ b: 2 })
    })

    const router = Router()
    router.use('/testing', subRouter)

    const lambdaHandler = ApiGatewayHandler(router)

    let request = {}
    Object.assign(request, proxyRequest)
    request.rawPath = '/testing/path'
    const result = await lambdaHandler(request, {})
    expect(result).toEqual({
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        'content-type': 'application/json'
      },
      body: '{"b":2}'
    })
  })
})
