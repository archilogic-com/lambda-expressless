const { Request } = require('./request')

describe('Request object version 1.0', () => {
  const requestObject = { a: 1 }
  let event
  beforeEach(() => {
    event = {
      body: JSON.stringify(requestObject),
      headers: {
        'Content-Type': 'application/json',
        'X-Header': 'value2'
      },
      multiValueHeaders: {
        'Content-Type': ['application/json'],
        'X-Header': ['value1', 'value2']
      },
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/path',
      pathParameters: {},
      queryStringParameters: {
        a: '1',
        b: '2',
        'c[]': 'lastName',
        'd[1]': '1',
        'd[0]': '0',
        'shoe[color]': 'yellow',
        email: 'test+user@gmail.com',
        math: '1+2'
      },
      multiValueQueryStringParameters: {
        a: ['1'],
        b: ['1', '2'],
        'c[]': ['-firstName', 'lastName'],
        'd[1]': ['1'],
        'd[0]': ['0'],
        'shoe[color]': ['yellow'],
        email: ['test+user@gmail.com'],
        math: ['1+2', '4+5']
      },
      stageVariables: {},
      requestContext: {},
      resource: ''
    }
  })

  it('should read query parameter', () => {
    const request = new Request(event)

    expect(request.query.a).toBe('1')
    expect(request.query.shoe.color).toBe('yellow')
    expect(request.query.email).toBe('test+user@gmail.com')
  })

  it('should read all values of query parameter with multiple values', () => {
    const request = new Request(event)

    expect(request.query.b).toEqual(['1', '2'])
    expect(request.query.c).toEqual(['-firstName', 'lastName'])
    expect(request.query.d).toEqual(['0', '1'])
    expect(request.query.math).toEqual(['1+2', '4+5'])
  })

  it('should read header', () => {
    const request = new Request(event)

    expect(request.get('Content-Type')).toBe('application/json')
    expect(request.get('content-type')).toBe('application/json')
  })

  it('should read first value of header with multiple values', () => {
    const request = new Request(event)

    expect(request.get('X-Header')).toEqual('value1')
  })

  it('should read query as empty object if there is no queryparamters', () => {
    delete event.multiValueQueryStringParameters
    event.queryStringParameters = {}
    const request = new Request(event)

    expect(request.query).toEqual({})
  })

  it('should read headers as empty object if there is no headers', () => {
    delete event.multiValueHeaders
    event.headers = {}
    delete event.body
    const request = new Request(event)

    expect(request.headers).toEqual({})
  })

  it('should handle weird header asks', () => {
    const request = new Request(event)

    expect(() => request.get()).toThrow(TypeError('name argument is required to req.get'))
    expect(() => request.get({})).toThrow(TypeError('name must be a string to req.get'))
  })

  it('should read referer/referrer header', () => {
    const referer = 'muratcorlu.com'
    event.headers['Referer'] = referer
    event.multiValueHeaders['Referer'] = [referer]

    const request = new Request(event)
    expect(request.get('referer')).toBe(referer)
    expect(request.get('referrer')).toBe(referer)
  })

  it('check type', () => {
    const request = new Request(event)
    expect(request.is('json')).toBe('json')
    expect(request.is(['html', 'json'])).toBe('json')
    expect(request.is('html', 'xml')).toBe(false)
  })

  it('should check accept header', () => {
    event.headers['Accept'] = 'application/json'
    event.multiValueHeaders['Accept'] = ['application/json']

    const request = new Request(event)
    expect(request.accepts('xml')).toBe(false)
    expect(request.accepts('text/xml')).toBe(false)
    expect(request.accepts('json')).toBe('json')
    expect(request.accepts('application/json')).toBe('application/json')
    expect(request.accepts(['html', 'json'])).toBe('json')
  })

  it('should check acceptEncodings', () => {
    event.headers['accept-encoding'] = 'gzip, compress;q=0.2'
    event.multiValueHeaders['accept-encoding'] = ['gzip, compress;q=0.2']

    const request = new Request(event)
    expect(request.acceptsEncodings('gzip', 'compress')).toBe('gzip')
  })

  it('should check acceptsCharsets', () => {
    event.headers['accept-charset'] = 'utf-8, iso-8859-1;q=0.2, utf-7;q=0.5'
    event.multiValueHeaders['accept-charset'] = ['utf-8, iso-8859-1;q=0.2, utf-7;q=0.5']

    const request = new Request(event)
    expect(request.acceptsCharsets('utf-7', 'utf-8')).toBe('utf-8')
  })

  it('should check acceptsLanguages', () => {
    event.headers['accept-charset'] = 'en;q=0.8, es, tr'
    event.multiValueHeaders['accept-charset'] = ['en;q=0.8, es, tr']

    const request = new Request(event)
    expect(request.acceptsLanguages('tr', 'en')).toBe('tr')
  })

  it('should handle non-ascii characters', () => {
    const body = { text: 'árvíztűrőtükörfúrógép😄Tシャツを3 枚購入しました。🇨🇭🇺🇸🇯🇵🇭🇺🇬🇷🇵🇱∃⇔€🎉' }
    event.body = JSON.stringify(body)
    const request = new Request(event)
    expect(JSON.parse(request.body)).toEqual(body)
  })
})

describe('Request object version 2.0', () => {
  const requestObject = { a: 1 }
  let eventV2
  beforeEach(() => {
    eventV2 = {
      version: '2.0',
      routeKey: '$default',
      rawPath: '/my/path',
      rawQueryString:
        'a=1&b=1&b=2&c[]=-firstName&c[]=lastName&d[1]=1&d[0]=0&shoe[color]=yellow&email=test+user@gmail.com&math=1+2&&math=4+5&',

      cookies: ['cookie1', 'cookie2'],
      headers: {
        'Content-Type': 'application/json',
        'X-Header': 'value1,value2'
      },
      queryStringParameters: {
        a: '1',
        b: '2',
        'c[]': 'lastName',
        'd[1]': '1',
        'd[0]': '0',
        'shoe[color]': 'yellow',
        email: 'test+user@gmail.com',
        math: '1+2'
      },
      requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        authentication: {
          clientCert: {
            clientCertPem: 'CERT_CONTENT',
            subjectDN: 'www.example.com',
            issuerDN: 'Example issuer',
            serialNumber: 'a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1:a1',
            validity: {
              notBefore: 'May 28 12:30:02 2019 GMT',
              notAfter: 'Aug  5 09:36:04 2021 GMT'
            }
          }
        },
        authorizer: {
          jwt: {
            claims: {
              claim1: 'value1',
              claim2: 'value2'
            },
            scopes: ['scope1', 'scope2']
          }
        },
        domainName: 'id.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'id',
        http: {
          method: 'POST',
          path: '/my/path',
          protocol: 'HTTP/1.1',
          sourceIp: 'IP',
          userAgent: 'agent'
        },
        requestId: 'id',
        routeKey: '$default',
        stage: '$default',
        time: '12/Mar/2020:19:03:58 +0000',
        timeEpoch: 1583348638390
      },
      body: JSON.stringify(requestObject),
      pathParameters: {
        parameter1: 'value1'
      },
      isBase64Encoded: false,
      stageVariables: {
        stageVariable1: 'value1',
        stageVariable2: 'value2'
      }
    }
  })

  it('should read query parameter', () => {
    const request = new Request(eventV2)

    expect(request.query.a).toBe('1')
    expect(request.query.shoe.color).toBe('yellow')
    expect(request.query.email).toBe('test+user@gmail.com')
  })

  it('should read all values of query parameter with multiple values', () => {
    const request = new Request(eventV2)

    expect(request.query.b).toEqual(['1', '2'])
    expect(request.query.c).toEqual(['-firstName', 'lastName'])
    expect(request.query.d).toEqual(['0', '1'])
    expect(request.query.math).toEqual(['1+2', '4+5'])
  })

  it('should read header', () => {
    const request = new Request(eventV2)

    expect(request.get('Content-Type')).toBe('application/json')
    expect(request.get('content-type')).toBe('application/json')
    expect(request.get('X-Header')).toEqual('value1,value2')
  })

  it('should read query as empty object if there is no queryparamters', () => {
    eventV2.queryStringParameters = {}
    eventV2.rawQueryString = ''
    const request = new Request(eventV2)

    expect(request.query).toEqual({})
  })

  it('should read headers as empty object if there is no headers', () => {
    eventV2.headers = {}
    delete eventV2.body
    delete eventV2.cookies
    const request = new Request(eventV2)

    expect(request.headers).toEqual({})
  })

  it('should handle weird header asks', () => {
    const request = new Request(eventV2)

    expect(() => request.get()).toThrow(TypeError('name argument is required to req.get'))
    expect(() => request.get({})).toThrow(TypeError('name must be a string to req.get'))
  })

  it('should read referer/referrer header', () => {
    const referer = 'muratcorlu.com'
    eventV2.headers['Referer'] = referer

    const request = new Request(eventV2)
    expect(request.get('referer')).toBe(referer)
    expect(request.get('referrer')).toBe(referer)
  })

  it('check type', () => {
    const request = new Request(eventV2)
    expect(request.is('json')).toBe('json')
    expect(request.is(['html', 'json'])).toBe('json')
    expect(request.is('html', 'xml')).toBe(false)
  })

  it('should check accept header', () => {
    eventV2.headers['Accept'] = 'application/json'

    const request = new Request(eventV2)
    expect(request.accepts('xml')).toBe(false)
    expect(request.accepts('text/xml')).toBe(false)
    expect(request.accepts('json')).toBe('json')
    expect(request.accepts('application/json')).toBe('application/json')
    expect(request.accepts(['html', 'json'])).toBe('json')
  })

  it('should check acceptEncodings', () => {
    eventV2.headers['accept-encoding'] = 'gzip, compress;q=0.2'

    const request = new Request(eventV2)
    expect(request.acceptsEncodings('gzip', 'compress')).toBe('gzip')
  })

  it('should check acceptsCharsets', () => {
    eventV2.headers['accept-charset'] = 'utf-8, iso-8859-1;q=0.2, utf-7;q=0.5'

    const request = new Request(eventV2)
    expect(request.acceptsCharsets('utf-7', 'utf-8')).toBe('utf-8')
  })

  it('should check acceptsLanguages', () => {
    eventV2.headers['accept-charset'] = 'en;q=0.8, es, tr'

    const request = new Request(eventV2)
    expect(request.acceptsLanguages('tr', 'en')).toBe('tr')
  })

  it('should handle non-ascii characters', () => {
    const body = { text: 'árvíztűrőtükörfúrógép😄Tシャツを3 枚購入しました。🇨🇭🇺🇸🇯🇵🇭🇺🇬🇷🇵🇱∃⇔€🎉' }
    eventV2.body = JSON.stringify(body)
    const request = new Request(eventV2)
    expect(JSON.parse(request.body)).toEqual(body)
  })

  it('should set cookies', () => {
    const request = new Request(eventV2)
    expect(request.get('Cookie')).toEqual('cookie1; cookie2')
  })
})
