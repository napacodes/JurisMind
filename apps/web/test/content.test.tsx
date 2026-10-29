import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PlainTextBody } from '../src/components/content/PlainTextBody'
import { PublicLoginChoices } from '../src/components/auth/PublicLoginChoices'

test('CMS body renders as escaped plain text rather than executable HTML', () => {
  const markup = renderToStaticMarkup(createElement(PlainTextBody, { body: '<script>alert(1)</script>' }))
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.doesNotMatch(markup, /<script>/)
})

test('public login presents firm and lawyer routes while keeping platform administration separate', () => {
  const markup = renderToStaticMarkup(createElement(PublicLoginChoices))
  assert.match(markup, /Login as Firm/)
  assert.match(markup, /href="\/firm\/login"/)
  assert.match(markup, /Login as Lawyer/)
  assert.match(markup, /href="\/lawyer\/login"/)
  assert.match(markup, /href="\/administration\/login"/)
})
