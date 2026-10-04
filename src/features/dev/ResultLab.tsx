import { useState } from 'react'
import { ResultScreen } from '../lesson/PracticeFlow'
import { useRewardEvents } from '../../store/useRewardEvents'

/** Nur beim Entwickeln: der Ergebnisbildschirm mit Testdaten (Aufgaben, Erfolge, Einheit, Truhe), ohne eine Lektion zu spielen. */
export function ResultLab() {
  useState(() => {
    useRewardEvents.setState({
      last: {
        achievements: [{ id: 'ten', title: 'Dranbleiber', description: 'Schließe 10 Lektionen ab.', value: 10, goal: 10 }],
        unit: { id: 'u1', title: "C'est parti !", description: 'Begrüßen, Zahlen bis 20, Name, Befinden, Alter, Wohnort, Vorlieben' },
      },
    })
  })
  const result = { total: 10, firstTry: 9, accuracy: 0.95, grades: {}, mistakeItemIds: [], retries: 1, bestCombo: 7 }
  return (
    <ResultScreen
      title="Das Verb être (2/2)"
      outcome={{ result, xp: 20, coins: 12, leveledUp: true, comboXp: 4 }}
      items={[]}
      test={false}
      free={false}
      mark={0.7}
      lessonId="f7-u1-l4"
      onRetry={() => {}}
      onDone={() => {}}
      onNext={() => {}}
    />
  )
}
