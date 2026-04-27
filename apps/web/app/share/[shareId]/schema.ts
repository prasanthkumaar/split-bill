import { z } from "zod"

const bulkEditParticipantSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
})

const bulkEditLineItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
})

const bulkEditCurrentAssignmentSchema = z.object({
  lineItemId: z.string().min(1),
  unitIndex: z.number().int().nonnegative(),
  participantNames: z.array(z.string().trim().min(1)),
})

export const bulkEditInputSchema = z.object({
  instructions: z.string().trim().min(1),
  participants: z.array(bulkEditParticipantSchema).min(1),
  lineItems: z.array(bulkEditLineItemSchema).min(1),
  currentAssignments: z.array(bulkEditCurrentAssignmentSchema).default([]),
})

const bulkEditModelMultiAssignmentSchema = z.object({
  lineItemId: z.string().min(1),
  unitIndex: z.number().int().nonnegative(),
  participantNames: z.array(z.string().trim().min(1)),
})

const bulkEditModelSingleAssignmentSchema = z.object({
  lineItemId: z.string().min(1),
  unitIndex: z.number().int().nonnegative(),
  participantName: z.string().trim().min(1),
})

const bulkEditModelResultSchema = z.object({
  assignments: z.array(
    z.union([
      bulkEditModelMultiAssignmentSchema,
      bulkEditModelSingleAssignmentSchema,
    ])
  ),
})

export const bulkEditResultSchema = z.object({
  assignments: z.array(
    z.object({
      lineItemId: z.string().min(1),
      lineItemName: z.string().trim().min(1),
      unitIndex: z.number().int().nonnegative(),
      unitPrice: z.number().nonnegative(),
      participantIds: z.array(z.string().min(1)),
      participantNames: z.array(z.string().trim().min(1)),
    })
  ),
})

export type BulkEditInput = z.input<typeof bulkEditInputSchema>
export type PreparedBulkEditInput = z.output<typeof bulkEditInputSchema>
export type BulkEditResult = z.infer<typeof bulkEditResultSchema>

export function prepareBulkEditInput(input: BulkEditInput) {
  const parsedInput = bulkEditInputSchema.parse(input)
  assertUniqueParticipantNames(parsedInput.participants)
  assertValidCurrentAssignments(parsedInput)
  return parsedInput
}

export function parseBulkEditResult(
  input: PreparedBulkEditInput,
  rawResultText: string
) {
  const parsedJson = parseBulkEditJson(rawResultText)
  const modelResult = bulkEditModelResultSchema.parse(parsedJson)
  const normalisedAssignments = modelResult.assignments.map(
    normaliseModelAssignment
  )
  const participantIdByName = new Map(
    input.participants.map((participant) => [
      normaliseParticipantName(participant.name),
      participant.id,
    ])
  )
  const requiredUnits = createRequiredUnits(input)
  const requiredUnitByKey = new Map(
    requiredUnits.map((unit) => [unit.key, unit])
  )
  const assignmentByKey = new Map<
    string,
    {
      lineItemId: string
      lineItemName: string
      participantIds: string[]
      participantNames: string[]
      unitIndex: number
      unitPrice: number
    }
  >()

  for (const assignment of normalisedAssignments) {
    const unitKey = getUnitKey(assignment.lineItemId, assignment.unitIndex)
    const unit = requiredUnitByKey.get(unitKey)
    if (!unit) {
      throw new Error(
        `Bulk edit model referenced an unknown unit: ${assignment.lineItemId}:${assignment.unitIndex}`
      )
    }

    if (assignmentByKey.has(unitKey)) {
      throw new Error(
        `Bulk edit model repeated a unit: ${assignment.lineItemId}:${assignment.unitIndex}`
      )
    }

    const participantIds: string[] = []
    const seenParticipantNames = new Set<string>()
    for (const participantName of assignment.participantNames) {
      const participantKey = normaliseParticipantName(participantName)
      const participantId = participantIdByName.get(participantKey)
      if (!participantId) {
        throw new Error(
          `Bulk edit model referenced an unknown participant: ${participantName}`
        )
      }

      if (seenParticipantNames.has(participantKey)) {
        throw new Error(
          `Bulk edit model repeated a participant for unit: ${assignment.lineItemId}:${assignment.unitIndex}:${participantName}`
        )
      }

      seenParticipantNames.add(participantKey)
      participantIds.push(participantId)
    }

    assignmentByKey.set(unitKey, {
      lineItemId: unit.lineItemId,
      lineItemName: unit.lineItemName,
      participantIds,
      participantNames: assignment.participantNames,
      unitIndex: unit.unitIndex,
      unitPrice: unit.unitPrice,
    })
  }

  for (const unit of requiredUnits) {
    if (!assignmentByKey.has(unit.key)) {
      throw new Error(
        `Bulk edit model omitted a unit: ${unit.lineItemName} #${unit.unitIndex + 1}`
      )
    }
  }

  return bulkEditResultSchema.parse({
    assignments: requiredUnits.map((unit) => assignmentByKey.get(unit.key)!),
  })
}

export function buildDeterministicBulkEditResult(
  input: PreparedBulkEditInput
): BulkEditResult | null {
  const intent = getDeterministicIntent(input.instructions)
  if (!intent) {
    return null
  }

  const allParticipantNames = input.participants.map(
    (participant) => participant.name
  )
  const currentParticipantNamesByUnit = new Map(
    input.currentAssignments.map((assignment) => [
      getUnitKey(assignment.lineItemId, assignment.unitIndex),
      assignment.participantNames,
    ])
  )

  return buildBulkEditResult(input, (unit) => {
    if (intent === "remove-all") {
      return []
    }

    if (intent === "split-all-equally") {
      return allParticipantNames
    }

    const isDrink = isDrinkLineItem(unit.lineItemName)
    if (intent === "split-food-equally") {
      return isDrink
        ? (currentParticipantNamesByUnit.get(unit.key) ?? [])
        : allParticipantNames
    }

    return isDrink
      ? allParticipantNames
      : (currentParticipantNamesByUnit.get(unit.key) ?? [])
  })
}

function assertUniqueParticipantNames(
  participants: PreparedBulkEditInput["participants"]
) {
  const seenNames = new Set<string>()

  for (const participant of participants) {
    const key = normaliseParticipantName(participant.name)
    if (seenNames.has(key)) {
      throw new Error("Bulk edit requires unique participant names")
    }

    seenNames.add(key)
  }
}

function assertValidCurrentAssignments(input: PreparedBulkEditInput) {
  const allowedParticipantNames = new Set(
    input.participants.map((participant) =>
      normaliseParticipantName(participant.name)
    )
  )
  const requiredUnitKeys = new Set(
    createRequiredUnits(input).map((unit) => unit.key)
  )
  const seenUnitKeys = new Set<string>()

  for (const assignment of input.currentAssignments) {
    const unitKey = getUnitKey(assignment.lineItemId, assignment.unitIndex)
    if (!requiredUnitKeys.has(unitKey)) {
      throw new Error(
        `Bulk edit current assignment referenced an unknown unit: ${assignment.lineItemId}:${assignment.unitIndex}`
      )
    }

    if (seenUnitKeys.has(unitKey)) {
      throw new Error(
        `Bulk edit current assignment repeated a unit: ${assignment.lineItemId}:${assignment.unitIndex}`
      )
    }

    seenUnitKeys.add(unitKey)

    const seenParticipantNames = new Set<string>()
    for (const participantName of assignment.participantNames) {
      const participantKey = normaliseParticipantName(participantName)
      if (!allowedParticipantNames.has(participantKey)) {
        throw new Error(
          `Bulk edit current assignment referenced an unknown participant: ${participantName}`
        )
      }

      if (seenParticipantNames.has(participantKey)) {
        throw new Error(
          `Bulk edit current assignment repeated a participant: ${assignment.lineItemId}:${assignment.unitIndex}:${participantName}`
        )
      }

      seenParticipantNames.add(participantKey)
    }
  }
}

function parseBulkEditJson(rawResultText: string) {
  const trimmedText = rawResultText.trim()
  const fencedJsonMatch = trimmedText.match(
    /^```(?:json)?\s*([\s\S]*?)\s*```$/i
  )
  const jsonText = fencedJsonMatch?.[1] ?? trimmedText

  try {
    return JSON.parse(jsonText)
  } catch {
    throw new Error("Bulk edit model returned invalid JSON")
  }
}

function createRequiredUnits(input: PreparedBulkEditInput) {
  return input.lineItems.flatMap((lineItem) =>
    Array.from({ length: lineItem.quantity }, (_, unitIndex) => ({
      key: getUnitKey(lineItem.id, unitIndex),
      lineItemId: lineItem.id,
      lineItemName: lineItem.name,
      unitIndex,
      unitPrice: lineItem.unitPrice,
    }))
  )
}

function buildBulkEditResult(
  input: PreparedBulkEditInput,
  getParticipantNames: (
    unit: ReturnType<typeof createRequiredUnits>[number]
  ) => string[]
) {
  const participantIdByName = new Map(
    input.participants.map((participant) => [
      normaliseParticipantName(participant.name),
      participant.id,
    ])
  )

  return bulkEditResultSchema.parse({
    assignments: createRequiredUnits(input).map((unit) => {
      const participantNames = deduplicateParticipantNames(
        getParticipantNames(unit)
      )
      return {
        lineItemId: unit.lineItemId,
        lineItemName: unit.lineItemName,
        participantIds: participantNames.map(
          (participantName) =>
            participantIdByName.get(normaliseParticipantName(participantName))!
        ),
        participantNames,
        unitIndex: unit.unitIndex,
        unitPrice: unit.unitPrice,
      }
    }),
  })
}

function normaliseParticipantName(name: string) {
  return name.trim().toLocaleLowerCase()
}

function deduplicateParticipantNames(participantNames: string[]) {
  const uniqueNames: string[] = []
  const seenNames = new Set<string>()

  for (const participantName of participantNames) {
    const participantKey = normaliseParticipantName(participantName)
    if (seenNames.has(participantKey)) {
      continue
    }

    seenNames.add(participantKey)
    uniqueNames.push(participantName)
  }

  return uniqueNames
}

function normaliseModelAssignment(
  assignment:
    | z.infer<typeof bulkEditModelMultiAssignmentSchema>
    | z.infer<typeof bulkEditModelSingleAssignmentSchema>
) {
  if ("participantNames" in assignment) {
    return assignment
  }

  return {
    lineItemId: assignment.lineItemId,
    unitIndex: assignment.unitIndex,
    participantNames: [assignment.participantName],
  }
}

function getDeterministicIntent(instructions: string) {
  const normalisedInstructions = normaliseInstructions(instructions)

  if (
    normalisedInstructions === "remove all" ||
    normalisedInstructions === "remove all claims" ||
    normalisedInstructions === "clear all" ||
    normalisedInstructions === "clear all claims"
  ) {
    return "remove-all" as const
  }

  if (
    normalisedInstructions === "split all the food and drinks equally" ||
    normalisedInstructions === "split all food and drinks equally" ||
    normalisedInstructions === "split the food and drinks equally" ||
    normalisedInstructions === "split food and drinks equally"
  ) {
    return "split-all-equally" as const
  }

  if (
    normalisedInstructions === "split all the food equally" ||
    normalisedInstructions === "split all food equally" ||
    normalisedInstructions === "split the food equally" ||
    normalisedInstructions === "split food equally"
  ) {
    return "split-food-equally" as const
  }

  if (
    normalisedInstructions === "split all the drinks equally" ||
    normalisedInstructions === "split all drinks equally" ||
    normalisedInstructions === "split the drinks equally" ||
    normalisedInstructions === "split drinks equally"
  ) {
    return "split-drinks-equally" as const
  }

  return null
}

function normaliseInstructions(instructions: string) {
  return instructions
    .trim()
    .toLocaleLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
}

function isDrinkLineItem(lineItemName: string) {
  const normalisedName = normaliseInstructions(lineItemName)
  return DRINK_KEYWORDS.some((keyword) => normalisedName.includes(keyword))
}

const DRINK_KEYWORDS = [
  "beer",
  "bottle",
  "cappuccino",
  "chai",
  "cocktail",
  "coffee",
  "cola",
  "coke",
  "drink",
  "espresso",
  "fanta",
  "gin",
  "heineken",
  "iced",
  "juice",
  "latte",
  "lemonade",
  "matcha",
  "milk tea",
  "mocha",
  "pepsi",
  "shake",
  "smoothie",
  "soda",
  "sprite",
  "tea",
  "vodka",
  "water",
  "whiskey",
  "whisky",
  "wine",
]

function getUnitKey(lineItemId: string, unitIndex: number) {
  return `${lineItemId}:${unitIndex}`
}
