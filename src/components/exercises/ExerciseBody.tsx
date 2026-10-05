import { BuildExercise } from './BuildExercise'
import { QCardExercise, QChoiceExercise, QTypeExercise } from './CardExercises'
import { ChoiceExercise } from './ChoiceExercise'
import type { ExerciseProps } from './common'
import { FillExercise } from './FillExercise'
import { ListenChoiceExercise } from './ListenChoiceExercise'
import { ListenExercise } from './ListenExercise'
import { MatchExercise } from './MatchExercise'
import { CalcExercise, MChoiceExercise, MMatchExercise } from './MathExercises'
import { OrderExercise } from './OrderExercise'
import { SpeakExercise } from './SpeakExercise'
import { SpellExercise } from './SpellExercise'
import { TeachExercise } from './TeachExercise'
import { TypeExercise } from './TypeExercise'
import type { Exercise } from '../../lib/types'

type Common = Pick<ExerciseProps<'type'>, 'answer' | 'onChange' | 'result'>

/** Die passende Oberfläche zu einer Übung. Gemeinsam genutzt von Übungsrunden und Tests. */
export function ExerciseBody({ exercise: ex, answer, onChange, result }: { exercise: Exercise } & Common) {
  const common = { answer, onChange, result }
  return (
        ex.kind === 'teach' ? (
          <TeachExercise exercise={ex} />
        ) : ex.kind === 'choice' ? (
          <ChoiceExercise exercise={ex} {...common} />
        ) : ex.kind === 'type' ? (
          <TypeExercise exercise={ex} {...common} />
        ) : ex.kind === 'listen' ? (
          <ListenExercise exercise={ex} {...common} />
        ) : ex.kind === 'listenChoice' ? (
          <ListenChoiceExercise exercise={ex} {...common} />
        ) : ex.kind === 'spell' ? (
          <SpellExercise exercise={ex} {...common} />
        ) : ex.kind === 'speak' ? (
          <SpeakExercise exercise={ex} {...common} />
        ) : ex.kind === 'build' ? (
          <BuildExercise exercise={ex} {...common} />
        ) : ex.kind === 'match' ? (
          <MatchExercise exercise={ex} {...common} />
        ) : ex.kind === 'qchoice' ? (
          <QChoiceExercise exercise={ex} {...common} />
        ) : ex.kind === 'qtype' ? (
          <QTypeExercise exercise={ex} {...common} />
        ) : ex.kind === 'order' ? (
          <OrderExercise exercise={ex} {...common} />
        ) : ex.kind === 'qcard' ? (
          <QCardExercise exercise={ex} {...common} />
        ) : ex.kind === 'calc' ? (
          <CalcExercise exercise={ex} {...common} />
        ) : ex.kind === 'mchoice' ? (
          <MChoiceExercise exercise={ex} {...common} />
        ) : ex.kind === 'mmatch' ? (
          <MMatchExercise exercise={ex} {...common} />
        ) : (
          <FillExercise exercise={ex} {...common} />
        )
  )
}
