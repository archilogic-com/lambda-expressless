import {
  APIGatewayProxyEvent,
  APIGatewayProxyEventMultiValueQueryStringParameters,
  APIGatewayProxyEventV2
} from 'aws-lambda'

import accepts = require('accepts')
import { IncomingMessage } from 'http'

import typeis = require('type-is')
import { Response } from './response'
import { parse } from 'qs'

function queryParamsToStringify(params: APIGatewayProxyEventMultiValueQueryStringParameters = {}) {
  let param = ''
  for (const key in params) {
    const val = params[key]!.length > 1 ? params[key] : params[key]![0]
    if (typeof val === 'string') param += `${key}=${val}&`
    else
      val?.forEach(v => {
        param += `${key}=${v}&`
      })
  }
  return param
}


/**
 *
 */
export class Request {
  headers: { [k: string]: string }
  hostname: string | null
  method: string
  query: { [name: string]: string | string[] } | null
  path: string
  url: string
  params: { [name: string]: string } | null
  protocol: 'http' | 'https'
  secure: boolean
  ips: string[]
  ip: string
  host: string | null
  xhr: boolean
  event: APIGatewayProxyEvent | APIGatewayProxyEventV2
  accept: accepts.Accepts
  res: Response | null
  body: string | undefined
  constructor(event: APIGatewayProxyEvent | APIGatewayProxyEventV2) {
    this.res = null

    if ('version' in event && 'rawPath' in event) {
      // VERSION 2.0
      if (event.version !== '2.0') {
        console.error('Only supported version with version property is "2.0"')
      }
      this.headers = (Object.entries(event.headers).reduce((headers, [key, value]) => {
        headers[key.toLowerCase()] = value!
        return headers
      }, {} as { [name: string]: string }) as unknown) as { [name: string]: string }

      this.method = event.requestContext.http.method

      this.query = parse(event.rawQueryString, {
        charset: 'utf-8',
        decoder: function (str) {
          return str
        }
      }) as { [name: string]: string }

      if (event.cookies) {
        this.headers.cookie = event.cookies.join('; ')
      }

      this.path = event.rawPath || ''
      this.url = event.rawPath
    } else {
      // VERSION 1.0
      // https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
      if (!event.multiValueHeaders) {
        event.multiValueHeaders = {}
        for (const header in event.headers) {
          event.multiValueHeaders[header] = [event.headers[header] as string]
        }
      }

      this.headers = Object.keys(event.multiValueHeaders).reduce((headers, key) => {
        const value = event.multiValueHeaders[key]
        headers[key.toLowerCase()] = value![0]
        return headers
      }, {} as { [name: string]: string })

      this.method = event.httpMethod

      if (!event.multiValueQueryStringParameters) {
        event.multiValueQueryStringParameters = {}
        for (const queryParam in event.queryStringParameters) {
          event.multiValueQueryStringParameters[queryParam] = [
            event.queryStringParameters[queryParam] as string
          ]
        }
      }
      this.query = parse(queryParamsToStringify(event.multiValueQueryStringParameters), {
        charset: 'utf-8',
        decoder: function (str) {
          return str
        }
      }) as {
        [name: string]: string | string[]
      }

      this.path = event.path || ''
      this.url = event.path
    }

    this.params = event.pathParameters as { [name: string]: string }

    this.hostname = this.get('host') || ''
    this.protocol = this.get('X-Forwarded-Proto') === 'https' ? 'https' : 'http'
    this.secure = this.protocol === 'https'
    this.ips = (this.get('X-Forwarded-For') || '').split(', ')
    this.ip = this.ips[0]
    // Alternative way to obtain the source IP
    // this.ip = event.requestContext.identity.sourceIp
    this.host = this.get('X-Forwarded-Host') || this.hostname
    this.xhr = (this.get('X-Requested-With') || '').toLowerCase() === 'xmlhttprequest'

    this.accept = accepts((this as unknown) as IncomingMessage)

    if (!this.get('Content-Length') && event.body) {
      // not proper utf-8 length but that's not needed as the body is already a string
      this.headers['content-length'] = event.body.length.toString()
    }

    this.event = event
    this.body = event.body || undefined
  }

  /**
   * Check if the given `type(s)` is acceptable, returning
   * the best match when true, otherwise `undefined`, in which
   * case you should respond with 406 "Not Acceptable".
   *
   * The `type` value may be a single MIME type string
   * such as "application/json", an extension name
   * such as "json", a comma-delimited list such as "json, html, text/plain",
   * an argument list such as `"json", "html", "text/plain"`,
   * or an array `["json", "html", "text/plain"]`. When a list
   * or array is given, the _best_ match, if any is returned.
   *
   * Examples:
   *
   *     // Accept: text/html
   *     req.accepts('html');
   *     // => "html"
   *
   *     // Accept: text/*, application/json
   *     req.accepts('html');
   *     // => "html"
   *     req.accepts('text/html');
   *     // => "text/html"
   *     req.accepts('json, text');
   *     // => "json"
   *     req.accepts('application/json');
   *     // => "application/json"
   *
   *     // Accept: text/*, application/json
   *     req.accepts('image/png');
   *     req.accepts('png');
   *     // => undefined
   *
   *     // Accept: text/*;q=.5, application/json
   *     req.accepts(['html', 'json']);
   *     req.accepts('html', 'json');
   *     req.accepts('html, json');
   *     // => "json"
   *
   * @param type(s)
   * @public
   */
  accepts(...args: string[]) {
    return this.accept.types.apply(this.accept, args)
  }

  /**
   * Check if the given `encoding`s are accepted.
   *
   * @param ...encoding
   * @public
   */
  acceptsEncodings(...args: string[]) {
    return this.accept.encodings.apply(this.accept, args)
  }

  /**
   * Check if the given `charset`s are acceptable,
   * otherwise you should respond with 406 "Not Acceptable".
   *
   * @param ...charset
   * @public
   */
  acceptsCharsets(...args: string[]) {
    return this.accept.charsets.apply(this.accept, args)
  }

  /**
   * Check if the given `lang`s are acceptable,
   * otherwise you should respond with 406 "Not Acceptable".
   *
   * @param ...lang
   * @public
   */
  acceptsLanguages(...args: string[]) {
    return this.accept.languages.apply(this.accept, args)
  }

  /**
   * Return request header.
   *
   * The `Referrer` header field is special-cased,
   * both `Referrer` and `Referer` are interchangeable.
   *
   * Examples:
   *
   *     req.get('Content-Type');
   *     // => "text/plain"
   *
   *     req.get('content-type');
   *     // => "text/plain"
   *
   *     req.get('Something');
   *     // => undefined
   *
   * Aliased as `req.header()`.
   *
   * @param name
   * @public
   */
  get(key: string) {
    return this.header(key)
  }

  header(name: string): string | undefined {
    if (!name) {
      throw new TypeError('name argument is required to req.get')
    }

    if (typeof name !== 'string') {
      throw new TypeError('name must be a string to req.get')
    }

    const lc = name.toLowerCase()

    switch (lc) {
      case 'referer':
      case 'referrer':
        return this.headers.referrer || this.headers.referer
      default:
        return this.headers[lc]
    }
  }

  /**
   * Check if the incoming request contains the "Content-Type"
   * header field, and it contains the give mime `type`.
   *
   * Examples:
   *
   *      // With Content-Type: text/html; charset=utf-8
   *      req.is('html');
   *      req.is('text/html');
   *      req.is('text/*');
   *      // => true
   *
   *      // When Content-Type is application/json
   *      req.is('json');
   *      req.is('application/json');
   *      req.is('application/*');
   *      // => true
   *
   *      req.is('html');
   *      // => false
   *
   * @public
   */
  is(types: string[]): string | false | null
  is(...types: string[]): string | false | null
  is(...types: any[]) {
    return typeis((this as unknown) as IncomingMessage, ...types)
  }
}
