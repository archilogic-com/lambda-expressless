const { Response } = require('./response')
const { Request } = require('./request')
const { gzipSync } = require('zlib')

describe('Response object', () => {
  const requestObject = { a: 1 }
  let req
  beforeEach(() => {
    const eventV2 = {
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
    req = new Request(eventV2)
  })

  it('set response status properly', done => {
    const res = new Response(req, (err, out) => {
      expect(out).toEqual({
        statusCode: 404,
        isBase64Encoded: false,
        headers: {},
        body: ''
      })
      done()
    })
    res.status(404)
    res.end()
  })

  it('send body properly', done => {
    const res = new Response(req, (err, out) => {
      expect(out.body).toBe('hello')
      done()
    })
    res.send('hello')
  })

  it('brotli compress large body if supported', done => {
    const event = {
      headers: {
        Accept: 'text/html',
        'Content-Length': 0,
        'Accept-Encoding': 'gzip, deflate, br'
      },
      multiValueHeaders: {
        Accept: ['text/html'],
        'Content-Length': [0],
        'Accept-Encoding': ['gzip, deflate, br']
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

    const req = new Request(event)
    req.next = error => {}
    const res = new Response(req, (err, out) => {
      expect(out.body).toBeDefined()
      expect(out.body.length).toBeLessThan(10000)
      expect(out.isBase64Encoded).toBeTruthy()
      expect(out.headers['Content-Encoding'] === 'br')
      done()
    })
    res.send('a'.repeat(6000000))
  })

  it('gzip large body', done => {
    const event = {
      headers: {
        Accept: 'text/html',
        'Content-Length': 0,
        'Accept-Encoding': 'gzip, deflate, sdch'
      },
      multiValueHeaders: {
        Accept: ['text/html'],
        'Content-Length': [0],
        'Accept-Encoding': ['gzip, deflate, sdch']
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

    const req = new Request(event)
    req.next = error => {}
    const res = new Response(req, (err, out) => {
      expect(out.body).toBeDefined()
      expect(out.body.length).toBeLessThan(10000)
      expect(out.isBase64Encoded).toBeTruthy()
      expect(out.headers['Content-Encoding'] === 'gzip')
      done()
    })
    res.send('a'.repeat(6000000))
  })

  it('gzip large body - not supported encoding', done => {
    const event = {
      headers: {
        Accept: 'text/html',
        'Content-Length': 0,
        'Accept-Encoding': 'deflate, sdch'
      },
      multiValueHeaders: {
        Accept: ['text/html'],
        'Content-Length': [0],
        'Accept-Encoding': ['deflate, sdch']
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

    const req = new Request(event)
    req.next = error => {}
    const res = new Response(req, (err, out) => {
      expect(out.body).toBeDefined()
      expect(out.body.length).toBe(6000000)
      expect(out.isBase64Encoded).toBeFalsy()
      done()
    })
    res.send('a'.repeat(6000000))
  })

  it('already gzipped body left as is', done => {
    const content = gzipSync('foo bar some text to be zippped...').toString('base64')
    const res = new Response(req, (err, out) => {
      expect(out.body).toEqual(content)
      expect(out.isBase64Encoded).toBeTruthy()
      done()
    })
    res.send(content)
  })

  it('set content-type', done => {
    const res = new Response(req, (err, out) => {
      expect(out.headers).toEqual({
        'content-type': 'text/html'
      })
      done()
    })
    res.type('text/html')
    res.send()
  })

  it('get header', done => {
    const res = new Response(req, err => {
      done()
    })
    res.set('X-Header', 'a')
    expect(res.get('X-Header')).toBe('a')
    // Should work case insensitive
    expect(res.get('x-Header')).toBe('a')
    res.end()
  })

  it('set header with setHeader', done => {
    const res = new Response(req, err => {
      done()
    })
    res.setHeader('X-Header', 'b')
    expect(res.get('X-Header')).toBe('b')
    // Should work case insensitive
    expect(res.get('x-Header')).toBe('b')
    res.end()
  })

  it('set header with header', done => {
    const res = new Response(req, err => {
      done()
    })
    res.header('X-Header', 'c')
    expect(res.get('X-Header')).toBe('c')
    // Should work case insensitive
    expect(res.get('x-Header')).toBe('c')
    res.end()
  })

  it('set cookies', done => {
    const res = new Response(req, (err, out) => {
      expect(out.multiValueHeaders).toEqual({
        'Set-Cookie': [
          'foo=1234; Path=/',
          'bar=5678; Path=/docs',
          'foo2=1234; Domain=example.com; Path=/',
          'foo3=1234; Expires=Fri, 25 Sep 2020 22:00:00 GMT; Path=/',
          'foo4=1234; Max-Age=456879; Path=/',
          'foo5=1234; Secure; SameSite=None; Path=/',
          'foo6=1234; HttpOnly; Path=/'
        ]
      })
      done()
    })
    res.cookie('foo', '1234')
    res.cookie('bar', '5678', { path: '/docs' })
    res.cookie('foo2', '1234', { domain: 'example.com' })
    res.cookie('foo3', '1234', { expires: new Date(2020, 8, 26) })
    res.cookie('foo4', '1234', { maxAge: 456879 })
    res.cookie('foo5', '1234', { secure: true, sameSite: 'None' })
    res.cookie('foo6', '1234', { httpOnly: true })
    res.end()
  })

  it('can chain status method', done => {
    const res = new Response(req, (err, out) => {
      expect(out.statusCode).toBe(201)
      expect(res.statusCode).toBe(201)
      done()
    })
    res.status(201).end()
  })

  it('can chain set method', done => {
    const res = new Response(req, (err, out) => {
      expect(out.headers).toEqual({ 'x-header': 'a' })
      done()
    })
    res.set('x-header', 'a').end()
  })

  it('can chain type method', done => {
    const response = new Response(req, (err, out) => {
      expect(out.headers).toEqual({
        'content-type': 'text/xml'
      })
      done()
    })
    response.type('text/xml').end()
  })

  describe('should send correct response via accept header', () => {
    it('with regular header', done => {
      const event = {
        headers: {
          Accept: 'text/xml',
          'Content-Length': 0
        },
        multiValueHeaders: {
          Accept: ['text/xml'],
          'Content-Length': [0]
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

      const req = new Request(event)
      req.next = error => {}
      const res = new Response(req, (err, out) => {
        expect(out.statusCode).toBe(200)
        expect(out.headers['content-type']).toBe('text/xml')
        expect(out.body).toBe('<xml/>')
        done()
      })
      res.format({
        'application/json': (req, res, next) => {
          res.json({ a: 1 })
        },
        'text/xml': (req, res, next) => {
          res.send('<xml/>')
        }
      })
    })

    it('without regular header', done => {
      const event = {
        headers: {
          Accept: 'text/html',
          'Content-Length': 0
        },
        multiValueHeaders: {
          Accept: ['text/html'],
          'Content-Length': [0]
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

      const req = new Request(event)
      req.next = error => {}

      const res = new Response(req, (err, out) => {
        expect(out.statusCode).toBe(200)
        expect(out.headers['content-type']).toBe('text/html')
        expect(out.body).toBe('<p>hi</p>')
        done()
      })
      res.format({
        'application/json': (req, res, next) => {
          res.json({ a: 1 })
        },
        'text/xml': (req, res, next) => {
          res.send('<xml/>')
        },
        default: (req, res, next) => {
          res.type('text/html').send('<p>hi</p>')
        }
      })
    })

    it('with non acceptable accept header', done => {
      expect.assertions(2)

      const event = {
        headers: {
          Accept: 'image/jpeg',
          'Content-Length': 0
        },
        multiValueHeaders: {
          Accept: ['image/jpeg'],
          'Content-Length': [0]
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

      const req = new Request(event)

      const res = new Response(req, error => {
        expect(error.status).toBe(406)
        expect(error).toEqual(Error('Not Acceptable'))
        done()
      })
      res.format({
        'application/json': (req, res, next) => {
          res.json({ a: 1 })
        }
      })
    })
  })
})
