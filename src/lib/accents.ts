import { units } from '../content'

// Ergänzt fehlende Akzente in französischen Wörtern ("ecole" → "école", "francais" → "français").
// Grundlage ist der gesamte Kurswortschatz plus eine Liste häufiger Wörter. Mehrdeutige Kleinwörter
// (a/à, ou/où, la/là, sur/sûr, du/dû …) werden nie verändert, weil sie ohne Akzent ebenfalls richtig sein können.

const EXTRA =
  'à à-côté ça çà là où déjà voilà voilà après près très abîme âge âgé aîné ancêtre août bébé bête bientôt boîte brûler cadeau café ' +
  'célèbre cérémonie chaîne chambre château chère chèque cinéma collège comédie compétition crème crêpe cuisinière dé décembre décider ' +
  'défendre déjeuner demain dépêcher dépenser dernière désolé dessiné détester déçu développer différent difficile dîner économie école ' +
  'écouter écrire écrivain église égal élève énergie énorme épicerie équipe erreur espère être été étage étoile étranger étudiant étudier ' +
  'événement évidemment éviter exagérer excusez exercice expérience fâché fenêtre fête février forêt français française frère général ' +
  'génial géographie goûter grâce guérir hôpital hôtel île idée imaginer incroyable intéressant intérieur janvier jumeaux lève légume ' +
  'lumière lycée mâcher mère métier métro même météo musée numéro obligé occupé œuf œuvre opéra où pâtes pâté père pêche pièce pièces ' +
  'piqûre plaît pharmacie poème pôle poêle préférer préféré première premier préparer présenter président problème prochaine professeur ' +
  'propriété pâques quand quatrième quelque quête qualité rêve réaliser réalité récemment récréation réfléchir réfrigérateur région ' +
  'regarder règle répéter répondre réponse république réserver restaurant résultat réussir réveil réveiller revenir rêver rivière ' +
  'salle scène scolaire secrétaire séjour semaine sérieux séparer septembre sœur sûr sûrement système tâche télé téléphone télévision ' +
  'tête thé théâtre tôt très trésor université vérité vérifier vêtements vélo vendredi vérifier vidéo village voilà zéro ' +
  'ancienne bibliothèque boulangerie cahier cantine cartable chaussette cinquième classe collègue copine crayon cuisine dictionnaire ' +
  'étagère éponge fraîche frère gâteau géant hiver hôte jardin kilomètre légère lèvre mélanger météo nièce océan pâle pâlir paresseux ' +
  'périphérique pétillant piège pyjama rôle sèche sèche-linge séance sécurité sélection sèche silhouette sirène spécial spécialité ' +
  'stylo supermarché tablette tâche télécommande tempête théâtre traîneau trottinette tuyau usé vacances vêtement voisine ' +
  'allô aujourd’hui à-peu-près à-bientôt à-demain béret berceau cèdre dégâts dîme drôle étroit fraîcheur île maïs noël ' +
  'noël pâtisserie pêcheur pâturage précis précédent préoccupé prêt prête prénom prévoir problématique protégé rentrée répétition ' +
  'sandwichs séparé sérénité tempête théière théâtral thérapie torréfié trêve vêpres zèbre'

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const hasAccent = (s: string) => strip(s) !== s.toLowerCase()
const WORD = /[\p{L}]+/gu

/** Kleinwörter, die ohne Akzent immer richtig sind. */
const NEVER = new Set(['a', 'ou', 'la', 'sur', 'du', 'des', 'mais', 'de', 'ne', 'ce', 'se', 'le', 'les', 'me', 'te', 'tu', 'et', 'en', 'un', 'ma', 'ta', 'sa', 'on', 'si', 'ni', 'par', 'pour'])

interface Dict {
  /** Wort ohne Akzent → häufigste akzentuierte Schreibweise */
  fix: Map<string, string>
}

let dict: Dict | null = null

function build(): Dict {
  const accented = new Map<string, Map<string, number>>()
  const plain = new Map<string, number>()
  const feed = (text: string, weight = 1) => {
    for (const m of text.normalize('NFC').matchAll(WORD)) {
      const w = m[0].toLowerCase()
      if (hasAccent(w)) {
        const key = strip(w)
        const forms = accented.get(key) ?? new Map<string, number>()
        forms.set(w, (forms.get(w) ?? 0) + weight)
        accented.set(key, forms)
      } else {
        plain.set(w, (plain.get(w) ?? 0) + weight)
      }
    }
  }
  for (const u of units) for (const l of u.lessons) for (const it of l.items) feed(`${it.front} ${it.example ?? ''}`)
  feed(EXTRA.replace(/’/g, ' '), 3)

  const fix = new Map<string, string>()
  for (const [key, forms] of accented) {
    const ranked = [...forms.entries()].sort((a, b) => b[1] - a[1])
    const [best, count] = ranked[0]
    // Ohne Akzent gibt es das Wort auch häufig (a/à, ou/où, la/là …): nicht anfassen
    if ((plain.get(key) ?? 0) * 3 > count) continue
    // Mehrere Akzentformen (préfère/préféré): nur korrigieren, wenn eine klar überwiegt
    if (ranked.length > 1 && ranked[1][1] * 4 > count) continue
    fix.set(key, best)
  }
  return { fix }
}

function matchCase(original: string, fixed: string): string {
  if (original.length > 1 && original === original.toUpperCase()) return fixed.toUpperCase()
  if (original[0] !== original[0].toLowerCase()) return fixed[0].toUpperCase() + fixed.slice(1)
  return fixed
}

/** Ergänzt fehlende Akzente. Wörter, die schon Akzente haben oder unbekannt sind, bleiben unverändert. */
export function restoreAccents(text: string): string {
  dict ??= build()
  const d = dict
  return text.normalize('NFC').replace(WORD, (word) => {
    if (hasAccent(word) || NEVER.has(word.toLowerCase())) return word
    const fixed = d.fix.get(word.toLowerCase())
    return fixed ? matchCase(word, fixed) : word
  })
}
