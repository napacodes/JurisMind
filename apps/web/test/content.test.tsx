import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PlainTextBody } from '../src/components/content/PlainTextBody'

test('CMS body renders as escaped plain text rather than executable HTML', () => {
  const markup = renderToStaticMarkup(createElement(PlainTextBody, { body: '<script>alert(1)</script>' }))
  assert.match(markup, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.doesNotMatch(markup, /<script>/)
})
