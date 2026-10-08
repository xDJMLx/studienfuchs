import { describe, expect, it } from 'vitest'
import { SKINS, SPECIES_IDS } from '../components/mascot/species'
import { buildIconSvg, hsl, ICON_HUE, iconColors } from './appIcon'

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

describe('App-Symbol je Tier', () => {
  it('HSL → Hex', () => {
    expect(hsl(0, 1, 0.5)).toBe('#ff0000')
    expect(hsl(120, 1, 0.5)).toBe('#00ff00')
    expect(hsl(240, 1, 0.5)).toBe('#0000ff')
    expect(hsl(0, 0, 1)).toBe('#ffffff')
  })

  it('jedes Tier hat einen Farbton; dunkel ist dunkler als hell', () => {
    for (const id of SPECIES_IDS) {
      expect(ICON_HUE[id], id).toBeGreaterThanOrEqual(0)
      const d = iconColors(id, true)
      const l = iconColors(id, false)
      const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
      expect(lum(d.top), id).toBeLessThan(lum(l.top))
      expect(lum(d.bottom), id).toBeLessThan(lum(d.top))
    }
  })

  it('das Symbol setzt die Zeichnung in einen abgerundeten Rahmen mit eigener Verlaufs-Kennung', () => {
    const art = '<svg viewBox="8 0 184 196" width="100%" height="100%" class="overflow-visible" preserveAspectRatio="xMidYMax meet"><circle r="5"/></svg>'
    const a = buildIconSvg(art, 'tiger', true)
    const b = buildIconSvg(art, 'tiger', false)
    expect(a).toContain('viewBox="0 0 512 512"')
    expect(a).toContain('rx="112"')
    expect(a).toContain('<circle r="5"/>')
    expect(a).not.toContain('class="overflow-visible"')
    expect(a).not.toContain('width="100%"')
    expect(a).toContain('app-bg-tiger-d')
    expect(b).toContain('app-bg-tiger-l')
    expect(a).not.toBe(b)
  })
})
