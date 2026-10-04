import { describe, expect, it } from 'vitest'
import { comboBonus } from './rewards'

describe('Combo-Bonus', () => {
  it('steigt langsam und ist gedeckelt', () => {
    expect([0, 2, 3, 5, 6, 9, 12, 30].map(comboBonus)).toEqual([0, 0, 2, 2, 4, 6, 6, 6])
  })
})
