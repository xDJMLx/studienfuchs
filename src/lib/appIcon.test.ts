import { describe, expect, it } from 'vitest'
import { SKINS, SPECIES_IDS } from '../components/mascot/species'
import { buildIconSvg, iconColors } from './appIcon'

describe('Lerntiere und ihre Namen', () => {
  it('die vom Nutzer gewählten Namen stehen fest, alle Namen sind verschieden', () => {
    expect(SKINS.fuchs.name).toBe('Fenni')
    expect(SKINS.elefant.name).toBe('Elli')
    expect(SKINS.krokodil.name).toBe('Boris')
    expect(SKINS.erdmaennchen.name).toBe('Emil')
    expect(SKINS.loewe.name).toBe('Leo')
    expect(SKINS.nilpferd.name).toBe('Hilda')
    expect(SKINS.zebra.name).toBe('Zora')
    expect(SKINS.affe.name).toBe('Anton')
    const names = SPECIES_IDS.map((id) => SKINS[id].name)
    expect(new Set(names).size).toBe(names.length)
    // Keine Namen, die nur das Tier abwandeln (Kroko, Pandi, Pingo, Tigo)
    expect(names).not.toContain('Kroko')
    expect(names).not.toContain('Pandi')
  })
})

describe('App-Symbol', () => {
  it('hell tiefes Indigo, dunkel schwarz', () => {
    const l = iconColors(false)
    const d = iconColors(true)
    const sum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
    expect(sum(d.bottom)).toBe(0)
    expect(sum(d.top)).toBeLessThan(100)
    expect(sum(l.top)).toBeGreaterThan(sum(l.bottom))
    // Hell ist blau: Blauanteil deutlich vor Rot
    expect(parseInt(l.top.slice(5, 7), 16)).toBeGreaterThan(parseInt(l.top.slice(1, 3), 16) + 100)
  })

  it('das Symbol ist ein abgerundetes Quadrat mit eigener Verlaufs-Kennung und dem Fuchs darin', () => {
        const a = buildIconSvg(true)
    const b = buildIconSvg(false)
    expect(a).toContain('viewBox="0 0 512 512"')
    expect(a).toContain('rx="112"')
    expect(a).toContain('<ellipse')
    expect(buildIconSvg(false, { scale: 0.68 })).toContain('scale(0.68)')
    expect(a).toContain('icd')
    expect(b).toContain('icl')
    expect(buildIconSvg(false, { round: false })).toContain('rx="0"')
    expect(a).not.toBe(b)
  })
})
