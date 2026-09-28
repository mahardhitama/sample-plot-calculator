import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import App from '../src/App.svelte'

describe('App smoke test (server-rendered)', () => {
	it('renders the calculator with the default example project', () => {
		const { body } = render(App)

		expect(body).toContain('Sample Plot Calculator')
		expect(body).toContain('Sample plots required')
		// default project: guidebook strata, 10% precision, 90% confidence
		expect(body).toContain('Stratum 1')
		// t-iteration (df = 8, t = 1.86) then round-to-nearest: 10+2+1 = 13
		expect(body).toContain('>13<')
	})

	it('renders the strata source tabs', () => {
		const { body } = render(App)
		expect(body).toContain('Manual inputs')
		expect(body).toContain('From CSV')
		expect(body).toContain('From land cover')
		expect(body).toContain('Sign in with Google')
	})

	it('renders the results summary stats', () => {
		const { body } = render(App)
		expect(body).toContain('Area A, ha')
		expect(body).toContain('5,000')
		expect(body).toContain('Possible plots N')
		expect(body).toContain('20,000')
	})
})
